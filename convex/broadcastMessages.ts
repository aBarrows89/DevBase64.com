import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all active broadcast messages for a user (filters by role and dismissals)
export const getActiveForUser = query({
  args: {
    userId: v.id("users"),
    userRole: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get all active messages
    const messages = await ctx.db
      .query("broadcastMessages")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Filter messages
    return messages.filter((msg) => {
      // Check if user has dismissed this message
      if (msg.dismissedBy.includes(args.userId)) {
        return false;
      }

      // Check start time
      if (msg.startsAt && msg.startsAt > now) {
        return false;
      }

      // Check expiration
      if (msg.expiresAt && msg.expiresAt < now) {
        return false;
      }

      // Check target roles
      if (msg.targetRoles && msg.targetRoles.length > 0) {
        if (!msg.targetRoles.includes(args.userRole)) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      // Sort by priority first (high first), then by creation date (newest first)
      if (a.priority === "high" && b.priority !== "high") return -1;
      if (b.priority === "high" && a.priority !== "high") return 1;
      return b.createdAt - a.createdAt;
    });
  },
});

// Get all broadcast messages (for admin management)
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("broadcastMessages")
      .withIndex("by_created")
      .order("desc")
      .collect();
  },
});

// Get a single broadcast message
export const getById = query({
  args: { messageId: v.id("broadcastMessages") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.messageId);
  },
});

// Create a new broadcast message
export const create = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    type: v.string(), // "info" | "warning" | "success" | "update"
    priority: v.string(), // "normal" | "high"
    startsAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    targetRoles: v.optional(v.array(v.string())),
    createdBy: v.id("users"),
    createdByName: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    return await ctx.db.insert("broadcastMessages", {
      title: args.title,
      content: args.content,
      type: args.type,
      priority: args.priority,
      isActive: true,
      startsAt: args.startsAt,
      expiresAt: args.expiresAt,
      targetRoles: args.targetRoles,
      dismissedBy: [],
      createdBy: args.createdBy,
      createdByName: args.createdByName,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update a broadcast message
export const update = mutation({
  args: {
    messageId: v.id("broadcastMessages"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    type: v.optional(v.string()),
    priority: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    startsAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    targetRoles: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { messageId, ...updates } = args;

    // Filter out undefined values
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );

    await ctx.db.patch(messageId, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });
  },
});

// Dismiss a broadcast message for a user
export const dismiss = mutation({
  args: {
    messageId: v.id("broadcastMessages"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    // Add user to dismissedBy array if not already there
    if (!message.dismissedBy.includes(args.userId)) {
      await ctx.db.patch(args.messageId, {
        dismissedBy: [...message.dismissedBy, args.userId],
      });
    }
  },
});

// Deactivate a broadcast message (keeps it in history)
export const deactivate = mutation({
  args: { messageId: v.id("broadcastMessages") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      isActive: false,
      updatedAt: Date.now(),
    });
  },
});

// Reactivate a broadcast message
export const reactivate = mutation({
  args: { messageId: v.id("broadcastMessages") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      isActive: true,
      dismissedBy: [], // Clear dismissals when reactivating
      updatedAt: Date.now(),
    });
  },
});

// Delete a broadcast message permanently
export const remove = mutation({
  args: { messageId: v.id("broadcastMessages") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.messageId);
  },
});
