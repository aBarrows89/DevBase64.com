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

// Get pending tenure check-ins (due or overdue)
export const getPendingTenureCheckIns = query({
  handler: async (ctx) => {
    const personnel = await ctx.db
      .query("personnel")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const milestones = [
      { key: "1_day", days: 1, label: "1 Day" },
      { key: "3_day", days: 3, label: "3 Day" },
      { key: "7_day", days: 7, label: "7 Day" },
      { key: "30_day", days: 30, label: "30 Day" },
      { key: "60_day", days: 60, label: "60 Day" },
    ];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pending: {
      personnelId: Id<"personnel">;
      personnelName: string;
      department: string;
      milestone: string;
      milestoneLabel: string;
      daysOverdue: number;
      hireDate: string;
    }[] = [];

    for (const person of personnel) {
      const hireDate = new Date(person.hireDate);
      hireDate.setHours(0, 0, 0, 0);
      const daysSinceHire = Math.floor((today.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24));

      const completedMilestones = (person.tenureCheckIns || []).map((c: { milestone: string }) => c.milestone);

      for (const milestone of milestones) {
        // Check if milestone is due (employee has worked >= milestone days)
        // and hasn't been completed yet
        if (daysSinceHire >= milestone.days && !completedMilestones.includes(milestone.key)) {
          const daysOverdue = daysSinceHire - milestone.days;
          pending.push({
            personnelId: person._id,
            personnelName: `${person.firstName} ${person.lastName}`,
            department: person.department,
            milestone: milestone.key,
            milestoneLabel: milestone.label,
            daysOverdue,
            hireDate: person.hireDate,
          });
        }
      }
    }

    // Sort by most overdue first
    pending.sort((a, b) => b.daysOverdue - a.daysOverdue);

    return pending;
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
    userId: v.optional(v.id("users")),
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

    // Log the hire action
    if (args.userId) {
      const user = await ctx.db.get(args.userId);
      if (user) {
        await ctx.db.insert("auditLogs", {
          action: "Hired applicant",
          actionType: "create",
          resourceType: "personnel",
          resourceId: personnelId,
          userId: args.userId,
          userEmail: user.email,
          details: `Hired ${application.firstName} ${application.lastName} as ${args.position}`,
          timestamp: now,
        });
      }
    }

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
    locationId: v.optional(v.id("locations")),
    emergencyContact: v.optional(
      v.object({
        name: v.string(),
        phone: v.string(),
        relationship: v.string(),
      })
    ),
    notes: v.optional(v.string()),
    userId: v.optional(v.id("users")),
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
      locationId: args.locationId,
      status: "active",
      emergencyContact: args.emergencyContact,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });

    // Log the creation
    if (args.userId) {
      const user = await ctx.db.get(args.userId);
      if (user) {
        await ctx.db.insert("auditLogs", {
          action: "Created personnel",
          actionType: "create",
          resourceType: "personnel",
          resourceId: personnelId,
          userId: args.userId,
          userEmail: user.email,
          details: `Created personnel record for ${args.firstName} ${args.lastName}`,
          timestamp: now,
        });
      }
    }

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
    hireDate: v.optional(v.string()), // Only super_admin should be able to edit this
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
    locationId: v.optional(v.id("locations")),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const { personnelId, userId, ...updates } = args;

    const existing = await ctx.db.get(personnelId);
    if (!existing) {
      throw new Error("Personnel not found");
    }

    // Build the update object with only defined values
    const now = Date.now();
    const updateData: Record<string, unknown> = { updatedAt: now };
    const changedFields: string[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        updateData[key] = value;
        // Track what changed for audit log
        if (key !== "userId" && existing[key as keyof typeof existing] !== value) {
          changedFields.push(key);
        }
      }
    }

    await ctx.db.patch(personnelId, updateData);

    // Log the update
    if (userId && changedFields.length > 0) {
      const user = await ctx.db.get(userId);
      if (user) {
        await ctx.db.insert("auditLogs", {
          action: "Updated personnel",
          actionType: "update",
          resourceType: "personnel",
          resourceId: personnelId,
          userId: userId,
          userEmail: user.email,
          details: `Updated ${existing.firstName} ${existing.lastName}: ${changedFields.join(", ")}`,
          timestamp: now,
        });
      }
    }

    return personnelId;
  },
});

// Set all tenure check-ins as complete for a single personnel
export const setAllTenureCheckInsComplete = mutation({
  args: {
    personnelId: v.id("personnel"),
    completedByName: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const personnel = await ctx.db.get(args.personnelId);
    if (!personnel) {
      throw new Error("Personnel not found");
    }

    const milestones = ["1_day", "3_day", "7_day", "30_day", "60_day"];
    const currentCheckIns = personnel.tenureCheckIns || [];
    const completedMilestones = currentCheckIns.map((c: { milestone: string }) => c.milestone);

    // Find missing milestones and create check-ins for them
    const newCheckIns = milestones
      .filter(m => !completedMilestones.includes(m))
      .map(milestone => ({
        milestone,
        completedAt: Date.now(),
        completedByName: args.completedByName,
        notes: args.notes,
      }));

    if (newCheckIns.length > 0) {
      await ctx.db.patch(args.personnelId, {
        tenureCheckIns: [...currentCheckIns, ...newCheckIns],
        updatedAt: Date.now(),
      });
    }

    return { added: newCheckIns.length };
  },
});

// Terminate personnel
export const terminate = mutation({
  args: {
    personnelId: v.id("personnel"),
    terminationDate: v.string(),
    terminationReason: v.string(),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.personnelId);
    if (!existing) {
      throw new Error("Personnel not found");
    }

    const now = Date.now();
    await ctx.db.patch(args.personnelId, {
      status: "terminated",
      terminationDate: args.terminationDate,
      terminationReason: args.terminationReason,
      updatedAt: now,
    });

    // Log the termination
    if (args.userId) {
      const user = await ctx.db.get(args.userId);
      if (user) {
        await ctx.db.insert("auditLogs", {
          action: "Terminated personnel",
          actionType: "delete",
          resourceType: "personnel",
          resourceId: args.personnelId,
          userId: args.userId,
          userEmail: user.email,
          details: `Terminated ${existing.firstName} ${existing.lastName}: ${args.terminationReason}`,
          timestamp: now,
        });
      }
    }

    return args.personnelId;
  },
});

// Toggle training completion for a training area (with date tracking)
export const toggleTraining = mutation({
  args: {
    personnelId: v.id("personnel"),
    trainingArea: v.string(),
  },
  handler: async (ctx, args) => {
    const personnel = await ctx.db.get(args.personnelId);
    if (!personnel) {
      throw new Error("Personnel not found");
    }

    // Use the new trainingRecords field
    const currentRecords = personnel.trainingRecords || [];
    let newRecords: { area: string; completedAt: number }[];

    // Also update legacy completedTraining field for backward compatibility
    const currentTraining = personnel.completedTraining || [];
    let newTraining: string[];

    const existingRecord = currentRecords.find((r) => r.area === args.trainingArea);

    if (existingRecord) {
      // Remove training
      newRecords = currentRecords.filter((r) => r.area !== args.trainingArea);
      newTraining = currentTraining.filter((t) => t !== args.trainingArea);
    } else {
      // Add training with current timestamp
      newRecords = [...currentRecords, { area: args.trainingArea, completedAt: Date.now() }];
      newTraining = [...currentTraining, args.trainingArea];
    }

    await ctx.db.patch(args.personnelId, {
      trainingRecords: newRecords,
      completedTraining: newTraining,
      updatedAt: Date.now(),
    });

    return args.personnelId;
  },
});

// Record a tenure milestone check-in
export const recordTenureCheckIn = mutation({
  args: {
    personnelId: v.id("personnel"),
    milestone: v.string(), // "1_day" | "3_day" | "7_day" | "30_day" | "60_day"
    completedBy: v.id("users"),
    completedByName: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const personnel = await ctx.db.get(args.personnelId);
    if (!personnel) {
      throw new Error("Personnel not found");
    }

    const validMilestones = ["1_day", "3_day", "7_day", "30_day", "60_day"];
    if (!validMilestones.includes(args.milestone)) {
      throw new Error("Invalid milestone. Must be one of: 1_day, 3_day, 7_day, 30_day, 60_day");
    }

    const currentCheckIns = personnel.tenureCheckIns || [];

    // Check if this milestone is already recorded
    const existingCheckIn = currentCheckIns.find((c) => c.milestone === args.milestone);
    if (existingCheckIn) {
      throw new Error(`${args.milestone} check-in has already been recorded`);
    }

    // Add the new check-in
    const newCheckIn = {
      milestone: args.milestone,
      completedAt: Date.now(),
      completedBy: args.completedBy,
      completedByName: args.completedByName,
      notes: args.notes,
    };

    await ctx.db.patch(args.personnelId, {
      tenureCheckIns: [...currentCheckIns, newCheckIn],
      updatedAt: Date.now(),
    });

    return args.personnelId;
  },
});

// Remove a tenure milestone check-in (in case of error)
export const removeTenureCheckIn = mutation({
  args: {
    personnelId: v.id("personnel"),
    milestone: v.string(),
  },
  handler: async (ctx, args) => {
    const personnel = await ctx.db.get(args.personnelId);
    if (!personnel) {
      throw new Error("Personnel not found");
    }

    const currentCheckIns = personnel.tenureCheckIns || [];
    const newCheckIns = currentCheckIns.filter((c) => c.milestone !== args.milestone);

    await ctx.db.patch(args.personnelId, {
      tenureCheckIns: newCheckIns,
      updatedAt: Date.now(),
    });

    return args.personnelId;
  },
});

// Bulk mark all tenure check-ins complete for personnel hired before a date
export const bulkCompleteTenureCheckIns = mutation({
  args: {
    beforeDate: v.string(), // YYYY-MM-DD format
    completedByName: v.string(),
  },
  handler: async (ctx, args) => {
    const allPersonnel = await ctx.db
      .query("personnel")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const milestones = ["1_day", "3_day", "7_day", "30_day", "60_day"];
    const cutoffDate = new Date(args.beforeDate);
    cutoffDate.setHours(0, 0, 0, 0);

    let updated = 0;
    const results: { name: string; milestonesAdded: number }[] = [];

    for (const person of allPersonnel) {
      const hireDate = new Date(person.hireDate);
      hireDate.setHours(0, 0, 0, 0);

      // Only process if hired before the cutoff date
      if (hireDate < cutoffDate) {
        const currentCheckIns = person.tenureCheckIns || [];
        const completedMilestones = currentCheckIns.map((c: { milestone: string }) => c.milestone);

        // Find milestones that aren't already completed
        const missingMilestones = milestones.filter(m => !completedMilestones.includes(m));

        if (missingMilestones.length > 0) {
          // Add all missing milestones
          const newCheckIns = missingMilestones.map(milestone => ({
            milestone,
            completedAt: Date.now(),
            completedByName: args.completedByName,
            notes: "Bulk completed for employees hired before " + args.beforeDate,
          }));

          await ctx.db.patch(person._id, {
            tenureCheckIns: [...currentCheckIns, ...newCheckIns],
            updatedAt: Date.now(),
          });

          updated++;
          results.push({
            name: `${person.firstName} ${person.lastName}`,
            milestonesAdded: missingMilestones.length,
          });
        }
      }
    }

    return { updated, results };
  },
});

// Remove duplicate personnel records (keeps the oldest by createdAt)
export const removeDuplicates = mutation({
  handler: async (ctx) => {
    const allPersonnel = await ctx.db.query("personnel").collect();

    // Group by email (lowercase)
    const byEmail: Record<string, typeof allPersonnel> = {};
    for (const person of allPersonnel) {
      const email = person.email.toLowerCase();
      if (!byEmail[email]) {
        byEmail[email] = [];
      }
      byEmail[email].push(person);
    }

    let deleted = 0;
    for (const [email, records] of Object.entries(byEmail)) {
      if (records.length > 1) {
        // Sort by createdAt, keep the oldest
        records.sort((a, b) => a.createdAt - b.createdAt);
        // Delete all but the first (oldest)
        for (let i = 1; i < records.length; i++) {
          await ctx.db.delete(records[i]._id);
          deleted++;
        }
      }
    }

    return { deleted, remaining: allPersonnel.length - deleted };
  },
});

// Bulk import personnel (skips duplicates by email)
export const bulkImport = mutation({
  args: {
    employees: v.array(
      v.object({
        firstName: v.string(),
        lastName: v.string(),
        email: v.string(),
        phone: v.string(),
        position: v.string(),
        department: v.string(),
        employeeType: v.string(),
        hireDate: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const results = {
      imported: 0,
      skipped: 0,
      skippedEmails: [] as string[],
    };

    for (const employee of args.employees) {
      // Check if email already exists
      const existing = await ctx.db
        .query("personnel")
        .withIndex("by_email", (q) => q.eq("email", employee.email.toLowerCase()))
        .first();

      if (existing) {
        results.skipped++;
        results.skippedEmails.push(employee.email);
        continue;
      }

      // Create the personnel record
      await ctx.db.insert("personnel", {
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email.toLowerCase(),
        phone: employee.phone,
        position: employee.position,
        department: employee.department,
        employeeType: employee.employeeType,
        hireDate: employee.hireDate,
        status: "active",
        createdAt: now,
        updatedAt: now,
      });

      results.imported++;
    }

    return results;
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
