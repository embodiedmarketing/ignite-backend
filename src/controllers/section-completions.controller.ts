import type { Request, Response } from "express";
import { storage } from "../services/storage.service";
import { insertSectionCompletionSchema } from "../models";

/**
 * Get all section completions for a user
 */
export async function getSectionCompletions(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const completions = await storage.getSectionCompletions(userId);
    res.json(completions);
  } catch (error) {
    console.error("Error fetching section completions:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Mark a section as complete
 */
export async function markSectionComplete(req: Request, res: Response) {
  try {
    const completionData = insertSectionCompletionSchema.parse(req.body);
    const completion = await storage.markSectionComplete(completionData);
    res.status(201).json(completion);
  } catch (error) {
    console.error("Error marking section complete:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Unmark a section as complete
 */
export async function unmarkSectionComplete(req: Request, res: Response) {
  try {
    const { userId, stepNumber, sectionTitle, offerNumber } = req.body;

    if (!userId || !stepNumber || !sectionTitle) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const success = await storage.unmarkSectionComplete(
      userId,
      stepNumber,
      sectionTitle,
      offerNumber
    );
    if (!success) {
      return res
        .status(404)
        .json({ message: "Section completion not found" });
    }
    res.status(204).send();
  } catch (error) {
    console.error("Error unmarking section complete:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

