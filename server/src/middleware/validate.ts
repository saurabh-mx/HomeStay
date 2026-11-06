import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

/**
 * Middleware to validate request body/query/params using Zod schemas
 */
export const validate = (schema: ZodSchema, source: "body" | "query" | "params" = "body") => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const errors = result.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));

      res.status(400).json({
        status: "fail",
        message: "Validation failed",
        errors,
      });
      return;
    }

    // Replace with parsed (and transformed) data
    req[source] = result.data;
    next();
  };
};
