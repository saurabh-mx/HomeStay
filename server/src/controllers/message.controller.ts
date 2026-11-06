import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { catchAsync, AppError } from "../utils/appError";

/**
 * GET /api/messages/conversations
 * Get all conversations for current user
 */
export const getConversations = catchAsync(async (req: Request, res: Response) => {
  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [
        { guestId: req.user!.id },
        { hostId: req.user!.id },
      ],
      archived: false,
    },
    orderBy: { lastMessageAt: "desc" },
    include: {
      guest: {
        select: { id: true, name: true, avatar: true },
      },
      host: {
        select: { id: true, name: true, avatar: true },
      },
      booking: {
        select: { id: true, status: true, checkIn: true, checkOut: true },
      },
      messages: {
        take: 1,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          content: true,
          senderId: true,
          read: true,
          createdAt: true,
        },
      },
    },
  });

  // Count unread messages per conversation
  const conversationsWithUnread = await Promise.all(
    conversations.map(async (conv: typeof conversations[number]) => {
      const unreadCount = await prisma.message.count({
        where: {
          conversationId: conv.id,
          senderId: { not: req.user!.id },
          read: false,
        },
      });
      return { ...conv, unreadCount };
    })
  );

  res.status(200).json({
    status: "success",
    data: { conversations: conversationsWithUnread },
  });
});

/**
 * GET /api/messages/conversations/:conversationId
 * Get messages in a conversation
 */
export const getMessages = catchAsync(async (req: Request, res: Response) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: req.params.conversationId },
    select: { guestId: true, hostId: true },
  });

  if (!conversation) {
    throw new AppError("Conversation not found", 404);
  }
  if (
    conversation.guestId !== req.user!.id &&
    conversation.hostId !== req.user!.id
  ) {
    throw new AppError("Not authorized to view this conversation", 403);
  }

  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 50;
  const skip = (page - 1) * limit;

  const [messages, total] = await Promise.all([
    prisma.message.findMany({
      where: { conversationId: req.params.conversationId },
      skip,
      take: limit,
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        content: true,
        read: true,
        readAt: true,
        createdAt: true,
        sender: {
          select: { id: true, name: true, avatar: true },
        },
      },
    }),
    prisma.message.count({
      where: { conversationId: req.params.conversationId },
    }),
  ]);

  // Mark unread messages as read
  await prisma.message.updateMany({
    where: {
      conversationId: req.params.conversationId,
      senderId: { not: req.user!.id },
      read: false,
    },
    data: {
      read: true,
      readAt: new Date(),
    },
  });

  res.status(200).json({
    status: "success",
    data: {
      messages,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    },
  });
});

/**
 * POST /api/messages/conversations/:conversationId
 * Send a message in a conversation
 */
export const sendMessage = catchAsync(async (req: Request, res: Response) => {
  const { content } = req.body;

  if (!content || content.trim().length === 0) {
    throw new AppError("Message cannot be empty", 400);
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: req.params.conversationId },
    select: { guestId: true, hostId: true },
  });

  if (!conversation) {
    throw new AppError("Conversation not found", 404);
  }
  if (
    conversation.guestId !== req.user!.id &&
    conversation.hostId !== req.user!.id
  ) {
    throw new AppError("Not authorized to send messages here", 403);
  }

  const message = await prisma.message.create({
    data: {
      conversationId: req.params.conversationId,
      senderId: req.user!.id,
      content: content.trim(),
    },
    select: {
      id: true,
      content: true,
      read: true,
      createdAt: true,
      sender: {
        select: { id: true, name: true, avatar: true },
      },
    },
  });

  // Update conversation's lastMessageAt
  await prisma.conversation.update({
    where: { id: req.params.conversationId },
    data: { lastMessageAt: new Date() },
  });

  // TODO: Emit socket.io event for real-time messaging

  res.status(201).json({
    status: "success",
    data: { message },
  });
});
