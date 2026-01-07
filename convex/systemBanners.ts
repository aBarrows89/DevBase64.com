import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get active banners
export const getActive = query({
  handler: async (ctx) => {
    const now = Date.now();

    const banners = await ctx.db
      .query("systemBanners")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Filter out expired banners
    const active = banners.filter(
      (b) => !b.expiresAt || b.expiresAt > now
    );

    return active;
  },
});

// Get all banners (for admin)
export const getAll = query({
  handler: async (ctx) => {
    const banners = await ctx.db.query("systemBanners").collect();

    // Enrich with creator name
    const enriched = await Promise.all(
      banners.map(async (banner) => {
        const creator = await ctx.db.get(banner.createdBy);
        return {
          ...banner,
          createdByName: creator?.name || "Unknown",
        };
      })
    );

    return enriched.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Create a new banner
export const create = mutation({
  args: {
    message: v.string(),
    type: v.string(),
    showOnMobile: v.boolean(),
    showOnDesktop: v.boolean(),
    dismissible: v.boolean(),
    linkUrl: v.optional(v.string()),
    linkText: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const bannerId = await ctx.db.insert("systemBanners", {
      message: args.message,
      type: args.type,
      isActive: true,
      showOnMobile: args.showOnMobile,
      showOnDesktop: args.showOnDesktop,
      dismissible: args.dismissible,
      linkUrl: args.linkUrl,
      linkText: args.linkText,
      expiresAt: args.expiresAt,
      createdBy: args.userId,
      createdAt: now,
      updatedAt: now,
    });

    return bannerId;
  },
});

// Update a banner
export const update = mutation({
  args: {
    bannerId: v.id("systemBanners"),
    message: v.optional(v.string()),
    type: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    showOnMobile: v.optional(v.boolean()),
    showOnDesktop: v.optional(v.boolean()),
    dismissible: v.optional(v.boolean()),
    linkUrl: v.optional(v.string()),
    linkText: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { bannerId, ...updates } = args;

    // Filter out undefined values
    const cleanUpdates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }

    await ctx.db.patch(bannerId, cleanUpdates);
    return bannerId;
  },
});

// Toggle banner active state
export const toggle = mutation({
  args: {
    bannerId: v.id("systemBanners"),
  },
  handler: async (ctx, args) => {
    const banner = await ctx.db.get(args.bannerId);
    if (!banner) throw new Error("Banner not found");

    await ctx.db.patch(args.bannerId, {
      isActive: !banner.isActive,
      updatedAt: Date.now(),
    });

    return !banner.isActive;
  },
});

// Delete a banner
export const remove = mutation({
  args: {
    bannerId: v.id("systemBanners"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.bannerId);
    return true;
  },
});
