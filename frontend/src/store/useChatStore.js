import {create} from "zustand";
import toast from "react-hot-toast";
import {axiosInstance} from "../lib/axios.js";
import {useAuthStore }from "./useAuthStore.js";

const getErrorMessage = (error, fallback) =>
    error?.response?.data?.message || fallback;

const getId = (value) => {
    if(!value) return "";
    return typeof value === "string" ? value : value._id;
};

const createLastMessagePreview = (message, authUserId) => ({
    _id: message._id,
    text: message.text || (message.image ? "Photo attachment" : ""),
    hasImage: Boolean(message.image),
    createdAt: message.createdAt,
    senderId: getId(message.senderId),
    isMine: getId(message.senderId) === authUserId,
});

const sortUsers = (users) => [...users].sort((left,right)=>{
    const leftTime = left.lastMessage?.createdAt ? new Date(left.lastMessage.createdAt).getTime() : 0;
    const rightTime = right.lastMessage?.createdAt ? new Date(right.lastMessage.createdAt).getTime() : 0;
    return rightTime - leftTime || left.fullName.localeCompare(right.fullName);
});

const syncSelectedUser = (users, selectedUser) =>
    users.find((user)=>user._id === selectedUser?._id) || selectedUser;

const updateUsersForMessage = (users, message, authUserId, options = {}) => {
    const {incrementUnread = false, resetUnread = false} = options;
    const senderId = getId(message.senderId);
    const recieverId = getId(message.recieverId);
    const otherUserId = senderId === authUserId ? recieverId : senderId;

    const nextUsers = users.map((user)=>{
        if(user._id !== otherUserId){
            return user;
        }

        return {
            ...user,
            lastMessage: createLastMessagePreview(message, authUserId),
            unreadCount: resetUnread ? 0 : incrementUnread ? (user.unreadCount || 0) + 1 : user.unreadCount || 0,
        };
    });

    return sortUsers(nextUsers);
};

const markConversationSeenInMessages = (messages, otherUserId, seenAt) =>
    messages.map((message)=>{
        const isIncomingFromSelectedUser = getId(message.senderId) === otherUserId;
        if(!isIncomingFromSelectedUser || message.seenAt){
            return message;
        }

        return {
            ...message,
            seenAt,
            deliveredAt: message.deliveredAt || seenAt,
        };
    });

export const useChatStore = create((set,get)=>({
    messages: [],
    users:[],
    selectedUser: null,
    isUsersLoading:false,
    isMessagesLoading:false,
    isSendingMessage:false,
    typingUserIds: [],
    hasSocketListeners: false,

    resetChatState: ()=> set({
        messages: [],
        users: [],
        selectedUser: null,
        isUsersLoading: false,
        isMessagesLoading: false,
        isSendingMessage: false,
        typingUserIds: [],
        hasSocketListeners: false,
    }),

    getUsers: async() =>{
        set({isUsersLoading:true});

        try {
            const res = await axiosInstance.get("/messages/users");
            set((state)=>{
                const users = sortUsers(Array.isArray(res.data) ? res.data : []);
                return {
                    users,
                    selectedUser: syncSelectedUser(users, state.selectedUser),
                };
            });
        } catch (error) {
            toast.error(getErrorMessage(error,"Unable to load conversations right now."));
        } finally{
            set({isUsersLoading:false});
        }
    },

    getMessages: async (userId)=>{
        set({isMessagesLoading:true});
        try {
            const res = await axiosInstance.get(`/messages/${userId}`);
            set((state)=>({
                messages:Array.isArray(res.data) ? res.data : [],
                users: sortUsers(
                    state.users.map((user)=>
                        user._id === userId ? {...user, unreadCount: 0} : user
                    )
                ),
            }));
        } catch (error) {
            toast.error(getErrorMessage(error,"Unable to load messages right now."));
        } finally{
            set({isMessagesLoading:false});
        }
    },

    sendMessage: async (messageData)=>{ 
        const {selectedUser, messages} = get();
        const authUser = useAuthStore.getState().authUser;
        const optimisticId = `temp-${Date.now()}`;
        const optimisticMessage = {
            _id: optimisticId,
            text: messageData.text?.trim() || "",
            image: messageData.image || "",
            senderId: authUser?._id,
            recieverId: selectedUser?._id,
            createdAt: new Date().toISOString(),
            deliveredAt: null,
            seenAt: null,
            isSending: true,
        };

        const previousMessages = messages;
        const previousUsers = get().users;

        set((state)=>({
            isSendingMessage:true,
            messages:[...state.messages, optimisticMessage],
            users:updateUsersForMessage(state.users, optimisticMessage, authUser._id),
        }));

        try {
            const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`,messageData);
            set((state)=>({
                isSendingMessage:false,
                messages: state.messages.map((message)=>
                    message._id === optimisticId ? res.data : message
                ),
                users:updateUsersForMessage(state.users, res.data, authUser._id),
            }));
            return res.data;
        } catch (error) {
            set({
                isSendingMessage:false,
                messages: previousMessages,
                users: previousUsers,
            });
            toast.error(getErrorMessage(error,"Unable to send your message right now."));
        }
    },

    markMessagesAsSeen: async (userId)=>{
        if(!userId) return;

        const seenAt = new Date().toISOString();
        set((state)=>({
            messages: markConversationSeenInMessages(state.messages, userId, seenAt),
            users: sortUsers(
                state.users.map((user)=>
                    user._id === userId ? {...user, unreadCount: 0} : user
                )
            ),
        }));

        try {
            await axiosInstance.post(`/messages/seen/${userId}`);
        } catch (error) {
            console.log("Failed to mark messages as seen:", error);
        }
    },

    subscribeToMessages : ()=>{
        const socket = useAuthStore.getState().socket;
        if(!socket || get().hasSocketListeners) return;

        socket.off("message:new");
        socket.off("messages:seen");
        socket.off("messages:delivered");
        socket.off("typing:start");
        socket.off("typing:stop");

        socket.on("message:new" , (newMessage)=>{
            const authUserId = useAuthStore.getState().authUser?._id;
            const selectedUserId = get().selectedUser?._id;
            const isActiveConversation = selectedUserId === getId(newMessage.senderId);

            set((state)=>({
                messages: isActiveConversation
                    ? [...state.messages, newMessage]
                    : state.messages,
                users:updateUsersForMessage(
                    state.users,
                    newMessage,
                    authUserId,
                    {
                        incrementUnread: !isActiveConversation,
                        resetUnread: isActiveConversation,
                    }
                ),
            }));

            if(isActiveConversation){
                get().markMessagesAsSeen(getId(newMessage.senderId));
            }
        });

        socket.on("messages:seen",(payload)=>{
            const {byUserId, seenAt} = payload;
            const authUserId = useAuthStore.getState().authUser?._id;

            set((state)=>({
                messages: state.messages.map((message)=>{
                    const isOwnMessage = getId(message.senderId) === authUserId;
                    const isSeenByRecipient = getId(message.recieverId) === byUserId;
                    if(!isOwnMessage || !isSeenByRecipient || message.seenAt){
                        return message;
                    }

                    return {
                        ...message,
                        seenAt,
                        deliveredAt: message.deliveredAt || seenAt,
                    };
                }),
            }));
        });

        socket.on("messages:delivered",(payload)=>{
            const {toUserId, deliveredAt, messageIds = []} = payload;
            const authUserId = useAuthStore.getState().authUser?._id;

            set((state)=>({
                messages: state.messages.map((message)=>{
                    const isOwnMessage = getId(message.senderId) === authUserId;
                    const isDeliveredToRecipient = getId(message.recieverId) === toUserId;
                    const isTrackedMessage = messageIds.length === 0 || messageIds.includes(getId(message._id));

                    if(!isOwnMessage || !isDeliveredToRecipient || !isTrackedMessage || message.deliveredAt){
                        return message;
                    }

                    return {
                        ...message,
                        deliveredAt,
                    };
                }),
            }));
        });

        socket.on("typing:start",({fromUserId})=>{
            set((state)=>({
                typingUserIds: state.typingUserIds.includes(fromUserId)
                    ? state.typingUserIds
                    : [...state.typingUserIds, fromUserId],
            }));
        });

        socket.on("typing:stop",({fromUserId})=>{
            set((state)=>({
                typingUserIds: state.typingUserIds.filter((id)=>id !== fromUserId),
            }));
        });

        set({hasSocketListeners:true});
    },

    unsubscribeFromMessages:()=>{
        const socket = useAuthStore.getState().socket;
        if(!socket){
            set({hasSocketListeners:false, typingUserIds: []});
            return;
        }

        socket.off("message:new");
        socket.off("messages:seen");
        socket.off("messages:delivered");
        socket.off("typing:start");
        socket.off("typing:stop");
        set({hasSocketListeners:false, typingUserIds: []});
    },

    setSelectedUser: (selectedUser) => set((state)=>({
        selectedUser,
        users: selectedUser
            ? sortUsers(
                state.users.map((user)=>
                    user._id === selectedUser._id ? {...user, unreadCount: 0} : user
                )
            )
            : state.users,
    })),
    

}));
