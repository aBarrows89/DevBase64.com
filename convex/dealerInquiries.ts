import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all dealer inquiries
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("dealerInquiries")
      .withIndex("by_created")
      .order("desc")
      .collect();
  },
});

// Get recent inquiries (for dashboard)
export const getRecent = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("dealerInquiries")
      .withIndex("by_created")
      .order("desc")
      .take(10);
  },
});

// Get inquiries by status
export const getByStatus = query({
  args: { status: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("dealerInquiries")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .collect();
  },
});

// Get inquiries assigned to a user
export const getByAssignee = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("dealerInquiries")
      .withIndex("by_assigned", (q) => q.eq("assignedTo", args.userId))
      .collect();
  },
});

// Get single inquiry
export const getById = query({
  args: { inquiryId: v.id("dealerInquiries") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.inquiryId);
  },
});

// Submit a new dealer inquiry (used by IE Tire website)
export const submit = mutation({
  args: {
    businessName: v.string(),
    contactName: v.string(),
    email: v.string(),
    phone: v.string(),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    businessType: v.optional(v.string()),
    yearsInBusiness: v.optional(v.number()),
    estimatedMonthlyVolume: v.optional(v.string()),
    currentSuppliers: v.optional(v.string()),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("dealerInquiries", {
      ...args,
      status: "new",
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update inquiry status
export const updateStatus = mutation({
  args: {
    inquiryId: v.id("dealerInquiries"),
    status: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = {
      status: args.status,
      updatedAt: Date.now(),
    };
    if (args.notes !== undefined) {
      updates.notes = args.notes;
    }
    await ctx.db.patch(args.inquiryId, updates);
  },
});

// Assign to a user
export const assign = mutation({
  args: {
    inquiryId: v.id("dealerInquiries"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.inquiryId, {
      assignedTo: args.userId,
      updatedAt: Date.now(),
    });
  },
});

// Set follow-up date
export const setFollowUp = mutation({
  args: {
    inquiryId: v.id("dealerInquiries"),
    followUpDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.inquiryId, {
      followUpDate: args.followUpDate,
      updatedAt: Date.now(),
    });
  },
});

// Update full inquiry details
export const update = mutation({
  args: {
    inquiryId: v.id("dealerInquiries"),
    businessName: v.optional(v.string()),
    contactName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    businessType: v.optional(v.string()),
    yearsInBusiness: v.optional(v.number()),
    estimatedMonthlyVolume: v.optional(v.string()),
    currentSuppliers: v.optional(v.string()),
    message: v.optional(v.string()),
    status: v.optional(v.string()),
    notes: v.optional(v.string()),
    assignedTo: v.optional(v.id("users")),
    followUpDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { inquiryId, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(inquiryId, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });
  },
});

// Delete inquiry
export const remove = mutation({
  args: { inquiryId: v.id("dealerInquiries") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.inquiryId);
  },
});

// Get stats
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const inquiries = await ctx.db.query("dealerInquiries").collect();
    return {
      total: inquiries.length,
      new: inquiries.filter((i) => i.status === "new").length,
      contacted: inquiries.filter((i) => i.status === "contacted").length,
      qualified: inquiries.filter((i) => i.status === "qualified").length,
      approved: inquiries.filter((i) => i.status === "approved").length,
      rejected: inquiries.filter((i) => i.status === "rejected").length,
    };
  },
});
