import type { Request, Response } from "express";
import { storage } from "../services/storage.service";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { getUserId } from "../middlewares/auth.middleware";
import { z } from "zod";

/**
 * Get content strategy preferences for authenticated user
 */
export async function getContentStrategyPreferences(
  req: Request,
  res: Response
) {
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
export async function getContentStrategyPreferencesByUserId(
  req: Request,
  res: Response
) {
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
export async function saveContentStrategyPreferences(
  req: Request,
  res: Response
) {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const data = req.body;

    const existingPreferences = await storage.getContentStrategyResponse(
      userId
    );

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
export async function getGeneratedContentStrategies(
  req: Request,
  res: Response
) {
  try {
    const userId = parseInt(req.params.userId);
    const strategies = await storage.getGeneratedContentStrategiesByUser(
      userId
    );
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
    res.status(500).json({ error: "Failed to fetch active content strategy" });
  }
}

/**
 * Get active content strategy by userId (legacy route)
 */
export async function getActiveContentStrategyByUserId(
  req: Request,
  res: Response
) {
  try {
    const userId = parseInt(req.params.userId);
    const strategy = await storage.getActiveGeneratedContentStrategy(userId);
    res.json(strategy);
  } catch (error) {
    console.error("Error fetching active content strategy:", error);
    res.status(500).json({ error: "Failed to fetch active content strategy" });
  }
}

/**
 * Save generated content strategy
 */
export async function saveGeneratedContentStrategy(
  req: Request,
  res: Response
) {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Validate request body
    const saveStrategySchema = z.object({
      contentPillars: z.any(),
      contentIdeas: z.array(z.any()).max(100),
      postingCadence: z.string().optional().nullable(),
      recommendations: z.any().optional().nullable(),
      sourceData: z.any().optional().nullable(),
    });

    const validated = saveStrategySchema.parse(req.body);

    // First, deactivate any existing strategies for this user
    const existingStrategies =
      await storage.getGeneratedContentStrategiesByUser(userId);
    for (const strategy of existingStrategies) {
      if (strategy.isActive) {
        await storage.updateGeneratedContentStrategy(strategy.id, {
          isActive: false,
        });
      }
    }

    // Create new strategy
    const newStrategy = await storage.createGeneratedContentStrategy({
      userId,
      contentPillars: validated.contentPillars,
      contentIdeas: validated.contentIdeas,
      postingCadence: validated.postingCadence,
      recommendations: validated.recommendations,
      sourceData: validated.sourceData,
      isActive: true,
      version: 1,
    });

    res.json({ success: true, strategy: newStrategy });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: "Invalid request data", details: error.errors });
    }
    console.error("Error saving generated content strategy:", error);
    res
      .status(500)
      .json({ error: "Failed to save generated content strategy" });
  }
}
