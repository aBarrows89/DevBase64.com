import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Get all projects with task counts (excludes archived by default)
export const getAll = query({
  args: {
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let projects = await ctx.db
      .query("projects")
      .withIndex("by_created")
      .order("desc")
      .collect();

    // Filter out archived unless explicitly requested
    if (!args.includeArchived) {
      projects = projects.filter((p) => p.status !== "archived");
    }

    // Get task counts for each project
    const projectsWithTaskCounts = await Promise.all(
      projects.map(async (project) => {
        const tasks = await ctx.db
          .query("tasks")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .collect();

        const taskCount = tasks.length;
        const completedTaskCount = tasks.filter((t) => t.status === "done").length;

        return {
          ...project,
          taskCount,
          completedTaskCount,
        };
      })
    );

    return projectsWithTaskCounts;
  },
});

// Get projects by status (for Kanban columns)
export const getByStatus = query({
  args: { status: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .collect();
  },
});

// Get single project
export const getById = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.projectId);
  },
});

// Create project
export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    status: v.string(),
    priority: v.string(),
    createdBy: v.id("users"),
    assignedTo: v.optional(v.id("users")),
    estimatedHours: v.optional(v.number()),
    dueDate: v.optional(v.string()),
    repositoryId: v.optional(v.id("repositories")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const projectId = await ctx.db.insert("projects", {
      ...args,
      actualHours: undefined,
      aiGeneratedSteps: undefined,
      aiTimelineAnalysis: undefined,
      createdAt: now,
      updatedAt: now,
    });

    // Log the creation
    const creator = await ctx.db.get(args.createdBy);
    if (creator) {
      await ctx.db.insert("auditLogs", {
        action: "Created project",
        actionType: "create",
        resourceType: "project",
        resourceId: projectId,
        userId: args.createdBy,
        userEmail: creator.email,
        details: `Created project "${args.name}"`,
        timestamp: now,
      });
    }

    return projectId;
  },
});

// Update project
export const update = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.string()),
    priority: v.optional(v.string()),
    assignedTo: v.optional(v.id("users")),
    estimatedHours: v.optional(v.number()),
    actualHours: v.optional(v.number()),
    dueDate: v.optional(v.string()),
    aiGeneratedSteps: v.optional(v.string()),
    aiTimelineAnalysis: v.optional(
      v.object({
        estimatedCompletion: v.string(),
        isOnSchedule: v.boolean(),
        behindByDays: v.optional(v.number()),
        confidence: v.number(),
        reasoning: v.string(),
      })
    ),
    repositoryId: v.optional(v.id("repositories")),
  },
  handler: async (ctx, args) => {
    const { projectId, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(projectId, {
      ...filtered,
      updatedAt: Date.now(),
    });
  },
});

// Update project status (for drag-drop)
export const updateStatus = mutation({
  args: {
    projectId: v.id("projects"),
    status: v.string(),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const project = await ctx.db.get(args.projectId);
    if (!project) return;

    const oldStatus = project.status;
    const updates: Record<string, unknown> = {
      status: args.status,
      updatedAt: now,
    };

    // Set doneAt when moving to done status
    if (args.status === "done" && project.status !== "done") {
      updates.doneAt = now;
    }

    // Clear doneAt if moving out of done status (unless archiving)
    if (args.status !== "done" && args.status !== "archived" && project.doneAt) {
      updates.doneAt = undefined;
    }

    // Set archivedAt when archiving
    if (args.status === "archived" && project.status !== "archived") {
      updates.archivedAt = now;
    }

    await ctx.db.patch(args.projectId, updates);

    // Log the status change
    if (args.userId) {
      const user = await ctx.db.get(args.userId);
      if (user) {
        await ctx.db.insert("auditLogs", {
          action: "Updated project status",
          actionType: "update",
          resourceType: "project",
          resourceId: args.projectId,
          userId: args.userId,
          userEmail: user.email,
          details: `Changed "${project.name}" from ${oldStatus} to ${args.status}`,
          timestamp: now,
        });
      }
    }
  },
});

// Archive a project manually
export const archive = mutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.projectId, {
      status: "archived",
      archivedAt: now,
      updatedAt: now,
    });
  },
});

// Unarchive a project (restore to done status)
export const unarchive = mutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.projectId, {
      status: "done",
      archivedAt: undefined,
      updatedAt: now,
    });
  },
});

// Auto-archive projects that have been done for 1+ week (called by cron)
export const autoArchiveOldDoneProjects = internalMutation({
  args: {},
  handler: async (ctx) => {
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

    const doneProjects = await ctx.db
      .query("projects")
      .withIndex("by_status", (q) => q.eq("status", "done"))
      .collect();

    let archivedCount = 0;
    const now = Date.now();

    for (const project of doneProjects) {
      // Archive if doneAt is more than 1 week ago
      if (project.doneAt && project.doneAt < oneWeekAgo) {
        await ctx.db.patch(project._id, {
          status: "archived",
          archivedAt: now,
          updatedAt: now,
        });
        archivedCount++;
      }
    }

    return { archivedCount };
  },
});

// Delete project
export const remove = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    // Delete associated tasks first
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    for (const task of tasks) {
      await ctx.db.delete(task._id);
    }

    await ctx.db.delete(args.projectId);
  },
});

// Get projects with tasks
export const getWithTasks = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) return null;

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    return { ...project, tasks };
  },
});

// Get project statistics
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const allProjects = await ctx.db.query("projects").collect();

    const now = Date.now();
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);

    // Count by status
    const byStatus = {
      backlog: 0,
      in_progress: 0,
      review: 0,
      done: 0,
      archived: 0,
    };

    // Time-based stats
    let completedThisWeek = 0;
    let completedThisMonth = 0;
    let archivedTotal = 0;
    let createdThisWeek = 0;

    for (const project of allProjects) {
      // Count by status
      if (project.status in byStatus) {
        byStatus[project.status as keyof typeof byStatus]++;
      }

      // Completed this week (moved to done in last 7 days)
      if (project.doneAt && project.doneAt >= oneWeekAgo) {
        completedThisWeek++;
      }

      // Completed this month
      if (project.doneAt && project.doneAt >= oneMonthAgo) {
        completedThisMonth++;
      }

      // Archived total
      if (project.status === "archived") {
        archivedTotal++;
      }

      // Created this week
      if (project.createdAt >= oneWeekAgo) {
        createdThisWeek++;
      }
    }

    // Calculate active projects (not archived)
    const activeProjects = allProjects.filter((p) => p.status !== "archived").length;

    return {
      byStatus,
      completedThisWeek,
      completedThisMonth,
      archivedTotal,
      createdThisWeek,
      activeProjects,
      totalProjects: allProjects.length,
    };
  },
});

// Get archived projects
export const getArchived = query({
  args: {},
  handler: async (ctx) => {
    const archived = await ctx.db
      .query("projects")
      .withIndex("by_status", (q) => q.eq("status", "archived"))
      .order("desc")
      .collect();

    return archived;
  },
});
