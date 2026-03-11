/**
 * Email Draft Management
 *
 * CRUD operations for managing email drafts with autosave support.
 */

import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";

// Email address validator
const emailAddressValidator = v.object({
  name: v.optional(v.string()),
  address: v.string(),
});

// ============ QUERIES ============

/**
 * Get all drafts for a user.
 */
export const listByUser = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const drafts = await ctx.db
      .query("emailDrafts")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    return drafts;
  },
});

/**
 * Get drafts for a specific account.
 */
export const listByAccount = query({
  args: {
    accountId: v.id("emailAccounts"),
  },
  handler: async (ctx, args) => {
    const drafts = await ctx.db
      .query("emailDrafts")
      .withIndex("by_account", (q) => q.eq("accountId", args.accountId))
      .order("desc")
      .collect();

    return drafts;
  },
});

/**
 * Get a single draft by ID.
 */
export const get = query({
  args: {
    draftId: v.id("emailDrafts"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.draftId);
  },
});

// ============ MUTATIONS ============

/**
 * Create a new draft.
 */
export const create = mutation({
  args: {
    accountId: v.id("emailAccounts"),
    userId: v.id("users"),
    to: v.optional(v.array(emailAddressValidator)),
    cc: v.optional(v.array(emailAddressValidator)),
    bcc: v.optional(v.array(emailAddressValidator)),
    subject: v.optional(v.string()),
    bodyHtml: v.optional(v.string()),
    bodyText: v.optional(v.string()),
    mode: v.optional(v.union(
      v.literal("compose"),
      v.literal("reply"),
      v.literal("reply_all"),
      v.literal("forward")
    )),
    replyToEmailId: v.optional(v.id("emails")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    return await ctx.db.insert("emailDrafts", {
      accountId: args.accountId,
      userId: args.userId,
      to: args.to || [],
      cc: args.cc,
      bcc: args.bcc,
      subject: args.subject || "",
      bodyHtml: args.bodyHtml || "",
      bodyText: args.bodyText,
      mode: args.mode || "compose",
      replyToEmailId: args.replyToEmailId,
      attachments: [],
      lastSavedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update an existing draft (autosave).
 */
export const update = mutation({
  args: {
    draftId: v.id("emailDrafts"),
    to: v.optional(v.array(emailAddressValidator)),
    cc: v.optional(v.array(emailAddressValidator)),
    bcc: v.optional(v.array(emailAddressValidator)),
    subject: v.optional(v.string()),
    bodyHtml: v.optional(v.string()),
    bodyText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const draft = await ctx.db.get(args.draftId);
    if (!draft) {
      throw new Error("Draft not found");
    }

    const now = Date.now();
    const updates: Record<string, unknown> = {
      updatedAt: now,
      lastSavedAt: now,
    };

    if (args.to !== undefined) updates.to = args.to;
    if (args.cc !== undefined) updates.cc = args.cc;
    if (args.bcc !== undefined) updates.bcc = args.bcc;
    if (args.subject !== undefined) updates.subject = args.subject;
    if (args.bodyHtml !== undefined) updates.bodyHtml = args.bodyHtml;
    if (args.bodyText !== undefined) updates.bodyText = args.bodyText;

    await ctx.db.patch(args.draftId, updates);

    return args.draftId;
  },
});

/**
 * Add attachment to draft.
 */
export const addAttachment = mutation({
  args: {
    draftId: v.id("emailDrafts"),
    fileName: v.string(),
    mimeType: v.string(),
    size: v.number(),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const draft = await ctx.db.get(args.draftId);
    if (!draft) {
      throw new Error("Draft not found");
    }

    const newAttachment = {
      fileName: args.fileName,
      mimeType: args.mimeType,
      size: args.size,
      storageId: args.storageId,
    };

    const now = Date.now();
    await ctx.db.patch(args.draftId, {
      attachments: [...(draft.attachments || []), newAttachment],
      updatedAt: now,
      lastSavedAt: now,
    });
  },
});

/**
 * Remove attachment from draft.
 */
export const removeAttachment = mutation({
  args: {
    draftId: v.id("emailDrafts"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const draft = await ctx.db.get(args.draftId);
    if (!draft) {
      throw new Error("Draft not found");
    }

    // Remove the attachment from the list
    const updatedAttachments = (draft.attachments || []).filter(
      (att) => att.storageId !== args.storageId
    );

    // Delete the file from storage
    await ctx.storage.delete(args.storageId);

    const now = Date.now();
    await ctx.db.patch(args.draftId, {
      attachments: updatedAttachments,
      updatedAt: now,
      lastSavedAt: now,
    });
  },
});

/**
 * Delete a draft.
 */
export const remove = mutation({
  args: {
    draftId: v.id("emailDrafts"),
  },
  handler: async (ctx, args) => {
    const draft = await ctx.db.get(args.draftId);
    if (!draft) return;

    // Delete any attachments from storage
    for (const attachment of draft.attachments || []) {
      try {
        await ctx.storage.delete(attachment.storageId);
      } catch {
        // Ignore if already deleted
      }
    }

    await ctx.db.delete(args.draftId);
  },
});

/**
 * Generate upload URL for attachment.
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
