import type { Request, Response } from "express";
import { storage } from "../services/storage.service";
import {
  analyzeResponse,
  generateImprovementSuggestions,
  addPodcastInsights,
  cleanupAudioTranscript,
  expandAndDeepen,
} from "../services/ai-feedback.service";

/**
 * Analyze user response
 */
export async function analyzeUserResponse(req: Request, res: Response) {
  try {
    const { section, prompt, response, userId } = req.body;

    if (!section || !prompt || !response) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const analysis = await analyzeResponse(
      section,
      prompt,
      response,
      "default",
      userId || "anonymous"
    );

    console.log("=== SERVER SENDING RESPONSE ===");
    console.log("Analysis level:", analysis.level);
    console.log(
      "Analysis feedback:",
      analysis.feedback.substring(0, 100) + "..."
    );
    console.log("Response being sent:", {
      level: analysis.level,
      levelDescription: analysis.levelDescription,
      feedback: analysis.feedback,
      suggestions: analysis.suggestions?.length || 0,
      specificIssues: analysis.specificIssues?.length || 0,
      encouragement: analysis.encouragement,
    });
    console.log("===============================");

    res.json(analysis);
  } catch (error) {
    console.error("Error analyzing response:", error);
    res.status(500).json({ message: "Failed to analyze response" });
  }
}

/**
 * Generate improvement suggestions
 */
export async function getImprovementSuggestions(req: Request, res: Response) {
  try {
    const { section, responses } = req.body;

    if (!section || !responses) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const suggestions = await generateImprovementSuggestions(
      section,
      responses
    );
    res.json({ suggestions });
  } catch (error) {
    console.error("Error generating suggestions:", error);
    res.status(500).json({ message: "Failed to generate suggestions" });
  }
}

/**
 * Cleanup audio transcript
 */
export async function cleanupTranscript(req: Request, res: Response) {
  try {
    const { transcript, questionContext } = req.body;

    if (!transcript) {
      return res.status(400).json({ message: "Transcript is required" });
    }

    const cleanedText = await cleanupAudioTranscript(
      transcript,
      questionContext || ""
    );
    res.json({ cleanedText });
  } catch (error) {
    console.error("Error cleaning up transcript:", error);
    res.status(500).json({ message: "Failed to cleanup transcript" });
  }
}

/**
 * Expand response with more depth
 */
export async function expandResponse(req: Request, res: Response) {
  try {
    const { initialResponse, questionContext, questionType } = req.body;

    if (!initialResponse) {
      return res
        .status(400)
        .json({ message: "Initial response is required" });
    }

    const expandedResponse = await expandAndDeepen(
      initialResponse,
      questionContext || "",
      questionType || ""
    );
    res.json({ expandedResponse });
  } catch (error) {
    console.error("Error expanding response:", error);
    res.status(500).json({ message: "Failed to expand response" });
  }
}

/**
 * Add podcast insights
 */
export async function addPodcastInsightsRoute(req: Request, res: Response) {
  try {
    const { section, bestPractices, commonMistakes } = req.body;

    if (!section) {
      return res.status(400).json({ message: "Section is required" });
    }

    addPodcastInsights(section, { bestPractices, commonMistakes });
    res.json({ message: "Podcast insights added successfully" });
  } catch (error) {
    console.error("Error adding podcast insights:", error);
    res.status(500).json({ message: "Failed to add podcast insights" });
  }
}
