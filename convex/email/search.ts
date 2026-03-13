/**
 * Email Search
 *
 * Full-text search with filters for emails.
 */

import { v } from "convex/values";
import { query, mutation, internalMutation } from "../_generated/server";

// ============ QUERIES ============

/**
 * Search emails with full-text search and filters.
 */
export const search = query({
  args: {
    accountId: v.id("emailAccounts"),
    query: v.string(),
    filters: v.optional(
      v.object({
        from: v.optional(v.string()),
        to: v.optional(v.string()),
        hasAttachment: v.optional(v.boolean()),
        isRead: v.optional(v.boolean()),
        isStarred: v.optional(v.boolean()),
        dateFrom: v.optional(v.number()),
        dateTo: v.optional(v.number()),
        folderId: v.optional(v.id("emailFolders")),
        labelId: v.optional(v.id("emailLabels")),
      })
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    // Use search index if query is provided
    if (args.query.trim()) {
      const searchResults = await ctx.db
        .query("emailSearchIndex")
        .withSearchIndex("search_emails", (q) =>
          q
            .search("searchText", args.query)
            .eq("accountId", args.accountId)
        )
        .take(limit);

      // Fetch full email objects
      const emails = await Promise.all(
        searchResults.map((r) => ctx.db.get(r.emailId))
      );

      let filtered = emails.filter(Boolean);

      // Apply additional filters
      if (args.filters) {
        if (args.filters.hasAttachment !== undefined) {
          filtered = filtered.filter(
            (e) => e!.hasAttachments === args.filters!.hasAttachment
          );
        }
        if (args.filters.isRead !== undefined) {
          filtered = filtered.filter((e) => e!.isRead === args.filters!.isRead);
        }
        if (args.filters.isStarred !== undefined) {
          filtered = filtered.filter(
            (e) => e!.isStarred === args.filters!.isStarred
          );
        }
        if (args.filters.dateFrom) {
          filtered = filtered.filter((e) => e!.date >= args.filters!.dateFrom!);
        }
        if (args.filters.dateTo) {
          filtered = filtered.filter((e) => e!.date <= args.filters!.dateTo!);
        }
        if (args.filters.folderId) {
          filtered = filtered.filter(
            (e) => e!.folderId === args.filters!.folderId
          );
        }
      }

      return filtered;
    }

    // If no query, just use filters
    let emailsQuery = ctx.db
      .query("emails")
      .withIndex("by_account", (q) => q.eq("accountId", args.accountId));

    const emails = await emailsQuery.take(limit * 2); // Get more to filter

    let filtered = emails;

    if (args.filters) {
      if (args.filters.from) {
        const fromLower = args.filters.from.toLowerCase();
        filtered = filtered.filter(
          (e) =>
            e.from.address.toLowerCase().includes(fromLower) ||
            e.from.name?.toLowerCase().includes(fromLower)
        );
      }
      if (args.filters.to) {
        const toLower = args.filters.to.toLowerCase();
        filtered = filtered.filter((e) =>
          e.to.some(
            (t) =>
              t.address.toLowerCase().includes(toLower) ||
              t.name?.toLowerCase().includes(toLower)
          )
        );
      }
      if (args.filters.hasAttachment !== undefined) {
        filtered = filtered.filter(
          (e) => e.hasAttachments === args.filters!.hasAttachment
        );
      }
      if (args.filters.isRead !== undefined) {
        filtered = filtered.filter((e) => e.isRead === args.filters!.isRead);
      }
      if (args.filters.isStarred !== undefined) {
        filtered = filtered.filter(
          (e) => e.isStarred === args.filters!.isStarred
        );
      }
      if (args.filters.dateFrom) {
        filtered = filtered.filter((e) => e.date >= args.filters!.dateFrom!);
      }
      if (args.filters.dateTo) {
        filtered = filtered.filter((e) => e.date <= args.filters!.dateTo!);
      }
      if (args.filters.folderId) {
        filtered = filtered.filter((e) => e.folderId === args.filters!.folderId);
      }
    }

    return filtered.slice(0, limit).sort((a, b) => b.date - a.date);
  },
});

/**
 * Get recent search queries for autocomplete.
 */
export const getRecentSearches = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // This could be stored in a separate table, but for now return empty
    // In production, you'd store search history
    return [];
  },
});

// ============ MUTATIONS ============

/**
 * Index an email for search.
 */
export const indexEmail = internalMutation({
  args: {
    emailId: v.id("emails"),
  },
  handler: async (ctx, args) => {
    const email = await ctx.db.get(args.emailId);
    if (!email) return;

    // Check if already indexed
    const existing = await ctx.db
      .query("emailSearchIndex")
      .withIndex("by_email", (q) => q.eq("emailId", args.emailId))
      .first();

    if (existing) {
      // Update existing index
      const searchText = buildSearchText(email);
      await ctx.db.patch(existing._id, {
        searchText,
        fromAddress: email.from.address.toLowerCase(),
        toAddresses: email.to.map((t) => t.address.toLowerCase()),
        hasAttachment: email.hasAttachments,
        date: email.date,
      });
    } else {
      // Get account to find user
      const account = await ctx.db.get(email.accountId);
      if (!account) return;

      const searchText = buildSearchText(email);

      await ctx.db.insert("emailSearchIndex", {
        emailId: args.emailId,
        accountId: email.accountId,
        userId: account.userId,
        searchText,
        fromAddress: email.from.address.toLowerCase(),
        toAddresses: email.to.map((t) => t.address.toLowerCase()),
        hasAttachment: email.hasAttachments,
        date: email.date,
        createdAt: Date.now(),
      });
    }
  },
});

/**
 * Remove email from search index.
 */
export const removeFromIndex = internalMutation({
  args: { emailId: v.id("emails") },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("emailSearchIndex")
      .withIndex("by_email", (q) => q.eq("emailId", args.emailId))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

/**
 * Batch index emails for an account.
 */
export const batchIndex = internalMutation({
  args: {
    accountId: v.id("emailAccounts"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db.get(args.accountId);
    if (!account) return { indexed: 0 };

    const emails = await ctx.db
      .query("emails")
      .withIndex("by_account", (q) => q.eq("accountId", args.accountId))
      .take(args.limit || 100);

    let indexed = 0;

    for (const email of emails) {
      const existing = await ctx.db
        .query("emailSearchIndex")
        .withIndex("by_email", (q) => q.eq("emailId", email._id))
        .first();

      if (!existing) {
        const searchText = buildSearchText(email);

        await ctx.db.insert("emailSearchIndex", {
          emailId: email._id,
          accountId: email.accountId,
          userId: account.userId,
          searchText,
          fromAddress: email.from.address.toLowerCase(),
          toAddresses: email.to.map((t) => t.address.toLowerCase()),
          hasAttachment: email.hasAttachments,
          date: email.date,
          createdAt: Date.now(),
        });

        indexed++;
      }
    }

    return { indexed };
  },
});

// ============ HELPERS ============

interface EmailForSearch {
  subject: string;
  from: { name?: string; address: string };
  to: Array<{ name?: string; address: string }>;
  cc?: Array<{ name?: string; address: string }>;
  bodyText?: string;
  snippet: string;
}

function buildSearchText(email: EmailForSearch): string {
  const parts: string[] = [];

  // Subject
  parts.push(email.subject);

  // From
  parts.push(email.from.address);
  if (email.from.name) parts.push(email.from.name);

  // To
  email.to.forEach((t) => {
    parts.push(t.address);
    if (t.name) parts.push(t.name);
  });

  // CC
  if (email.cc) {
    email.cc.forEach((t) => {
      parts.push(t.address);
      if (t.name) parts.push(t.name);
    });
  }

  // Body (limited to prevent huge index)
  if (email.bodyText) {
    parts.push(email.bodyText.slice(0, 5000));
  } else {
    parts.push(email.snippet);
  }

  return parts.join(" ").toLowerCase();
}
