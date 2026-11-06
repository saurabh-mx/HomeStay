import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import compression from "compression";
import dotenv from "dotenv";
import { createServer } from "http";

import { errorHandler } from "./middleware/errorHandler";
import { notFound } from "./middleware/notFound";

// Route imports
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import listingRoutes from "./routes/listing.routes";
import bookingRoutes from "./routes/booking.routes";
import reviewRoutes from "./routes/review.routes";
import messageRoutes from "./routes/message.routes";

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);

// Enable strong ETags for 304 conditional request optimization (0-byte payload egress)
app.set("etag", "strong");

// ===========================================
// Global Middleware
// ===========================================

// Compression for optimal Egress and Fast Origin Transfer reduction
app.use(
  compression({
    level: 6,
    threshold: 1024, // Only compress responses above 1KB
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) return false;
      return compression.filter(req, res);
    },
  })
);

// Security headers
app.use(helmet());

// CORS
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});
app.use("/api", limiter);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Cookie parsing
app.use(cookieParser());

// Logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// ===========================================
// Health Check
// ===========================================
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    message: "HomeStay API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// ===========================================
// API Routes
// ===========================================
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/messages", messageRoutes);

// ===========================================
// Error Handling
// ===========================================
app.use(notFound);
app.use(errorHandler);

// ===========================================
// Start Server (Standalone / Local / Container)
// ===========================================
const PORT = process.env.PORT || 5000;

if (process.env.VERCEL !== "1") {
  httpServer.listen(PORT, () => {
    console.log(`
  🏠 HomeStay API Server
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🚀 Running on:    http://localhost:${PORT}
  📦 Environment:   ${process.env.NODE_ENV || "development"}
  📋 API Health:    http://localhost:${PORT}/api/health
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);
  });
}

export { app, httpServer };
export default app;

