import { z } from "zod";

export const createBookingSchema = z.object({
  listingId: z.string().uuid("Invalid listing ID"),
  checkIn: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid check-in date"),
  checkOut: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid check-out date"),
  guests: z.number().int().min(1, "At least 1 guest required"),
  message: z.string().max(500).optional(),
});

export const updateBookingStatusSchema = z.object({
  status: z.enum(["CONFIRMED", "CANCELLED", "DECLINED"]),
  reason: z.string().max(500).optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>;

