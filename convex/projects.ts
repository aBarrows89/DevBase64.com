import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Get all projects with task counts (excludes archived by default)
// Filters by user access: admins see all, others see owned + shared + assigned
export const getAll = query({
  args: {
    includeArchived: v.optional(v.boolean()),
    userId: v.optional(v.id("users")), // Current user for filtering
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

    // Apply access control filtering if userId provided
    if (args.userId) {
      const currentUser = await ctx.db.get(args.userId);

      // Admins and super_admins can see all projects
      if (currentUser && !["super_admin", "admin"].includes(currentUser.role)) {
        projects = projects.filter((project) => {
          // User owns the project
          if (project.createdBy === args.userId) return true;

          // User is assigned to the project
          if (project.assignedTo === args.userId) return true;

          // Project is explicitly shared with user
          if (project.sharedWith?.includes(args.userId!)) return true;

          // Project is public (visible to all)
          if (project.visibility === "public") return true;

          return false;
        });
      }
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
    sharedWith: v.optional(v.array(v.id("users"))),
    visibility: v.optional(v.string()), // "private" | "team" | "public"
    estimatedHours: v.optional(v.number()),
    dueDate: v.optional(v.string()),
    repositoryId: v.optional(v.id("repositories")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const projectId = await ctx.db.insert("projects", {
      ...args,
      visibility: args.visibility || "private",
      sharedWith: args.sharedWith || [],
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
        userEmail: creator.email || "unknown",
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
          userEmail: user.email || "unknown",
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

// ============ PROJECT SHARING ============

// Share project with users
export const shareProject = mutation({
  args: {
    projectId: v.id("projects"),
    userIds: v.array(v.id("users")),
    sharedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");

    const sharer = await ctx.db.get(args.sharedBy);
    if (!sharer) throw new Error("User not found");

    // Only owner or admins can share
    if (project.createdBy !== args.sharedBy && !["super_admin", "admin"].includes(sharer.role)) {
      throw new Error("Not authorized to share this project");
    }

    const currentShared = project.sharedWith || [];
    const newShared = [...new Set([...currentShared, ...args.userIds])];

    await ctx.db.patch(args.projectId, {
      sharedWith: newShared,
      updatedAt: Date.now(),
    });

    // Create notifications for newly shared users
    const now = Date.now();
    for (const userId of args.userIds) {
      if (currentShared.includes(userId)) continue; // Already shared
      if (userId === args.sharedBy) continue; // Don't notify yourself

      await ctx.db.insert("notifications", {
        userId,
        type: "project_shared",
        title: `${sharer.name} shared a project with you`,
        message: `You now have access to project "${project.name}"`,
        link: `/projects?id=${args.projectId}`,
        relatedId: args.projectId,
        isRead: false,
        isDismissed: false,
        createdAt: now,
      });
    }

    return { success: true, sharedWith: newShared };
  },
});

// Unshare project from users
export const unshareProject = mutation({
  args: {
    projectId: v.id("projects"),
    userIds: v.array(v.id("users")),
    userId: v.id("users"), // User performing the action
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    // Only owner or admins can unshare
    if (project.createdBy !== args.userId && !["super_admin", "admin"].includes(user.role)) {
      throw new Error("Not authorized to modify sharing for this project");
    }

    const currentShared = project.sharedWith || [];
    const newShared = currentShared.filter((id) => !args.userIds.includes(id));

    await ctx.db.patch(args.projectId, {
      sharedWith: newShared,
      updatedAt: Date.now(),
    });

    return { success: true, sharedWith: newShared };
  },
});

// Update project visibility
export const updateVisibility = mutation({
  args: {
    projectId: v.id("projects"),
    visibility: v.string(), // "private" | "team" | "public"
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    // Only owner or admins can change visibility
    if (project.createdBy !== args.userId && !["super_admin", "admin"].includes(user.role)) {
      throw new Error("Not authorized to change project visibility");
    }

    await ctx.db.patch(args.projectId, {
      visibility: args.visibility,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Get users a project is shared with (for UI)
export const getSharedUsers = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) return [];

    const sharedWith = project.sharedWith || [];
    const users = await Promise.all(
      sharedWith.map(async (userId) => {
        const user = await ctx.db.get(userId);
        return user ? { _id: user._id, name: user.name, email: user.email } : null;
      })
    );

    return users.filter(Boolean);
  },
});

// ============ PROJECT NOTES ============

// Get all notes for a project
export const getNotes = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const notes = await ctx.db
      .query("projectNotes")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .collect();

    // Enrich with mentioned user info
    const enrichedNotes = await Promise.all(
      notes.map(async (note) => {
        const mentionedUsers = await Promise.all(
          note.mentions.map(async (userId) => {
            const user = await ctx.db.get(userId);
            return user ? { _id: user._id, name: user.name, email: user.email } : null;
          })
        );
        return {
          ...note,
          mentionedUsers: mentionedUsers.filter(Boolean),
        };
      })
    );

    return enrichedNotes;
  },
});

// Add a note to a project
export const addNote = mutation({
  args: {
    projectId: v.id("projects"),
    content: v.string(),
    mentions: v.array(v.id("users")),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const creator = await ctx.db.get(args.createdBy);
    const project = await ctx.db.get(args.projectId);

    if (!creator || !project) {
      throw new Error("User or project not found");
    }

    // Create the note
    const noteId = await ctx.db.insert("projectNotes", {
      projectId: args.projectId,
      content: args.content,
      mentions: args.mentions,
      createdBy: args.createdBy,
      createdByName: creator.name,
      createdAt: now,
      updatedAt: now,
    });

    // Create notifications for mentioned users
    for (const userId of args.mentions) {
      // Don't notify yourself
      if (userId === args.createdBy) continue;

      await ctx.db.insert("notifications", {
        userId,
        type: "project_note_mention",
        title: `${creator.name} mentioned you`,
        message: `You were mentioned in a note on project "${project.name}"`,
        link: `/projects?id=${args.projectId}`,
        relatedId: noteId,
        isRead: false,
        isDismissed: false,
        createdAt: now,
      });
    }

    return noteId;
  },
});

// Update a note
export const updateNote = mutation({
  args: {
    noteId: v.id("projectNotes"),
    content: v.string(),
    mentions: v.array(v.id("users")),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.noteId);
    if (!note) throw new Error("Note not found");

    const project = await ctx.db.get(note.projectId);
    const editor = await ctx.db.get(args.userId);
    if (!project || !editor) throw new Error("Project or user not found");

    const now = Date.now();

    // Find new mentions (users mentioned now but not before)
    const newMentions = args.mentions.filter(
      (userId) => !note.mentions.includes(userId)
    );

    // Update the note
    await ctx.db.patch(args.noteId, {
      content: args.content,
      mentions: args.mentions,
      updatedAt: now,
    });

    // Create notifications for newly mentioned users
    for (const userId of newMentions) {
      if (userId === args.userId) continue;

      await ctx.db.insert("notifications", {
        userId,
        type: "project_note_mention",
        title: `${editor.name} mentioned you`,
        message: `You were mentioned in a note on project "${project.name}"`,
        link: `/projects?id=${note.projectId}`,
        relatedId: args.noteId,
        isRead: false,
        isDismissed: false,
        createdAt: now,
      });
    }
  },
});

// Delete a note
export const deleteNote = mutation({
  args: { noteId: v.id("projectNotes") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.noteId);
  },
});
