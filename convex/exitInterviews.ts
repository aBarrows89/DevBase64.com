import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ============ QUERIES ============

// Get all exit interviews
export const list = query({
  args: {
    status: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let interviews;

    if (args.status) {
      interviews = await ctx.db
        .query("exitInterviews")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
    } else {
      interviews = await ctx.db.query("exitInterviews").collect();
    }

    // Filter by date range
    if (args.startDate) {
      interviews = interviews.filter(i => i.terminationDate >= args.startDate!);
    }
    if (args.endDate) {
      interviews = interviews.filter(i => i.terminationDate <= args.endDate!);
    }

    return interviews.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get a single exit interview
export const getById = query({
  args: { interviewId: v.id("exitInterviews") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.interviewId);
  },
});

// Get exit interview by personnel
export const getByPersonnel = query({
  args: { personnelId: v.id("personnel") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("exitInterviews")
      .withIndex("by_personnel", (q) => q.eq("personnelId", args.personnelId))
      .first();
  },
});

// Get pending exit interviews
export const getPending = query({
  handler: async (ctx) => {
    const interviews = await ctx.db
      .query("exitInterviews")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    return interviews.sort((a, b) => a.terminationDate.localeCompare(b.terminationDate));
  },
});

// Get exit interview analytics
export const getAnalytics = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let interviews = await ctx.db
      .query("exitInterviews")
      .filter((q) => q.eq(q.field("status"), "completed"))
      .collect();

    // Filter by date range
    if (args.startDate) {
      interviews = interviews.filter(i => i.terminationDate >= args.startDate!);
    }
    if (args.endDate) {
      interviews = interviews.filter(i => i.terminationDate <= args.endDate!);
    }

    if (interviews.length === 0) {
      return {
        totalCompleted: 0,
        avgSatisfaction: null,
        avgManagement: null,
        avgWorkLifeBalance: null,
        avgCompensation: null,
        avgGrowthOpportunity: null,
        wouldReturn: { yes: 0, no: 0, maybe: 0 },
        wouldRecommend: { yes: 0, no: 0, maybe: 0 },
        topReasons: [],
        byDepartment: [],
      };
    }

    // Calculate averages
    const withResponses = interviews.filter(i => i.responses);

    const calcAvg = (field: keyof NonNullable<typeof interviews[0]['responses']>) => {
      const values = withResponses
        .map(i => i.responses?.[field])
        .filter((v): v is number => typeof v === 'number');
      return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;
    };

    const avgSatisfaction = calcAvg('satisfactionRating');
    const avgManagement = calcAvg('managementRating');
    const avgWorkLifeBalance = calcAvg('workLifeBalanceRating');
    const avgCompensation = calcAvg('compensationRating');
    const avgGrowthOpportunity = calcAvg('growthOpportunityRating');

    // Would return/recommend counts
    const wouldReturn = { yes: 0, no: 0, maybe: 0 };
    const wouldRecommend = { yes: 0, no: 0, maybe: 0 };

    withResponses.forEach(i => {
      if (i.responses?.wouldReturn) {
        wouldReturn[i.responses.wouldReturn as keyof typeof wouldReturn]++;
      }
      if (i.responses?.wouldRecommend) {
        wouldRecommend[i.responses.wouldRecommend as keyof typeof wouldRecommend]++;
      }
    });

    // Top reasons for leaving
    const reasonCounts: Record<string, number> = {};
    withResponses.forEach(i => {
      if (i.responses?.primaryReason) {
        const reason = i.responses.primaryReason;
        reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
      }
    });
    const topReasons = Object.entries(reasonCounts)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // By department
    const deptData: Record<string, { count: number, satisfaction: number[] }> = {};
    interviews.forEach(i => {
      if (!deptData[i.department]) {
        deptData[i.department] = { count: 0, satisfaction: [] };
      }
      deptData[i.department].count++;
      if (i.responses?.satisfactionRating) {
        deptData[i.department].satisfaction.push(i.responses.satisfactionRating);
      }
    });
    const byDepartment = Object.entries(deptData)
      .map(([department, data]) => ({
        department,
        count: data.count,
        avgSatisfaction: data.satisfaction.length > 0
          ? data.satisfaction.reduce((a, b) => a + b, 0) / data.satisfaction.length
          : null,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      totalCompleted: interviews.length,
      avgSatisfaction,
      avgManagement,
      avgWorkLifeBalance,
      avgCompensation,
      avgGrowthOpportunity,
      wouldReturn,
      wouldRecommend,
      topReasons,
      byDepartment,
    };
  },
});

// ============ MUTATIONS ============

// Create an exit interview (typically auto-created when terminating)
export const create = mutation({
  args: {
    personnelId: v.id("personnel"),
    terminationDate: v.string(),
    terminationReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const personnel = await ctx.db.get(args.personnelId);
    if (!personnel) throw new Error("Personnel not found");

    // Check if exit interview already exists
    const existing = await ctx.db
      .query("exitInterviews")
      .withIndex("by_personnel", (q) => q.eq("personnelId", args.personnelId))
      .first();

    if (existing) {
      return existing._id;
    }

    const now = Date.now();

    const interviewId = await ctx.db.insert("exitInterviews", {
      personnelId: args.personnelId,
      personnelName: `${personnel.firstName} ${personnel.lastName}`,
      department: personnel.department,
      position: personnel.position,
      hireDate: personnel.hireDate,
      terminationDate: args.terminationDate,
      terminationReason: args.terminationReason,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    return interviewId;
  },
});

// Schedule an exit interview
export const schedule = mutation({
  args: {
    interviewId: v.id("exitInterviews"),
    scheduledDate: v.string(),
    scheduledTime: v.string(),
    conductedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const interview = await ctx.db.get(args.interviewId);
    if (!interview) throw new Error("Exit interview not found");

    const user = await ctx.db.get(args.conductedBy);
    if (!user) throw new Error("User not found");

    await ctx.db.patch(args.interviewId, {
      status: "scheduled",
      scheduledDate: args.scheduledDate,
      scheduledTime: args.scheduledTime,
      conductedBy: args.conductedBy,
      conductedByName: user.name,
      updatedAt: Date.now(),
    });

    return args.interviewId;
  },
});

// Complete an exit interview with responses
export const complete = mutation({
  args: {
    interviewId: v.id("exitInterviews"),
    responses: v.object({
      primaryReason: v.optional(v.string()),
      wouldReturn: v.optional(v.string()),
      wouldRecommend: v.optional(v.string()),
      satisfactionRating: v.optional(v.number()),
      managementRating: v.optional(v.number()),
      workLifeBalanceRating: v.optional(v.number()),
      compensationRating: v.optional(v.number()),
      growthOpportunityRating: v.optional(v.number()),
      whatLikedMost: v.optional(v.string()),
      whatCouldImprove: v.optional(v.string()),
      additionalComments: v.optional(v.string()),
    }),
    interviewerNotes: v.optional(v.string()),
    conductedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const interview = await ctx.db.get(args.interviewId);
    if (!interview) throw new Error("Exit interview not found");

    const user = await ctx.db.get(args.conductedBy);
    if (!user) throw new Error("User not found");

    const now = Date.now();

    await ctx.db.patch(args.interviewId, {
      status: "completed",
      responses: args.responses,
      interviewerNotes: args.interviewerNotes,
      conductedBy: args.conductedBy,
      conductedByName: user.name,
      completedAt: now,
      updatedAt: now,
    });

    return args.interviewId;
  },
});

// Mark as declined (employee refused exit interview)
export const decline = mutation({
  args: {
    interviewId: v.id("exitInterviews"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.interviewId, {
      status: "declined",
      interviewerNotes: args.notes,
      updatedAt: Date.now(),
    });

    return args.interviewId;
  },
});

// Delete an exit interview
export const remove = mutation({
  args: { interviewId: v.id("exitInterviews") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.interviewId);
    return { success: true };
  },
});

// Standard exit interview reasons (for dropdown)
export const getReasonOptions = query({
  handler: async () => {
    return [
      "Better opportunity elsewhere",
      "Higher compensation",
      "Career advancement",
      "Relocation",
      "Family/personal reasons",
      "Work-life balance",
      "Management issues",
      "Company culture",
      "Lack of growth opportunities",
      "Job duties changed",
      "Retirement",
      "Health reasons",
      "Going back to school",
      "Starting own business",
      "Contract ended",
      "Other",
    ];
  },
});
