import type { Request, Response } from "express";
import { storage } from "../services/storage.service";
import { insertStepContentSchema } from "@backend/models";

/**
 * Get all step content
 */
export async function getAllStepContent(req: Request, res: Response) {
  try {
    const stepContent = await storage.getAllStepContent();
    res.json(stepContent);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Get step content by step number
 */
export async function getStepContent(req: Request, res: Response) {
  try {
    const stepNumber = parseInt(req.params.stepNumber);
    const stepContent = await storage.getStepContent(stepNumber);
    if (!stepContent) {
      return res.status(404).json({ message: "Step content not found" });
    }
    res.json(stepContent);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Create new step content
 */
export async function createStepContent(req: Request, res: Response) {
  try {
    const validated = insertStepContentSchema.parse(req.body);
    const stepContent = await storage.createStepContent(validated);
    res.status(201).json(stepContent);
  } catch (error) {
    res.status(400).json({ message: "Invalid step content data" });
  }
}

/**
 * Update step content
 */
export async function updateStepContent(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const stepContent = await storage.updateStepContent(id, req.body);
    if (!stepContent) {
      return res.status(404).json({ message: "Step content not found" });
    }
    res.json(stepContent);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
}

