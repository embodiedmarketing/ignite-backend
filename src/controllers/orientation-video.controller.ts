import type { Request, Response } from "express";
import { storage } from "../services/storage.service";
import {
  insertOrientationVideoSchema,
  updateOrientationVideoSchema,
} from "../models";
import { handleControllerError, parseIdParam } from "../utils/controller-error";

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
    handleControllerError(error, res, {
      logLabel: "fetching orientation video",
      defaultMessage: "Failed to fetch orientation video",
    });
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
    handleControllerError(error, res, {
      logLabel: "creating orientation video",
      defaultMessage: "Failed to create orientation video",
    });
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
    const idNum = parseIdParam(req.params.id, res, {
      paramName: "Orientation video ID",
    });
    if (idNum === undefined) return;

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
    handleControllerError(error, res, {
      logLabel: "updating orientation video",
      defaultMessage: "Failed to update orientation video",
    });
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
    const idNum = parseIdParam(req.params.id, res, {
      paramName: "Orientation video ID",
    });
    if (idNum === undefined) return;

    const deleted = await storage.deleteOrientationVideo(idNum);

    if (!deleted) {
      res.status(404).json({ message: "Orientation video not found" });
      return;
    }

    res.json({
      message: "Orientation video deleted successfully",
    });
  } catch (error) {
    handleControllerError(error, res, {
      logLabel: "deleting orientation video",
      defaultMessage: "Failed to delete orientation video",
    });
  }
}

