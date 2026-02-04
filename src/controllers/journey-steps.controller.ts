import type { Request, Response } from "express";
import { storage } from "../services/storage.service";
import {
  insertJourneyStepSchema,
  updateJourneyStepSchema,
} from "../models";
import { handleControllerError, parseIdParam } from "../utils/controller-error";

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
    handleControllerError(error, res, {
      logLabel: "fetching journey steps",
      defaultMessage: "Failed to fetch journey steps",
    });
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
    handleControllerError(error, res, {
      logLabel: "creating journey step",
      defaultMessage: "Failed to create journey step",
    });
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
    const idNum = parseIdParam(req.params.id, res, {
      paramName: "Journey step ID",
    });
    if (idNum === undefined) return;

    const validatedData = updateJourneyStepSchema.parse(req.body);

    const updated = await storage.updateJourneyStep(idNum, validatedData);

    if (!updated) {
      res.status(404).json({ message: "Journey step not found" });
      return;
    }

    res.json(updated);
  } catch (error) {
    handleControllerError(error, res, {
      logLabel: "updating journey step",
      defaultMessage: "Failed to update journey step",
    });
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
    const idNum = parseIdParam(req.params.id, res, {
      paramName: "Journey step ID",
    });
    if (idNum === undefined) return;

    const deleted = await storage.deleteJourneyStep(idNum);

    if (!deleted) {
      res.status(404).json({ message: "Journey step not found" });
      return;
    }

    res.json({
      message: "Journey step deleted successfully",
    });
  } catch (error) {
    handleControllerError(error, res, {
      logLabel: "deleting journey step",
      defaultMessage: "Failed to delete journey step",
    });
  }
}

