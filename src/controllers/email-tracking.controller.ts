import type { Request, Response } from "express";
import { storage } from "../services/storage.service";

/**
 * Get all email tracking for a user
 */
export async function getEmailTrackingByUser(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const emails = await storage.getEmailTrackingByUser(userId);
    res.json(emails);
  } catch (error) {
    console.error("Error getting email tracking:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Get email tracking for a user by date
 */
export async function getEmailTrackingByDate(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.userId);
    const date = req.params.date;

    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const emails = await storage.getEmailTrackingByDate(userId, date);
    res.json(emails);
  } catch (error) {
    console.error("Error getting email tracking by date:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Create email tracking record
 */
export async function createEmailTracking(req: Request, res: Response) {
  try {
    const email = await storage.createEmailTracking(req.body);
    res.status(201).json(email);
  } catch (error) {
    console.error("Error creating email tracking:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Update email tracking record
 */
export async function updateEmailTracking(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid email tracking ID" });
    }

    const updated = await storage.updateEmailTracking(id, req.body);
    if (!updated) {
      return res.status(404).json({ message: "Email tracking not found" });
    }
    res.json(updated);
  } catch (error) {
    console.error("Error updating email tracking:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Delete email tracking record
 */
export async function deleteEmailTracking(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid email tracking ID" });
    }

    const deleted = await storage.deleteEmailTracking(id);
    if (!deleted) {
      return res.status(404).json({ message: "Email tracking not found" });
    }
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting email tracking:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

