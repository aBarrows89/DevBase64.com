/**
 * Email Analytics
 *
 * Track and aggregate email metrics and statistics.
 */

import { v } from "convex/values";
import { query, internalMutation } from "../_generated/server";

// ============ QUERIES ============

/**
 * Get analytics for a user.
 */
export const getUserAnalytics = query({
  args: {
    userId: v.id("users"),
    periodType: v.optional(v.union(v.literal("day"), v.literal("week"), v.literal("month"))),
  },
  handler: async (ctx, args) => {
    const periodType = args.periodType || "month";
    const now = Date.now();
    let since: number;

    switch (periodType) {
      case "day":
        since = now - 24 * 60 * 60 * 1000;
        break;
      case "week":
        since = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case "month":
      default:
        since = now - 30 * 24 * 60 * 60 * 1000;
    }

    // Get recent analytics entries
    const analytics = await ctx.db
      .query("emailAnalytics")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.gte(q.field("periodStart"), since))
      .collect();

    // Aggregate metrics
    const totals = {
      emailsSent: 0,
      emailsReceived: 0,
      emailsRead: 0,
      emailsReplied: 0,
      averageResponseTime: 0,
    };

    let responseTimeSum = 0;
    let responseTimeCount = 0;

    for (const entry of analytics) {
      totals.emailsSent += entry.emailsSent || 0;
      totals.emailsReceived += entry.emailsReceived || 0;
      totals.emailsRead += entry.emailsRead || 0;
      totals.emailsReplied += entry.emailsReplied || 0;

      if (entry.avgResponseTimeMs && entry.avgResponseTimeMs > 0) {
        responseTimeSum += entry.avgResponseTimeMs;
        responseTimeCount++;
      }
    }

    if (responseTimeCount > 0) {
      totals.averageResponseTime = Math.round(responseTimeSum / responseTimeCount);
    }

    return {
      periodType,
      since,
      totals,
      dailyBreakdown: analytics.map((a) => ({
        periodStart: a.periodStart,
        sent: a.emailsSent || 0,
        received: a.emailsReceived || 0,
        read: a.emailsRead || 0,
      })),
    };
  },
});

/**
 * Get analytics for an account.
 */
export const getAccountAnalytics = query({
  args: {
    accountId: v.id("emailAccounts"),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = args.days || 30;
    const since = Date.now() - days * 24 * 60 * 60 * 1000;

    const analytics = await ctx.db
      .query("emailAnalytics")
      .withIndex("by_account", (q) => q.eq("accountId", args.accountId))
      .filter((q) => q.gte(q.field("periodStart"), since))
      .collect();

    // Aggregate
    const totals = {
      emailsSent: 0,
      emailsReceived: 0,
      emailsRead: 0,
    };

    for (const entry of analytics) {
      totals.emailsSent += entry.emailsSent || 0;
      totals.emailsReceived += entry.emailsReceived || 0;
      totals.emailsRead += entry.emailsRead || 0;
    }

    return {
      days,
      totals,
      trend: analytics,
    };
  },
});

/**
 * Get top senders (people who email you most).
 */
export const getTopSenders = query({
  args: {
    accountId: v.id("emailAccounts"),
    limit: v.optional(v.number()),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = args.days || 30;
    const since = Date.now() - days * 24 * 60 * 60 * 1000;
    const limit = args.limit || 10;

    // Get inbox folder
    const inboxFolder = await ctx.db
      .query("emailFolders")
      .withIndex("by_account_type", (q) =>
        q.eq("accountId", args.accountId).eq("type", "inbox")
      )
      .first();

    if (!inboxFolder) return [];

    // Get recent emails
    const emails = await ctx.db
      .query("emails")
      .withIndex("by_folder", (q) => q.eq("folderId", inboxFolder._id))
      .filter((q) => q.gte(q.field("date"), since))
      .collect();

    // Count by sender
    const senderCounts = new Map<string, { email: string; name?: string; count: number }>();

    for (const email of emails) {
      const key = email.from.address.toLowerCase();
      const existing = senderCounts.get(key);

      if (existing) {
        existing.count++;
      } else {
        senderCounts.set(key, {
          email: email.from.address,
          name: email.from.name,
          count: 1,
        });
      }
    }

    return Array.from(senderCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  },
});

/**
 * Get email activity by hour (when user sends/receives most).
 */
export const getActivityByHour = query({
  args: {
    accountId: v.id("emailAccounts"),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = args.days || 30;
    const since = Date.now() - days * 24 * 60 * 60 * 1000;

    // Get emails
    const emails = await ctx.db
      .query("emails")
      .withIndex("by_account", (q) => q.eq("accountId", args.accountId))
      .filter((q) => q.gte(q.field("date"), since))
      .collect();

    // Count by hour
    const hourCounts: number[] = new Array(24).fill(0);

    for (const email of emails) {
      const hour = new Date(email.date).getHours();
      hourCounts[hour]++;
    }

    return hourCounts.map((count, hour) => ({
      hour,
      count,
    }));
  },
});

// ============ INTERNAL MUTATIONS ============

/**
 * Record daily analytics (called by cron or after actions).
 */
export const recordDaily = internalMutation({
  args: {
    userId: v.id("users"),
    accountId: v.id("emailAccounts"),
    metrics: v.object({
      emailsSent: v.optional(v.number()),
      emailsReceived: v.optional(v.number()),
      emailsRead: v.optional(v.number()),
      emailsReplied: v.optional(v.number()),
      avgResponseTimeMs: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    // Get today's date at midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const periodStart = today.getTime();

    // Find existing entry for today
    const existing = await ctx.db
      .query("emailAnalytics")
      .withIndex("by_account", (q) => q.eq("accountId", args.accountId))
      .filter((q) => q.eq(q.field("periodStart"), periodStart))
      .first();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        emailsSent: (existing.emailsSent || 0) + (args.metrics.emailsSent || 0),
        emailsReceived: (existing.emailsReceived || 0) + (args.metrics.emailsReceived || 0),
        emailsRead: (existing.emailsRead || 0) + (args.metrics.emailsRead || 0),
        emailsReplied: (existing.emailsReplied || 0) + (args.metrics.emailsReplied || 0),
      });
      return existing._id;
    }

    // Create new entry
    return await ctx.db.insert("emailAnalytics", {
      userId: args.userId,
      accountId: args.accountId,
      period: "daily",
      periodStart,
      emailsSent: args.metrics.emailsSent || 0,
      emailsReceived: args.metrics.emailsReceived || 0,
      emailsRead: args.metrics.emailsRead || 0,
      emailsReplied: args.metrics.emailsReplied || 0,
      avgResponseTimeMs: args.metrics.avgResponseTimeMs,
      createdAt: Date.now(),
    });
  },
});

/**
 * Increment a specific metric.
 */
export const incrementMetric = internalMutation({
  args: {
    userId: v.id("users"),
    accountId: v.id("emailAccounts"),
    metric: v.string(),
    amount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const amount = args.amount || 1;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const periodStart = today.getTime();

    const existing = await ctx.db
      .query("emailAnalytics")
      .withIndex("by_account", (q) => q.eq("accountId", args.accountId))
      .filter((q) => q.eq(q.field("periodStart"), periodStart))
      .first();

    if (existing) {
      const currentValue = (existing as Record<string, unknown>)[args.metric] as number || 0;
      await ctx.db.patch(existing._id, {
        [args.metric]: currentValue + amount,
      });
    } else {
      await ctx.db.insert("emailAnalytics", {
        userId: args.userId,
        accountId: args.accountId,
        period: "daily",
        periodStart,
        emailsSent: 0,
        emailsReceived: 0,
        emailsRead: 0,
        emailsReplied: 0,
        [args.metric]: amount,
        createdAt: Date.now(),
      });
    }
  },
});

/**
 * Cleanup old analytics (keep last 365 days).
 */
export const cleanup = internalMutation({
  args: {
    retentionDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const retentionDays = args.retentionDays || 365;
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

    const oldEntries = await ctx.db
      .query("emailAnalytics")
      .filter((q) => q.lt(q.field("periodStart"), cutoff))
      .take(100);

    for (const entry of oldEntries) {
      await ctx.db.delete(entry._id);
    }

    return { deleted: oldEntries.length };
  },
});
