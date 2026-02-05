import type { Request, Response } from "express";
import { storage } from "../services/storage.service";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { getUserId } from "../middlewares/auth.middleware";
import {
  handleOntraportWebhook,
  validateOntraportWebhook,
} from "../services/ontraport.service";
import { generateCustomerLocations } from "../services/ai-customer-locations.service";
import { synthesizeCustomerAvatar } from "../services/ai-avatar-synthesis.service";
import {
  performCompleteMigration,
  hasExistingDatabaseData,
} from "../utils/database-migration";
import { insertStrategyInterviewLinkSchema } from "../models";
import { insertSalesPageDraftSchema } from "../models";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { getTextFromAnthropicContent } from "../utils/ai-response";
import DOMPurify from "isomorphic-dompurify";
import { nanoid } from "nanoid";

/**
 * Ontraport webhook endpoint
 */
export async function ontraportWebhook(req: Request, res: Response) {
  try {
    const rawBody = JSON.stringify(req.body);
    const signature = req.headers["x-ontraport-signature"] as string;
    const webhookSecret = process.env.ONTRAPORT_WEBHOOK_SECRET;

    // Validate webhook if secret is configured
    if (webhookSecret && signature) {
      const isValid = validateOntraportWebhook(
        rawBody,
        signature,
        webhookSecret
      );
      if (!isValid) {
        return res.status(401).json({ message: "Invalid webhook signature" });
      }
    }

    // Process the webhook
    const user = await handleOntraportWebhook(req.body);

    if (user) {
      res.json({ message: "User created successfully", userId: user.id });
    } else {
      res.json({ message: "Webhook processed, no action taken" });
    }
  } catch (error) {
    console.error("Ontraport webhook error:", error);
    res.status(500).json({ message: "Failed to process webhook" });
  }
}

/**
 * Smart placement for additional customer insights
 */
export async function smartPlacement(req: Request, res: Response) {
  try {
    const { customerAnswer, currentResponses } = req.body;

    if (!customerAnswer || !currentResponses) {
      return res.status(400).json({
        error: "Customer answer and current responses are required",
      });
    }

    // For now, return a simple placement structure
    const placements = [
      {
        workbookKey: "customer-avatar-0",
        transformedContent: customerAnswer
          .replace(/\bI\b/g, "They")
          .replace(/\bmy\b/g, "their")
          .replace(/\bme\b/g, "them"),
      },
    ];

    res.json({ placements });
  } catch (error) {
    console.error("Error with smart placement:", error);
    res.status(500).json({ error: "Failed to analyze and place insights" });
  }
}

/**
 * Synthesize customer avatar
 */
export async function synthesizeAvatar(req: Request, res: Response) {
  try {
    const { interviewNotes } = req.body;

    if (!interviewNotes) {
      return res.status(400).json({ message: "Interview notes are required" });
    }

    const avatarData = await synthesizeCustomerAvatar(interviewNotes);
    res.json(avatarData);
  } catch (error) {
    console.error("Error synthesizing customer avatar:", error);
    res.status(500).json({ message: "Failed to synthesize customer avatar" });
  }
}

/**
 * Generate customer locations
 */
export async function generateCustomerLocationsRoute(
  req: Request,
  res: Response
) {
  try {
    const { userId, customerAvatar } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Use provided customer avatar data or create a sample one for testing
    const avatarData = customerAvatar || {
      frustration:
        "Feeling overwhelmed with too many marketing strategies and not enough time",
      fears: "Worried they'll waste money on another program that doesn't work",
      perfectDay:
        "Having a simple system that brings in qualified leads consistently",
      transformation:
        "Going from scattered marketing efforts to focused, profitable results",
      age: "35-45 years old, small business owners making $50K-150K",
      previousSolutions:
        "Tried various online courses, Facebook ads, networking events",
      blockers: "Limited time, budget constraints, information overload",
      informationSources:
        "YouTube, business podcasts, LinkedIn, industry blogs",
      language:
        "Need something that actually works, tired of complicated strategies",
      decisionMaking:
        "Research thoroughly, ask for recommendations, look for proof",
    };

    const locations = await generateCustomerLocations(avatarData);
    res.json(locations);
  } catch (error) {
    console.error("Error analyzing customer locations:", error);
    res.status(500).json({ error: "Failed to analyze customer locations" });
  }
}

/**
 * Check if user has existing data in database
 */
export async function checkExistingData(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.userId);
    if (!userId || userId !== req.session?.userId) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const hasData = await storage.checkUserHasData(userId);
    res.json({ hasExistingData: hasData });
  } catch (error) {
    console.error("Error checking existing data:", error);
    res.status(500).json({ error: "Failed to check existing data" });
  }
}

/**
 * Migrate localStorage data to database
 */
export async function migrateLocalStorage(req: Request, res: Response) {
  try {
    const { userId, workbookResponses, messagingStrategy, completedSections } =
      req.body;

    if (!userId || userId !== req.session?.userId) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const result = await storage.migrateLocalStorageData(
      userId,
      workbookResponses || {},
      messagingStrategy,
      completedSections || []
    );

    res.json({
      success: true,
      migrated: {
        responses: result.migratedResponses,
        strategies: result.migratedStrategy ? 1 : 0,
      },
    });
  } catch (error) {
    console.error("Error migrating data:", error);
    res.status(500).json({ error: "Failed to migrate data" });
  }
}

/**
 * Migrate localStorage data (alternative endpoint)
 */
export async function migrateLocalStorageAlt(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const { localStorageData } = req.body;

    if (!localStorageData) {
      return res
        .status(400)
        .json({ message: "Local storage data is required" });
    }

    // Check if user already has database data
    const hasExisting = await hasExistingDatabaseData(userId);
    if (hasExisting) {
      return res.status(409).json({
        message:
          "User already has database data. Migration skipped to prevent overwriting.",
        hasExistingData: true,
      });
    }

    const migrationResult = await performCompleteMigration(
      userId,
      localStorageData
    );

    res.json({
      success: migrationResult.success,
      migrated: {
        strategies: migrationResult.migratedStrategies,
        responses: migrationResult.migratedResponses,
      },
      errors: migrationResult.errors,
    });
  } catch (error) {
    console.error("Error migrating localStorage data:", error);
    res.status(500).json({
      message: "Migration failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Check database data for user
 */
export async function checkDatabaseData(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const hasData = await hasExistingDatabaseData(userId);
    res.json({ hasExistingData: hasData });
  } catch (error) {
    console.error("Error checking database data:", error);
    res.status(500).json({ message: "Failed to check database data" });
  }
}

/**
 * Get funnel copy for user
 */
export async function getFunnelCopy(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.userId);
    const offerNumber = req.query.offerNumber
      ? parseInt(req.query.offerNumber as string)
      : 1;

    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const funnelCopy = await storage.getFunnelCopyByUser(userId, offerNumber);

    if (!funnelCopy) {
      return res.status(404).json({ message: "No funnel copy found" });
    }

    // Return in the same format as generated copy
    res.json({
      optInPage: funnelCopy.optInPage,
      tripwirePage: funnelCopy.tripwirePage,
      checkoutPage: funnelCopy.checkoutPage,
      confirmationPage: funnelCopy.confirmationPage,
    });
  } catch (error) {
    console.error("Error fetching funnel copy:", error);
    res.status(500).json({ message: "Failed to fetch funnel copy" });
  }
}

/**
 * Update saved funnel copy
 */
export async function updateFunnelCopy(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.userId);
    const {
      optInPage,
      tripwirePage,
      checkoutPage,
      confirmationPage,
      offerNumber = 1,
    } = req.body;

    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const updated = await storage.upsertFunnelCopy({
      userId,
      offerNumber,
      optInPage: optInPage || "",
      tripwirePage: tripwirePage || "",
      checkoutPage: checkoutPage || "",
      confirmationPage: confirmationPage || "",
    });

    res.json({
      optInPage: updated.optInPage,
      tripwirePage: updated.tripwirePage,
      checkoutPage: updated.checkoutPage,
      confirmationPage: updated.confirmationPage,
    });
  } catch (error) {
    console.error("Error updating funnel copy:", error);
    res.status(500).json({ message: "Failed to update funnel copy" });
  }
}

/**
 * Get IGNITE documents for user
 */
export async function getIgniteDocs(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const documents = await storage.getIgniteDocumentsByUser(userId);
    res.json(documents);
  } catch (error) {
    console.error("Error getting IGNITE documents:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Create IGNITE document
 */
export async function createIgniteDoc(req: Request, res: Response) {
  try {
    const document = await storage.createIgniteDocument(req.body);
    res.status(201).json(document);
  } catch (error) {
    console.error("Error creating IGNITE document:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Update IGNITE document
 */
export async function updateIgniteDoc(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid document ID" });
    }

    const document = await storage.updateIgniteDocument(id, req.body);
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }
    res.json(document);
  } catch (error) {
    console.error("Error updating IGNITE document:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Get strategy interview links
 */
export async function getStrategyInterviewLinks(req: Request, res: Response) {
  try {
    const strategyId = parseInt(req.params.strategyId);
    if (isNaN(strategyId)) {
      return res.status(400).json({ message: "Invalid strategy ID" });
    }

    const links = await storage.getStrategyInterviewLinks(strategyId);
    res.json(links);
  } catch (error) {
    console.error("Error fetching strategy interview links:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Create strategy interview link
 */
export async function createStrategyInterviewLink(req: Request, res: Response) {
  try {
    const linkData = insertStrategyInterviewLinkSchema.parse(req.body);
    const link = await storage.createStrategyInterviewLink(linkData);
    res.status(201).json(link);
  } catch (error) {
    console.error("Error creating strategy interview link:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Delete strategy interview link
 */
export async function deleteStrategyInterviewLink(req: Request, res: Response) {
  try {
    const strategyId = parseInt(req.params.strategyId);
    const transcriptId = parseInt(req.params.transcriptId);
    if (isNaN(strategyId) || isNaN(transcriptId)) {
      return res
        .status(400)
        .json({ message: "Invalid strategy or transcript ID" });
    }

    const deleted = await storage.deleteStrategyInterviewLink(
      strategyId,
      transcriptId
    );
    if (!deleted) {
      return res.status(404).json({ message: "Link not found" });
    }
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting strategy interview link:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Get sales page drafts for user
 */
export async function getSalesPageDrafts(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const drafts = await storage.getSalesPageDraftsByUser(userId);
    res.json(drafts);
  } catch (error) {
    console.error("Error fetching sales page drafts:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Get active sales page drafts for user
 */
export async function getActiveSalesPageDrafts(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const drafts = await storage.getActiveSalesPageDrafts(userId);
    res.json(drafts);
  } catch (error) {
    console.error("Error fetching active sales page drafts:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Create sales page draft
 */
export async function createSalesPageDraft(req: Request, res: Response) {
  try {
    const validated = insertSalesPageDraftSchema.parse(req.body);
    const draft = await storage.createSalesPageDraft(validated);
    res.status(201).json(draft);
  } catch (error) {
    console.error("Error creating sales page draft:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Update sales page draft
 */
export async function updateSalesPageDraft(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid draft ID" });
    }

    const draft = await storage.updateSalesPageDraft(id, req.body);
    if (!draft) {
      return res.status(404).json({ message: "Sales page draft not found" });
    }
    res.json(draft);
  } catch (error) {
    console.error("Error updating sales page draft:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Delete sales page draft
 */
export async function deleteSalesPageDraft(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid draft ID" });
    }

    const deleted = await storage.deleteSalesPageDraft(id);
    if (!deleted) {
      return res.status(404).json({ message: "Sales page draft not found" });
    }
    res.json({ message: "Sales page draft deleted successfully" });
  } catch (error) {
    console.error("Error deleting sales page draft:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Set active sales page draft
 */
export async function setActiveSalesPageDraft(req: Request, res: Response) {
  try {
    const { userId, draftId } = req.body;

    if (!userId || !draftId) {
      return res
        .status(400)
        .json({ message: "userId and draftId are required" });
    }

    const success = await storage.setActiveSalesPageDraft(userId, draftId);
    if (!success) {
      return res.status(404).json({ message: "Failed to set active draft" });
    }
    res.json({ message: "Active draft set successfully" });
  } catch (error) {
    console.error("Error setting active sales page draft:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Delete all sales page drafts for user
 */
export async function deleteSalesPageDraftsByUser(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    await storage.deleteSalesPageDraftsByUser(userId);
    res.json({ message: "All sales page drafts deleted successfully" });
  } catch (error) {
    console.error("Error deleting sales page drafts:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Generate email sequence
 */
export async function generateEmailSequence(req: Request, res: Response) {
  try {
    const {
      leadMagnetTitle,
      transformation,
      problemSolved,
      tripwireTitle,
      tripwireType,
      tripwireOutcome,
      tripwirePrice,
      coreBeliefShift,
      objectionsDoubts,
      storiesExamples,
      contentHighlight,
      contentOrder,
      messagingStrategy: messagingStrategyFromRequest,
      idealCustomerProfile: idealCustomerProfileFromRequest,
    } = req.body;

    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Use messaging strategy from request, or fetch from database as fallback
    let messagingStrategyContent = messagingStrategyFromRequest;
    let idealCustomerProfile = idealCustomerProfileFromRequest;

    if (!messagingStrategyContent) {
      const messagingStrategy = await storage.getActiveMessagingStrategy(
        userId
      );
      messagingStrategyContent =
        messagingStrategy?.content || "Professional and authentic tone.";

      if (messagingStrategy?.content) {
        const avatarMatch = messagingStrategy.content.match(
          /##\s*\d*\.?\s*CUSTOMER AVATAR DEEP DIVE[\s\S]*?(?=##|$)/i
        );
        idealCustomerProfile = avatarMatch ? avatarMatch[0] : "";
      }
    }

    const { generateEmailSequence } = await import(
      "../services/ai-email-sequence-generator"
    );

    const emailSequence = await generateEmailSequence({
      userId,
      leadMagnetTitle: leadMagnetTitle || "",
      transformation: transformation || "",
      problemSolved: problemSolved || "",
      tripwireTitle: tripwireTitle || "",
      tripwireType: tripwireType || "",
      tripwireOutcome: tripwireOutcome || "",
      tripwirePrice: tripwirePrice || "",
      coreBeliefShift: coreBeliefShift || "",
      objectionsDoubts: objectionsDoubts || "",
      storiesExamples: storiesExamples || "",
      contentHighlight: contentHighlight || "",
      contentOrder: contentOrder || "AI decides the optimal flow",
      messagingStrategy: messagingStrategyContent,
      idealCustomerProfile: idealCustomerProfile || "",
    });

    res.json({ emails: emailSequence });
  } catch (error: any) {
    console.error("[EMAIL SEQUENCE] Error:", error);

    let errorMessage =
      "We encountered an issue generating your email sequence. Our system tried multiple times to complete this request. Please try again in a few moments.";

    if (error?.status === 429) {
      errorMessage =
        "We're experiencing high demand on our AI service. Please wait a moment and try again.";
    } else if (error?.message?.toLowerCase().includes("timeout")) {
      errorMessage =
        "The request took longer than expected to complete. Please try again.";
    } else if (error?.message?.toLowerCase().includes("no content received")) {
      errorMessage =
        "We didn't receive a complete response from the AI service. Please try again.";
    } else if (error?.message?.includes("ANTHROPIC_API_KEY")) {
      errorMessage =
        "There's a configuration issue with our AI service. Please contact support.";
    } else if (error?.status >= 500) {
      errorMessage =
        "Our AI service is temporarily experiencing issues. Please try again in a few moments.";
    }

    res.status(500).json({ message: errorMessage });
  }
}

/**
 * Get video script generator state
 */
export async function getVideoScriptGeneratorState(
  req: Request,
  res: Response
) {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const state = await storage.getVideoScriptGeneratorState(userId);
    res.json(state || null);
  } catch (error) {
    console.error("Error fetching video script generator state:", error);
    res.status(500).json({ message: "Failed to fetch state" });
  }
}

/**
 * Save video script generator state
 */
export async function saveVideoScriptGeneratorState(
  req: Request,
  res: Response
) {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { landingPageUrl, manualContent, inputMethod, generatedScripts } =
      req.body;

    const state = await storage.upsertVideoScriptGeneratorState({
      userId,
      landingPageUrl: landingPageUrl || null,
      manualContent: manualContent || null,
      inputMethod: inputMethod || null,
      generatedScripts: generatedScripts || null,
    });

    res.json(state);
  } catch (error) {
    console.error("Error saving video script generator state:", error);
    res.status(500).json({ message: "Failed to save state" });
  }
}

/**
 * Save launch registration funnel data
 */
export async function saveLaunchRegistrationFunnelData(
  req: Request,
  res: Response
) {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const data = await storage.upsertLaunchRegistrationFunnelData({
      userId,
      ...req.body,
    });

    res.json(data);
  } catch (error) {
    console.error("Error saving launch registration funnel data:", error);
    res
      .status(500)
      .json({ message: "Failed to save launch registration funnel data" });
  }
}

/**
 * Get launch registration funnel data
 */
export async function getLaunchRegistrationFunnelData(
  req: Request,
  res: Response
) {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const data = await storage.getLaunchRegistrationFunnelData(userId);
    res.json(data || null);
  } catch (error) {
    console.error("Error fetching launch registration funnel data:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch launch registration funnel data" });
  }
}

/**
 * Get launch emails for user
 */
export async function getLaunchEmails(req: Request, res: Response) {
  try {
    const requestingUserId = req.session?.userId;
    const targetUserId = parseInt(req.params.userId);

    if (!requestingUserId || requestingUserId !== targetUserId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const emails = await storage.getLaunchEmailSequencesByUserId(targetUserId);
    res.json(emails);
  } catch (error) {
    console.error("Error fetching launch emails:", error);
    res.status(500).json({ message: "Failed to fetch emails" });
  }
}

/**
 * Update a specific launch email
 */
export async function updateLaunchEmail(req: Request, res: Response) {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const emailId = parseInt(req.params.emailId);
    const { subject, body } = req.body;

    const updated = await storage.updateLaunchEmailSequence(emailId, userId, {
      subject,
      body,
    });

    if (!updated) {
      return res
        .status(404)
        .json({ message: "Email not found or unauthorized" });
    }

    res.json(updated);
  } catch (error) {
    console.error("Error updating launch email:", error);
    res.status(500).json({ message: "Failed to update email" });
  }
}

/**
 * Save funnel tracker data
 */
export async function saveFunnelTrackerData(req: Request, res: Response) {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { tripwireProductCost, funnelData, organicFunnelData } = req.body;

    const data = await storage.upsertFunnelTrackerData({
      userId,
      tripwireProductCost: tripwireProductCost || null,
      funnelData: funnelData || [],
      organicFunnelData: organicFunnelData || [],
    });

    res.json(data);
  } catch (error) {
    console.error("Error saving funnel tracker data:", error);
    res.status(500).json({ message: "Failed to save funnel tracker data" });
  }
}

/**
 * Get funnel tracker data
 */
export async function getFunnelTrackerData(req: Request, res: Response) {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const data = await storage.getFunnelTrackerData(userId);
    res.json(data || null);
  } catch (error) {
    console.error("Error fetching funnel tracker data:", error);
    res.status(500).json({ message: "Failed to fetch funnel tracker data" });
  }
}

/**
 * Save optimization suggestions
 */
export async function saveOptimizationSuggestions(req: Request, res: Response) {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { suggestions } = req.body;

    const data = await storage.upsertOptimizationSuggestions({
      userId,
      suggestions: suggestions || [],
    });

    res.json(data);
  } catch (error) {
    console.error("Error saving optimization suggestions:", error);
    res
      .status(500)
      .json({ message: "Failed to save optimization suggestions" });
  }
}

/**
 * Get optimization suggestions
 */
export async function getOptimizationSuggestions(req: Request, res: Response) {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const data = await storage.getOptimizationSuggestions(userId);
    res.json(data || null);
  } catch (error) {
    console.error("Error fetching optimization suggestions:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch optimization suggestions" });
  }
}

/**
 * Save implementation checkboxes
 */
export async function saveImplementationCheckboxes(
  req: Request,
  res: Response
) {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { pageIdentifier, checkboxStates } = req.body;

    if (!pageIdentifier || !checkboxStates) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const data = await storage.upsertImplementationCheckboxes({
      userId,
      pageIdentifier,
      checkboxStates,
    });

    res.json(data);
  } catch (error) {
    console.error("Error saving implementation checkboxes:", error);
    res
      .status(500)
      .json({ message: "Failed to save implementation checkboxes" });
  }
}

/**
 * Get implementation checkboxes
 */
export async function getImplementationCheckboxes(req: Request, res: Response) {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { pageIdentifier } = req.params;
    const data = await storage.getImplementationCheckboxes(
      userId,
      pageIdentifier
    );
    res.json(data || null);
  } catch (error) {
    console.error("Error fetching implementation checkboxes:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch implementation checkboxes" });
  }
}

// Initialize Claude (Anthropic) for all AI features
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// In-memory lock to prevent duplicate email generation requests
const emailGenerationLocks = new Set<number>();

/**
 * Generate Launch Registration Funnel Copy
 */
export async function generateLaunchRegistrationFunnelCopy(
  req: Request,
  res: Response
) {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { messagingStrategy, launchData } = req.body;

    if (!messagingStrategy || !launchData) {
      return res.status(400).json({ message: "Missing required data" });
    }

    // Build the AI prompt based on the provided template
    const prompt = `You are an expert conversion copywriter specializing in high-converting webinar and challenge funnels.

Your task is to write two pages of copy — an Opt-In Page and a Thank You Page — for a live launch experience.

MESSAGING STRATEGY:
${JSON.stringify(messagingStrategy, null, 2)}

ABOUT THE LIVE LAUNCH:
1. Date/Time: ${launchData.launchDateTime || "Not specified"}
2. Type: ${launchData.experienceType || "Not specified"}
3. Main Transformation: ${launchData.transformationResult || "Not specified"}
4. Top 3 Outcomes: ${launchData.topThreeOutcomes || "Not specified"}
5. Problem It Solves: ${launchData.specificProblem || "Not specified"}
6. Why It's Urgent: ${launchData.urgentProblem || "Not specified"}
7. Unique Angle: ${launchData.uniqueExperience || "Not specified"}
8. Show-Up Bonus Outcome: ${launchData.showUpBonus || "Not specified"}
9. Next Step (Thank You Page Action): ${
      launchData.thankYouAction || "Not specified"
    }
10. Pain Points/Frustrations: ${launchData.painPoints || "Not specified"}
11. Quick Win: ${launchData.quickWin || "Not specified"}
12. Objections: ${launchData.objections || "Not specified"}
13. Proof or Testimonials: ${launchData.socialProofResults || "Not specified"}

STYLE RULES:
- Use the ICA's language from the messaging strategy
- Keep paragraphs under 3 lines
- Focus on benefits > features
- Maintain authenticity + energy in tone

CRITICAL FORMATTING REQUIREMENTS:
You MUST follow this EXACT formatting structure. Use HTML for proper formatting.

1. OPT-IN PAGE COPY - Use this exact structure:

<strong>OPT-IN PAGE COPY</strong>

<strong>Headline:</strong>
[Write a compelling, outcome-driven headline]

<strong>Subheadline:</strong>
[Write one line that amplifies the benefit]

<strong>Event Details:</strong>
📅 [Date] | 🕐 [Time with timezone] | 📺 [Type of event - e.g., Free Live Webinar]

<strong>Here's What You'll Learn:</strong>
✓ [Benefit 1]
✓ [Benefit 2]
✓ [Benefit 3]
✓ [Benefit 4]

<strong>Why This Is Different:</strong>
[Write 2-3 sentences explaining the unique angle and why this matters]

<strong>CTA:</strong>
👆 [Action-based call-to-action button text]

<strong>About the Host:</strong>
[Write 2-3 sentences about the host and their credibility]


2. THANK YOU PAGE COPY - Use this exact structure:

<strong>THANK YOU PAGE COPY</strong>

<strong>Headline:</strong>
[Write an enthusiastic confirmation headline]

<strong>Body:</strong>
[Write body text that confirms their registration. Make sure to include the date/time like: <strong>[Date] at [Time with timezone]</strong>]
[Second line about checking inbox for confirmation]

<strong>🎁 Show Up Live & Get This Bonus:</strong>
[Describe the show-up bonus and its value]

<strong>Next Step:</strong>
👉 [Clear next action they should take]

Please generate compelling, emotionally resonant copy that converts. IMPORTANT: Follow the exact HTML formatting structure shown above.`;

    const completion = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      messages: [
        {
          role: "assistant",
          content:
            "You are an expert conversion copywriter who writes emotionally engaging, benefit-driven copy for webinar and challenge funnels. Your copy is clear, concise, and follows proven conversion frameworks.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.8,
      max_tokens: 3000,
    });

      const generatedContent = getTextFromAnthropicContent(completion.content);

    // Parse the response to separate Opt-In and Thank You page copy
    // Use positive lookahead to split without consuming the heading
    const sections = generatedContent.split(
      /(?=<strong>THANK YOU PAGE COPY<\/strong>)/i
    );

    let optInPage = sections[0].trim();
    let thankYouPage = sections[1]?.trim() || "";

    // Remove numbering prefixes but keep the headings
    optInPage = optInPage.replace(/^1\.\s*/i, "").trim();
    thankYouPage = thankYouPage.replace(/^2\.\s*/i, "").trim();

    // Save to IGNITE Docs
    try {
      const formattedMarkdown = `# Launch Registration Funnel Copy

**Generated:** ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}
**Launch Date/Time:** ${launchData.launchDateTime || "Not specified"}
**Experience Type:** ${launchData.experienceType || "Not specified"}

---

## OPT-IN PAGE COPY

${optInPage}

---

## THANK YOU PAGE COPY

${thankYouPage}`;

      await storage.createIgniteDocument({
        userId,
        docType: "launch_registration_funnel",
        title: "Launch Registration Funnel Copy",
        contentMarkdown: formattedMarkdown,
        sourcePayload: {
          launchDateTime: launchData.launchDateTime,
          experienceType: launchData.experienceType,
          generatedAt: new Date().toISOString(),
        },
      });
      console.log("[LAUNCH FUNNEL] Copy saved to IGNITE Documents");
    } catch (saveError) {
      console.error(
        "[LAUNCH FUNNEL] Error saving to IGNITE Documents:",
        saveError
      );
      // Don't fail the request if saving to IGNITE Docs fails
    }

    res.json({
      optInPage,
      thankYouPage,
    });
  } catch (error) {
    console.error("Error generating registration funnel copy:", error);
    res
      .status(500)
      .json({ message: "Failed to generate copy. Please try again." });
  }
}

/**
 * Generate Launch Sales Page Copy
 */
export async function generateLaunchSalesPageCopy(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Validate request body
    const salesPageInputSchema = z.object({
      salesPageAction: z.string().min(1, "Desired action is required"),
      salesPageUrgency: z.string().optional(),
    });

    const validationResult = salesPageInputSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        message: "Invalid request data",
        errors: validationResult.error.errors,
      });
    }

    const { salesPageAction, salesPageUrgency } = validationResult.data;

    // Fetch user's messaging strategy
    const messagingStrategy = await storage.getActiveMessagingStrategy(userId);
    if (!messagingStrategy) {
      return res
        .status(400)
        .json({ message: "Please complete your messaging strategy first" });
    }

    // Fetch user's core offer outline (most recent one, regardless of active status)
    const allOutlines = await storage.getUserOfferOutlinesByUser(userId);
    const coreOfferOutline = allOutlines.length > 0 ? allOutlines[0] : null;
    if (!coreOfferOutline) {
      return res
        .status(400)
        .json({ message: "Please create your core offer outline first" });
    }

    console.log("[SALES PAGE] Generating sales page copy for user:", userId);
    console.log(
      "[SALES PAGE] Using messaging strategy ID:",
      messagingStrategy.id
    );
    console.log(
      "[SALES PAGE] Using core offer outline ID:",
      coreOfferOutline.id
    );

    // Build the comprehensive AI prompt based on the sales page structure
    const prompt = `You are an expert conversion copywriter specializing in long-form, narrative-driven sales pages.

Your task is to write a comprehensive sales page that emotionally guides readers from awareness → belief → decision → action.

MESSAGING STRATEGY:
${messagingStrategy.content || ""}

CORE OFFER OUTLINE:
${coreOfferOutline.content || ""}

LIVE LAUNCH SPECIFIC MESSAGING:
- Desired Action: ${salesPageAction || "Not specified"}
- Urgency/Scarcity Elements: ${salesPageUrgency || "Not specified"}

STRUCTURE & WRITING RULES:

SECTION 1: CURRENT DESIRES + STRUGGLES
Purpose: Build instant resonance. Make readers feel seen before you ever mention the offer.

- Headline – Desired Outcome: Make it emotionally specific and outcome-driven. Avoid vague promises.
- Expand on Their Desired Outcome: Use emotional imagery and sensory language. Speak to what life feels like when their goal becomes real.
- Current Feelings / Problem: Mirror the reader's internal dialogue. Call out both surface frustrations and deeper emotional costs. Keep tone empathetic, not pitying.
- Why the Problem Is Worse Than Expected: Contrast what they thought would happen vs. what actually happens. Add urgency through consequence storytelling.
- Bridge: Transition with hope, energy, and authority. Keep this short — one to two lines that introduce the solution naturally.

SECTION 2: THE SOLUTION (YOUR OFFER)
Purpose: Position the offer as the natural bridge between pain and possibility.

- Introduce the Offer: Use format "Introducing {offer_name} — the proven system to {core_promise} without {main_pain_point}."
- Core Pillars / Learnings: List 3–5 pillars, each written as: What they'll learn/do, Why it matters, What changes as a result. Use "so that…" phrasing. Connect to their emotional journey.

SECTION 3: AUTHORITY
Purpose: Build trust through credibility + relatability.

- Testimonials: Use storytelling testimonials (before → after → feeling). Prioritize transformation over metrics. Include at least one that mirrors the reader's current struggle.
- About the Creator: Share your "why" through a moment of personal truth or past failure. Include emotional resonance before listing credentials. Keep it human, not résumé-style.

SECTION 4: OFFER SPECIFICS
Purpose: Move the reader from belief to action.

- What's Included: Turn features into outcomes. Use bullet sections for readability.
- Bonuses: Only include bonuses that feel essential or urgency-driven. Tie each to a key objection.
- Pricing & CTA: Position the price as an investment not an expense. Add multiple CTAs using ${
      salesPageAction || "the desired action"
    } language. Insert urgency details: ${
      salesPageUrgency || "urgency elements"
    }.
- Guarantee: Reinforce trust and remove risk. Keep tone confident and integrity-driven.

SECTION 5: BREAKTHROUGH RESISTANCE
Purpose: Reframe objections, reignite belief, and close with inspiration.

- Address Objections: Name them directly using the reader's inner voice. Respond with calm authority, not hype.
- Big Breakthrough Visualization: Use sensory, present-tense storytelling. Focus on emotional payoff.
- Review of Everything They Get: Bullet all inclusions + bonuses with value if appropriate.
- FAQ: Write 4–6 questions that handle practical concerns. Use friendly tone.
- Decision Note / Final CTA: Close like a personal letter. Use "two paths" framing. Bring it back to the reader's identity. End with emotional certainty and direct CTA.

STYLE + VOICE DIRECTIVES:
- Lead with empathy, close with certainty
- Show vs. tell using vivid examples and micro-stories
- Simplify the path - clarity converts
- Momentum matters - use rhythm, white space, and punchy transitions
- Emotional layering: Start with pain, shift to hope, end with empowerment
- Every CTA should feel like an invitation, not pressure
- Consistency of tone throughout

CRITICAL FORMATTING:
Return copy using HTML formatting with the following structure:

<strong>SECTION 1: CURRENT DESIRES + STRUGGLES</strong>

<strong>Headline:</strong>
[Write compelling headline]

[Continue with rest of section 1 content...]

<strong>SECTION 2: THE SOLUTION</strong>

[Section 2 content with HTML formatting...]

<strong>SECTION 3: AUTHORITY</strong>

[Section 3 content...]

<strong>SECTION 4: OFFER SPECIFICS</strong>

[Section 4 content...]

<strong>SECTION 5: BREAKTHROUGH RESISTANCE</strong>

[Section 5 content...]

Include CTA prompts after every major section. Use <strong> tags for headings and subheadings. Use line breaks appropriately for readability.

Generate a compelling, emotionally resonant sales page that converts. Follow the exact structure and formatting shown above.`;

    const completion = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      messages: [
        {
          role: "assistant",
          content:
            "You are an expert conversion copywriter who writes long-form, narrative-driven sales pages that emotionally guide readers from awareness to action. Your copy is emotionally resonant, benefit-driven, and follows proven conversion frameworks.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.8,
      max_tokens: 4000,
    });

    const salesPageCopy = getTextFromAnthropicContent(completion.content);

    console.log("[SALES PAGE] Sales page copy generated successfully");
    console.log("[SALES PAGE] Copy length:", salesPageCopy.length);

    // Sanitize HTML output to prevent XSS attacks
    const sanitizedSalesPageCopy = DOMPurify.sanitize(salesPageCopy, {
      ALLOWED_TAGS: [
        "strong",
        "b",
        "em",
        "i",
        "u",
        "p",
        "br",
        "ul",
        "ol",
        "li",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "span",
        "div",
        "a",
      ],
      ALLOWED_ATTR: ["class", "href", "target", "rel"],
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):)/i, // Only allow http, https, and mailto protocols
      KEEP_CONTENT: true,
    });

    console.log("[SALES PAGE] Copy sanitized for XSS protection");

    res.json({
      salesPageCopy: sanitizedSalesPageCopy,
    });
  } catch (error) {
    console.error("Error generating sales page copy:", error);
    res.status(500).json({
      message: "Failed to generate sales page copy. Please try again.",
    });
  }
}

/**
 * Generate Launch Email Sequence
 */
export async function generateLaunchEmailSequence(req: Request, res: Response) {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Check if generation is already in progress for this user
    if (emailGenerationLocks.has(userId)) {
      console.log(
        `[LAUNCH EMAILS] Generation already in progress for user ${userId}, rejecting duplicate request`
      );
      return res.status(429).json({
        message:
          "Email generation is already in progress. Please wait for the current generation to complete.",
      });
    }

    // Acquire lock
    emailGenerationLocks.add(userId);
    console.log(`[LAUNCH EMAILS] Lock acquired for user ${userId}`);

    try {
      // Validate request body
      const launchEmailInputSchema = z.object({
        inviteHooks: z.string().min(1, "Invite hooks are required"),
        inviteFOMO: z.string().optional(),
        confirmationDetails: z.string().optional(),
        preEventActions: z.string().optional(),
        nurtureContent: z.string().optional(),
        liveAttendanceValue: z.string().optional(),
        mythsBeliefs: z.string().optional(),
        salesStories: z.string().optional(),
        finalPush: z.string().optional(),
      });

      const validationResult = launchEmailInputSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Invalid request data",
          errors: validationResult.error.errors,
        });
      }

      const formInputs = validationResult.data;
      console.log(
        `[LAUNCH EMAILS] Step 1: Form inputs validated for user ${userId}`
      );

      // Fetch user's messaging strategy
      console.log(
        `[LAUNCH EMAILS] Step 2: Fetching messaging strategy for user ${userId}`
      );
      const messagingStrategy = await storage.getActiveMessagingStrategy(
        userId
      );
      if (!messagingStrategy) {
        return res.status(400).json({
          message: "Please complete your messaging strategy first",
        });
      }
      console.log(
        `[LAUNCH EMAILS] Step 2: Found messaging strategy ID ${messagingStrategy.id}`
      );

      // Fetch user's core offer outline (optional - most recent one if available)
      console.log(
        `[LAUNCH EMAILS] Step 3: Fetching core offer outlines for user ${userId}`
      );
      const allOutlines = await storage.getUserOfferOutlinesByUser(userId);
      const coreOfferOutline = allOutlines.length > 0 ? allOutlines[0] : null;
      console.log(
        `[LAUNCH EMAILS] Step 3: Found ${allOutlines.length} outlines, using: ${
          coreOfferOutline?.id || "none"
        }`
      );

      // Fetch launch registration funnel data for live launch details and sales page urgency
      console.log(
        `[LAUNCH EMAILS] Step 4: Fetching launch funnel data for user ${userId}`
      );
      const launchData = await storage.getLaunchRegistrationFunnelData(userId);
      const liveLaunchDetails = {
        type: launchData?.experienceType || "live launch experience",
        topic: launchData?.transformationResult || "",
        transformation: launchData?.transformationResult || "",
        dateTime: launchData?.launchDateTime || "",
      };
      const salesPageUrgency = launchData?.salesPageUrgency || "";
      const showUpBonus = launchData?.showUpBonus || "";
      console.log(
        `[LAUNCH EMAILS] Step 4: Launch data fetched, experience type: ${liveLaunchDetails.type}`
      );

      console.log(
        "[LAUNCH EMAILS] Step 5: Starting AI email generation for user:",
        userId
      );
      console.log(
        "[LAUNCH EMAILS] Using messaging strategy ID:",
        messagingStrategy.id
      );
      console.log(
        "[LAUNCH EMAILS] Using core offer outline ID:",
        coreOfferOutline?.id || "none"
      );

      // Import and call the email generator
      const { generateLaunchEmailSequence } = await import(
        "../services/ai-launch-email-generator"
      );

      console.log(
        "[LAUNCH EMAILS] Step 6: Calling generateLaunchEmailSequence..."
      );
      const result = await generateLaunchEmailSequence({
        inviteHooks: formInputs.inviteHooks,
        inviteFOMO: formInputs.inviteFOMO || "",
        confirmationDetails: formInputs.confirmationDetails || "",
        preEventActions: formInputs.preEventActions || "",
        nurtureContent: formInputs.nurtureContent || "",
        liveAttendanceValue: formInputs.liveAttendanceValue || "",
        mythsBeliefs: formInputs.mythsBeliefs || "",
        salesStories: formInputs.salesStories || "",
        finalPush: formInputs.finalPush || "",
        messagingStrategy,
        liveLaunchDetails,
        coreOfferOutline,
        salesPageUrgency,
        showUpBonus,
      });
      console.log(
        `[LAUNCH EMAILS] Step 6: AI generation completed, got ${result.emails.length} emails`
      );

      // Delete existing emails for this user before saving new ones
      console.log(
        `[LAUNCH EMAILS] Step 7: Deleting existing emails for user ${userId}`
      );
      await storage.deleteLaunchEmailSequencesByUserId(userId);

      // Generate unique sequence ID to link all emails together
      const sequenceId = nanoid();
      console.log(
        `[LAUNCH EMAILS] Step 8: Generated sequence ID: ${sequenceId}`
      );

      // Save all emails to database
      const savedEmails = [];
      console.log(
        `[LAUNCH EMAILS] Step 9: Saving ${result.emails.length} emails to database...`
      );
      for (const email of result.emails) {
        const saved = await storage.createLaunchEmailSequence({
          userId,
          sequenceId,
          emailType: email.emailType,
          emailNumber: email.emailNumber,
          subject: email.subject,
          body: email.body,
          metadata: formInputs,
        });
        savedEmails.push(saved);
        console.log(
          `[LAUNCH EMAILS] Step 9: Saved email ${savedEmails.length}/${result.emails.length} (${email.emailType} #${email.emailNumber})`
        );
      }

      console.log(
        `[LAUNCH EMAILS] Step 10: Successfully saved ${savedEmails.length} emails to database with sequence ID: ${sequenceId}`
      );

      res.json({
        emails: savedEmails,
        totalEmails: savedEmails.length,
      });
    } finally {
      // Always release lock
      emailGenerationLocks.delete(userId);
      console.log(`[LAUNCH EMAILS] Lock released for user ${userId}`);
    }
  } catch (error: any) {
    console.error("Error generating launch email sequence:", error);
    console.error("Error details:", {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    });
    res.status(500).json({
      message: "Failed to generate email sequence. Please try again.",
    });
  }
}

const TRANSCRIPT_SUMMARIZER_PROMPT = ` You will receive a transcript where every line is "[HH:MM:SS] Speaker - text...". The word "Speaker" is generic; participant names appear inside the text (e.g. the host says "Sherry, did you wanna start", "Kara, you're up next", "Jordan, you are up next", "Cassandra, you're gonna take us home").

Your job:
1. Infer who is speaking from context: when the host addresses someone by name and that person responds, use that name for the segment. Identify the coach/host (e.g. Rena) and participants (Sherry, Kara, Jordan, Cassandra, etc.) from the dialogue.
2. For each participant's turn or major topic, output ONE line with the timestamp when they start speaking and a brief 5–15 word description of the topic.
3. Format every line exactly as: [HH:MM:SS] Name - brief topic description
4. Output only 5–25 lines total. Never output the full transcript.

Example output (use this style):
[00:01:09] Sherry - quiz landing page review, tripwire messaging, email sequences
[00:15:37] Kara - ads targeting strategy, offer transformation outcomes
[00:29:41] Jordan - Built for Bigger sales page review, tangible outcomes
[00:48:46] Cassandra - tripwire page CTA, launching ads

Rules:
- Use the FIRST timestamp of when that person starts speaking (from the transcript).
- Use real names inferred from the text (Sherry, Kara, Jordan, Cassandra, Rena, etc.), not "Speaker".
- One line per participant segment; group continuous back-and-forth under one topic line.
- Output ONLY these summary lines. No preamble, no explanation.`;

/**
 * Get Vimeo video transcript and summarized timestamps with participant names
 */
export async function getVimeoTranscript(req: Request, res: Response) {
  try {
    const { videoUrl, vimeoAccessToken } = req.body;

    if (!videoUrl) {
      return res.status(400).json({
        success: false,
        message: "videoUrl is required",
      });
    }

    const { getVimeoTranscript: getVimeoTranscriptUtil } = await import(
      "../utils/vimeo-transcript"
    );

    const transcript = await getVimeoTranscriptUtil(videoUrl, vimeoAccessToken);

    let timestamps:any = [];
    try {
      const completion = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        messages: [
          {
            role: "user",
            content: `${TRANSCRIPT_SUMMARIZER_PROMPT}\n\n---\n\nTRANSCRIPT:\n\n${transcript}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });

      timestamps = getTextFromAnthropicContent(completion.content);
    } catch (summarizeError: unknown) {
      console.error("Error summarizing transcript:", summarizeError);
    }

    res.json({
      success: true,
      transcript,
      timestamps,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to get Vimeo transcript";
    console.error("Error getting Vimeo transcript:", error);
    res.status(500).json({
      success: false,
      message,
    });
  }
}