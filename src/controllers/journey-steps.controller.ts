import type { Request, Response } from "express";
import { storage } from "../services/storage.service";
import {
  insertJourneyStepSchema,
  updateJourneyStepSchema,
} from "../models";

/**
 * Get all journey steps (public endpoint)
 */
export async function getAllJourneySteps(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const steps = await storage.getAllJourneySteps();
    res.json(steps);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error("Error fetching journey steps:", {
      name: errorName,
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    res.status(500).json({ message: "Failed to fetch journey steps" });
  }
}

/**
 * Create a new journey step (admin only)
 */
export async function createJourneyStep(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const validatedData = insertJourneyStepSchema.parse(req.body);
    const step = await storage.createJourneyStep(validatedData);
    res.status(201).json(step);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error("Error creating journey step:", {
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

    res.status(500).json({ message: "Failed to create journey step" });
  }
}

/**
 * Update a journey step (admin only)
 */
export async function updateJourneyStep(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({ message: "Journey step ID is required" });
      return;
    }

    const idNum = parseInt(id, 10);
    if (isNaN(idNum)) {
      res.status(400).json({ message: "Invalid journey step ID format" });
      return;
    }

    const validatedData = updateJourneyStepSchema.parse(req.body);

    const updated = await storage.updateJourneyStep(idNum, validatedData);

    if (!updated) {
      res.status(404).json({ message: "Journey step not found" });
      return;
    }

    res.json(updated);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error("Error updating journey step:", {
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

    res.status(500).json({ message: "Failed to update journey step" });
  }
}

/**
 * Delete a journey step (admin only)
 */
export async function deleteJourneyStep(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ message: "Journey step ID is required" });
      return;
    }

    const idNum = parseInt(id, 10);
    if (isNaN(idNum)) {
      res.status(400).json({ message: "Invalid journey step ID format" });
      return;
    }

    const deleted = await storage.deleteJourneyStep(idNum);

    if (!deleted) {
      res.status(404).json({ message: "Journey step not found" });
      return;
    }

    res.json({
      message: "Journey step deleted successfully",
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error("Error deleting journey step:", {
      name: errorName,
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    res.status(500).json({ message: "Failed to delete journey step" });
  }
}

