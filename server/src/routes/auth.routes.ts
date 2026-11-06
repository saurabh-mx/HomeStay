import { Router } from "express";
import { validate } from "../middleware/validate";
import { protect } from "../middleware/auth";
import {
  registerSchema,
  loginSchema,
} from "../validators/auth.validator";
import {
  register,
  login,
  logout,
  getMe,
  refreshToken,
} from "../controllers/auth.controller";

const router = Router();

// Public routes
router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/refresh-token", refreshToken);

// Protected routes
router.use(protect);
router.post("/logout", logout);
router.get("/me", getMe);

export default router;
