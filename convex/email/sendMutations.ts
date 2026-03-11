/**
 * Email Send Mutations
 *
 * Non-Node.js mutations for email send queue operations.
 */

import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

// Email address validator
const emailAddressValidator = v.object({
  name: v.optional(v.string()),
  address: v.string(),
});

/**
 * Insert a new queue entry.
 */
export const insertQueueEntry = internalMutation({
  args: {
    accountId: v.id("emailAccounts"),
    to: v.array(emailAddressValidator),
    cc: v.optional(v.array(emailAddressValidator)),
    bcc: v.optional(v.array(emailAddressValidator)),
    subject: v.string(),
    bodyHtml: v.string(),
    bodyText: v.optional(v.string()),
    scheduledFor: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get userId from the account
    const account = await ctx.db.get(args.accountId);
    if (!account) {
      throw new Error("Account not found");
    }

    return await ctx.db.insert("emailSendQueue", {
      accountId: args.accountId,
      userId: account.userId,
      to: args.to,
      cc: args.cc,
      bcc: args.bcc,
      subject: args.subject,
      bodyHtml: args.bodyHtml,
      bodyText: args.bodyText,
      status: "pending",
      attempts: 0,
      scheduledFor: args.scheduledFor || now,
      createdAt: now,
    });
  },
});

/**
 * Update queue entry status.
 */
export const updateQueueStatus = internalMutation({
  args: {
    queueId: v.id("emailSendQueue"),
    status: v.union(
      v.literal("pending"),
      v.literal("sending"),
      v.literal("sent"),
      v.literal("failed")
    ),
    error: v.optional(v.string()),
    messageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.queueId);
    if (!entry) return;

    const now = Date.now();
    await ctx.db.patch(args.queueId, {
      status: args.status,
      error: args.error,
      messageId: args.messageId,
      attempts: entry.attempts + (args.status === "sending" ? 1 : 0),
      lastAttemptAt: now,
      sentAt: args.status === "sent" ? now : undefined,
    });
  },
});

/**
 * Delete a queue entry.
 */
export const deleteQueueEntry = internalMutation({
  args: {
    queueId: v.id("emailSendQueue"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.queueId);
  },
});
