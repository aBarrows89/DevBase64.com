import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ============ QUERIES ============

// Get user's log for a specific date
export const getByDate = query({
  args: {
    userId: v.id("users"),
    date: v.string(), // "YYYY-MM-DD"
  },
  handler: async (ctx, args) => {
    const log = await ctx.db
      .query("dailyLogs")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", args.userId).eq("date", args.date)
      )
      .first();

    return log;
  },
});

// Get logs for a date range (for a specific user)
export const getByDateRange = query({
  args: {
    userId: v.id("users"),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("dailyLogs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Filter by date range
    return logs
      .filter((log) => log.date >= args.startDate && log.date <= args.endDate)
      .sort((a, b) => b.date.localeCompare(a.date));
  },
});

// Get recent logs for current user
export const getMyLogs = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 14; // Default to 2 weeks

    const logs = await ctx.db
      .query("dailyLogs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);

    return logs;
  },
});

// Get all recent submitted logs (for admin view)
export const getAllRecentLogs = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const allLogs = await ctx.db
      .query("dailyLogs")
      .withIndex("by_date")
      .order("desc")
      .collect();

    // Only return submitted logs, limited
    return allLogs
      .filter((log) => log.isSubmitted)
      .slice(0, args.limit || 50);
  },
});

// Get all logs including drafts (for admin real-time view)
export const getAllLogsIncludingDrafts = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const allLogs = await ctx.db
      .query("dailyLogs")
      .withIndex("by_date")
      .order("desc")
      .collect();

    // Return all logs (both submitted and drafts), limited
    return allLogs.slice(0, args.limit || 50);
  },
});

// Get today's live activity for users who require daily logs (for admin dashboard)
export const getTodayLiveActivity = query({
  args: {},
  handler: async (ctx) => {
    const today = new Date().toISOString().split("T")[0];
    const startOfDay = new Date(today + "T00:00:00Z").getTime();
    const endOfDay = new Date(today + "T23:59:59Z").getTime();

    // Get all users who require daily logs
    const usersWithDailyLog = await ctx.db
      .query("users")
      .collect();

    const dailyLogUsers = usersWithDailyLog.filter(u => u.requiresDailyLog === true);

    // For each user, get their audit log activity for today
    const results = await Promise.all(
      dailyLogUsers.map(async (user) => {
        // Get audit logs for this user today
        const userAuditLogs = await ctx.db
          .query("auditLogs")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .filter((q) =>
            q.and(
              q.gte(q.field("timestamp"), startOfDay),
              q.lte(q.field("timestamp"), endOfDay)
            )
          )
          .collect();

        // Count different types of activities
        const projectsCreated = userAuditLogs.filter(
          (log) => log.resourceType === "project" && log.actionType === "create"
        ).length;
        const projectsMoved = userAuditLogs.filter(
          (log) =>
            log.resourceType === "project" &&
            log.actionType === "update" &&
            (log.action?.includes("status") || log.details?.includes("status"))
        ).length;
        const tasksCompleted = userAuditLogs.filter(
          (log) =>
            log.resourceType === "task" &&
            (log.details?.toLowerCase().includes("done") ||
              log.details?.toLowerCase().includes("completed"))
        ).length;

        // Get today's daily log draft/submission
        const todayLog = await ctx.db
          .query("dailyLogs")
          .withIndex("by_user_date", (q) =>
            q.eq("userId", user._id).eq("date", today)
          )
          .first();

        // Get recent activity details (last 10 actions)
        const recentActions = userAuditLogs
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 10)
          .map((log) => ({
            action: log.action,
            details: log.details,
            timestamp: log.timestamp,
            resourceType: log.resourceType,
          }));

        return {
          userId: user._id,
          userName: user.name,
          email: user.email,
          activity: {
            projectsCreated,
            projectsMoved,
            tasksCompleted,
            totalActions: userAuditLogs.length,
          },
          recentActions,
          todayLog: todayLog
            ? {
                _id: todayLog._id,
                summary: todayLog.summary,
                accomplishments: todayLog.accomplishments,
                blockers: todayLog.blockers,
                goalsForTomorrow: todayLog.goalsForTomorrow,
                hoursWorked: todayLog.hoursWorked,
                isSubmitted: todayLog.isSubmitted,
                updatedAt: todayLog.updatedAt,
              }
            : null,
        };
      })
    );

    return results;
  },
});

// Get weekly overview for all users (for stakeholder report)
export const getWeeklyOverview = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all logs in the date range
    const allLogs = await ctx.db
      .query("dailyLogs")
      .withIndex("by_date")
      .collect();

    const filteredLogs = allLogs.filter(
      (log) =>
        log.date >= args.startDate &&
        log.date <= args.endDate &&
        log.isSubmitted
    );

    // Group by user
    const byUser = new Map<
      string,
      {
        userId: Id<"users">;
        userName: string;
        logs: typeof filteredLogs;
        totalHours: number;
        totalAccomplishments: number;
        daysLogged: number;
        blockers: string[];
      }
    >();

    for (const log of filteredLogs) {
      const existing = byUser.get(log.userId);
      if (existing) {
        existing.logs.push(log);
        existing.totalHours += log.hoursWorked || 0;
        existing.totalAccomplishments += log.accomplishments.length;
        existing.daysLogged++;
        if (log.blockers) {
          existing.blockers.push(`${log.date}: ${log.blockers}`);
        }
      } else {
        byUser.set(log.userId, {
          userId: log.userId,
          userName: log.userName,
          logs: [log],
          totalHours: log.hoursWorked || 0,
          totalAccomplishments: log.accomplishments.length,
          daysLogged: 1,
          blockers: log.blockers ? [`${log.date}: ${log.blockers}`] : [],
        });
      }
    }

    // Calculate totals
    const userSummaries = Array.from(byUser.values()).sort((a, b) =>
      a.userName.localeCompare(b.userName)
    );

    const totals = {
      totalLogs: filteredLogs.length,
      totalHours: userSummaries.reduce((sum, u) => sum + u.totalHours, 0),
      totalAccomplishments: userSummaries.reduce(
        (sum, u) => sum + u.totalAccomplishments,
        0
      ),
      uniqueUsers: userSummaries.length,
    };

    return {
      startDate: args.startDate,
      endDate: args.endDate,
      totals,
      userSummaries,
    };
  },
});

// Get users who haven't submitted today's log (for admins)
export const getPendingUsers = query({
  args: {
    date: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all users who require daily logs
    const users = await ctx.db
      .query("users")
      .filter((q) =>
        q.and(q.eq(q.field("isActive"), true), q.eq(q.field("requiresDailyLog"), true))
      )
      .collect();

    // Get all logs for this date
    const logsToday = await ctx.db
      .query("dailyLogs")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .collect();

    const submittedUserIds = new Set(
      logsToday.filter((l) => l.isSubmitted).map((l) => l.userId)
    );

    // Return users who haven't submitted
    return users
      .filter((u) => !submittedUserIds.has(u._id))
      .map((u) => ({
        _id: u._id,
        name: u.name,
        email: u.email,
      }));
  },
});

// Get auto-activities from audit logs for a user on a specific date
export const getAutoActivities = query({
  args: {
    userId: v.id("users"),
    date: v.string(), // "YYYY-MM-DD"
  },
  handler: async (ctx, args) => {
    // Calculate timestamp range for the date
    const startOfDay = new Date(args.date + "T00:00:00").getTime();
    const endOfDay = new Date(args.date + "T23:59:59.999").getTime();

    // Query audit logs for this user and date
    const auditLogs = await ctx.db
      .query("auditLogs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const todaysLogs = auditLogs.filter(
      (log) => log.timestamp >= startOfDay && log.timestamp <= endOfDay
    );

    // Count activities
    const projectsCreated = todaysLogs.filter(
      (l) => l.resourceType === "project" && l.actionType === "create"
    ).length;

    const projectsMoved = todaysLogs.filter(
      (l) =>
        l.resourceType === "project" &&
        l.actionType === "update" &&
        l.action.toLowerCase().includes("status")
    ).length;

    const tasksCompleted = todaysLogs.filter(
      (l) =>
        l.resourceType === "task" &&
        l.actionType === "update" &&
        l.details.toLowerCase().includes("done")
    ).length;

    return {
      projectsCreated,
      projectsMoved,
      tasksCompleted,
      totalActions: todaysLogs.length,
    };
  },
});

// ============ MUTATIONS ============

// Create a new daily log
export const create = mutation({
  args: {
    userId: v.id("users"),
    date: v.string(),
    summary: v.string(),
    accomplishments: v.array(v.string()),
    blockers: v.optional(v.string()),
    goalsForTomorrow: v.optional(v.string()),
    hoursWorked: v.optional(v.number()),
    projectIds: v.optional(v.array(v.id("projects"))),
    isSubmitted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Check if log already exists for this date
    const existing = await ctx.db
      .query("dailyLogs")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", args.userId).eq("date", args.date)
      )
      .first();

    if (existing) {
      throw new Error("A log already exists for this date. Use update instead.");
    }

    // Get user name
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    // Get auto-activities from audit logs
    const startOfDay = new Date(args.date + "T00:00:00").getTime();
    const endOfDay = new Date(args.date + "T23:59:59.999").getTime();

    const auditLogs = await ctx.db
      .query("auditLogs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const todaysLogs = auditLogs.filter(
      (log) => log.timestamp >= startOfDay && log.timestamp <= endOfDay
    );

    const autoActivities = {
      projectsCreated: todaysLogs.filter(
        (l) => l.resourceType === "project" && l.actionType === "create"
      ).length,
      projectsMoved: todaysLogs.filter(
        (l) =>
          l.resourceType === "project" &&
          l.actionType === "update" &&
          l.action.toLowerCase().includes("status")
      ).length,
      tasksCompleted: todaysLogs.filter(
        (l) =>
          l.resourceType === "task" &&
          l.actionType === "update" &&
          l.details.toLowerCase().includes("done")
      ).length,
      totalActions: todaysLogs.length,
    };

    const now = Date.now();

    const logId = await ctx.db.insert("dailyLogs", {
      userId: args.userId,
      userName: user.name,
      date: args.date,
      summary: args.summary,
      accomplishments: args.accomplishments,
      blockers: args.blockers,
      goalsForTomorrow: args.goalsForTomorrow,
      hoursWorked: args.hoursWorked,
      projectIds: args.projectIds,
      autoActivities,
      createdAt: now,
      updatedAt: now,
      isSubmitted: args.isSubmitted || false,
    });

    return logId;
  },
});

// Update an existing daily log
export const update = mutation({
  args: {
    logId: v.id("dailyLogs"),
    summary: v.optional(v.string()),
    accomplishments: v.optional(v.array(v.string())),
    blockers: v.optional(v.string()),
    goalsForTomorrow: v.optional(v.string()),
    hoursWorked: v.optional(v.number()),
    projectIds: v.optional(v.array(v.id("projects"))),
  },
  handler: async (ctx, args) => {
    const log = await ctx.db.get(args.logId);
    if (!log) throw new Error("Log not found");

    if (log.isSubmitted) {
      throw new Error("Cannot edit a submitted log");
    }

    const { logId, ...updates } = args;

    // Filter out undefined values
    const filteredUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    filteredUpdates.updatedAt = Date.now();

    await ctx.db.patch(logId, filteredUpdates);
    return logId;
  },
});

// Submit a log (locks it from further editing)
export const submit = mutation({
  args: {
    logId: v.id("dailyLogs"),
  },
  handler: async (ctx, args) => {
    const log = await ctx.db.get(args.logId);
    if (!log) throw new Error("Log not found");

    if (log.isSubmitted) {
      throw new Error("Log is already submitted");
    }

    // Refresh auto-activities on submit
    const startOfDay = new Date(log.date + "T00:00:00").getTime();
    const endOfDay = new Date(log.date + "T23:59:59.999").getTime();

    const auditLogs = await ctx.db
      .query("auditLogs")
      .withIndex("by_user", (q) => q.eq("userId", log.userId))
      .collect();

    const todaysLogs = auditLogs.filter(
      (l) => l.timestamp >= startOfDay && l.timestamp <= endOfDay
    );

    const autoActivities = {
      projectsCreated: todaysLogs.filter(
        (l) => l.resourceType === "project" && l.actionType === "create"
      ).length,
      projectsMoved: todaysLogs.filter(
        (l) =>
          l.resourceType === "project" &&
          l.actionType === "update" &&
          l.action.toLowerCase().includes("status")
      ).length,
      tasksCompleted: todaysLogs.filter(
        (l) =>
          l.resourceType === "task" &&
          l.actionType === "update" &&
          l.details.toLowerCase().includes("done")
      ).length,
      totalActions: todaysLogs.length,
    };

    await ctx.db.patch(args.logId, {
      isSubmitted: true,
      autoActivities,
      updatedAt: Date.now(),
    });

    return args.logId;
  },
});

// Delete a draft log (only if not submitted)
export const remove = mutation({
  args: {
    logId: v.id("dailyLogs"),
  },
  handler: async (ctx, args) => {
    const log = await ctx.db.get(args.logId);
    if (!log) throw new Error("Log not found");

    if (log.isSubmitted) {
      throw new Error("Cannot delete a submitted log");
    }

    await ctx.db.delete(args.logId);
    return args.logId;
  },
});

// Create or update a log (upsert functionality)
export const saveLog = mutation({
  args: {
    userId: v.id("users"),
    date: v.string(),
    summary: v.string(),
    accomplishments: v.array(v.string()),
    blockers: v.optional(v.string()),
    goalsForTomorrow: v.optional(v.string()),
    hoursWorked: v.optional(v.number()),
    projectIds: v.optional(v.array(v.id("projects"))),
    isSubmitted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Check if log already exists
    const existing = await ctx.db
      .query("dailyLogs")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", args.userId).eq("date", args.date)
      )
      .first();

    if (existing) {
      if (existing.isSubmitted && !args.isSubmitted) {
        throw new Error("Cannot edit a submitted log");
      }

      // Update existing
      await ctx.db.patch(existing._id, {
        summary: args.summary,
        accomplishments: args.accomplishments,
        blockers: args.blockers,
        goalsForTomorrow: args.goalsForTomorrow,
        hoursWorked: args.hoursWorked,
        projectIds: args.projectIds,
        isSubmitted: args.isSubmitted || existing.isSubmitted,
        updatedAt: Date.now(),
      });

      // If submitting, refresh auto-activities
      if (args.isSubmitted && !existing.isSubmitted) {
        const startOfDay = new Date(args.date + "T00:00:00").getTime();
        const endOfDay = new Date(args.date + "T23:59:59.999").getTime();

        const auditLogs = await ctx.db
          .query("auditLogs")
          .withIndex("by_user", (q) => q.eq("userId", args.userId))
          .collect();

        const todaysLogs = auditLogs.filter(
          (log) => log.timestamp >= startOfDay && log.timestamp <= endOfDay
        );

        const autoActivities = {
          projectsCreated: todaysLogs.filter(
            (l) => l.resourceType === "project" && l.actionType === "create"
          ).length,
          projectsMoved: todaysLogs.filter(
            (l) =>
              l.resourceType === "project" &&
              l.actionType === "update" &&
              l.action.toLowerCase().includes("status")
          ).length,
          tasksCompleted: todaysLogs.filter(
            (l) =>
              l.resourceType === "task" &&
              l.actionType === "update" &&
              l.details.toLowerCase().includes("done")
          ).length,
          totalActions: todaysLogs.length,
        };

        await ctx.db.patch(existing._id, { autoActivities });
      }

      return existing._id;
    }

    // Create new
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    // Get auto-activities
    const startOfDay = new Date(args.date + "T00:00:00").getTime();
    const endOfDay = new Date(args.date + "T23:59:59.999").getTime();

    const auditLogs = await ctx.db
      .query("auditLogs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const todaysLogs = auditLogs.filter(
      (log) => log.timestamp >= startOfDay && log.timestamp <= endOfDay
    );

    const autoActivities = {
      projectsCreated: todaysLogs.filter(
        (l) => l.resourceType === "project" && l.actionType === "create"
      ).length,
      projectsMoved: todaysLogs.filter(
        (l) =>
          l.resourceType === "project" &&
          l.actionType === "update" &&
          l.action.toLowerCase().includes("status")
      ).length,
      tasksCompleted: todaysLogs.filter(
        (l) =>
          l.resourceType === "task" &&
          l.actionType === "update" &&
          l.details.toLowerCase().includes("done")
      ).length,
      totalActions: todaysLogs.length,
    };

    const now = Date.now();

    const logId = await ctx.db.insert("dailyLogs", {
      userId: args.userId,
      userName: user.name,
      date: args.date,
      summary: args.summary,
      accomplishments: args.accomplishments,
      blockers: args.blockers,
      goalsForTomorrow: args.goalsForTomorrow,
      hoursWorked: args.hoursWorked,
      projectIds: args.projectIds,
      autoActivities,
      createdAt: now,
      updatedAt: now,
      isSubmitted: args.isSubmitted || false,
    });

    return logId;
  },
});

// Add or update reviewer comment on a daily log
// This comment is NOT visible to the submitter, only shown on printed reports
export const addReviewerComment = mutation({
  args: {
    logId: v.id("dailyLogs"),
    reviewerId: v.id("users"),
    comment: v.string(),
  },
  handler: async (ctx, args) => {
    const log = await ctx.db.get(args.logId);
    if (!log) throw new Error("Log not found");

    const reviewer = await ctx.db.get(args.reviewerId);
    if (!reviewer) throw new Error("Reviewer not found");

    await ctx.db.patch(args.logId, {
      reviewerComment: args.comment || undefined,
      reviewerCommentBy: args.comment ? args.reviewerId : undefined,
      reviewerCommentByName: args.comment ? reviewer.name : undefined,
      reviewerCommentAt: args.comment ? Date.now() : undefined,
    });

    return { success: true };
  },
});
