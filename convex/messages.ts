import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";

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
    attachments: v.optional(v.array(v.object({
      storageId: v.id("_storage"),
      fileName: v.string(),
      fileType: v.string(),
      fileSize: v.number(),
    }))),
  },
  handler: async (ctx, args) => {
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: args.senderId,
      content: args.content,
      mentions: args.mentions,
      attachments: args.attachments,
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

// Generate upload URL for file attachments
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Get attachment download URL
export const getAttachmentUrl = action({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args): Promise<string | null> => {
    const url = await ctx.storage.getUrl(args.storageId);
    return url;
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

// Search for linkable items (projects, applications, personnel)
export const searchLinkableItems = query({
  args: { searchQuery: v.string() },
  handler: async (ctx, args) => {
    const query = args.searchQuery.toLowerCase();
    const results: Array<{
      type: "project" | "application" | "personnel";
      id: string;
      name: string;
      subtitle: string;
    }> = [];

    // Search projects
    const projects = await ctx.db.query("projects").collect();
    for (const project of projects) {
      if (project.name.toLowerCase().includes(query)) {
        results.push({
          type: "project",
          id: project._id,
          name: project.name,
          subtitle: `Project - ${project.status}`,
        });
      }
    }

    // Search applications
    const applications = await ctx.db.query("applications").collect();
    for (const app of applications) {
      const fullName = `${app.firstName} ${app.lastName}`.toLowerCase();
      if (fullName.includes(query) || app.email?.toLowerCase().includes(query)) {
        results.push({
          type: "application",
          id: app._id,
          name: `${app.firstName} ${app.lastName}`,
          subtitle: `Applicant - ${app.status}`,
        });
      }
    }

    // Search personnel
    const personnel = await ctx.db.query("personnel").collect();
    for (const person of personnel) {
      const fullName = `${person.firstName} ${person.lastName}`.toLowerCase();
      if (fullName.includes(query)) {
        results.push({
          type: "personnel",
          id: person._id,
          name: `${person.firstName} ${person.lastName}`,
          subtitle: `${person.position} - ${person.department}`,
        });
      }
    }

    // Return top 10 results
    return results.slice(0, 10);
  },
});

// ============ MESSAGE REACTIONS ============

// Add a reaction to a message
export const addReaction = mutation({
  args: {
    messageId: v.id("messages"),
    userId: v.id("users"),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    const reactions = message.reactions || [];

    // Check if user already reacted with this emoji
    const existingReaction = reactions.find(
      (r) => r.userId === args.userId && r.emoji === args.emoji
    );

    if (existingReaction) {
      // Already reacted with this emoji, no need to add again
      return;
    }

    // Add the new reaction
    reactions.push({
      emoji: args.emoji,
      userId: args.userId,
      createdAt: Date.now(),
    });

    await ctx.db.patch(args.messageId, {
      reactions,
    });
  },
});

// Remove a reaction from a message
export const removeReaction = mutation({
  args: {
    messageId: v.id("messages"),
    userId: v.id("users"),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    const reactions = message.reactions || [];

    // Remove the reaction
    const updatedReactions = reactions.filter(
      (r) => !(r.userId === args.userId && r.emoji === args.emoji)
    );

    await ctx.db.patch(args.messageId, {
      reactions: updatedReactions,
    });
  },
});

// Toggle a reaction (add if not present, remove if present)
export const toggleReaction = mutation({
  args: {
    messageId: v.id("messages"),
    userId: v.id("users"),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    const reactions = message.reactions || [];

    // Check if user already reacted with this emoji
    const existingIndex = reactions.findIndex(
      (r) => r.userId === args.userId && r.emoji === args.emoji
    );

    if (existingIndex >= 0) {
      // Remove the reaction
      reactions.splice(existingIndex, 1);
    } else {
      // Add the reaction
      reactions.push({
        emoji: args.emoji,
        userId: args.userId,
        createdAt: Date.now(),
      });
    }

    await ctx.db.patch(args.messageId, {
      reactions,
    });
  },
});
