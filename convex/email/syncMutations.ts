/**
 * Email Sync Mutations & Queries
 *
 * Non-Node.js mutations and queries for email sync operations.
 * These are separated from sync.ts because mutations/queries can't be in "use node" files.
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

// ============ QUERIES ============

/**
 * List all active email accounts (internal query for cron).
 */
export const listActiveAccounts = internalQuery({
  args: {},
  handler: async (ctx) => {
    // Get all active accounts across all users
    const accounts = await ctx.db
      .query("emailAccounts")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return accounts;
  },
});

/**
 * Get account details for sync (includes credentials).
 */
export const getAccountForSync = internalQuery({
  args: {
    accountId: v.id("emailAccounts"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.accountId);
  },
});

// ============ MUTATIONS ============

/**
 * Log sync activity (combines action + mutation).
 */
export const logSync = internalMutation({
  args: {
    accountId: v.id("emailAccounts"),
    action: v.string(),
    status: v.string(),
    emailsProcessed: v.optional(v.number()),
    duration: v.optional(v.number()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("emailSyncLogs", {
      accountId: args.accountId,
      action: args.action,
      status: args.status,
      details: undefined,
      emailsProcessed: args.emailsProcessed,
      duration: args.duration,
      error: args.error,
      createdAt: Date.now(),
    });
  },
});

/**
 * Create sync log entry.
 */
export const createSyncLog = internalMutation({
  args: {
    accountId: v.id("emailAccounts"),
    action: v.string(),
    status: v.string(),
    details: v.optional(v.string()),
    emailsProcessed: v.optional(v.number()),
    duration: v.optional(v.number()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("emailSyncLogs", {
      accountId: args.accountId,
      action: args.action,
      status: args.status,
      details: args.details,
      emailsProcessed: args.emailsProcessed,
      duration: args.duration,
      error: args.error,
      createdAt: Date.now(),
    });
  },
});
