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
      return res
        .status(400)
        .json({
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
      return res
        .status(400)
        .json({ message: "Interview notes are required" });
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
    const {
      userId,
      workbookResponses,
      messagingStrategy,
      completedSections,
    } = req.body;

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
    const userId = (req.user as any)?.claims?.sub;
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
export async function deleteSalesPageDraftsByUser(
  req: Request,
  res: Response
) {
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
      "../../../server/ai-email-sequence-generator"
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
    } else if (error?.message?.includes("OPENAI_API_KEY")) {
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
export async function saveImplementationCheckboxes(req: Request, res: Response) {
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

