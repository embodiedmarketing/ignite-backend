import type { Request, Response } from "express";
import { storage } from "../services/storage.service";
import {
  insertFaqSchema,
  updateFaqSchema,
} from "../models";
import { handleControllerError, parseIdParam } from "../utils/controller-error";

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
    handleControllerError(error, res, {
      logLabel: "fetching FAQs",
      defaultMessage: "Failed to fetch FAQs",
    });
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
    handleControllerError(error, res, {
      logLabel: "creating FAQ",
      duplicateKeyMessage: "A FAQ with this ID already exists",
      defaultMessage: "Failed to create FAQ",
    });
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
    const idNum = parseIdParam(req.params.id, res, { paramName: "FAQ ID" });
    if (idNum === undefined) return;

    const validatedData = updateFaqSchema.parse(req.body);
    const updated = await storage.updateFaq(idNum, validatedData);

    if (!updated) {
      res.status(404).json({ message: "FAQ not found" });
      return;
    }

    res.json(updated);
  } catch (error) {
    handleControllerError(error, res, {
      logLabel: "updating FAQ",
      defaultMessage: "Failed to update FAQ",
    });
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
    const idNum = parseIdParam(req.params.id, res, { paramName: "FAQ ID" });
    if (idNum === undefined) return;

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
    handleControllerError(error, res, {
      logLabel: "deleting FAQ",
      defaultMessage: "Failed to delete FAQ",
    });
  }
}
