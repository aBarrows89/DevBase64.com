import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ============ QUERIES ============

// Get all holidays
export const list = query({
  handler: async (ctx) => {
    const holidays = await ctx.db.query("holidays").collect();
    return holidays.sort((a, b) => a.date.localeCompare(b.date));
  },
});

// Get holidays for a specific year
export const listByYear = query({
  args: { year: v.number() },
  handler: async (ctx, args) => {
    const startDate = `${args.year}-01-01`;
    const endDate = `${args.year}-12-31`;

    const holidays = await ctx.db.query("holidays").collect();
    return holidays
      .filter((h) => h.date >= startDate && h.date <= endDate)
      .sort((a, b) => a.date.localeCompare(b.date));
  },
});

// Get upcoming holidays (next 90 days)
export const listUpcoming = query({
  handler: async (ctx) => {
    const today = new Date().toISOString().split("T")[0];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 90);
    const endDate = futureDate.toISOString().split("T")[0];

    const holidays = await ctx.db
      .query("holidays")
      .withIndex("by_date")
      .collect();

    return holidays
      .filter((h) => h.date >= today && h.date <= endDate)
      .sort((a, b) => a.date.localeCompare(b.date));
  },
});

// Check if a specific date is a holiday
export const isHoliday = query({
  args: {
    date: v.string(),
    locationId: v.optional(v.id("locations")),
    department: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const holidays = await ctx.db
      .query("holidays")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .collect();

    if (holidays.length === 0) return null;

    // Find a matching holiday for this location/department
    for (const holiday of holidays) {
      // Check location restriction
      if (
        holiday.affectedLocations &&
        holiday.affectedLocations.length > 0 &&
        args.locationId &&
        !holiday.affectedLocations.includes(args.locationId)
      ) {
        continue; // This holiday doesn't apply to this location
      }

      // Check department restriction
      if (
        holiday.affectedDepartments &&
        holiday.affectedDepartments.length > 0 &&
        args.department &&
        !holiday.affectedDepartments.includes(args.department)
      ) {
        continue; // This holiday doesn't apply to this department
      }

      // Holiday applies
      return holiday;
    }

    return null;
  },
});

// Get a holiday by ID
export const getById = query({
  args: { holidayId: v.id("holidays") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.holidayId);
  },
});

// ============ MUTATIONS ============

// Create a new holiday
export const create = mutation({
  args: {
    name: v.string(),
    date: v.string(),
    type: v.string(),
    isPaidHoliday: v.boolean(),
    affectedLocations: v.optional(v.array(v.id("locations"))),
    affectedDepartments: v.optional(v.array(v.string())),
    isRecurring: v.optional(v.boolean()),
    notes: v.optional(v.string()),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const holidayId = await ctx.db.insert("holidays", {
      name: args.name,
      date: args.date,
      type: args.type,
      isPaidHoliday: args.isPaidHoliday,
      affectedLocations: args.affectedLocations,
      affectedDepartments: args.affectedDepartments,
      isRecurring: args.isRecurring,
      notes: args.notes,
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
    });

    return holidayId;
  },
});

// Update a holiday
export const update = mutation({
  args: {
    holidayId: v.id("holidays"),
    name: v.optional(v.string()),
    date: v.optional(v.string()),
    type: v.optional(v.string()),
    isPaidHoliday: v.optional(v.boolean()),
    affectedLocations: v.optional(v.array(v.id("locations"))),
    affectedDepartments: v.optional(v.array(v.string())),
    isRecurring: v.optional(v.boolean()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { holidayId, ...updates } = args;

    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    await ctx.db.patch(holidayId, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });

    return holidayId;
  },
});

// Delete a holiday
export const remove = mutation({
  args: { holidayId: v.id("holidays") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.holidayId);
    return args.holidayId;
  },
});

// ============ BULK OPERATIONS ============

// Create standard US holidays for a year
export const createStandardHolidays = mutation({
  args: {
    year: v.number(),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const holidays = [];

    // Calculate dynamic holidays
    const getThanksgving = (year: number) => {
      // 4th Thursday of November
      const nov1 = new Date(year, 10, 1);
      const dayOfWeek = nov1.getDay();
      const firstThursday = dayOfWeek <= 4 ? 5 - dayOfWeek : 12 - dayOfWeek;
      const thanksgiving = new Date(year, 10, firstThursday + 21);
      return thanksgiving.toISOString().split("T")[0];
    };

    const getMemorialDay = (year: number) => {
      // Last Monday of May
      const may31 = new Date(year, 4, 31);
      const dayOfWeek = may31.getDay();
      const lastMonday = dayOfWeek === 0 ? 25 : 31 - dayOfWeek + 1;
      return `${year}-05-${lastMonday.toString().padStart(2, "0")}`;
    };

    const getLaborDay = (year: number) => {
      // First Monday of September
      const sep1 = new Date(year, 8, 1);
      const dayOfWeek = sep1.getDay();
      const firstMonday = dayOfWeek === 0 ? 2 : dayOfWeek === 1 ? 1 : 9 - dayOfWeek;
      return `${year}-09-${firstMonday.toString().padStart(2, "0")}`;
    };

    const getMLKDay = (year: number) => {
      // Third Monday of January
      const jan1 = new Date(year, 0, 1);
      const dayOfWeek = jan1.getDay();
      const firstMonday = dayOfWeek === 0 ? 2 : dayOfWeek === 1 ? 1 : 9 - dayOfWeek;
      return `${year}-01-${(firstMonday + 14).toString().padStart(2, "0")}`;
    };

    // Standard holidays
    const standardHolidays = [
      { name: "New Year's Day", date: `${args.year}-01-01`, isPaid: true },
      { name: "Martin Luther King Jr. Day", date: getMLKDay(args.year), isPaid: false },
      { name: "Memorial Day", date: getMemorialDay(args.year), isPaid: true },
      { name: "Independence Day", date: `${args.year}-07-04`, isPaid: true },
      { name: "Labor Day", date: getLaborDay(args.year), isPaid: true },
      { name: "Thanksgiving Day", date: getThanksgving(args.year), isPaid: true },
      {
        name: "Day After Thanksgiving",
        date: (() => {
          const thanksgiving = new Date(getThanksgving(args.year));
          thanksgiving.setDate(thanksgiving.getDate() + 1);
          return thanksgiving.toISOString().split("T")[0];
        })(),
        isPaid: false,
      },
      { name: "Christmas Eve", date: `${args.year}-12-24`, isPaid: false },
      { name: "Christmas Day", date: `${args.year}-12-25`, isPaid: true },
    ];

    for (const h of standardHolidays) {
      // Check if holiday already exists
      const existing = await ctx.db
        .query("holidays")
        .withIndex("by_date", (q) => q.eq("date", h.date))
        .first();

      if (!existing) {
        const id = await ctx.db.insert("holidays", {
          name: h.name,
          date: h.date,
          type: "holiday",
          isPaidHoliday: h.isPaid,
          isRecurring: true,
          createdBy: args.createdBy,
          createdAt: now,
          updatedAt: now,
        });
        holidays.push(id);
      }
    }

    return { created: holidays.length, holidays };
  },
});
