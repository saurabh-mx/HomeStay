import { Router } from "express";
import { protect } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { updateProfileSchema } from "../validators/auth.validator";
import {
  getProfile,
  updateProfile,
  getUserById,
  deleteAccount,
} from "../controllers/user.controller";

const router = Router();

// Public
router.get("/:id", getUserById);

// Protected
router.use(protect);
router.get("/profile/me", getProfile);
router.patch("/profile/me", validate(updateProfileSchema), updateProfile);
router.delete("/profile/me", deleteAccount);

export default router;
