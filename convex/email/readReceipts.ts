/**
 * Email Read Receipts
 *
 * Track when sent emails are opened.
 */

import { v } from "convex/values";
import { query, mutation, internalMutation } from "../_generated/server";

// Generate unique tracking ID
function generateTrackingId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ============ QUERIES ============

/**
 * Get read receipt for a specific email.
 */
export const getByEmail = query({
  args: { emailId: v.id("emails") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("emailReadReceipts")
      .withIndex("by_email", (q) => q.eq("emailId", args.emailId))
      .first();
  },
});

/**
 * Get receipt by tracking ID (for pixel tracking).
 */
export const getByTrackingId = query({
  args: { trackingId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("emailReadReceipts")
      .withIndex("by_tracking_id", (q) => q.eq("trackingId", args.trackingId))
      .first();
  },
});

/**
 * Get read receipts for a recipient email.
 */
export const listByRecipient = query({
  args: {
    recipientEmail: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("emailReadReceipts")
      .withIndex("by_recipient", (q) => q.eq("recipientEmail", args.recipientEmail))
      .take(args.limit || 50);
  },
});

// ============ MUTATIONS ============

/**
 * Create a tracking receipt for an outgoing email.
 */
export const create = mutation({
  args: {
    emailId: v.id("emails"),
    recipientEmail: v.string(),
    sendQueueId: v.optional(v.id("emailSendQueue")),
  },
  handler: async (ctx, args) => {
    // Check if already exists
    const existing = await ctx.db
      .query("emailReadReceipts")
      .withIndex("by_email", (q) => q.eq("emailId", args.emailId))
      .first();

    if (existing) return existing._id;

    const trackingId = generateTrackingId();

    return await ctx.db.insert("emailReadReceipts", {
      emailId: args.emailId,
      recipientEmail: args.recipientEmail,
      sendQueueId: args.sendQueueId,
      trackingId,
      openCount: 0,
      createdAt: Date.now(),
    });
  },
});

/**
 * Record a read event (called when tracking pixel is loaded).
 */
export const recordRead = mutation({
  args: {
    trackingId: v.string(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const receipt = await ctx.db
      .query("emailReadReceipts")
      .withIndex("by_tracking_id", (q) => q.eq("trackingId", args.trackingId))
      .first();

    if (!receipt) return null;

    const now = Date.now();
    const updates: Record<string, unknown> = {
      lastOpenedAt: now,
      openCount: receipt.openCount + 1,
    };

    // Only set openedAt on first open
    if (!receipt.openedAt) {
      updates.openedAt = now;
      updates.ipAddress = args.ipAddress;
      updates.userAgent = args.userAgent;
    }

    await ctx.db.patch(receipt._id, updates);

    return receipt._id;
  },
});

/**
 * Record a link click.
 */
export const recordLinkClick = mutation({
  args: {
    trackingId: v.string(),
    url: v.string(),
  },
  handler: async (ctx, args) => {
    const receipt = await ctx.db
      .query("emailReadReceipts")
      .withIndex("by_tracking_id", (q) => q.eq("trackingId", args.trackingId))
      .first();

    if (!receipt) return null;

    const now = Date.now();
    const linksClicked = receipt.linksClicked || [];

    linksClicked.push({
      url: args.url,
      clickedAt: now,
    });

    await ctx.db.patch(receipt._id, {
      linksClicked,
    });

    return receipt._id;
  },
});

/**
 * Delete tracking for an email.
 */
export const remove = mutation({
  args: { emailId: v.id("emails") },
  handler: async (ctx, args) => {
    const receipt = await ctx.db
      .query("emailReadReceipts")
      .withIndex("by_email", (q) => q.eq("emailId", args.emailId))
      .first();

    if (receipt) {
      await ctx.db.delete(receipt._id);
    }
  },
});

// ============ INTERNAL ============

/**
 * Cleanup old read receipts.
 */
export const cleanup = internalMutation({
  args: {
    retentionDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const retentionDays = args.retentionDays || 90;
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

    const oldReceipts = await ctx.db
      .query("emailReadReceipts")
      .filter((q) => q.lt(q.field("createdAt"), cutoff))
      .take(100);

    for (const receipt of oldReceipts) {
      await ctx.db.delete(receipt._id);
    }

    return { deleted: oldReceipts.length };
  },
});

// ============ HELPERS ============

/**
 * Generate tracking pixel HTML to embed in emails.
 */
export function generateTrackingPixel(trackingId: string, baseUrl: string): string {
  const trackingUrl = `${baseUrl}/api/email/track/${trackingId}`;
  return `<img src="${trackingUrl}" width="1" height="1" style="display:none" alt="" />`;
}
