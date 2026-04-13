import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import Group from "../models/group.model.js";
import cloudinary from "../lib/cloudinary.js";
import { emitToGroup, emitToUser, isUserOnline } from "../lib/socket.js";

const toId = (value) => value?.toString?.() || "";

const buildMessagePreview = (message, loggedInUserId) => {
    if (!message) {
        return null;
    }

    return {
        _id: message._id,
        text: message.text || (message.image ? "Photo attachment" : ""),
        hasImage: Boolean(message.image),
        createdAt: message.createdAt,
        senderId: toId(message.senderId),
        recieverId: toId(message.recieverId),
        groupId: toId(message.groupId),
        isMine: toId(message.senderId) === loggedInUserId,
    };
};

const sortConversations = (items) =>
    [...items].sort((left, right) => {
        const leftTime = left.lastMessage?.createdAt ? new Date(left.lastMessage.createdAt).getTime() : 0;
        const rightTime = right.lastMessage?.createdAt ? new Date(right.lastMessage.createdAt).getTime() : 0;
        const leftName = left.fullName || "";
        const rightName = right.fullName || "";
        return rightTime - leftTime || leftName.localeCompare(rightName);
    });

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

const markGroupMessagesAsSeen = async ({ viewerId, groupId }) => {
    const result = await Message.updateMany(
        {
            groupId,
            senderId: { $ne: viewerId },
            seenBy: { $nin: [viewerId] },
        },
        {
            $addToSet: { seenBy: viewerId },
        }
    );

    return result.modifiedCount;
};

export const getUsersForSidebar = async (req, res) => {
    try {
        const loggedInUserId = req.user._id;
        const loggedInUserIdString = loggedInUserId.toString();
        const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } })
            .select("-password")
            .lean();

        const groups = await Group.find({
            members: loggedInUserId,
        })
            .select("name avatar members createdAt")
            .lean();

        const groupIds = groups.map((group) => group._id);

        const conversations = await Message.find({
            $or: [
                { senderId: loggedInUserId },
                { recieverId: loggedInUserId },
            ],
            groupId: null,
        })
            .sort({ createdAt: -1 })
            .lean();

        const groupConversations = groupIds.length
            ? await Message.find({
                groupId: { $in: groupIds },
            })
                .sort({ createdAt: -1 })
                .lean()
            : [];

        const conversationMeta = new Map();

        for (const message of conversations) {
            const senderId = toId(message.senderId);
            const recieverId = toId(message.recieverId);
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

        const groupMeta = new Map();
        for (const message of groupConversations) {
            const groupId = toId(message.groupId);
            if (!groupMeta.has(groupId)) {
                groupMeta.set(groupId, {
                    lastMessage: buildMessagePreview(message, loggedInUserIdString),
                    unreadCount: 0,
                });
            }

            const senderId = toId(message.senderId);
            const seenBy = Array.isArray(message.seenBy) ? message.seenBy.map(toId) : [];
            const isUnread = senderId !== loggedInUserIdString && !seenBy.includes(loggedInUserIdString);

            if (isUnread) {
                const meta = groupMeta.get(groupId);
                meta.unreadCount += 1;
            }
        }

        const users = filteredUsers
            .map((user) => ({
                ...user,
                isGroup: false,
                lastMessage: conversationMeta.get(user._id.toString())?.lastMessage || null,
                unreadCount: conversationMeta.get(user._id.toString())?.unreadCount || 0,
            }));

        const groupItems = groups.map((group) => ({
            _id: group._id,
            fullName: group.name,
            email: "",
            profilePic: group.avatar || "",
            isGroup: true,
            members: group.members,
            memberCount: group.members.length,
            createdAt: group.createdAt,
            lastMessage: groupMeta.get(group._id.toString())?.lastMessage || null,
            unreadCount: groupMeta.get(group._id.toString())?.unreadCount || 0,
        }));

        res.status(200).json(sortConversations([...users, ...groupItems]));

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
            ],
            groupId: null,
        }).sort({ createdAt: 1 });

        res.status(200).json(messages);

    } catch (error) {
        console.log("Error in getMessages: ", error.message);
        res.status(500).json({ message: "Internal server error!" });
    }
}

export const getGroupMessages = async (req, res) => {
    try {
        const { id: groupId } = req.params;
        const myId = req.user._id;

        const group = await Group.findOne({
            _id: groupId,
            members: myId,
        }).lean();

        if (!group) {
            return res.status(404).json({ message: "Group not found!" });
        }

        await markGroupMessagesAsSeen({ viewerId: myId, groupId });

        const messages = await Message.find({ groupId })
            .sort({ createdAt: 1 })
            .populate("senderId", "_id fullName profilePic lastSeen");

        res.status(200).json(messages);
    } catch (error) {
        console.log("Error in getGroupMessages: ", error.message);
        res.status(500).json({ message: "Internal server error!" });
    }
};

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
            groupId: null,
            senderId,
            deliveredAt,
            seenBy: [],
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

export const sendGroupMessage = async (req, res) => {
    try {
        const { text, image } = req.body;
        const { id: groupId } = req.params;
        const senderId = req.user._id;

        if (!text?.trim() && !image) {
            return res.status(400).json({ message: "Message content is required!" });
        }

        const group = await Group.findOne({
            _id: groupId,
            members: senderId,
        });

        if (!group) {
            return res.status(404).json({ message: "Group not found!" });
        }

        let imageUrl;
        if (image) {
            const uploadResponse = await cloudinary.uploader.upload(image);
            imageUrl = uploadResponse.secure_url;
        }

        const newMessage = new Message({
            text: text?.trim() || "",
            image: imageUrl,
            groupId,
            senderId,
            seenBy: [senderId],
            deliveredAt: new Date(),
        });

        await newMessage.save();

        const populatedMessage = await Message.findById(newMessage._id).populate(
            "senderId",
            "_id fullName profilePic lastSeen"
        );

        emitToGroup(groupId, "group:message:new", populatedMessage);

        res.status(201).json(populatedMessage);
    } catch (error) {
        console.log("Error in sendGroupMessage: ", error.message);
        res.status(500).json({ message: "Internal server error!" });
    }
};

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

export const markGroupMessagesAsSeenController = async (req, res) => {
    try {
        const { id: groupId } = req.params;
        const viewerId = req.user._id;

        const group = await Group.findOne({
            _id: groupId,
            members: viewerId,
        }).lean();

        if (!group) {
            return res.status(404).json({ message: "Group not found!" });
        }

        await markGroupMessagesAsSeen({ viewerId, groupId });

        res.status(200).json({ success: true });
    } catch (error) {
        console.log("Error in markGroupMessagesAsSeenController: ", error.message);
        res.status(500).json({ message: "Internal server error!" });
    }
};

export const createGroup = async (req, res) => {
    try {
        const { name, memberIds = [], avatar = "" } = req.body;
        const creatorId = req.user._id;

        if (!name?.trim()) {
            return res.status(400).json({ message: "Group name is required!" });
        }

        const uniqueMemberIds = Array.from(
            new Set([...memberIds.map((id) => id?.toString()), creatorId.toString()].filter(Boolean))
        );

        if (uniqueMemberIds.length < 2) {
            return res.status(400).json({ message: "A group needs at least 2 members." });
        }

        const validMembers = await User.find({
            _id: { $in: uniqueMemberIds },
        })
            .select("_id")
            .lean();

        if (validMembers.length !== uniqueMemberIds.length) {
            return res.status(400).json({ message: "Some selected members are invalid." });
        }

        const group = await Group.create({
            name: name.trim(),
            avatar,
            members: uniqueMemberIds,
            createdBy: creatorId,
        });

        const responsePayload = {
            _id: group._id,
            fullName: group.name,
            email: "",
            profilePic: group.avatar || "",
            isGroup: true,
            members: group.members,
            memberCount: group.members.length,
            createdAt: group.createdAt,
            lastMessage: null,
            unreadCount: 0,
        };

        for (const memberId of group.members) {
            emitToUser(memberId, "group:created", responsePayload);
        }

        res.status(201).json(responsePayload);
    } catch (error) {
        console.log("Error in createGroup: ", error.message);
        res.status(500).json({ message: "Internal server error!" });
    }
};

export const deleteMessage = async (req, res) => {
    try {
        const { id: messageId } = req.params;
        const currentUserId = req.user._id.toString();

        const message = await Message.findById(messageId);

        if (!message) {
            return res.status(404).json({ message: "Message not found!" });
        }

        if (message.senderId.toString() !== currentUserId) {
            return res.status(403).json({ message: "You can only delete your own messages." });
        }

        const senderId = message.senderId.toString();
        const recieverId = toId(message.recieverId);
        const groupId = toId(message.groupId);

        await message.deleteOne();

        const lastConversationMessage = groupId
            ? await Message.findOne({ groupId })
                .sort({ createdAt: -1 })
                .lean()
            : await Message.findOne({
                $or: [
                    { senderId, recieverId },
                    { senderId: recieverId, recieverId: senderId },
                ],
                groupId: null,
            })
                .sort({ createdAt: -1 })
                .lean();

        const payload = {
            messageId,
            senderId,
            recieverId,
            groupId,
            lastMessage: lastConversationMessage
                ? {
                    _id: lastConversationMessage._id,
                    text: lastConversationMessage.text || "",
                    image: lastConversationMessage.image || "",
                    createdAt: lastConversationMessage.createdAt,
                    senderId: lastConversationMessage.senderId,
                    recieverId: lastConversationMessage.recieverId,
                    groupId: lastConversationMessage.groupId,
                }
                : null,
        };

        if (groupId) {
            emitToGroup(groupId, "message:deleted", payload);
        } else {
            emitToUser(senderId, "message:deleted", payload);
            emitToUser(recieverId, "message:deleted", payload);
        }

        res.status(200).json({
            success: true,
            messageId,
            lastMessage: payload.lastMessage,
        });
    } catch (error) {
        console.log("Error in deleteMessage: ", error.message);
        res.status(500).json({ message: "Internal server error!" });
    }
};
