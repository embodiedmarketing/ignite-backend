import type { Request, Response } from "express";
import { storage } from "../services/storage.service";
import { insertUserOfferOutlineSchema } from "../models";

/**
 * Get all user offer outlines for a user
 */
export async function getUserOfferOutlines(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const outlines = await storage.getUserOfferOutlinesByUser(userId);
    res.json(outlines);
  } catch (error) {
    console.error("Error fetching user offer outlines:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Get active user offer outline
 */
export async function getActiveUserOfferOutline(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const outline = await storage.getActiveUserOfferOutline(userId);
    res.json(outline || null);
  } catch (error) {
    console.error("Error fetching active user offer outline:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Create a new user offer outline
 */
export async function createUserOfferOutline(req: Request, res: Response) {
  try {
    const outlineData = insertUserOfferOutlineSchema.parse(req.body);
    const outline = await storage.createUserOfferOutline(outlineData);
    res.status(201).json(outline);
  } catch (error) {
    console.error("Error creating user offer outline:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Update an existing user offer outline
 */
export async function updateUserOfferOutline(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid outline ID" });
    }

    const outline = await storage.updateUserOfferOutline(id, req.body);
    if (!outline) {
      return res
        .status(404)
        .json({ message: "User offer outline not found" });
    }
    res.json(outline);
  } catch (error) {
    console.error("Error updating user offer outline:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Set active user offer outline
 */
export async function setActiveUserOfferOutline(req: Request, res: Response) {
  try {
    const outlineId = parseInt(req.params.outlineId);
    const userId = parseInt(req.params.userId);
    if (isNaN(outlineId) || isNaN(userId)) {
      return res.status(400).json({ message: "Invalid outline or user ID" });
    }

    const success = await storage.setActiveUserOfferOutline(
      userId,
      outlineId
    );
    if (!success) {
      return res.status(404).json({ message: "Outline not found" });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Error setting active user offer outline:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Delete a user offer outline
 */
export async function deleteUserOfferOutline(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid outline ID" });
    }

    const deleted = await storage.deleteUserOfferOutline(id);
    if (!deleted) {
      return res.status(404).json({ message: "Outline not found" });
    }
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting user offer outline:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

