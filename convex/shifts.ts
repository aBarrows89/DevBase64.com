import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ============ QUERIES ============

// Get shifts for a specific date
export const listByDate = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const shifts = await ctx.db
      .query("shifts")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .collect();

    // Enrich with personnel names and lead info
    const enriched = await Promise.all(
      shifts.map(async (shift) => {
        const assignedNames = await Promise.all(
          shift.assignedPersonnel.map(async (personnelId) => {
            const personnel = await ctx.db.get(personnelId);
            return personnel
              ? `${personnel.firstName} ${personnel.lastName}`
              : "Unknown";
          })
        );
        const createdBy = await ctx.db.get(shift.createdBy);

        // Get lead name if set
        let leadName: string | undefined;
        if (shift.leadId) {
          const lead = await ctx.db.get(shift.leadId);
          leadName = lead ? `${lead.firstName} ${lead.lastName}` : undefined;
        }

        return {
          ...shift,
          assignedNames,
          leadName,
          createdByName: createdBy?.name || "Unknown",
        };
      })
    );

    return enriched.sort((a, b) => a.startTime.localeCompare(b.startTime));
  },
});

// Get shifts for a date range
export const listByDateRange = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
    department: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let shifts;

    if (args.department) {
      shifts = await ctx.db
        .query("shifts")
        .withIndex("by_date_department", (q) =>
          q.eq("date", args.startDate).eq("department", args.department!)
        )
        .collect();

      // For date range, we need to filter manually since compound index
      // only works for exact matches on both fields
      const allShifts = await ctx.db.query("shifts").collect();
      shifts = allShifts.filter(
        (s) =>
          s.date >= args.startDate &&
          s.date <= args.endDate &&
          s.department === args.department
      );
    } else {
      const allShifts = await ctx.db.query("shifts").collect();
      shifts = allShifts.filter(
        (s) => s.date >= args.startDate && s.date <= args.endDate
      );
    }

    // Enrich with personnel names
    const enriched = await Promise.all(
      shifts.map(async (shift) => {
        const assignedNames = await Promise.all(
          shift.assignedPersonnel.map(async (personnelId) => {
            const personnel = await ctx.db.get(personnelId);
            return personnel
              ? `${personnel.firstName} ${personnel.lastName}`
              : "Unknown";
          })
        );
        return {
          ...shift,
          assignedNames,
        };
      })
    );

    return enriched.sort((a, b) => {
      // Sort by date first, then by start time
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.startTime.localeCompare(b.startTime);
    });
  },
});

// Get shifts for a specific personnel
export const listByPersonnel = query({
  args: {
    personnelId: v.id("personnel"),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const allShifts = await ctx.db.query("shifts").collect();

    let filtered = allShifts.filter((s) =>
      s.assignedPersonnel.includes(args.personnelId)
    );

    if (args.startDate) {
      filtered = filtered.filter((s) => s.date >= args.startDate!);
    }
    if (args.endDate) {
      filtered = filtered.filter((s) => s.date <= args.endDate!);
    }

    return filtered.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.startTime.localeCompare(b.startTime);
    });
  },
});

// Get single shift
export const getById = query({
  args: { shiftId: v.id("shifts") },
  handler: async (ctx, args) => {
    const shift = await ctx.db.get(args.shiftId);
    if (!shift) return null;

    const assignedPersonnel = await Promise.all(
      shift.assignedPersonnel.map(async (personnelId) => {
        const personnel = await ctx.db.get(personnelId);
        return personnel
          ? {
              _id: personnel._id,
              name: `${personnel.firstName} ${personnel.lastName}`,
              department: personnel.department,
            }
          : null;
      })
    );

    const createdBy = await ctx.db.get(shift.createdBy);

    return {
      ...shift,
      assignedPersonnelDetails: assignedPersonnel.filter((p) => p !== null),
      createdByName: createdBy?.name || "Unknown",
    };
  },
});

// Get available personnel for a shift (not already assigned)
export const getAvailablePersonnel = query({
  args: {
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    department: v.optional(v.string()),
    excludeShiftId: v.optional(v.id("shifts")),
  },
  handler: async (ctx, args) => {
    // Get all active personnel
    const personnel = await ctx.db
      .query("personnel")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    // Filter by department if specified
    let filtered = args.department
      ? personnel.filter((p) => p.department === args.department)
      : personnel;

    // Get all shifts for this date that overlap with the requested time
    const shiftsOnDate = await ctx.db
      .query("shifts")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .collect();

    // Filter out the current shift if editing
    const otherShifts = args.excludeShiftId
      ? shiftsOnDate.filter((s) => s._id !== args.excludeShiftId)
      : shiftsOnDate;

    // Find personnel already assigned to overlapping shifts
    const busyPersonnelIds = new Set<string>();
    for (const shift of otherShifts) {
      // Check for time overlap
      const overlaps =
        (args.startTime < shift.endTime && args.endTime > shift.startTime);
      if (overlaps) {
        shift.assignedPersonnel.forEach((id) => busyPersonnelIds.add(id));
      }
    }

    // Return available personnel
    const available = filtered.filter(
      (p) => !busyPersonnelIds.has(p._id)
    );

    return available.map((p) => ({
      _id: p._id,
      name: `${p.firstName} ${p.lastName}`,
      department: p.department,
      position: p.position,
    }));
  },
});

// ============ MUTATIONS ============

// Create shift
export const create = mutation({
  args: {
    date: v.string(),
    name: v.optional(v.string()),
    startTime: v.string(),
    endTime: v.string(),
    position: v.string(),
    department: v.string(),
    requiredCount: v.number(),
    assignedPersonnel: v.array(v.id("personnel")),
    notes: v.optional(v.string()),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const shiftId = await ctx.db.insert("shifts", {
      date: args.date,
      name: args.name,
      startTime: args.startTime,
      endTime: args.endTime,
      position: args.position,
      department: args.department,
      requiredCount: args.requiredCount,
      assignedPersonnel: args.assignedPersonnel,
      notes: args.notes,
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
    });

    return shiftId;
  },
});

// Update shift
export const update = mutation({
  args: {
    shiftId: v.id("shifts"),
    name: v.optional(v.string()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    position: v.optional(v.string()),
    department: v.optional(v.string()),
    requiredCount: v.optional(v.number()),
    assignedPersonnel: v.optional(v.array(v.id("personnel"))),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { shiftId, ...updates } = args;

    const updateData: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        updateData[key] = value;
      }
    }

    await ctx.db.patch(shiftId, updateData);
    return shiftId;
  },
});

// Assign personnel to shift
export const assignPersonnel = mutation({
  args: {
    shiftId: v.id("shifts"),
    personnelId: v.id("personnel"),
  },
  handler: async (ctx, args) => {
    const shift = await ctx.db.get(args.shiftId);
    if (!shift) throw new Error("Shift not found");

    if (shift.assignedPersonnel.includes(args.personnelId)) {
      throw new Error("Personnel already assigned to this shift");
    }

    await ctx.db.patch(args.shiftId, {
      assignedPersonnel: [...shift.assignedPersonnel, args.personnelId],
      updatedAt: Date.now(),
    });

    return args.shiftId;
  },
});

// Remove personnel from shift
export const unassignPersonnel = mutation({
  args: {
    shiftId: v.id("shifts"),
    personnelId: v.id("personnel"),
  },
  handler: async (ctx, args) => {
    const shift = await ctx.db.get(args.shiftId);
    if (!shift) throw new Error("Shift not found");

    await ctx.db.patch(args.shiftId, {
      assignedPersonnel: shift.assignedPersonnel.filter(
        (id) => id !== args.personnelId
      ),
      updatedAt: Date.now(),
    });

    return args.shiftId;
  },
});

// Set department lead
export const setLead = mutation({
  args: {
    shiftId: v.id("shifts"),
    personnelId: v.id("personnel"),
  },
  handler: async (ctx, args) => {
    const shift = await ctx.db.get(args.shiftId);
    if (!shift) throw new Error("Shift not found");

    await ctx.db.patch(args.shiftId, {
      leadId: args.personnelId,
      updatedAt: Date.now(),
    });

    return args.shiftId;
  },
});

// Remove department lead
export const removeLead = mutation({
  args: { shiftId: v.id("shifts") },
  handler: async (ctx, args) => {
    const shift = await ctx.db.get(args.shiftId);
    if (!shift) throw new Error("Shift not found");

    await ctx.db.patch(args.shiftId, {
      leadId: undefined,
      updatedAt: Date.now(),
    });

    return args.shiftId;
  },
});

// Copy shifts from one date to another
export const copyFromDate = mutation({
  args: {
    sourceDate: v.string(),
    targetDate: v.string(),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const sourceShifts = await ctx.db
      .query("shifts")
      .withIndex("by_date", (q) => q.eq("date", args.sourceDate))
      .collect();

    const now = Date.now();
    const createdIds: string[] = [];

    for (const shift of sourceShifts) {
      const newShiftId = await ctx.db.insert("shifts", {
        date: args.targetDate,
        name: shift.name,
        startTime: shift.startTime,
        endTime: shift.endTime,
        position: shift.position,
        department: shift.department,
        requiredCount: shift.requiredCount,
        assignedPersonnel: [], // Don't copy assignments
        notes: shift.notes,
        createdBy: args.createdBy,
        createdAt: now,
        updatedAt: now,
      });
      createdIds.push(newShiftId);
    }

    return createdIds;
  },
});

// Delete shift
export const remove = mutation({
  args: { shiftId: v.id("shifts") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.shiftId);
    return args.shiftId;
  },
});

// Bulk delete shifts for a date
export const removeByDate = mutation({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const shifts = await ctx.db
      .query("shifts")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .collect();

    for (const shift of shifts) {
      await ctx.db.delete(shift._id);
    }

    return shifts.length;
  },
});
