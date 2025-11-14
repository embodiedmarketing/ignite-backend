import type { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

/**
 * Request validation middleware using Zod
 * @param schema - Zod schema to validate against
 * @param source - Where to validate from: 'body', 'query', or 'params'
 */
export const validate = (
  schema: ZodSchema,
  source: "body" | "query" | "params" = "body"
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data =
        source === "body"
          ? req.body
          : source === "query"
          ? req.query
          : req.params;
      schema.parse(data);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: error.errors.map((e) => ({
            path: e.path.join("."),
            message: e.message,
          })),
        });
      }
      next(error);
    }
  };
};
