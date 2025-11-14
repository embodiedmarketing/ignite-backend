import type { Request, Response } from "express";
import { storage } from "../services/storage.service";
import { insertConversationSchema } from "@backend/models";

/**
 * Get all conversations for a user
 */
export async function getConversationsByUser(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.userId);
    const conversations = await storage.getConversationsByUser(userId);
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Get all conversations for an offer
 */
export async function getConversationsByOffer(req: Request, res: Response) {
  try {
    const offerId = parseInt(req.params.offerId);
    const conversations = await storage.getConversationsByOffer(offerId);
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Create a new conversation
 */
export async function createConversation(req: Request, res: Response) {
  try {
    const validated = insertConversationSchema.parse(req.body);
    const conversation = await storage.createConversation(validated);
    res.status(201).json(conversation);
  } catch (error) {
    res.status(400).json({ message: "Invalid conversation data" });
  }
}

/**
 * Update a conversation
 */
export async function updateConversation(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const conversation = await storage.updateConversation(id, req.body);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    res.json(conversation);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
}

