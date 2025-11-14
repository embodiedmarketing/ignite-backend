import type { Request, Response } from "express";
import { storage } from "../services/storage.service";
import { insertMessagingStrategySchema } from "../models";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { getUserId } from "../middlewares/auth.middleware";

/**
 * Get all messaging strategies for a user
 */
export async function getMessagingStrategiesByUser(
  req: Request,
  res: Response
) {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const strategies = await storage.getMessagingStrategiesByUser(userId);
    res.json(strategies);
  } catch (error) {
    console.error("Error fetching messaging strategies:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Get active messaging strategy for a user
 */
export async function getActiveMessagingStrategy(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const strategy = await storage.getActiveMessagingStrategy(userId);
    if (!strategy) {
      return res
        .status(404)
        .json({ message: "No active messaging strategy found" });
    }
    res.json(strategy);
  } catch (error) {
    console.error("Error fetching active messaging strategy:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Create a new messaging strategy
 */
export async function createMessagingStrategy(req: Request, res: Response) {
  try {
    const strategyData = insertMessagingStrategySchema.parse(req.body);
    const strategy = await storage.createMessagingStrategy(strategyData);
    res.status(201).json(strategy);
  } catch (error) {
    console.error("Error creating messaging strategy:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Update an existing messaging strategy
 */
export async function updateMessagingStrategy(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid strategy ID" });
    }

    const strategy = await storage.updateMessagingStrategy(id, req.body);
    if (!strategy) {
      return res
        .status(404)
        .json({ message: "Messaging strategy not found" });
    }
    res.json(strategy);
  } catch (error) {
    console.error("Error updating messaging strategy:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Delete a messaging strategy
 */
export async function deleteMessagingStrategy(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid strategy ID" });
    }

    const deleted = await storage.deleteMessagingStrategy(id);
    if (!deleted) {
      return res.status(404).json({ message: "Strategy not found" });
    }
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting messaging strategy:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Set active messaging strategy for a user
 */
export async function setActiveMessagingStrategy(req: Request, res: Response) {
  try {
    const strategyId = parseInt(req.params.strategyId);
    const userId = parseInt(req.params.userId);
    if (isNaN(strategyId) || isNaN(userId)) {
      return res.status(400).json({ message: "Invalid strategy or user ID" });
    }

    const success = await storage.setActiveMessagingStrategy(
      userId,
      strategyId
    );
    if (!success) {
      return res.status(404).json({ message: "Strategy not found" });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Error activating messaging strategy:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

