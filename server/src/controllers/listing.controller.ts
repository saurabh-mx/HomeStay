import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { catchAsync, AppError } from "../utils/appError";
import {
  CreateListingInput,
  UpdateListingInput,
  SearchListingsInput,
} from "../validators/listing.validator";

/**
 * POST /api/listings
 * Create a new property listing (Host only)
 */
export const createListing = catchAsync(async (req: Request, res: Response) => {
  const data = req.body as CreateListingInput;

  const property = await prisma.property.create({
    data: {
      hostId: req.user!.id,
      title: data.title,
      description: data.description,
      propertyType: data.propertyType as any,
      addressLine1: data.address,
      city: data.city,
      state: data.state,
      country: data.country,
      postalCode: data.zipCode,
      latitude: data.latitude,
      longitude: data.longitude,
      pricePerNight: data.pricePerNight,
      cleaningFee: data.cleaningFee || 0,
      maxGuests: data.maxGuests,
      bedrooms: data.bedrooms,
      beds: data.beds,
      bathrooms: data.bathrooms,
      amenities: data.amenities || [],
      houseRules: data.houseRules,
      checkInTime: data.checkInTime,
      checkOutTime: data.checkOutTime,
      cancellationPolicy: data.cancellationPolicy as any,
      instantBook: data.instantBook || false,
      status: "DRAFT",
    },
    include: {
      host: {
        select: { id: true, name: true, avatar: true },
      },
    },
  });

  res.status(201).json({
    status: "success",
    message: "Listing created successfully",
    data: { property },
  });
});

/**
 * GET /api/listings
 * Search and list properties with filters
 */
export const getListings = catchAsync(async (req: Request, res: Response) => {
  const filters = req.query as unknown as SearchListingsInput;
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const skip = (page - 1) * limit;

  // Build where clause
  const where: any = { status: "PUBLISHED" };

  if (filters.city) where.city = { contains: filters.city, mode: "insensitive" };
  if (filters.country) where.country = { contains: filters.country, mode: "insensitive" };
  if (filters.propertyType) where.propertyType = filters.propertyType;
  if (filters.guests) where.maxGuests = { gte: filters.guests };
  if (filters.minPrice || filters.maxPrice) {
    where.pricePerNight = {};
    if (filters.minPrice) where.pricePerNight.gte = filters.minPrice;
    if (filters.maxPrice) where.pricePerNight.lte = filters.maxPrice;
  }
  if (filters.amenities) {
    const amenityList = filters.amenities.split(",");
    where.amenities = { hasEvery: amenityList };
  }

  // Build orderBy
  let orderBy: any = { createdAt: "desc" };
  switch (filters.sortBy) {
    case "price_asc":
      orderBy = { pricePerNight: "asc" };
      break;
    case "price_desc":
      orderBy = { pricePerNight: "desc" };
      break;
    case "rating":
      orderBy = { averageRating: "desc" };
      break;
    case "newest":
    default:
      orderBy = { createdAt: "desc" };
  }

  const [properties, total] = await Promise.all([
    prisma.property.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        title: true,
        propertyType: true,
        city: true,
        country: true,
        pricePerNight: true,
        currency: true,
        maxGuests: true,
        bedrooms: true,
        beds: true,
        bathrooms: true,
        photos: true,
        averageRating: true,
        totalReviews: true,
        instantBook: true,
        latitude: true,
        longitude: true,
        host: {
          select: { id: true, name: true, avatar: true, superhost: true },
        },
      },
    }),
    prisma.property.count({ where }),
  ]);

  // Vercel Edge Cache: Cache for 60s at CDN edge, allow background stale-while-revalidate for 300s
  // Eliminates Fast Origin Transfer (FOT) and database compute for repeated requests
  res.setHeader(
    "Cache-Control",
    "public, s-maxage=60, stale-while-revalidate=300"
  );

  res.status(200).json({
    status: "success",
    data: {
      properties,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
});

/**
 * GET /api/listings/:id
 * Get a single listing by ID
 */
export const getListingById = catchAsync(async (req: Request, res: Response) => {
  const property = await prisma.property.findUnique({
    where: { id: req.params.id },
    include: {
      host: {
        select: {
          id: true,
          name: true,
          avatar: true,
          bio: true,
          superhost: true,
          hostSince: true,
          _count: { select: { properties: true, reviewsReceived: true } },
        },
      },
      reviews: {
        take: 10,
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
          createdAt: true,
          reviewer: {
            select: { id: true, name: true, avatar: true },
          },
        },
      },
    },
  });

  if (!property) {
    throw new AppError("Listing not found", 404);
  }

  // Cache property detail at Vercel edge for 120s with 10m SWR
  res.setHeader(
    "Cache-Control",
    "public, s-maxage=120, stale-while-revalidate=600"
  );

  res.status(200).json({
    status: "success",
    data: { property },
  });
});

/**
 * PATCH /api/listings/:id
 * Update a listing (Host only, must own the listing)
 */
export const updateListing = catchAsync(async (req: Request, res: Response) => {
  const updates = req.body as UpdateListingInput;

  // Check ownership
  const existing = await prisma.property.findUnique({
    where: { id: req.params.id },
    select: { hostId: true },
  });

  if (!existing) {
    throw new AppError("Listing not found", 404);
  }
  if (existing.hostId !== req.user!.id && req.user!.role !== "ADMIN") {
    throw new AppError("Not authorized to update this listing", 403);
  }

  const property = await prisma.property.update({
    where: { id: req.params.id },
    data: updates as any,
  });

  res.status(200).json({
    status: "success",
    message: "Listing updated successfully",
    data: { property },
  });
});

/**
 * DELETE /api/listings/:id
 * Delete a listing (Host only, must own the listing)
 */
export const deleteListing = catchAsync(async (req: Request, res: Response) => {
  const existing = await prisma.property.findUnique({
    where: { id: req.params.id },
    select: { hostId: true },
  });

  if (!existing) {
    throw new AppError("Listing not found", 404);
  }
  if (existing.hostId !== req.user!.id && req.user!.role !== "ADMIN") {
    throw new AppError("Not authorized to delete this listing", 403);
  }

  // Check for active bookings
  const activeBookings = await prisma.booking.count({
    where: {
      propertyId: req.params.id,
      status: { in: ["PENDING", "CONFIRMED", "ACTIVE"] },
    },
  });

  if (activeBookings > 0) {
    throw new AppError("Cannot delete listing with active bookings", 400);
  }

  await prisma.property.delete({ where: { id: req.params.id } });

  res.status(200).json({
    status: "success",
    message: "Listing deleted successfully",
  });
});

/**
 * GET /api/listings/me/listings
 * Get current host's listings
 */
export const getMyListings = catchAsync(async (req: Request, res: Response) => {
  const properties = await prisma.property.findMany({
    where: { hostId: req.user!.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      propertyType: true,
      city: true,
      country: true,
      pricePerNight: true,
      status: true,
      photos: true,
      averageRating: true,
      totalReviews: true,
      instantBook: true,
      createdAt: true,
      _count: { select: { bookings: true } },
    },
  });

  res.status(200).json({
    status: "success",
    data: { properties },
  });
});

