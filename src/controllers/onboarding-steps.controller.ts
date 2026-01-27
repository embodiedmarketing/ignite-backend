import type { Request, Response } from "express";
import { storage } from "../services/storage.service";
import {
  insertOnboardingStepSchema,
  updateOnboardingStepSchema,
} from "../models";

/**
 * Get all onboarding steps
 */
export async function getAllOnboardingSteps(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const steps = await storage.getAllOnboardingSteps();
    res.json(steps);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error("Error fetching onboarding steps:", {
      name: errorName,
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    res.status(500).json({ message: "Failed to fetch onboarding steps" });
  }
}

/**
 * Create a new onboarding step
 */
export async function createOnboardingStep(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const validatedData = insertOnboardingStepSchema.parse(req.body);
    
    // Set buttonAction default to "link" if buttonText is provided but buttonAction is not
    const stepData = {
      ...validatedData,
      buttonAction: validatedData.buttonText && !validatedData.buttonAction 
        ? "link" 
        : validatedData.buttonAction || null,
    };
    
    const step = await storage.createOnboardingStep(stepData);
    res.status(201).json(step);
  } catch (error) {
    // Safely serialize error for logging
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error("Error creating onboarding step:", {
      name: errorName,
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    if (error instanceof Error && error.name === "ZodError") {
      const zodError = error as any;
      return res.status(400).json({
        message: "Invalid request data",
        details: zodError.errors || error.message,
      });
    }

    // Check for duplicate key error (PostgreSQL unique constraint violation)
    if (error instanceof Error && error.message.includes("duplicate key")) {
      return res.status(400).json({
        message: "An onboarding step with this ID already exists",
      });
    }

    res.status(500).json({ message: "Failed to create onboarding step" });
  }
}

/**
 * Update an onboarding step
 */
export async function updateOnboardingStep(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ message: "Step ID is required" });
    }

    const idNum = parseInt(id, 10);
    if (isNaN(idNum)) {
      return res.status(400).json({ message: "Invalid step ID format" });
    }

    const validatedData = updateOnboardingStepSchema.parse({
      ...req.body,
      id: idNum,
    });

    // Remove id from update data
    const { id: _, ...updateData } = validatedData;
    
    // Set buttonAction default to "link" if buttonText is provided but buttonAction is not
    if (updateData.buttonText && !updateData.buttonAction) {
      updateData.buttonAction = "link";
    }

    const updated = await storage.updateOnboardingStep(idNum, updateData);

    if (!updated) {
      return res.status(404).json({ message: "Onboarding step not found" });
    }

    res.json(updated);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error("Error updating onboarding step:", {
      name: errorName,
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (error instanceof Error && error.name === "ZodError") {
      const zodError = error as any;
      return res.status(400).json({
        message: "Invalid request data",
        details: zodError.errors || error.message,
      });
    }

    res.status(500).json({ message: "Failed to update onboarding step" });
  }
}

/**
 * Delete an onboarding step
 */
export async function deleteOnboardingStep(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Step ID is required" });
    }

    const idNum = parseInt(id, 10);
    if (isNaN(idNum)) {
      return res.status(400).json({ message: "Invalid step ID format" });
    }

    const deleted = await storage.deleteOnboardingStep(idNum);

    if (!deleted) {
      return res.status(404).json({ message: "Onboarding step not found" });
    }

    res.json({
      message: "Onboarding step deleted successfully",
      id: idNum,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error("Error deleting onboarding step:", {
      name: errorName,
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    res.status(500).json({ message: "Failed to delete onboarding step" });
  }
}

