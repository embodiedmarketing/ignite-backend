import type { Request, Response } from "express";
import { storage } from "../services/storage.service";
import {
  insertOrientationVideoSchema,
  updateOrientationVideoSchema,
} from "../models";

/**
 * Get orientation video (public endpoint)
 * Returns the first orientation video found, or 404 if none exists
 */
export async function getOrientationVideo(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const video = await storage.getOrientationVideo();
    
    if (!video) {
      res.status(404).json({ message: "Orientation video not found" });
      return;
    }

    res.json(video);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error("Error fetching orientation video:", {
      name: errorName,
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    res.status(500).json({ message: "Failed to fetch orientation video" });
  }
}

/**
 * Create a new orientation video (admin only)
 */
export async function createOrientationVideo(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const validatedData = insertOrientationVideoSchema.parse(req.body);
    
    // Ensure stepNumber is 0
    const videoData = {
      ...validatedData,
      stepNumber: 0,
    };

    const video = await storage.createOrientationVideo(videoData);
    res.status(201).json(video);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error("Error creating orientation video:", {
      name: errorName,
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    if (error instanceof Error && error.name === "ZodError") {
      const zodError = error as any;
      res.status(400).json({
        message: "Invalid request data",
        details: zodError.errors || error.message,
      });
      return;
    }

    res.status(500).json({ message: "Failed to create orientation video" });
  }
}

/**
 * Update an orientation video (admin only)
 */
export async function updateOrientationVideo(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({ message: "Orientation video ID is required" });
      return;
    }

    const idNum = parseInt(id, 10);
    if (isNaN(idNum)) {
      res.status(400).json({ message: "Invalid orientation video ID format" });
      return;
    }

    const validatedData = updateOrientationVideoSchema.parse(req.body);

    // Ensure stepNumber remains 0 if provided
    const updateData = {
      ...validatedData,
      stepNumber: validatedData.stepNumber !== undefined ? 0 : undefined,
    };

    const updated = await storage.updateOrientationVideo(idNum, updateData);

    if (!updated) {
      res.status(404).json({ message: "Orientation video not found" });
      return;
    }

    res.json(updated);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error("Error updating orientation video:", {
      name: errorName,
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (error instanceof Error && error.name === "ZodError") {
      const zodError = error as any;
      res.status(400).json({
        message: "Invalid request data",
        details: zodError.errors || error.message,
      });
      return;
    }

    res.status(500).json({ message: "Failed to update orientation video" });
  }
}

/**
 * Delete an orientation video (admin only)
 */
export async function deleteOrientationVideo(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ message: "Orientation video ID is required" });
      return;
    }

    const idNum = parseInt(id, 10);
    if (isNaN(idNum)) {
      res.status(400).json({ message: "Invalid orientation video ID format" });
      return;
    }

    const deleted = await storage.deleteOrientationVideo(idNum);

    if (!deleted) {
      res.status(404).json({ message: "Orientation video not found" });
      return;
    }

    res.json({
      message: "Orientation video deleted successfully",
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error("Error deleting orientation video:", {
      name: errorName,
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    res.status(500).json({ message: "Failed to delete orientation video" });
  }
}

