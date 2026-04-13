import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios.js";
import { useAuthStore } from "./useAuthStore.js";

const getErrorMessage = (error, fallback) =>
    error?.response?.data?.message || fallback;

const getId = (value) => {
    if (!value) return "";
    return typeof value === "string" ? value : value._id;
};

const sortConversations = (items) =>
    [...items].sort((left, right) => {
        const leftTime = left.lastMessage?.createdAt
            ? new Date(left.lastMessage.createdAt).getTime()
            : 0;
        const rightTime = right.lastMessage?.createdAt
            ? new Date(right.lastMessage.createdAt).getTime()
            : 0;
        return rightTime - leftTime || (left.fullName || "").localeCompare(right.fullName || "");
    });

const createLastMessagePreview = (message, authUserId) => ({
    _id: message._id,
    text: message.text || (message.image ? "Photo attachment" : ""),
    hasImage: Boolean(message.image),
    createdAt: message.createdAt,
    senderId: getId(message.senderId),
    recieverId: getId(message.recieverId),
    groupId: getId(message.groupId),
    isMine: getId(message.senderId) === authUserId,
});

const syncSelectedConversation = (conversations, selectedConversation) =>
    conversations.find(
        (conversation) =>
            conversation._id === selectedConversation?._id &&
            Boolean(conversation.isGroup) === Boolean(selectedConversation?.isGroup)
    ) || selectedConversation;

const updateConversationsForMessage = (conversations, message, authUserId, options = {}) => {
    const { incrementUnread = false, resetUnread = false } = options;

    const groupId = getId(message.groupId);
    const senderId = getId(message.senderId);
    const recieverId = getId(message.recieverId);

    const targetConversationId = groupId || (senderId === authUserId ? recieverId : senderId);
    const isGroupMessage = Boolean(groupId);

    const nextConversations = conversations.map((conversation) => {
        const isMatch =
            conversation._id === targetConversationId && Boolean(conversation.isGroup) === isGroupMessage;

        if (!isMatch) {
            return conversation;
        }

        return {
            ...conversation,
            lastMessage: createLastMessagePreview(message, authUserId),
            unreadCount: resetUnread
                ? 0
                : incrementUnread
                    ? (conversation.unreadCount || 0) + 1
                    : conversation.unreadCount || 0,
        };
    });

    return sortConversations(nextConversations);
};

const markDirectConversationSeenInMessages = (messages, otherUserId, seenAt) =>
    messages.map((message) => {
        const isIncomingFromSelectedUser = getId(message.senderId) === otherUserId;
        const isDirectMessage = !getId(message.groupId);
        if (!isIncomingFromSelectedUser || !isDirectMessage || message.seenAt) {
            return message;
        }

        return {
            ...message,
            seenAt,
            deliveredAt: message.deliveredAt || seenAt,
        };
    });

const updateSelectedConversationPreview = (conversations, selectedConversation, messages, authUserId) => {
    if (!selectedConversation?._id) return conversations;

    const latestMessage = messages[messages.length - 1] || null;

    return sortConversations(
        conversations.map((conversation) => {
            const isMatch =
                conversation._id === selectedConversation._id &&
                Boolean(conversation.isGroup) === Boolean(selectedConversation.isGroup);

            if (!isMatch) return conversation;

            return {
                ...conversation,
                lastMessage: latestMessage ? createLastMessagePreview(latestMessage, authUserId) : null,
            };
        })
    );
};

const updateConversationsForDeletedMessage = (conversations, payload, authUserId) => {
    const senderId = getId(payload.senderId);
    const recieverId = getId(payload.recieverId);
    const groupId = getId(payload.groupId);

    const targetConversationId = groupId || (senderId === authUserId ? recieverId : senderId);
    const isGroupConversation = Boolean(groupId);

    if (!targetConversationId) return conversations;

    return sortConversations(
        conversations.map((conversation) => {
            const isMatch =
                conversation._id === targetConversationId &&
                Boolean(conversation.isGroup) === isGroupConversation;

            if (!isMatch) return conversation;

            return {
                ...conversation,
                lastMessage: payload.lastMessage
                    ? createLastMessagePreview(payload.lastMessage, authUserId)
                    : null,
            };
        })
    );
};

export const useChatStore = create((set, get) => ({
    messages: [],
    users: [],
    selectedUser: null,
    isUsersLoading: false,
    isMessagesLoading: false,
    isSendingMessage: false,
    deletingMessageIds: [],
    typingUserIds: [],
    hasSocketListeners: false,

    resetChatState: () =>
        set({
            messages: [],
            users: [],
            selectedUser: null,
            isUsersLoading: false,
            isMessagesLoading: false,
            isSendingMessage: false,
            deletingMessageIds: [],
            typingUserIds: [],
            hasSocketListeners: false,
        }),

    getUsers: async () => {
        set({ isUsersLoading: true });

        try {
            const res = await axiosInstance.get("/messages/users");
            set((state) => {
                const users = sortConversations(Array.isArray(res.data) ? res.data : []);
                return {
                    users,
                    selectedUser: syncSelectedConversation(users, state.selectedUser),
                };
            });
        } catch (error) {
            toast.error(getErrorMessage(error, "Unable to load conversations right now."));
        } finally {
            set({ isUsersLoading: false });
        }
    },

    getMessages: async (conversationId, isGroup = false) => {
        set({ isMessagesLoading: true });
        try {
            const endpoint = isGroup ? `/messages/group/${conversationId}` : `/messages/${conversationId}`;
            const res = await axiosInstance.get(endpoint);
            set((state) => ({
                messages: Array.isArray(res.data) ? res.data : [],
                users: sortConversations(
                    state.users.map((conversation) =>
                        conversation._id === conversationId && Boolean(conversation.isGroup) === Boolean(isGroup)
                            ? { ...conversation, unreadCount: 0 }
                            : conversation
                    )
                ),
            }));
        } catch (error) {
            toast.error(getErrorMessage(error, "Unable to load messages right now."));
        } finally {
            set({ isMessagesLoading: false });
        }
    },

    sendMessage: async (messageData) => {
        const { selectedUser, messages } = get();
        const authUser = useAuthStore.getState().authUser;
        const optimisticId = `temp-${Date.now()}`;
        const isGroupConversation = Boolean(selectedUser?.isGroup);

        const optimisticMessage = {
            _id: optimisticId,
            text: messageData.text?.trim() || "",
            image: messageData.image || "",
            senderId: authUser?._id,
            recieverId: isGroupConversation ? null : selectedUser?._id,
            groupId: isGroupConversation ? selectedUser?._id : null,
            createdAt: new Date().toISOString(),
            deliveredAt: null,
            seenAt: null,
            seenBy: isGroupConversation ? [authUser?._id] : [],
            isSending: true,
        };

        const previousMessages = messages;
        const previousUsers = get().users;

        if (!isGroupConversation) {
            set((state) => ({
                isSendingMessage: true,
                messages: [...state.messages, optimisticMessage],
                users: updateConversationsForMessage(state.users, optimisticMessage, authUser._id),
            }));
        } else {
            set({ isSendingMessage: true });
        }

        try {
            const endpoint = isGroupConversation
                ? `/messages/group/send/${selectedUser._id}`
                : `/messages/send/${selectedUser._id}`;
            const res = await axiosInstance.post(endpoint, messageData);

            if (!isGroupConversation) {
                set((state) => ({
                    isSendingMessage: false,
                    messages: state.messages.map((message) =>
                        message._id === optimisticId ? res.data : message
                    ),
                    users: updateConversationsForMessage(state.users, res.data, authUser._id),
                }));
            } else {
                set({ isSendingMessage: false });
            }

            return res.data;
        } catch (error) {
            set({
                isSendingMessage: false,
                messages: previousMessages,
                users: previousUsers,
            });
            toast.error(getErrorMessage(error, "Unable to send your message right now."));
        }
    },

    deleteMessage: async (messageId) => {
        const { selectedUser, messages, users } = get();
        const authUserId = useAuthStore.getState().authUser?._id;
        if (!messageId || !selectedUser?._id || !authUserId) return;

        const previousMessages = messages;
        const nextMessages = messages.filter((message) => getId(message._id) !== messageId);
        const previousUsers = users;

        set((state) => ({
            deletingMessageIds: state.deletingMessageIds.includes(messageId)
                ? state.deletingMessageIds
                : [...state.deletingMessageIds, messageId],
            messages: nextMessages,
            users: updateSelectedConversationPreview(state.users, selectedUser, nextMessages, authUserId),
        }));

        try {
            const res = await axiosInstance.delete(`/messages/${messageId}`);

            set((state) => ({
                users: sortConversations(
                    state.users.map((conversation) => {
                        const sameConversation = selectedUser?.isGroup
                            ? Boolean(conversation.isGroup) && conversation._id === selectedUser._id
                            : !conversation.isGroup && conversation._id === selectedUser._id;

                        if (!sameConversation) return conversation;

                        return {
                            ...conversation,
                            lastMessage: res.data?.lastMessage
                                ? createLastMessagePreview(res.data.lastMessage, authUserId)
                                : null,
                        };
                    })
                ),
            }));
        } catch (error) {
            set({
                messages: previousMessages,
                users: previousUsers,
            });
            toast.error(getErrorMessage(error, "Unable to delete this message right now."));
        } finally {
            set((state) => ({
                deletingMessageIds: state.deletingMessageIds.filter((id) => id !== messageId),
            }));
        }
    },

    markMessagesAsSeen: async (conversationId, isGroup = false) => {
        if (!conversationId) return;

        if (isGroup) {
            set((state) => ({
                users: sortConversations(
                    state.users.map((conversation) =>
                        conversation._id === conversationId && conversation.isGroup
                            ? { ...conversation, unreadCount: 0 }
                            : conversation
                    )
                ),
            }));

            try {
                await axiosInstance.post(`/messages/group/seen/${conversationId}`);
            } catch (error) {
                console.log("Failed to mark group messages as seen:", error);
            }
            return;
        }

        const seenAt = new Date().toISOString();
        set((state) => ({
            messages: markDirectConversationSeenInMessages(state.messages, conversationId, seenAt),
            users: sortConversations(
                state.users.map((conversation) =>
                    conversation._id === conversationId && !conversation.isGroup
                        ? { ...conversation, unreadCount: 0 }
                        : conversation
                )
            ),
        }));

        try {
            await axiosInstance.post(`/messages/seen/${conversationId}`);
        } catch (error) {
            console.log("Failed to mark messages as seen:", error);
        }
    },

    createGroup: async ({ name, memberIds }) => {
        if (!name?.trim()) {
            toast.error("Please enter a group name.");
            return null;
        }

        try {
            const res = await axiosInstance.post("/messages/groups", {
                name: name.trim(),
                memberIds,
            });

            const socket = useAuthStore.getState().socket;
            if (socket) {
                socket.emit("group:join", { groupId: res.data?._id });
            }

            set((state) => {
                const exists = state.users.some(
                    (conversation) =>
                        conversation._id === res.data?._id && Boolean(conversation.isGroup)
                );

                const users = exists
                    ? state.users
                    : sortConversations([{ ...res.data, isGroup: true }, ...state.users]);

                return {
                    users,
                    selectedUser: { ...res.data, isGroup: true },
                    messages: [],
                };
            });

            toast.success("Group created successfully!");
            return res.data;
        } catch (error) {
            toast.error(getErrorMessage(error, "Unable to create the group right now."));
            return null;
        }
    },

    subscribeToMessages: () => {
        const socket = useAuthStore.getState().socket;
        if (!socket || get().hasSocketListeners) return;

        socket.off("message:new");
        socket.off("group:message:new");
        socket.off("group:created");
        socket.off("messages:seen");
        socket.off("messages:delivered");
        socket.off("message:deleted");
        socket.off("typing:start");
        socket.off("typing:stop");

        socket.on("message:new", (newMessage) => {
            const authUserId = useAuthStore.getState().authUser?._id;
            const selectedUser = get().selectedUser;
            const selectedUserId = selectedUser?._id;
            const isActiveConversation =
                selectedUserId && !selectedUser?.isGroup && selectedUserId === getId(newMessage.senderId);

            set((state) => ({
                messages: isActiveConversation
                    ? [...state.messages, newMessage]
                    : state.messages,
                users: updateConversationsForMessage(state.users, newMessage, authUserId, {
                    incrementUnread: !isActiveConversation,
                    resetUnread: isActiveConversation,
                }),
            }));

            if (isActiveConversation && getId(newMessage.senderId) !== authUserId) {
                get().markMessagesAsSeen(getId(newMessage.senderId), false);
            }
        });

        socket.on("group:message:new", (newMessage) => {
            const authUserId = useAuthStore.getState().authUser?._id;
            const selectedUser = get().selectedUser;
            const selectedUserId = selectedUser?._id;
            const messageGroupId = getId(newMessage.groupId);
            const isActiveConversation =
                Boolean(selectedUser?.isGroup) && selectedUserId === messageGroupId;

            set((state) => ({
                messages: isActiveConversation
                    ? [...state.messages, newMessage]
                    : state.messages,
                users: updateConversationsForMessage(state.users, newMessage, authUserId, {
                    incrementUnread: !isActiveConversation,
                    resetUnread: isActiveConversation,
                }),
            }));

            if (isActiveConversation) {
                get().markMessagesAsSeen(messageGroupId, true);
            }
        });

        socket.on("group:created", (group) => {
            const socketRef = useAuthStore.getState().socket;
            if (socketRef) {
                socketRef.emit("group:join", { groupId: group?._id });
            }

            set((state) => {
                const exists = state.users.some(
                    (conversation) => conversation._id === group?._id && Boolean(conversation.isGroup)
                );

                if (exists) {
                    return state;
                }

                return {
                    users: sortConversations([{ ...group, isGroup: true }, ...state.users]),
                };
            });
        });

        socket.on("messages:seen", (payload) => {
            const { byUserId, seenAt } = payload;
            const authUserId = useAuthStore.getState().authUser?._id;

            set((state) => ({
                messages: state.messages.map((message) => {
                    const isOwnMessage = getId(message.senderId) === authUserId;
                    const isSeenByRecipient = getId(message.recieverId) === byUserId;
                    const isDirectMessage = !getId(message.groupId);
                    if (!isOwnMessage || !isSeenByRecipient || !isDirectMessage || message.seenAt) {
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

        socket.on("messages:delivered", (payload) => {
            const { toUserId, deliveredAt, messageIds = [] } = payload;
            const authUserId = useAuthStore.getState().authUser?._id;

            set((state) => ({
                messages: state.messages.map((message) => {
                    const isOwnMessage = getId(message.senderId) === authUserId;
                    const isDeliveredToRecipient = getId(message.recieverId) === toUserId;
                    const isTrackedMessage =
                        messageIds.length === 0 || messageIds.includes(getId(message._id));
                    const isDirectMessage = !getId(message.groupId);

                    if (
                        !isOwnMessage ||
                        !isDeliveredToRecipient ||
                        !isTrackedMessage ||
                        !isDirectMessage ||
                        message.deliveredAt
                    ) {
                        return message;
                    }

                    return {
                        ...message,
                        deliveredAt,
                    };
                }),
            }));
        });

        socket.on("message:deleted", (payload) => {
            const authUserId = useAuthStore.getState().authUser?._id;
            const selectedUser = get().selectedUser;
            const selectedUserId = selectedUser?._id;
            const senderId = getId(payload.senderId);
            const recieverId = getId(payload.recieverId);
            const groupId = getId(payload.groupId);

            if (!authUserId || !senderId) return;

            const isCurrentConversation = groupId
                ? Boolean(selectedUser?.isGroup) && selectedUserId === groupId
                : selectedUserId &&
                !selectedUser?.isGroup &&
                ((senderId === authUserId && recieverId === selectedUserId) ||
                    (senderId === selectedUserId && recieverId === authUserId));

            set((state) => {
                const filteredMessages = isCurrentConversation
                    ? state.messages.filter((message) => getId(message._id) !== payload.messageId)
                    : state.messages;

                const users = isCurrentConversation
                    ? updateSelectedConversationPreview(state.users, selectedUser, filteredMessages, authUserId)
                    : updateConversationsForDeletedMessage(state.users, payload, authUserId);

                return {
                    messages: filteredMessages,
                    users,
                };
            });
        });

        socket.on("typing:start", ({ fromUserId, fromGroupId }) => {
            const conversationId = fromGroupId || fromUserId;
            if (!conversationId) return;

            set((state) => ({
                typingUserIds: state.typingUserIds.includes(conversationId)
                    ? state.typingUserIds
                    : [...state.typingUserIds, conversationId],
            }));
        });

        socket.on("typing:stop", ({ fromUserId, fromGroupId }) => {
            const conversationId = fromGroupId || fromUserId;
            if (!conversationId) return;

            set((state) => ({
                typingUserIds: state.typingUserIds.filter((id) => id !== conversationId),
            }));
        });

        set({ hasSocketListeners: true });
    },

    unsubscribeFromMessages: () => {
        const socket = useAuthStore.getState().socket;
        if (!socket) {
            set({ hasSocketListeners: false, typingUserIds: [] });
            return;
        }

        socket.off("message:new");
        socket.off("group:message:new");
        socket.off("group:created");
        socket.off("messages:seen");
        socket.off("messages:delivered");
        socket.off("message:deleted");
        socket.off("typing:start");
        socket.off("typing:stop");
        set({ hasSocketListeners: false, typingUserIds: [] });
    },

    setSelectedUser: (selectedUser) =>
        set((state) => ({
            selectedUser,
            users: selectedUser
                ? sortConversations(
                    state.users.map((conversation) => {
                        const isMatch = selectedUser?.isGroup
                            ? Boolean(conversation.isGroup) && conversation._id === selectedUser._id
                            : !conversation.isGroup && conversation._id === selectedUser._id;

                        return isMatch ? { ...conversation, unreadCount: 0 } : conversation;
                    })
                )
                : state.users,
        })),
}));
