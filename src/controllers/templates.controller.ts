import type { Request, Response } from "express";
import { storage } from "../services/storage.service";
import { insertTemplateSchema } from "@backend/models";

/**
 * Get all templates (with optional filters)
 */
export async function getTemplates(req: Request, res: Response) {
  try {
    const { category, stepNumber } = req.query;
    let templates;

    if (category) {
      templates = await storage.getTemplatesByCategory(category as string);
    } else if (stepNumber) {
      templates = await storage.getTemplatesByStep(
        parseInt(stepNumber as string)
      );
    } else {
      templates = await storage.getAllTemplates();
    }

    res.json(templates);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Get a template by ID
 */
export async function getTemplate(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const template = await storage.getTemplate(id);
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }
    res.json(template);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Create a new template
 */
export async function createTemplate(req: Request, res: Response) {
  try {
    const validated = insertTemplateSchema.parse(req.body);
    const template = await storage.createTemplate(validated);
    res.status(201).json(template);
  } catch (error) {
    res.status(400).json({ message: "Invalid template data" });
  }
}

/**
 * Update a template
 */
export async function updateTemplate(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const template = await storage.updateTemplate(id, req.body);
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }
    res.json(template);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
}

