import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { emitToUser, isUserOnline } from "../lib/socket.js";

const buildMessagePreview = (message, loggedInUserId) => {
    if (!message) {
        return null;
    }

    return {
        _id: message._id,
        text: message.text || (message.image ? "Photo attachment" : ""),
        hasImage: Boolean(message.image),
        createdAt: message.createdAt,
        senderId: message.senderId?.toString(),
        isMine: message.senderId?.toString() === loggedInUserId,
    };
};

const markConversationAsSeen = async ({ viewerId, otherUserId }) => {
    const seenAt = new Date();
    const result = await Message.updateMany(
        {
            senderId: otherUserId,
            recieverId: viewerId,
            seenAt: null,
        },
        {
            $set: {
                seenAt,
                deliveredAt: seenAt,
            },
        }
    );

    if (result.modifiedCount > 0) {
        emitToUser(otherUserId, "messages:seen", {
            byUserId: viewerId.toString(),
            messageIds: [],
            seenAt,
        });
    }

    return result.modifiedCount;
};

export const getUsersForSidebar = async (req, res) => {
    try {
        const loggedInUserId = req.user._id;
        const loggedInUserIdString = loggedInUserId.toString();
        const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } })
            .select("-password")
            .lean();

        const conversations = await Message.find({
            $or: [
                { senderId: loggedInUserId },
                { recieverId: loggedInUserId },
            ],
        })
            .sort({ createdAt: -1 })
            .lean();

        const conversationMeta = new Map();

        for (const message of conversations) {
            const senderId = message.senderId.toString();
            const recieverId = message.recieverId.toString();
            const otherUserId = senderId === loggedInUserIdString ? recieverId : senderId;

            if (!conversationMeta.has(otherUserId)) {
                conversationMeta.set(otherUserId, {
                    lastMessage: buildMessagePreview(message, loggedInUserIdString),
                    unreadCount: 0,
                });
            }

            if (recieverId === loggedInUserIdString && !message.seenAt) {
                const meta = conversationMeta.get(otherUserId);
                meta.unreadCount += 1;
            }
        }

        const users = filteredUsers
            .map((user) => ({
                ...user,
                lastMessage: conversationMeta.get(user._id.toString())?.lastMessage || null,
                unreadCount: conversationMeta.get(user._id.toString())?.unreadCount || 0,
            }))
            .sort((left, right) => {
                const leftTime = left.lastMessage?.createdAt ? new Date(left.lastMessage.createdAt).getTime() : 0;
                const rightTime = right.lastMessage?.createdAt ? new Date(right.lastMessage.createdAt).getTime() : 0;
                return rightTime - leftTime || left.fullName.localeCompare(right.fullName);
            });

        res.status(200).json(users);

    } catch (error) {
        console.log("Error in getUsersForSidebar: ", error.message);
        res.status(500).json({ message: "Internal server error!" });
    }
};

export const getMessages = async (req, res) => {
    try {
        const { id: userToChatId } = req.params;
        const myId = req.user._id;

        await markConversationAsSeen({
            viewerId: myId,
            otherUserId: userToChatId,
        });

        const messages = await Message.find({
            $or: [
                { senderId: myId, recieverId: userToChatId },
                { senderId: userToChatId, recieverId: myId }
            ]
        }).sort({ createdAt: 1 });

        res.status(200).json(messages);

    } catch (error) {
        console.log("Error in getMessages: ", error.message);
        res.status(500).json({ message: "Internal server error!" });
    }
}

export const sendMessage = async (req, res) => {
    try {
        const { text, image } = req.body;
        const { id: recieverId } = req.params;
        const senderId = req.user._id;

        if (!text?.trim() && !image) {
            return res.status(400).json({ message: "Message content is required!" });
        }

        let imageUrl;
        if (image) {
            const uploadResponse = await cloudinary.uploader.upload(image);
            imageUrl = uploadResponse.secure_url;
        }

        const deliveredAt = isUserOnline(recieverId) ? new Date() : null;

        const newMessage = new Message({
            text: text?.trim() || "",
            image: imageUrl,
            recieverId,
            senderId,
            deliveredAt,
        });

        await newMessage.save();

        emitToUser(recieverId, "message:new", newMessage);
        emitToUser(senderId, "message:new", newMessage);

        res.status(201).json(newMessage);

    } catch (error) {
        console.log("Error in sendMessage: ", error.message);
        res.status(500).json({ message: "Internal server error!" });
    }
}

export const markMessagesAsSeen = async (req, res) => {
    try {
        const { id: otherUserId } = req.params;
        const viewerId = req.user._id;

        await markConversationAsSeen({
            viewerId,
            otherUserId,
        });

        const updatedMessages = await Message.find({
            senderId: otherUserId,
            recieverId: viewerId,
        })
            .select("_id seenAt deliveredAt")
            .lean();

        res.status(200).json({
            seenMessages: updatedMessages,
        });
    } catch (error) {
        console.log("Error in markMessagesAsSeen: ", error.message);
        res.status(500).json({ message: "Internal server error!" });
    }
};
