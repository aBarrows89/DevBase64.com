import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all projects
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_created")
      .order("desc")
      .collect();
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
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.projectId, {
      status: args.status,
      updatedAt: Date.now(),
    });
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
