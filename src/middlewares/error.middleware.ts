import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

/**
 * Centralized error handling middleware
 */
export const errorHandler = (
  err: Error | ZodError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: "Validation error",
      errors: err.errors.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      })),
    });
  }

  // Generic errors
  const status = (err as any).status || (err as any).statusCode || 500;
  const message = err.message || "Internal Server Error";

  console.error("Error:", err);

  res.status(status).json({
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

/**
 * 404 Not Found middleware
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.status(404).json({
    message: `Route ${req.originalUrl} not found`,
  });
};
