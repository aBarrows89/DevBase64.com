import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ============ QUERIES ============

// Get all personnel (with optional filters)
export const list = query({
  args: {
    department: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let personnel;

    if (args.department) {
      personnel = await ctx.db
        .query("personnel")
        .withIndex("by_department", (q) => q.eq("department", args.department!))
        .collect();
    } else if (args.status) {
      personnel = await ctx.db
        .query("personnel")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
    } else {
      personnel = await ctx.db.query("personnel").collect();
    }

    return personnel.sort((a, b) => a.lastName.localeCompare(b.lastName));
  },
});

// Get single personnel by ID
export const getById = query({
  args: { personnelId: v.id("personnel") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.personnelId);
  },
});

// Get personnel with their stats (write-ups count, merits count, attendance stats)
export const getWithStats = query({
  args: { personnelId: v.id("personnel") },
  handler: async (ctx, args) => {
    const personnel = await ctx.db.get(args.personnelId);
    if (!personnel) return null;

    // Get write-ups count
    const writeUps = await ctx.db
      .query("writeUps")
      .withIndex("by_personnel", (q) => q.eq("personnelId", args.personnelId))
      .collect();

    // Get merits count
    const merits = await ctx.db
      .query("merits")
      .withIndex("by_personnel", (q) => q.eq("personnelId", args.personnelId))
      .collect();

    // Get attendance records for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

    const attendance = await ctx.db
      .query("attendance")
      .withIndex("by_personnel", (q) => q.eq("personnelId", args.personnelId))
      .collect();

    const recentAttendance = attendance.filter(
      (a) => a.date >= thirtyDaysAgoStr
    );
    const presentDays = recentAttendance.filter(
      (a) => a.status === "present"
    ).length;
    const lateDays = recentAttendance.filter((a) => a.status === "late").length;
    const absentDays = recentAttendance.filter(
      (a) => a.status === "absent" || a.status === "no_call_no_show"
    ).length;

    return {
      ...personnel,
      stats: {
        writeUpsCount: writeUps.length,
        activeWriteUps: writeUps.filter(
          (w) => w.followUpRequired && !w.followUpNotes
        ).length,
        meritsCount: merits.length,
        attendance: {
          presentDays,
          lateDays,
          absentDays,
          totalRecorded: recentAttendance.length,
        },
      },
    };
  },
});

// Get personnel by application ID (to check if already hired)
export const getByApplicationId = query({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, args) => {
    const personnel = await ctx.db
      .query("personnel")
      .filter((q) => q.eq(q.field("applicationId"), args.applicationId))
      .first();
    return personnel;
  },
});

// Get all departments (unique)
export const getDepartments = query({
  handler: async (ctx) => {
    const personnel = await ctx.db.query("personnel").collect();
    const departments = [...new Set(personnel.map((p) => p.department))];
    return departments.sort();
  },
});

// ============ MUTATIONS ============

// Create personnel from hired applicant
export const createFromApplication = mutation({
  args: {
    applicationId: v.id("applications"),
    position: v.string(),
    department: v.string(),
    employeeType: v.string(),
    hireDate: v.string(),
    hourlyRate: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get the application data
    const application = await ctx.db.get(args.applicationId);
    if (!application) {
      throw new Error("Application not found");
    }

    // Check if personnel already exists for this application
    const existing = await ctx.db
      .query("personnel")
      .filter((q) => q.eq(q.field("applicationId"), args.applicationId))
      .first();

    if (existing) {
      throw new Error("Personnel record already exists for this application");
    }

    const now = Date.now();

    // Create the personnel record
    const personnelId = await ctx.db.insert("personnel", {
      firstName: application.firstName,
      lastName: application.lastName,
      email: application.email,
      phone: application.phone,
      applicationId: args.applicationId,
      position: args.position,
      department: args.department,
      employeeType: args.employeeType,
      hireDate: args.hireDate,
      hourlyRate: args.hourlyRate,
      status: "active",
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });

    // Update the application status to "hired"
    await ctx.db.patch(args.applicationId, {
      status: "hired",
      updatedAt: now,
    });

    return personnelId;
  },
});

// Create personnel manually (not from application)
export const create = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.string(),
    position: v.string(),
    department: v.string(),
    employeeType: v.string(),
    hireDate: v.string(),
    hourlyRate: v.optional(v.number()),
    emergencyContact: v.optional(
      v.object({
        name: v.string(),
        phone: v.string(),
        relationship: v.string(),
      })
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const personnelId = await ctx.db.insert("personnel", {
      firstName: args.firstName,
      lastName: args.lastName,
      email: args.email,
      phone: args.phone,
      position: args.position,
      department: args.department,
      employeeType: args.employeeType,
      hireDate: args.hireDate,
      hourlyRate: args.hourlyRate,
      status: "active",
      emergencyContact: args.emergencyContact,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });

    return personnelId;
  },
});

// Update personnel
export const update = mutation({
  args: {
    personnelId: v.id("personnel"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    position: v.optional(v.string()),
    department: v.optional(v.string()),
    employeeType: v.optional(v.string()),
    hourlyRate: v.optional(v.number()),
    status: v.optional(v.string()),
    emergencyContact: v.optional(
      v.object({
        name: v.string(),
        phone: v.string(),
        relationship: v.string(),
      })
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { personnelId, ...updates } = args;

    const existing = await ctx.db.get(personnelId);
    if (!existing) {
      throw new Error("Personnel not found");
    }

    // Build the update object with only defined values
    const updateData: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        updateData[key] = value;
      }
    }

    await ctx.db.patch(personnelId, updateData);
    return personnelId;
  },
});

// Terminate personnel
export const terminate = mutation({
  args: {
    personnelId: v.id("personnel"),
    terminationDate: v.string(),
    terminationReason: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.personnelId);
    if (!existing) {
      throw new Error("Personnel not found");
    }

    await ctx.db.patch(args.personnelId, {
      status: "terminated",
      terminationDate: args.terminationDate,
      terminationReason: args.terminationReason,
      updatedAt: Date.now(),
    });

    return args.personnelId;
  },
});

// Delete personnel (hard delete - use with caution)
export const remove = mutation({
  args: { personnelId: v.id("personnel") },
  handler: async (ctx, args) => {
    // Delete associated records first
    const writeUps = await ctx.db
      .query("writeUps")
      .withIndex("by_personnel", (q) => q.eq("personnelId", args.personnelId))
      .collect();
    for (const writeUp of writeUps) {
      await ctx.db.delete(writeUp._id);
    }

    const attendance = await ctx.db
      .query("attendance")
      .withIndex("by_personnel", (q) => q.eq("personnelId", args.personnelId))
      .collect();
    for (const record of attendance) {
      await ctx.db.delete(record._id);
    }

    const merits = await ctx.db
      .query("merits")
      .withIndex("by_personnel", (q) => q.eq("personnelId", args.personnelId))
      .collect();
    for (const merit of merits) {
      await ctx.db.delete(merit._id);
    }

    const reviews = await ctx.db
      .query("performanceReviews")
      .withIndex("by_personnel", (q) => q.eq("personnelId", args.personnelId))
      .collect();
    for (const review of reviews) {
      await ctx.db.delete(review._id);
    }

    // Finally delete the personnel record
    await ctx.db.delete(args.personnelId);

    return args.personnelId;
  },
});
