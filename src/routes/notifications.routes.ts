import { Router } from "express";
import {
  getNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from "../controllers/notifications.controller";

const router = Router();

router.get("/", getNotifications);
router.get("/unread-count", getUnreadCount);
router.patch("/:id/read", markNotificationAsRead);
router.patch("/mark-all-read", markAllNotificationsAsRead);
router.delete("/:id", deleteNotification);

export default router;

