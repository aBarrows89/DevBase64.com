/**
 * Email Bulk Actions
 *
 * Perform actions on multiple emails at once.
 */

import { v } from "convex/values";
import { mutation } from "../_generated/server";

// ============ MUTATIONS ============

/**
 * Mark multiple emails as read.
 */
export const markAsRead = mutation({
  args: {
    emailIds: v.array(v.id("emails")),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let updated = 0;

    for (const emailId of args.emailIds) {
      const email = await ctx.db.get(emailId);
      if (email && !email.isRead) {
        await ctx.db.patch(emailId, {
          isRead: true,
          updatedAt: now,
        });
        updated++;
      }
    }

    return { updated };
  },
});

/**
 * Mark multiple emails as unread.
 */
export const markAsUnread = mutation({
  args: {
    emailIds: v.array(v.id("emails")),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let updated = 0;

    for (const emailId of args.emailIds) {
      const email = await ctx.db.get(emailId);
      if (email && email.isRead) {
        await ctx.db.patch(emailId, {
          isRead: false,
          updatedAt: now,
        });
        updated++;
      }
    }

    return { updated };
  },
});

/**
 * Star multiple emails.
 */
export const star = mutation({
  args: {
    emailIds: v.array(v.id("emails")),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let updated = 0;

    for (const emailId of args.emailIds) {
      const email = await ctx.db.get(emailId);
      if (email && !email.isStarred) {
        await ctx.db.patch(emailId, {
          isStarred: true,
          updatedAt: now,
        });
        updated++;
      }
    }

    return { updated };
  },
});

/**
 * Unstar multiple emails.
 */
export const unstar = mutation({
  args: {
    emailIds: v.array(v.id("emails")),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let updated = 0;

    for (const emailId of args.emailIds) {
      const email = await ctx.db.get(emailId);
      if (email && email.isStarred) {
        await ctx.db.patch(emailId, {
          isStarred: false,
          updatedAt: now,
        });
        updated++;
      }
    }

    return { updated };
  },
});

/**
 * Move multiple emails to a folder.
 */
export const moveToFolder = mutation({
  args: {
    emailIds: v.array(v.id("emails")),
    folderId: v.id("emailFolders"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const folder = await ctx.db.get(args.folderId);
    if (!folder) {
      throw new Error("Folder not found");
    }

    const now = Date.now();
    let moved = 0;

    for (const emailId of args.emailIds) {
      const email = await ctx.db.get(emailId);
      if (email && email.folderId !== args.folderId) {
        await ctx.db.patch(emailId, {
          folderId: args.folderId,
          updatedAt: now,
        });
        moved++;
      }
    }

    return { moved };
  },
});

/**
 * Move multiple emails to trash.
 */
export const moveToTrash = mutation({
  args: {
    emailIds: v.array(v.id("emails")),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let moved = 0;

    for (const emailId of args.emailIds) {
      const email = await ctx.db.get(emailId);
      if (!email) continue;

      // Find trash folder for this account
      const trashFolder = await ctx.db
        .query("emailFolders")
        .withIndex("by_account_type", (q) =>
          q.eq("accountId", email.accountId).eq("type", "trash")
        )
        .first();

      if (trashFolder && email.folderId !== trashFolder._id) {
        await ctx.db.patch(emailId, {
          folderId: trashFolder._id,
          updatedAt: now,
        });
        moved++;
      }
    }

    return { moved };
  },
});

/**
 * Permanently delete multiple emails.
 */
export const permanentDelete = mutation({
  args: {
    emailIds: v.array(v.id("emails")),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    let deleted = 0;

    for (const emailId of args.emailIds) {
      const email = await ctx.db.get(emailId);
      if (!email) continue;

      // Delete attachments
      const attachments = await ctx.db
        .query("emailAttachments")
        .withIndex("by_email", (q) => q.eq("emailId", emailId))
        .collect();

      for (const attachment of attachments) {
        if (attachment.storageId) {
          await ctx.storage.delete(attachment.storageId);
        }
        await ctx.db.delete(attachment._id);
      }

      // Delete from search index
      const searchIndex = await ctx.db
        .query("emailSearchIndex")
        .withIndex("by_email", (q) => q.eq("emailId", emailId))
        .first();

      if (searchIndex) {
        await ctx.db.delete(searchIndex._id);
      }

      // Delete label assignments
      const labelAssignments = await ctx.db
        .query("emailLabelAssignments")
        .withIndex("by_email", (q) => q.eq("emailId", emailId))
        .collect();

      for (const assignment of labelAssignments) {
        await ctx.db.delete(assignment._id);
      }

      // Delete the email
      await ctx.db.delete(emailId);
      deleted++;
    }

    return { deleted };
  },
});

/**
 * Archive multiple emails (move to archive folder).
 */
export const archive = mutation({
  args: {
    emailIds: v.array(v.id("emails")),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let archived = 0;

    for (const emailId of args.emailIds) {
      const email = await ctx.db.get(emailId);
      if (!email) continue;

      // Find archive folder for this account
      const archiveFolder = await ctx.db
        .query("emailFolders")
        .withIndex("by_account_type", (q) =>
          q.eq("accountId", email.accountId).eq("type", "archive")
        )
        .first();

      if (archiveFolder && email.folderId !== archiveFolder._id) {
        await ctx.db.patch(emailId, {
          folderId: archiveFolder._id,
          updatedAt: now,
        });
        archived++;
      }
    }

    return { archived };
  },
});

/**
 * Restore multiple emails from trash/archive to inbox.
 */
export const restore = mutation({
  args: {
    emailIds: v.array(v.id("emails")),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let restored = 0;

    for (const emailId of args.emailIds) {
      const email = await ctx.db.get(emailId);
      if (!email) continue;

      // Find inbox folder
      const inboxFolder = await ctx.db
        .query("emailFolders")
        .withIndex("by_account_type", (q) =>
          q.eq("accountId", email.accountId).eq("type", "inbox")
        )
        .first();

      if (inboxFolder && email.folderId !== inboxFolder._id) {
        await ctx.db.patch(emailId, {
          folderId: inboxFolder._id,
          updatedAt: now,
        });
        restored++;
      }
    }

    return { restored };
  },
});

/**
 * Mark multiple emails as spam (move to spam folder).
 */
export const markAsSpam = mutation({
  args: {
    emailIds: v.array(v.id("emails")),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let marked = 0;

    for (const emailId of args.emailIds) {
      const email = await ctx.db.get(emailId);
      if (!email) continue;

      // Find spam folder
      const spamFolder = await ctx.db
        .query("emailFolders")
        .withIndex("by_account_type", (q) =>
          q.eq("accountId", email.accountId).eq("type", "spam")
        )
        .first();

      if (spamFolder && email.folderId !== spamFolder._id) {
        await ctx.db.patch(emailId, {
          folderId: spamFolder._id,
          updatedAt: now,
        });
        marked++;
      }
    }

    return { marked };
  },
});

/**
 * Mark multiple emails as not spam (move to inbox).
 */
export const markAsNotSpam = mutation({
  args: {
    emailIds: v.array(v.id("emails")),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let unmarked = 0;

    for (const emailId of args.emailIds) {
      const email = await ctx.db.get(emailId);
      if (!email) continue;

      // Find inbox folder
      const inboxFolder = await ctx.db
        .query("emailFolders")
        .withIndex("by_account_type", (q) =>
          q.eq("accountId", email.accountId).eq("type", "inbox")
        )
        .first();

      // Check if currently in spam
      const spamFolder = await ctx.db
        .query("emailFolders")
        .withIndex("by_account_type", (q) =>
          q.eq("accountId", email.accountId).eq("type", "spam")
        )
        .first();

      if (inboxFolder && spamFolder && email.folderId === spamFolder._id) {
        await ctx.db.patch(emailId, {
          folderId: inboxFolder._id,
          updatedAt: now,
        });
        unmarked++;
      }
    }

    return { unmarked };
  },
});

/**
 * Empty trash folder.
 */
export const emptyTrash = mutation({
  args: {
    accountId: v.id("emailAccounts"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Find trash folder
    const trashFolder = await ctx.db
      .query("emailFolders")
      .withIndex("by_account_type", (q) =>
        q.eq("accountId", args.accountId).eq("type", "trash")
      )
      .first();

    if (!trashFolder) return { deleted: 0 };

    // Get all emails in trash
    const trashedEmails = await ctx.db
      .query("emails")
      .withIndex("by_folder", (q) => q.eq("folderId", trashFolder._id))
      .collect();

    let deleted = 0;

    for (const email of trashedEmails) {
      // Delete attachments
      const attachments = await ctx.db
        .query("emailAttachments")
        .withIndex("by_email", (q) => q.eq("emailId", email._id))
        .collect();

      for (const attachment of attachments) {
        if (attachment.storageId) {
          await ctx.storage.delete(attachment.storageId);
        }
        await ctx.db.delete(attachment._id);
      }

      await ctx.db.delete(email._id);
      deleted++;
    }

    return { deleted };
  },
});
