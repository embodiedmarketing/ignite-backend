import type { Request, Response } from "express";
import { storage } from "../services/storage.service";
import { insertActivitySchema } from "@backend/models";

/**
 * Get all activities for a user
 */
export async function getActivitiesByUser(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.userId);
    const activities = await storage.getActivitiesByUser(userId);
    res.json(activities);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Create a new activity
 */
export async function createActivity(req: Request, res: Response) {
  try {
    const validated = insertActivitySchema.parse(req.body);
    const activity = await storage.createActivity(validated);
    res.status(201).json(activity);
  } catch (error) {
    res.status(400).json({ message: "Invalid activity data" });
  }
}

