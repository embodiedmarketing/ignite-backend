import type { Request, Response } from "express";
import { storage } from "../services/storage.service";
import { insertCustomerExperiencePlanSchema } from "../models";

/**
 * Get all customer experience plans for a user
 */
export async function getCustomerExperiencePlansByUser(
  req: Request,
  res: Response
) {
  try {
    const userId = parseInt(req.params.userId);
    const plans = await storage.getCustomerExperiencePlansByUser(userId);
    res.json(plans);
  } catch (error) {
    console.error("Error fetching customer experience plans:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Create a new customer experience plan
 */
export async function createCustomerExperiencePlan(
  req: Request,
  res: Response
) {
  try {
    const planData = insertCustomerExperiencePlanSchema.parse(req.body);
    const plan = await storage.createCustomerExperiencePlan(planData);
    res.json(plan);
  } catch (error) {
    console.error("Error creating customer experience plan:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Update an existing customer experience plan
 */
export async function updateCustomerExperiencePlan(
  req: Request,
  res: Response
) {
  try {
    const id = parseInt(req.params.id);
    const updates = req.body;
    const plan = await storage.updateCustomerExperiencePlan(id, updates);
    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }
    res.json(plan);
  } catch (error) {
    console.error("Error updating customer experience plan:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Delete a customer experience plan
 */
export async function deleteCustomerExperiencePlan(
  req: Request,
  res: Response
) {
  try {
    const id = parseInt(req.params.id);
    const deleted = await storage.deleteCustomerExperiencePlan(id);
    if (!deleted) {
      return res.status(404).json({ message: "Plan not found" });
    }
    res.json({ message: "Plan deleted successfully" });
  } catch (error) {
    console.error("Error deleting customer experience plan:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

