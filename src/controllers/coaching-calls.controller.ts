import type { Request, Response } from "express";
import { storage } from "../services/storage.service";
import { insertCoachingCallRecordingSchema, insertCoachingCallScheduleSchema } from "@backend/models";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { z } from "zod";

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

// ============================================
// Coaching Calls Schedule Endpoints
// ============================================

/**
 * Get all scheduled coaching calls
 */
export async function getCoachingCallsSchedule(req: Request, res: Response) {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const calls = await storage.getAllCoachingCallsSchedule();
    res.json(calls);
  } catch (error) {
    console.error("Error fetching coaching calls schedule:", error);
    res.status(500).json({ message: "Failed to fetch calls", error: error instanceof Error ? error.message : "Unknown error" });
  }
}

/**
 * Create a new scheduled coaching call (Admin only)
 * Accepts either a single object or an array of objects
 */
export async function createCoachingCallSchedule(req: Request, res: Response) {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Check if request body is an array
    const isArray = Array.isArray(req.body);
    
    if (isArray) {
      // Validate array of schedules
      const arraySchema = z.array(insertCoachingCallScheduleSchema);
      const validated = arraySchema.parse(req.body);

      if (validated.length === 0) {
        return res.status(400).json({
          message: "Failed to add calls",
          error: "Array cannot be empty",
        });
      }

      const calls = await storage.createCoachingCallSchedules(validated);
      res.status(201).json(calls);
    } else {
      // Validate single schedule (backward compatibility)
      const validated = insertCoachingCallScheduleSchema.parse(req.body);
      const call = await storage.createCoachingCallSchedule(validated);
      res.status(201).json(call);
    }
  } catch (error: any) {
    console.error("Error creating coaching call schedule:", error instanceof Error ? error.message : String(error));
    if (error?.name === "ZodError") {
      return res.status(400).json({
        message: "Failed to add call",
        error: "Validation error",
        errors: error.errors,
      });
    }
    res.status(500).json({ message: "Failed to add call", error: error?.message || "Internal server error" });
  }
}

/**
 * Update an existing scheduled coaching call (Admin only)
 */
export async function updateCoachingCallSchedule(req: Request, res: Response) {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid call ID" });
    }

    // Check if call exists
    const existingCall = await storage.getCoachingCallSchedule(id);
    if (!existingCall) {
      return res.status(404).json({ message: "Call not found" });
    }

    // Validate updates
    const validated = insertCoachingCallScheduleSchema.partial().parse(req.body);

    const updated = await storage.updateCoachingCallSchedule(id, validated);
    if (!updated) {
      return res.status(404).json({ message: "Call not found" });
    }

    res.json(updated);
  } catch (error: any) {
    console.error("Error updating coaching call schedule:", error);
    if (error.name === "ZodError") {
      return res.status(400).json({
        message: "Failed to update call",
        error: "Validation error",
        errors: error.errors,
      });
    }
    res.status(500).json({ message: "Failed to update call", error: error.message || "Internal server error" });
  }
}

/**
 * Delete a scheduled coaching call (Admin only)
 */
export async function deleteCoachingCallSchedule(req: Request, res: Response) {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid call ID" });
    }

    // Check if call exists
    const existingCall = await storage.getCoachingCallSchedule(id);
    if (!existingCall) {
      return res.status(404).json({ message: "Call not found" });
    }

    const deleted = await storage.deleteCoachingCallSchedule(id);
    if (!deleted) {
      return res.status(404).json({ message: "Call not found" });
    }

    res.json({ message: "Call deleted successfully", id: id.toString() });
  } catch (error) {
    console.error("Error deleting coaching call schedule:", error);
    res.status(500).json({ message: "Failed to delete call", error: error instanceof Error ? error.message : "Unknown error" });
  }
}

