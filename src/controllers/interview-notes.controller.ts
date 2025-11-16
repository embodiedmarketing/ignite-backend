import type { Request, Response } from "express";
import { db } from "../config/db";
import { sql } from "drizzle-orm";

/**
 * Get all interview notes for a user
 */
export async function getInterviewNotes(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.userId);
    if (!userId) {
      return res.status(400).json({ error: "Valid user ID is required" });
    }

    const result = await db.execute(
      sql`SELECT * FROM interview_notes WHERE user_id = ${userId} ORDER BY note_key`
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching interview notes:", error);
    res.status(500).json({ error: "Failed to fetch interview notes" });
  }
}

/**
 * Create or update interview note
 */
export async function upsertInterviewNote(req: Request, res: Response) {
  try {
    const { userId, noteKey, content, source = "manual", sessionId } = req.body;

    if (!userId || !noteKey || content === undefined) {
      return res
        .status(400)
        .json({ error: "userId, noteKey, and content are required" });
    }

    // Check if note exists
    const existingNote = await db.execute(
      sql`SELECT id, content FROM interview_notes WHERE user_id = ${userId} AND note_key = ${noteKey}`
    );

    let actionType = "create";

    if (existingNote.rows.length > 0) {
      actionType = content === "" ? "delete" : "update";

      // Update existing note
      await db.execute(
        sql`UPDATE interview_notes SET content = ${content}, source = ${source}, is_deleted = ${
          content === ""
        }, updated_at = NOW() WHERE user_id = ${userId} AND note_key = ${noteKey}`
      );
    } else {
      // Insert new note (only if content is not empty)
      if (content !== "") {
        await db.execute(
          sql`INSERT INTO interview_notes (user_id, note_key, content, source, is_deleted) VALUES (${userId}, ${noteKey}, ${content}, ${source}, false)`
        );
      }
    }

    // Create history record for all changes (including deletes)
    await db.execute(
      sql`INSERT INTO interview_notes_history (user_id, note_key, content, action_type, source, session_id) VALUES (${userId}, ${noteKey}, ${content}, ${actionType}, ${source}, ${
        sessionId || null
      })`
    );

    res.json({
      success: true,
      message: "Interview note saved successfully",
      actionType,
    });
  } catch (error) {
    console.error("Error saving interview note:", error);
    res.status(500).json({ error: "Failed to save interview note" });
  }
}

/**
 * Get version history for a specific interview note
 */
export async function getInterviewNoteHistory(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.userId);
    const { noteKey } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!userId || !noteKey) {
      return res
        .status(400)
        .json({ error: "Valid user ID and note key are required" });
    }

    const result = await db.execute(sql`
      SELECT id, user_id, note_key, content, action_type, source, session_id, timestamp 
      FROM interview_notes_history 
      WHERE user_id = ${userId} AND note_key = ${noteKey} 
      ORDER BY timestamp DESC 
      LIMIT ${limit}
    `);

    // Transform snake_case to camelCase for frontend compatibility
    const transformedRows = result.rows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      note_key: row.note_key,
      content: row.content,
      action_type: row.action_type,
      source: row.source,
      session_id: row.session_id,
      timestamp: row.timestamp,
    }));

    res.json(transformedRows);
  } catch (error) {
    console.error("Error fetching interview note history:", error);
    res.status(500).json({ error: "Failed to fetch interview note history" });
  }
}

/**
 * Restore interview note from history
 */
export async function restoreInterviewNote(req: Request, res: Response) {
  try {
    const { userId, noteKey, historyId, sessionId } = req.body;

    if (!userId || !noteKey || !historyId) {
      return res
        .status(400)
        .json({ error: "userId, noteKey, and historyId are required" });
    }

    // Get the historical content
    const historyResult = await db.execute(sql`
      SELECT content, source FROM interview_notes_history 
      WHERE id = ${historyId} AND user_id = ${userId} AND note_key = ${noteKey}
    `);

    if (historyResult.rows.length === 0) {
      return res.status(404).json({ error: "History record not found" });
    }

    const historyRow = historyResult.rows[0];
    const content = historyRow.content;
    const source = historyRow.source;

    // Don't allow restoring empty or null content
    if (!content || typeof content !== "string" || content.trim() === "") {
      return res.status(400).json({
        error:
          "Cannot restore empty content. Please select a version with actual content.",
      });
    }

    // Update current note
    const existingNote = await db.execute(
      sql`SELECT id FROM interview_notes WHERE user_id = ${userId} AND note_key = ${noteKey}`
    );

    if (existingNote.rows.length > 0) {
      await db.execute(
        sql`UPDATE interview_notes SET content = ${content}, source = ${source}, is_deleted = false, updated_at = NOW() WHERE user_id = ${userId} AND note_key = ${noteKey}`
      );
    } else {
      await db.execute(
        sql`INSERT INTO interview_notes (user_id, note_key, content, source, is_deleted) VALUES (${userId}, ${noteKey}, ${content}, ${source}, false)`
      );
    }

    // Create history record for the restore action
    await db.execute(
      sql`INSERT INTO interview_notes_history (user_id, note_key, content, action_type, source, session_id) VALUES (${userId}, ${noteKey}, ${content}, 'restore', ${source}, ${
        sessionId || null
      })`
    );

    res.json({
      success: true,
      message: "Interview note restored successfully",
      content,
    });
  } catch (error) {
    console.error("Error restoring interview note:", error);
    res.status(500).json({ error: "Failed to restore interview note" });
  }
}

/**
 * Bulk save interview notes from transcript parsing
 */
export async function bulkSaveInterviewNotes(req: Request, res: Response) {
  try {
    const { userId, notes, source = "transcript" } = req.body;

    if (!userId || !notes || typeof notes !== "object") {
      return res
        .status(400)
        .json({ error: "userId and notes object are required" });
    }

    const savedNotes = [];

    for (const [noteKey, content] of Object.entries(notes)) {
      if (content && typeof content === "string" && content.trim()) {
        // Check if note exists
        const existingNote = await db.execute(
          sql`SELECT id FROM interview_notes WHERE user_id = ${userId} AND note_key = ${noteKey}`
        );

        if (existingNote.rows.length > 0) {
          // Update existing note
          await db.execute(
            sql`UPDATE interview_notes SET content = ${content}, source = ${source}, updated_at = NOW() WHERE user_id = ${userId} AND note_key = ${noteKey}`
          );
        } else {
          // Insert new note
          await db.execute(
            sql`INSERT INTO interview_notes (user_id, note_key, content, source) VALUES (${userId}, ${noteKey}, ${content}, ${source})`
          );
        }

        savedNotes.push(noteKey);
      }
    }

    res.json({
      success: true,
      message: `Successfully saved ${savedNotes.length} interview notes`,
      savedNotes,
    });
  } catch (error) {
    console.error("Error bulk saving interview notes:", error);
    res.status(500).json({ error: "Failed to bulk save interview notes" });
  }
}
