import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
//  
import {
    createGroup,
    deleteMessage,
    getGroupMessages,
    getMessages,
    markGroupMessagesAsSeenController,
    markMessagesAsSeen,
    sendGroupMessage,
    sendMessage,
    getUsersForSidebar,
} from "../controllers/message.controller.js";
const router = express.Router();

router.get("/users", protectRoute, getUsersForSidebar);
router.post("/groups", protectRoute, createGroup);
router.post("/seen/:id", protectRoute, markMessagesAsSeen);
router.post("/group/seen/:id", protectRoute, markGroupMessagesAsSeenController);
router.get("/group/:id", protectRoute, getGroupMessages);
router.post("/send/:id", protectRoute, sendMessage);
router.post("/group/send/:id", protectRoute, sendGroupMessage);
router.get("/:id", protectRoute, getMessages);
router.delete("/:id", protectRoute, deleteMessage);


export default router;
