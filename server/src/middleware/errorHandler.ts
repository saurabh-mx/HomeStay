import { Request, Response, NextFunction } from "express";

interface AppError extends Error {
  statusCode?: number;
  status?: string;
  isOperational?: boolean;
  code?: string;
  errors?: Record<string, string>[];
}

export const errorHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const status = err.status || "error";

  // Log error in development
  if (process.env.NODE_ENV === "development") {
    console.error("❌ Error:", {
      message: err.message,
      stack: err.stack,
      statusCode,
    });
  }

  // Prisma unique constraint error
  if (err.code === "P2002") {
    res.status(409).json({
      status: "fail",
      message: "A record with this value already exists.",
    });
    return;
  }

  // Prisma record not found
  if (err.code === "P2025") {
    res.status(404).json({
      status: "fail",
      message: "Record not found.",
    });
    return;
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    res.status(401).json({
      status: "fail",
      message: "Invalid token. Please log in again.",
    });
    return;
  }

  if (err.name === "TokenExpiredError") {
    res.status(401).json({
      status: "fail",
      message: "Token expired. Please log in again.",
    });
    return;
  }

  // Default error response
  res.status(statusCode).json({
    status,
    message:
      process.env.NODE_ENV === "production"
        ? statusCode === 500
          ? "Something went wrong"
          : err.message
        : err.message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    ...(err.errors && { errors: err.errors }),
  });
};

