import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Helper to check if a write-up is expired (90 days from date)
function isWriteUpExpired(date: string): boolean {
  const writeUpDate = new Date(date);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - writeUpDate.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays >= 90;
}

// ============ QUERIES ============

// Get write-ups for a personnel
export const listByPersonnel = query({
  args: { personnelId: v.id("personnel") },
  handler: async (ctx, args) => {
    const writeUps = await ctx.db
      .query("writeUps")
      .withIndex("by_personnel", (q) => q.eq("personnelId", args.personnelId))
      .collect();

    // Get issuer names and calculate archive status
    const writeUpsWithIssuer = await Promise.all(
      writeUps.map(async (writeUp) => {
        const issuer = await ctx.db.get(writeUp.issuedBy);
        const expired = isWriteUpExpired(writeUp.date);
        return {
          ...writeUp,
          issuerName: issuer?.name || "Unknown",
          // isArchived is true if manually archived OR if 90 days have passed
          isArchived: writeUp.isArchived || expired,
          // Track if it's auto-expired vs manually archived
          isExpired: expired,
        };
      })
    );

    return writeUpsWithIssuer.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  },
});

// Get all write-ups (for admin view)
export const listAll = query({
  args: {
    severity: v.optional(v.string()),
    includeArchived: v.optional(v.boolean()), // Default false - only show active write-ups
  },
  handler: async (ctx, args) => {
    let writeUps;

    if (args.severity) {
      writeUps = await ctx.db
        .query("writeUps")
        .withIndex("by_severity", (q) => q.eq("severity", args.severity!))
        .collect();
    } else {
      writeUps = await ctx.db.query("writeUps").collect();
    }

    // Enrich with personnel and issuer names and archive status
    const enriched = await Promise.all(
      writeUps.map(async (writeUp) => {
        const personnel = await ctx.db.get(writeUp.personnelId);
        const issuer = await ctx.db.get(writeUp.issuedBy);
        const expired = isWriteUpExpired(writeUp.date);
        return {
          ...writeUp,
          personnelName: personnel
            ? `${personnel.firstName} ${personnel.lastName}`
            : "Unknown",
          issuerName: issuer?.name || "Unknown",
          isArchived: writeUp.isArchived || expired,
          isExpired: expired,
        };
      })
    );

    // Filter out archived unless requested
    const filtered = args.includeArchived
      ? enriched
      : enriched.filter(w => !w.isArchived);

    return filtered.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  },
});

// Get single write-up
export const getById = query({
  args: { writeUpId: v.id("writeUps") },
  handler: async (ctx, args) => {
    const writeUp = await ctx.db.get(args.writeUpId);
    if (!writeUp) return null;

    const personnel = await ctx.db.get(writeUp.personnelId);
    const issuer = await ctx.db.get(writeUp.issuedBy);

    return {
      ...writeUp,
      personnelName: personnel
        ? `${personnel.firstName} ${personnel.lastName}`
        : "Unknown",
      issuerName: issuer?.name || "Unknown",
    };
  },
});

// Get write-ups requiring follow-up
export const listPendingFollowUps = query({
  handler: async (ctx) => {
    const writeUps = await ctx.db.query("writeUps").collect();

    const pending = writeUps.filter(
      (w) => w.followUpRequired && !w.followUpNotes
    );

    const enriched = await Promise.all(
      pending.map(async (writeUp) => {
        const personnel = await ctx.db.get(writeUp.personnelId);
        return {
          ...writeUp,
          personnelName: personnel
            ? `${personnel.firstName} ${personnel.lastName}`
            : "Unknown",
        };
      })
    );

    return enriched.sort(
      (a, b) =>
        new Date(a.followUpDate || a.date).getTime() -
        new Date(b.followUpDate || b.date).getTime()
    );
  },
});

// ============ MUTATIONS ============

// Create write-up
export const create = mutation({
  args: {
    personnelId: v.id("personnel"),
    date: v.string(),
    category: v.string(),
    severity: v.string(),
    description: v.string(),
    actionTaken: v.optional(v.string()),
    followUpRequired: v.boolean(),
    followUpDate: v.optional(v.string()),
    issuedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const writeUpId = await ctx.db.insert("writeUps", {
      personnelId: args.personnelId,
      date: args.date,
      category: args.category,
      severity: args.severity,
      description: args.description,
      actionTaken: args.actionTaken,
      followUpRequired: args.followUpRequired,
      followUpDate: args.followUpDate,
      issuedBy: args.issuedBy,
      createdAt: Date.now(),
    });

    return writeUpId;
  },
});

// Update write-up
export const update = mutation({
  args: {
    writeUpId: v.id("writeUps"),
    category: v.optional(v.string()),
    severity: v.optional(v.string()),
    description: v.optional(v.string()),
    actionTaken: v.optional(v.string()),
    followUpRequired: v.optional(v.boolean()),
    followUpDate: v.optional(v.string()),
    followUpNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { writeUpId, ...updates } = args;

    const updateData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        updateData[key] = value;
      }
    }

    await ctx.db.patch(writeUpId, updateData);
    return writeUpId;
  },
});

// Mark write-up as acknowledged
export const acknowledge = mutation({
  args: { writeUpId: v.id("writeUps") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.writeUpId, {
      acknowledgedAt: Date.now(),
    });
    return args.writeUpId;
  },
});

// Add follow-up notes
export const addFollowUpNotes = mutation({
  args: {
    writeUpId: v.id("writeUps"),
    followUpNotes: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.writeUpId, {
      followUpNotes: args.followUpNotes,
    });
    return args.writeUpId;
  },
});

// Delete write-up
export const remove = mutation({
  args: { writeUpId: v.id("writeUps") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.writeUpId);
    return args.writeUpId;
  },
});
