import { Router } from "express";
import { protect, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  createListingSchema,
  updateListingSchema,
  searchListingsSchema,
} from "../validators/listing.validator";
import {
  createListing,
  getListings,
  getListingById,
  updateListing,
  deleteListing,
  getMyListings,
} from "../controllers/listing.controller";

const router = Router();

// Public routes
router.get("/", validate(searchListingsSchema, "query"), getListings);
router.get("/:id", getListingById);

// Protected routes — Host only
router.use(protect);
router.post("/", authorize("HOST", "ADMIN"), validate(createListingSchema), createListing);
router.get("/me/listings", authorize("HOST", "ADMIN"), getMyListings);
router.patch("/:id", authorize("HOST", "ADMIN"), validate(updateListingSchema), updateListing);
router.delete("/:id", authorize("HOST", "ADMIN"), deleteListing);

export default router;
