import type { Request, Response } from "express";
import { storage } from "../services/storage.service";

/**
 * Get all sales pages for a user
 */
export async function getSalesPagesByUser(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.userId);
    const salesPages = await storage.getSalesPagesByUser(userId);
    res.json(salesPages);
  } catch (error) {
    console.error("Error fetching sales pages:", error);
    res.status(500).json({ error: "Failed to fetch sales pages" });
  }
}

/**
 * Create a new sales page
 */
export async function createSalesPage(req: Request, res: Response) {
  try {
    const salesPage = await storage.createSalesPage(req.body);
    res.json(salesPage);
  } catch (error) {
    console.error("Error creating sales page:", error);
    res.status(500).json({ error: "Failed to create sales page" });
  }
}

