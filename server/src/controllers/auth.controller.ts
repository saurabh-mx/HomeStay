import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../utils/prisma";
import { catchAsync, AppError } from "../utils/appError";
import { RegisterInput, LoginInput } from "../validators/auth.validator";

/**
 * Generate JWT access token
 */
const generateAccessToken = (user: { id: string; email: string; role: string }) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || "fallback-secret",
    { expiresIn: 604800 } // 7 days in seconds
  );
};

/**
 * Generate JWT refresh token
 */
const generateRefreshToken = (userId: string) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET || "fallback-refresh-secret",
    { expiresIn: 2592000 } // 30 days in seconds
  );
};

/**
 * POST /api/auth/register
 * Register a new user
 */
export const register = catchAsync(async (req: Request, res: Response) => {
  const { name, email, password, phone, role } = req.body as RegisterInput;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new AppError("Email already registered", 409);
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12);

  // Create user
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      phone,
      role: role || "GUEST",
      hostSince: role === "HOST" ? new Date() : undefined,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatar: true,
      createdAt: true,
    },
  });

  // Generate tokens
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user.id);

  // Store refresh token
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken },
  });

  // Set cookie
  res.cookie("token", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.status(201).json({
    status: "success",
    message: "Registration successful",
    data: {
      user,
      accessToken,
      refreshToken,
    },
  });
});

/**
 * POST /api/auth/login
 * Login user
 */
export const login = catchAsync(async (req: Request, res: Response) => {
  const { email, password } = req.body as LoginInput;

  // Find user with password
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatar: true,
      passwordHash: true,
    },
  });

  if (!user || !user.passwordHash) {
    throw new AppError("Invalid email or password", 401);
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new AppError("Invalid email or password", 401);
  }

  // Generate tokens
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user.id);

  // Store refresh token
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken },
  });

  // Set cookie
  res.cookie("token", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  // Remove passwordHash from response
  const { passwordHash: _, ...userWithoutPassword } = user;

  res.status(200).json({
    status: "success",
    message: "Login successful",
    data: {
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    },
  });
});

/**
 * POST /api/auth/logout
 * Logout user
 */
export const logout = catchAsync(async (req: Request, res: Response) => {
  // Clear refresh token
  if (req.user) {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { refreshToken: null },
    });
  }

  // Clear cookie
  res.clearCookie("token");

  res.status(200).json({
    status: "success",
    message: "Logged out successfully",
  });
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
export const getMe = catchAsync(async (req: Request, res: Response) => {
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
      phoneVerified: true,
      identityVerification: true,
      superhost: true,
      hostSince: true,
      createdAt: true,
    },
  });

  res.status(200).json({
    status: "success",
    data: { user },
  });
});

/**
 * POST /api/auth/refresh-token
 * Refresh access token
 */
export const refreshToken = catchAsync(async (req: Request, res: Response) => {
  const { refreshToken: token } = req.body;

  if (!token) {
    throw new AppError("Refresh token is required", 400);
  }

  // Verify refresh token
  const decoded = jwt.verify(
    token,
    process.env.JWT_REFRESH_SECRET || "fallback-refresh-secret"
  ) as { id: string };

  // Find user and check stored refresh token
  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    select: { id: true, email: true, role: true, refreshToken: true },
  });

  if (!user || user.refreshToken !== token) {
    throw new AppError("Invalid refresh token", 401);
  }

  // Generate new tokens
  const newAccessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken(user.id);

  // Update stored refresh token
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: newRefreshToken },
  });

  // Set cookie
  res.cookie("token", newAccessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.status(200).json({
    status: "success",
    data: {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    },
  });
});
