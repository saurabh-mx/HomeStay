import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { catchAsync, AppError } from "../utils/appError";
import { CreateBookingInput, UpdateBookingStatusInput } from "../validators/booking.validator";
import { Decimal } from "@prisma/client/runtime/library";

// Service fee rates
const GUEST_SERVICE_FEE_RATE = 0.12; // 12%
const HOST_SERVICE_FEE_RATE = 0.03;  // 3%

/**
 * POST /api/bookings
 * Create a new booking (Guest)
 */
export const createBooking = catchAsync(async (req: Request, res: Response) => {
  const data = req.body as CreateBookingInput;

  // Get the property
  const property = await prisma.property.findUnique({
    where: { id: data.listingId },
    select: {
      id: true,
      hostId: true,
      pricePerNight: true,
      cleaningFee: true,
      currency: true,
      maxGuests: true,
      status: true,
      instantBook: true,
      minimumStay: true,
      maximumStay: true,
    },
  });

  if (!property) {
    throw new AppError("Listing not found", 404);
  }
  if (property.status !== "PUBLISHED") {
    throw new AppError("This listing is not available for booking", 400);
  }
  if (property.hostId === req.user!.id) {
    throw new AppError("You cannot book your own property", 400);
  }
  if (data.guests > property.maxGuests) {
    throw new AppError(`Maximum ${property.maxGuests} guests allowed`, 400);
  }

  // Calculate nights
  const checkIn = new Date(data.checkIn);
  const checkOut = new Date(data.checkOut);
  const numberOfNights = Math.ceil(
    (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (numberOfNights < 1) {
    throw new AppError("Check-out must be after check-in", 400);
  }
  if (property.minimumStay && numberOfNights < property.minimumStay) {
    throw new AppError(`Minimum stay is ${property.minimumStay} nights`, 400);
  }
  if (property.maximumStay && numberOfNights > property.maximumStay) {
    throw new AppError(`Maximum stay is ${property.maximumStay} nights`, 400);
  }

  // Check availability (no overlapping confirmed bookings)
  const overlappingBookings = await prisma.booking.count({
    where: {
      propertyId: property.id,
      status: { in: ["PENDING", "CONFIRMED", "ACTIVE"] },
      checkIn: { lt: checkOut },
      checkOut: { gt: checkIn },
    },
  });

  if (overlappingBookings > 0) {
    throw new AppError("Property is not available for the selected dates", 400);
  }

  // Calculate pricing
  const pricePerNight = Number(property.pricePerNight);
  const nightsTotal = pricePerNight * numberOfNights;
  const cleaningFee = Number(property.cleaningFee);
  const subtotal = nightsTotal + cleaningFee;
  const guestServiceFee = Math.round(subtotal * GUEST_SERVICE_FEE_RATE * 100) / 100;
  const hostServiceFee = Math.round(subtotal * HOST_SERVICE_FEE_RATE * 100) / 100;
  const totalPrice = subtotal + guestServiceFee;
  const hostPayout = subtotal - hostServiceFee;

  // Create booking
  const booking = await prisma.booking.create({
    data: {
      propertyId: property.id,
      guestId: req.user!.id,
      hostId: property.hostId,
      checkIn,
      checkOut,
      numberOfGuests: data.guests,
      numberOfNights,
      pricePerNight,
      nightsTotal,
      cleaningFee,
      guestServiceFee,
      hostServiceFee,
      totalPrice,
      hostPayout,
      currency: property.currency,
      status: property.instantBook ? "CONFIRMED" : "PENDING",
      guestMessage: data.message,
    },
    include: {
      property: {
        select: { id: true, title: true, photos: true, city: true, country: true },
      },
      host: {
        select: { id: true, name: true, avatar: true },
      },
    },
  });

  res.status(201).json({
    status: "success",
    message: property.instantBook
      ? "Booking confirmed!"
      : "Booking request sent to host",
    data: { booking },
  });
});

/**
 * GET /api/bookings/my-bookings
 * Get current user's bookings as guest
 */
export const getMyBookings = catchAsync(async (req: Request, res: Response) => {
  const bookings = await prisma.booking.findMany({
    where: { guestId: req.user!.id },
    orderBy: { createdAt: "desc" },
    include: {
      property: {
        select: {
          id: true,
          title: true,
          photos: true,
          city: true,
          country: true,
          pricePerNight: true,
        },
      },
      host: {
        select: { id: true, name: true, avatar: true },
      },
    },
  });

  res.status(200).json({
    status: "success",
    data: { bookings },
  });
});

/**
 * GET /api/bookings/:id
 * Get a single booking
 */
export const getBookingById = catchAsync(async (req: Request, res: Response) => {
  const booking = await prisma.booking.findUnique({
    where: { id: req.params.id },
    include: {
      property: {
        select: {
          id: true,
          title: true,
          photos: true,
          city: true,
          country: true,
          addressLine1: true,
          checkInTime: true,
          checkOutTime: true,
          checkInInstructions: true,
          houseRules: true,
        },
      },
      guest: {
        select: { id: true, name: true, avatar: true, email: true, phone: true },
      },
      host: {
        select: { id: true, name: true, avatar: true, email: true, phone: true },
      },
      payments: true,
    },
  });

  if (!booking) {
    throw new AppError("Booking not found", 404);
  }

  // Only guest, host, or admin can view
  if (
    booking.guestId !== req.user!.id &&
    booking.hostId !== req.user!.id &&
    req.user!.role !== "ADMIN"
  ) {
    throw new AppError("Not authorized to view this booking", 403);
  }

  res.status(200).json({
    status: "success",
    data: { booking },
  });
});

/**
 * GET /api/bookings/host/requests
 * Get booking requests for host's properties
 */
export const getHostBookings = catchAsync(async (req: Request, res: Response) => {
  const bookings = await prisma.booking.findMany({
    where: { hostId: req.user!.id },
    orderBy: { createdAt: "desc" },
    include: {
      property: {
        select: { id: true, title: true, photos: true },
      },
      guest: {
        select: { id: true, name: true, avatar: true },
      },
    },
  });

  res.status(200).json({
    status: "success",
    data: { bookings },
  });
});

/**
 * PATCH /api/bookings/:id/status
 * Update booking status (Host accepts/declines, or cancellation)
 */
export const updateBookingStatus = catchAsync(async (req: Request, res: Response) => {
  const { status, reason } = req.body as UpdateBookingStatusInput;

  const booking = await prisma.booking.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      guestId: true,
      hostId: true,
      status: true,
    },
  });

  if (!booking) {
    throw new AppError("Booking not found", 404);
  }

  // Authorization checks
  const isHost = booking.hostId === req.user!.id;
  const isGuest = booking.guestId === req.user!.id;

  if (status === "CONFIRMED" && !isHost) {
    throw new AppError("Only the host can confirm bookings", 403);
  }
  if (status === "DECLINED" && !isHost) {
    throw new AppError("Only the host can decline bookings", 403);
  }
  if (status === "CANCELLED" && !isHost && !isGuest) {
    throw new AppError("Not authorized to cancel this booking", 403);
  }

  // Status transition validation
  if (status === "CONFIRMED" && booking.status !== "PENDING") {
    throw new AppError("Only pending bookings can be confirmed", 400);
  }
  if (status === "CANCELLED" && !["PENDING", "CONFIRMED"].includes(booking.status)) {
    throw new AppError("This booking cannot be cancelled", 400);
  }

  const updatedBooking = await prisma.booking.update({
    where: { id: req.params.id },
    data: {
      status: status as any,
      ...(status === "CANCELLED" && {
        cancelledAt: new Date(),
        cancelledBy: req.user!.id,
        cancellationReason: reason,
      }),
    },
  });

  res.status(200).json({
    status: "success",
    message: `Booking ${status.toLowerCase()} successfully`,
    data: { booking: updatedBooking },
  });
});
