import type { Request, Response } from "express";
import { storage } from "../services/storage.service";
import {
  insertFaqSchema,
  updateFaqSchema,
} from "../models";

/**
 * Get all FAQs
 */
export async function getAllFaqs(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const faqsList = await storage.getAllFaqs();
    res.json(faqsList);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error("Error fetching FAQs:", {
      name: errorName,
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    res.status(500).json({ message: "Failed to fetch FAQs" });
  }
}

/**
 * Create a new FAQ
 */
export async function createFaq(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const validatedData = insertFaqSchema.parse(req.body);
    const faq = await storage.createFaq(validatedData);
    res.status(201).json(faq);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error("Error creating FAQ:", {
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

    // Check for duplicate key error (PostgreSQL unique constraint violation)
    if (error instanceof Error && error.message.includes("duplicate key")) {
      res.status(400).json({
        message: "A FAQ with this ID already exists",
      });
      return;
    }

    res.status(500).json({ message: "Failed to create FAQ" });
  }
}

/**
 * Update a FAQ
 */
export async function updateFaq(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({ message: "FAQ ID is required" });
      return;
    }

    const idNum = parseInt(id, 10);
    if (isNaN(idNum)) {
      res.status(400).json({ message: "Invalid FAQ ID format" });
      return;
    }

    const validatedData = updateFaqSchema.parse(req.body);

    const updated = await storage.updateFaq(idNum, validatedData);

    if (!updated) {
      res.status(404).json({ message: "FAQ not found" });
      return;
    }

    res.json(updated);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error("Error updating FAQ:", {
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

    res.status(500).json({ message: "Failed to update FAQ" });
  }
}

/**
 * Delete a FAQ
 */
export async function deleteFaq(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ message: "FAQ ID is required" });
      return;
    }

    const idNum = parseInt(id, 10);
    if (isNaN(idNum)) {
      res.status(400).json({ message: "Invalid FAQ ID format" });
      return;
    }

    const deleted = await storage.deleteFaq(idNum);

    if (!deleted) {
      res.status(404).json({ message: "FAQ not found" });
      return;
    }

    res.json({
      message: "FAQ deleted successfully",
      id: idNum,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error("Error deleting FAQ:", {
      name: errorName,
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    res.status(500).json({ message: "Failed to delete FAQ" });
  }
}

