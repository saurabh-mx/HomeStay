import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { catchAsync, AppError } from "../utils/appError";

/**
 * POST /api/reviews
 * Create a review after a completed booking
 */
export const createReview = catchAsync(async (req: Request, res: Response) => {
  const {
    bookingId,
    rating,
    cleanlinessRating,
    accuracyRating,
    checkinRating,
    communicationRating,
    locationRating,
    valueRating,
    comment,
  } = req.body;

  // Validate rating range
  if (rating < 1 || rating > 5) {
    throw new AppError("Rating must be between 1 and 5", 400);
  }

  // Get the booking
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      guestId: true,
      hostId: true,
      propertyId: true,
      status: true,
    },
  });

  if (!booking) {
    throw new AppError("Booking not found", 404);
  }
  if (booking.status !== "COMPLETED") {
    throw new AppError("Can only review completed bookings", 400);
  }

  // Determine reviewer and reviewee
  const isGuest = booking.guestId === req.user!.id;
  const isHost = booking.hostId === req.user!.id;

  if (!isGuest && !isHost) {
    throw new AppError("Not authorized to review this booking", 403);
  }

  const reviewerId = req.user!.id;
  const revieweeId = isGuest ? booking.hostId : booking.guestId;

  // Check if already reviewed
  const existingReview = await prisma.review.findFirst({
    where: {
      bookingId,
      reviewerId,
    },
  });

  if (existingReview) {
    throw new AppError("You have already reviewed this booking", 400);
  }

  const review = await prisma.review.create({
    data: {
      bookingId,
      propertyId: booking.propertyId,
      reviewerId,
      revieweeId,
      rating,
      cleanlinessRating: isGuest ? cleanlinessRating : undefined,
      accuracyRating: isGuest ? accuracyRating : undefined,
      checkinRating: isGuest ? checkinRating : undefined,
      communicationRating: isGuest ? communicationRating : undefined,
      locationRating: isGuest ? locationRating : undefined,
      valueRating: isGuest ? valueRating : undefined,
      comment,
    },
    include: {
      reviewer: {
        select: { id: true, name: true, avatar: true },
      },
    },
  });

  // Update property average rating if guest review
  if (isGuest) {
    const aggregation = await prisma.review.aggregate({
      where: { propertyId: booking.propertyId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await prisma.property.update({
      where: { id: booking.propertyId },
      data: {
        averageRating: aggregation._avg.rating,
        totalReviews: aggregation._count.rating,
      },
    });
  }

  res.status(201).json({
    status: "success",
    message: "Review submitted successfully",
    data: { review },
  });
});

/**
 * GET /api/reviews/listing/:listingId
 * Get reviews for a listing
 */
export const getListingReviews = catchAsync(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where: { propertyId: req.params.listingId },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        rating: true,
        cleanlinessRating: true,
        accuracyRating: true,
        checkinRating: true,
        communicationRating: true,
        locationRating: true,
        valueRating: true,
        comment: true,
        response: true,
        respondedAt: true,
        createdAt: true,
        reviewer: {
          select: { id: true, name: true, avatar: true },
        },
      },
    }),
    prisma.review.count({ where: { propertyId: req.params.listingId } }),
  ]);

  // Reviews are updated infrequently: cache at edge for 5 min, SWR for 30 min
  res.setHeader(
    "Cache-Control",
    "public, s-maxage=300, stale-while-revalidate=1800"
  );

  res.status(200).json({
    status: "success",
    data: {
      reviews,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    },
  });
});

/**
 * GET /api/reviews/user/:userId
 * Get reviews for a user
 */
export const getUserReviews = catchAsync(async (req: Request, res: Response) => {
  const reviews = await prisma.review.findMany({
    where: { revieweeId: req.params.userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      rating: true,
      comment: true,
      response: true,
      createdAt: true,
      reviewer: {
        select: { id: true, name: true, avatar: true },
      },
    },
  });

  res.status(200).json({
    status: "success",
    data: { reviews },
  });
});

/**
 * POST /api/reviews/:id/respond
 * Respond to a review (Host)
 */
export const respondToReview = catchAsync(async (req: Request, res: Response) => {
  const { response } = req.body;

  if (!response || response.trim().length === 0) {
    throw new AppError("Response cannot be empty", 400);
  }

  const review = await prisma.review.findUnique({
    where: { id: req.params.id },
    select: { id: true, revieweeId: true, response: true },
  });

  if (!review) {
    throw new AppError("Review not found", 404);
  }
  if (review.revieweeId !== req.user!.id) {
    throw new AppError("Only the reviewed user can respond", 403);
  }
  if (review.response) {
    throw new AppError("Already responded to this review", 400);
  }

  const updatedReview = await prisma.review.update({
    where: { id: req.params.id },
    data: {
      response,
      respondedAt: new Date(),
    },
  });

  res.status(200).json({
    status: "success",
    message: "Response submitted successfully",
    data: { review: updatedReview },
  });
});

