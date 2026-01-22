import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all chats for a user
export const getByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const chats = await ctx.db
      .query("techWizardChats")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.neq(q.field("isArchived"), true))
      .collect();

    // Sort by updatedAt descending (most recent first)
    return chats.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

// Get a single chat by ID
export const getById = query({
  args: { chatId: v.id("techWizardChats") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.chatId);
  },
});

// Create a new chat
export const create = mutation({
  args: {
    userId: v.id("users"),
    userName: v.string(),
    title: v.optional(v.string()),
    initialMessage: v.optional(
      v.object({
        role: v.string(),
        content: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const messages = args.initialMessage
      ? [{ ...args.initialMessage, timestamp: now }]
      : [];

    // Generate title from first message or use default
    const title =
      args.title ||
      (args.initialMessage
        ? args.initialMessage.content.slice(0, 50) +
          (args.initialMessage.content.length > 50 ? "..." : "")
        : "New Chat");

    const chatId = await ctx.db.insert("techWizardChats", {
      title,
      userId: args.userId,
      userName: args.userName,
      messages,
      createdAt: now,
      updatedAt: now,
    });

    return chatId;
  },
});

// Add a message to a chat
export const addMessage = mutation({
  args: {
    chatId: v.id("techWizardChats"),
    message: v.object({
      role: v.string(),
      content: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const chat = await ctx.db.get(args.chatId);
    if (!chat) throw new Error("Chat not found");

    const now = Date.now();
    const newMessage = { ...args.message, timestamp: now };

    // Update title if this is the first user message and title is default
    let title = chat.title;
    if (
      chat.messages.length === 0 &&
      args.message.role === "user" &&
      chat.title === "New Chat"
    ) {
      title =
        args.message.content.slice(0, 50) +
        (args.message.content.length > 50 ? "..." : "");
    }

    await ctx.db.patch(args.chatId, {
      messages: [...chat.messages, newMessage],
      title,
      updatedAt: now,
    });
  },
});

// Update chat title
export const updateTitle = mutation({
  args: {
    chatId: v.id("techWizardChats"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.chatId, {
      title: args.title,
      updatedAt: Date.now(),
    });
  },
});

// Archive a chat (soft delete)
export const archive = mutation({
  args: { chatId: v.id("techWizardChats") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.chatId, {
      isArchived: true,
      updatedAt: Date.now(),
    });
  },
});

// Delete a chat permanently
export const remove = mutation({
  args: { chatId: v.id("techWizardChats") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.chatId);
  },
});
