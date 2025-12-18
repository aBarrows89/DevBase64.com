import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ============ QUERIES ============

// Get attendance records for a personnel
export const listByPersonnel = query({
  args: {
    personnelId: v.id("personnel"),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const attendance = await ctx.db
      .query("attendance")
      .withIndex("by_personnel", (q) => q.eq("personnelId", args.personnelId))
      .collect();

    let filtered = attendance;
    if (args.startDate) {
      filtered = filtered.filter((a) => a.date >= args.startDate!);
    }
    if (args.endDate) {
      filtered = filtered.filter((a) => a.date <= args.endDate!);
    }

    return filtered.sort((a, b) => b.date.localeCompare(a.date));
  },
});

// Get attendance for a specific date (all personnel)
export const listByDate = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const attendance = await ctx.db
      .query("attendance")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .collect();

    // Enrich with personnel names
    const enriched = await Promise.all(
      attendance.map(async (record) => {
        const personnel = await ctx.db.get(record.personnelId);
        return {
          ...record,
          personnelName: personnel
            ? `${personnel.firstName} ${personnel.lastName}`
            : "Unknown",
          department: personnel?.department || "Unknown",
        };
      })
    );

    return enriched;
  },
});

// Get attendance summary for a personnel (stats)
export const getSummary = query({
  args: {
    personnelId: v.id("personnel"),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const attendance = await ctx.db
      .query("attendance")
      .withIndex("by_personnel", (q) => q.eq("personnelId", args.personnelId))
      .collect();

    const filtered = attendance.filter(
      (a) => a.date >= args.startDate && a.date <= args.endDate
    );

    const summary = {
      totalDays: filtered.length,
      present: filtered.filter((a) => a.status === "present").length,
      absent: filtered.filter((a) => a.status === "absent").length,
      late: filtered.filter((a) => a.status === "late").length,
      excused: filtered.filter((a) => a.status === "excused").length,
      noCallNoShow: filtered.filter((a) => a.status === "no_call_no_show")
        .length,
      totalHours: filtered.reduce((sum, a) => sum + (a.hoursWorked || 0), 0),
    };

    return summary;
  },
});

// Get single attendance record
export const getByPersonnelDate = query({
  args: {
    personnelId: v.id("personnel"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("attendance")
      .withIndex("by_personnel_date", (q) =>
        q.eq("personnelId", args.personnelId).eq("date", args.date)
      )
      .first();

    return record;
  },
});

// ============ MUTATIONS ============

// Create or update attendance record
export const upsert = mutation({
  args: {
    personnelId: v.id("personnel"),
    date: v.string(),
    status: v.string(),
    scheduledStart: v.optional(v.string()),
    scheduledEnd: v.optional(v.string()),
    actualStart: v.optional(v.string()),
    actualEnd: v.optional(v.string()),
    hoursWorked: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if record exists
    const existing = await ctx.db
      .query("attendance")
      .withIndex("by_personnel_date", (q) =>
        q.eq("personnelId", args.personnelId).eq("date", args.date)
      )
      .first();

    if (existing) {
      // Update existing record
      await ctx.db.patch(existing._id, {
        status: args.status,
        scheduledStart: args.scheduledStart,
        scheduledEnd: args.scheduledEnd,
        actualStart: args.actualStart,
        actualEnd: args.actualEnd,
        hoursWorked: args.hoursWorked,
        notes: args.notes,
        updatedAt: now,
      });
      return existing._id;
    } else {
      // Create new record
      const recordId = await ctx.db.insert("attendance", {
        personnelId: args.personnelId,
        date: args.date,
        status: args.status,
        scheduledStart: args.scheduledStart,
        scheduledEnd: args.scheduledEnd,
        actualStart: args.actualStart,
        actualEnd: args.actualEnd,
        hoursWorked: args.hoursWorked,
        notes: args.notes,
        createdAt: now,
        updatedAt: now,
      });
      return recordId;
    }
  },
});

// Bulk create attendance records (for a date with all personnel)
export const bulkCreate = mutation({
  args: {
    date: v.string(),
    records: v.array(
      v.object({
        personnelId: v.id("personnel"),
        status: v.string(),
        scheduledStart: v.optional(v.string()),
        scheduledEnd: v.optional(v.string()),
        actualStart: v.optional(v.string()),
        actualEnd: v.optional(v.string()),
        hoursWorked: v.optional(v.number()),
        notes: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const createdIds: string[] = [];

    for (const record of args.records) {
      // Check if record exists
      const existing = await ctx.db
        .query("attendance")
        .withIndex("by_personnel_date", (q) =>
          q.eq("personnelId", record.personnelId).eq("date", args.date)
        )
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          status: record.status,
          scheduledStart: record.scheduledStart,
          scheduledEnd: record.scheduledEnd,
          actualStart: record.actualStart,
          actualEnd: record.actualEnd,
          hoursWorked: record.hoursWorked,
          notes: record.notes,
          updatedAt: now,
        });
        createdIds.push(existing._id);
      } else {
        const recordId = await ctx.db.insert("attendance", {
          personnelId: record.personnelId,
          date: args.date,
          status: record.status,
          scheduledStart: record.scheduledStart,
          scheduledEnd: record.scheduledEnd,
          actualStart: record.actualStart,
          actualEnd: record.actualEnd,
          hoursWorked: record.hoursWorked,
          notes: record.notes,
          createdAt: now,
          updatedAt: now,
        });
        createdIds.push(recordId);
      }
    }

    return createdIds;
  },
});

// Delete attendance record
export const remove = mutation({
  args: { attendanceId: v.id("attendance") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.attendanceId);
    return args.attendanceId;
  },
});
