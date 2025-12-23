import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// ============ SCANNER QUERIES ============

// Get all scanners
export const listScanners = query({
  args: {
    locationId: v.optional(v.id("locations")),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let scanners;

    if (args.locationId) {
      scanners = await ctx.db
        .query("scanners")
        .withIndex("by_location", (q) => q.eq("locationId", args.locationId!))
        .collect();
    } else {
      scanners = await ctx.db.query("scanners").collect();
    }

    if (args.status) {
      scanners = scanners.filter((s) => s.status === args.status);
    }

    // Enrich with location and personnel info
    return await Promise.all(
      scanners.map(async (scanner) => {
        const location = await ctx.db.get(scanner.locationId);
        const assignedPerson = scanner.assignedTo
          ? await ctx.db.get(scanner.assignedTo)
          : null;

        return {
          ...scanner,
          locationName: location?.name ?? "Unknown",
          assignedPersonName: assignedPerson
            ? `${assignedPerson.firstName} ${assignedPerson.lastName}`
            : null,
        };
      })
    );
  },
});

// Get single scanner
export const getScanner = query({
  args: { id: v.id("scanners") },
  handler: async (ctx, args) => {
    const scanner = await ctx.db.get(args.id);
    if (!scanner) return null;

    const location = await ctx.db.get(scanner.locationId);
    const assignedPerson = scanner.assignedTo
      ? await ctx.db.get(scanner.assignedTo)
      : null;

    return {
      ...scanner,
      locationName: location?.name ?? "Unknown",
      assignedPersonName: assignedPerson
        ? `${assignedPerson.firstName} ${assignedPerson.lastName}`
        : null,
    };
  },
});

// Get available scanners at a location
export const getAvailableScanners = query({
  args: { locationId: v.id("locations") },
  handler: async (ctx, args) => {
    const scanners = await ctx.db
      .query("scanners")
      .withIndex("by_location", (q) => q.eq("locationId", args.locationId))
      .collect();

    return scanners.filter((s) => s.status === "available");
  },
});

// ============ PICKER QUERIES ============

// Get all pickers
export const listPickers = query({
  args: {
    locationId: v.optional(v.id("locations")),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let pickers;

    if (args.locationId) {
      pickers = await ctx.db
        .query("pickers")
        .withIndex("by_location", (q) => q.eq("locationId", args.locationId!))
        .collect();
    } else {
      pickers = await ctx.db.query("pickers").collect();
    }

    if (args.status) {
      pickers = pickers.filter((p) => p.status === args.status);
    }

    // Enrich with location and personnel info
    return await Promise.all(
      pickers.map(async (picker) => {
        const location = await ctx.db.get(picker.locationId);
        const assignedPerson = picker.assignedTo
          ? await ctx.db.get(picker.assignedTo)
          : null;

        return {
          ...picker,
          locationName: location?.name ?? "Unknown",
          assignedPersonName: assignedPerson
            ? `${assignedPerson.firstName} ${assignedPerson.lastName}`
            : null,
        };
      })
    );
  },
});

// Get single picker
export const getPicker = query({
  args: { id: v.id("pickers") },
  handler: async (ctx, args) => {
    const picker = await ctx.db.get(args.id);
    if (!picker) return null;

    const location = await ctx.db.get(picker.locationId);
    const assignedPerson = picker.assignedTo
      ? await ctx.db.get(picker.assignedTo)
      : null;

    return {
      ...picker,
      locationName: location?.name ?? "Unknown",
      assignedPersonName: assignedPerson
        ? `${assignedPerson.firstName} ${assignedPerson.lastName}`
        : null,
    };
  },
});

// Get available pickers at a location
export const getAvailablePickers = query({
  args: { locationId: v.id("locations") },
  handler: async (ctx, args) => {
    const pickers = await ctx.db
      .query("pickers")
      .withIndex("by_location", (q) => q.eq("locationId", args.locationId))
      .collect();

    return pickers.filter((p) => p.status === "available");
  },
});

// Get equipment assigned to a person
export const getPersonnelEquipment = query({
  args: { personnelId: v.id("personnel") },
  handler: async (ctx, args) => {
    const scanners = await ctx.db
      .query("scanners")
      .withIndex("by_assigned", (q) => q.eq("assignedTo", args.personnelId))
      .collect();

    const pickers = await ctx.db
      .query("pickers")
      .withIndex("by_assigned", (q) => q.eq("assignedTo", args.personnelId))
      .collect();

    return { scanners, pickers };
  },
});

// ============ SCANNER MUTATIONS ============

// Create a new scanner
export const createScanner = mutation({
  args: {
    number: v.number(),
    pin: v.optional(v.string()),
    serialNumber: v.optional(v.string()),
    model: v.optional(v.string()),
    locationId: v.id("locations"),
    purchaseDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if scanner number already exists at this location
    const existing = await ctx.db
      .query("scanners")
      .withIndex("by_location", (q) => q.eq("locationId", args.locationId))
      .collect();

    if (existing.some((s) => s.number === args.number)) {
      throw new Error(
        `Scanner #${args.number} already exists at this location`
      );
    }

    return await ctx.db.insert("scanners", {
      number: args.number,
      pin: args.pin,
      serialNumber: args.serialNumber,
      model: args.model,
      locationId: args.locationId,
      status: "available",
      purchaseDate: args.purchaseDate,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update a scanner
export const updateScanner = mutation({
  args: {
    id: v.id("scanners"),
    number: v.optional(v.number()),
    pin: v.optional(v.string()),
    serialNumber: v.optional(v.string()),
    model: v.optional(v.string()),
    locationId: v.optional(v.id("locations")),
    status: v.optional(v.string()),
    lastMaintenanceDate: v.optional(v.string()),
    purchaseDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    // Filter out undefined values
    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }

    return await ctx.db.patch(id, {
      ...cleanUpdates,
      updatedAt: Date.now(),
    });
  },
});

// Assign scanner to personnel
export const assignScanner = mutation({
  args: {
    scannerId: v.id("scanners"),
    personnelId: v.id("personnel"),
    userId: v.id("users"), // Who performed the action
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const scanner = await ctx.db.get(args.scannerId);

    if (!scanner) {
      throw new Error("Scanner not found");
    }

    if (scanner.status !== "available") {
      throw new Error(
        `Scanner is not available (current status: ${scanner.status})`
      );
    }

    // Update scanner
    await ctx.db.patch(args.scannerId, {
      status: "assigned",
      assignedTo: args.personnelId,
      assignedAt: now,
      updatedAt: now,
    });

    // Create history record
    await ctx.db.insert("equipmentHistory", {
      equipmentType: "scanner",
      equipmentId: args.scannerId,
      action: "assigned",
      previousStatus: scanner.status,
      newStatus: "assigned",
      newAssignee: args.personnelId,
      performedBy: args.userId,
      notes: args.notes,
      createdAt: now,
    });

    return { success: true };
  },
});

// Unassign scanner from personnel
export const unassignScanner = mutation({
  args: {
    scannerId: v.id("scanners"),
    userId: v.id("users"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const scanner = await ctx.db.get(args.scannerId);

    if (!scanner) {
      throw new Error("Scanner not found");
    }

    if (!scanner.assignedTo) {
      throw new Error("Scanner is not assigned to anyone");
    }

    const previousAssignee = scanner.assignedTo;

    // Update scanner
    await ctx.db.patch(args.scannerId, {
      status: "available",
      assignedTo: undefined,
      assignedAt: undefined,
      updatedAt: now,
    });

    // Create history record
    await ctx.db.insert("equipmentHistory", {
      equipmentType: "scanner",
      equipmentId: args.scannerId,
      action: "unassigned",
      previousStatus: scanner.status,
      newStatus: "available",
      previousAssignee: previousAssignee,
      performedBy: args.userId,
      notes: args.notes,
      createdAt: now,
    });

    return { success: true };
  },
});

// ============ PICKER MUTATIONS ============

// Create a new picker
export const createPicker = mutation({
  args: {
    number: v.number(),
    pin: v.optional(v.string()),
    serialNumber: v.optional(v.string()),
    model: v.optional(v.string()),
    locationId: v.id("locations"),
    purchaseDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if picker number already exists at this location
    const existing = await ctx.db
      .query("pickers")
      .withIndex("by_location", (q) => q.eq("locationId", args.locationId))
      .collect();

    if (existing.some((p) => p.number === args.number)) {
      throw new Error(`Picker #${args.number} already exists at this location`);
    }

    return await ctx.db.insert("pickers", {
      number: args.number,
      pin: args.pin,
      serialNumber: args.serialNumber,
      model: args.model,
      locationId: args.locationId,
      status: "available",
      purchaseDate: args.purchaseDate,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update a picker
export const updatePicker = mutation({
  args: {
    id: v.id("pickers"),
    number: v.optional(v.number()),
    pin: v.optional(v.string()),
    serialNumber: v.optional(v.string()),
    model: v.optional(v.string()),
    locationId: v.optional(v.id("locations")),
    status: v.optional(v.string()),
    lastMaintenanceDate: v.optional(v.string()),
    purchaseDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    // Filter out undefined values
    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }

    return await ctx.db.patch(id, {
      ...cleanUpdates,
      updatedAt: Date.now(),
    });
  },
});

// Assign picker to personnel
export const assignPicker = mutation({
  args: {
    pickerId: v.id("pickers"),
    personnelId: v.id("personnel"),
    userId: v.id("users"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const picker = await ctx.db.get(args.pickerId);

    if (!picker) {
      throw new Error("Picker not found");
    }

    if (picker.status !== "available") {
      throw new Error(
        `Picker is not available (current status: ${picker.status})`
      );
    }

    // Update picker
    await ctx.db.patch(args.pickerId, {
      status: "assigned",
      assignedTo: args.personnelId,
      assignedAt: now,
      updatedAt: now,
    });

    // Create history record
    await ctx.db.insert("equipmentHistory", {
      equipmentType: "picker",
      equipmentId: args.pickerId,
      action: "assigned",
      previousStatus: picker.status,
      newStatus: "assigned",
      newAssignee: args.personnelId,
      performedBy: args.userId,
      notes: args.notes,
      createdAt: now,
    });

    return { success: true };
  },
});

// Unassign picker from personnel
export const unassignPicker = mutation({
  args: {
    pickerId: v.id("pickers"),
    userId: v.id("users"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const picker = await ctx.db.get(args.pickerId);

    if (!picker) {
      throw new Error("Picker not found");
    }

    if (!picker.assignedTo) {
      throw new Error("Picker is not assigned to anyone");
    }

    const previousAssignee = picker.assignedTo;

    // Update picker
    await ctx.db.patch(args.pickerId, {
      status: "available",
      assignedTo: undefined,
      assignedAt: undefined,
      updatedAt: now,
    });

    // Create history record
    await ctx.db.insert("equipmentHistory", {
      equipmentType: "picker",
      equipmentId: args.pickerId,
      action: "unassigned",
      previousStatus: picker.status,
      newStatus: "available",
      previousAssignee: previousAssignee,
      performedBy: args.userId,
      notes: args.notes,
      createdAt: now,
    });

    return { success: true };
  },
});

// ============ EQUIPMENT HISTORY ============

// Get equipment history
export const getEquipmentHistory = query({
  args: {
    equipmentType: v.string(),
    equipmentId: v.union(v.id("scanners"), v.id("pickers")),
  },
  handler: async (ctx, args) => {
    const history = await ctx.db
      .query("equipmentHistory")
      .withIndex("by_equipment", (q) =>
        q.eq("equipmentType", args.equipmentType).eq("equipmentId", args.equipmentId)
      )
      .order("desc")
      .collect();

    // Enrich with user and personnel names
    return await Promise.all(
      history.map(async (record) => {
        const performer = await ctx.db.get(record.performedBy);
        const prevAssignee = record.previousAssignee
          ? await ctx.db.get(record.previousAssignee)
          : null;
        const newAssignee = record.newAssignee
          ? await ctx.db.get(record.newAssignee)
          : null;

        return {
          ...record,
          performedByName: performer?.name ?? "Unknown",
          previousAssigneeName: prevAssignee
            ? `${prevAssignee.firstName} ${prevAssignee.lastName}`
            : null,
          newAssigneeName: newAssignee
            ? `${newAssignee.firstName} ${newAssignee.lastName}`
            : null,
        };
      })
    );
  },
});

// Change equipment status (for maintenance, lost, retired, etc.)
export const changeEquipmentStatus = mutation({
  args: {
    equipmentType: v.string(), // "scanner" | "picker"
    equipmentId: v.union(v.id("scanners"), v.id("pickers")),
    newStatus: v.string(),
    userId: v.id("users"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get the equipment
    const equipment =
      args.equipmentType === "scanner"
        ? await ctx.db.get(args.equipmentId as typeof args.equipmentId)
        : await ctx.db.get(args.equipmentId as typeof args.equipmentId);

    if (!equipment) {
      throw new Error(`${args.equipmentType} not found`);
    }

    const previousStatus = equipment.status;

    // If setting to available, clear assignment
    const updates: Record<string, unknown> = {
      status: args.newStatus,
      updatedAt: now,
    };

    if (args.newStatus === "available") {
      updates.assignedTo = undefined;
      updates.assignedAt = undefined;
    }

    // Update equipment
    await ctx.db.patch(args.equipmentId, updates);

    // Create history record
    await ctx.db.insert("equipmentHistory", {
      equipmentType: args.equipmentType,
      equipmentId: args.equipmentId,
      action: "status_change",
      previousStatus: previousStatus,
      newStatus: args.newStatus,
      previousAssignee: equipment.assignedTo,
      performedBy: args.userId,
      notes: args.notes,
      createdAt: now,
    });

    return { success: true };
  },
});
