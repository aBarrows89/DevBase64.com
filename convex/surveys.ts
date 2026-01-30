import { v } from "convex/values";
import { action, mutation, query, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// ============ SURVEY CAMPAIGN QUERIES ============

// Get all survey campaigns
export const listCampaigns = query({
  args: {
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let campaigns;
    if (args.activeOnly) {
      campaigns = await ctx.db
        .query("surveyCampaigns")
        .withIndex("by_active", (q) => q.eq("isActive", true))
        .collect();
    } else {
      campaigns = await ctx.db.query("surveyCampaigns").collect();
    }
    return campaigns.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get a single campaign with stats
export const getCampaign = query({
  args: { campaignId: v.id("surveyCampaigns") },
  handler: async (ctx, args) => {
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) return null;

    // Get response stats
    const responses = await ctx.db
      .query("surveyResponses")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .collect();

    const avgScore = responses.length > 0
      ? responses.reduce((sum, r) => sum + (r.overallScore || 0), 0) / responses.length
      : null;

    const npsResponses = responses.filter(r => r.npsScore !== undefined);
    const avgNps = npsResponses.length > 0
      ? npsResponses.reduce((sum, r) => sum + (r.npsScore || 0), 0) / npsResponses.length
      : null;

    return {
      ...campaign,
      stats: {
        responseCount: responses.length,
        avgScore,
        avgNps,
      },
    };
  },
});

// Get pending surveys for an employee
export const getMyPendingSurveys = query({
  args: { personnelId: v.id("personnel") },
  handler: async (ctx, args) => {
    const assignments = await ctx.db
      .query("surveyAssignments")
      .withIndex("by_personnel", (q) => q.eq("personnelId", args.personnelId))
      .collect();

    const pending = assignments.filter(a => a.status === "pending");

    // Enrich with campaign info
    const enriched = await Promise.all(
      pending.map(async (assignment) => {
        const campaign = await ctx.db.get(assignment.campaignId);
        return {
          ...assignment,
          campaign,
        };
      })
    );

    return enriched.filter(a => a.campaign && a.campaign.isActive);
  },
});

// ============ ENGAGEMENT DASHBOARD QUERIES ============

// Get overall engagement metrics
export const getEngagementMetrics = query({
  args: {
    startDate: v.optional(v.string()), // YYYY-MM-DD
    endDate: v.optional(v.string()),
    department: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let responses = await ctx.db.query("surveyResponses").collect();

    // Filter by date range
    if (args.startDate) {
      const startTs = new Date(args.startDate).getTime();
      responses = responses.filter(r => r.submittedAt >= startTs);
    }
    if (args.endDate) {
      const endTs = new Date(args.endDate + "T23:59:59").getTime();
      responses = responses.filter(r => r.submittedAt <= endTs);
    }

    // Filter by department
    if (args.department) {
      responses = responses.filter(r => r.department === args.department);
    }

    if (responses.length === 0) {
      return {
        totalResponses: 0,
        avgHappinessScore: null,
        avgNpsScore: null,
        responseRate: null,
        trend: [],
        byDepartment: [],
      };
    }

    // Calculate averages
    const scoresWithValues = responses.filter(r => r.overallScore !== undefined);
    const avgHappinessScore = scoresWithValues.length > 0
      ? scoresWithValues.reduce((sum, r) => sum + (r.overallScore || 0), 0) / scoresWithValues.length
      : null;

    const npsResponses = responses.filter(r => r.npsScore !== undefined);
    const avgNpsScore = npsResponses.length > 0
      ? npsResponses.reduce((sum, r) => sum + (r.npsScore || 0), 0) / npsResponses.length
      : null;

    // Calculate trend (last 6 months)
    const sixMonthsAgo = Date.now() - (180 * 24 * 60 * 60 * 1000);
    const recentResponses = responses.filter(r => r.submittedAt >= sixMonthsAgo);

    const monthlyData: Record<string, { scores: number[], nps: number[], count: number }> = {};
    recentResponses.forEach(r => {
      const monthKey = new Date(r.submittedAt).toISOString().substring(0, 7); // YYYY-MM
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { scores: [], nps: [], count: 0 };
      }
      if (r.overallScore !== undefined) {
        monthlyData[monthKey].scores.push(r.overallScore);
      }
      if (r.npsScore !== undefined) {
        monthlyData[monthKey].nps.push(r.npsScore);
      }
      monthlyData[monthKey].count++;
    });

    const trend = Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        avgScore: data.scores.length > 0
          ? data.scores.reduce((a, b) => a + b, 0) / data.scores.length
          : null,
        avgNps: data.nps.length > 0
          ? data.nps.reduce((a, b) => a + b, 0) / data.nps.length
          : null,
        responseCount: data.count,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // By department
    const deptData: Record<string, { scores: number[], count: number }> = {};
    responses.forEach(r => {
      const dept = r.department || "Unknown";
      if (!deptData[dept]) {
        deptData[dept] = { scores: [], count: 0 };
      }
      if (r.overallScore !== undefined) {
        deptData[dept].scores.push(r.overallScore);
      }
      deptData[dept].count++;
    });

    const byDepartment = Object.entries(deptData)
      .map(([department, data]) => ({
        department,
        avgScore: data.scores.length > 0
          ? data.scores.reduce((a, b) => a + b, 0) / data.scores.length
          : null,
        responseCount: data.count,
      }))
      .sort((a, b) => (b.avgScore || 0) - (a.avgScore || 0));

    // Response rate (total assignments vs responses)
    const totalAssignments = await ctx.db.query("surveyAssignments").collect();
    const completedAssignments = totalAssignments.filter(a => a.status === "completed");
    const responseRate = totalAssignments.length > 0
      ? (completedAssignments.length / totalAssignments.length) * 100
      : null;

    return {
      totalResponses: responses.length,
      avgHappinessScore,
      avgNpsScore,
      responseRate,
      trend,
      byDepartment,
    };
  },
});

// Get recent survey responses (for dashboard feed)
export const getRecentResponses = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const responses = await ctx.db
      .query("surveyResponses")
      .withIndex("by_submitted")
      .order("desc")
      .take(args.limit || 20);

    // Enrich with campaign info
    return Promise.all(
      responses.map(async (response) => {
        const campaign = await ctx.db.get(response.campaignId);
        let personnelName = "Anonymous";
        if (response.personnelId) {
          const personnel = await ctx.db.get(response.personnelId);
          if (personnel) {
            personnelName = `${personnel.firstName} ${personnel.lastName}`;
          }
        }
        return {
          ...response,
          campaignName: campaign?.name || "Unknown Survey",
          personnelName: campaign?.isAnonymous ? "Anonymous" : personnelName,
        };
      })
    );
  },
});

// ============ SURVEY CAMPAIGN MUTATIONS ============

// Create a new survey campaign
export const createCampaign = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    isAnonymous: v.boolean(),
    frequency: v.string(),
    questions: v.array(v.object({
      id: v.string(),
      text: v.string(),
      type: v.string(),
      required: v.boolean(),
      options: v.optional(v.array(v.string())),
      minLabel: v.optional(v.string()),
      maxLabel: v.optional(v.string()),
    })),
    targetDepartments: v.optional(v.array(v.string())),
    targetLocationIds: v.optional(v.array(v.id("locations"))),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const { userId, ...campaignData } = args;

    const campaignId = await ctx.db.insert("surveyCampaigns", {
      ...campaignData,
      isActive: true,
      totalSent: 0,
      totalResponses: 0,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    return campaignId;
  },
});

// Update a campaign
export const updateCampaign = mutation({
  args: {
    campaignId: v.id("surveyCampaigns"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    isAnonymous: v.optional(v.boolean()),
    frequency: v.optional(v.string()),
    questions: v.optional(v.array(v.object({
      id: v.string(),
      text: v.string(),
      type: v.string(),
      required: v.boolean(),
      options: v.optional(v.array(v.string())),
      minLabel: v.optional(v.string()),
      maxLabel: v.optional(v.string()),
    }))),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { campaignId, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );

    await ctx.db.patch(campaignId, {
      ...filtered,
      updatedAt: Date.now(),
    });

    return campaignId;
  },
});

// Send survey to employees
export const sendSurvey = mutation({
  args: {
    campaignId: v.id("surveyCampaigns"),
    personnelIds: v.optional(v.array(v.id("personnel"))), // Specific employees, or all active if empty
    sendEmails: v.optional(v.boolean()), // Whether to send notification emails
  },
  handler: async (ctx, args) => {
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) throw new Error("Campaign not found");
    if (!campaign.isActive) throw new Error("Campaign is not active");

    const now = Date.now();
    let targetPersonnel: Id<"personnel">[] = [];

    if (args.personnelIds && args.personnelIds.length > 0) {
      targetPersonnel = args.personnelIds;
    } else {
      // Get all active personnel, filtered by campaign targeting
      let allPersonnel = await ctx.db
        .query("personnel")
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect();

      // Filter by department if specified
      if (campaign.targetDepartments && campaign.targetDepartments.length > 0) {
        allPersonnel = allPersonnel.filter(p =>
          campaign.targetDepartments!.includes(p.department)
        );
      }

      // Filter by location if specified
      if (campaign.targetLocationIds && campaign.targetLocationIds.length > 0) {
        allPersonnel = allPersonnel.filter(p =>
          p.locationId && campaign.targetLocationIds!.includes(p.locationId)
        );
      }

      targetPersonnel = allPersonnel.map(p => p._id);
    }

    // Check for existing pending assignments to avoid duplicates
    const existingAssignments = await ctx.db
      .query("surveyAssignments")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .collect();

    const pendingPersonnelIds = new Set(
      existingAssignments
        .filter(a => a.status === "pending")
        .map(a => a.personnelId)
    );

    // Create assignments for employees who don't have pending surveys
    let sent = 0;
    let emailsSent = 0;
    const expiresAt = now + (7 * 24 * 60 * 60 * 1000); // 7 days

    for (const personnelId of targetPersonnel) {
      if (!pendingPersonnelIds.has(personnelId)) {
        // Get user account if they have one
        const personnel = await ctx.db.get(personnelId);
        let userId: Id<"users"> | undefined;
        if (personnel) {
          const user = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", personnel.email.toLowerCase()))
            .first();
          if (user) userId = user._id;
        }

        const assignmentId = await ctx.db.insert("surveyAssignments", {
          campaignId: args.campaignId,
          personnelId,
          userId,
          status: "pending",
          sentAt: now,
          expiresAt,
          createdAt: now,
        });
        sent++;

        // Send email notification (defaults to true if not specified)
        const shouldSendEmails = args.sendEmails !== false;
        if (shouldSendEmails && personnel?.email) {
          await ctx.scheduler.runAfter(1000 + (emailsSent * 500), internal.emails.sendSurveyEmail, {
            employeeName: `${personnel.firstName} ${personnel.lastName}`,
            employeeEmail: personnel.email,
            surveyName: campaign.name,
            surveyDescription: campaign.description,
            assignmentId: assignmentId,
            expiresAt,
          });
          emailsSent++;
        }
      }
    }

    // Update campaign stats
    await ctx.db.patch(args.campaignId, {
      totalSent: campaign.totalSent + sent,
      lastSentAt: now,
      updatedAt: now,
    });

    return { sent, total: targetPersonnel.length, emailsSent };
  },
});

// Submit a survey response
export const submitResponse = mutation({
  args: {
    assignmentId: v.id("surveyAssignments"),
    answers: v.array(v.object({
      questionId: v.string(),
      questionText: v.string(),
      questionType: v.string(),
      value: v.optional(v.union(v.string(), v.number())),
      numericValue: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args) => {
    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) throw new Error("Assignment not found");
    if (assignment.status !== "pending") throw new Error("Survey already completed or expired");

    const campaign = await ctx.db.get(assignment.campaignId);
    if (!campaign) throw new Error("Campaign not found");

    const now = Date.now();

    // Get personnel info for department/location tracking
    const personnel = await ctx.db.get(assignment.personnelId);

    // Calculate overall score from numeric answers
    const numericAnswers = args.answers.filter(a => a.numericValue !== undefined);
    const overallScore = numericAnswers.length > 0
      ? numericAnswers.reduce((sum, a) => sum + (a.numericValue || 0), 0) / numericAnswers.length
      : undefined;

    // Calculate NPS if there's an NPS question
    const npsAnswer = args.answers.find(a => a.questionType === "nps");
    let npsScore: number | undefined;
    if (npsAnswer && npsAnswer.numericValue !== undefined) {
      // NPS scoring: 9-10 = promoter (+1), 7-8 = passive (0), 0-6 = detractor (-1)
      // For individual response, just store the raw value; aggregate NPS is calculated in queries
      npsScore = npsAnswer.numericValue;
    }

    // Create response
    await ctx.db.insert("surveyResponses", {
      campaignId: assignment.campaignId,
      assignmentId: args.assignmentId,
      personnelId: campaign.isAnonymous ? undefined : assignment.personnelId,
      department: personnel?.department,
      locationId: personnel?.locationId,
      answers: args.answers,
      overallScore,
      npsScore,
      submittedAt: now,
    });

    // Update assignment status
    await ctx.db.patch(args.assignmentId, {
      status: "completed",
      completedAt: now,
    });

    // Update campaign response count
    await ctx.db.patch(assignment.campaignId, {
      totalResponses: campaign.totalResponses + 1,
      updatedAt: now,
    });

    return { success: true };
  },
});

// Delete a campaign
export const deleteCampaign = mutation({
  args: { campaignId: v.id("surveyCampaigns") },
  handler: async (ctx, args) => {
    // Delete all assignments
    const assignments = await ctx.db
      .query("surveyAssignments")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .collect();
    for (const assignment of assignments) {
      await ctx.db.delete(assignment._id);
    }

    // Delete all responses
    const responses = await ctx.db
      .query("surveyResponses")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .collect();
    for (const response of responses) {
      await ctx.db.delete(response._id);
    }

    // Delete campaign
    await ctx.db.delete(args.campaignId);

    return { success: true };
  },
});

// Create default pulse survey
export const createDefaultPulseSurvey = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const now = Date.now();

    const campaignId = await ctx.db.insert("surveyCampaigns", {
      name: "Weekly Pulse Check",
      description: "Quick weekly check-in to measure employee happiness and engagement",
      isActive: true,
      isAnonymous: true,
      frequency: "weekly",
      questions: [
        {
          id: "happiness",
          text: "How happy are you at work this week?",
          type: "scale",
          required: true,
          minLabel: "Very Unhappy",
          maxLabel: "Very Happy",
        },
        {
          id: "valued",
          text: "Do you feel valued and appreciated?",
          type: "scale",
          required: true,
          minLabel: "Not at All",
          maxLabel: "Absolutely",
        },
        {
          id: "nps",
          text: "How likely are you to recommend us as a great place to work?",
          type: "nps",
          required: true,
          minLabel: "Not Likely",
          maxLabel: "Very Likely",
        },
        {
          id: "workload",
          text: "How manageable is your workload?",
          type: "scale",
          required: true,
          minLabel: "Overwhelming",
          maxLabel: "Very Manageable",
        },
        {
          id: "improvement",
          text: "What's one thing we could improve?",
          type: "text",
          required: false,
        },
      ],
      totalSent: 0,
      totalResponses: 0,
      createdBy: args.userId,
      createdAt: now,
      updatedAt: now,
    });

    return campaignId;
  },
});

// Internal query to get pending assignments with personnel data
export const getPendingAssignmentsWithPersonnel = internalQuery({
  args: { campaignId: v.id("surveyCampaigns") },
  handler: async (ctx, args) => {
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) return { campaign: null, assignments: [] };

    const assignments = await ctx.db
      .query("surveyAssignments")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    const assignmentsWithPersonnel = await Promise.all(
      assignments.map(async (a) => {
        const personnel = await ctx.db.get(a.personnelId);
        return { ...a, personnel };
      })
    );

    return { campaign, assignments: assignmentsWithPersonnel };
  },
});

// Resend emails to all pending survey assignments
export const resendSurveyEmails = action({
  args: { campaignId: v.id("surveyCampaigns") },
  handler: async (ctx, args): Promise<{ sent: number; skipped: number }> => {
    const { campaign, assignments } = await ctx.runQuery(
      internal.surveys.getPendingAssignmentsWithPersonnel,
      { campaignId: args.campaignId }
    );

    if (!campaign) throw new Error("Campaign not found");

    let sent = 0;
    let skipped = 0;

    for (const assignment of assignments) {
      // Skip terminated employees - they shouldn't receive pulse surveys
      if (assignment.personnel?.status === "terminated") {
        skipped++;
        continue;
      }

      if (assignment.personnel?.email && assignment.personnel?.status === "active") {
        await ctx.runAction(internal.emails.sendSurveyEmail, {
          employeeName: `${assignment.personnel.firstName} ${assignment.personnel.lastName}`,
          employeeEmail: assignment.personnel.email,
          surveyName: campaign.name,
          surveyDescription: campaign.description,
          assignmentId: assignment._id,
          expiresAt: assignment.expiresAt,
        });
        sent++;
      } else {
        skipped++;
      }
    }

    return { sent, skipped };
  },
});
