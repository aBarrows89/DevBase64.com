/**
 * Email Audit Logging
 *
 * Track all email-related actions for compliance and security.
 */

import { v } from "convex/values";
import { query, internalMutation } from "../_generated/server";

// Action types for audit logging
export type AuditAction =
  | "email_sent"
  | "email_deleted"
  | "email_moved"
  | "email_read"
  | "email_starred"
  | "email_labeled"
  | "email_forwarded"
  | "email_replied"
  | "attachment_downloaded"
  | "attachment_uploaded"
  | "account_connected"
  | "account_disconnected"
  | "account_synced"
  | "shared_mailbox_accessed"
  | "template_used"
  | "bulk_action"
  | "search_performed"
  | "settings_changed"
  | "export_requested";

// ============ QUERIES ============

/**
 * Get audit logs for a user.
 */
export const listByUser = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    action: v.optional(v.string()),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    let logs = await ctx.db
      .query("emailAuditLog")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit + (args.offset || 0));

    // Skip offset
    if (args.offset) {
      logs = logs.slice(args.offset);
    }

    // Filter by action
    if (args.action) {
      logs = logs.filter((l) => l.action === args.action);
    }

    // Filter by date range
    if (args.dateFrom) {
      logs = logs.filter((l) => l.createdAt >= args.dateFrom!);
    }
    if (args.dateTo) {
      logs = logs.filter((l) => l.createdAt <= args.dateTo!);
    }

    return logs.slice(0, limit);
  },
});

/**
 * Get audit logs for an account.
 */
export const listByAccount = query({
  args: {
    accountId: v.id("emailAccounts"),
    limit: v.optional(v.number()),
    action: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    let logs = await ctx.db
      .query("emailAuditLog")
      .withIndex("by_account", (q) => q.eq("accountId", args.accountId))
      .order("desc")
      .take(limit);

    if (args.action) {
      logs = logs.filter((l) => l.action === args.action);
    }

    return logs;
  },
});

/**
 * Get audit logs for a specific email.
 */
export const listByEmail = query({
  args: {
    emailId: v.id("emails"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("emailAuditLog")
      .withIndex("by_email", (q) => q.eq("emailId", args.emailId))
      .order("desc")
      .take(args.limit || 50);
  },
});

/**
 * Get audit summary statistics.
 */
export const getStats = query({
  args: {
    userId: v.id("users"),
    periodDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const periodMs = (args.periodDays || 30) * 24 * 60 * 60 * 1000;
    const since = Date.now() - periodMs;

    const logs = await ctx.db
      .query("emailAuditLog")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.gte(q.field("createdAt"), since))
      .collect();

    const actionCounts: Record<string, number> = {};
    for (const log of logs) {
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
    }

    return {
      totalActions: logs.length,
      actionCounts,
      emailsSent: actionCounts["email_sent"] || 0,
      emailsDeleted: actionCounts["email_deleted"] || 0,
      attachmentsDownloaded: actionCounts["attachment_downloaded"] || 0,
    };
  },
});

// ============ INTERNAL MUTATIONS ============

/**
 * Log an audit event (internal only).
 */
export const log = internalMutation({
  args: {
    userId: v.id("users"),
    action: v.string(),
    accountId: v.optional(v.id("emailAccounts")),
    emailId: v.optional(v.id("emails")),
    details: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("emailAuditLog", {
      userId: args.userId,
      action: args.action,
      accountId: args.accountId,
      emailId: args.emailId,
      details: args.details,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      createdAt: Date.now(),
    });
  },
});

/**
 * Bulk log audit events.
 */
export const bulkLog = internalMutation({
  args: {
    events: v.array(
      v.object({
        userId: v.id("users"),
        action: v.string(),
        accountId: v.optional(v.id("emailAccounts")),
        emailId: v.optional(v.id("emails")),
        details: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    for (const event of args.events) {
      await ctx.db.insert("emailAuditLog", {
        ...event,
        createdAt: now,
      });
    }

    return { logged: args.events.length };
  },
});

/**
 * Clean up old audit logs (retention policy).
 */
export const cleanup = internalMutation({
  args: {
    retentionDays: v.optional(v.number()),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const retentionMs = (args.retentionDays || 365) * 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - retentionMs;
    const batchSize = args.batchSize || 100;

    // Get old logs
    const oldLogs = await ctx.db
      .query("emailAuditLog")
      .withIndex("by_created", (q) => q.lt("createdAt", cutoff))
      .take(batchSize);

    let deleted = 0;
    for (const log of oldLogs) {
      await ctx.db.delete(log._id);
      deleted++;
    }

    return { deleted, hasMore: oldLogs.length === batchSize };
  },
});
