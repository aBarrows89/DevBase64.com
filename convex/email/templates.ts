/**
 * Email Templates Management
 *
 * Save and reuse common email formats.
 */

import { v } from "convex/values";
import { query, mutation } from "../_generated/server";

// ============ QUERIES ============

/**
 * List templates for a user (including shared templates).
 */
export const list = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Get user's own templates
    const userTemplates = await ctx.db
      .query("emailTemplates")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Get shared templates
    const sharedTemplates = await ctx.db
      .query("emailTemplates")
      .withIndex("by_shared", (q) => q.eq("isShared", true))
      .filter((q) => q.neq(q.field("userId"), args.userId))
      .collect();

    return [...userTemplates, ...sharedTemplates].sort(
      (a, b) => b.usageCount - a.usageCount
    );
  },
});

/**
 * List templates by category.
 */
export const listByCategory = query({
  args: {
    userId: v.id("users"),
    category: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("emailTemplates")
      .withIndex("by_category", (q) =>
        q.eq("userId", args.userId).eq("category", args.category)
      )
      .collect();
  },
});

/**
 * Get a single template.
 */
export const get = query({
  args: { templateId: v.id("emailTemplates") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.templateId);
  },
});

/**
 * Get template categories for a user.
 */
export const getCategories = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const templates = await ctx.db
      .query("emailTemplates")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const categories = new Set<string>();
    templates.forEach((t) => {
      if (t.category) categories.add(t.category);
    });

    return Array.from(categories).sort();
  },
});

// ============ MUTATIONS ============

/**
 * Create a new template.
 */
export const create = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    subject: v.string(),
    bodyHtml: v.string(),
    bodyText: v.optional(v.string()),
    category: v.optional(v.string()),
    isShared: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("emailTemplates", {
      userId: args.userId,
      name: args.name,
      description: args.description,
      subject: args.subject,
      bodyHtml: args.bodyHtml,
      bodyText: args.bodyText,
      category: args.category,
      isShared: args.isShared || false,
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update a template.
 */
export const update = mutation({
  args: {
    templateId: v.id("emailTemplates"),
    userId: v.id("users"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    subject: v.optional(v.string()),
    bodyHtml: v.optional(v.string()),
    bodyText: v.optional(v.string()),
    category: v.optional(v.string()),
    isShared: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);
    if (!template || template.userId !== args.userId) {
      throw new Error("Template not found");
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.subject !== undefined) updates.subject = args.subject;
    if (args.bodyHtml !== undefined) updates.bodyHtml = args.bodyHtml;
    if (args.bodyText !== undefined) updates.bodyText = args.bodyText;
    if (args.category !== undefined) updates.category = args.category;
    if (args.isShared !== undefined) updates.isShared = args.isShared;

    await ctx.db.patch(args.templateId, updates);
  },
});

/**
 * Delete a template.
 */
export const remove = mutation({
  args: {
    templateId: v.id("emailTemplates"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);
    if (!template || template.userId !== args.userId) {
      throw new Error("Template not found");
    }

    await ctx.db.delete(args.templateId);
  },
});

/**
 * Increment usage count (called when template is used).
 */
export const incrementUsage = mutation({
  args: { templateId: v.id("emailTemplates") },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);
    if (!template) return;

    await ctx.db.patch(args.templateId, {
      usageCount: template.usageCount + 1,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Duplicate a template.
 */
export const duplicate = mutation({
  args: {
    templateId: v.id("emailTemplates"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    const now = Date.now();
    return await ctx.db.insert("emailTemplates", {
      userId: args.userId,
      name: `${template.name} (Copy)`,
      description: template.description,
      subject: template.subject,
      bodyHtml: template.bodyHtml,
      bodyText: template.bodyText,
      category: template.category,
      isShared: false,
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});
