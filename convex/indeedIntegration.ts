import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a webhook log entry
export const createWebhookLog = mutation({
  args: {
    indeedApplyId: v.string(),
    receivedAt: v.number(),
    applicantName: v.string(),
    applicantEmail: v.string(),
    indeedJobId: v.optional(v.string()),
    indeedJobTitle: v.optional(v.string()),
    status: v.string(),
    applicationId: v.optional(v.id("applications")),
    errorMessage: v.optional(v.string()),
    rawPayload: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("indeedWebhookLogs", {
      indeedApplyId: args.indeedApplyId,
      receivedAt: args.receivedAt,
      applicantName: args.applicantName,
      applicantEmail: args.applicantEmail,
      indeedJobId: args.indeedJobId,
      indeedJobTitle: args.indeedJobTitle,
      status: args.status,
      applicationId: args.applicationId,
      errorMessage: args.errorMessage,
      rawPayload: args.rawPayload,
    });
  },
});

// Log a webhook error (for cases where we can't parse the payload)
export const logWebhookError = mutation({
  args: {
    errorMessage: v.string(),
    receivedAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("indeedWebhookLogs", {
      indeedApplyId: `error-${args.receivedAt}`,
      receivedAt: args.receivedAt,
      applicantName: "Unknown",
      applicantEmail: "",
      status: "error",
      errorMessage: args.errorMessage,
    });
  },
});

// Get webhook log by Indeed apply ID
export const getWebhookLogByApplyId = query({
  args: { indeedApplyId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("indeedWebhookLogs")
      .withIndex("by_indeed_apply_id", (q) =>
        q.eq("indeedApplyId", args.indeedApplyId)
      )
      .first();
  },
});

// Get job mapping by Indeed job ID
export const getJobMappingByIndeedId = query({
  args: { indeedJobId: v.string() },
  handler: async (ctx, args) => {
    if (!args.indeedJobId) return null;
    return await ctx.db
      .query("indeedJobMappings")
      .withIndex("by_indeed_job", (q) => q.eq("indeedJobId", args.indeedJobId))
      .first();
  },
});

// Get all job mappings (for admin UI)
export const getAllJobMappings = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("indeedJobMappings").collect();
  },
});

// Create or update a job mapping
export const upsertJobMapping = mutation({
  args: {
    indeedJobId: v.string(),
    indeedJobTitle: v.string(),
    internalJobId: v.id("jobs"),
    internalJobTitle: v.string(),
    location: v.optional(v.string()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Check if mapping already exists
    const existing = await ctx.db
      .query("indeedJobMappings")
      .withIndex("by_indeed_job", (q) => q.eq("indeedJobId", args.indeedJobId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        indeedJobTitle: args.indeedJobTitle,
        internalJobId: args.internalJobId,
        internalJobTitle: args.internalJobTitle,
        location: args.location,
        isActive: args.isActive,
      });
      return existing._id;
    }

    return await ctx.db.insert("indeedJobMappings", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

// Delete a job mapping
export const deleteJobMapping = mutation({
  args: { mappingId: v.id("indeedJobMappings") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.mappingId);
  },
});

// Get recent webhook logs (for monitoring)
export const getRecentWebhookLogs = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    return await ctx.db
      .query("indeedWebhookLogs")
      .withIndex("by_received")
      .order("desc")
      .take(limit);
  },
});

// Get webhook stats
export const getWebhookStats = query({
  args: {},
  handler: async (ctx) => {
    const allLogs = await ctx.db.query("indeedWebhookLogs").collect();

    const stats = {
      total: allLogs.length,
      success: allLogs.filter((l) => l.status === "success").length,
      duplicate: allLogs.filter((l) => l.status === "duplicate").length,
      error: allLogs.filter((l) => l.status === "error").length,
      last24Hours: allLogs.filter(
        (l) => l.receivedAt > Date.now() - 24 * 60 * 60 * 1000
      ).length,
    };

    return stats;
  },
});
