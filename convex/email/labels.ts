/**
 * Email Labels Management
 *
 * Custom labels/tags for organizing emails.
 */

import { v } from "convex/values";
import { query, mutation } from "../_generated/server";

// Default label colors
const LABEL_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308",
  "#84cc16", "#22c55e", "#10b981", "#14b8a6",
  "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1",
  "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
];

// ============ QUERIES ============

/**
 * List all labels for a user.
 */
export const list = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const labels = await ctx.db
      .query("emailLabels")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return labels.sort((a, b) => (a.sortOrder || 999) - (b.sortOrder || 999));
  },
});

/**
 * Get labels assigned to an email.
 */
export const getForEmail = query({
  args: { emailId: v.id("emails") },
  handler: async (ctx, args) => {
    const assignments = await ctx.db
      .query("emailLabelAssignments")
      .withIndex("by_email", (q) => q.eq("emailId", args.emailId))
      .collect();

    const labels = await Promise.all(
      assignments.map((a) => ctx.db.get(a.labelId))
    );

    return labels.filter(Boolean);
  },
});

/**
 * Get emails with a specific label.
 */
export const getEmailsByLabel = query({
  args: {
    labelId: v.id("emailLabels"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const assignments = await ctx.db
      .query("emailLabelAssignments")
      .withIndex("by_label", (q) => q.eq("labelId", args.labelId))
      .take(args.limit || 50);

    const emails = await Promise.all(
      assignments.map((a) => ctx.db.get(a.emailId))
    );

    return emails.filter(Boolean).sort((a, b) => b!.date - a!.date);
  },
});

// ============ MUTATIONS ============

/**
 * Create a new label.
 */
export const create = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    color: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check for duplicate name
    const existing = await ctx.db
      .query("emailLabels")
      .withIndex("by_user_name", (q) =>
        q.eq("userId", args.userId).eq("name", args.name)
      )
      .first();

    if (existing) {
      throw new Error(`Label "${args.name}" already exists`);
    }

    // Get count for sort order
    const labels = await ctx.db
      .query("emailLabels")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const now = Date.now();
    return await ctx.db.insert("emailLabels", {
      userId: args.userId,
      name: args.name,
      color: args.color || LABEL_COLORS[labels.length % LABEL_COLORS.length],
      description: args.description,
      sortOrder: labels.length,
      isSystem: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update a label.
 */
export const update = mutation({
  args: {
    labelId: v.id("emailLabels"),
    userId: v.id("users"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
    description: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const label = await ctx.db.get(args.labelId);
    if (!label || label.userId !== args.userId) {
      throw new Error("Label not found");
    }

    if (label.isSystem) {
      throw new Error("Cannot modify system labels");
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.color !== undefined) updates.color = args.color;
    if (args.description !== undefined) updates.description = args.description;
    if (args.sortOrder !== undefined) updates.sortOrder = args.sortOrder;

    await ctx.db.patch(args.labelId, updates);
  },
});

/**
 * Delete a label.
 */
export const remove = mutation({
  args: {
    labelId: v.id("emailLabels"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const label = await ctx.db.get(args.labelId);
    if (!label || label.userId !== args.userId) {
      throw new Error("Label not found");
    }

    if (label.isSystem) {
      throw new Error("Cannot delete system labels");
    }

    // Remove all assignments
    const assignments = await ctx.db
      .query("emailLabelAssignments")
      .withIndex("by_label", (q) => q.eq("labelId", args.labelId))
      .collect();

    for (const assignment of assignments) {
      await ctx.db.delete(assignment._id);
    }

    await ctx.db.delete(args.labelId);
  },
});

/**
 * Assign a label to an email.
 */
export const assignToEmail = mutation({
  args: {
    emailId: v.id("emails"),
    labelId: v.id("emailLabels"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Check if already assigned
    const existing = await ctx.db
      .query("emailLabelAssignments")
      .withIndex("by_email", (q) => q.eq("emailId", args.emailId))
      .filter((q) => q.eq(q.field("labelId"), args.labelId))
      .first();

    if (existing) return existing._id;

    return await ctx.db.insert("emailLabelAssignments", {
      emailId: args.emailId,
      labelId: args.labelId,
      assignedBy: args.userId,
      assignedAt: Date.now(),
    });
  },
});

/**
 * Remove a label from an email.
 */
export const removeFromEmail = mutation({
  args: {
    emailId: v.id("emails"),
    labelId: v.id("emailLabels"),
  },
  handler: async (ctx, args) => {
    const assignment = await ctx.db
      .query("emailLabelAssignments")
      .withIndex("by_email", (q) => q.eq("emailId", args.emailId))
      .filter((q) => q.eq(q.field("labelId"), args.labelId))
      .first();

    if (assignment) {
      await ctx.db.delete(assignment._id);
    }
  },
});

/**
 * Bulk assign label to multiple emails.
 */
export const bulkAssign = mutation({
  args: {
    emailIds: v.array(v.id("emails")),
    labelId: v.id("emailLabels"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let assigned = 0;

    for (const emailId of args.emailIds) {
      const existing = await ctx.db
        .query("emailLabelAssignments")
        .withIndex("by_email", (q) => q.eq("emailId", emailId))
        .filter((q) => q.eq(q.field("labelId"), args.labelId))
        .first();

      if (!existing) {
        await ctx.db.insert("emailLabelAssignments", {
          emailId,
          labelId: args.labelId,
          assignedBy: args.userId,
          assignedAt: now,
        });
        assigned++;
      }
    }

    return { assigned };
  },
});
