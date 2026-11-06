import { z } from "zod";

export const createListingSchema = z.object({
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(100, "Title must be at most 100 characters"),
  description: z
    .string()
    .min(20, "Description must be at least 20 characters")
    .max(5000, "Description must be at most 5000 characters"),
  propertyType: z.enum([
    "APARTMENT",
    "HOUSE",
    "VILLA",
    "CABIN",
    "COTTAGE",
    "STUDIO",
    "HOTEL_ROOM",
    "UNIQUE",
  ]),
  // Location
  address: z.string().min(5),
  city: z.string().min(2),
  state: z.string().min(2),
  country: z.string().min(2),
  zipCode: z.string().optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  // Pricing
  pricePerNight: z.number().positive("Price must be positive"),
  cleaningFee: z.number().min(0).default(0),
  // Details
  maxGuests: z.number().int().min(1).max(50),
  bedrooms: z.number().int().min(0).max(50),
  beds: z.number().int().min(1).max(50),
  bathrooms: z.number().min(0).max(50),
  // Features
  amenities: z.array(z.string()).default([]),
  houseRules: z.string().max(2000).optional(),
  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional(),
  cancellationPolicy: z.enum(["FLEXIBLE", "MODERATE", "STRICT"]).default("FLEXIBLE"),
  instantBook: z.boolean().default(false),
});

export const updateListingSchema = createListingSchema.partial();

export const searchListingsSchema = z.object({
  city: z.string().optional(),
  country: z.string().optional(),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  guests: z.coerce.number().int().min(1).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  propertyType: z.string().optional(),
  amenities: z.string().optional(), // comma-separated
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  sortBy: z.enum(["price_asc", "price_desc", "rating", "newest"]).default("newest"),
});

export type CreateListingInput = z.infer<typeof createListingSchema>;
export type UpdateListingInput = z.infer<typeof updateListingSchema>;
export type SearchListingsInput = z.infer<typeof searchListingsSchema>;
