import type { Request, Response } from "express";
import multer from "multer";
// TODO: Update when storage.service.ts is moved
import { storage } from "../services/storage.service";
import { getUserId } from "../middlewares/auth.middleware";
import type { User } from "../models";

// Configure multer for file uploads
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

/**
 * Save last visited page for "continue where you left off"
 */
export async function saveLastVisited(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const { path, sectionName } = req.body;

    await storage.updateUser(userId, {
      lastVisitedPath: path,
      lastVisitedSection: sectionName,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error saving last visited page:", error);
    res.status(500).json({ message: "Failed to save progress" });
  }
}

/**
 * Update user profile
 */
export async function updateProfile(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const { businessName, aboutMe } = req.body;

    const updates: Partial<User> = {};

    if (businessName !== undefined) {
      updates.businessName = businessName;
    }

    if (aboutMe !== undefined) {
      updates.aboutMe = aboutMe;
    }

    // Handle profile photo upload
    if (req.file) {
      const base64Image = `data:${
        req.file.mimetype
      };base64,${req.file.buffer.toString("base64")}`;
      updates.profileImageUrl = base64Image;
    }

    const updatedUser = await storage.updateUser(userId, updates);

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return user without password hash
    const { passwordHash, ...userWithoutPassword } = updatedUser;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ message: "Failed to update profile" });
  }
}

/**
 * Register FCM token for push notifications
 */
export async function registerFCMToken(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { token, deviceType, deviceId } = req.body;

    if (!token || typeof token !== "string") {
      return res.status(400).json({ message: "Token is required and must be a string" });
    }

    // Validate deviceType if provided
    if (deviceType && !["ios", "android", "web"].includes(deviceType)) {
      return res.status(400).json({ 
        message: "deviceType must be one of: ios, android, web" 
      });
    }

    // Register or update the device token
    const deviceToken = await storage.registerDeviceToken(
      userId,
      token,
      deviceType,
      deviceId
    );

    console.log(`[FCM] Device token registered for user ${userId}, device: ${deviceType || "unknown"}`);

    res.json({
      success: true,
      message: "FCM token registered successfully",
      deviceToken: {
        id: deviceToken.id,
        deviceType: deviceToken.deviceType,
        createdAt: deviceToken.createdAt,
      },
    });
  } catch (error) {
    console.error("Error registering FCM token:", error);
    res.status(500).json({ message: "Failed to register FCM token" });
  }
}

/**
 * Remove FCM token (for logout or token invalidation)
 */
export async function removeFCMToken(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { token } = req.body;

    if (!token || typeof token !== "string") {
      return res.status(400).json({ message: "Token is required and must be a string" });
    }

    const removed = await storage.removeDeviceToken(userId, token);

    if (removed) {
      console.log(`[FCM] Device token removed for user ${userId}`);
      res.json({ success: true, message: "FCM token removed successfully" });
    } else {
      res.status(404).json({ message: "Token not found" });
    }
  } catch (error) {
    console.error("Error removing FCM token:", error);
    res.status(500).json({ message: "Failed to remove FCM token" });
  }
}

