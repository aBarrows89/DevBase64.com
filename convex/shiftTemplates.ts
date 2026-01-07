import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ============ QUERIES ============

// List all templates (optionally filter by location)
export const list = query({
  args: {
    locationId: v.optional(v.id("locations")),
  },
  handler: async (ctx, args) => {
    let templates;

    if (args.locationId) {
      // Get templates for specific location + global templates (no locationId)
      const locationTemplates = await ctx.db
        .query("shiftTemplates")
        .withIndex("by_location", (q) => q.eq("locationId", args.locationId))
        .collect();

      const globalTemplates = await ctx.db
        .query("shiftTemplates")
        .filter((q) => q.eq(q.field("locationId"), undefined))
        .collect();

      templates = [...locationTemplates, ...globalTemplates];
    } else {
      templates = await ctx.db.query("shiftTemplates").collect();
    }

    // Sort by name
    templates.sort((a, b) => a.name.localeCompare(b.name));

    // Enrich with location names
    return await Promise.all(
      templates.map(async (template) => {
        const location = template.locationId
          ? await ctx.db.get(template.locationId)
          : null;

        return {
          ...template,
          locationName: location?.name ?? "All Locations",
        };
      })
    );
  },
});

// Get single template with enriched personnel names
export const getById = query({
  args: {
    templateId: v.id("shiftTemplates"),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);
    if (!template) return null;

    const location = template.locationId
      ? await ctx.db.get(template.locationId)
      : null;

    // Enrich departments with personnel names
    const enrichedDepartments = await Promise.all(
      template.departments.map(async (dept) => {
        const personnelNames = await Promise.all(
          dept.assignedPersonnel.map(async (personnelId) => {
            const person = await ctx.db.get(personnelId);
            return person
              ? `${person.firstName} ${person.lastName}`
              : "Unknown";
          })
        );

        const lead = dept.leadId ? await ctx.db.get(dept.leadId) : null;

        return {
          ...dept,
          personnelNames,
          leadName: lead ? `${lead.firstName} ${lead.lastName}` : null,
        };
      })
    );

    return {
      ...template,
      locationName: location?.name ?? "All Locations",
      departments: enrichedDepartments,
    };
  },
});

// ============ MUTATIONS ============

// Create a new template manually
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    locationId: v.optional(v.id("locations")),
    departments: v.array(
      v.object({
        name: v.string(),
        position: v.string(),
        startTime: v.string(),
        endTime: v.string(),
        requiredCount: v.number(),
        assignedPersonnel: v.array(v.id("personnel")),
        leadId: v.optional(v.id("personnel")),
      })
    ),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    return await ctx.db.insert("shiftTemplates", {
      name: args.name,
      description: args.description,
      locationId: args.locationId,
      departments: args.departments,
      createdBy: args.userId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Save current day's shifts as a new template
export const saveFromDate = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    date: v.string(), // YYYY-MM-DD - the date to copy from
    locationId: v.optional(v.id("locations")),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get all shifts for the specified date
    const shifts = await ctx.db
      .query("shifts")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .collect();

    if (shifts.length === 0) {
      throw new Error("No shifts found for the specified date");
    }

    // Convert shifts to template department format
    const departments = shifts.map((shift) => ({
      name: shift.department,
      position: shift.position,
      startTime: shift.startTime,
      endTime: shift.endTime,
      requiredCount: shift.requiredCount,
      assignedPersonnel: shift.assignedPersonnel,
      leadId: shift.leadId,
    }));

    const now = Date.now();

    return await ctx.db.insert("shiftTemplates", {
      name: args.name,
      description: args.description,
      locationId: args.locationId,
      departments,
      createdBy: args.userId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update an existing template
export const update = mutation({
  args: {
    templateId: v.id("shiftTemplates"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    locationId: v.optional(v.id("locations")),
    departments: v.optional(
      v.array(
        v.object({
          name: v.string(),
          position: v.string(),
          startTime: v.string(),
          endTime: v.string(),
          requiredCount: v.number(),
          assignedPersonnel: v.array(v.id("personnel")),
          leadId: v.optional(v.id("personnel")),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const { templateId, ...updates } = args;

    // Filter out undefined values
    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }

    return await ctx.db.patch(templateId, {
      ...cleanUpdates,
      updatedAt: Date.now(),
    });
  },
});

// Delete a template
export const remove = mutation({
  args: {
    templateId: v.id("shiftTemplates"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.templateId);
    return { success: true };
  },
});

// Apply a template to a specific date (creates shifts from template)
export const applyToDate = mutation({
  args: {
    templateId: v.id("shiftTemplates"),
    targetDate: v.string(), // YYYY-MM-DD
    userId: v.id("users"),
    clearExisting: v.optional(v.boolean()), // If true, delete existing shifts for that date first
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    const now = Date.now();

    // Optionally clear existing shifts for the target date
    if (args.clearExisting) {
      const existingShifts = await ctx.db
        .query("shifts")
        .withIndex("by_date", (q) => q.eq("date", args.targetDate))
        .collect();

      for (const shift of existingShifts) {
        await ctx.db.delete(shift._id);
      }
    }

    // Create shifts from template departments
    const createdShifts: Id<"shifts">[] = [];

    for (const dept of template.departments) {
      // Validate that all personnel still exist and are active
      const validPersonnel: Id<"personnel">[] = [];
      for (const personnelId of dept.assignedPersonnel) {
        const person = await ctx.db.get(personnelId);
        if (person && person.status === "active") {
          validPersonnel.push(personnelId);
        }
      }

      // Validate lead still exists and is active
      let validLeadId = dept.leadId;
      if (dept.leadId) {
        const lead = await ctx.db.get(dept.leadId);
        if (!lead || lead.status !== "active") {
          validLeadId = undefined;
        }
      }

      const shiftId = await ctx.db.insert("shifts", {
        date: args.targetDate,
        name: undefined,
        startTime: dept.startTime,
        endTime: dept.endTime,
        position: dept.position,
        department: dept.name,
        requiredCount: dept.requiredCount,
        assignedPersonnel: validPersonnel,
        leadId: validLeadId,
        notes: undefined,
        createdBy: args.userId,
        createdAt: now,
        updatedAt: now,
      });

      createdShifts.push(shiftId);
    }

    return {
      success: true,
      shiftsCreated: createdShifts.length,
      templateName: template.name,
    };
  },
});
