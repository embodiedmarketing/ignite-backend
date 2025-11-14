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
      "../../../server/ai-core-offer-coach"
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
      return res
        .status(400)
        .json({
          error: "Question text and original response are required",
        });
    }

    const { generateRewrite } = await import(
      "../../../server/ai-core-offer-coach"
    );

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
      "../../../server/ai-core-offer-coach"
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
export async function getCoreOfferCoachingSessions(req: Request, res: Response) {
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
    const {
      sectionTitle,
      sectionContent,
      mainTransformation,
      fullOutline,
    } = req.body;

    console.log("=== SECTION EVALUATION ===");
    console.log("Section:", sectionTitle);

    const { evaluateCoreOfferSection } = await import(
      "../../../server/ai-core-outline-section-coach"
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
    const {
      sectionTitle,
      sectionContent,
      mainTransformation,
      specificIssues,
    } = req.body;

    console.log("=== SECTION REWRITE ===");
    console.log("Section:", sectionTitle);

    const { rewriteCoreOfferSection } = await import(
      "../../../server/ai-core-outline-section-coach"
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
      "../../../server/ai-tripwire-templates"
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

        // Update existing page
        await storage.updateTripwireTemplate(existingPage.id, {
          content: pageData,
          updatedAt: new Date(),
        });
        savedPages.push({ ...existingPage, content: pageData });
      } else {
        // Create new page
        const newPage = await storage.createTripwireTemplate({
          userId: userId.toString(),
          offerId,
          pageType,
          title: pageTitle,
          content: pageData,
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
    res
      .status(500)
      .json({
        error: "Failed to generate tripwire templates: " + errorMessage,
      });
  }
}

