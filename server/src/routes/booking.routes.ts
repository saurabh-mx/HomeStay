import { Router } from "express";
import { protect } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  createBookingSchema,
  updateBookingStatusSchema,
} from "../validators/booking.validator";
import {
  createBooking,
  getMyBookings,
  getBookingById,
  updateBookingStatus,
  getHostBookings,
} from "../controllers/booking.controller";

const router = Router();

// All booking routes are protected
router.use(protect);

// Guest routes
router.post("/", validate(createBookingSchema), createBooking);
router.get("/my-bookings", getMyBookings);
router.get("/:id", getBookingById);

// Host routes
router.get("/host/requests", getHostBookings);
router.patch("/:id/status", validate(updateBookingStatusSchema), updateBookingStatus);

export default router;

