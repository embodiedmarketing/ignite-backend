import type { Response } from "express";

export interface HandleControllerErrorOptions {
  /** Label for console.error (e.g. "fetching team members") */
  logLabel: string;
  /** If set, on "duplicate key" error send 400 with this message */
  duplicateKeyMessage?: string;
  /** Default 500 message */
  defaultMessage?: string;
}

/**
 * Centralized controller error handling: log error, handle ZodError and duplicate key, send response.
 * Returns true if a response was sent (caller should return), false otherwise.
 */
export function handleControllerError(
  error: unknown,
  res: Response,
  options: HandleControllerErrorOptions
): boolean {
  const {
    logLabel,
    duplicateKeyMessage,
    defaultMessage = "An unexpected error occurred",
  } = options;

  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorName = error instanceof Error ? error.name : "UnknownError";
  console.error(`Error ${logLabel}:`, {
    name: errorName,
    message: errorMessage,
    stack: error instanceof Error ? error.stack : undefined,
  });

  if (error instanceof Error && error.name === "ZodError") {
    const zodError = error as { errors?: unknown };
    res.status(400).json({
      message: "Invalid request data",
      details: zodError.errors || errorMessage,
    });
    return true;
  }

  if (
    duplicateKeyMessage &&
    error instanceof Error &&
    error.message.includes("duplicate key")
  ) {
    res.status(400).json({ message: duplicateKeyMessage });
    return true;
  }

  res.status(500).json({ message: defaultMessage });
  return true;
}

/**
 * Parse numeric ID from req.params. Sends 400 if missing/invalid and returns undefined.
 */
export function parseIdParam(
  id: string | undefined,
  res: Response,
  options: { paramName?: string } = {}
): number | undefined {
  const { paramName = "ID" } = options;
  if (!id) {
    res.status(400).json({ message: `${paramName} is required` });
    return undefined;
  }
  const idNum = parseInt(id, 10);
  if (isNaN(idNum)) {
    res.status(400).json({ message: `Invalid ${paramName} format` });
    return undefined;
  }
  return idNum;
}
