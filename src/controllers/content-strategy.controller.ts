import type { Request, Response } from "express";
import { storage } from "../services/storage.service";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { getUserId } from "../middlewares/auth.middleware";

/**
 * Get content strategy preferences for authenticated user
 */
export async function getContentStrategyPreferences(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const preferences = await storage.getContentStrategyResponse(userId);
    res.json(preferences);
  } catch (error) {
    console.error("Error fetching content preferences:", error);
    res.status(500).json({ error: "Failed to fetch content preferences" });
  }
}

/**
 * Get content strategy preferences by userId (legacy route)
 */
export async function getContentStrategyPreferencesByUserId(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.userId);
    const preferences = await storage.getContentStrategyResponse(userId);
    res.json(preferences);
  } catch (error) {
    console.error("Error fetching content preferences:", error);
    res.status(500).json({ error: "Failed to fetch content preferences" });
  }
}

/**
 * Save content strategy preferences (auto-save endpoint)
 */
export async function saveContentStrategyPreferences(req: Request, res: Response) {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const data = req.body;

    const existingPreferences = await storage.getContentStrategyResponse(userId);

    if (existingPreferences) {
      await storage.updateContentStrategyResponse(existingPreferences.id, {
        postingFrequency: data.postingFrequency,
        corePlatform: data.corePlatform,
        contentFormat: data.contentFormat,
        contentTypes: data.contentTypes,
        desiredFeelings: data.desiredFeelings,
        avoidFeelings: data.avoidFeelings,
        brandAdjectives: data.brandAdjectives,
        coreThemes: data.coreThemes,
        problemsMyths: data.problemsMyths,
        valuesBeliefs: data.valuesBeliefs,
        contrarianTakes: data.contrarianTakes,
        actionableTips: data.actionableTips,
        commonObjections: data.commonObjections,
        beliefShifts: data.beliefShifts,
        authenticTruths: data.authenticTruths,
        keyMessage: data.keyMessage,
        authenticVoice: data.authenticVoice,
      });
      res.json({ success: true });
    } else {
      await storage.createContentStrategyResponse({
        userId,
        postingFrequency: data.postingFrequency,
        corePlatform: data.corePlatform,
        contentFormat: data.contentFormat,
        contentTypes: data.contentTypes,
        desiredFeelings: data.desiredFeelings,
        avoidFeelings: data.avoidFeelings,
        brandAdjectives: data.brandAdjectives,
        coreThemes: data.coreThemes,
        problemsMyths: data.problemsMyths,
        valuesBeliefs: data.valuesBeliefs,
        contrarianTakes: data.contrarianTakes,
        actionableTips: data.actionableTips,
        commonObjections: data.commonObjections,
        beliefShifts: data.beliefShifts,
        authenticTruths: data.authenticTruths,
        keyMessage: data.keyMessage,
        authenticVoice: data.authenticVoice,
      });
      res.json({ success: true });
    }
  } catch (error) {
    console.error("Error saving content preferences:", error);
    res.status(500).json({ error: "Failed to save content preferences" });
  }
}

/**
 * Get generated content strategies for user
 */
export async function getGeneratedContentStrategies(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.userId);
    const strategies = await storage.getGeneratedContentStrategiesByUser(userId);
    res.json(strategies);
  } catch (error) {
    console.error("Error fetching generated content strategies:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch generated content strategies" });
  }
}

/**
 * Get active content strategy for authenticated user
 */
export async function getActiveContentStrategy(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const strategy = await storage.getActiveGeneratedContentStrategy(userId);
    res.json(strategy);
  } catch (error) {
    console.error("Error fetching active content strategy:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch active content strategy" });
  }
}

/**
 * Get active content strategy by userId (legacy route)
 */
export async function getActiveContentStrategyByUserId(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.userId);
    const strategy = await storage.getActiveGeneratedContentStrategy(userId);
    res.json(strategy);
  } catch (error) {
    console.error("Error fetching active content strategy:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch active content strategy" });
  }
}

