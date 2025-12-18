import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ============ QUERIES ============

// Get merits for a personnel
export const listByPersonnel = query({
  args: { personnelId: v.id("personnel") },
  handler: async (ctx, args) => {
    const merits = await ctx.db
      .query("merits")
      .withIndex("by_personnel", (q) => q.eq("personnelId", args.personnelId))
      .collect();

    // Get issuer names
    const meritsWithIssuer = await Promise.all(
      merits.map(async (merit) => {
        const issuer = await ctx.db.get(merit.issuedBy);
        return {
          ...merit,
          issuerName: issuer?.name || "Unknown",
        };
      })
    );

    return meritsWithIssuer.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  },
});

// Get all merits (for admin view)
export const listAll = query({
  args: {
    type: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let merits;

    if (args.type) {
      merits = await ctx.db
        .query("merits")
        .withIndex("by_type", (q) => q.eq("type", args.type!))
        .collect();
    } else {
      merits = await ctx.db.query("merits").collect();
    }

    // Enrich with personnel and issuer names
    const enriched = await Promise.all(
      merits.map(async (merit) => {
        const personnel = await ctx.db.get(merit.personnelId);
        const issuer = await ctx.db.get(merit.issuedBy);
        return {
          ...merit,
          personnelName: personnel
            ? `${personnel.firstName} ${personnel.lastName}`
            : "Unknown",
          issuerName: issuer?.name || "Unknown",
        };
      })
    );

    return enriched.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  },
});

// Get single merit
export const getById = query({
  args: { meritId: v.id("merits") },
  handler: async (ctx, args) => {
    const merit = await ctx.db.get(args.meritId);
    if (!merit) return null;

    const personnel = await ctx.db.get(merit.personnelId);
    const issuer = await ctx.db.get(merit.issuedBy);

    return {
      ...merit,
      personnelName: personnel
        ? `${personnel.firstName} ${personnel.lastName}`
        : "Unknown",
      issuerName: issuer?.name || "Unknown",
    };
  },
});

// Get recent merits (for dashboard)
export const listRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    const merits = await ctx.db.query("merits").collect();

    // Enrich with personnel names
    const enriched = await Promise.all(
      merits.map(async (merit) => {
        const personnel = await ctx.db.get(merit.personnelId);
        return {
          ...merit,
          personnelName: personnel
            ? `${personnel.firstName} ${personnel.lastName}`
            : "Unknown",
        };
      })
    );

    return enriched
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);
  },
});

// ============ MUTATIONS ============

// Create merit
export const create = mutation({
  args: {
    personnelId: v.id("personnel"),
    date: v.string(),
    type: v.string(),
    title: v.string(),
    description: v.string(),
    issuedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const meritId = await ctx.db.insert("merits", {
      personnelId: args.personnelId,
      date: args.date,
      type: args.type,
      title: args.title,
      description: args.description,
      issuedBy: args.issuedBy,
      createdAt: Date.now(),
    });

    return meritId;
  },
});

// Update merit
export const update = mutation({
  args: {
    meritId: v.id("merits"),
    type: v.optional(v.string()),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { meritId, ...updates } = args;

    const updateData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        updateData[key] = value;
      }
    }

    await ctx.db.patch(meritId, updateData);
    return meritId;
  },
});

// Delete merit
export const remove = mutation({
  args: { meritId: v.id("merits") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.meritId);
    return args.meritId;
  },
});
