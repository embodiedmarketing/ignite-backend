import type { Request, Response } from "express";
import { storage } from "../services/storage.service";
import { isAuthenticated } from "../middlewares/auth.middleware";

/**
 * AI Coaching for Core Offer Question
 */
export async function coachCoreOfferQuestion(req: Request, res: Response) {
  try {
    const { questionKey } = req.params;
    const { questionText, userResponse, mainTransformation, allResponses } =
      req.body;
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    console.log(`=== CORE OFFER COACHING: ${questionKey} ===`);
    console.log("User ID:", userId);

    if (!userResponse || !questionText) {
      return res
        .status(400)
        .json({ error: "Question text and user response are required" });
    }

    const { coachQuestionResponse } = await import(
      "../services/ai-core-offer-coach"
    );

    // Call AI coaching service
    const evaluation = await coachQuestionResponse({
      questionKey,
      questionText,
      userResponse,
      mainTransformation,
      allResponses,
    });

    // Store coaching session in database
    const existingSession = await storage.getCoreCoachingSession(
      userId,
      questionKey
    );

    if (existingSession) {
      // Update existing session
      await storage.updateCoreCoachingSession(existingSession.id, {
        currentText: userResponse,
        lastEvaluatedText: userResponse,
        coachingFeedback: evaluation.coachingFeedback,
        recommendedRewrite: evaluation.recommendedRewrite || null,
        rewriteRationale: evaluation.rewriteRationale || null,
        status: evaluation.needsRewrite ? "needs_user" : "resolved",
        qualityScore: evaluation.qualityScore,
        alignmentIssues: evaluation.alignmentIssues || null,
        suggestedFollowUps: evaluation.suggestedFollowUps || null,
        iterationCount: (existingSession.iterationCount || 0) + 1,
        updatedAt: new Date(),
      });
    } else {
      // Create new session
      await storage.createCoreCoachingSession({
        userId,
        offerId: null,
        offerNumber: 1,
        questionKey,
        originalText: userResponse,
        currentText: userResponse,
        lastEvaluatedText: userResponse,
        coachingFeedback: evaluation.coachingFeedback,
        recommendedRewrite: evaluation.recommendedRewrite || null,
        rewriteRationale: evaluation.rewriteRationale || null,
        status: evaluation.needsRewrite ? "needs_user" : "resolved",
        qualityScore: evaluation.qualityScore,
        alignmentIssues: evaluation.alignmentIssues || null,
        suggestedFollowUps: evaluation.suggestedFollowUps || null,
        iterationCount: 1,
      });
    }

    console.log("✅ Coaching evaluation completed");
    res.json(evaluation);
  } catch (error: unknown) {
    console.error("❌ Error in coaching:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    res
      .status(500)
      .json({ error: "Failed to evaluate question: " + errorMessage });
  }
}

/**
 * Generate Rewrite for Core Offer Question
 */
export async function rewriteCoreOfferQuestion(req: Request, res: Response) {
  try {
    const { questionKey } = req.params;
    const {
      questionText,
      originalResponse,
      mainTransformation,
      specificIssues,
    } = req.body;
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    console.log(`=== CORE OFFER REWRITE: ${questionKey} ===`);
    console.log("User ID:", userId);

    if (!originalResponse || !questionText) {
      return res.status(400).json({
        error: "Question text and original response are required",
      });
    }

    const { generateRewrite } = await import("../services/ai-core-offer-coach");

    // Call AI rewrite service
    const rewrite = await generateRewrite({
      questionKey,
      questionText,
      originalResponse,
      mainTransformation,
      specificIssues,
    });

    console.log("✅ Rewrite generated successfully");
    res.json(rewrite);
  } catch (error: unknown) {
    console.error("❌ Error in rewrite:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    res
      .status(500)
      .json({ error: "Failed to generate rewrite: " + errorMessage });
  }
}

/**
 * Accept Rewrite for Core Offer Question
 */
export async function acceptCoreOfferRewrite(req: Request, res: Response) {
  try {
    const { questionKey } = req.params;
    const { rewrittenText } = req.body;
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    console.log(`=== ACCEPT REWRITE: ${questionKey} ===`);
    console.log("User ID:", userId);

    if (!rewrittenText) {
      return res.status(400).json({ error: "Rewritten text is required" });
    }

    // Update coaching session to mark rewrite as accepted
    const existingSession = await storage.getCoreCoachingSession(
      userId,
      questionKey
    );

    if (existingSession) {
      await storage.updateCoreCoachingSession(existingSession.id, {
        currentText: rewrittenText,
        status: "accepted",
        acceptedAt: new Date(),
        updatedAt: new Date(),
      });
    }

    console.log("✅ Rewrite accepted");
    res.json({ success: true });
  } catch (error: unknown) {
    console.error("❌ Error accepting rewrite:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    res
      .status(500)
      .json({ error: "Failed to accept rewrite: " + errorMessage });
  }
}

/**
 * Get Final Summary for Core Offer
 */
export async function getCoreOfferSummary(req: Request, res: Response) {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    console.log("=== CORE OFFER FINAL SUMMARY ===");
    console.log("User ID:", userId);

    // Get all Core Offer responses from localStorage (passed as query param or body)
    const allResponses = req.query.responses
      ? JSON.parse(req.query.responses as string)
      : req.body.responses || {};

    if (Object.keys(allResponses).length === 0) {
      return res
        .status(400)
        .json({ error: "No responses provided for summary" });
    }

    const { generateFinalSummary } = await import(
      "../services/ai-core-offer-coach"
    );

    // Generate final summary
    const summary = await generateFinalSummary(allResponses);

    console.log("✅ Final summary generated");
    res.json(summary);
  } catch (error: unknown) {
    console.error("❌ Error generating summary:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    res
      .status(500)
      .json({ error: "Failed to generate summary: " + errorMessage });
  }
}

/**
 * Get Coaching Sessions for User
 */
export async function getCoreOfferCoachingSessions(
  req: Request,
  res: Response
) {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const sessions = await storage.getCoreCoachingSessions(userId);
    res.json(sessions);
  } catch (error: unknown) {
    console.error("❌ Error fetching coaching sessions:", error);
    res.status(500).json({ error: "Failed to fetch coaching sessions" });
  }
}

/**
 * Evaluate Core Offer Outline Section
 */
export async function evaluateCoreOfferSection(req: Request, res: Response) {
  try {
    const { sectionTitle, sectionContent, mainTransformation, fullOutline } =
      req.body;

    console.log("=== SECTION EVALUATION ===");
    console.log("Section:", sectionTitle);

    const { evaluateCoreOfferSection } = await import(
      "../services/ai-core-outline-section-coach"
    );

    const evaluation = await evaluateCoreOfferSection({
      sectionTitle,
      sectionContent,
      mainTransformation,
      fullOutline,
    });

    console.log("✅ Section evaluated");
    res.json(evaluation);
  } catch (error: unknown) {
    console.error("❌ Error evaluating section:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    res
      .status(500)
      .json({ error: "Failed to evaluate section: " + errorMessage });
  }
}

/**
 * Rewrite Core Offer Outline Section
 */
export async function rewriteCoreOfferSection(req: Request, res: Response) {
  try {
    const { sectionTitle, sectionContent, mainTransformation, specificIssues } =
      req.body;

    console.log("=== SECTION REWRITE ===");
    console.log("Section:", sectionTitle);

    const { rewriteCoreOfferSection } = await import(
      "../services/ai-core-outline-section-coach"
    );

    const rewrite = await rewriteCoreOfferSection({
      sectionTitle,
      sectionContent,
      mainTransformation,
      specificIssues: specificIssues || [],
    });

    console.log("✅ Section rewritten");
    res.json(rewrite);
  } catch (error: unknown) {
    console.error("❌ Error rewriting section:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    res
      .status(500)
      .json({ error: "Failed to rewrite section: " + errorMessage });
  }
}

/**
 * Generate Tripwire Funnel Page Templates
 */
export async function generateTripwireTemplates(req: Request, res: Response) {
  try {
    const { offerId, outlineId, outlineText } = req.body;
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    console.log("=== TRIPWIRE FUNNEL TEMPLATES GENERATION ===");
    console.log(
      "User ID:",
      userId,
      "Offer ID:",
      offerId,
      "Outline ID:",
      outlineId
    );

    // Input validation
    if (!outlineText || typeof outlineText !== "string") {
      return res
        .status(400)
        .json({ error: "Outline text is required and must be a string" });
    }

    if (!Number.isInteger(offerId) || offerId <= 0) {
      return res
        .status(400)
        .json({ error: "Offer ID must be a positive integer" });
    }

    // Get product name from outline if available
    const productNameMatch = outlineText.match(
      /##\s*Offer Snapshot[^#]*Product Name:\s*([^\n]+)/i
    );
    const productName = productNameMatch
      ? productNameMatch[1].trim()
      : "your offer";

    const { generateTripwireFunnelPages } = await import(
      "../services/ai-tripwire-templates"
    );

    // Generate all three funnel pages
    const funnelPages = await generateTripwireFunnelPages(
      outlineText,
      productName
    );

    // Store each page in database
    const pageTypes = [
      "tripwire_thankyou",
      "tripwire_checkout",
      "tripwire_confirmation",
    ];
    const pageKeys: (keyof typeof funnelPages)[] = [
      "thankyou",
      "checkout",
      "confirmation",
    ];
    const pageTitles = [
      "Thank You + Offer Page",
      "Checkout Page",
      "Confirmation Page",
    ];

    const savedPages = [];

    for (let i = 0; i < pageTypes.length; i++) {
      const pageType = pageTypes[i];
      const pageKey = pageKeys[i];
      const pageTitle = pageTitles[i];
      const pageData = funnelPages[pageKey];

      // Check if page already exists for THIS user and offerId
      const existingPage = await storage.getTripwireTemplateByType(
        userId,
        offerId,
        pageType
      );

      if (existingPage) {
        // Verify ownership before updating
        if (existingPage.userId !== userId.toString()) {
          console.warn(
            `[TRIPWIRE TEMPLATES] User ${userId} attempted to update page owned by ${existingPage.userId}`
          );
          continue; // Skip this page
        }

        // Update existing page - update both content and inputs for consistency
        const updated = await storage.updateSalesPage(existingPage.id, {
          title: pageTitle,
          content: JSON.stringify(pageData),
          inputs: {
            pageType,
            offerId,
            ...((existingPage.inputs as any) || {}),
          } as any,
          status: "draft",
        });
        if (updated) {
          savedPages.push(updated);
        }
      } else {
        // Create new page
        const newPage = await storage.createSalesPage({
          userId: userId.toString(),
          title: pageTitle,
          content: JSON.stringify(pageData),
          inputs: {
            pageType,
            offerId,
          } as any,
          status: "draft",
        });
        savedPages.push(newPage);
      }
    }

    console.log(
      `✅ Generated and saved ${savedPages.length} tripwire funnel pages`
    );
    res.json({
      success: true,
      pages: savedPages,
      funnelPages, // Also return the raw pages for immediate use
    });
  } catch (error: unknown) {
    console.error("❌ Error generating tripwire templates:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({
      error: "Failed to generate tripwire templates: " + errorMessage,
    });
  }
}

/**
 * Generate Core Offer Outline
 */
export async function generateCoreOfferOutline(req: Request, res: Response) {
  try {
    const { coreResponses, userId } = req.body;

    console.log("=== CORE OFFER OUTLINE GENERATION ===");
    console.log(
      "Core responses received:",
      Object.keys(coreResponses || {}).length
    );
    console.log("User ID:", userId);

    if (!coreResponses || Object.keys(coreResponses).length === 0) {
      console.log("❌ No core responses provided");
      return res
        .status(400)
        .json({ error: "Core offer responses are required" });
    }

    // Fetch user's messaging strategy for context
    let messagingStrategy = null;
    try {
      messagingStrategy = await storage.getActiveMessagingStrategy(userId);
      console.log(
        `📋 Messaging strategy fetched for context: ${
          messagingStrategy ? "Available" : "Not found"
        }`
      );
    } catch (error) {
      console.warn(
        "⚠️ Could not fetch messaging strategy, continuing without it:",
        error
      );
    }

    const { generateCoreOfferOutline } = await import(
      "../services/ai-core-offer-outline"
    );

    const result = await generateCoreOfferOutline(
      coreResponses,
      userId || 0,
      messagingStrategy?.content || null
    );

    console.log("✅ Core offer outline generated successfully");
    console.log("Response structure:", {
      hasOutline: !!result.outline,
      outlineLength: result.outline?.length || 0,
      overallScore: result.evaluation.overall_score,
      strengthsCount: result.evaluation.strengths.length,
      improvementsCount: result.evaluation.improvements_needed.length,
    });

    // Save the core offer outline to database
    let savedId = null;
    if (userId && result.outline) {
      try {
        console.log(`💾 Saving core offer outline for user ${userId}`);

        const savedOutline = await storage.createUserOfferOutline({
          userId: parseInt(userId),
          offerNumber: 1,
          title: `Core Offer Outline`,
          content: result.outline,
          completionPercentage: Math.round(
            result.evaluation?.overall_score || 100
          ),
          missingInformation: [],
          recommendations: result.recommendations || [],
          sourceData: {
            generatedAt: new Date().toISOString(),
            responses: Object.keys(coreResponses).length,
            type: "core",
            evaluation: result.evaluation,
          },
        });

        savedId = savedOutline.id;
        console.log(`✅ Core offer outline saved with ID: ${savedId}`);

        // Mark Core Offer Outline as complete in database
        try {
          await storage.markSectionComplete({
            userId: parseInt(userId),
            stepNumber: 2,
            sectionTitle: "Core Offer Outline",
            offerNumber: 1,
          });
          console.log(
            "[COMPLETION] Core Offer Outline marked as complete for user",
            userId
          );
        } catch (completionError) {
          console.error(
            "[COMPLETION] Error marking Core Offer Outline complete:",
            completionError
          );
        }
      } catch (saveError) {
        console.error(
          "❌ Error saving core offer outline to database:",
          saveError
        );
        // Don't fail the request if saving fails, just log it
      }
    }

    res.json({ ...result, savedId });
  } catch (error: unknown) {
    console.error("❌ Error generating core offer outline:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({
      error: "Failed to generate core offer outline: " + errorMessage,
    });
  }
}

/**
 * Generate Tripwire Offer Outline
 */
export async function generateTripwireOutline(req: Request, res: Response) {
  try {
    const { tripwireResponses, offerNumber } = req.body;
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    console.log("=== TRIPWIRE OUTLINE GENERATION ===");
    console.log(
      "Tripwire responses received:",
      Object.keys(tripwireResponses || {}).length
    );
    console.log("Authenticated User ID:", userId, "Offer Number:", offerNumber);

    // Validate required fields
    if (
      !tripwireResponses ||
      typeof tripwireResponses !== "object" ||
      Object.keys(tripwireResponses).length === 0
    ) {
      console.log("❌ No tripwire responses provided");
      return res.status(400).json({ error: "Tripwire responses are required" });
    }

    if (!offerNumber) {
      console.log("❌ No offer number provided");
      return res.status(400).json({ error: "Offer number is required" });
    }

    // Fetch user's messaging strategy for context
    let messagingStrategy = null;
    try {
      messagingStrategy = await storage.getActiveMessagingStrategy(userId);
      console.log(
        `📋 Messaging strategy fetched for context: ${
          messagingStrategy ? "Available" : "Not found"
        }`
      );
    } catch (error) {
      console.warn(
        "⚠️ Could not fetch messaging strategy, continuing without it:",
        error
      );
    }

    const { generateTripwireOutline } = await import(
      "../services/ai-tripwire-outline"
    );

    const result = await generateTripwireOutline(
      tripwireResponses,
      messagingStrategy?.content || null
    );

    console.log("✅ Tripwire outline generated successfully");
    console.log("Response structure:", {
      hasOutline: !!result.outline,
      outlineLength: result.outline?.length || 0,
      completeness: result.completeness,
      missingInfoCount: result.missingInformation?.length || 0,
    });

    // Save the tripwire outline to database
    let savedId = null;
    try {
      console.log(
        `💾 Saving tripwire outline for user ${userId}, offer ${offerNumber}`
      );

      const savedOutline = await storage.createUserOfferOutline({
        userId: typeof userId === "string" ? parseInt(userId) : userId,
        offerNumber: parseInt(offerNumber),
        title: `Tripwire Offer Outline`,
        content: result.outline,
        completionPercentage: Math.round(result.completeness * 100),
        missingInformation: result.missingInformation,
        recommendations: [],
        sourceData: {
          generatedAt: new Date().toISOString(),
          responses: Object.keys(tripwireResponses).length,
          type: "tripwire",
        },
      });

      savedId = savedOutline.id;
      console.log(`✅ Tripwire outline saved with ID: ${savedId}`);

      // Mark Tripwire Offer Outline as complete in database
      try {
        await storage.markSectionComplete({
          userId: typeof userId === "string" ? parseInt(userId) : userId,
          stepNumber: 2,
          sectionTitle: "Tripwire Offer Outline",
          offerNumber: parseInt(offerNumber),
        });
        console.log(
          "[COMPLETION] Tripwire Offer Outline marked as complete for user",
          userId
        );
      } catch (completionError) {
        console.error(
          "[COMPLETION] Error marking Tripwire Offer Outline complete:",
          completionError
        );
      }
    } catch (saveError) {
      console.error("❌ Error saving tripwire outline to database:", saveError);
      // Don't fail the request if saving fails, just log it
    }

    // Return full response structure with completeness and missing information
    res.json({
      outline: result.outline,
      completeness: result.completeness,
      missingInformation: result.missingInformation,
      savedId,
    });
  } catch (error: unknown) {
    console.error("❌ Error generating tripwire outline:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({
      error: "Failed to generate tripwire outline: " + errorMessage,
    });
  }
}
