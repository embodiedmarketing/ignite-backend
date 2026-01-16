import type { RequestHandler } from "express";
import { env } from "../config/env";
import { storage } from "../services/storage.service";

// Extend session type to include userId
declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

// Extend Express Request type to include optional user property for OAuth
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        [key: string]: any;
      };
    }
  }
}

/**
 * Authentication middleware - checks if user is authenticated and active
 */
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (!req.session.userId) {
    console.log(`[AUTH] Unauthorized - no userId in session. Session ID: ${req.sessionID}, Session:`, req.session);
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Check if user is active
  try {
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      // User doesn't exist, destroy session
      req.session.destroy(() => {});
      return res.status(401).json({ message: "User not found" });
    }

    if (user.isActive === false) {
      // User is inactive, destroy session
      req.session.destroy(() => {});
      return res.status(403).json({ 
        message: "Your account has been deactivated. Please contact support." ,
      });
    }
  } catch (error) {
    console.error("Error checking user status:", error);
    return res.status(500).json({ message: "Internal server error" });
  }

  next();
};

/**
 * Helper function to get userId from request
 * Supports both OAuth (req.user) and traditional auth (req.session.userId)
 */
export const getUserId = (req: any): number | undefined => {
  return (req.user as any)?.id || req.session.userId;
};




