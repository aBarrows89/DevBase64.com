import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all repositories
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("repositories").collect();
  },
});

// Get repository by name
export const getByName = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("repositories")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
  },
});

// Get repository by GitHub ID
export const getByGithubId = query({
  args: { githubId: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("repositories")
      .withIndex("by_github_id", (q) => q.eq("githubId", args.githubId))
      .first();
  },
});

// Upsert repository (create or update based on GitHub ID)
export const upsert = mutation({
  args: {
    githubId: v.number(),
    name: v.string(),
    fullName: v.string(),
    description: v.optional(v.string()),
    htmlUrl: v.string(),
    cloneUrl: v.string(),
    defaultBranch: v.string(),
    isPrivate: v.boolean(),
    language: v.optional(v.string()),
    starCount: v.number(),
    forkCount: v.number(),
    openIssuesCount: v.number(),
    lastPushedAt: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("repositories")
      .withIndex("by_github_id", (q) => q.eq("githubId", args.githubId))
      .first();

    const data = {
      ...args,
      lastSyncedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
      return existing._id;
    } else {
      return await ctx.db.insert("repositories", data);
    }
  },
});

// Sync multiple repositories at once
export const syncBatch = mutation({
  args: {
    repositories: v.array(
      v.object({
        githubId: v.number(),
        name: v.string(),
        fullName: v.string(),
        description: v.optional(v.string()),
        htmlUrl: v.string(),
        cloneUrl: v.string(),
        defaultBranch: v.string(),
        isPrivate: v.boolean(),
        language: v.optional(v.string()),
        starCount: v.number(),
        forkCount: v.number(),
        openIssuesCount: v.number(),
        lastPushedAt: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    for (const repo of args.repositories) {
      const existing = await ctx.db
        .query("repositories")
        .withIndex("by_github_id", (q) => q.eq("githubId", repo.githubId))
        .first();

      const data = {
        ...repo,
        lastSyncedAt: now,
      };

      if (existing) {
        await ctx.db.patch(existing._id, data);
      } else {
        await ctx.db.insert("repositories", data);
      }
    }
  },
});

// Delete repository
export const remove = mutation({
  args: { repositoryId: v.id("repositories") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.repositoryId);
  },
});
