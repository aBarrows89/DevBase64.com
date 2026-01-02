import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get audit logs with pagination and filtering
export const getAll = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    actionType: v.optional(v.string()),
    resourceType: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    const offset = args.offset || 0;

    let logs = await ctx.db
      .query("auditLogs")
      .withIndex("by_timestamp")
      .order("desc")
      .collect();

    // Filter by action type
    if (args.actionType && args.actionType !== "all") {
      logs = logs.filter((log) => log.actionType === args.actionType);
    }

    // Filter by resource type
    if (args.resourceType && args.resourceType !== "all") {
      logs = logs.filter((log) => log.resourceType === args.resourceType);
    }

    // Filter by user
    if (args.userId) {
      logs = logs.filter((log) => log.userId === args.userId);
    }

    // Filter by date range
    if (args.startDate) {
      const start = new Date(args.startDate).getTime();
      logs = logs.filter((log) => log.timestamp >= start);
    }
    if (args.endDate) {
      const end = new Date(args.endDate).getTime() + 86400000;
      logs = logs.filter((log) => log.timestamp <= end);
    }

    // Return paginated results
    const totalCount = logs.length;
    const paginatedLogs = logs.slice(offset, offset + limit);

    return {
      logs: paginatedLogs,
      totalCount,
      hasMore: offset + limit < totalCount,
    };
  },
});

// Get distinct action types for filtering
export const getActionTypes = query({
  args: {},
  handler: async (ctx) => {
    const logs = await ctx.db.query("auditLogs").collect();
    const types = [...new Set(logs.map((log) => log.actionType))];
    return types.sort();
  },
});

// Get distinct resource types for filtering
export const getResourceTypes = query({
  args: {},
  handler: async (ctx) => {
    const logs = await ctx.db.query("auditLogs").collect();
    const types = [...new Set(logs.map((log) => log.resourceType))];
    return types.sort();
  },
});

// Get audit logs for a specific resource
export const getByResource = query({
  args: {
    resourceType: v.string(),
    resourceId: v.string(),
  },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("auditLogs")
      .withIndex("by_timestamp")
      .order("desc")
      .collect();

    return logs.filter(
      (log) =>
        log.resourceType === args.resourceType &&
        log.resourceId === args.resourceId
    );
  },
});

// Log an action
export const log = mutation({
  args: {
    action: v.string(),
    actionType: v.string(),
    resourceType: v.string(),
    resourceId: v.string(),
    userId: v.id("users"),
    userEmail: v.string(),
    details: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("auditLogs", {
      action: args.action,
      actionType: args.actionType,
      resourceType: args.resourceType,
      resourceId: args.resourceId,
      userId: args.userId,
      userEmail: args.userEmail,
      details: args.details,
      timestamp: Date.now(),
    });
  },
});

// Get users who have audit entries
export const getUsers = query({
  args: {},
  handler: async (ctx) => {
    const logs = await ctx.db.query("auditLogs").collect();
    const userIds = [...new Set(logs.map((log) => log.userId))];

    const users = await Promise.all(
      userIds.map(async (id) => {
        const user = await ctx.db.get(id);
        return user ? { id: user._id, name: user.name, email: user.email } : null;
      })
    );

    return users.filter(Boolean);
  },
});
