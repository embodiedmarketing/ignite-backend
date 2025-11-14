import type { Request, Response } from "express";
import { storage } from "../services/storage.service"; // Temporary import
import { insertOfferSchema } from "@backend/models";

/**
 * Get all offers for a user
 */
export async function getOffersByUser(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.userId);
    const offers = await storage.getOffersByUser(userId);
    res.json(offers);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Get a single offer by ID
 */
export async function getOffer(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const offer = await storage.getOffer(id);
    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }
    res.json(offer);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Create a new offer
 */
export async function createOffer(req: Request, res: Response) {
  try {
    const validated = insertOfferSchema.parse(req.body);
    const offer = await storage.createOffer(validated);
    res.status(201).json(offer);
  } catch (error) {
    res.status(400).json({ message: "Invalid offer data" });
  }
}

/**
 * Update an offer
 */
export async function updateOffer(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const offer = await storage.updateOffer(id, req.body);
    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }
    res.json(offer);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Delete an offer
 */
export async function deleteOffer(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const deleted = await storage.deleteOffer(id);
    if (!deleted) {
      return res.status(404).json({ message: "Offer not found" });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
}
