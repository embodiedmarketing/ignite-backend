import type { Request, Response } from "express";
import { storage } from "../services/storage.service";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { getUserId } from "../middlewares/auth.middleware";

/**
 * Generate messaging strategy
 */
export async function generateMessagingStrategy(req: Request, res: Response) {
  try {
    const { workbookResponses: requestWorkbookResponses, interviewNotes } =
      req.body;
    const userId = req.session?.userId || 0;

    // Fetch the latest workbook responses from database to ensure we have interview insights
    // This is critical because interview insights are saved directly to the database
    let workbookResponses: Record<string, string> = {};

    if (userId) {
      try {
        console.log(
          `[MESSAGING STRATEGY] Fetching latest workbook responses for user ${userId}`
        );
        const dbWorkbookResponses = await storage.getWorkbookResponsesByStep(
          userId,
          1,
          1
        );

        // Convert database responses to key-value format
        for (const response of dbWorkbookResponses) {
          if (response.responseText?.trim()) {
            workbookResponses[response.questionKey] = response.responseText;
          }
        }

        console.log(
          `[MESSAGING STRATEGY] Fetched ${
            Object.keys(workbookResponses).length
          } workbook responses from database`
        );
        console.log(
          `[MESSAGING STRATEGY] Response keys:`,
          Object.keys(workbookResponses)
        );

        // Merge with request body responses (request takes precedence for any conflicts)
        if (
          requestWorkbookResponses &&
          Object.keys(requestWorkbookResponses).length > 0
        ) {
          workbookResponses = {
            ...workbookResponses,
            ...requestWorkbookResponses,
          };
          console.log(
            `[MESSAGING STRATEGY] Merged with request body responses. Total keys:`,
            Object.keys(workbookResponses).length
          );
        }
      } catch (dbError) {
        console.error(
          "[MESSAGING STRATEGY] Error fetching workbook responses from database:",
          dbError
        );
        // Fall back to request body if database fetch fails
        workbookResponses = requestWorkbookResponses || {};
      }
    } else {
      workbookResponses = requestWorkbookResponses || {};
    }

    if (!workbookResponses || Object.keys(workbookResponses).length === 0) {
      return res.status(400).json({ error: "Workbook responses are required" });
    }

    const { generateMessagingStrategy } = await import(
      "../services/ai-messaging-strategy"
    );

    console.log(
      `[MESSAGING STRATEGY] Generating strategy with ${
        Object.keys(workbookResponses).length
      } responses`
    );
    console.log(
      `[MESSAGING STRATEGY] Interview-enhanced fields found:`,
      Object.keys(workbookResponses).filter((key) =>
        [
          "frustrations",
          "nighttime_worries",
          "secret_fears",
          "magic_solution",
          "demographics",
          "failed_solutions",
          "blockers",
          "info_sources",
          "decision_making",
          "investment_criteria",
          "success_measures",
          "referral_outcomes",
        ].some((field) => key.toLowerCase().includes(field))
      )
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
    const { offerResponses, messagingStrategy, userId, offerNumber } = req.body;

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
      "../services/ai-offer-outline"
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
      "../services/ai-sales-page-generator"
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
      "../services/ai-sales-page-coach"
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
      "../services/ai-sales-page-coach"
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
    const {
      userId,
      messagingStrategy,
      offerOutline,
      customerExperienceInputs,
    } = req.body;

    const { generateComprehensiveCustomerExperience } = await import(
      "../services/ai-customer-experience-generator"
    );

    const result = await generateComprehensiveCustomerExperience({
      messagingStrategy,
      offerOutline,
      experienceQuestions: customerExperienceInputs,
    });

    res.json(result);
  } catch (error) {
    console.error("Error generating customer experience:", error);
    res.status(500).json({ error: "Failed to generate customer experience" });
  }
}

/**
 * Format comprehensive plan
 */
export async function formatComprehensivePlan(req: Request, res: Response) {
  try {
    const { planContent } = req.body;

    const { formatComprehensivePlan } = await import(
      "../services/ai-customer-experience-generator"
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
      "../services/ai-topic-idea-generator"
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
      "../services/ai-content-strategy"
    );

    const result = await generateContentStrategy(
      preferences,
      messagingStrategy,
      userId || 0
    );

    console.log("✅ Content strategy generated successfully");
    console.log("Response structure:", {
      pillarsCount: result.contentPillars?.length || 0,
      completeness: result.completeness,
      missingInfoCount: result.missingInformation?.length || 0,
      recommendationsCount: result.recommendations?.length || 0,
    });

    // Save preferences and generated strategy to database
    if (userId) {
      try {
        // Save or update content preferences
        const existingPreferences = await storage.getContentStrategyResponse(
          userId
        );
        if (existingPreferences) {
          await storage.updateContentStrategyResponse(existingPreferences.id, {
            platforms: preferences.platforms,
            contentTypes: preferences.contentTypes,
            postingFrequency: preferences.postingFrequency,
            desiredFeelings: preferences.desiredFeelings,
            avoidFeelings: preferences.avoidFeelings,
            brandAdjectives: preferences.brandAdjectives,
            coreThemes: preferences.coreThemes,
            problemsMyths: preferences.problemsMyths,
            valuesBeliefs: preferences.valuesBeliefs,
            contrarianTakes: preferences.contrarianTakes,
            actionableTips: preferences.actionableTips,
            commonObjections: preferences.commonObjections,
            beliefShifts: preferences.beliefShifts,
            authenticTruths: preferences.authenticTruths,
            keyMessage: preferences.keyMessage,
            authenticVoice: preferences.authenticVoice,
          });
        } else {
          await storage.createContentStrategyResponse({
            userId,
            platforms: preferences.platforms,
            contentTypes: preferences.contentTypes,
            postingFrequency: preferences.postingFrequency,
            desiredFeelings: preferences.desiredFeelings,
            avoidFeelings: preferences.avoidFeelings,
            brandAdjectives: preferences.brandAdjectives,
            coreThemes: preferences.coreThemes,
            problemsMyths: preferences.problemsMyths,
            valuesBeliefs: preferences.valuesBeliefs,
            contrarianTakes: preferences.contrarianTakes,
            actionableTips: preferences.actionableTips,
            commonObjections: preferences.commonObjections,
            beliefShifts: preferences.beliefShifts,
            authenticTruths: preferences.authenticTruths,
            keyMessage: preferences.keyMessage,
            authenticVoice: preferences.authenticVoice,
          });
        }

        // Note: Content strategies and ideas are generated on-demand
        // Preferences are persisted above for regeneration context

        console.log("💾 Content strategy preferences saved to database");
      } catch (saveError) {
        console.error("Error saving content strategy to database:", saveError);
        // Don't fail the request if saving fails
      }
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
      "../services/ai-content-strategy"
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
      "../services/ai-funnel-copy-generator"
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
      return res.status(400).json({
        message: "Please provide either a landing page URL or manual content",
      });
    }

    if (landingPageUrl) {
      try {
        new URL(landingPageUrl);
      } catch {
        return res.status(400).json({
          message:
            "Invalid URL format. Please provide a valid URL starting with https://",
        });
      }
    }

    const { generateVideoScripts } = await import(
      "../services/ai-video-script-generator"
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
