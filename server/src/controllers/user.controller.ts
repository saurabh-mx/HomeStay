import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { catchAsync, AppError } from "../utils/appError";
import { UpdateProfileInput } from "../validators/auth.validator";

/**
 * GET /api/users/profile/me
 * Get current user's full profile
 */
export const getProfile = catchAsync(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatar: true,
      bio: true,
      role: true,
      emailVerified: true,
      superhost: true,
      hostSince: true,
      createdAt: true,
      _count: {
        select: {
          properties: true,
          bookingsAsGuest: true,
          reviewsWritten: true,
        },
      },
    },
  });

  res.status(200).json({
    status: "success",
    data: { user },
  });
});

/**
 * PATCH /api/users/profile/me
 * Update current user's profile
 */
export const updateProfile = catchAsync(async (req: Request, res: Response) => {
  const updates = req.body as UpdateProfileInput;

  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: updates,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatar: true,
      bio: true,
      role: true,
      updatedAt: true,
    },
  });

  res.status(200).json({
    status: "success",
    message: "Profile updated successfully",
    data: { user },
  });
});

/**
 * GET /api/users/:id
 * Get a user's public profile
 */
export const getUserById = catchAsync(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      name: true,
      avatar: true,
      bio: true,
      role: true,
      superhost: true,
      hostSince: true,
      createdAt: true,
      _count: {
        select: {
          properties: true,
          reviewsReceived: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  res.status(200).json({
    status: "success",
    data: { user },
  });
});

/**
 * DELETE /api/users/profile/me
 * Delete current user's account
 */
export const deleteAccount = catchAsync(async (req: Request, res: Response) => {
  // Check for active bookings
  const activeBookings = await prisma.booking.count({
    where: {
      OR: [
        { guestId: req.user!.id },
        { hostId: req.user!.id },
      ],
      status: { in: ["PENDING", "CONFIRMED", "ACTIVE"] },
    },
  });

  if (activeBookings > 0) {
    throw new AppError(
      "Cannot delete account with active bookings. Please cancel or complete all bookings first.",
      400
    );
  }

  await prisma.user.delete({ where: { id: req.user!.id } });

  res.clearCookie("token");
  res.status(200).json({
    status: "success",
    message: "Account deleted successfully",
  });
});
