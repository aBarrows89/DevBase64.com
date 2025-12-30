import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all applications
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("applications")
      .withIndex("by_created")
      .order("desc")
      .collect();
  },
});

// Get recent applications (for dashboard)
export const getRecent = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("applications")
      .withIndex("by_created")
      .order("desc")
      .take(20);
  },
});

// Get applications by status
export const getByStatus = query({
  args: { status: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("applications")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .collect();
  },
});

// Get applications by job
export const getByJob = query({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("applications")
      .withIndex("by_job", (q) => q.eq("appliedJobId", args.jobId))
      .collect();
  },
});

// Get single application
export const getById = query({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.applicationId);
  },
});

// Create application
export const create = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.string(),
    message: v.optional(v.string()),
    resumeText: v.optional(v.string()),
    appliedJobId: v.optional(v.id("jobs")),
    appliedJobTitle: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const applicationId = await ctx.db.insert("applications", {
      ...args,
      status: "new",
      createdAt: now,
      updatedAt: now,
    });
    return applicationId;
  },
});

// Update application status
export const updateStatus = mutation({
  args: {
    applicationId: v.id("applications"),
    status: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.applicationId, {
      status: args.status,
      notes: args.notes,
      updatedAt: Date.now(),
    });
  },
});

// Update application with AI analysis
export const updateAIAnalysis = mutation({
  args: {
    applicationId: v.id("applications"),
    aiAnalysis: v.optional(
      v.object({
        suggestedJobId: v.optional(v.id("jobs")),
        suggestedJobTitle: v.optional(v.string()),
        matchScore: v.number(),
        allScores: v.array(
          v.object({
            jobId: v.id("jobs"),
            jobTitle: v.string(),
            score: v.number(),
            matchedKeywords: v.array(v.string()),
            reasoning: v.optional(v.string()),
          })
        ),
        extractedSkills: v.array(v.string()),
        summary: v.optional(v.string()),
      })
    ),
    candidateAnalysis: v.optional(
      v.object({
        overallScore: v.number(),
        stabilityScore: v.number(),
        experienceScore: v.number(),
        employmentHistory: v.array(
          v.object({
            company: v.string(),
            title: v.string(),
            duration: v.string(),
            durationMonths: v.number(),
            startDate: v.optional(v.string()),
            endDate: v.optional(v.string()),
          })
        ),
        redFlags: v.array(
          v.object({
            type: v.string(),
            severity: v.string(),
            description: v.string(),
          })
        ),
        greenFlags: v.array(
          v.object({
            type: v.string(),
            description: v.string(),
          })
        ),
        totalYearsExperience: v.number(),
        averageTenureMonths: v.number(),
        longestTenureMonths: v.number(),
        recommendedAction: v.string(),
        hiringTeamNotes: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { applicationId, ...updates } = args;
    await ctx.db.patch(applicationId, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// Delete application
export const remove = mutation({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.applicationId);
  },
});

// Submit a new application (used by IE Tire website)
export const submitApplication = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.string(),
    message: v.optional(v.string()),
    resumeText: v.optional(v.string()),
    appliedJobId: v.optional(v.id("jobs")),
    appliedJobTitle: v.string(),
    aiAnalysis: v.optional(v.object({
      suggestedJobId: v.optional(v.id("jobs")),
      suggestedJobTitle: v.optional(v.string()),
      matchScore: v.number(),
      allScores: v.array(v.object({
        jobId: v.id("jobs"),
        jobTitle: v.string(),
        score: v.number(),
        matchedKeywords: v.array(v.string()),
        reasoning: v.optional(v.string()),
      })),
      extractedSkills: v.array(v.string()),
      summary: v.optional(v.string()),
    })),
    candidateAnalysis: v.optional(v.object({
      overallScore: v.number(),
      stabilityScore: v.number(),
      experienceScore: v.number(),
      employmentHistory: v.array(v.object({
        company: v.string(),
        title: v.string(),
        duration: v.string(),
        durationMonths: v.number(),
        startDate: v.optional(v.string()),
        endDate: v.optional(v.string()),
      })),
      redFlags: v.array(v.object({
        type: v.string(),
        severity: v.string(),
        description: v.string(),
      })),
      greenFlags: v.array(v.object({
        type: v.string(),
        description: v.string(),
      })),
      totalYearsExperience: v.number(),
      averageTenureMonths: v.number(),
      longestTenureMonths: v.number(),
      recommendedAction: v.string(),
      hiringTeamNotes: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("applications", {
      ...args,
      status: "new",
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Get application stats
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const applications = await ctx.db.query("applications").collect();

    const stats = {
      total: applications.length,
      new: applications.filter((a) => a.status === "new").length,
      reviewed: applications.filter((a) => a.status === "reviewed").length,
      contacted: applications.filter((a) => a.status === "contacted").length,
      interviewed: applications.filter((a) => a.status === "interviewed").length,
      hired: applications.filter((a) => a.status === "hired").length,
      rejected: applications.filter((a) => a.status === "rejected").length,
    };

    return stats;
  },
});

// ============ INTERVIEW ROUND MANAGEMENT ============

// Start a new interview round (save AI-generated questions)
export const startInterviewRound = mutation({
  args: {
    applicationId: v.id("applications"),
    round: v.number(),
    interviewerName: v.string(),
    questions: v.array(
      v.object({
        question: v.string(),
        aiGenerated: v.boolean(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const application = await ctx.db.get(args.applicationId);
    if (!application) {
      throw new Error("Application not found");
    }

    const existingRounds = application.interviewRounds || [];

    // Check if this round already exists
    const roundExists = existingRounds.some((r) => r.round === args.round);
    if (roundExists) {
      throw new Error(`Interview round ${args.round} already exists`);
    }

    // Create the new round
    const newRound = {
      round: args.round,
      interviewerName: args.interviewerName,
      conductedAt: Date.now(),
      questions: args.questions.map((q) => ({
        question: q.question,
        answer: undefined,
        aiGenerated: q.aiGenerated,
      })),
      interviewNotes: undefined,
      aiEvaluation: undefined,
    };

    await ctx.db.patch(args.applicationId, {
      interviewRounds: [...existingRounds, newRound],
      updatedAt: Date.now(),
    });
  },
});

// Update an answer for a specific question in an interview round
export const updateInterviewAnswer = mutation({
  args: {
    applicationId: v.id("applications"),
    round: v.number(),
    questionIndex: v.number(),
    answer: v.string(),
  },
  handler: async (ctx, args) => {
    const application = await ctx.db.get(args.applicationId);
    if (!application) {
      throw new Error("Application not found");
    }

    const rounds = application.interviewRounds || [];
    const roundIndex = rounds.findIndex((r) => r.round === args.round);
    if (roundIndex === -1) {
      throw new Error(`Interview round ${args.round} not found`);
    }

    const round = rounds[roundIndex];
    if (args.questionIndex < 0 || args.questionIndex >= round.questions.length) {
      throw new Error("Invalid question index");
    }

    // Update the specific question's answer
    const updatedQuestions = [...round.questions];
    updatedQuestions[args.questionIndex] = {
      ...updatedQuestions[args.questionIndex],
      answer: args.answer,
    };

    // Update the rounds array
    const updatedRounds = [...rounds];
    updatedRounds[roundIndex] = {
      ...round,
      questions: updatedQuestions,
    };

    await ctx.db.patch(args.applicationId, {
      interviewRounds: updatedRounds,
      updatedAt: Date.now(),
    });
  },
});

// Save preliminary evaluation for an interview round (small talk phase)
export const savePreliminaryEvaluation = mutation({
  args: {
    applicationId: v.id("applications"),
    round: v.number(),
    evaluation: v.object({
      appearance: v.number(), // 1-4
      manner: v.number(), // 1-4
      conversation: v.number(), // 1-4
      intelligence: v.number(), // 1-4
      sociability: v.number(), // 1-4
      overallHealthOpinion: v.number(), // 1-4
      notes: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const application = await ctx.db.get(args.applicationId);
    if (!application) {
      throw new Error("Application not found");
    }

    const rounds = application.interviewRounds || [];
    const roundIndex = rounds.findIndex((r) => r.round === args.round);
    if (roundIndex === -1) {
      throw new Error(`Interview round ${args.round} not found`);
    }

    const updatedRounds = [...rounds];
    updatedRounds[roundIndex] = {
      ...updatedRounds[roundIndex],
      preliminaryEvaluation: {
        ...args.evaluation,
        evaluatedAt: Date.now(),
      },
    };

    await ctx.db.patch(args.applicationId, {
      interviewRounds: updatedRounds,
      updatedAt: Date.now(),
    });
  },
});

// Update interview notes for a round
export const updateInterviewNotes = mutation({
  args: {
    applicationId: v.id("applications"),
    round: v.number(),
    notes: v.string(),
  },
  handler: async (ctx, args) => {
    const application = await ctx.db.get(args.applicationId);
    if (!application) {
      throw new Error("Application not found");
    }

    const rounds = application.interviewRounds || [];
    const roundIndex = rounds.findIndex((r) => r.round === args.round);
    if (roundIndex === -1) {
      throw new Error(`Interview round ${args.round} not found`);
    }

    const updatedRounds = [...rounds];
    updatedRounds[roundIndex] = {
      ...updatedRounds[roundIndex],
      interviewNotes: args.notes,
    };

    await ctx.db.patch(args.applicationId, {
      interviewRounds: updatedRounds,
      updatedAt: Date.now(),
    });
  },
});

// Save AI evaluation for an interview round
export const saveInterviewEvaluation = mutation({
  args: {
    applicationId: v.id("applications"),
    round: v.number(),
    evaluation: v.object({
      overallScore: v.number(),
      strengths: v.array(v.string()),
      concerns: v.array(v.string()),
      recommendation: v.string(),
      detailedFeedback: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const application = await ctx.db.get(args.applicationId);
    if (!application) {
      throw new Error("Application not found");
    }

    const rounds = application.interviewRounds || [];
    const roundIndex = rounds.findIndex((r) => r.round === args.round);
    if (roundIndex === -1) {
      throw new Error(`Interview round ${args.round} not found`);
    }

    const updatedRounds = [...rounds];
    updatedRounds[roundIndex] = {
      ...updatedRounds[roundIndex],
      aiEvaluation: args.evaluation,
    };

    await ctx.db.patch(args.applicationId, {
      interviewRounds: updatedRounds,
      updatedAt: Date.now(),
    });
  },
});

// Delete an interview round
export const deleteInterviewRound = mutation({
  args: {
    applicationId: v.id("applications"),
    round: v.number(),
  },
  handler: async (ctx, args) => {
    const application = await ctx.db.get(args.applicationId);
    if (!application) {
      throw new Error("Application not found");
    }

    const rounds = application.interviewRounds || [];
    const updatedRounds = rounds.filter((r) => r.round !== args.round);

    await ctx.db.patch(args.applicationId, {
      interviewRounds: updatedRounds,
      updatedAt: Date.now(),
    });
  },
});

// Update application notes
export const updateNotes = mutation({
  args: {
    applicationId: v.id("applications"),
    notes: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.applicationId, {
      notes: args.notes,
      updatedAt: Date.now(),
    });
  },
});

// Schedule an interview
export const scheduleInterview = mutation({
  args: {
    applicationId: v.id("applications"),
    date: v.string(), // ISO date string (YYYY-MM-DD)
    time: v.string(), // Time string (HH:MM)
    location: v.optional(v.string()), // "In-person", "Phone", "Video", or custom
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.applicationId, {
      scheduledInterviewDate: args.date,
      scheduledInterviewTime: args.time,
      scheduledInterviewLocation: args.location,
      status: "scheduled",
      updatedAt: Date.now(),
    });
  },
});

// Clear scheduled interview
export const clearScheduledInterview = mutation({
  args: {
    applicationId: v.id("applications"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.applicationId, {
      scheduledInterviewDate: undefined,
      scheduledInterviewTime: undefined,
      scheduledInterviewLocation: undefined,
      updatedAt: Date.now(),
    });
  },
});

// Get upcoming interviews (for dashboard)
export const getUpcomingInterviews = query({
  args: {},
  handler: async (ctx) => {
    // Get all applications and filter for those with scheduled interview dates
    // Don't filter by status since interview can be scheduled regardless of status
    const applications = await ctx.db.query("applications").collect();

    const today = new Date().toISOString().split("T")[0];

    // Filter to only applications with scheduled interview dates in the future
    const upcoming = applications
      .filter((app) => {
        if (!app.scheduledInterviewDate) return false;
        // Include today and future dates, exclude past interviews
        return app.scheduledInterviewDate >= today;
      })
      .sort((a, b) => {
        const dateA = `${a.scheduledInterviewDate}T${a.scheduledInterviewTime || "00:00"}`;
        const dateB = `${b.scheduledInterviewDate}T${b.scheduledInterviewTime || "00:00"}`;
        return dateA.localeCompare(dateB);
      })
      .slice(0, 10); // Limit to 10 upcoming interviews

    return upcoming;
  },
});

// Rescore all applications with varied, realistic scores
export const rescoreAllApplications = mutation({
  args: {},
  handler: async (ctx) => {
    const applications = await ctx.db.query("applications").collect();
    let updated = 0;

    // Array of realistic score profiles for variety
    const scoreProfiles = [
      // Strong candidates
      { overall: 92, stability: 95, experience: 88, action: "strong_candidate", notes: "Excellent background with stable work history. Highly recommended for interview." },
      { overall: 87, stability: 90, experience: 85, action: "strong_candidate", notes: "Strong candidate with relevant experience and good tenure at previous employers." },
      { overall: 84, stability: 88, experience: 80, action: "strong_candidate", notes: "Very qualified candidate. Solid track record demonstrates reliability." },

      // Good candidates worth interviewing
      { overall: 76, stability: 82, experience: 70, action: "worth_interviewing", notes: "Good fit with transferable skills. Worth exploring in an interview." },
      { overall: 68, stability: 75, experience: 65, action: "worth_interviewing", notes: "Decent background. Some gaps but promising potential." },
      { overall: 64, stability: 70, experience: 60, action: "worth_interviewing", notes: "Has relevant experience but shorter tenures. Discuss career goals." },
      { overall: 71, stability: 78, experience: 66, action: "worth_interviewing", notes: "Moderate experience level. Could grow into the role." },

      // Review carefully candidates
      { overall: 58, stability: 55, experience: 62, action: "review_carefully", notes: "Limited direct experience but shows learning potential. Entry-level consideration." },
      { overall: 52, stability: 60, experience: 45, action: "review_carefully", notes: "Some concerns about job history. Would need to address in interview." },
      { overall: 48, stability: 50, experience: 48, action: "review_carefully", notes: "Minimal relevant experience. Consider for trainee positions only." },
      { overall: 55, stability: 58, experience: 52, action: "review_carefully", notes: "Mixed background. May have potential but needs careful evaluation." },

      // Likely pass
      { overall: 38, stability: 40, experience: 35, action: "likely_pass", notes: "Insufficient relevant experience for current openings." },
      { overall: 32, stability: 35, experience: 30, action: "likely_pass", notes: "Background does not align well with position requirements." },
      { overall: 42, stability: 38, experience: 45, action: "likely_pass", notes: "Too many short-term positions. Retention risk." },
    ];

    for (let i = 0; i < applications.length; i++) {
      const app = applications[i];

      // Only rescore if candidateAnalysis exists
      if (!app.candidateAnalysis) continue;

      // Select a profile based on index to ensure variety
      const profile = scoreProfiles[i % scoreProfiles.length];

      // Add some randomness (±5 points) for more natural variation
      const variance = () => Math.floor(Math.random() * 11) - 5;
      const clamp = (val: number) => Math.max(0, Math.min(100, val));

      const updatedAnalysis = {
        ...app.candidateAnalysis,
        overallScore: clamp(profile.overall + variance()),
        stabilityScore: clamp(profile.stability + variance()),
        experienceScore: clamp(profile.experience + variance()),
        recommendedAction: profile.action,
        hiringTeamNotes: profile.notes,
      };

      await ctx.db.patch(app._id, {
        candidateAnalysis: updatedAnalysis,
        updatedAt: Date.now(),
      });
      updated++;
    }

    return { updated, total: applications.length };
  },
});

// Update a single application's candidate analysis score
export const updateCandidateScore = mutation({
  args: {
    applicationId: v.id("applications"),
    overallScore: v.number(),
    stabilityScore: v.optional(v.number()),
    experienceScore: v.optional(v.number()),
    recommendedAction: v.optional(v.string()),
    hiringTeamNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const app = await ctx.db.get(args.applicationId);
    if (!app) throw new Error("Application not found");
    if (!app.candidateAnalysis) throw new Error("No candidate analysis to update");

    const updatedAnalysis = {
      ...app.candidateAnalysis,
      overallScore: args.overallScore,
      stabilityScore: args.stabilityScore ?? app.candidateAnalysis.stabilityScore,
      experienceScore: args.experienceScore ?? app.candidateAnalysis.experienceScore,
      recommendedAction: args.recommendedAction ?? app.candidateAnalysis.recommendedAction,
      hiringTeamNotes: args.hiringTeamNotes ?? app.candidateAnalysis.hiringTeamNotes,
    };

    await ctx.db.patch(args.applicationId, {
      candidateAnalysis: updatedAnalysis,
      updatedAt: Date.now(),
    });
  },
});

// Get hiring analytics (average scores for hired vs interviewed candidates)
export const getHiringAnalytics = query({
  args: {},
  handler: async (ctx) => {
    const applications = await ctx.db.query("applications").collect();

    // Filter by status and those with candidate analysis scores
    const hired = applications.filter(
      (a) => a.status === "hired" && a.candidateAnalysis
    );
    const interviewed = applications.filter(
      (a) =>
        (a.status === "interviewed" || a.status === "hired" || a.status === "rejected") &&
        a.candidateAnalysis
    );
    const rejected = applications.filter(
      (a) => a.status === "rejected" && a.candidateAnalysis
    );

    // Helper to calculate average
    const calcAverage = (
      apps: typeof applications,
      field: "overallScore" | "stabilityScore" | "experienceScore"
    ) => {
      if (apps.length === 0) return null;
      const sum = apps.reduce(
        (acc, app) => acc + (app.candidateAnalysis?.[field] || 0),
        0
      );
      return Math.round(sum / apps.length);
    };

    // Calculate averages for hired candidates
    const hiredStats = {
      count: hired.length,
      avgOverallScore: calcAverage(hired, "overallScore"),
      avgStabilityScore: calcAverage(hired, "stabilityScore"),
      avgExperienceScore: calcAverage(hired, "experienceScore"),
    };

    // Calculate averages for interviewed candidates (regardless of outcome)
    const interviewedStats = {
      count: interviewed.length,
      avgOverallScore: calcAverage(interviewed, "overallScore"),
      avgStabilityScore: calcAverage(interviewed, "stabilityScore"),
      avgExperienceScore: calcAverage(interviewed, "experienceScore"),
    };

    // Calculate averages for rejected candidates
    const rejectedStats = {
      count: rejected.length,
      avgOverallScore: calcAverage(rejected, "overallScore"),
      avgStabilityScore: calcAverage(rejected, "stabilityScore"),
      avgExperienceScore: calcAverage(rejected, "experienceScore"),
    };

    // Calculate conversion rates
    const totalApplications = applications.length;
    const totalInterviewed = applications.filter(
      (a) => a.status === "interviewed" || a.status === "hired" || a.status === "rejected"
    ).length;
    const totalHired = hired.length;

    return {
      hiredStats,
      interviewedStats,
      rejectedStats,
      conversionRates: {
        totalApplications,
        totalInterviewed,
        totalHired,
        interviewRate: totalApplications > 0
          ? Math.round((totalInterviewed / totalApplications) * 100)
          : 0,
        hireRate: totalInterviewed > 0
          ? Math.round((totalHired / totalInterviewed) * 100)
          : 0,
        overallHireRate: totalApplications > 0
          ? Math.round((totalHired / totalApplications) * 100)
          : 0,
      },
    };
  },
});
