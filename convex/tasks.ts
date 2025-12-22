import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new task
export const create = mutation({
  args: {
    projectId: v.id("projects"),
    title: v.string(),
    description: v.optional(v.string()),
    estimatedMinutes: v.optional(v.number()),
    assignedTo: v.optional(v.id("users")),
    dueDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get the current highest order for this project
    const existingTasks = await ctx.db
      .query("tasks")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    const maxOrder = existingTasks.reduce((max, task) => Math.max(max, task.order), -1);

    const taskId = await ctx.db.insert("tasks", {
      projectId: args.projectId,
      title: args.title,
      description: args.description,
      status: "todo",
      order: maxOrder + 1,
      estimatedMinutes: args.estimatedMinutes,
      assignedTo: args.assignedTo,
      dueDate: args.dueDate,
      createdAt: Date.now(),
    });

    return taskId;
  },
});

// Create multiple tasks at once (for AI-generated tasks)
export const createBatch = mutation({
  args: {
    projectId: v.id("projects"),
    tasks: v.array(v.object({
      title: v.string(),
      description: v.optional(v.string()),
      estimatedMinutes: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args) => {
    // Get the current highest order for this project
    const existingTasks = await ctx.db
      .query("tasks")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    const maxOrder = existingTasks.reduce((max, task) => Math.max(max, task.order), -1);

    const taskIds: string[] = [];

    for (let i = 0; i < args.tasks.length; i++) {
      const task = args.tasks[i];
      const taskId = await ctx.db.insert("tasks", {
        projectId: args.projectId,
        title: task.title,
        description: task.description,
        status: "todo",
        order: maxOrder + 1 + i,
        estimatedMinutes: task.estimatedMinutes,
        createdAt: Date.now(),
      });
      taskIds.push(taskId);
    }

    return taskIds;
  },
});

// Update a task
export const update = mutation({
  args: {
    taskId: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    estimatedMinutes: v.optional(v.number()),
    actualMinutes: v.optional(v.number()),
    assignedTo: v.optional(v.id("users")),
    dueDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { taskId, ...updates } = args;

    const task = await ctx.db.get(taskId);
    if (!task) throw new Error("Task not found");

    // Filter out undefined values
    const filteredUpdates: Record<string, any> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    await ctx.db.patch(taskId, filteredUpdates);
    return taskId;
  },
});

// Update task status
export const updateStatus = mutation({
  args: {
    taskId: v.id("tasks"),
    status: v.string(), // "todo" | "in_progress" | "done"
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    const updates: Record<string, any> = { status: args.status };

    // Set completedAt when marking as done
    if (args.status === "done" && task.status !== "done") {
      updates.completedAt = Date.now();
    } else if (args.status !== "done" && task.status === "done") {
      updates.completedAt = undefined;
    }

    await ctx.db.patch(args.taskId, updates);
    return args.taskId;
  },
});

// Delete a task
export const remove = mutation({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    await ctx.db.delete(args.taskId);
    return args.taskId;
  },
});

// Reorder tasks (for drag-drop)
export const reorder = mutation({
  args: {
    taskId: v.id("tasks"),
    newOrder: v.number(),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    const oldOrder = task.order;

    // Get all tasks in this project
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_project", (q) => q.eq("projectId", task.projectId))
      .collect();

    // Update order for affected tasks
    for (const t of tasks) {
      if (t._id === args.taskId) {
        await ctx.db.patch(t._id, { order: args.newOrder });
      } else if (oldOrder < args.newOrder) {
        // Moving down: shift items between old and new position up
        if (t.order > oldOrder && t.order <= args.newOrder) {
          await ctx.db.patch(t._id, { order: t.order - 1 });
        }
      } else if (oldOrder > args.newOrder) {
        // Moving up: shift items between new and old position down
        if (t.order >= args.newOrder && t.order < oldOrder) {
          await ctx.db.patch(t._id, { order: t.order + 1 });
        }
      }
    }

    return args.taskId;
  },
});

// Get tasks for a project
export const getByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    return tasks.sort((a, b) => a.order - b.order);
  },
});
