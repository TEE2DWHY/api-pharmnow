import { Router } from "express";
import * as notificationController from "../controllers/notification.controller";
import { authorization } from "../middlewares/authorization.middlware";

const router = Router();

// All routes require authentication
router.use(authorization);

// User routes (authenticated users can manage their notifications)
router.get("/", notificationController.getUserNotifications);
router.get("/unread-count", notificationController.getUnreadCount);
router.get("/recent", notificationController.getRecentNotifications);
router.get("/stats", notificationController.getNotificationStats);
router.get("/:id", notificationController.getNotificationById);

// Mark notifications as read/unread
router.put("/:id/read", notificationController.markAsRead);
router.put("/:id/unread", notificationController.markAsUnread);
router.put("/mark-all-read", notificationController.markAllAsRead);

// Delete notifications
router.delete("/:id", notificationController.deleteNotification);
router.delete("/bulk/read", notificationController.deleteAllRead);
router.delete("/bulk/all", notificationController.deleteAllNotifications);

// Admin/System routes (you might want to add admin middleware)
router.post("/", notificationController.createNotification);
router.post("/bulk", notificationController.createBulkNotifications);

export default router;
