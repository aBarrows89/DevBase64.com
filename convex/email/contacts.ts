/**
 * Email Contacts Management
 *
 * Contact autocomplete and management for email addresses.
 */

import { v } from "convex/values";
import { query, mutation, internalMutation } from "../_generated/server";

// ============ QUERIES ============

/**
 * Search contacts for autocomplete.
 */
export const search = query({
  args: {
    userId: v.id("users"),
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    const queryLower = args.query.toLowerCase().trim();

    // Search email contacts
    const contacts = await ctx.db
      .query("emailContacts")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    let filtered = queryLower
      ? contacts.filter(
          (c) =>
            c.email.toLowerCase().includes(queryLower) ||
            c.name?.toLowerCase().includes(queryLower)
        )
      : contacts;

    const contactResults = filtered
      .sort((a, b) => (b.sendCount + b.receiveCount) - (a.sendCount + a.receiveCount))
      .slice(0, limit)
      .map((c) => ({
        email: c.email,
        name: c.name || null,
        sendCount: c.sendCount,
        receiveCount: c.receiveCount,
        source: "contact" as const,
      }));

    // Also search IECentral users (for internal email suggestions)
    const allUsers = await ctx.db.query("users").collect();
    const contactEmails = new Set(contactResults.map((c) => c.email.toLowerCase()));

    const userResults = allUsers
      .filter((u) => {
        if (!u.email || !u.isActive) return false;
        if (String(u._id) === String(args.userId)) return false; // Exclude self
        if (contactEmails.has(u.email.toLowerCase())) return false; // Already in contacts
        if (!queryLower) return true; // Show all users when no query
        return (
          u.email.toLowerCase().includes(queryLower) ||
          u.name.toLowerCase().includes(queryLower)
        );
      })
      .slice(0, limit)
      .map((u) => ({
        email: u.email!,
        name: u.name || null,
        sendCount: 0,
        receiveCount: 0,
        source: "user" as const,
      }));

    // Contacts first, then users, limited total
    return [...contactResults, ...userResults].slice(0, limit);
  },
});

/**
 * Get all contacts for a user.
 */
export const list = query({
  args: {
    userId: v.id("users"),
    sortBy: v.optional(v.union(v.literal("name"), v.literal("email"), v.literal("frequency"), v.literal("recent"))),
  },
  handler: async (ctx, args) => {
    const contacts = await ctx.db
      .query("emailContacts")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const sortBy = args.sortBy || "frequency";

    switch (sortBy) {
      case "name":
        return contacts.sort((a, b) =>
          (a.name || a.email).localeCompare(b.name || b.email)
        );
      case "email":
        return contacts.sort((a, b) => a.email.localeCompare(b.email));
      case "recent":
        return contacts.sort((a, b) => b.lastContactedAt - a.lastContactedAt);
      case "frequency":
      default:
        return contacts.sort((a, b) =>
          (b.sendCount + b.receiveCount) - (a.sendCount + a.receiveCount)
        );
    }
  },
});

/**
 * Get a single contact.
 */
export const get = query({
  args: { contactId: v.id("emailContacts") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.contactId);
  },
});

/**
 * Get contact by email.
 */
export const getByEmail = query({
  args: {
    userId: v.id("users"),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("emailContacts")
      .withIndex("by_user_email", (q) =>
        q.eq("userId", args.userId).eq("email", args.email.toLowerCase())
      )
      .first();
  },
});

// ============ MUTATIONS ============

/**
 * Add or update a contact (called when sending/receiving emails).
 */
export const upsert = mutation({
  args: {
    userId: v.id("users"),
    email: v.string(),
    name: v.optional(v.string()),
    isSending: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const emailLower = args.email.toLowerCase();
    const now = Date.now();

    const existing = await ctx.db
      .query("emailContacts")
      .withIndex("by_user_email", (q) =>
        q.eq("userId", args.userId).eq("email", emailLower)
      )
      .first();

    if (existing) {
      // Update existing contact
      const updates: Record<string, unknown> = {
        lastContactedAt: now,
        updatedAt: now,
      };

      // Increment appropriate count
      if (args.isSending) {
        updates.sendCount = existing.sendCount + 1;
      } else {
        updates.receiveCount = existing.receiveCount + 1;
      }

      // Update name if provided and different
      if (args.name && args.name !== existing.name) {
        updates.name = args.name;
      }

      await ctx.db.patch(existing._id, updates);
      return existing._id;
    }

    // Create new contact
    return await ctx.db.insert("emailContacts", {
      userId: args.userId,
      email: emailLower,
      name: args.name,
      sendCount: args.isSending ? 1 : 0,
      receiveCount: args.isSending ? 0 : 1,
      lastContactedAt: now,
      isFavorite: false,
      isBlocked: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update contact details.
 */
export const update = mutation({
  args: {
    contactId: v.id("emailContacts"),
    userId: v.id("users"),
    name: v.optional(v.string()),
    isFavorite: v.optional(v.boolean()),
    isBlocked: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const contact = await ctx.db.get(args.contactId);
    if (!contact || contact.userId !== args.userId) {
      throw new Error("Contact not found");
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.isFavorite !== undefined) updates.isFavorite = args.isFavorite;
    if (args.isBlocked !== undefined) updates.isBlocked = args.isBlocked;

    await ctx.db.patch(args.contactId, updates);
  },
});

/**
 * Delete a contact.
 */
export const remove = mutation({
  args: {
    contactId: v.id("emailContacts"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const contact = await ctx.db.get(args.contactId);
    if (!contact || contact.userId !== args.userId) {
      throw new Error("Contact not found");
    }

    await ctx.db.delete(args.contactId);
  },
});

/**
 * Batch upsert contacts (from email recipients).
 */
export const batchUpsert = internalMutation({
  args: {
    userId: v.id("users"),
    contacts: v.array(
      v.object({
        email: v.string(),
        name: v.optional(v.string()),
      })
    ),
    isSending: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let added = 0;
    let updated = 0;

    for (const contact of args.contacts) {
      const emailLower = contact.email.toLowerCase();

      const existing = await ctx.db
        .query("emailContacts")
        .withIndex("by_user_email", (q) =>
          q.eq("userId", args.userId).eq("email", emailLower)
        )
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          sendCount: args.isSending ? existing.sendCount + 1 : existing.sendCount,
          receiveCount: args.isSending ? existing.receiveCount : existing.receiveCount + 1,
          lastContactedAt: now,
          updatedAt: now,
          ...(contact.name && contact.name !== existing.name
            ? { name: contact.name }
            : {}),
        });
        updated++;
      } else {
        await ctx.db.insert("emailContacts", {
          userId: args.userId,
          email: emailLower,
          name: contact.name,
          sendCount: args.isSending ? 1 : 0,
          receiveCount: args.isSending ? 0 : 1,
          lastContactedAt: now,
          isFavorite: false,
          isBlocked: false,
          createdAt: now,
          updatedAt: now,
        });
        added++;
      }
    }

    return { added, updated };
  },
});

/**
 * Import contacts from sent emails (background job).
 */
export const importFromSentEmails = internalMutation({
  args: {
    accountId: v.id("emailAccounts"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db.get(args.accountId);
    if (!account) return { imported: 0 };

    // Get sent folder
    const sentFolder = await ctx.db
      .query("emailFolders")
      .withIndex("by_account_type", (q) =>
        q.eq("accountId", args.accountId).eq("type", "sent")
      )
      .first();

    if (!sentFolder) return { imported: 0 };

    // Get recent sent emails
    const emails = await ctx.db
      .query("emails")
      .withIndex("by_folder", (q) => q.eq("folderId", sentFolder._id))
      .order("desc")
      .take(args.limit || 500);

    const contactMap = new Map<string, { email: string; name?: string }>();

    for (const email of emails) {
      // Add all recipients
      for (const recipient of [...email.to, ...(email.cc || []), ...(email.bcc || [])]) {
        const key = recipient.address.toLowerCase();
        if (!contactMap.has(key)) {
          contactMap.set(key, {
            email: recipient.address,
            name: recipient.name,
          });
        }
      }
    }

    // Upsert all contacts
    const now = Date.now();
    let imported = 0;

    for (const contact of contactMap.values()) {
      const emailLower = contact.email.toLowerCase();

      const existing = await ctx.db
        .query("emailContacts")
        .withIndex("by_user_email", (q) =>
          q.eq("userId", account.userId).eq("email", emailLower)
        )
        .first();

      if (!existing) {
        await ctx.db.insert("emailContacts", {
          userId: account.userId,
          email: emailLower,
          name: contact.name,
          sendCount: 1,
          receiveCount: 0,
          lastContactedAt: now,
          isFavorite: false,
          isBlocked: false,
          createdAt: now,
          updatedAt: now,
        });
        imported++;
      }
    }

    return { imported };
  },
});
