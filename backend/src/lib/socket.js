import { Server } from "socket.io";
import http from "http";
import express from "express";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";

const app = express();

const server = http.createServer(app);

const io = new Server((server), {
    cors: {
        origin: [process.env.CLIENT_URL || "http://localhost:5173"],
        methods: ["GET", "POST"],
        credentials: true,
    },
});

const userSocketMap = new Map();   // {userId:Set(socketId)}

const getOnlineUserIds = () => Array.from(userSocketMap.keys());

export function isUserOnline(userId) {
    return userSocketMap.has(userId?.toString());
}

export function emitToUser(userId, event, payload) {
    if (!userId) return;
    io.to(`user:${userId}`).emit(event, payload);
}

export function getRecieverSocketId(userId) {
    const socketIds = userSocketMap.get(userId?.toString());
    return socketIds ? Array.from(socketIds)[0] : null;
}

io.on("connection", async (socket) => {
    console.log("A user connected ", socket.id);

    const userId = socket.handshake.query.userId?.toString();
    if (userId) {
        const existingSockets = userSocketMap.get(userId) || new Set();
        existingSockets.add(socket.id);
        userSocketMap.set(userId, existingSockets);
        socket.data.userId = userId;
        socket.join(`user:${userId}`);

        const deliveredAt = new Date();
        const undeliveredMessages = await Message.find({
            recieverId: userId,
            deliveredAt: null,
        })
            .select("_id senderId")
            .lean()
            .catch(() => []);

        if (undeliveredMessages.length > 0) {
            await Message.updateMany(
                {
                    _id: {
                        $in: undeliveredMessages.map((message) => message._id),
                    },
                },
                {
                    $set: {
                        deliveredAt,
                    },
                }
            ).catch(() => null);

            const messageIdsBySender = new Map();
            for (const message of undeliveredMessages) {
                const senderId = message.senderId.toString();
                const existingMessageIds = messageIdsBySender.get(senderId) || [];
                existingMessageIds.push(message._id.toString());
                messageIdsBySender.set(senderId, existingMessageIds);
            }

            for (const [senderId, messageIds] of messageIdsBySender.entries()) {
                emitToUser(senderId, "messages:delivered", {
                    toUserId: userId,
                    messageIds,
                    deliveredAt,
                });
            }
        }
    }

    io.emit("onlineUsers", getOnlineUserIds());

    socket.on("chat:join", ({ targetUserId } = {}) => {
        socket.data.activeChatPartnerId = targetUserId?.toString() || null;
    });

    socket.on("chat:leave", () => {
        socket.data.activeChatPartnerId = null;
    });

    socket.on("typing:start", ({ targetUserId } = {}) => {
        if (!userId || !targetUserId) return;
        emitToUser(targetUserId, "typing:start", { fromUserId: userId });
    });

    socket.on("typing:stop", ({ targetUserId } = {}) => {
        if (!userId || !targetUserId) return;
        emitToUser(targetUserId, "typing:stop", { fromUserId: userId });
    });

    socket.on("disconnect", async () => {
        console.log("A User Disconnected ", socket.id);
        if (userId) {
            const existingSockets = userSocketMap.get(userId);
            if (existingSockets) {
                existingSockets.delete(socket.id);
                if (existingSockets.size === 0) {
                    userSocketMap.delete(userId);
                    await User.findByIdAndUpdate(userId, { lastSeen: new Date() }).catch(() => null);
                } else {
                    userSocketMap.set(userId, existingSockets);
                }
            }
        }

        io.emit("onlineUsers", getOnlineUserIds());
    });
});

export { io, app, server };
