import type { Request, Response, NextFunction } from "express";
import { storage } from "../services/storage.service";

/**
 * Admin middleware - check if user is admin
 * Supports both OAuth (req.user) and traditional auth (req.session.userId)
 */
export const isAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Support both authentication methods: req.user (OAuth) or req.session.userId (traditional)
  const userId = req.user?.id || req.session?.userId;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = await storage.getUser(userId);
  if (!user || !user.isAdmin) {
    return res
      .status(403)
      .json({ message: "Forbidden - Admin access required" });
  }

  next();
};
