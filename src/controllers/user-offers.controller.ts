import type { Request, Response } from "express";
import { storage } from "../services/storage.service";
import { insertUserOfferSchema } from "../models";

/**
 * Get all user offers for a user
 */
export async function getUserOffers(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const offers = await storage.getUserOffers(userId);
    res.json(offers);
  } catch (error) {
    console.error("Error fetching user offers:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Get active user offer
 */
export async function getActiveUserOffer(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const offer = await storage.getActiveUserOffer(userId);
    res.json(offer || null);
  } catch (error) {
    console.error("Error fetching active user offer:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Get a single user offer by ID
 */
export async function getUserOfferById(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid offer ID" });
    }

    const offer = await storage.getUserOffer(id);
    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }
    res.json(offer);
  } catch (error) {
    console.error("Error fetching user offer:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Create a new user offer
 */
export async function createUserOffer(req: Request, res: Response) {
  try {
    const offerData = insertUserOfferSchema.parse(req.body);
    const offer = await storage.createUserOffer(offerData);
    res.status(201).json(offer);
  } catch (error) {
    console.error("Error creating user offer:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Update an existing user offer
 */
export async function updateUserOffer(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid offer ID" });
    }

    const updates = req.body;
    const offer = await storage.updateUserOffer(id, updates);
    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }
    res.json(offer);
  } catch (error) {
    console.error("Error updating user offer:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Delete a user offer
 */
export async function deleteUserOffer(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid offer ID" });
    }

    const success = await storage.deleteUserOffer(id);
    if (!success) {
      return res.status(404).json({ message: "Offer not found" });
    }
    res.json({ message: "Offer deleted successfully" });
  } catch (error) {
    console.error("Error deleting user offer:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Set active user offer
 */
export async function setActiveUserOffer(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid offer ID" });
    }

    const offer = await storage.setActiveUserOffer(id);
    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }
    res.json(offer);
  } catch (error) {
    console.error("Error setting active user offer:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

