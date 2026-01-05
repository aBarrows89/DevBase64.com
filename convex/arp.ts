import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Training modules configuration
export const ARP_TRAINING_MODULES = [
  { code: "core", name: "Attendance Importance & Etiquette", required: true },
  { code: "sleep", name: "Sleep Hygiene & Morning Routines", required: false },
  { code: "time", name: "Time Management & Planning", required: false },
  { code: "transport", name: "Transportation Backup Planning", required: false },
  { code: "communication", name: "Communication & Professional Expectations", required: false },
  { code: "stress", name: "Stress Management & Self-Care", required: false },
];

// Program tier configuration
const PROGRAM_TIERS = {
  1: { durationDays: 30, meetingCount: 4 },
  2: { durationDays: 60, meetingCount: 8 },
  3: { durationDays: 90, meetingCount: 12 },
};

// Helper: Calculate date string offset
function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

// Helper: Get today's date string
function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

// ============ QUERIES ============

// Check eligibility for ARP enrollment
export const checkEligibility = query({
  args: {
    personnelId: v.id("personnel"),
  },
  handler: async (ctx, args) => {
    const personnel = await ctx.db.get(args.personnelId);
    if (!personnel) {
      return { eligible: false, reason: "Personnel not found" };
    }

    // Get all write-ups for this personnel
    const writeUps = await ctx.db
      .query("writeUps")
      .withIndex("by_personnel", (q) => q.eq("personnelId", args.personnelId))
      .collect();

    // Count active attendance write-ups (not archived, within 90 days)
    const today = getToday();
    const ninetyDaysAgo = addDays(today, -90);
    const activeAttendanceWriteUps = writeUps.filter(
      (w) =>
        w.category === "attendance" &&
        !w.isArchived &&
        w.date >= ninetyDaysAgo
    );

    // Get enrollment history
    const enrollments = await ctx.db
      .query("arpEnrollments")
      .withIndex("by_personnel", (q) => q.eq("personnelId", args.personnelId))
      .collect();

    const completedEnrollments = enrollments.filter((e) => e.status === "completed");
    const failedEnrollments = enrollments.filter((e) => e.status === "failed");
    const activeEnrollment = enrollments.find((e) => e.status === "active");

    // Check if currently enrolled
    if (activeEnrollment) {
      return {
        eligible: false,
        reason: "Already enrolled in ARP",
        currentEnrollmentId: activeEnrollment._id,
      };
    }

    // Check enrollment count (max 3)
    const totalEnrollments = completedEnrollments.length + failedEnrollments.length;
    if (totalEnrollments >= 3) {
      return {
        eligible: false,
        reason: "Maximum ARP enrollments (3) reached",
      };
    }

    // Check 90-day cooldown after failure
    const lastFailure = failedEnrollments
      .filter((e) => e.outcomeDate)
      .sort((a, b) => (b.outcomeDate! > a.outcomeDate! ? 1 : -1))[0];

    if (lastFailure && lastFailure.nextEligibleDate) {
      if (today < lastFailure.nextEligibleDate) {
        return {
          eligible: false,
          reason: `90-day cooldown period - eligible after ${lastFailure.nextEligibleDate}`,
          nextEligibleDate: lastFailure.nextEligibleDate,
        };
      }
    }

    // Must have at least 2 attendance write-ups to be eligible
    if (activeAttendanceWriteUps.length < 2) {
      return {
        eligible: false,
        reason: `Requires 2 attendance write-ups for eligibility (currently has ${activeAttendanceWriteUps.length})`,
        writeUpCount: activeAttendanceWriteUps.length,
      };
    }

    // Determine tier based on enrollment count
    const nextEnrollmentCount = totalEnrollments + 1;
    const tier = Math.min(nextEnrollmentCount, 3) as 1 | 2 | 3;
    const tierConfig = PROGRAM_TIERS[tier];

    return {
      eligible: true,
      tier,
      enrollmentCount: nextEnrollmentCount,
      durationDays: tierConfig.durationDays,
      meetingCount: tierConfig.meetingCount,
      activeAttendanceWriteUps: activeAttendanceWriteUps.length,
      previousEnrollments: {
        completed: completedEnrollments.length,
        failed: failedEnrollments.length,
      },
    };
  },
});

// Get a single enrollment with all related data
export const getEnrollment = query({
  args: {
    enrollmentId: v.id("arpEnrollments"),
  },
  handler: async (ctx, args) => {
    const enrollment = await ctx.db.get(args.enrollmentId);
    if (!enrollment) return null;

    // Get personnel info
    const personnel = await ctx.db.get(enrollment.personnelId);

    // Get coach info
    const coach = await ctx.db.get(enrollment.coachId);

    // Get meetings
    const meetings = await ctx.db
      .query("arpMeetings")
      .withIndex("by_enrollment", (q) => q.eq("enrollmentId", args.enrollmentId))
      .collect();

    // Get root cause assessment
    const rootCause = await ctx.db
      .query("arpRootCause")
      .withIndex("by_enrollment", (q) => q.eq("enrollmentId", args.enrollmentId))
      .first();

    // Get training assignments
    const training = await ctx.db
      .query("arpTraining")
      .withIndex("by_enrollment", (q) => q.eq("enrollmentId", args.enrollmentId))
      .collect();

    // Get failure write-up if exists
    const failureWriteUp = enrollment.failureWriteUpId
      ? await ctx.db.get(enrollment.failureWriteUpId)
      : null;

    // Get agreement
    const agreement = await ctx.db
      .query("arpAgreements")
      .withIndex("by_enrollment", (q) => q.eq("enrollmentId", args.enrollmentId))
      .first();

    // Calculate progress
    const completedMeetings = meetings.filter((m) => m.status === "completed").length;
    const completedTraining = training.filter((t) => t.status === "completed").length;
    const today = getToday();
    const daysRemaining = Math.max(
      0,
      Math.ceil(
        (new Date(enrollment.programEndDate).getTime() - new Date(today).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );
    const daysElapsed = enrollment.programDurationDays - daysRemaining;
    const progressPercent = Math.round((daysElapsed / enrollment.programDurationDays) * 100);

    return {
      ...enrollment,
      personnel: personnel
        ? {
            _id: personnel._id,
            name: `${personnel.firstName} ${personnel.lastName}`,
            position: personnel.position,
            department: personnel.department,
            locationId: personnel.locationId,
          }
        : null,
      coach: coach
        ? {
            _id: coach._id,
            name: `${coach.firstName} ${coach.lastName}`,
          }
        : null,
      meetings: meetings.sort((a, b) => a.meetingNumber - b.meetingNumber),
      rootCause,
      training,
      failureWriteUp,
      agreement,
      progress: {
        daysRemaining,
        daysElapsed,
        progressPercent,
        meetingsCompleted: completedMeetings,
        meetingsTotal: meetings.length,
        trainingCompleted: completedTraining,
        trainingTotal: training.length,
      },
    };
  },
});

// Get all active enrollments
export const getActiveEnrollments = query({
  args: {},
  handler: async (ctx) => {
    const enrollments = await ctx.db
      .query("arpEnrollments")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    const enriched = await Promise.all(
      enrollments.map(async (enrollment) => {
        const personnel = await ctx.db.get(enrollment.personnelId);
        const coach = await ctx.db.get(enrollment.coachId);
        const location = personnel?.locationId
          ? await ctx.db.get(personnel.locationId)
          : null;

        // Get meetings for progress
        const meetings = await ctx.db
          .query("arpMeetings")
          .withIndex("by_enrollment", (q) => q.eq("enrollmentId", enrollment._id))
          .collect();

        // Get training for progress
        const training = await ctx.db
          .query("arpTraining")
          .withIndex("by_enrollment", (q) => q.eq("enrollmentId", enrollment._id))
          .collect();

        const completedMeetings = meetings.filter((m) => m.status === "completed").length;
        const completedTraining = training.filter((t) => t.status === "completed").length;

        // Next meeting
        const today = getToday();
        const nextMeeting = meetings
          .filter((m) => m.status === "scheduled" && m.scheduledDate >= today)
          .sort((a, b) => (a.scheduledDate > b.scheduledDate ? 1 : -1))[0];

        const daysRemaining = Math.max(
          0,
          Math.ceil(
            (new Date(enrollment.programEndDate).getTime() - new Date(today).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        );

        return {
          ...enrollment,
          personnelName: personnel
            ? `${personnel.firstName} ${personnel.lastName}`
            : "Unknown",
          personnelDepartment: personnel?.department,
          personnelPosition: personnel?.position,
          locationName: location?.name,
          coachName: coach ? `${coach.firstName} ${coach.lastName}` : "Unknown",
          daysRemaining,
          nextMeetingDate: nextMeeting?.scheduledDate,
          meetingsCompleted: completedMeetings,
          meetingsTotal: meetings.length,
          trainingCompleted: completedTraining,
          trainingTotal: training.length,
        };
      })
    );

    return enriched.sort((a, b) => a.daysRemaining - b.daysRemaining);
  },
});

// Get enrollments by personnel
export const getEnrollmentsByPersonnel = query({
  args: {
    personnelId: v.id("personnel"),
  },
  handler: async (ctx, args) => {
    const enrollments = await ctx.db
      .query("arpEnrollments")
      .withIndex("by_personnel", (q) => q.eq("personnelId", args.personnelId))
      .order("desc")
      .collect();

    return enrollments;
  },
});

// Get enrollments by coach
export const getEnrollmentsByCoach = query({
  args: {
    coachId: v.id("personnel"),
  },
  handler: async (ctx, args) => {
    const enrollments = await ctx.db
      .query("arpEnrollments")
      .withIndex("by_coach", (q) => q.eq("coachId", args.coachId))
      .collect();

    const enriched = await Promise.all(
      enrollments.map(async (enrollment) => {
        const personnel = await ctx.db.get(enrollment.personnelId);
        return {
          ...enrollment,
          personnelName: personnel
            ? `${personnel.firstName} ${personnel.lastName}`
            : "Unknown",
        };
      })
    );

    return enriched;
  },
});

// Get today's scheduled meetings
export const getMeetingsToday = query({
  args: {},
  handler: async (ctx) => {
    const today = getToday();

    const meetings = await ctx.db
      .query("arpMeetings")
      .withIndex("by_date", (q) => q.eq("scheduledDate", today))
      .collect();

    const enriched = await Promise.all(
      meetings.map(async (meeting) => {
        const enrollment = await ctx.db.get(meeting.enrollmentId);
        const personnel = enrollment
          ? await ctx.db.get(enrollment.personnelId)
          : null;
        const coach = await ctx.db.get(meeting.coachId);

        return {
          ...meeting,
          personnelName: personnel
            ? `${personnel.firstName} ${personnel.lastName}`
            : "Unknown",
          coachName: coach ? `${coach.firstName} ${coach.lastName}` : "Unknown",
        };
      })
    );

    return enriched;
  },
});

// Get overdue meetings (past date, not completed)
export const getOverdueMeetings = query({
  args: {},
  handler: async (ctx) => {
    const today = getToday();

    const meetings = await ctx.db
      .query("arpMeetings")
      .withIndex("by_status", (q) => q.eq("status", "scheduled"))
      .collect();

    const overdue = meetings.filter((m) => m.scheduledDate < today);

    const enriched = await Promise.all(
      overdue.map(async (meeting) => {
        const enrollment = await ctx.db.get(meeting.enrollmentId);
        const personnel = enrollment
          ? await ctx.db.get(enrollment.personnelId)
          : null;
        const coach = await ctx.db.get(meeting.coachId);

        const daysOverdue = Math.ceil(
          (new Date(today).getTime() - new Date(meeting.scheduledDate).getTime()) /
            (1000 * 60 * 60 * 24)
        );

        return {
          ...meeting,
          personnelName: personnel
            ? `${personnel.firstName} ${personnel.lastName}`
            : "Unknown",
          coachName: coach ? `${coach.firstName} ${coach.lastName}` : "Unknown",
          daysOverdue,
        };
      })
    );

    return enriched.sort((a, b) => b.daysOverdue - a.daysOverdue);
  },
});

// Get dashboard stats
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const today = getToday();
    const monthStart = today.substring(0, 7) + "-01";

    // Active enrollments
    const activeEnrollments = await ctx.db
      .query("arpEnrollments")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    // Completed this month
    const allCompleted = await ctx.db
      .query("arpEnrollments")
      .withIndex("by_status", (q) => q.eq("status", "completed"))
      .collect();
    const completedThisMonth = allCompleted.filter(
      (e) => e.outcomeDate && e.outcomeDate >= monthStart
    );

    // Failed this month
    const allFailed = await ctx.db
      .query("arpEnrollments")
      .withIndex("by_status", (q) => q.eq("status", "failed"))
      .collect();
    const failedThisMonth = allFailed.filter(
      (e) => e.outcomeDate && e.outcomeDate >= monthStart
    );

    // Calculate success rate
    const totalOutcomes = allCompleted.length + allFailed.length;
    const successRate =
      totalOutcomes > 0 ? Math.round((allCompleted.length / totalOutcomes) * 100) : 0;

    // Meetings today
    const meetingsToday = await ctx.db
      .query("arpMeetings")
      .withIndex("by_date", (q) => q.eq("scheduledDate", today))
      .collect();

    // Overdue meetings
    const scheduledMeetings = await ctx.db
      .query("arpMeetings")
      .withIndex("by_status", (q) => q.eq("status", "scheduled"))
      .collect();
    const overdueMeetings = scheduledMeetings.filter((m) => m.scheduledDate < today);

    return {
      activeCount: activeEnrollments.length,
      completedThisMonth: completedThisMonth.length,
      failedThisMonth: failedThisMonth.length,
      successRate,
      totalCompleted: allCompleted.length,
      totalFailed: allFailed.length,
      meetingsTodayCount: meetingsToday.length,
      overdueMeetingsCount: overdueMeetings.length,
    };
  },
});

// Get all personnel who can be coaches (for dropdown)
export const getCoaches = query({
  args: {},
  handler: async (ctx) => {
    // Get all active personnel - in practice you might filter by department or role
    const personnel = await ctx.db
      .query("personnel")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    return personnel.map((p) => ({
      _id: p._id,
      name: `${p.firstName} ${p.lastName}`,
      department: p.department,
      position: p.position,
    }));
  },
});

// ============ MUTATIONS ============

// Enroll employee in ARP
export const enroll = mutation({
  args: {
    personnelId: v.id("personnel"),
    coachId: v.id("personnel"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const today = getToday();

    // Verify eligibility
    const personnel = await ctx.db.get(args.personnelId);
    if (!personnel) throw new Error("Personnel not found");

    // Get enrollment history
    const enrollments = await ctx.db
      .query("arpEnrollments")
      .withIndex("by_personnel", (q) => q.eq("personnelId", args.personnelId))
      .collect();

    const activeEnrollment = enrollments.find((e) => e.status === "active");
    if (activeEnrollment) {
      throw new Error("Personnel already has active ARP enrollment");
    }

    const completedCount = enrollments.filter((e) => e.status === "completed").length;
    const failedCount = enrollments.filter((e) => e.status === "failed").length;
    const totalEnrollments = completedCount + failedCount;

    if (totalEnrollments >= 3) {
      throw new Error("Maximum ARP enrollments (3) reached");
    }

    // Determine tier
    const enrollmentCount = totalEnrollments + 1;
    const tier = Math.min(enrollmentCount, 3) as 1 | 2 | 3;
    const tierConfig = PROGRAM_TIERS[tier];

    const programEndDate = addDays(today, tierConfig.durationDays);

    // Create enrollment
    const enrollmentId = await ctx.db.insert("arpEnrollments", {
      personnelId: args.personnelId,
      enrollmentDate: today,
      programTier: tier,
      programDurationDays: tierConfig.durationDays,
      programEndDate,
      coachId: args.coachId,
      status: "active",
      enrollmentCount,
      createdAt: now,
      updatedAt: now,
    });

    // Generate meetings (weekly)
    const meetingInterval = Math.floor(tierConfig.durationDays / tierConfig.meetingCount);
    for (let i = 0; i < tierConfig.meetingCount; i++) {
      const meetingDate = addDays(today, (i + 1) * meetingInterval);
      const meetingType =
        i === 0 ? "initial" : i === tierConfig.meetingCount - 1 ? "final" : "weekly";

      await ctx.db.insert("arpMeetings", {
        enrollmentId,
        meetingNumber: i + 1,
        scheduledDate: meetingDate,
        meetingType,
        status: "scheduled",
        coachId: args.coachId,
        createdAt: now,
      });
    }

    // Assign core training module
    const coreModule = ARP_TRAINING_MODULES.find((m) => m.code === "core")!;
    await ctx.db.insert("arpTraining", {
      enrollmentId,
      moduleCode: coreModule.code,
      moduleName: coreModule.name,
      assignedDate: today,
      dueDate: addDays(today, 14), // Due in 2 weeks
      status: "assigned",
      createdAt: now,
    });

    // Get coach info for agreement
    const coach = await ctx.db.get(args.coachId);
    const coachName = coach ? `${coach.firstName} ${coach.lastName}` : "Unknown Coach";
    const employeeName = `${personnel.firstName} ${personnel.lastName}`;

    // Create enrollment agreement (pending all signatures)
    await ctx.db.insert("arpAgreements", {
      enrollmentId,
      personnelId: args.personnelId,
      agreementVersion: "1.0",
      programTier: tier,
      programDurationDays: tierConfig.durationDays,
      meetingCount: tierConfig.meetingCount,
      coachName,
      coachId: args.coachId,
      employeeName,
      status: "pending",
      createdAt: now,
    });

    return enrollmentId;
  },
});

// Record a meeting as completed
export const recordMeeting = mutation({
  args: {
    meetingId: v.id("arpMeetings"),
    notes: v.optional(v.string()),
    actionItems: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) throw new Error("Meeting not found");

    const today = getToday();

    await ctx.db.patch(args.meetingId, {
      status: "completed",
      completedDate: today,
      notes: args.notes,
      actionItems: args.actionItems,
    });

    return { success: true };
  },
});

// Mark a meeting as missed
export const missMeeting = mutation({
  args: {
    meetingId: v.id("arpMeetings"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) throw new Error("Meeting not found");

    await ctx.db.patch(args.meetingId, {
      status: "missed",
      notes: args.notes,
    });

    return { success: true };
  },
});

// Reschedule a meeting
export const rescheduleMeeting = mutation({
  args: {
    meetingId: v.id("arpMeetings"),
    newDate: v.string(),
  },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) throw new Error("Meeting not found");

    await ctx.db.patch(args.meetingId, {
      scheduledDate: args.newDate,
      status: "rescheduled",
    });

    return { success: true };
  },
});

// Save root cause assessment
export const saveRootCause = mutation({
  args: {
    enrollmentId: v.id("arpEnrollments"),
    sleepWakeIssues: v.boolean(),
    transportation: v.boolean(),
    childcareFamily: v.boolean(),
    healthIssues: v.boolean(),
    timeManagement: v.boolean(),
    scheduleConflicts: v.boolean(),
    engagementMotivation: v.boolean(),
    other: v.boolean(),
    otherDescription: v.optional(v.string()),
    summary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const enrollment = await ctx.db.get(args.enrollmentId);
    if (!enrollment) throw new Error("Enrollment not found");

    const today = getToday();
    const now = Date.now();

    // Check if root cause already exists
    const existing = await ctx.db
      .query("arpRootCause")
      .withIndex("by_enrollment", (q) => q.eq("enrollmentId", args.enrollmentId))
      .first();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        sleepWakeIssues: args.sleepWakeIssues,
        transportation: args.transportation,
        childcareFamily: args.childcareFamily,
        healthIssues: args.healthIssues,
        timeManagement: args.timeManagement,
        scheduleConflicts: args.scheduleConflicts,
        engagementMotivation: args.engagementMotivation,
        other: args.other,
        otherDescription: args.otherDescription,
        summary: args.summary,
      });
      return existing._id;
    } else {
      // Create new
      const id = await ctx.db.insert("arpRootCause", {
        enrollmentId: args.enrollmentId,
        sleepWakeIssues: args.sleepWakeIssues,
        transportation: args.transportation,
        childcareFamily: args.childcareFamily,
        healthIssues: args.healthIssues,
        timeManagement: args.timeManagement,
        scheduleConflicts: args.scheduleConflicts,
        engagementMotivation: args.engagementMotivation,
        other: args.other,
        otherDescription: args.otherDescription,
        summary: args.summary,
        assessedDate: today,
        createdAt: now,
      });
      return id;
    }
  },
});

// Assign a training module
export const assignTraining = mutation({
  args: {
    enrollmentId: v.id("arpEnrollments"),
    moduleCode: v.string(),
    dueDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const enrollment = await ctx.db.get(args.enrollmentId);
    if (!enrollment) throw new Error("Enrollment not found");

    const module = ARP_TRAINING_MODULES.find((m) => m.code === args.moduleCode);
    if (!module) throw new Error("Invalid training module code");

    const today = getToday();
    const now = Date.now();

    // Check if already assigned
    const existing = await ctx.db
      .query("arpTraining")
      .withIndex("by_enrollment", (q) => q.eq("enrollmentId", args.enrollmentId))
      .collect();

    if (existing.find((t) => t.moduleCode === args.moduleCode)) {
      throw new Error("Training module already assigned");
    }

    const id = await ctx.db.insert("arpTraining", {
      enrollmentId: args.enrollmentId,
      moduleCode: args.moduleCode,
      moduleName: module.name,
      assignedDate: today,
      dueDate: args.dueDate || addDays(today, 14),
      status: "assigned",
      createdAt: now,
    });

    return id;
  },
});

// Complete a training module
export const completeTraining = mutation({
  args: {
    trainingId: v.id("arpTraining"),
  },
  handler: async (ctx, args) => {
    const training = await ctx.db.get(args.trainingId);
    if (!training) throw new Error("Training not found");

    const today = getToday();

    await ctx.db.patch(args.trainingId, {
      status: "completed",
      completedDate: today,
    });

    return { success: true };
  },
});

// Fail an enrollment (manual or triggered by write-up)
export const failEnrollment = mutation({
  args: {
    enrollmentId: v.id("arpEnrollments"),
    reason: v.string(),
    writeUpId: v.optional(v.id("writeUps")),
  },
  handler: async (ctx, args) => {
    const enrollment = await ctx.db.get(args.enrollmentId);
    if (!enrollment) throw new Error("Enrollment not found");

    if (enrollment.status !== "active") {
      throw new Error("Enrollment is not active");
    }

    const today = getToday();
    const now = Date.now();
    const nextEligibleDate = addDays(today, 90);

    await ctx.db.patch(args.enrollmentId, {
      status: "failed",
      outcomeDate: today,
      failureReason: args.reason,
      failureWriteUpId: args.writeUpId,
      nextEligibleDate,
      updatedAt: now,
    });

    return { success: true };
  },
});

// Internal mutation for auto-failing from writeUps
export const internalFailEnrollment = internalMutation({
  args: {
    enrollmentId: v.id("arpEnrollments"),
    reason: v.string(),
    writeUpId: v.id("writeUps"),
  },
  handler: async (ctx, args) => {
    const enrollment = await ctx.db.get(args.enrollmentId);
    if (!enrollment || enrollment.status !== "active") return;

    const today = getToday();
    const now = Date.now();
    const nextEligibleDate = addDays(today, 90);

    await ctx.db.patch(args.enrollmentId, {
      status: "failed",
      outcomeDate: today,
      failureReason: args.reason,
      failureWriteUpId: args.writeUpId,
      nextEligibleDate,
      updatedAt: now,
    });
  },
});

// Complete an enrollment successfully
export const completeEnrollment = mutation({
  args: {
    enrollmentId: v.id("arpEnrollments"),
  },
  handler: async (ctx, args) => {
    const enrollment = await ctx.db.get(args.enrollmentId);
    if (!enrollment) throw new Error("Enrollment not found");

    if (enrollment.status !== "active") {
      throw new Error("Enrollment is not active");
    }

    const today = getToday();
    const now = Date.now();

    // Verify all meetings completed
    const meetings = await ctx.db
      .query("arpMeetings")
      .withIndex("by_enrollment", (q) => q.eq("enrollmentId", args.enrollmentId))
      .collect();

    const incompleteMeetings = meetings.filter(
      (m) => m.status !== "completed"
    );
    if (incompleteMeetings.length > 0) {
      throw new Error(`Cannot complete: ${incompleteMeetings.length} meetings not completed`);
    }

    // Verify required training completed
    const training = await ctx.db
      .query("arpTraining")
      .withIndex("by_enrollment", (q) => q.eq("enrollmentId", args.enrollmentId))
      .collect();

    const requiredModules = ARP_TRAINING_MODULES.filter((m) => m.required).map(
      (m) => m.code
    );
    const completedModules = training
      .filter((t) => t.status === "completed")
      .map((t) => t.moduleCode);

    const missingRequired = requiredModules.filter(
      (code) => !completedModules.includes(code)
    );
    if (missingRequired.length > 0) {
      throw new Error(`Cannot complete: required training not completed`);
    }

    // Mark enrollment as completed
    await ctx.db.patch(args.enrollmentId, {
      status: "completed",
      outcomeDate: today,
      updatedAt: now,
    });

    // Clear attendance write-ups (mark as archived)
    const ninetyDaysAgo = addDays(today, -90);
    const writeUps = await ctx.db
      .query("writeUps")
      .withIndex("by_personnel", (q) => q.eq("personnelId", enrollment.personnelId))
      .collect();

    const attendanceWriteUps = writeUps.filter(
      (w) =>
        w.category === "attendance" &&
        !w.isArchived &&
        w.date >= ninetyDaysAgo
    );

    for (const writeUp of attendanceWriteUps) {
      await ctx.db.patch(writeUp._id, {
        isArchived: true,
      });
    }

    return {
      success: true,
      writeUpsCleared: attendanceWriteUps.length,
    };
  },
});

// Get available training modules (not yet assigned)
export const getAvailableTrainingModules = query({
  args: {
    enrollmentId: v.id("arpEnrollments"),
  },
  handler: async (ctx, args) => {
    const assigned = await ctx.db
      .query("arpTraining")
      .withIndex("by_enrollment", (q) => q.eq("enrollmentId", args.enrollmentId))
      .collect();

    const assignedCodes = assigned.map((t) => t.moduleCode);

    return ARP_TRAINING_MODULES.filter((m) => !assignedCodes.includes(m.code));
  },
});

// ============ AGREEMENT FUNCTIONS ============

// Agreement text template
export const ARP_AGREEMENT_TEXT = `
ATTENDANCE RECOVERY PROGRAM (ARP) ENROLLMENT AGREEMENT

I, {employeeName}, acknowledge that I am being enrolled in the Attendance Recovery Program (ARP)
at IE Tire Services, Inc. By signing this agreement, I understand and agree to the following terms:

PROGRAM OVERVIEW:
• I am enrolling in Tier {programTier} of the ARP program
• Program duration: {programDurationDays} days
• Required meetings with my assigned Coach: {meetingCount} meetings
• My assigned Coach: {coachName}

PROGRAM REQUIREMENTS:
1. I will attend ALL scheduled meetings with my assigned Coach
2. I will complete all assigned training modules
3. I will maintain ZERO attendance infractions for the entire program duration
4. I understand that this program is designed to help me succeed

CONSEQUENCES:
• SUCCESS: Upon successful completion of this program, all prior attendance write-ups will be
  cleared from my record. I will receive a Certificate of Completion.
• FAILURE: If I receive ANY write-up (attendance, safety, conduct, or other) during the program,
  OR if I miss any scheduled Coach meetings, I understand that:
  - My enrollment will be immediately terminated
  - I may be subject to disciplinary action up to and including termination
  - I will be ineligible to re-enroll in ARP for 90 days

I have read and understand the terms of this agreement. I am committed to successfully completing
the Attendance Recovery Program and improving my attendance record.

Employee Signature: _______________________________  Date: _______________

Witness (HR/Manager): _____________________________  Date: _______________
`;

// Get agreement for an enrollment
export const getAgreement = query({
  args: {
    enrollmentId: v.id("arpEnrollments"),
  },
  handler: async (ctx, args) => {
    const agreement = await ctx.db
      .query("arpAgreements")
      .withIndex("by_enrollment", (q) => q.eq("enrollmentId", args.enrollmentId))
      .first();

    return agreement;
  },
});

// Get agreement by personnel (for employee portal)
export const getAgreementByPersonnel = query({
  args: {
    personnelId: v.id("personnel"),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let agreements = await ctx.db
      .query("arpAgreements")
      .withIndex("by_personnel", (q) => q.eq("personnelId", args.personnelId))
      .collect();

    if (args.status) {
      agreements = agreements.filter((a) => a.status === args.status);
    }

    return agreements;
  },
});

// Create agreement (called automatically during enrollment)
export const createAgreement = mutation({
  args: {
    enrollmentId: v.id("arpEnrollments"),
    personnelId: v.id("personnel"),
    programTier: v.number(),
    programDurationDays: v.number(),
    meetingCount: v.number(),
    coachName: v.string(),
    coachId: v.optional(v.id("personnel")),
    employeeName: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const agreementId = await ctx.db.insert("arpAgreements", {
      enrollmentId: args.enrollmentId,
      personnelId: args.personnelId,
      agreementVersion: "1.0",
      programTier: args.programTier,
      programDurationDays: args.programDurationDays,
      meetingCount: args.meetingCount,
      coachName: args.coachName,
      coachId: args.coachId,
      employeeName: args.employeeName,
      status: "pending",
      createdAt: now,
    });

    return agreementId;
  },
});

// Helper to determine agreement status based on signatures
function getAgreementStatus(agreement: {
  adminSignature?: string;
  coachSignature?: string;
  employeeSignature?: string;
}): string {
  const hasAdmin = !!agreement.adminSignature;
  const hasCoach = !!agreement.coachSignature;
  const hasEmployee = !!agreement.employeeSignature;

  if (hasAdmin && hasCoach && hasEmployee) {
    return "fully_signed";
  } else if (hasAdmin || hasCoach || hasEmployee) {
    return "partially_signed";
  }
  return "pending";
}

// Sign agreement - Admin/HR signature (auto-signed)
export const signAsAdmin = mutation({
  args: {
    enrollmentId: v.id("arpEnrollments"),
    adminId: v.id("users"),
    adminName: v.string(),
    adminTitle: v.string(),
    signature: v.string(), // Base64 signature image
  },
  handler: async (ctx, args) => {
    const agreement = await ctx.db
      .query("arpAgreements")
      .withIndex("by_enrollment", (q) => q.eq("enrollmentId", args.enrollmentId))
      .first();

    if (!agreement) throw new Error("Agreement not found");

    const now = Date.now();

    const updates = {
      adminSignature: args.signature,
      adminName: args.adminName,
      adminTitle: args.adminTitle,
      adminSignedAt: now,
      adminUserId: args.adminId,
    };

    const newStatus = getAgreementStatus({
      ...agreement,
      adminSignature: args.signature,
    });

    await ctx.db.patch(agreement._id, {
      ...updates,
      status: newStatus,
    });

    return { success: true };
  },
});

// Sign agreement - Coach signature
export const signAsCoach = mutation({
  args: {
    enrollmentId: v.id("arpEnrollments"),
    signature: v.string(), // Base64 signature image
  },
  handler: async (ctx, args) => {
    const agreement = await ctx.db
      .query("arpAgreements")
      .withIndex("by_enrollment", (q) => q.eq("enrollmentId", args.enrollmentId))
      .first();

    if (!agreement) throw new Error("Agreement not found");

    const now = Date.now();

    const newStatus = getAgreementStatus({
      ...agreement,
      coachSignature: args.signature,
    });

    await ctx.db.patch(agreement._id, {
      coachSignature: args.signature,
      coachSignedAt: now,
      status: newStatus,
    });

    return { success: true };
  },
});

// Sign agreement - Employee signature
export const signAsEmployee = mutation({
  args: {
    enrollmentId: v.id("arpEnrollments"),
    signature: v.string(), // Base64 signature image
  },
  handler: async (ctx, args) => {
    const agreement = await ctx.db
      .query("arpAgreements")
      .withIndex("by_enrollment", (q) => q.eq("enrollmentId", args.enrollmentId))
      .first();

    if (!agreement) throw new Error("Agreement not found");

    const now = Date.now();

    const newStatus = getAgreementStatus({
      ...agreement,
      employeeSignature: args.signature,
    });

    await ctx.db.patch(agreement._id, {
      employeeSignature: args.signature,
      employeeSignedAt: now,
      status: newStatus,
    });

    return { success: true };
  },
});

// Legacy: Sign agreement (in-person signing by admin) - kept for compatibility
export const signAgreementInPerson = mutation({
  args: {
    enrollmentId: v.id("arpEnrollments"),
    adminId: v.id("users"),
    adminName: v.string(),
    signatureData: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const agreement = await ctx.db
      .query("arpAgreements")
      .withIndex("by_enrollment", (q) => q.eq("enrollmentId", args.enrollmentId))
      .first();

    if (!agreement) throw new Error("Agreement not found");

    const now = Date.now();

    await ctx.db.patch(agreement._id, {
      adminSignature: args.signatureData,
      adminName: args.adminName,
      adminSignedAt: now,
      adminUserId: args.adminId,
      status: "partially_signed",
    });

    return { success: true };
  },
});

// Get formatted agreement text for display/printing
export const getFormattedAgreementText = query({
  args: {
    enrollmentId: v.id("arpEnrollments"),
  },
  handler: async (ctx, args) => {
    const agreement = await ctx.db
      .query("arpAgreements")
      .withIndex("by_enrollment", (q) => q.eq("enrollmentId", args.enrollmentId))
      .first();

    if (!agreement) return null;

    // Replace placeholders with actual values
    let text = ARP_AGREEMENT_TEXT
      .replace("{employeeName}", agreement.employeeName)
      .replace("{programTier}", agreement.programTier.toString())
      .replace("{programDurationDays}", agreement.programDurationDays.toString())
      .replace("{meetingCount}", agreement.meetingCount.toString())
      .replace("{coachName}", agreement.coachName);

    return {
      text,
      agreement,
    };
  },
});
