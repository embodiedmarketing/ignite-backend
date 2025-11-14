import type { Request, Response } from "express";
import { storage } from "../services/storage.service";
import { db } from "../config/db";
import { sql } from "drizzle-orm";
import { getUserId } from "../middlewares/auth.middleware";
import { isAuthenticated } from "../middlewares/auth.middleware";

/**
 * Parse interview transcript
 */
export async function parseInterviewTranscript(req: Request, res: Response) {
  const { executeAtomicUpload } = await import(
    "../../../server/upload-state-manager"
  );
  const { parseInterviewTranscript } = await import(
    "../../../server/ai-transcript-parser"
  );
  const userId = (req.session as any)?.userId || 0;

  const result = await executeAtomicUpload(
    userId,
    "file_processing",
    async (operationId: string) => {
      const { transcript } = req.body;

      if (!transcript || !transcript.trim()) {
        throw new Error("Transcript is required");
      }

      console.log(
        `[ATOMIC UPLOAD] Processing transcript parsing operation ${operationId}`
      );
      console.log(
        `[ATOMIC UPLOAD] Transcript length: ${transcript.length} characters`
      );

      // Add data source validation for transcript processing
      const { DataSourceValidator } = await import(
        "../../../server/data-source-validator"
      );

      const validatedTranscriptData = DataSourceValidator.validateDataSource(
        { transcript: transcript },
        "client_interview",
        userId,
        { source: "transcript_parsing", operationId }
      );

      const transcriptConfidence =
        validatedTranscriptData.transcript?.metadata.confidence || 1;

      if (transcriptConfidence < 0.5) {
        console.warn(
          `[ATOMIC UPLOAD] Low confidence transcript detected (${transcriptConfidence})`
        );
        throw new Error(
          "The transcript content appears to have quality issues. Please review and try again."
        );
      }

      const extractedAnswers = await parseInterviewTranscript(transcript);

      return {
        extractedAnswers,
        fallbackUsed: false,
        dataQuality: {
          confidence: transcriptConfidence,
          validationFlags:
            validatedTranscriptData.transcript?.metadata.validationFlags ||
            [],
        },
      };
    },
    {
      transcriptLength: req.body.transcript?.length || 0,
    }
  );

  if (result.success) {
    res.json(result.data);
  } else {
    // Enhanced error handling
    const error = result.error || "Unknown error occurred";

    if (error.includes("Rate limit")) {
      res.status(200).json({
        extractedAnswers: {},
        error:
          "AI processing temporarily unavailable due to high usage. Please try again in a few minutes, or paste responses manually.",
        fallbackUsed: true,
      });
    } else if (
      error.includes("quality issues") ||
      error.includes("confidence")
    ) {
      res.status(400).json({
        error: error,
        extractedAnswers: {},
      });
    } else if (error.includes("Another file_processing operation")) {
      res.status(409).json({
        error:
          "Another transcript is currently being processed. Please wait for it to complete before uploading a new one.",
        extractedAnswers: {},
      });
    } else {
      res.status(500).json({
        error:
          "Failed to parse interview transcript. Please try pasting individual responses manually.",
        extractedAnswers: {},
      });
    }
  }
}

/**
 * Synthesize interview response
 */
export async function synthesizeInterviewResponse(req: Request, res: Response) {
  try {
    const { interviewResponse, existingMessagingStrategy } = req.body;

    if (!interviewResponse || !interviewResponse.customerAnswer) {
      return res
        .status(400)
        .json({ error: "Interview response is required" });
    }

    const { synthesizeInterviewResponse } = await import(
      "../../../server/ai-interview-synthesis"
    );

    const synthesis = await synthesizeInterviewResponse(
      interviewResponse,
      existingMessagingStrategy || {}
    );

    res.json(synthesis);
  } catch (error) {
    console.error("Error synthesizing interview response:", error);
    res
      .status(500)
      .json({ error: "Failed to synthesize interview response" });
  }
}

/**
 * Synthesize interviews to strategy
 */
export async function synthesizeInterviewsToStrategy(req: Request, res: Response) {
  try {
    const { allInterviewInsights, existingResponses } = req.body;

    if (
      !allInterviewInsights ||
      Object.keys(allInterviewInsights).length === 0
    ) {
      return res
        .status(400)
        .json({ error: "Interview insights are required" });
    }

    const { synthesizeInterviewsIntoStrategy } = await import(
      "../../../server/interview-strategy-mapper"
    );

    const synthesizedStrategy = await synthesizeInterviewsIntoStrategy(
      allInterviewInsights,
      existingResponses || {}
    );

    res.json({ synthesizedStrategy });
  } catch (error) {
    console.error("Error synthesizing interviews into strategy:", error);
    res
      .status(500)
      .json({
        error: "Failed to synthesize interviews into messaging strategy",
      });
  }
}

/**
 * Intelligent interview processing
 */
export async function intelligentInterviewProcessing(req: Request, res: Response) {
  try {
    const { transcript, userId, existingMessagingStrategy } = req.body;

    if (!transcript || !userId) {
      return res
        .status(400)
        .json({ message: "Transcript and userId are required" });
    }

    const { intelligentlyProcessInterviewTranscript } = await import(
      "../../../server/ai-intelligent-interview-processor"
    );

    const messagingUpdates = await intelligentlyProcessInterviewTranscript(
      transcript,
      existingMessagingStrategy || {}
    );

    console.log("Backend messagingUpdates result:", messagingUpdates);
    console.log("Type of messagingUpdates:", typeof messagingUpdates);
    console.log(
      "Keys in messagingUpdates:",
      messagingUpdates ? Object.keys(messagingUpdates) : "null/undefined"
    );

    // Save the processed interview notes to database for persistence
    if (
      messagingUpdates &&
      messagingUpdates.updates &&
      Object.keys(messagingUpdates.updates).length > 0
    ) {
      try {
        const savedNotes = [];

        // Extract the updates object from the response
        const updates = messagingUpdates.updates;

        for (const [noteKey, content] of Object.entries(updates)) {
          if (content && typeof content === "string" && content.trim()) {
            try {
              // Check if note exists
              const existingNote = await db.execute(
                sql`SELECT id FROM interview_notes WHERE user_id = ${userId} AND note_key = ${noteKey}`
              );

              if (existingNote.rows.length > 0) {
                // Update existing note
                await db.execute(
                  sql`UPDATE interview_notes SET content = ${content}, source = 'ai-processing', updated_at = NOW() WHERE user_id = ${userId} AND note_key = ${noteKey}`
                );
              } else {
                // Insert new note
                await db.execute(
                  sql`INSERT INTO interview_notes (user_id, note_key, content, source, created_at, updated_at) VALUES (${userId}, ${noteKey}, ${content}, 'ai-processing', NOW(), NOW())`
                );
              }

              savedNotes.push(noteKey);
            } catch (noteError) {
              console.error(
                `Error saving individual note ${noteKey}:`,
                noteError
              );
              // Continue with other notes even if one fails
            }
          }
        }

        console.log(
          `Successfully saved ${savedNotes.length} interview notes to database:`,
          savedNotes
        );
      } catch (dbError) {
        console.error("Error saving interview notes to database:", dbError);
        // Continue execution even if database save fails
      }
    }

    res.json({
      success: true,
      messagingUpdates,
      message:
        "Interview transcript processed intelligently and messaging strategy updated",
    });
  } catch (error) {
    console.error("Error in intelligent interview processing:", error);
    res.status(500).json({
      message: "Failed to process interview transcript",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Transfer interview response to workbook
 */
export async function transferInterviewResponse(req: Request, res: Response) {
  try {
    const { userId, stepNumber, questionKey, responseText, sectionTitle } =
      req.body;

    // Simple validation
    if (!userId || !stepNumber || !questionKey || !responseText) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Direct database save with no complex logic
    const savedResponse = await storage.upsertWorkbookResponse({
      userId: parseInt(userId),
      stepNumber: parseInt(stepNumber),
      sectionTitle: sectionTitle || questionKey.split("-")[0],
      questionKey,
      responseText,
      offerNumber: 1,
    });

    console.log(
      `[TRANSFER] Successfully saved: ${questionKey} for user ${userId}`
    );

    res.json({
      success: true,
      message: "Transfer saved successfully",
      id: savedResponse.id,
    });
  } catch (error) {
    console.error("Transfer save error:", error);
    res.status(500).json({ message: "Failed to save transfer" });
  }
}

