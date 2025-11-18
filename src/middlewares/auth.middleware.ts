import type { RequestHandler } from "express";
import { env } from "../config/env";

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
 * Authentication middleware - checks if user is authenticated
 */
export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
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
