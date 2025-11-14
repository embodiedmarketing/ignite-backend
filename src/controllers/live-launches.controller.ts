import type { Request, Response } from "express";
import { storage } from "../services/storage.service";

/**
 * Get all live launches for a user
 */
export async function getLiveLaunchesByUser(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const launches = await storage.getLiveLaunchesByUser(userId);
    res.json(launches);
  } catch (error) {
    console.error("Error getting live launches:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Get a single live launch by ID
 */
export async function getLiveLaunch(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid launch ID" });
    }

    const launch = await storage.getLiveLaunch(id);
    if (!launch) {
      return res.status(404).json({ message: "Launch not found" });
    }
    res.json(launch);
  } catch (error) {
    console.error("Error getting live launch:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Create a new live launch
 */
export async function createLiveLaunch(req: Request, res: Response) {
  try {
    const launch = await storage.createLiveLaunch(req.body);
    res.status(201).json(launch);
  } catch (error) {
    console.error("Error creating live launch:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Update a live launch
 */
export async function updateLiveLaunch(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid launch ID" });
    }

    const updated = await storage.updateLiveLaunch(id, req.body);
    if (!updated) {
      return res.status(404).json({ message: "Launch not found" });
    }
    res.json(updated);
  } catch (error) {
    console.error("Error updating live launch:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Delete a live launch
 */
export async function deleteLiveLaunch(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid launch ID" });
    }

    const deleted = await storage.deleteLiveLaunch(id);
    if (!deleted) {
      return res.status(404).json({ message: "Launch not found" });
    }
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting live launch:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Get funnel metrics for a live launch
 */
export async function getFunnelMetrics(req: Request, res: Response) {
  try {
    const liveLaunchId = parseInt(req.params.liveLaunchId);
    if (isNaN(liveLaunchId)) {
      return res.status(400).json({ message: "Invalid launch ID" });
    }

    const metrics = await storage.getFunnelMetricsByLaunch(liveLaunchId);
    res.json(metrics);
  } catch (error) {
    console.error("Error getting funnel metrics:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Create or update funnel metric
 */
export async function upsertFunnelMetric(req: Request, res: Response) {
  try {
    const liveLaunchId = parseInt(req.params.liveLaunchId);
    if (isNaN(liveLaunchId)) {
      return res.status(400).json({ message: "Invalid launch ID" });
    }

    const metric = await storage.upsertFunnelMetric({
      ...req.body,
      liveLaunchId,
    });
    res.status(201).json(metric);
  } catch (error) {
    console.error("Error creating/updating funnel metric:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Get organic metrics for a live launch
 */
export async function getOrganicMetrics(req: Request, res: Response) {
  try {
    const liveLaunchId = parseInt(req.params.liveLaunchId);
    if (isNaN(liveLaunchId)) {
      return res.status(400).json({ message: "Invalid launch ID" });
    }

    const metrics = await storage.getOrganicMetricsByLaunch(liveLaunchId);
    res.json(metrics);
  } catch (error) {
    console.error("Error getting organic metrics:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Create or update organic metric
 */
export async function upsertOrganicMetric(req: Request, res: Response) {
  try {
    const liveLaunchId = parseInt(req.params.liveLaunchId);
    if (isNaN(liveLaunchId)) {
      return res.status(400).json({ message: "Invalid launch ID" });
    }

    const metric = await storage.upsertOrganicMetric({
      ...req.body,
      liveLaunchId,
    });
    res.status(201).json(metric);
  } catch (error) {
    console.error("Error creating/updating organic metric:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Get email tracking for a live launch
 */
export async function getEmailTrackingByLaunch(req: Request, res: Response) {
  try {
    const liveLaunchId = parseInt(req.params.liveLaunchId);
    const userId = parseInt(req.query.userId as string);

    if (isNaN(liveLaunchId) || isNaN(userId)) {
      return res
        .status(400)
        .json({ message: "Invalid launch ID or user ID" });
    }

    const emails = await storage.getEmailTrackingByLaunch(
      userId,
      liveLaunchId
    );
    res.json(emails);
  } catch (error) {
    console.error("Error getting email tracking by launch:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Get optimization suggestions for a live launch
 */
export async function getOptimizationSuggestions(req: Request, res: Response) {
  try {
    const liveLaunchId = parseInt(req.params.liveLaunchId);
    if (isNaN(liveLaunchId)) {
      return res.status(400).json({ message: "Invalid launch ID" });
    }

    const suggestions = await storage.getLiveLaunchOptimizationSuggestions(
      liveLaunchId
    );
    res.json(suggestions);
  } catch (error) {
    console.error("Error getting optimization suggestions:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Create optimization suggestions for a live launch
 */
export async function createOptimizationSuggestions(
  req: Request,
  res: Response
) {
  try {
    const liveLaunchId = parseInt(req.params.liveLaunchId);
    if (isNaN(liveLaunchId)) {
      return res.status(400).json({ message: "Invalid launch ID" });
    }

    const suggestion = await storage.createLiveLaunchOptimizationSuggestion({
      ...req.body,
      liveLaunchId,
    });
    res.status(201).json(suggestion);
  } catch (error) {
    console.error("Error creating optimization suggestion:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

