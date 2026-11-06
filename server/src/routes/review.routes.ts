import { Router } from "express";
import { protect } from "../middleware/auth";
import {
  createReview,
  getListingReviews,
  getUserReviews,
  respondToReview,
} from "../controllers/review.controller";

const router = Router();

// Public
router.get("/listing/:listingId", getListingReviews);
router.get("/user/:userId", getUserReviews);

// Protected
router.use(protect);
router.post("/", createReview);
router.post("/:id/respond", respondToReview);

export default router;

