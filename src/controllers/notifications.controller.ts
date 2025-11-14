import type { Request, Response } from "express";
import { storage } from "../services/storage.service";

/**
 * Helper to get userId from either OAuth or session
 */
function getUserId(req: Request): number | undefined {
  return (req.user as any)?.id || req.session.userId;
}

/**
 * Get all notifications for the current user
 */
export async function getNotifications(req: Request, res: Response) {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const notifications = await storage.getNotificationsByUser(userId);
    res.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Get unread notifications count
 */
export async function getUnreadCount(req: Request, res: Response) {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const count = await storage.getUnreadNotificationsCount(userId);
    res.json({ count });
  } catch (error) {
    console.error("Error fetching unread notifications count:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(req: Request, res: Response) {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid notification ID" });
    }

    const notification = await storage.markNotificationAsRead(id);
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    res.json(notification);
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(req: Request, res: Response) {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    await storage.markAllNotificationsAsRead(userId);
    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(req: Request, res: Response) {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid notification ID" });
    }

    const deleted = await storage.deleteNotification(id);
    if (!deleted) {
      return res.status(404).json({ message: "Notification not found" });
    }
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

