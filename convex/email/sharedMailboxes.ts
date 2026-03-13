/**
 * Shared Mailboxes
 *
 * Shared email accounts accessible by multiple users.
 */

import { v } from "convex/values";
import { query, mutation } from "../_generated/server";

// ============ QUERIES ============

/**
 * List shared mailboxes accessible by a user.
 */
export const listForUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Get mailboxes where user is owner
    const ownedMailboxes = await ctx.db
      .query("sharedMailboxes")
      .withIndex("by_owner", (q) => q.eq("ownerUserId", args.userId))
      .collect();

    // Get all mailboxes and filter by membership
    const allMailboxes = await ctx.db.query("sharedMailboxes").collect();
    const memberMailboxes = allMailboxes.filter(
      (m) =>
        m.memberUserIds.includes(args.userId) &&
        m.ownerUserId !== args.userId
    );

    const accessible = [...ownedMailboxes, ...memberMailboxes];

    // Get account details for each
    const results = await Promise.all(
      accessible.map(async (mailbox) => {
        const account = await ctx.db.get(mailbox.accountId);
        const isOwner = mailbox.ownerUserId === args.userId;
        return {
          mailbox,
          account,
          isOwner,
          permissions: mailbox.permissions,
        };
      })
    );

    return results.filter((r) => r.account && r.mailbox.isActive);
  },
});

/**
 * Get a shared mailbox by ID.
 */
export const get = query({
  args: { sharedMailboxId: v.id("sharedMailboxes") },
  handler: async (ctx, args) => {
    const mailbox = await ctx.db.get(args.sharedMailboxId);
    if (!mailbox) return null;

    const account = await ctx.db.get(mailbox.accountId);

    // Get owner and member details
    const owner = await ctx.db.get(mailbox.ownerUserId);
    const members = await Promise.all(
      mailbox.memberUserIds.map(async (userId) => {
        const user = await ctx.db.get(userId);
        return {
          userId,
          userName: user?.name || "Unknown",
          userEmail: user?.email,
        };
      })
    );

    return {
      ...mailbox,
      account,
      owner: {
        userId: mailbox.ownerUserId,
        userName: owner?.name || "Unknown",
        userEmail: owner?.email,
      },
      membersWithDetails: members,
    };
  },
});

/**
 * Check if user has access to a shared mailbox.
 */
export const checkAccess = query({
  args: {
    sharedMailboxId: v.id("sharedMailboxes"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const mailbox = await ctx.db.get(args.sharedMailboxId);
    if (!mailbox || !mailbox.isActive) return null;

    const isOwner = mailbox.ownerUserId === args.userId;
    const isMember = mailbox.memberUserIds.includes(args.userId);

    if (!isOwner && !isMember) return null;

    return {
      isOwner,
      isMember,
      permissions: isOwner
        ? { canRead: true, canSend: true, canDelete: true, canManageMembers: true }
        : mailbox.permissions,
    };
  },
});

/**
 * List all shared mailboxes (admin only).
 */
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const mailboxes = await ctx.db.query("sharedMailboxes").collect();

    const results = await Promise.all(
      mailboxes.map(async (mailbox) => {
        const account = await ctx.db.get(mailbox.accountId);
        const owner = await ctx.db.get(mailbox.ownerUserId);
        return {
          mailbox,
          account,
          owner: {
            userId: mailbox.ownerUserId,
            userName: owner?.name || "Unknown",
          },
          memberCount: mailbox.memberUserIds.length,
        };
      })
    );

    return results;
  },
});

// ============ MUTATIONS ============

/**
 * Create a shared mailbox from an existing email account.
 */
export const create = mutation({
  args: {
    accountId: v.id("emailAccounts"),
    name: v.string(),
    description: v.optional(v.string()),
    createdBy: v.id("users"),
    permissions: v.optional(v.object({
      canRead: v.boolean(),
      canSend: v.boolean(),
      canDelete: v.boolean(),
      canManageMembers: v.boolean(),
    })),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db.get(args.accountId);
    if (!account) {
      throw new Error("Email account not found");
    }

    // Check if already a shared mailbox
    const existing = await ctx.db
      .query("sharedMailboxes")
      .withIndex("by_account", (q) => q.eq("accountId", args.accountId))
      .first();

    if (existing) {
      throw new Error("This account is already a shared mailbox");
    }

    const now = Date.now();

    return await ctx.db.insert("sharedMailboxes", {
      accountId: args.accountId,
      name: args.name,
      description: args.description,
      ownerUserId: args.createdBy,
      memberUserIds: [],
      permissions: args.permissions || {
        canRead: true,
        canSend: false,
        canDelete: false,
        canManageMembers: false,
      },
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update shared mailbox details.
 */
export const update = mutation({
  args: {
    sharedMailboxId: v.id("sharedMailboxes"),
    userId: v.id("users"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    permissions: v.optional(v.object({
      canRead: v.boolean(),
      canSend: v.boolean(),
      canDelete: v.boolean(),
      canManageMembers: v.boolean(),
    })),
  },
  handler: async (ctx, args) => {
    const mailbox = await ctx.db.get(args.sharedMailboxId);
    if (!mailbox) {
      throw new Error("Shared mailbox not found");
    }

    // Only owner can update
    if (mailbox.ownerUserId !== args.userId) {
      throw new Error("Only the owner can update shared mailbox settings");
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.isActive !== undefined) updates.isActive = args.isActive;
    if (args.permissions !== undefined) updates.permissions = args.permissions;

    await ctx.db.patch(args.sharedMailboxId, updates);
  },
});

/**
 * Add a member to a shared mailbox.
 */
export const addMember = mutation({
  args: {
    sharedMailboxId: v.id("sharedMailboxes"),
    newUserId: v.id("users"),
    addedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const mailbox = await ctx.db.get(args.sharedMailboxId);
    if (!mailbox) {
      throw new Error("Shared mailbox not found");
    }

    // Check permission
    const isOwner = mailbox.ownerUserId === args.addedBy;
    const isMemberWithPermission =
      mailbox.memberUserIds.includes(args.addedBy) &&
      mailbox.permissions.canManageMembers;

    if (!isOwner && !isMemberWithPermission) {
      throw new Error("Permission denied");
    }

    // Check if already a member
    if (mailbox.memberUserIds.includes(args.newUserId)) {
      throw new Error("User is already a member");
    }

    // Cannot add owner as member
    if (mailbox.ownerUserId === args.newUserId) {
      throw new Error("Owner cannot be added as member");
    }

    await ctx.db.patch(args.sharedMailboxId, {
      memberUserIds: [...mailbox.memberUserIds, args.newUserId],
      updatedAt: Date.now(),
    });
  },
});

/**
 * Remove a member from a shared mailbox.
 */
export const removeMember = mutation({
  args: {
    sharedMailboxId: v.id("sharedMailboxes"),
    userIdToRemove: v.id("users"),
    removedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const mailbox = await ctx.db.get(args.sharedMailboxId);
    if (!mailbox) {
      throw new Error("Shared mailbox not found");
    }

    // Check permission (owner or self-removal)
    const isOwner = mailbox.ownerUserId === args.removedBy;
    const isSelfRemoval = args.userIdToRemove === args.removedBy;

    if (!isOwner && !isSelfRemoval) {
      throw new Error("Permission denied");
    }

    // Cannot remove owner
    if (args.userIdToRemove === mailbox.ownerUserId) {
      throw new Error("Cannot remove the owner");
    }

    await ctx.db.patch(args.sharedMailboxId, {
      memberUserIds: mailbox.memberUserIds.filter(
        (id) => id !== args.userIdToRemove
      ),
      updatedAt: Date.now(),
    });
  },
});

/**
 * Transfer ownership of a shared mailbox.
 */
export const transferOwnership = mutation({
  args: {
    sharedMailboxId: v.id("sharedMailboxes"),
    newOwnerId: v.id("users"),
    currentOwnerId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const mailbox = await ctx.db.get(args.sharedMailboxId);
    if (!mailbox) {
      throw new Error("Shared mailbox not found");
    }

    if (mailbox.ownerUserId !== args.currentOwnerId) {
      throw new Error("Only the owner can transfer ownership");
    }

    // Remove new owner from members if they were a member
    const updatedMembers = mailbox.memberUserIds.filter(
      (id) => id !== args.newOwnerId
    );

    // Add current owner as member
    if (!updatedMembers.includes(args.currentOwnerId)) {
      updatedMembers.push(args.currentOwnerId);
    }

    await ctx.db.patch(args.sharedMailboxId, {
      ownerUserId: args.newOwnerId,
      memberUserIds: updatedMembers,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Delete a shared mailbox (does not delete the email account).
 */
export const remove = mutation({
  args: {
    sharedMailboxId: v.id("sharedMailboxes"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const mailbox = await ctx.db.get(args.sharedMailboxId);
    if (!mailbox) {
      throw new Error("Shared mailbox not found");
    }

    // Only owner can delete
    if (mailbox.ownerUserId !== args.userId) {
      throw new Error("Only the owner can delete a shared mailbox");
    }

    await ctx.db.delete(args.sharedMailboxId);
  },
});
