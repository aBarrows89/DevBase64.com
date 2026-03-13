/**
 * Email Snooze Functionality
 *
 * Hide emails temporarily and resurface them later.
 */

import { v } from "convex/values";
import { query, mutation, internalMutation } from "../_generated/server";

// Preset snooze durations
export const SNOOZE_PRESETS = {
  laterToday: () => {
    const now = new Date();
    const later = new Date(now);
    later.setHours(18, 0, 0, 0); // 6 PM today
    if (later <= now) {
      later.setDate(later.getDate() + 1);
    }
    return later.getTime();
  },
  tomorrow: () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0); // 9 AM tomorrow
    return tomorrow.getTime();
  },
  nextWeek: () => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(9, 0, 0, 0); // 9 AM next week
    return nextWeek.getTime();
  },
  nextMonth: () => {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setHours(9, 0, 0, 0);
    return nextMonth.getTime();
  },
};

// ============ QUERIES ============

/**
 * Get all snoozed emails for a user.
 */
export const listSnoozed = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const snoozes = await ctx.db
      .query("emailSnooze")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Fetch email details
    const results = await Promise.all(
      snoozes.map(async (snooze) => {
        const email = await ctx.db.get(snooze.emailId);
        return email ? { snooze, email } : null;
      })
    );

    return results
      .filter(Boolean)
      .sort((a, b) => a!.snooze.snoozedUntil - b!.snooze.snoozedUntil);
  },
});

/**
 * Get snooze info for an email.
 */
export const getSnoozeInfo = query({
  args: { emailId: v.id("emails") },
  handler: async (ctx, args) => {
    const snooze = await ctx.db
      .query("emailSnooze")
      .withIndex("by_email", (q) => q.eq("emailId", args.emailId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    return snooze;
  },
});

/**
 * Get count of snoozed emails.
 */
export const getSnoozedCount = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const snoozes = await ctx.db
      .query("emailSnooze")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return snoozes.length;
  },
});

// ============ MUTATIONS ============

/**
 * Snooze an email.
 */
export const snooze = mutation({
  args: {
    emailId: v.id("emails"),
    userId: v.id("users"),
    snoozedUntil: v.number(),
  },
  handler: async (ctx, args) => {
    const email = await ctx.db.get(args.emailId);
    if (!email) {
      throw new Error("Email not found");
    }

    // Check if already snoozed
    const existing = await ctx.db
      .query("emailSnooze")
      .withIndex("by_email", (q) => q.eq("emailId", args.emailId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (existing) {
      // Update existing snooze
      await ctx.db.patch(existing._id, {
        snoozedUntil: args.snoozedUntil,
      });
      return existing._id;
    }

    // Mark email as snoozed
    await ctx.db.patch(args.emailId, {
      isSnoozed: true,
      snoozedUntil: args.snoozedUntil,
      updatedAt: Date.now(),
    });

    // Create snooze record
    return await ctx.db.insert("emailSnooze", {
      emailId: args.emailId,
      userId: args.userId,
      snoozedUntil: args.snoozedUntil,
      originalFolderId: email.folderId,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

/**
 * Unsnooze an email.
 */
export const unsnooze = mutation({
  args: {
    emailId: v.id("emails"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const snooze = await ctx.db
      .query("emailSnooze")
      .withIndex("by_email", (q) => q.eq("emailId", args.emailId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (!snooze) {
      throw new Error("Email is not snoozed");
    }

    // Deactivate snooze
    await ctx.db.patch(snooze._id, {
      isActive: false,
    });

    // Update email
    await ctx.db.patch(args.emailId, {
      isSnoozed: false,
      snoozedUntil: undefined,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Bulk snooze emails.
 */
export const bulkSnooze = mutation({
  args: {
    emailIds: v.array(v.id("emails")),
    userId: v.id("users"),
    snoozedUntil: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let snoozed = 0;

    for (const emailId of args.emailIds) {
      const email = await ctx.db.get(emailId);
      if (!email) continue;

      // Check if already snoozed
      const existing = await ctx.db
        .query("emailSnooze")
        .withIndex("by_email", (q) => q.eq("emailId", emailId))
        .filter((q) => q.eq(q.field("isActive"), true))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          snoozedUntil: args.snoozedUntil,
        });
      } else {
        await ctx.db.insert("emailSnooze", {
          emailId,
          userId: args.userId,
          snoozedUntil: args.snoozedUntil,
          originalFolderId: email.folderId,
          isActive: true,
          createdAt: now,
        });
      }

      await ctx.db.patch(emailId, {
        isSnoozed: true,
        snoozedUntil: args.snoozedUntil,
        updatedAt: now,
      });

      snoozed++;
    }

    return { snoozed };
  },
});

/**
 * Process due snoozes (called by cron job).
 */
export const processDueSnoozes = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Find all snoozes that are due
    const dueSnoozes = await ctx.db
      .query("emailSnooze")
      .withIndex("by_snooze_time", (q) =>
        q.eq("isActive", true).lte("snoozedUntil", now)
      )
      .take(100);

    let processed = 0;

    for (const snooze of dueSnoozes) {
      // Unsnooze the email
      await ctx.db.patch(snooze.emailId, {
        isSnoozed: false,
        snoozedUntil: undefined,
        isRead: false, // Mark as unread so user notices it
        updatedAt: now,
      });

      // Deactivate snooze record
      await ctx.db.patch(snooze._id, {
        isActive: false,
      });

      processed++;
    }

    return { processed };
  },
});
