import type { Request, Response } from "express";
import { storage } from "../services/storage.service";
import { db } from "../config/db";
import { sql } from "drizzle-orm";
import { getUserId } from "../middlewares/auth.middleware";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { parseVTT } from "../utils/vtt-parser";
import mammoth from "mammoth";

/**
 * Parse interview transcript
 */
export async function parseInterviewTranscript(req: Request, res: Response) {
  const { executeAtomicUpload } = await import("../utils/upload-state-manager");
  const { parseInterviewTranscript } = await import(
    "../services/ai-transcript-parser"
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
        "../utils/data-source-validator"
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
            validatedTranscriptData.transcript?.metadata.validationFlags || [],
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
      return res.status(400).json({ error: "Interview response is required" });
    }

    const { synthesizeInterviewResponse } = await import(
      "../services/ai-interview-synthesis"
    );

    const synthesis = await synthesizeInterviewResponse(
      interviewResponse,
      existingMessagingStrategy || {}
    );

    res.json(synthesis);
  } catch (error) {
    console.error("Error synthesizing interview response:", error);
    res.status(500).json({ error: "Failed to synthesize interview response" });
  }
}

/**
 * Synthesize interviews to strategy
 */
export async function synthesizeInterviewsToStrategy(
  req: Request,
  res: Response
) {
  try {
    const { allInterviewInsights, existingResponses } = req.body;

    if (
      !allInterviewInsights ||
      Object.keys(allInterviewInsights).length === 0
    ) {
      return res.status(400).json({ error: "Interview insights are required" });
    }

    const { synthesizeInterviewsIntoStrategy } = await import(
      "../services/interview-strategy-mapper"
    );

    const synthesizedStrategy = await synthesizeInterviewsIntoStrategy(
      allInterviewInsights,
      existingResponses || {}
    );

    res.json({ synthesizedStrategy });
  } catch (error) {
    console.error("Error synthesizing interviews into strategy:", error);
    res.status(500).json({
      error: "Failed to synthesize interviews into messaging strategy",
    });
  }
}

/**
 * Intelligent interview processing
 */
export async function intelligentInterviewProcessing(
  req: Request,
  res: Response
) {
  try {
    const { transcript, userId, existingMessagingStrategy } = req.body;

    if (!transcript || !userId) {
      return res
        .status(400)
        .json({ message: "Transcript and userId are required" });
    }

    const { intelligentlyProcessInterviewTranscript } = await import(
      "../services/ai-intelligent-interview-processor"
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

    // Save the processed interview insights to workbook responses so they appear in messaging strategy fields
    if (
      messagingUpdates &&
      messagingUpdates.updates &&
      Object.keys(messagingUpdates.updates).length > 0
    ) {
      try {
        const savedResponses = [];

        // Extract the updates object from the response
        const updates = messagingUpdates.updates;

        // Step 1 is typically used for Messaging Strategy / Customer Research section
        const MESSAGING_STRATEGY_STEP = 1;
        const offerNumber = 1; // Default to offer 1

        for (const [questionKey, content] of Object.entries(updates)) {
          // Skip dataSourceReport and other metadata fields
          if (
            questionKey === "dataSourceReport" ||
            typeof content !== "string"
          ) {
            continue;
          }

          if (content && content.trim()) {
            try {
              // Save to workbook responses so frontend can display in messaging strategy fields
              await storage.upsertWorkbookResponse({
                userId: parseInt(String(userId)),
                stepNumber: MESSAGING_STRATEGY_STEP,
                questionKey: questionKey, // e.g., "frustrations", "nighttime_worries", etc.
                responseText: content.trim(),
                sectionTitle: "Customer Research", // or could derive from questionKey
                offerNumber: offerNumber,
              });

              savedResponses.push(questionKey);
              console.log(
                `[TRANSFER] Saved ${questionKey} to workbook responses for user ${userId}`
              );
            } catch (responseError) {
              console.error(
                `Error saving workbook response ${questionKey}:`,
                responseError
              );
              // Continue with other responses even if one fails
            }
          }
        }

        console.log(
          `Successfully saved ${savedResponses.length} interview insights to workbook responses:`,
          savedResponses
        );
      } catch (dbError) {
        console.error(
          "Error saving interview insights to workbook responses:",
          dbError
        );
        // Continue execution even if database save fails
      }
    }

    // Return response with both the full structure and flattened updates for frontend convenience
    res.json({
      success: true,
      messagingUpdates,
      // Flattened updates for easy frontend access (e.g., response.updates.frustrations)
      updates: messagingUpdates?.updates || {},
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
 * Get interview notes for a specific transcript by ID
 * This endpoint fetches notes from interview_notes table linked to a specific transcript
 */
export async function getTranscriptNotes(req: Request, res: Response) {
  try {
    const transcriptId = parseInt(req.params.id || (req.query.id as string));

    if (!transcriptId || isNaN(transcriptId)) {
      return res.status(400).json({
        success: false,
        message: "Transcript ID is required",
      });
    }

    console.log(
      `[GET TRANSCRIPT NOTES] Fetching interview notes for transcript ID ${transcriptId}`
    );

    // Verify transcript exists
    const transcript = await storage.getInterviewTranscript(transcriptId);
    if (!transcript) {
      return res.status(404).json({
        success: false,
        message: `Transcript with ID ${transcriptId} not found`,
      });
    }

    // Fetch notes from interview_notes table for this transcript
    const result = await db.execute(
      sql`SELECT * FROM interview_notes WHERE transcript_id = ${transcriptId} AND is_deleted = false ORDER BY note_key`
    );

    // Map field names to user-friendly labels
    const fieldLabels: Record<string, string> = {
      frustrations: "Frustrations",
      nighttime_worries: "Nighttime Worries",
      secret_fears: "Secret Fears",
      magic_solution: "Magic Solution (Ideal Outcome)",
      demographics: "Demographics",
      failed_solutions: "Failed Solutions",
      blockers: "Blockers",
      info_sources: "Info Sources",
      decision_making: "Decision Making",
      investment_criteria: "Investment Criteria",
      success_measures: "Success Measures",
      referral_outcomes: "Referral Outcomes",
    };

    // Extract answers from interview notes
    const extractedAnswers: Record<string, string> = {};
    const notesMetadata: Record<string, any> = {};

    for (const row of result.rows) {
      const noteKey = (row as any).note_key?.toLowerCase() || "";
      const content = (row as any).content || "";
      const source = (row as any).source || "transcript";

      if (content && content.trim() && content.trim().toUpperCase() !== "N/A") {
        extractedAnswers[noteKey] = content.trim();
        notesMetadata[noteKey] = {
          id: (row as any).id,
          source: source,
          createdAt: (row as any).created_at,
          updatedAt: (row as any).updated_at,
        };
      }
    }

    const notesCount = Object.keys(extractedAnswers).length;

    console.log(
      `[GET TRANSCRIPT NOTES] Found ${notesCount} interview notes for transcript ${transcriptId}`
    );

    // Return response
    res.json({
      success: true,
      message:
        notesCount > 0
          ? `Found ${notesCount} interview notes for this transcript`
          : "No interview notes found for this transcript. Please process the transcript first.",

      // Transcript metadata
      transcript: {
        id: transcript.id,
        title: transcript.title,
        customerName: transcript.customerName,
        interviewDate: transcript.interviewDate,
        platform: transcript.platform,
        status: transcript.status,
      },

      // Extracted interview answers/responses
      extractedAnswers: extractedAnswers,

      // Field labels for display
      fieldLabels: fieldLabels,

      // Notes metadata (source, dates, etc.)
      notesMetadata: notesMetadata,

      // Summary
      summary: {
        totalNotesFound: notesCount,
        noteKeys: Object.keys(extractedAnswers),
        hasNotes: notesCount > 0,
      },

      // Metadata
      timestamp: new Date().toISOString(),
      transcriptId: transcriptId,
    });
  } catch (error) {
    console.error("Error fetching transcript notes:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch transcript notes",
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

/**
 * Upload and extract transcript from file
 */
export async function uploadTranscript(req: Request, res: Response) {
  const { executeAtomicUpload } = await import("../utils/upload-state-manager");
  const userId = (req.session as any)?.userId || 0;

  const result = await executeAtomicUpload(
    userId,
    "transcript_upload",
    async (operationId: string) => {
      if (!req.file) {
        throw new Error("No file uploaded");
      }

      console.log(
        `[ATOMIC UPLOAD] Processing transcript upload operation ${operationId}`
      );

      let transcriptText = "";
      const fileName = req.file.originalname?.toLowerCase() || "";

      if (req.file.mimetype === "text/plain" || fileName.endsWith(".txt")) {
        transcriptText = req.file.buffer.toString("utf-8");
      } else if (
        req.file.mimetype === "text/vtt" ||
        fileName.endsWith(".vtt")
      ) {
        // Parse VTT files (case-insensitive extension, with MIME type support)
        const vttContent = req.file.buffer.toString("utf-8");
        transcriptText = parseVTT(vttContent);
        console.log(
          `[VTT PARSER] Extracted ${transcriptText.length} characters from VTT file`
        );
      } else if (
        req.file.mimetype ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        fileName.endsWith(".docx")
      ) {
        const result = await mammoth.extractRawText({
          buffer: req.file.buffer,
        });
        transcriptText = result.value;
      } else if (
        req.file.mimetype === "application/pdf" ||
        fileName.endsWith(".pdf")
      ) {
        // Dynamic import for pdf-parse (needs to be installed: npm install pdf-parse)
        // Note: pdf-parse may need to be added to package.json if not already present
        try {
          // pdf-parse is a CommonJS module with complex export structure
          const pdfParseModule: any = await import("pdf-parse");
          // Handle different export formats
          const pdfParseFn = pdfParseModule.default || pdfParseModule;
          const pdfData = await pdfParseFn(req.file.buffer);
          transcriptText = pdfData.text;
        } catch (pdfError) {
          throw new Error(
            "PDF parsing is not available. Please install pdf-parse: npm install pdf-parse"
          );
        }
      } else {
        throw new Error(
          "Unsupported file type. Please upload .txt, .docx, .pdf, or .vtt files."
        );
      }

      // Validate extracted text
      if (!transcriptText.trim()) {
        throw new Error(
          "The uploaded file appears to be empty or contains no readable text."
        );
      }

      if (transcriptText.length > 50000) {
        console.warn(
          `[ATOMIC UPLOAD] Large transcript detected: ${transcriptText.length} characters`
        );
      }

      return { transcriptText };
    },
    {
      fileName: req.file?.originalname,
      fileSize: req.file?.size,
      mimetype: req.file?.mimetype,
    }
  );

  if (result.success) {
    res.json(result.data);
  } else {
    const statusCode =
      result.error?.includes("Unsupported file type") ||
      result.error?.includes("No file uploaded") ||
      result.error?.includes("empty")
        ? 400
        : 500;
    res.status(statusCode).json({ error: result.error });
  }
}
