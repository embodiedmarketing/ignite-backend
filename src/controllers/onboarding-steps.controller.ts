import type { Request, Response } from "express";
import { storage } from "../services/storage.service";
import {
  insertOnboardingStepSchema,
  updateOnboardingStepSchema,
} from "../models";
import { handleControllerError, parseIdParam } from "../utils/controller-error";

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
    handleControllerError(error, res, {
      logLabel: "fetching onboarding steps",
      defaultMessage: "Failed to fetch onboarding steps",
    });
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
    handleControllerError(error, res, {
      logLabel: "creating onboarding step",
      duplicateKeyMessage: "An onboarding step with this ID already exists",
      defaultMessage: "Failed to create onboarding step",
    });
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
    const idNum = parseIdParam(req.params.id, res, { paramName: "Step ID" });
    if (idNum === undefined) return;

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
      res.status(404).json({ message: "Onboarding step not found" });
      return;
    }

    res.json(updated);
  } catch (error) {
    handleControllerError(error, res, {
      logLabel: "updating onboarding step",
      defaultMessage: "Failed to update onboarding step",
    });
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
    const idNum = parseIdParam(req.params.id, res, { paramName: "Step ID" });
    if (idNum === undefined) return;

    const deleted = await storage.deleteOnboardingStep(idNum);

    if (!deleted) {
      res.status(404).json({ message: "Onboarding step not found" });
      return;
    }

    res.json({
      message: "Onboarding step deleted successfully",
      id: idNum,
    });
  } catch (error) {
    handleControllerError(error, res, {
      logLabel: "deleting onboarding step",
      defaultMessage: "Failed to delete onboarding step",
    });
  }
}

