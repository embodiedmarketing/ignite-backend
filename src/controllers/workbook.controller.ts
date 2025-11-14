import type { Request, Response } from "express";
import { storage } from "../services/storage.service";
import { insertWorkbookResponseSchema } from "../models";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { getUserId } from "../middlewares/auth.middleware";

/**
 * Get all workbook responses for a user
 */
export async function getWorkbookResponsesByUser(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const responses = await storage.getWorkbookResponsesByUser(userId);
    res.json(responses);
  } catch (error) {
    console.error("Error fetching workbook responses:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Get workbook responses by step
 */
export async function getWorkbookResponsesByStep(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.userId);
    const stepNumber = parseInt(req.params.stepNumber);
    const offerNumber = parseInt(req.query.offerNumber as string) || 1;
    const excludeEmpty = req.query.excludeEmpty === "true";

    if (isNaN(userId) || isNaN(stepNumber)) {
      return res
        .status(400)
        .json({ message: "Invalid user ID or step number" });
    }

    let responses;
    if (excludeEmpty) {
      responses = await storage.getWorkbookResponsesWithContent(
        userId,
        stepNumber,
        offerNumber
      );
    } else {
      responses = await storage.getWorkbookResponsesByStep(
        userId,
        stepNumber,
        offerNumber
      );
    }
    res.json(responses);
  } catch (error) {
    console.error("Error fetching workbook responses by step:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Get a specific workbook response
 */
export async function getWorkbookResponse(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.userId);
    const stepNumber = parseInt(req.params.stepNumber);
    const questionKey = req.params.questionKey;
    if (isNaN(userId) || isNaN(stepNumber)) {
      return res
        .status(400)
        .json({ message: "Invalid user ID or step number" });
    }

    const response = await storage.getWorkbookResponse(
      userId,
      stepNumber,
      questionKey
    );
    res.json(response || null);
  } catch (error) {
    console.error("Error fetching workbook response:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Create or update a workbook response
 */
export async function upsertWorkbookResponse(req: Request, res: Response) {
  try {
    console.log("[WORKBOOK SAVE] Received request:", {
      body: req.body,
      headers: req.headers["content-type"],
      timestamp: new Date().toISOString(),
    });

    const responseData = insertWorkbookResponseSchema.parse(req.body);

    console.log(`[TEXT PERSISTENCE] API Save ${responseData.questionKey}:`, {
      responseText: responseData.responseText,
      textLength: responseData.responseText?.length || 0,
      isEmptyString: responseData.responseText === "",
      userId: responseData.userId,
      stepNumber: responseData.stepNumber,
    });

    if (
      !responseData.userId ||
      !responseData.stepNumber ||
      !responseData.questionKey
    ) {
      console.error("[WORKBOOK SAVE] Missing required fields:", responseData);
      return res.status(400).json({
        message: "Missing required fields",
        required: ["userId", "stepNumber", "questionKey"],
        received: Object.keys(responseData),
      });
    }

    // ALWAYS save to database - including empty strings for cleared content
    const response = await storage.upsertWorkbookResponse(responseData);

    console.log(
      `[TEXT PERSISTENCE] Database save successful for ${responseData.questionKey}:`,
      {
        id: response.id,
        saved: true,
      }
    );

    res.status(201).json(response);
  } catch (error) {
    console.error("Error upserting workbook response:", error);

    if (error instanceof Error && error.name === "ZodError") {
      return res.status(400).json({
        message: "Invalid request data",
        details: (error as any).errors || error.message,
      });
    }

    res.status(500).json({
      message: "Internal server error",
      error:
        process.env.NODE_ENV === "development"
          ? error instanceof Error
            ? error.message
            : "Unknown error"
          : undefined,
    });
  }
}

/**
 * Delete a workbook response
 */
export async function deleteWorkbookResponse(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.userId);
    const stepNumber = parseInt(req.params.stepNumber);
    const questionKey = req.params.questionKey;
    if (isNaN(userId) || isNaN(stepNumber)) {
      return res
        .status(400)
        .json({ message: "Invalid user ID or step number" });
    }

    const deleted = await storage.deleteWorkbookResponse(
      userId,
      stepNumber,
      questionKey
    );
    if (!deleted) {
      return res.status(404).json({ message: "Response not found" });
    }
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting workbook response:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

