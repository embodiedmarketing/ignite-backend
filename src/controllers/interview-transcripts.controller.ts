import type { Request, Response } from "express";
import { storage } from "../services/storage.service";
import { db } from "../config/db";
import { sql } from "drizzle-orm";
import { insertIcaInterviewTranscriptSchema } from "../models";

/**
 * Get all interview transcripts for a user
 */
export async function getInterviewTranscriptsByUser(
  req: Request,
  res: Response
) {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const transcripts = await storage.getInterviewTranscriptsByUser(userId);
    res.json(transcripts);
  } catch (error) {
    console.error("Error fetching interview transcripts:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Get a single interview transcript by ID
 */
export async function getInterviewTranscript(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid transcript ID" });
    }

    const transcript = await storage.getInterviewTranscript(id);
    if (!transcript) {
      return res
        .status(404)
        .json({ message: "Interview transcript not found" });
    }
    res.json(transcript);
  } catch (error) {
    console.error("Error fetching interview transcript:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Create a new interview transcript
 */
export async function createInterviewTranscript(req: Request, res: Response) {
  console.log("createInterviewTranscript", req.body);
  try {
    // Handle date conversion - convert string to Date or keep as null
    const requestData = { ...req.body };
    if (
      requestData.interviewDate &&
      typeof requestData.interviewDate === "string" &&
      requestData.interviewDate.trim()
    ) {
      requestData.interviewDate = new Date(requestData.interviewDate);
    } else {
      requestData.interviewDate = null;
    }

    // Ensure status is set to 'draft' for new transcripts
    if (!requestData.status) {
      requestData.status = "draft";
    }

    const transcriptData =
      insertIcaInterviewTranscriptSchema.parse(requestData);
    const transcript = await storage.createInterviewTranscript(transcriptData);
    res.status(201).json(transcript);
  } catch (error) {
    console.error("Error creating interview transcript:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Update an existing interview transcript
 */
export async function updateInterviewTranscript(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid transcript ID" });
    }

    // Convert string date to Date object if provided
    const updates = { ...req.body };
    if (updates.interviewDate && typeof updates.interviewDate === "string") {
      updates.interviewDate = new Date(updates.interviewDate);
    }

    // Get current transcript for status logic
    const currentTranscript = await storage.getInterviewTranscript(id);
    if (!currentTranscript) {
      return res
        .status(404)
        .json({ message: "Interview transcript not found" });
    }

    // Auto-transition to 'updated' if content changes on processed transcript
    const contentFields = [
      "title",
      "customerName",
      "rawTranscript",
      "interviewDate",
      "platform",
      "duration",
      "tags",
      "notes",
    ];
    const hasContentChanges = contentFields.some(
      (field) => updates[field] !== undefined
    );

    if (
      currentTranscript.status === "processed" &&
      hasContentChanges &&
      !updates.status
    ) {
      updates.status = "updated";
    }

    // Handle status transitions validation
    if (updates.status) {
      const validTransitions: Record<string, string[]> = {
        draft: ["processing"],
        processing: ["processed", "draft"],
        processed: ["updated"],
        updated: ["processing"],
      };

      const currentStatus = currentTranscript.status;
      const newStatus = updates.status;

      if (currentStatus && newStatus && currentStatus !== newStatus) {
        const allowedTransitions = validTransitions[currentStatus];
        if (allowedTransitions && !allowedTransitions.includes(newStatus)) {
          return res.status(400).json({
            message: `Invalid status transition from ${currentStatus} to ${newStatus}`,
          });
        }
      }
    }

    const transcript = await storage.updateInterviewTranscript(id, updates);
    if (!transcript) {
      return res
        .status(404)
        .json({ message: "Interview transcript not found" });
    }
    res.json(transcript);
  } catch (error) {
    console.error("Error updating interview transcript:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Delete an interview transcript
 */
export async function deleteInterviewTranscript(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid transcript ID" });
    }

    const deleted = await storage.deleteInterviewTranscript(id);
    if (!deleted) {
      return res
        .status(404)
        .json({ message: "Interview transcript not found" });
    }
    res.json({ message: "Interview transcript deleted successfully" });
  } catch (error) {
    console.error("Error deleting interview transcript:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Reset stuck processing transcripts (admin endpoint)
 */
export async function resetStuckTranscripts(req: Request, res: Response) {
  try {
    const { userId } = req.body;

    // Reset all stuck processing transcripts for a user or globally
    const result = userId
      ? await db.execute(sql`
          UPDATE ica_interview_transcripts 
          SET status = 'draft', updated_at = NOW() 
          WHERE user_id = ${userId.toString()} AND status = 'processing'
          RETURNING id, title
        `)
      : await db.execute(sql`
          UPDATE ica_interview_transcripts 
          SET status = 'draft', updated_at = NOW() 
          WHERE status = 'processing'
          RETURNING id, title
        `);

    const resetCount = result.rows.length;
    const resetTitles = result.rows.map((row: any) => row.title);

    console.log(`✅ Reset ${resetCount} stuck transcripts:`, resetTitles);

    res.json({
      success: true,
      resetCount,
      resetTitles,
      message: `Successfully reset ${resetCount} stuck transcript(s) to draft status`,
    });
  } catch (error) {
    console.error("Error resetting stuck transcripts:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
