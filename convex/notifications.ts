import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ============ QUERIES ============

// Get all notifications for a user
export const getByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return notifications
      .filter((n) => !n.isDismissed)
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get unread notification count for a user
export const getUnreadCount = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) => q.eq("userId", args.userId).eq("isRead", false))
      .collect();

    return notifications.filter((n) => !n.isDismissed).length;
  },
});

// ============ MUTATIONS ============

// Create a notification
export const create = mutation({
  args: {
    userId: v.id("users"),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    link: v.optional(v.string()),
    relatedPersonnelId: v.optional(v.id("personnel")),
    relatedId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const notificationId = await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.type,
      title: args.title,
      message: args.message,
      link: args.link,
      relatedPersonnelId: args.relatedPersonnelId,
      relatedId: args.relatedId,
      isRead: false,
      isDismissed: false,
      createdAt: Date.now(),
    });

    return notificationId;
  },
});

// Mark notification as read
export const markAsRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.notificationId, { isRead: true });
    return args.notificationId;
  },
});

// Mark all notifications as read for a user
export const markAllAsRead = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) => q.eq("userId", args.userId).eq("isRead", false))
      .collect();

    for (const notification of notifications) {
      await ctx.db.patch(notification._id, { isRead: true });
    }

    return notifications.length;
  },
});

// Dismiss a notification
export const dismiss = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.notificationId, { isDismissed: true });
    return args.notificationId;
  },
});

// Create tenure check-in reminder notifications for managers
// This should be called when creating personnel or on a scheduled basis
export const createTenureCheckInReminders = mutation({
  args: {
    personnelId: v.id("personnel"),
    personnelName: v.string(),
    milestone: v.string(), // "1_day" | "3_day" | "7_day" | "30_day" | "60_day"
    dueDate: v.string(), // Display string for the due date
  },
  handler: async (ctx, args) => {
    // Get all users who are managers/admins
    const users = await ctx.db.query("users").collect();
    const managers = users.filter(
      (u) => u.isActive && ["super_admin", "admin", "department_manager", "warehouse_manager"].includes(u.role)
    );

    const milestoneLabels: Record<string, string> = {
      "1_day": "1 Day",
      "3_day": "3 Day",
      "7_day": "7 Day",
      "30_day": "30 Day",
      "60_day": "60 Day",
    };

    const notificationIds: Id<"notifications">[] = [];

    for (const manager of managers) {
      const notificationId = await ctx.db.insert("notifications", {
        userId: manager._id,
        type: "tenure_check_in",
        title: `${milestoneLabels[args.milestone]} Check-In Due`,
        message: `${args.personnelName}'s ${milestoneLabels[args.milestone]} tenure check-in is due (${args.dueDate})`,
        link: `/personnel/${args.personnelId}`,
        relatedPersonnelId: args.personnelId,
        relatedId: args.milestone,
        isRead: false,
        isDismissed: false,
        createdAt: Date.now(),
      });
      notificationIds.push(notificationId);
    }

    return notificationIds;
  },
});

// Dismiss tenure check-in notifications when the check-in is completed
export const dismissTenureCheckInNotifications = mutation({
  args: {
    personnelId: v.id("personnel"),
    milestone: v.string(),
  },
  handler: async (ctx, args) => {
    // Find all notifications for this personnel and milestone
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_type", (q) => q.eq("type", "tenure_check_in"))
      .collect();

    const toUpdate = notifications.filter(
      (n) =>
        n.relatedPersonnelId === args.personnelId &&
        n.relatedId === args.milestone &&
        !n.isDismissed
    );

    for (const notification of toUpdate) {
      await ctx.db.patch(notification._id, { isDismissed: true, isRead: true });
    }

    return toUpdate.length;
  },
});
