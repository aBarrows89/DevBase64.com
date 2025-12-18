import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Get all conversations for a user
export const getConversations = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_last_message")
      .order("desc")
      .collect();

    // Filter to only conversations where user is a participant
    const userConversations = conversations.filter((conv) =>
      conv.participants.includes(args.userId)
    );

    // Enrich with participant info and last message
    const enriched = await Promise.all(
      userConversations.map(async (conv) => {
        const participants = await Promise.all(
          conv.participants.map((id) => ctx.db.get(id))
        );

        const lastMessage = await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) =>
            q.eq("conversationId", conv._id)
          )
          .order("desc")
          .first();

        // Get project info if it's a project conversation
        const project = conv.projectId
          ? await ctx.db.get(conv.projectId)
          : null;

        // Count unread messages for this user
        const messages = await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) =>
            q.eq("conversationId", conv._id)
          )
          .collect();
        const unreadCount = messages.filter(
          (m) => !m.readBy.includes(args.userId) && m.senderId !== args.userId
        ).length;

        return {
          ...conv,
          participants: participants.filter(Boolean),
          lastMessage,
          project,
          unreadCount,
        };
      })
    );

    return enriched;
  },
});

// Get messages for a conversation
export const getMessages = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .order("asc")
      .collect();

    // Enrich with sender info
    const enriched = await Promise.all(
      messages.map(async (msg) => {
        const sender = await ctx.db.get(msg.senderId);
        return {
          ...msg,
          sender,
        };
      })
    );

    return enriched;
  },
});

// Create a new conversation
export const createConversation = mutation({
  args: {
    type: v.string(),
    participants: v.array(v.id("users")),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    // Check if a direct conversation already exists between these users
    if (args.type === "direct" && args.participants.length === 2) {
      const existingConversations = await ctx.db
        .query("conversations")
        .collect();

      const existing = existingConversations.find(
        (conv) =>
          conv.type === "direct" &&
          conv.participants.length === 2 &&
          conv.participants.includes(args.participants[0]) &&
          conv.participants.includes(args.participants[1])
      );

      if (existing) {
        return existing._id;
      }
    }

    const conversationId = await ctx.db.insert("conversations", {
      type: args.type,
      participants: args.participants,
      projectId: args.projectId,
      lastMessageAt: Date.now(),
      createdAt: Date.now(),
    });

    return conversationId;
  },
});

// Send a message
export const sendMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    content: v.string(),
    mentions: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: args.senderId,
      content: args.content,
      mentions: args.mentions,
      readBy: [args.senderId], // Sender has read their own message
      createdAt: Date.now(),
    });

    // Update conversation's lastMessageAt
    await ctx.db.patch(args.conversationId, {
      lastMessageAt: Date.now(),
    });

    return messageId;
  },
});

// Mark messages as read
export const markAsRead = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    for (const message of messages) {
      if (!message.readBy.includes(args.userId)) {
        await ctx.db.patch(message._id, {
          readBy: [...message.readBy, args.userId],
        });
      }
    }
  },
});

// Get unread count for a user
export const getUnreadCount = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const conversations = await ctx.db.query("conversations").collect();

    const userConversations = conversations.filter((conv) =>
      conv.participants.includes(args.userId)
    );

    let totalUnread = 0;
    for (const conv of userConversations) {
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", conv._id)
        )
        .collect();

      const unread = messages.filter(
        (m) => !m.readBy.includes(args.userId) && m.senderId !== args.userId
      ).length;
      totalUnread += unread;
    }

    return totalUnread;
  },
});

// Get all users (for starting new conversations)
export const getAllUsers = query({
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.filter((u) => u.isActive);
  },
});
