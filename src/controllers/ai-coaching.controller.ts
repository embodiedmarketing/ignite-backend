import type { Request, Response } from "express";
import { storage } from "../services/storage.service";
import {
  getInteractiveCoaching,
  generateExpandedResponse,
} from "../services/ai-interactive-coach.service";
import {
  getRealTimeFeedback,
  getCachedFeedback,
  cacheFeedback,
} from "../services/ai-real-time-coach.service";
import { generateIntelligentPrefill } from "../services/ai-intelligent-prefill.service";

/**
 * Get interactive coaching
 */
export async function getInteractiveCoachingRoute(req: Request, res: Response) {
  try {
    const {
      section,
      questionContext,
      userResponse,
      userId,
      messagingStrategy,
    } = req.body;

    if (!section || !questionContext) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const sectionStr = typeof section === "string" ? section : String(section);
    const questionContextStr =
      typeof questionContext === "string"
        ? questionContext
        : String(questionContext);

    console.log("=== API REQUEST DEBUG ===");
    console.log("Original section:", section, typeof section);
    console.log("Converted section:", sectionStr);
    console.log("Question context:", questionContextStr);
    console.log("========================");

    const coaching = await getInteractiveCoaching(
      sectionStr,
      questionContextStr,
      userResponse || "",
      userId || "anonymous",
      messagingStrategy
    );

    console.log("=== INTERACTIVE COACHING RESPONSE ===");
    console.log("Question:", questionContext);
    console.log("Coaching level:", coaching.level);
    console.log(
      "Follow-up questions:",
      coaching.followUpQuestions?.length || 0
    );
    console.log("=====================================");

    res.json(coaching);
  } catch (error) {
    console.error("Error providing interactive coaching:", error);
    res.status(500).json({ message: "Failed to provide coaching" });
  }
}

/**
 * Generate intelligent prefill
 */
export async function getIntelligentPrefill(req: Request, res: Response) {
  try {
    const { questionText, messagingStrategy, userId } = req.body;

    if (!questionText || !messagingStrategy) {
      return res.status(400).json({
        message: "Question text and messaging strategy are required",
      });
    }

    const prefillResult = await generateIntelligentPrefill(
      questionText,
      messagingStrategy,
      userId || "anonymous"
    );

    console.log("=== INTELLIGENT PREFILL GENERATED ===");
    console.log("Question:", questionText.substring(0, 50) + "...");
    console.log("Generated length:", prefillResult.prefillText.length);
    console.log("Reasoning:", prefillResult.reasoning);
    console.log("=====================================");

    res.json(prefillResult);
  } catch (error) {
    console.error("Error generating intelligent prefill:", error);
    res.status(500).json({ message: "Failed to generate intelligent prefill" });
  }
}

/**
 * Expand response with coaching
 */
export async function expandResponseWithCoaching(req: Request, res: Response) {
  try {
    const { originalResponse, questionContext, coachingInsights } = req.body;

    if (!originalResponse || !questionContext) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const expandedResponse = await generateExpandedResponse(
      originalResponse,
      coachingInsights,
      questionContext
    );

    res.json({ expandedResponse });
  } catch (error) {
    console.error("Error expanding response:", error);
    res.status(500).json({ message: "Failed to expand response" });
  }
}

/**
 * Get real-time feedback
 */
export async function getRealTimeFeedbackRoute(req: Request, res: Response) {
  try {
    const { question, userResponse, sectionContext } = req.body;

    if (!question || !userResponse) {
      return res
        .status(400)
        .json({ message: "Question and user response are required" });
    }

    // Check cache first to reduce API calls
    const cached = getCachedFeedback(question, userResponse);
    if (cached) {
      console.log("[REAL-TIME COACH] Using cached feedback");
      return res.json(cached);
    }

    // Generate new feedback
    const feedback = await getRealTimeFeedback(
      question,
      userResponse,
      sectionContext || ""
    );

    // Cache the feedback
    cacheFeedback(question, userResponse, feedback);

    res.json(feedback);
  } catch (error) {
    console.error("Error generating real-time feedback:", error);
    res.status(500).json({
      status: "good-start",
      encouragement: "Keep going! You're doing great.",
      message: "Feedback temporarily unavailable",
    });
  }
}
