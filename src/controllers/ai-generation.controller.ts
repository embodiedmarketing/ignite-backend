import type { Request, Response } from "express";
import { storage } from "../services/storage.service";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { getUserId } from "../middlewares/auth.middleware";

/**
 * Generate messaging strategy
 */
export async function generateMessagingStrategy(req: Request, res: Response) {
  try {
    const { workbookResponses, interviewNotes } = req.body;
    const userId = (req.user as any)?.id || 0;

    if (!workbookResponses || Object.keys(workbookResponses).length === 0) {
      return res
        .status(400)
        .json({ error: "Workbook responses are required" });
    }

    const { generateMessagingStrategy } = await import(
      "../../../server/ai-messaging-strategy"
    );

    const strategy = await generateMessagingStrategy(
      workbookResponses,
      interviewNotes || {},
      userId
    );

    // Mark Messaging Strategy as complete in database
    if (userId && strategy.strategy) {
      try {
        await storage.markSectionComplete({
          userId,
          stepNumber: 1,
          sectionTitle: "Messaging Strategy",
          offerNumber: 1,
        });
        console.log(
          "[COMPLETION] Messaging Strategy marked as complete for user",
          userId
        );
      } catch (error) {
        console.error(
          "[COMPLETION] Error marking Messaging Strategy complete:",
          error
        );
      }
    }

    res.json(strategy);
  } catch (error) {
    console.error("Error generating messaging strategy:", error);
    res.status(500).json({ error: "Failed to generate messaging strategy" });
  }
}

/**
 * Generate offer outline
 */
export async function generateOfferOutline(req: Request, res: Response) {
  try {
    const { offerResponses, messagingStrategy, userId, offerNumber } =
      req.body;

    console.log("=== OFFER OUTLINE GENERATION ===");
    console.log(
      "Offer responses received:",
      Object.keys(offerResponses || {}).length
    );

    if (!offerResponses || Object.keys(offerResponses).length === 0) {
      console.log("❌ No offer responses provided");
      return res.status(400).json({ error: "Offer responses are required" });
    }

    const { generateOfferOutline } = await import(
      "../../../server/ai-offer-outline"
    );

    const outline = await generateOfferOutline(
      offerResponses,
      messagingStrategy || {}
    );

    console.log("✅ Offer outline generated successfully");

    // Save the outline to database if userId and offerNumber are provided
    if (userId && offerNumber) {
      try {
        const savedOutline = await storage.createUserOfferOutline({
          userId: parseInt(userId),
          offerNumber: parseInt(offerNumber),
          title: `Offer ${offerNumber} Outline`,
          content: outline.outline,
          completionPercentage: Math.round(outline.completeness * 100),
          missingInformation: outline.missingInformation,
          recommendations: outline.recommendations,
          sourceData: {
            generatedAt: new Date().toISOString(),
            responses: Object.keys(offerResponses).length,
            hasMessagingStrategy: !!messagingStrategy,
          },
        });
        console.log(`✅ Outline saved with ID: ${savedOutline.id}`);
      } catch (saveError) {
        console.error("❌ Error saving outline to database:", saveError);
      }
    }

    res.json(outline);
  } catch (error: unknown) {
    console.error("❌ Error generating offer outline:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    res
      .status(500)
      .json({ error: "Failed to generate offer outline: " + errorMessage });
  }
}

/**
 * Generate sales page
 */
export async function generateSalesPage(req: Request, res: Response) {
  try {
    const { userId, messagingStrategy, offerOutline, salesPageInputs } =
      req.body;

    console.log("🎯 Generating sales page for user:", userId);

    const { generateSalesPage } = await import(
      "../../../server/ai-sales-page-generator-fixed"
    );

    const salesPageData = {
      messagingStrategy,
      offerOutline,
      salesPageInputs,
    };

    const result = await generateSalesPage(salesPageData);

    console.log("✅ Sales page generated successfully");
    res.json(result);
  } catch (error: unknown) {
    console.error("❌ Error generating sales page:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    res
      .status(500)
      .json({ error: "Failed to generate sales page: " + errorMessage });
  }
}

/**
 * Coach sales section
 */
export async function coachSalesSection(req: Request, res: Response) {
  try {
    const { sectionType, userInput, userId } = req.body;

    if (!sectionType || !userInput) {
      return res
        .status(400)
        .json({ error: "Section type and user input are required" });
    }

    const { coachSalesPageSection } = await import(
      "../../../server/ai-sales-page-coach"
    );

    // Get context from user's data
    let customerAvatar, offerDetails;
    try {
      const messagingStrategy = await storage.getActiveMessagingStrategy(
        userId
      );
      const offerOutline = await storage.getActiveUserOfferOutline(userId);

      customerAvatar = messagingStrategy
        ? {
            demographics: "",
            painPoints: "",
            language: "",
          }
        : null;

      offerDetails = offerOutline
        ? {
            transformation: "",
            timeline: "",
            pricing: "",
          }
        : null;
    } catch (e) {
      // Continue without context if fetch fails
    }

    const coaching = await coachSalesPageSection(
      sectionType,
      userInput,
      JSON.stringify(customerAvatar || {}),
      JSON.stringify(offerDetails || {})
    );
    res.json(coaching);
  } catch (error: unknown) {
    console.error("Error coaching sales section:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    res
      .status(500)
      .json({ error: "Failed to provide coaching: " + errorMessage });
  }
}

/**
 * Improve sales section
 */
export async function improveSalesSection(req: Request, res: Response) {
  try {
    const { sectionType, currentContent, userId } = req.body;

    if (!sectionType || !currentContent) {
      return res
        .status(400)
        .json({ error: "Section type and current content are required" });
    }

    const { improveSalesPageSection } = await import(
      "../../../server/ai-sales-page-coach"
    );

    // Get context similar to coachSalesSection
    let customerAvatar, offerDetails;
    try {
      const messagingStrategy = await storage.getActiveMessagingStrategy(
        userId
      );
      const offerOutline = await storage.getActiveUserOfferOutline(userId);

      customerAvatar = messagingStrategy ? {} : null;
      offerDetails = offerOutline ? {} : null;
    } catch (e) {
      // Continue without context
    }

    const improvements = await improveSalesPageSection(
      sectionType,
      currentContent,
      JSON.stringify(customerAvatar || {}),
      offerDetails || {}
    );
    res.json({ improvements });
  } catch (error: unknown) {
    console.error("Error improving sales section:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    res
      .status(500)
      .json({ error: "Failed to improve section: " + errorMessage });
  }
}

/**
 * Generate comprehensive customer experience
 */
export async function generateCustomerExperience(req: Request, res: Response) {
  try {
    const { userId, messagingStrategy, offerOutline, customerExperienceInputs } =
      req.body;

    const { generateComprehensiveCustomerExperience } = await import(
      "../../../server/ai-customer-experience-generator"
    );

    const result = await generateComprehensiveCustomerExperience({
      messagingStrategy,
      offerOutline,
      customerExperienceInputs,
    });

    res.json(result);
  } catch (error) {
    console.error("Error generating customer experience:", error);
    res
      .status(500)
      .json({ error: "Failed to generate customer experience" });
  }
}

/**
 * Format comprehensive plan
 */
export async function formatComprehensivePlan(req: Request, res: Response) {
  try {
    const { planContent } = req.body;

    const { formatComprehensivePlan } = await import(
      "../../../server/ai-customer-experience-generator"
    );

    const formatted = await formatComprehensivePlan(planContent);
    res.json({ formatted });
  } catch (error) {
    console.error("Error formatting plan:", error);
    res.status(500).json({ error: "Failed to format plan" });
  }
}

/**
 * Generate topic ideas
 */
export async function generateTopicIdeas(req: Request, res: Response) {
  try {
    const { userId, messagingStrategy } = req.body;

    if (!messagingStrategy) {
      return res.status(400).json({
        error: "Messaging strategy is required to generate topic ideas",
        type: "MISSING_STRATEGY",
      });
    }

    const { generateTopicIdeas } = await import(
      "../../../server/ai-topic-idea-generator"
    );

    const result = await generateTopicIdeas(
      messagingStrategy,
      userId.toString()
    );

    res.json(result);
  } catch (error) {
    console.error("Error generating topic ideas:", error);

    if (
      error instanceof Error &&
      error.message.startsWith("INSUFFICIENT_DATA:")
    ) {
      const message = error.message.replace("INSUFFICIENT_DATA: ", "");
      return res.status(400).json({
        error: message,
        type: "INSUFFICIENT_DATA",
      });
    }

    res.status(500).json({
      error: "Failed to generate topic ideas",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Generate content strategy
 */
export async function generateContentStrategy(req: Request, res: Response) {
  try {
    const { preferences, messagingStrategy } = req.body;
    const userId = req.session?.userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!preferences) {
      return res.status(400).json({
        error: "Content preferences are required",
        type: "MISSING_PREFERENCES",
      });
    }

    const { generateContentStrategy } = await import(
      "../../../server/ai-content-strategy"
    );

    const result = await generateContentStrategy(
      preferences,
      messagingStrategy,
      userId || 0
    );

    // Save preferences to database
    try {
      const existingPreferences =
        await storage.getContentStrategyResponse(userId);
      if (existingPreferences) {
        await storage.updateContentStrategyResponse(
          existingPreferences.id,
          preferences
        );
      } else {
        await storage.createContentStrategyResponse({
          userId,
          ...preferences,
        });
      }
    } catch (saveError) {
      console.error("Error saving content strategy:", saveError);
    }

    res.json(result);
  } catch (error) {
    console.error("Error generating content strategy:", error);
    res.status(500).json({
      error: "Failed to generate content strategy",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Generate content ideas
 */
export async function generateContentIdeas(req: Request, res: Response) {
  try {
    const { messagingStrategy, contentPreferences } = req.body;
    const userId = req.session?.userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!messagingStrategy) {
      return res.status(400).json({
        error: "Messaging strategy is required",
        type: "MISSING_STRATEGY",
      });
    }

    const { generateContentIdeas } = await import(
      "../../../server/ai-content-strategy"
    );

    const ideas = await generateContentIdeas(
      messagingStrategy,
      contentPreferences
    );

    console.log(
      `✅ Generated ${ideas.length} content ideas for user ${userId}`
    );

    res.json({ ideas });
  } catch (error) {
    console.error("Error generating content ideas:", error);
    res.status(500).json({
      error: "Failed to generate content ideas",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Generate funnel copy
 */
export async function generateFunnelCopy(req: Request, res: Response) {
  try {
    const {
      userId,
      answers,
      messagingStrategyVoice,
      offerNumber = 1,
    } = req.body;

    if (!userId || !answers) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    console.log("[FUNNEL COPY] Generating funnel copy for user:", userId);

    const { generateFunnelCopy } = await import(
      "../../../server/ai-funnel-copy-generator"
    );

    const funnelCopy = await generateFunnelCopy({
      ...answers,
      messagingStrategyVoice:
        messagingStrategyVoice || "Professional and conversion-focused",
    });

    // Save to database
    await storage.upsertFunnelCopy({
      userId: parseInt(userId),
      offerNumber,
      optInPage: funnelCopy.optInPage,
      tripwirePage: funnelCopy.tripwirePage,
      checkoutPage: funnelCopy.checkoutPage,
      confirmationPage: funnelCopy.confirmationPage,
      inputs: answers,
    });

    res.json(funnelCopy);
  } catch (error) {
    console.error("Error generating funnel copy:", error);
    res.status(500).json({ message: "Failed to generate funnel copy" });
  }
}

/**
 * Generate video scripts
 */
export async function generateVideoScripts(req: Request, res: Response) {
  try {
    const { landingPageUrl, manualContent } = req.body;

    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!landingPageUrl && !manualContent) {
      return res
        .status(400)
        .json({
          message:
            "Please provide either a landing page URL or manual content",
        });
    }

    if (landingPageUrl) {
      try {
        new URL(landingPageUrl);
      } catch {
        return res
          .status(400)
          .json({
            message:
              "Invalid URL format. Please provide a valid URL starting with https://",
          });
      }
    }

    const { generateVideoScripts } = await import(
      "../../../server/ai-video-script-generator"
    );

    const scripts = await generateVideoScripts({
      userId,
      landingPageUrl: landingPageUrl || manualContent || "",
      storage,
    });

    // Save scripts to database
    try {
      const formattedMarkdown = `# Video Ad Scripts

**Generated:** ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}
**Source:** ${landingPageUrl || "Manual Content"}

---

## SCRIPT 1 — Problem-Focused Hook

**Title/Angle:** *"${scripts.script1.title}"*

${scripts.script1.content}

---

## SCRIPT 2 — Desire/Curiosity-Focused Hook

**Title/Angle:** *"${scripts.script2.title}"*

${scripts.script2.content}

---

## SCRIPT 3 — Social Proof/Authority Hook

**Title/Angle:** *"${scripts.script3.title}"*

${scripts.script3.content}`;

      await storage.createIgniteDocument({
        userId,
        docType: "video_scripts",
        title: "Video Script Generator",
        contentMarkdown: formattedMarkdown,
        sourcePayload: {
          source: landingPageUrl,
          generatedAt: new Date().toISOString(),
        },
      });

      await storage.upsertVideoScriptGeneratorState({
        userId,
        landingPageUrl: landingPageUrl || null,
        manualContent: manualContent || null,
        generatedScripts: scripts,
      });
    } catch (saveError) {
      console.error("[VIDEO SCRIPTS] Error saving to database:", saveError);
    }

    res.json(scripts);
  } catch (error) {
    console.error("Error generating video scripts:", error);
    res.status(500).json({
      error: "Failed to generate video scripts",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
