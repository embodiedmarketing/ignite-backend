import type { Request, Response } from "express";
import { storage } from "../services/storage.service";

/**
 * Get checklist items for a user and section
 */
export async function getChecklistItems(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.userId);
    const sectionKey = req.params.sectionKey;

    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const items = await storage.getChecklistItems(userId, sectionKey);
    res.json(items);
  } catch (error) {
    console.error("Error fetching checklist items:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Upsert a checklist item
 */
export async function upsertChecklistItem(req: Request, res: Response) {
  try {
    const { userId, sectionKey, itemKey, isCompleted } = req.body;

    if (!userId || !sectionKey || !itemKey || isCompleted === undefined) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const item = await storage.upsertChecklistItem(
      userId,
      sectionKey,
      itemKey,
      isCompleted
    );
    res.status(200).json(item);
  } catch (error) {
    console.error("Error upserting checklist item:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

