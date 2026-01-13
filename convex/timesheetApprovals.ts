import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Reference date for pay period calculation (same as employeePortal)
const PAY_PERIOD_REFERENCE = new Date("2024-01-01T00:00:00");
const PAY_PERIOD_DAYS = 14;

// Calculate pay period from a date
function getPayPeriodFromDate(date: Date): {
  startDate: string;
  endDate: string;
  payPeriodNumber: number;
} {
  const daysSinceReference = Math.floor(
    (date.getTime() - PAY_PERIOD_REFERENCE.getTime()) / (1000 * 60 * 60 * 24)
  );
  const payPeriodNumber = Math.floor(daysSinceReference / PAY_PERIOD_DAYS);

  const startDate = new Date(PAY_PERIOD_REFERENCE);
  startDate.setDate(startDate.getDate() + payPeriodNumber * PAY_PERIOD_DAYS);

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + PAY_PERIOD_DAYS - 1);

  return {
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
    payPeriodNumber,
  };
}

// Get list of recent pay periods with their approval status
export const getPayPeriods = query({
  args: {
    count: v.optional(v.number()), // How many periods to return (default 6)
    payrollCompanyId: v.optional(v.id("payrollCompanies")), // Filter by company
  },
  handler: async (ctx, args) => {
    const count = args.count || 6;
    const today = new Date();
    const currentPeriod = getPayPeriodFromDate(today);

    const periods = [];

    for (let i = 0; i < count; i++) {
      const periodDate = new Date(today);
      periodDate.setDate(periodDate.getDate() - i * PAY_PERIOD_DAYS);
      const period = getPayPeriodFromDate(periodDate);

      // Check if approval record exists - filter by company if specified
      let approval;
      if (args.payrollCompanyId) {
        approval = await ctx.db
          .query("timesheetApprovals")
          .withIndex("by_company_period", (q) =>
            q.eq("payrollCompanyId", args.payrollCompanyId).eq("payPeriodStart", period.startDate)
          )
          .first();
      } else {
        // Get approval for "all companies" view (null company = legacy/default)
        approval = await ctx.db
          .query("timesheetApprovals")
          .withIndex("by_pay_period", (q) => q.eq("payPeriodStart", period.startDate))
          .filter((q) => q.eq(q.field("payrollCompanyId"), undefined))
          .first();
      }

      // Determine if this is current, past, or future
      const isPast = period.endDate < today.toISOString().split("T")[0];
      const isCurrent = period.startDate <= today.toISOString().split("T")[0] &&
                       period.endDate >= today.toISOString().split("T")[0];

      periods.push({
        ...period,
        isPast,
        isCurrent,
        status: approval?.status || (isPast ? "pending" : "in_progress"),
        approvalId: approval?._id,
        payrollCompanyId: approval?.payrollCompanyId,
        approvedBy: approval?.approvedBy,
        approvedAt: approval?.approvedAt,
        lockedAt: approval?.lockedAt,
        exportedToQB: approval?.exportedToQB,
        totalEmployees: approval?.totalEmployees,
        totalHours: approval?.totalHours,
        issueCount: approval?.issueCount,
      });
    }

    return periods;
  },
});

// Get detailed timesheet data for a specific pay period
export const getPayPeriodDetails = query({
  args: {
    payPeriodStart: v.string(),
    payPeriodEnd: v.string(),
    payrollCompanyId: v.optional(v.id("payrollCompanies")), // Filter by company
  },
  handler: async (ctx, args) => {
    // Get company info if filtering by company
    let companyDepartments: string[] | null = null;
    if (args.payrollCompanyId) {
      const company = await ctx.db.get(args.payrollCompanyId);
      if (company) {
        companyDepartments = company.departments;
      }
    }

    // Get all active personnel
    let personnel = await ctx.db
      .query("personnel")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    // Filter by company if specified
    if (args.payrollCompanyId) {
      personnel = personnel.filter((p) => {
        // Direct assignment takes precedence
        if (p.payrollCompanyId) {
          return p.payrollCompanyId === args.payrollCompanyId;
        }
        // Fall back to department matching
        return companyDepartments?.includes(p.department) ?? false;
      });
    }

    // Get all time entries for this period
    const allEntries = await ctx.db
      .query("timeEntries")
      .withIndex("by_date")
      .filter((q) =>
        q.and(
          q.gte(q.field("date"), args.payPeriodStart),
          q.lte(q.field("date"), args.payPeriodEnd)
        )
      )
      .collect();

    // Get pending corrections for this period
    const pendingCorrections = await ctx.db
      .query("timeCorrections")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "pending"),
          q.gte(q.field("date"), args.payPeriodStart),
          q.lte(q.field("date"), args.payPeriodEnd)
        )
      )
      .collect();

    // Get call-offs for this period
    const callOffs = await ctx.db
      .query("callOffs")
      .withIndex("by_date")
      .filter((q) =>
        q.and(
          q.gte(q.field("date"), args.payPeriodStart),
          q.lte(q.field("date"), args.payPeriodEnd)
        )
      )
      .collect();

    // Calculate hours per employee
    const employeeData = await Promise.all(
      personnel.map(async (person) => {
        const entries = allEntries.filter((e) => e.personnelId === person._id);
        const corrections = pendingCorrections.filter((c) => c.personnelId === person._id);
        const personCallOffs = callOffs.filter((c) => c.personnelId === person._id);

        // Calculate hours from time entries
        const { regularHours, overtimeHours, totalHours, dailyBreakdown } =
          calculateHoursFromEntries(entries, args.payPeriodStart, args.payPeriodEnd);

        // Check for issues
        const issues: string[] = [];
        if (corrections.length > 0) {
          issues.push(`${corrections.length} pending correction(s)`);
        }

        // Check for missing clock-outs
        const entriesByDate = new Map<string, typeof entries>();
        for (const entry of entries) {
          if (!entriesByDate.has(entry.date)) {
            entriesByDate.set(entry.date, []);
          }
          entriesByDate.get(entry.date)!.push(entry);
        }

        for (const [date, dayEntries] of entriesByDate) {
          const sorted = dayEntries.sort((a, b) => a.timestamp - b.timestamp);
          const lastEntry = sorted[sorted.length - 1];
          if (lastEntry.type === "clock_in" || lastEntry.type === "break_start") {
            issues.push(`Missing clock-out on ${date}`);
          }
        }

        return {
          personnelId: person._id,
          name: `${person.firstName} ${person.lastName}`,
          department: person.department,
          position: person.position,
          hourlyRate: person.hourlyRate,
          regularHours,
          overtimeHours,
          totalHours,
          daysWorked: dailyBreakdown.length,
          dailyBreakdown,
          pendingCorrections: corrections.length,
          callOffDays: personCallOffs.length,
          issues,
          hasIssues: issues.length > 0,
        };
      })
    );

    // Filter to only employees who worked or have issues
    const activeEmployees = employeeData.filter(
      (e) => e.totalHours > 0 || e.hasIssues || e.callOffDays > 0
    );

    // Calculate totals
    const totals = {
      totalEmployees: activeEmployees.length,
      totalRegularHours: activeEmployees.reduce((sum, e) => sum + e.regularHours, 0),
      totalOvertimeHours: activeEmployees.reduce((sum, e) => sum + e.overtimeHours, 0),
      totalHours: activeEmployees.reduce((sum, e) => sum + e.totalHours, 0),
      totalIssues: activeEmployees.reduce((sum, e) => sum + e.issues.length, 0),
    };

    // Get approval status
    const approval = await ctx.db
      .query("timesheetApprovals")
      .withIndex("by_pay_period", (q) => q.eq("payPeriodStart", args.payPeriodStart))
      .first();

    return {
      payPeriodStart: args.payPeriodStart,
      payPeriodEnd: args.payPeriodEnd,
      employees: activeEmployees.sort((a, b) => a.name.localeCompare(b.name)),
      totals,
      approval: approval || null,
    };
  },
});

// Helper function to calculate hours from time entries
function calculateHoursFromEntries(
  entries: any[],
  periodStart: string,
  periodEnd: string
): {
  regularHours: number;
  overtimeHours: number;
  totalHours: number;
  dailyBreakdown: Array<{
    date: string;
    clockIn: number | null;
    clockOut: number | null;
    breakMinutes: number;
    hoursWorked: number;
  }>;
} {
  // Group entries by date
  const byDate = new Map<string, typeof entries>();
  for (const entry of entries) {
    if (!byDate.has(entry.date)) {
      byDate.set(entry.date, []);
    }
    byDate.get(entry.date)!.push(entry);
  }

  const dailyBreakdown: Array<{
    date: string;
    clockIn: number | null;
    clockOut: number | null;
    breakMinutes: number;
    hoursWorked: number;
  }> = [];

  let totalMinutes = 0;

  for (const [date, dayEntries] of byDate) {
    const sorted = dayEntries.sort((a: any, b: any) => a.timestamp - b.timestamp);

    let clockIn: number | null = null;
    let clockOut: number | null = null;
    let breakStart: number | null = null;
    let breakMinutes = 0;
    let workMinutes = 0;

    for (const entry of sorted) {
      if (entry.type === "clock_in") {
        clockIn = entry.timestamp;
      } else if (entry.type === "clock_out") {
        clockOut = entry.timestamp;
        if (clockIn && clockOut) {
          workMinutes += (clockOut - clockIn) / (1000 * 60);
        }
      } else if (entry.type === "break_start") {
        breakStart = entry.timestamp;
      } else if (entry.type === "break_end" && breakStart) {
        breakMinutes += (entry.timestamp - breakStart) / (1000 * 60);
        breakStart = null;
      }
    }

    const netMinutes = Math.max(0, workMinutes - breakMinutes);
    const hoursWorked = Math.round((netMinutes / 60) * 100) / 100;

    dailyBreakdown.push({
      date,
      clockIn,
      clockOut,
      breakMinutes: Math.round(breakMinutes),
      hoursWorked,
    });

    totalMinutes += netMinutes;
  }

  // Calculate regular vs overtime (>40 hrs/week = OT)
  const totalHours = Math.round((totalMinutes / 60) * 100) / 100;
  const regularHours = Math.min(totalHours, 40);
  const overtimeHours = Math.max(0, totalHours - 40);

  return {
    regularHours: Math.round(regularHours * 100) / 100,
    overtimeHours: Math.round(overtimeHours * 100) / 100,
    totalHours,
    dailyBreakdown: dailyBreakdown.sort((a, b) => a.date.localeCompare(b.date)),
  };
}

// Approve a pay period's timesheets
export const approvePayPeriod = mutation({
  args: {
    payPeriodStart: v.string(),
    payPeriodEnd: v.string(),
    userId: v.id("users"),
    notes: v.optional(v.string()),
    payrollCompanyId: v.optional(v.id("payrollCompanies")), // Company-specific approval
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get company info if specified
    let companyDepartments: string[] | null = null;
    if (args.payrollCompanyId) {
      const company = await ctx.db.get(args.payrollCompanyId);
      if (company) {
        companyDepartments = company.departments;
      }
    }

    // Check if approval record exists for this company
    let existing;
    if (args.payrollCompanyId) {
      existing = await ctx.db
        .query("timesheetApprovals")
        .withIndex("by_company_period", (q) =>
          q.eq("payrollCompanyId", args.payrollCompanyId).eq("payPeriodStart", args.payPeriodStart)
        )
        .first();
    } else {
      existing = await ctx.db
        .query("timesheetApprovals")
        .withIndex("by_pay_period", (q) => q.eq("payPeriodStart", args.payPeriodStart))
        .filter((q) => q.eq(q.field("payrollCompanyId"), undefined))
        .first();
    }

    // Get personnel (filtered by company if specified)
    let personnel = await ctx.db
      .query("personnel")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    if (args.payrollCompanyId) {
      personnel = personnel.filter((p) => {
        if (p.payrollCompanyId) {
          return p.payrollCompanyId === args.payrollCompanyId;
        }
        return companyDepartments?.includes(p.department) ?? false;
      });
    }

    const entries = await ctx.db
      .query("timeEntries")
      .withIndex("by_date")
      .filter((q) =>
        q.and(
          q.gte(q.field("date"), args.payPeriodStart),
          q.lte(q.field("date"), args.payPeriodEnd)
        )
      )
      .collect();

    // Calculate totals
    let totalRegularHours = 0;
    let totalOvertimeHours = 0;
    let employeesWithHours = 0;

    for (const person of personnel) {
      const personEntries = entries.filter((e) => e.personnelId === person._id);
      if (personEntries.length > 0) {
        const { regularHours, overtimeHours } = calculateHoursFromEntries(
          personEntries,
          args.payPeriodStart,
          args.payPeriodEnd
        );
        if (regularHours > 0 || overtimeHours > 0) {
          employeesWithHours++;
          totalRegularHours += regularHours;
          totalOvertimeHours += overtimeHours;
        }
      }
    }

    if (existing) {
      // Update existing record
      await ctx.db.patch(existing._id, {
        status: "approved",
        approvedBy: args.userId,
        approvedAt: now,
        approvalNotes: args.notes,
        totalEmployees: employeesWithHours,
        totalRegularHours,
        totalOvertimeHours,
        totalHours: totalRegularHours + totalOvertimeHours,
        updatedAt: now,
      });
      return existing._id;
    } else {
      // Create new approval record
      const approvalId = await ctx.db.insert("timesheetApprovals", {
        payPeriodStart: args.payPeriodStart,
        payPeriodEnd: args.payPeriodEnd,
        payrollCompanyId: args.payrollCompanyId,
        status: "approved",
        totalEmployees: employeesWithHours,
        totalRegularHours,
        totalOvertimeHours,
        totalHours: totalRegularHours + totalOvertimeHours,
        approvedBy: args.userId,
        approvedAt: now,
        approvalNotes: args.notes,
        createdAt: now,
        updatedAt: now,
      });
      return approvalId;
    }
  },
});

// Lock a pay period (prevents further edits)
export const lockPayPeriod = mutation({
  args: {
    payPeriodStart: v.string(),
    payPeriodEnd: v.string(),
    userId: v.id("users"),
    payrollCompanyId: v.optional(v.id("payrollCompanies")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    let existing;
    if (args.payrollCompanyId) {
      existing = await ctx.db
        .query("timesheetApprovals")
        .withIndex("by_company_period", (q) =>
          q.eq("payrollCompanyId", args.payrollCompanyId).eq("payPeriodStart", args.payPeriodStart)
        )
        .first();
    } else {
      existing = await ctx.db
        .query("timesheetApprovals")
        .withIndex("by_pay_period", (q) => q.eq("payPeriodStart", args.payPeriodStart))
        .filter((q) => q.eq(q.field("payrollCompanyId"), undefined))
        .first();
    }

    if (!existing) {
      throw new Error("Pay period must be approved before it can be locked");
    }

    if (existing.status !== "approved") {
      throw new Error("Pay period must be approved before it can be locked");
    }

    await ctx.db.patch(existing._id, {
      status: "locked",
      lockedAt: now,
      lockedBy: args.userId,
      updatedAt: now,
    });

    return existing._id;
  },
});

// Unlock a pay period (admin override)
export const unlockPayPeriod = mutation({
  args: {
    payPeriodStart: v.string(),
    userId: v.id("users"),
    payrollCompanyId: v.optional(v.id("payrollCompanies")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    let existing;
    if (args.payrollCompanyId) {
      existing = await ctx.db
        .query("timesheetApprovals")
        .withIndex("by_company_period", (q) =>
          q.eq("payrollCompanyId", args.payrollCompanyId).eq("payPeriodStart", args.payPeriodStart)
        )
        .first();
    } else {
      existing = await ctx.db
        .query("timesheetApprovals")
        .withIndex("by_pay_period", (q) => q.eq("payPeriodStart", args.payPeriodStart))
        .filter((q) => q.eq(q.field("payrollCompanyId"), undefined))
        .first();
    }

    if (!existing) {
      throw new Error("No approval record found");
    }

    await ctx.db.patch(existing._id, {
      status: "approved",
      lockedAt: undefined,
      lockedBy: undefined,
      updatedAt: now,
    });

    return existing._id;
  },
});

// Mark a pay period as exported to QuickBooks
export const markExportedToQB = mutation({
  args: {
    payPeriodStart: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const existing = await ctx.db
      .query("timesheetApprovals")
      .withIndex("by_pay_period", (q) => q.eq("payPeriodStart", args.payPeriodStart))
      .first();

    if (!existing) {
      throw new Error("No approval record found");
    }

    if (existing.status !== "locked") {
      throw new Error("Pay period must be locked before exporting to QuickBooks");
    }

    await ctx.db.patch(existing._id, {
      exportedToQB: true,
      exportedAt: now,
      updatedAt: now,
    });

    return existing._id;
  },
});

// Check if a time entry can be edited (not in locked period)
export const canEditTimeEntry = query({
  args: {
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const period = getPayPeriodFromDate(new Date(args.date + "T12:00:00"));

    const approval = await ctx.db
      .query("timesheetApprovals")
      .withIndex("by_pay_period", (q) => q.eq("payPeriodStart", period.startDate))
      .first();

    if (approval?.status === "locked") {
      return {
        canEdit: false,
        reason: "This pay period has been locked for payroll processing",
      };
    }

    return { canEdit: true };
  },
});
