import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all contact messages
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("contactMessages")
      .withIndex("by_created")
      .order("desc")
      .collect();
  },
});

// Get recent messages (for dashboard)
export const getRecent = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("contactMessages")
      .withIndex("by_created")
      .order("desc")
      .take(10);
  },
});

// Get messages by status
export const getByStatus = query({
  args: { status: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("contactMessages")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .collect();
  },
});

// Get single message
export const getById = query({
  args: { messageId: v.id("contactMessages") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.messageId);
  },
});

// Submit a new contact message (used by IE Tire website)
export const submit = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    company: v.optional(v.string()),
    subject: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("contactMessages", {
      ...args,
      status: "new",
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update message status
export const updateStatus = mutation({
  args: {
    messageId: v.id("contactMessages"),
    status: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = {
      status: args.status,
      updatedAt: Date.now(),
    };
    if (args.notes !== undefined) {
      updates.notes = args.notes;
    }
    await ctx.db.patch(args.messageId, updates);
  },
});

// Mark as replied
export const markReplied = mutation({
  args: {
    messageId: v.id("contactMessages"),
    repliedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      status: "replied",
      repliedAt: Date.now(),
      repliedBy: args.repliedBy,
      updatedAt: Date.now(),
    });
  },
});

// Delete message
export const remove = mutation({
  args: { messageId: v.id("contactMessages") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.messageId);
  },
});

// Get stats
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const messages = await ctx.db.query("contactMessages").collect();
    return {
      total: messages.length,
      new: messages.filter((m) => m.status === "new").length,
      read: messages.filter((m) => m.status === "read").length,
      replied: messages.filter((m) => m.status === "replied").length,
      archived: messages.filter((m) => m.status === "archived").length,
    };
  },
});
