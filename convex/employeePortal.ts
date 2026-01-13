import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ============ TIME OFF REQUESTS ============

// Get time off requests for a personnel
export const getMyTimeOffRequests = query({
  args: { personnelId: v.id("personnel") },
  handler: async (ctx, args) => {
    const requests = await ctx.db
      .query("timeOffRequests")
      .withIndex("by_personnel", (q) => q.eq("personnelId", args.personnelId))
      .collect();

    // Enrich with reviewer name
    const enriched = await Promise.all(
      requests.map(async (req) => {
        let reviewerName = null;
        if (req.reviewedBy) {
          const reviewer = await ctx.db.get(req.reviewedBy);
          reviewerName = reviewer?.name || null;
        }
        return { ...req, reviewerName };
      })
    );

    return enriched.sort((a, b) => b.requestedAt - a.requestedAt);
  },
});

// Submit a time off request
export const submitTimeOffRequest = mutation({
  args: {
    personnelId: v.id("personnel"),
    requestType: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Calculate total days
    const start = new Date(args.startDate);
    const end = new Date(args.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const requestId = await ctx.db.insert("timeOffRequests", {
      personnelId: args.personnelId,
      requestType: args.requestType,
      startDate: args.startDate,
      endDate: args.endDate,
      totalDays,
      reason: args.reason,
      status: "pending",
      requestedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    return requestId;
  },
});

// Cancel a time off request (employee)
export const cancelTimeOffRequest = mutation({
  args: {
    requestId: v.id("timeOffRequests"),
    personnelId: v.id("personnel"),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Request not found");
    if (request.personnelId !== args.personnelId) throw new Error("Not authorized");
    if (request.status !== "pending") throw new Error("Can only cancel pending requests");

    await ctx.db.delete(args.requestId);
    return true;
  },
});

// Get all pending time off requests (for managers)
export const getPendingTimeOffRequests = query({
  handler: async (ctx) => {
    const requests = await ctx.db
      .query("timeOffRequests")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    const enriched = await Promise.all(
      requests.map(async (req) => {
        const personnel = await ctx.db.get(req.personnelId);
        return {
          ...req,
          personnelName: personnel
            ? `${personnel.firstName} ${personnel.lastName}`
            : "Unknown",
          department: personnel?.department || "Unknown",
        };
      })
    );

    return enriched.sort((a, b) => a.startDate.localeCompare(b.startDate));
  },
});

// Review a time off request (manager)
export const reviewTimeOffRequest = mutation({
  args: {
    requestId: v.id("timeOffRequests"),
    status: v.string(),
    userId: v.id("users"),
    managerNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.patch(args.requestId, {
      status: args.status,
      reviewedBy: args.userId,
      reviewedAt: now,
      managerNotes: args.managerNotes,
      updatedAt: now,
    });

    return args.requestId;
  },
});

// ============ CALL OFFS ============

// Get call offs for a personnel
export const getMyCallOffs = query({
  args: { personnelId: v.id("personnel") },
  handler: async (ctx, args) => {
    const callOffs = await ctx.db
      .query("callOffs")
      .withIndex("by_personnel", (q) => q.eq("personnelId", args.personnelId))
      .collect();

    const enriched = await Promise.all(
      callOffs.map(async (co) => {
        let acknowledgerName = null;
        if (co.acknowledgedBy) {
          const acknowledger = await ctx.db.get(co.acknowledgedBy);
          acknowledgerName = acknowledger?.name || null;
        }
        return { ...co, acknowledgerName };
      })
    );

    return enriched.sort((a, b) => b.reportedAt - a.reportedAt);
  },
});

// Submit a call off
export const submitCallOff = mutation({
  args: {
    personnelId: v.id("personnel"),
    date: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const callOffId = await ctx.db.insert("callOffs", {
      personnelId: args.personnelId,
      date: args.date,
      reason: args.reason,
      reportedAt: now,
      reportedVia: "app",
      createdAt: now,
    });

    return callOffId;
  },
});

// Get pending call offs (for managers)
export const getPendingCallOffs = query({
  handler: async (ctx) => {
    const callOffs = await ctx.db.query("callOffs").collect();

    // Filter to only unacknowledged
    const pending = callOffs.filter((co) => !co.acknowledgedBy);

    const enriched = await Promise.all(
      pending.map(async (co) => {
        const personnel = await ctx.db.get(co.personnelId);
        return {
          ...co,
          personnelName: personnel
            ? `${personnel.firstName} ${personnel.lastName}`
            : "Unknown",
          department: personnel?.department || "Unknown",
        };
      })
    );

    return enriched.sort((a, b) => b.reportedAt - a.reportedAt);
  },
});

// Acknowledge a call off (manager)
export const acknowledgeCallOff = mutation({
  args: {
    callOffId: v.id("callOffs"),
    userId: v.id("users"),
    managerNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.patch(args.callOffId, {
      acknowledgedBy: args.userId,
      acknowledgedAt: now,
      managerNotes: args.managerNotes,
    });

    return args.callOffId;
  },
});

// ============ SCHEDULE ============

// Get my schedule for a date range
export const getMySchedule = query({
  args: {
    personnelId: v.id("personnel"),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all shifts in the date range
    const allShifts = await ctx.db.query("shifts").collect();

    // Filter by date range and personnel assignment
    const myShifts = allShifts.filter((shift) => {
      const inDateRange = shift.date >= args.startDate && shift.date <= args.endDate;
      const isAssigned =
        shift.assignedPersonnel.includes(args.personnelId) ||
        shift.leadId === args.personnelId;
      return inDateRange && isAssigned;
    });

    // Enrich with lead info
    const enriched = await Promise.all(
      myShifts.map(async (shift) => {
        let leadName = null;
        if (shift.leadId) {
          const lead = await ctx.db.get(shift.leadId);
          leadName = lead ? `${lead.firstName} ${lead.lastName}` : null;
        }
        return {
          ...shift,
          leadName,
          isLead: shift.leadId === args.personnelId,
        };
      })
    );

    return enriched.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.startTime.localeCompare(b.startTime);
    });
  },
});

// ============ HOURS/TIMESHEET ============

// Get my hours for a date range (for employee view)
export const getMyHours = query({
  args: {
    personnelId: v.id("personnel"),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("timeEntries")
      .withIndex("by_personnel", (q) => q.eq("personnelId", args.personnelId))
      .collect();

    // Filter by date range
    const filtered = entries.filter(
      (e) => e.date >= args.startDate && e.date <= args.endDate
    );

    // Group by date
    const byDate = new Map<string, typeof filtered>();
    for (const entry of filtered) {
      if (!byDate.has(entry.date)) {
        byDate.set(entry.date, []);
      }
      byDate.get(entry.date)!.push(entry);
    }

    // Calculate daily summaries
    const dailySummaries: Array<{
      date: string;
      clockIn: number | null;
      clockOut: number | null;
      breakMinutes: number;
      totalHours: number;
      entries: typeof filtered;
    }> = [];

    for (const [date, dayEntries] of byDate) {
      const sorted = dayEntries.sort((a, b) => a.timestamp - b.timestamp);

      let clockIn: number | null = null;
      let clockOut: number | null = null;
      let breakMinutes = 0;
      let breakStartTime: number | null = null;

      for (const entry of sorted) {
        if (entry.type === "clock_in" && !clockIn) {
          clockIn = entry.timestamp;
        } else if (entry.type === "clock_out") {
          clockOut = entry.timestamp;
        } else if (entry.type === "break_start") {
          breakStartTime = entry.timestamp;
        } else if (entry.type === "break_end" && breakStartTime) {
          breakMinutes += (entry.timestamp - breakStartTime) / (1000 * 60);
          breakStartTime = null;
        }
      }

      let totalHours = 0;
      if (clockIn && clockOut) {
        totalHours = ((clockOut - clockIn) / (1000 * 60) - breakMinutes) / 60;
      }

      dailySummaries.push({
        date,
        clockIn,
        clockOut,
        breakMinutes: Math.round(breakMinutes),
        totalHours: Math.round(totalHours * 100) / 100,
        entries: sorted,
      });
    }

    // Calculate totals
    const totalHours = dailySummaries.reduce((sum, d) => sum + d.totalHours, 0);
    const totalBreakMinutes = dailySummaries.reduce((sum, d) => sum + d.breakMinutes, 0);

    return {
      days: dailySummaries.sort((a, b) => a.date.localeCompare(b.date)),
      totalHours: Math.round(totalHours * 100) / 100,
      totalBreakMinutes,
      daysWorked: dailySummaries.length,
    };
  },
});

// Get current pay period dates
export const getCurrentPayPeriod = query({
  handler: async () => {
    // Assuming bi-weekly pay periods starting from a known date
    // Adjust this based on the actual pay period schedule
    const today = new Date();
    const referenceDate = new Date("2024-01-01"); // Monday of a known pay period start

    const daysSinceReference = Math.floor(
      (today.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const payPeriodNumber = Math.floor(daysSinceReference / 14);

    const startDate = new Date(referenceDate);
    startDate.setDate(startDate.getDate() + payPeriodNumber * 14);

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 13);

    return {
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
      payPeriodNumber,
    };
  },
});

// ============ TIME CORRECTIONS (Employee) ============

// Get my time corrections
export const getMyTimeCorrections = query({
  args: { personnelId: v.id("personnel") },
  handler: async (ctx, args) => {
    const corrections = await ctx.db
      .query("timeCorrections")
      .withIndex("by_personnel", (q) => q.eq("personnelId", args.personnelId))
      .collect();

    const enriched = await Promise.all(
      corrections.map(async (c) => {
        let reviewerName = null;
        if (c.reviewedBy) {
          const reviewer = await ctx.db.get(c.reviewedBy);
          reviewerName = reviewer?.name || null;
        }
        return { ...c, reviewerName };
      })
    );

    return enriched.sort((a, b) => b.requestedAt - a.requestedAt);
  },
});

// ============ PAY STUBS ============

// Get my pay stubs
export const getMyPayStubs = query({
  args: { personnelId: v.id("personnel") },
  handler: async (ctx, args) => {
    const stubs = await ctx.db
      .query("payStubs")
      .withIndex("by_personnel", (q) => q.eq("personnelId", args.personnelId))
      .collect();

    return stubs.sort((a, b) => b.payDate.localeCompare(a.payDate));
  },
});

// Mark pay stub as viewed
export const markPayStubViewed = mutation({
  args: { payStubId: v.id("payStubs") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.payStubId, {
      employeeViewedAt: Date.now(),
    });
    return true;
  },
});

// ============ ANNOUNCEMENTS (Employee View) ============

// Get active announcements for employee
export const getActiveAnnouncements = query({
  args: { personnelId: v.optional(v.id("personnel")) },
  handler: async (ctx, args) => {
    const now = Date.now();

    const announcements = await ctx.db
      .query("announcements")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Filter out expired
    const active = announcements.filter(
      (a) => !a.expiresAt || a.expiresAt > now
    );

    // Get read status for this employee
    let readAnnouncementIds: Set<string> = new Set();
    if (args.personnelId) {
      const personnelId = args.personnelId;
      const reads = await ctx.db
        .query("announcementReads")
        .withIndex("by_personnel", (q) => q.eq("personnelId", personnelId))
        .collect();
      readAnnouncementIds = new Set(reads.map((r) => r.announcementId));
    }

    return active
      .map((a) => ({
        ...a,
        isRead: readAnnouncementIds.has(a._id),
      }))
      .sort((a, b) => {
        // Pinned first, then by creation date
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return b.createdAt - a.createdAt;
      });
  },
});

// Mark announcement as read
export const markAnnouncementRead = mutation({
  args: {
    announcementId: v.id("announcements"),
    personnelId: v.id("personnel"),
  },
  handler: async (ctx, args) => {
    // Check if already read
    const existing = await ctx.db
      .query("announcementReads")
      .withIndex("by_both", (q) =>
        q.eq("announcementId", args.announcementId).eq("personnelId", args.personnelId)
      )
      .first();

    if (existing) return existing._id;

    const readId = await ctx.db.insert("announcementReads", {
      announcementId: args.announcementId,
      personnelId: args.personnelId,
      readAt: Date.now(),
    });

    // Update read count
    const announcement = await ctx.db.get(args.announcementId);
    if (announcement) {
      await ctx.db.patch(args.announcementId, {
        readCount: (announcement.readCount || 0) + 1,
      });
    }

    return readId;
  },
});

// ============ TIME CLOCK (Mobile App) ============

// Get current time entry status for today
export const getCurrentTimeEntry = query({
  args: { personnelId: v.id("personnel") },
  handler: async (ctx, args) => {
    const today = new Date().toISOString().split("T")[0];

    // Get all time entries for today for this employee
    const entries = await ctx.db
      .query("timeEntries")
      .withIndex("by_personnel_date", (q) =>
        q.eq("personnelId", args.personnelId).eq("date", today)
      )
      .collect();

    if (entries.length === 0) {
      return null; // Not clocked in today
    }

    // Sort by timestamp
    const sorted = entries.sort((a, b) => a.timestamp - b.timestamp);

    // Find the latest clock_in that doesn't have a clock_out after it
    let clockInTime: number | null = null;
    let clockOutTime: number | null = null;
    let breakStartTime: number | null = null;
    let breakEndTime: number | null = null;

    for (const entry of sorted) {
      if (entry.type === "clock_in") {
        clockInTime = entry.timestamp;
        clockOutTime = null; // Reset clock out
        breakStartTime = null;
        breakEndTime = null;
      } else if (entry.type === "clock_out") {
        clockOutTime = entry.timestamp;
      } else if (entry.type === "break_start") {
        breakStartTime = entry.timestamp;
        breakEndTime = null;
      } else if (entry.type === "break_end") {
        breakEndTime = entry.timestamp;
      }
    }

    // If we have a clock_in without a clock_out, we're clocked in
    if (clockInTime && !clockOutTime) {
      return {
        _id: sorted[sorted.length - 1]._id, // Return the latest entry ID
        personnelId: args.personnelId,
        date: today,
        clockInTime,
        clockOutTime: null,
        breakStartTime: breakEndTime ? null : breakStartTime, // Only show if currently on break
        breakEndTime: null,
      };
    }

    return null; // Clocked out or no valid entry
  },
});

// Clock in
export const clockIn = mutation({
  args: {
    personnelId: v.id("personnel"),
    locationId: v.optional(v.id("locations")),
    gpsCoordinates: v.optional(v.object({
      lat: v.number(),
      lng: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const today = new Date().toISOString().split("T")[0];
    const currentDate = new Date();
    const dayOfWeek = currentDate.getDay(); // 0 = Sunday

    // Check if already clocked in today
    const existingEntries = await ctx.db
      .query("timeEntries")
      .withIndex("by_personnel_date", (q) =>
        q.eq("personnelId", args.personnelId).eq("date", today)
      )
      .collect();

    // Check if there's an active clock-in (no clock-out after it)
    const sorted = existingEntries.sort((a, b) => a.timestamp - b.timestamp);
    let isCurrentlyClockedIn = false;

    for (const entry of sorted) {
      if (entry.type === "clock_in") {
        isCurrentlyClockedIn = true;
      } else if (entry.type === "clock_out") {
        isCurrentlyClockedIn = false;
      }
    }

    if (isCurrentlyClockedIn) {
      throw new Error("Already clocked in");
    }

    const entryId = await ctx.db.insert("timeEntries", {
      personnelId: args.personnelId,
      date: today,
      type: "clock_in",
      timestamp: now,
      source: "mobile",
      locationId: args.locationId,
      gpsCoordinates: args.gpsCoordinates,
      createdAt: now,
    });

    // Check for late arrival and notify managers
    const personnel = await ctx.db.get(args.personnelId);
    if (personnel && personnel.defaultScheduleTemplateId) {
      const scheduleTemplate = await ctx.db.get(personnel.defaultScheduleTemplateId);
      if (scheduleTemplate && scheduleTemplate.departments) {
        // Find today's schedule
        const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
        const todayName = dayNames[dayOfWeek];

        for (const dept of scheduleTemplate.departments) {
          // Check if this employee is assigned to this department
          if (dept.assignedPersonnel.includes(args.personnelId) && dept.startTime) {
            // Skip weekends for schedule checking (templates typically apply to weekdays)
            if (dayOfWeek === 0 || dayOfWeek === 6) continue;

            // Parse scheduled start time from the department
            const [hours, minutes] = dept.startTime.split(":").map(Number);
            const scheduledStart = new Date(currentDate);
            scheduledStart.setHours(hours, minutes, 0, 0);

            // Calculate minutes late (with 5-minute grace period)
            const minutesLate = Math.floor((now - scheduledStart.getTime()) / (1000 * 60)) - 5;

            if (minutesLate > 0) {
              // Format times for notification
              const formatTime = (d: Date) => d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
              const actualTime = formatTime(new Date(now));
              const scheduledTime = formatTime(scheduledStart);

              // Get all managers
              const users = await ctx.db.query("users").collect();
              const managers = users.filter(
                (u) => u.isActive && ["super_admin", "admin", "warehouse_manager"].includes(u.role)
              );

              // Create notification for each manager
              for (const manager of managers) {
                await ctx.db.insert("notifications", {
                  userId: manager._id,
                  type: "late_arrival",
                  title: "Late Arrival",
                  message: `${personnel.firstName} ${personnel.lastName} arrived ${minutesLate + 5} minutes late (scheduled: ${scheduledTime}, arrived: ${actualTime})`,
                  link: `/personnel/${args.personnelId}`,
                  relatedPersonnelId: args.personnelId,
                  isRead: false,
                  isDismissed: false,
                  createdAt: now,
                });
              }
            }
            break; // Found assigned department, no need to continue
          }
        }
      }
    }

    return entryId;
  },
});

// Clock out
export const clockOut = mutation({
  args: {
    personnelId: v.id("personnel"),
    locationId: v.optional(v.id("locations")),
    gpsCoordinates: v.optional(v.object({
      lat: v.number(),
      lng: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const today = new Date().toISOString().split("T")[0];

    // Verify clocked in
    const existingEntries = await ctx.db
      .query("timeEntries")
      .withIndex("by_personnel_date", (q) =>
        q.eq("personnelId", args.personnelId).eq("date", today)
      )
      .collect();

    const sorted = existingEntries.sort((a, b) => a.timestamp - b.timestamp);
    let isCurrentlyClockedIn = false;
    let isOnBreak = false;

    for (const entry of sorted) {
      if (entry.type === "clock_in") {
        isCurrentlyClockedIn = true;
        isOnBreak = false;
      } else if (entry.type === "clock_out") {
        isCurrentlyClockedIn = false;
      } else if (entry.type === "break_start") {
        isOnBreak = true;
      } else if (entry.type === "break_end") {
        isOnBreak = false;
      }
    }

    if (!isCurrentlyClockedIn) {
      throw new Error("Not clocked in");
    }

    if (isOnBreak) {
      throw new Error("Cannot clock out while on break. End break first.");
    }

    const entryId = await ctx.db.insert("timeEntries", {
      personnelId: args.personnelId,
      date: today,
      type: "clock_out",
      timestamp: now,
      source: "mobile",
      locationId: args.locationId,
      gpsCoordinates: args.gpsCoordinates,
      createdAt: now,
    });

    return entryId;
  },
});

// Start break
export const startBreak = mutation({
  args: {
    personnelId: v.id("personnel"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const today = new Date().toISOString().split("T")[0];

    // Verify clocked in and not on break
    const existingEntries = await ctx.db
      .query("timeEntries")
      .withIndex("by_personnel_date", (q) =>
        q.eq("personnelId", args.personnelId).eq("date", today)
      )
      .collect();

    const sorted = existingEntries.sort((a, b) => a.timestamp - b.timestamp);
    let isCurrentlyClockedIn = false;
    let isOnBreak = false;

    for (const entry of sorted) {
      if (entry.type === "clock_in") {
        isCurrentlyClockedIn = true;
        isOnBreak = false;
      } else if (entry.type === "clock_out") {
        isCurrentlyClockedIn = false;
      } else if (entry.type === "break_start") {
        isOnBreak = true;
      } else if (entry.type === "break_end") {
        isOnBreak = false;
      }
    }

    if (!isCurrentlyClockedIn) {
      throw new Error("Must be clocked in to start break");
    }

    if (isOnBreak) {
      throw new Error("Already on break");
    }

    const entryId = await ctx.db.insert("timeEntries", {
      personnelId: args.personnelId,
      date: today,
      type: "break_start",
      timestamp: now,
      source: "mobile",
      createdAt: now,
    });

    return entryId;
  },
});

// End break
export const endBreak = mutation({
  args: {
    personnelId: v.id("personnel"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const today = new Date().toISOString().split("T")[0];

    // Verify on break
    const existingEntries = await ctx.db
      .query("timeEntries")
      .withIndex("by_personnel_date", (q) =>
        q.eq("personnelId", args.personnelId).eq("date", today)
      )
      .collect();

    const sorted = existingEntries.sort((a, b) => a.timestamp - b.timestamp);
    let isCurrentlyClockedIn = false;
    let isOnBreak = false;

    for (const entry of sorted) {
      if (entry.type === "clock_in") {
        isCurrentlyClockedIn = true;
        isOnBreak = false;
      } else if (entry.type === "clock_out") {
        isCurrentlyClockedIn = false;
      } else if (entry.type === "break_start") {
        isOnBreak = true;
      } else if (entry.type === "break_end") {
        isOnBreak = false;
      }
    }

    if (!isCurrentlyClockedIn) {
      throw new Error("Not clocked in");
    }

    if (!isOnBreak) {
      throw new Error("Not on break");
    }

    const entryId = await ctx.db.insert("timeEntries", {
      personnelId: args.personnelId,
      date: today,
      type: "break_end",
      timestamp: now,
      source: "mobile",
      createdAt: now,
    });

    return entryId;
  },
});

// Register push notification token for mobile notifications
export const registerPushToken = mutation({
  args: {
    userId: v.id("users"),
    expoPushToken: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      expoPushToken: args.expoPushToken,
    });
    return true;
  },
});
