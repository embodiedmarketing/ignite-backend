import type { Request, Response } from "express";
import { storage } from "../services/storage.service";
import { insertCoachingCallRecordingSchema } from "@backend/models";
import { isAuthenticated } from "../middlewares/auth.middleware";

/**
 * Get all coaching call recordings
 */
export async function getCoachingCallRecordings(req: Request, res: Response) {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const recordings = await storage.getAllCoachingCallRecordings();
    res.json(recordings);
  } catch (error) {
    console.error("Error fetching coaching call recordings:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Get a specific coaching call recording by ID
 */
export async function getCoachingCallRecording(req: Request, res: Response) {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid recording ID" });
    }

    const recording = await storage.getCoachingCallRecording(id);
    if (!recording) {
      return res.status(404).json({ message: "Recording not found" });
    }

    res.json(recording);
  } catch (error) {
    console.error("Error fetching coaching call recording:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Create a new coaching call recording
 */
export async function createCoachingCallRecording(req: Request, res: Response) {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Validate and parse the request body (no userId needed)
    const validated = insertCoachingCallRecordingSchema.parse(req.body);

    const recording = await storage.createCoachingCallRecording(validated);
    res.status(201).json(recording);
  } catch (error: any) {
    console.error("Error creating coaching call recording:", error);
    if (error.name === "ZodError") {
      return res.status(400).json({
        message: "Validation error",
        errors: error.errors,
      });
    }
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Update a coaching call recording
 */
export async function updateCoachingCallRecording(req: Request, res: Response) {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid recording ID" });
    }

    // Check if recording exists
    const existingRecording = await storage.getCoachingCallRecording(id);
    if (!existingRecording) {
      return res.status(404).json({ message: "Recording not found" });
    }

    // Validate updates
    const validated = insertCoachingCallRecordingSchema.partial().parse(req.body);

    const updated = await storage.updateCoachingCallRecording(id, validated);
    if (!updated) {
      return res.status(404).json({ message: "Recording not found" });
    }

    res.json(updated);
  } catch (error: any) {
    console.error("Error updating coaching call recording:", error);
    if (error.name === "ZodError") {
      return res.status(400).json({
        message: "Validation error",
        errors: error.errors,
      });
    }
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Delete a coaching call recording
 */
export async function deleteCoachingCallRecording(req: Request, res: Response) {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid recording ID" });
    }

    // Check if recording exists
    const existingRecording = await storage.getCoachingCallRecording(id);
    if (!existingRecording) {
      return res.status(404).json({ message: "Recording not found" });
    }

    const deleted = await storage.deleteCoachingCallRecording(id);
    if (!deleted) {
      return res.status(404).json({ message: "Recording not found" });
    }

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting coaching call recording:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

