// src/routes/message.routes.ts
import { Router } from "express";
import * as messageController from "../controllers/message.controller";
import { authorization } from "../middlewares/authorization.middlware";

const router = Router();

// All routes require authentication
router.use(authorization);

// Send message
router.post("/", messageController.sendMessage);

// Get conversations
router.get("/conversations", messageController.getConversations);
router.get(
  "/conversation/:otherEntityId/:otherEntityType",
  messageController.getConversation
);

// Message actions
router.put("/:messageId/read", messageController.markAsRead);
router.put(
  "/conversation/:otherEntityId/read-all",
  messageController.markConversationAsRead
);
router.delete("/:messageId", messageController.deleteMessage);

// Message queries
router.get("/search", messageController.searchMessages);
router.get("/media", messageController.getMediaMessages);
router.get("/stats", messageController.getMessageStats);

export default router;
