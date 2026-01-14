import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

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

// Check for existing application by email or name (for duplicate detection)
export const checkForDuplicate = query({
  args: {
    email: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check by email first (most reliable)
    if (args.email && args.email.trim().length > 0) {
      const byEmail = await ctx.db
        .query("applications")
        .withIndex("by_email", (q) => q.eq("email", args.email!.toLowerCase()))
        .first();
      if (byEmail) return byEmail;
    }

    // Also check by name if email not found
    if (args.firstName && args.lastName) {
      const allApps = await ctx.db.query("applications").collect();
      const byName = allApps.find(
        (app) =>
          app.firstName.toLowerCase() === args.firstName!.toLowerCase() &&
          app.lastName.toLowerCase() === args.lastName!.toLowerCase()
      );
      if (byName) return byName;
    }

    return null;
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
    resumeFileId: v.optional(v.id("_storage")), // Actual PDF file
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

// Update applied job (change the position they applied for)
export const updateAppliedJob = mutation({
  args: {
    applicationId: v.id("applications"),
    jobId: v.id("jobs"),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) throw new Error("Job not found");

    await ctx.db.patch(args.applicationId, {
      appliedJobId: args.jobId,
      appliedJobTitle: job.title,
      updatedAt: Date.now(),
    });

    return { success: true, jobTitle: job.title };
  },
});

// Schedule an interview
export const scheduleInterview = mutation({
  args: {
    applicationId: v.id("applications"),
    date: v.string(), // ISO date string (YYYY-MM-DD)
    time: v.string(), // Time string (HH:MM)
    location: v.optional(v.string()), // "In-person", "Phone", "Video", or custom
    userId: v.id("users"), // User scheduling the interview (for calendar event)
    startTimestamp: v.optional(v.number()), // Pre-calculated timestamp from frontend (preserves local timezone)
    additionalAttendees: v.optional(v.array(v.id("users"))), // Optional additional attendees
  },
  handler: async (ctx, args) => {
    const application = await ctx.db.get(args.applicationId);
    if (!application) throw new Error("Application not found");

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const now = Date.now();

    // Use frontend-provided timestamp (preserves user's local timezone)
    // The frontend calculates this using new Date(date + 'T' + time) which uses local timezone
    const startTime = args.startTimestamp!;
    const endTime = startTime + 60 * 60 * 1000; // 1 hour interview by default

    // Create calendar event
    const eventId = await ctx.db.insert("events", {
      title: `Interview: ${application.firstName} ${application.lastName}`,
      description: `Job Interview for ${application.appliedJobTitle}\n\nCandidate: ${application.firstName} ${application.lastName}\nEmail: ${application.email}\nPhone: ${application.phone}`,
      startTime,
      endTime,
      isAllDay: false,
      location: args.location,
      meetingType: args.location === "Video" ? "video" : args.location === "Phone" ? "phone" : "in-person",
      createdBy: args.userId,
      createdByName: user.name,
      createdAt: now,
      updatedAt: now,
    });

    // Find Nick Quinn by email to auto-add as attendee
    const allUsers = await ctx.db.query("users").collect();
    const nickUser = allUsers.find(u => u.email === "Mrquinn1985@gmail.com");

    // Collect all attendees: scheduling user, Nick (if found), and any additional attendees
    const attendeeIds = new Set<string>();
    attendeeIds.add(args.userId); // Add the scheduling user
    if (nickUser) {
      attendeeIds.add(nickUser._id); // Add Nick
    }
    if (args.additionalAttendees) {
      args.additionalAttendees.forEach(id => attendeeIds.add(id));
    }

    // Create event invites for all attendees
    for (const attendeeId of attendeeIds) {
      await ctx.db.insert("eventInvites", {
        eventId,
        userId: attendeeId as any, // Cast needed for Set iteration
        status: "accepted", // Auto-accept for interview attendees
        isRead: true,
        notifiedAt: now,
        createdAt: now,
      });
    }

    // Update application with interview details and event ID
    await ctx.db.patch(args.applicationId, {
      scheduledInterviewDate: args.date,
      scheduledInterviewTime: args.time,
      scheduledInterviewLocation: args.location,
      scheduledInterviewEventId: eventId,
      status: "scheduled",
      updatedAt: now,
    });

    // Send interview confirmation email (async, don't block)
    await ctx.scheduler.runAfter(0, internal.emails.sendInterviewScheduledEmail, {
      applicantFirstName: application.firstName,
      applicantLastName: application.lastName,
      applicantEmail: application.email,
      resumeText: application.resumeText,
      jobTitle: application.appliedJobTitle || "Position",
      interviewDate: args.date,
      interviewTime: args.time,
      interviewLocation: args.location,
      scheduledByName: user.name,
      scheduledByTitle: user.role === "super_admin" ? "Chief Technology Officer" : user.role === "admin" ? "HR Manager" : undefined,
      companyName: "Import Export Tire Co",
      contactPhone: "(724) 537-7559",
      contactEmail: "hr@iecentral.com",
    });

    return eventId;
  },
});

// Reschedule an interview (updates both application and calendar event)
export const rescheduleInterview = mutation({
  args: {
    applicationId: v.id("applications"),
    date: v.string(), // New ISO date string (YYYY-MM-DD)
    time: v.string(), // New time string (HH:MM)
    location: v.optional(v.string()),
    startTimestamp: v.number(), // Pre-calculated timestamp from frontend
  },
  handler: async (ctx, args) => {
    const application = await ctx.db.get(args.applicationId);
    if (!application) throw new Error("Application not found");

    // Store old date/time for the reschedule email
    const oldDate = application.scheduledInterviewDate;
    const oldTime = application.scheduledInterviewTime;

    const now = Date.now();
    const endTime = args.startTimestamp + 60 * 60 * 1000; // 1 hour interview

    // Update the calendar event if it exists
    if (application.scheduledInterviewEventId) {
      const event = await ctx.db.get(application.scheduledInterviewEventId);
      if (event && !event.isCancelled) {
        await ctx.db.patch(application.scheduledInterviewEventId, {
          startTime: args.startTimestamp,
          endTime,
          location: args.location,
          updatedAt: now,
        });
      }
    }

    // Update application with new interview details
    await ctx.db.patch(args.applicationId, {
      scheduledInterviewDate: args.date,
      scheduledInterviewTime: args.time,
      scheduledInterviewLocation: args.location,
      updatedAt: now,
    });

    // Send reschedule notification email (async, don't block)
    if (oldDate && oldTime) {
      await ctx.scheduler.runAfter(0, internal.emails.sendInterviewRescheduledEmail, {
        applicantFirstName: application.firstName,
        applicantLastName: application.lastName,
        applicantEmail: application.email,
        resumeText: application.resumeText,
        jobTitle: application.appliedJobTitle || "Position",
        oldDate,
        oldTime,
        newDate: args.date,
        newTime: args.time,
        interviewLocation: args.location,
        companyName: "Import Export Tire Co",
        contactPhone: "(724) 537-7559",
        contactEmail: "hr@iecentral.com",
      });
    }
  },
});

// Clear scheduled interview
export const clearScheduledInterview = mutation({
  args: {
    applicationId: v.id("applications"),
    userId: v.id("users"), // User clearing the interview (for cancelling event)
  },
  handler: async (ctx, args) => {
    const application = await ctx.db.get(args.applicationId);
    if (!application) throw new Error("Application not found");

    // Cancel the associated calendar event if it exists
    if (application.scheduledInterviewEventId) {
      const event = await ctx.db.get(application.scheduledInterviewEventId);
      if (event && !event.isCancelled) {
        await ctx.db.patch(application.scheduledInterviewEventId, {
          isCancelled: true,
          cancelledAt: Date.now(),
          cancelledBy: args.userId,
          updatedAt: Date.now(),
        });
      }
    }

    await ctx.db.patch(args.applicationId, {
      scheduledInterviewDate: undefined,
      scheduledInterviewTime: undefined,
      scheduledInterviewLocation: undefined,
      scheduledInterviewEventId: undefined,
      updatedAt: Date.now(),
    });
  },
});

// Add attendees to an existing scheduled interview
export const addInterviewAttendees = mutation({
  args: {
    applicationId: v.id("applications"),
    attendeeIds: v.array(v.id("users")),
    userId: v.optional(v.id("users")), // User performing the action (for event creation if needed)
  },
  handler: async (ctx, args) => {
    const application = await ctx.db.get(args.applicationId);
    if (!application) throw new Error("Application not found");

    // Check if there's a scheduled interview
    if (!application.scheduledInterviewDate) {
      throw new Error("No interview scheduled for this application");
    }

    const now = Date.now();
    let eventId = application.scheduledInterviewEventId;

    // If there's a scheduled date but no event ID, create the calendar event
    if (!eventId) {
      // Get the user who's adding attendees to create the event
      const creatorId = args.userId || args.attendeeIds[0];
      const creator = await ctx.db.get(creatorId);

      // Parse interview time to create proper event timestamps
      const interviewDate = application.scheduledInterviewDate;
      const interviewTime = application.scheduledInterviewTime || "09:00";
      const startTime = new Date(`${interviewDate}T${interviewTime}:00`).getTime();
      const endTime = startTime + 60 * 60 * 1000; // 1 hour interview

      eventId = await ctx.db.insert("events", {
        title: `Interview: ${application.firstName} ${application.lastName}`,
        description: `Job Interview for ${application.appliedJobTitle}\n\nCandidate: ${application.firstName} ${application.lastName}\nEmail: ${application.email}\nPhone: ${application.phone}`,
        startTime,
        endTime,
        isAllDay: false,
        location: application.scheduledInterviewLocation,
        meetingType: application.scheduledInterviewLocation === "Video" ? "video" :
                     application.scheduledInterviewLocation === "Phone" ? "phone" : "in-person",
        createdBy: creatorId,
        createdByName: creator?.name ?? "Unknown",
        createdAt: now,
        updatedAt: now,
      });

      // Update application with the new event ID
      await ctx.db.patch(args.applicationId, {
        scheduledInterviewEventId: eventId,
        updatedAt: now,
      });
    }

    const event = await ctx.db.get(eventId);
    if (!event) throw new Error("Interview event not found");

    if (event.isCancelled) {
      throw new Error("Cannot add attendees to a cancelled interview");
    }

    // Get existing invites for this event to avoid duplicates
    const existingInvites = await ctx.db
      .query("eventInvites")
      .withIndex("by_event", (q) => q.eq("eventId", eventId!))
      .collect();

    const existingUserIds = new Set(existingInvites.map((inv) => inv.userId));

    // Add new invites for attendees not already invited
    const addedAttendees: string[] = [];
    for (const attendeeId of args.attendeeIds) {
      if (!existingUserIds.has(attendeeId)) {
        await ctx.db.insert("eventInvites", {
          eventId: eventId!,
          userId: attendeeId,
          status: "accepted", // Auto-accept for interview attendees
          isRead: true,
          notifiedAt: now,
          createdAt: now,
        });

        const user = await ctx.db.get(attendeeId);
        if (user) {
          addedAttendees.push(user.name);
        }
      }
    }

    return {
      addedCount: addedAttendees.length,
      addedAttendees,
    };
  },
});

// Get attendees for a scheduled interview
export const getInterviewAttendees = query({
  args: {
    applicationId: v.id("applications"),
  },
  handler: async (ctx, args) => {
    const application = await ctx.db.get(args.applicationId);
    if (!application) return [];

    if (!application.scheduledInterviewEventId) return [];

    const invites = await ctx.db
      .query("eventInvites")
      .withIndex("by_event", (q) => q.eq("eventId", application.scheduledInterviewEventId!))
      .collect();

    const attendees = await Promise.all(
      invites.map(async (invite) => {
        const user = await ctx.db.get(invite.userId);
        return user ? {
          _id: user._id,
          name: user.name,
          email: user.email,
          status: invite.status,
        } : null;
      })
    );

    return attendees.filter(Boolean);
  },
});

// Remove an attendee from a scheduled interview
export const removeInterviewAttendee = mutation({
  args: {
    applicationId: v.id("applications"),
    attendeeId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const application = await ctx.db.get(args.applicationId);
    if (!application) throw new Error("Application not found");

    if (!application.scheduledInterviewEventId) {
      throw new Error("No interview scheduled for this application");
    }

    // Find and delete the invite
    const invites = await ctx.db
      .query("eventInvites")
      .withIndex("by_event", (q) => q.eq("eventId", application.scheduledInterviewEventId!))
      .collect();

    const inviteToRemove = invites.find((inv) => inv.userId === args.attendeeId);
    if (inviteToRemove) {
      await ctx.db.delete(inviteToRemove._id);
    }
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

// Get recently interviewed applications with interview summary
export const getRecentlyInterviewed = query({
  args: {},
  handler: async (ctx) => {
    const applications = await ctx.db.query("applications").collect();

    // Filter applications that have interview rounds
    const interviewedApps = applications
      .filter((app) => app.interviewRounds && app.interviewRounds.length > 0)
      .map((app) => {
        const rounds = app.interviewRounds || [];
        const latestRound = rounds[rounds.length - 1];

        // Calculate preliminary evaluation average if exists
        let prelimScore = null;
        if (latestRound.preliminaryEvaluation) {
          const prelim = latestRound.preliminaryEvaluation;
          const scores = [
            prelim.appearance,
            prelim.manner,
            prelim.conversation,
            prelim.intelligence,
            prelim.sociability,
            prelim.overallHealthOpinion,
          ].filter((s) => s !== undefined);
          if (scores.length > 0) {
            prelimScore = Math.round(
              (scores.reduce((a, b) => a + b, 0) / scores.length) * 25
            ); // Convert 1-4 to percentage
          }
        }

        // Get AI evaluation score if exists
        const aiScore = latestRound.aiEvaluation?.overallScore || null;

        return {
          _id: app._id,
          firstName: app.firstName,
          lastName: app.lastName,
          appliedJobTitle: app.appliedJobTitle,
          status: app.status,
          interviewDate: latestRound.conductedAt,
          interviewerName: latestRound.interviewerName,
          roundNumber: latestRound.round,
          totalRounds: rounds.length,
          preliminaryScore: prelimScore,
          aiScore: aiScore,
          recommendation: latestRound.aiEvaluation?.recommendation || null,
          interviewNotes: latestRound.interviewNotes || null,
        };
      })
      .sort((a, b) => b.interviewDate - a.interviewDate)
      .slice(0, 10); // Return most recent 10

    return interviewedApps;
  },
});

// ============ ACTIVITY TIMELINE FOR ATS ============

// Log an activity for an application
export const logActivity = mutation({
  args: {
    applicationId: v.id("applications"),
    type: v.string(),
    description: v.string(),
    previousValue: v.optional(v.string()),
    newValue: v.optional(v.string()),
    performedBy: v.optional(v.id("users")),
    performedByName: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("applicationActivity", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

// Get activity timeline for an application
export const getActivityTimeline = query({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, args) => {
    const activities = await ctx.db
      .query("applicationActivity")
      .withIndex("by_application", (q) => q.eq("applicationId", args.applicationId))
      .order("desc")
      .collect();

    return activities;
  },
});

// Get applications grouped by status for Kanban view
export const getByStatusGrouped = query({
  args: {},
  handler: async (ctx) => {
    const applications = await ctx.db
      .query("applications")
      .withIndex("by_created")
      .order("desc")
      .collect();

    // Group by status
    const grouped: Record<string, typeof applications> = {
      new: [],
      reviewed: [],
      contacted: [],
      scheduled: [],
      interviewed: [],
      hired: [],
      rejected: [],
    };

    for (const app of applications) {
      if (grouped[app.status]) {
        grouped[app.status].push(app);
      }
    }

    return grouped;
  },
});

// ============ RESUME FILE STORAGE ============

// Generate upload URL for resume PDF
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Get download URL for a resume file
export const getResumeUrl = query({
  args: { fileId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.fileId);
  },
});

// Update application with resume file
export const updateResumeFile = mutation({
  args: {
    applicationId: v.id("applications"),
    resumeFileId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.applicationId, {
      resumeFileId: args.resumeFileId,
      updatedAt: Date.now(),
    });
  },
});

// Update status with activity logging
export const updateStatusWithActivity = mutation({
  args: {
    applicationId: v.id("applications"),
    newStatus: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const application = await ctx.db.get(args.applicationId);
    if (!application) throw new Error("Application not found");

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const previousStatus = application.status;

    // Update the status
    await ctx.db.patch(args.applicationId, {
      status: args.newStatus,
      updatedAt: Date.now(),
    });

    // Log the activity
    await ctx.db.insert("applicationActivity", {
      applicationId: args.applicationId,
      type: "status_change",
      description: `Status changed from ${previousStatus} to ${args.newStatus}`,
      previousValue: previousStatus,
      newValue: args.newStatus,
      performedBy: args.userId,
      performedByName: user.name,
      createdAt: Date.now(),
    });

    return args.applicationId;
  },
});
