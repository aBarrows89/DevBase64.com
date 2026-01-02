import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all announcements (admin view)
export const getAll = query({
  args: {
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let announcements;

    if (args.includeInactive) {
      announcements = await ctx.db
        .query("announcements")
        .order("desc")
        .collect();
    } else {
      announcements = await ctx.db
        .query("announcements")
        .withIndex("by_active", (q) => q.eq("isActive", true))
        .order("desc")
        .collect();
    }

    // Filter out expired announcements (unless including inactive)
    const now = Date.now();
    if (!args.includeInactive) {
      announcements = announcements.filter(
        (a) => !a.expiresAt || a.expiresAt > now
      );
    }

    // Get read counts
    const enriched = await Promise.all(
      announcements.map(async (announcement) => {
        const reads = await ctx.db
          .query("announcementReads")
          .withIndex("by_announcement", (q) =>
            q.eq("announcementId", announcement._id)
          )
          .collect();

        return {
          ...announcement,
          readCount: reads.length,
        };
      })
    );

    return enriched;
  },
});

// Get active announcements for employees
export const getActive = query({
  args: {
    personnelId: v.optional(v.id("personnel")),
    department: v.optional(v.string()),
    locationId: v.optional(v.id("locations")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    let announcements = await ctx.db
      .query("announcements")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .order("desc")
      .collect();

    // Filter out expired
    announcements = announcements.filter(
      (a) => !a.expiresAt || a.expiresAt > now
    );

    // Filter by targeting
    announcements = announcements.filter((a) => {
      if (a.targetType === "all") return true;

      if (a.targetType === "department" && args.department) {
        return a.targetDepartments?.includes(args.department);
      }

      if (a.targetType === "location" && args.locationId) {
        return a.targetLocationIds?.includes(args.locationId);
      }

      return true;
    });

    // Sort: pinned first, then by priority (urgent first), then by date
    announcements.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      if (a.priority === "urgent" && b.priority !== "urgent") return -1;
      if (a.priority !== "urgent" && b.priority === "urgent") return 1;
      return b.createdAt - a.createdAt;
    });

    // Check read status if personnelId provided
    if (args.personnelId) {
      const enriched = await Promise.all(
        announcements.map(async (announcement) => {
          const read = await ctx.db
            .query("announcementReads")
            .withIndex("by_both", (q) =>
              q
                .eq("announcementId", announcement._id)
                .eq("personnelId", args.personnelId!)
            )
            .first();

          return {
            ...announcement,
            isRead: !!read,
            readAt: read?.readAt,
          };
        })
      );

      return enriched;
    }

    return announcements;
  },
});

// Get unread count for an employee
export const getUnreadCount = query({
  args: {
    personnelId: v.id("personnel"),
    department: v.optional(v.string()),
    locationId: v.optional(v.id("locations")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    let announcements = await ctx.db
      .query("announcements")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Filter out expired
    announcements = announcements.filter(
      (a) => !a.expiresAt || a.expiresAt > now
    );

    // Filter by targeting
    announcements = announcements.filter((a) => {
      if (a.targetType === "all") return true;

      if (a.targetType === "department" && args.department) {
        return a.targetDepartments?.includes(args.department);
      }

      if (a.targetType === "location" && args.locationId) {
        return a.targetLocationIds?.includes(args.locationId);
      }

      return true;
    });

    // Get read announcements
    const reads = await ctx.db
      .query("announcementReads")
      .withIndex("by_personnel", (q) => q.eq("personnelId", args.personnelId))
      .collect();

    const readIds = new Set(reads.map((r) => r.announcementId));

    const unreadCount = announcements.filter(
      (a) => !readIds.has(a._id)
    ).length;

    return unreadCount;
  },
});

// Create an announcement (admin action)
export const create = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    priority: v.string(),
    targetType: v.string(),
    targetDepartments: v.optional(v.array(v.string())),
    targetLocationIds: v.optional(v.array(v.id("locations"))),
    expiresAt: v.optional(v.number()),
    isPinned: v.optional(v.boolean()),
    sendPush: v.optional(v.boolean()),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.createdBy);
    const now = Date.now();

    const announcementId = await ctx.db.insert("announcements", {
      title: args.title,
      content: args.content,
      priority: args.priority,
      targetType: args.targetType,
      targetDepartments: args.targetDepartments,
      targetLocationIds: args.targetLocationIds,
      createdBy: args.createdBy,
      createdByName: user?.name || "Unknown",
      expiresAt: args.expiresAt,
      isPinned: args.isPinned || false,
      isActive: true,
      pushSent: false,
      createdAt: now,
      updatedAt: now,
    });

    // TODO: If sendPush is true, send push notifications to targeted employees
    if (args.sendPush) {
      await ctx.db.patch(announcementId, {
        pushSent: true,
        pushSentAt: now,
      });
    }

    return announcementId;
  },
});

// Update an announcement
export const update = mutation({
  args: {
    announcementId: v.id("announcements"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    priority: v.optional(v.string()),
    targetType: v.optional(v.string()),
    targetDepartments: v.optional(v.array(v.string())),
    targetLocationIds: v.optional(v.array(v.id("locations"))),
    expiresAt: v.optional(v.number()),
    isPinned: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { announcementId, ...updates } = args;

    await ctx.db.patch(announcementId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Delete an announcement
export const remove = mutation({
  args: {
    announcementId: v.id("announcements"),
  },
  handler: async (ctx, args) => {
    // Delete all read receipts first
    const reads = await ctx.db
      .query("announcementReads")
      .withIndex("by_announcement", (q) =>
        q.eq("announcementId", args.announcementId)
      )
      .collect();

    for (const read of reads) {
      await ctx.db.delete(read._id);
    }

    // Delete the announcement
    await ctx.db.delete(args.announcementId);

    return { success: true };
  },
});

// Mark an announcement as read (employee action)
export const markAsRead = mutation({
  args: {
    announcementId: v.id("announcements"),
    personnelId: v.id("personnel"),
  },
  handler: async (ctx, args) => {
    // Check if already read
    const existing = await ctx.db
      .query("announcementReads")
      .withIndex("by_both", (q) =>
        q
          .eq("announcementId", args.announcementId)
          .eq("personnelId", args.personnelId)
      )
      .first();

    if (existing) {
      return { success: true, alreadyRead: true };
    }

    await ctx.db.insert("announcementReads", {
      announcementId: args.announcementId,
      personnelId: args.personnelId,
      readAt: Date.now(),
    });

    return { success: true, alreadyRead: false };
  },
});

// Mark all announcements as read for an employee
export const markAllAsRead = mutation({
  args: {
    personnelId: v.id("personnel"),
    department: v.optional(v.string()),
    locationId: v.optional(v.id("locations")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    let announcements = await ctx.db
      .query("announcements")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Filter out expired
    announcements = announcements.filter(
      (a) => !a.expiresAt || a.expiresAt > now
    );

    // Filter by targeting
    announcements = announcements.filter((a) => {
      if (a.targetType === "all") return true;

      if (a.targetType === "department" && args.department) {
        return a.targetDepartments?.includes(args.department);
      }

      if (a.targetType === "location" && args.locationId) {
        return a.targetLocationIds?.includes(args.locationId);
      }

      return true;
    });

    // Get already read
    const reads = await ctx.db
      .query("announcementReads")
      .withIndex("by_personnel", (q) => q.eq("personnelId", args.personnelId))
      .collect();

    const readIds = new Set(reads.map((r) => r.announcementId));

    // Mark unread as read
    let markedCount = 0;
    for (const announcement of announcements) {
      if (!readIds.has(announcement._id)) {
        await ctx.db.insert("announcementReads", {
          announcementId: announcement._id,
          personnelId: args.personnelId,
          readAt: now,
        });
        markedCount++;
      }
    }

    return { success: true, markedCount };
  },
});

// Get announcement by ID
export const getById = query({
  args: {
    announcementId: v.id("announcements"),
    personnelId: v.optional(v.id("personnel")),
  },
  handler: async (ctx, args) => {
    const announcement = await ctx.db.get(args.announcementId);
    if (!announcement) return null;

    let isRead = false;
    let readAt = null;

    if (args.personnelId) {
      const personnelId = args.personnelId;
      const read = await ctx.db
        .query("announcementReads")
        .withIndex("by_both", (q) =>
          q
            .eq("announcementId", args.announcementId)
            .eq("personnelId", personnelId)
        )
        .first();

      if (read) {
        isRead = true;
        readAt = read.readAt;
      }
    }

    return {
      ...announcement,
      isRead,
      readAt,
    };
  },
});
