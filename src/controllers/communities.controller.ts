import type { Request, Response } from "express";
import { storage } from "../services/storage.service";
import { insertCommunitySchema } from "@backend/models";

/**
 * Get all communities for a user
 */
export async function getCommunitiesByUser(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.userId);
    const communities = await storage.getCommunitiesByUser(userId);
    res.json(communities);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Create a new community
 */
export async function createCommunity(req: Request, res: Response) {
  try {
    const validated = insertCommunitySchema.parse(req.body);
    const community = await storage.createCommunity(validated);
    res.status(201).json(community);
  } catch (error) {
    res.status(400).json({ message: "Invalid community data" });
  }
}

/**
 * Update a community
 */
export async function updateCommunity(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const community = await storage.updateCommunity(id, req.body);
    if (!community) {
      return res.status(404).json({ message: "Community not found" });
    }
    res.json(community);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
}

