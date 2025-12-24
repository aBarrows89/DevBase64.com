import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

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
    number: v.string(),
    pin: v.optional(v.string()),
    serialNumber: v.optional(v.string()),
    model: v.optional(v.string()),
    locationId: v.id("locations"),
    purchaseDate: v.optional(v.string()),
    notes: v.optional(v.string()),
    conditionNotes: v.optional(v.string()),
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
      conditionNotes: args.conditionNotes,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update a scanner
export const updateScanner = mutation({
  args: {
    id: v.id("scanners"),
    number: v.optional(v.string()),
    pin: v.optional(v.string()),
    serialNumber: v.optional(v.string()),
    model: v.optional(v.string()),
    locationId: v.optional(v.id("locations")),
    status: v.optional(v.string()),
    lastMaintenanceDate: v.optional(v.string()),
    purchaseDate: v.optional(v.string()),
    notes: v.optional(v.string()),
    conditionNotes: v.optional(v.string()),
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
    number: v.string(),
    pin: v.optional(v.string()),
    serialNumber: v.optional(v.string()),
    model: v.optional(v.string()),
    locationId: v.id("locations"),
    purchaseDate: v.optional(v.string()),
    notes: v.optional(v.string()),
    conditionNotes: v.optional(v.string()),
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
      conditionNotes: args.conditionNotes,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update a picker
export const updatePicker = mutation({
  args: {
    id: v.id("pickers"),
    number: v.optional(v.string()),
    pin: v.optional(v.string()),
    serialNumber: v.optional(v.string()),
    model: v.optional(v.string()),
    locationId: v.optional(v.id("locations")),
    status: v.optional(v.string()),
    lastMaintenanceDate: v.optional(v.string()),
    purchaseDate: v.optional(v.string()),
    notes: v.optional(v.string()),
    conditionNotes: v.optional(v.string()),
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

// Retire equipment
export const retireEquipment = mutation({
  args: {
    equipmentType: v.string(), // "scanner" | "picker"
    equipmentId: v.union(v.id("scanners"), v.id("pickers")),
    reason: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const equipment =
      args.equipmentType === "scanner"
        ? await ctx.db.get(args.equipmentId as Id<"scanners">)
        : await ctx.db.get(args.equipmentId as Id<"pickers">);

    if (!equipment) {
      throw new Error(`${args.equipmentType} not found`);
    }

    const previousStatus = equipment.status;

    // Update equipment to retired
    await ctx.db.patch(args.equipmentId, {
      status: "retired",
      assignedTo: undefined,
      assignedAt: undefined,
      retiredAt: now,
      retiredReason: args.reason,
      updatedAt: now,
    });

    // Create history record
    await ctx.db.insert("equipmentHistory", {
      equipmentType: args.equipmentType,
      equipmentId: args.equipmentId,
      action: "status_change",
      previousStatus: previousStatus,
      newStatus: "retired",
      previousAssignee: equipment.assignedTo,
      performedBy: args.userId,
      notes: `Retired: ${args.reason}`,
      createdAt: now,
    });

    return { success: true };
  },
});

// Update condition notes
export const updateConditionNotes = mutation({
  args: {
    equipmentType: v.string(), // "scanner" | "picker"
    equipmentId: v.union(v.id("scanners"), v.id("pickers")),
    conditionNotes: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.equipmentId, {
      conditionNotes: args.conditionNotes,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// ============ EQUIPMENT AGREEMENTS ============

// Generate the official equipment agreement text
export const generateAgreementText = (
  equipmentType: string,
  equipmentNumber: string,
  serialNumber: string | undefined,
  employeeName: string,
  equipmentValue: number
): string => {
  const serialDisplay = serialNumber ? ` (Serial: ${serialNumber})` : "";
  const equipmentLabel = equipmentType === "scanner" ? "Scanner" : "Picker";

  return `EQUIPMENT RESPONSIBILITY AGREEMENT

This Equipment Responsibility Agreement ("Agreement") is entered into between the Employee named below and IE Tires, LLC ("Company").

EQUIPMENT ASSIGNED:
${equipmentLabel} #${equipmentNumber}${serialDisplay}
Equipment Value: $${equipmentValue.toFixed(2)}

EMPLOYEE: ${employeeName}

TERMS AND CONDITIONS:

1. SOLE RESPONSIBILITY: The undersigned Employee acknowledges receipt of the above-described Company equipment and accepts full responsibility for its care, security, and proper use.

2. AUTHORIZED USE ONLY: This equipment is issued exclusively to the undersigned Employee. No other individual is authorized to access, operate, or use this equipment under any circumstances.

3. ON-PREMISES ONLY: This equipment must remain on Company premises at all times. Under no circumstances shall this equipment be removed from the workplace or taken to the Employee's residence.

4. DAMAGE REPORTING: The Employee shall immediately report any damage, malfunction, or defect to their supervisor. Failure to promptly report damage may result in disciplinary action and financial liability.

5. FINANCIAL LIABILITY:
   a) Failure to return equipment upon separation from employment, reassignment, or request by management will result in a deduction of up to $${equipmentValue.toFixed(2)} from the Employee's final pay.
   b) Damage resulting from intentional misconduct, gross negligence, or careless handling may result in a deduction of up to $${equipmentValue.toFixed(2)} from Employee's pay to cover replacement costs.

6. RETURN REQUIREMENT: Upon termination of employment, reassignment, or request by management, the Employee shall immediately return this equipment in the same condition as received, allowing for reasonable wear and tear.

By signing below, the Employee acknowledges that they have read, understand, and agree to abide by all terms and conditions set forth in this Agreement.

Signed electronically on ${new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })}`;
};

// Assign equipment with signed agreement
export const assignEquipmentWithAgreement = mutation({
  args: {
    equipmentType: v.string(), // "scanner" | "picker"
    equipmentId: v.union(v.id("scanners"), v.id("pickers")),
    personnelId: v.id("personnel"),
    signatureData: v.string(), // Base64 encoded signature image
    userId: v.id("users"), // Admin/manager witnessing
    userName: v.string(), // Name for display
    equipmentValue: v.optional(v.number()), // Default $100
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const equipmentValue = args.equipmentValue ?? 100;

    // Get equipment
    const equipment = await ctx.db.get(args.equipmentId);
    if (!equipment) {
      throw new Error(`${args.equipmentType} not found`);
    }

    if (equipment.status !== "available") {
      throw new Error(
        `Equipment is not available for assignment (current status: ${equipment.status})`
      );
    }

    // Get personnel
    const personnel = await ctx.db.get(args.personnelId);
    if (!personnel) {
      throw new Error("Personnel not found");
    }

    const employeeName = `${personnel.firstName} ${personnel.lastName}`;
    const equipmentLabel = args.equipmentType === "scanner" ? "Scanner" : "Picker";

    // Generate agreement text
    const agreementText = generateAgreementText(
      args.equipmentType,
      equipment.number,
      equipment.serialNumber,
      employeeName,
      equipmentValue
    );

    // Create agreement record
    await ctx.db.insert("equipmentAgreements", {
      equipmentType: args.equipmentType,
      equipmentId: args.equipmentId,
      personnelId: args.personnelId,
      equipmentNumber: equipment.number,
      serialNumber: equipment.serialNumber,
      equipmentValue: equipmentValue,
      agreementText: agreementText,
      signatureData: args.signatureData,
      signedAt: now,
      witnessedBy: args.userId,
      witnessedByName: args.userName,
      createdAt: now,
    });

    // Update equipment
    await ctx.db.patch(args.equipmentId, {
      status: "assigned",
      assignedTo: args.personnelId,
      assignedAt: now,
      updatedAt: now,
    });

    // Create history record
    await ctx.db.insert("equipmentHistory", {
      equipmentType: args.equipmentType,
      equipmentId: args.equipmentId,
      action: "assigned",
      previousStatus: equipment.status,
      newStatus: "assigned",
      newAssignee: args.personnelId,
      performedBy: args.userId,
      notes: `${equipmentLabel} #${equipment.number} assigned to ${employeeName} with signed agreement`,
      createdAt: now,
    });

    return { success: true };
  },
});

// Return equipment with condition check
export const returnEquipmentWithCheck = mutation({
  args: {
    equipmentType: v.string(), // "scanner" | "picker"
    equipmentId: v.union(v.id("scanners"), v.id("pickers")),
    checkedBy: v.id("users"),
    checkedByName: v.string(),
    checklist: v.object({
      physicalCondition: v.boolean(),
      screenFunctional: v.boolean(),
      buttonsWorking: v.boolean(),
      batteryCondition: v.boolean(),
      chargingPortOk: v.boolean(),
      scannerFunctional: v.boolean(),
      cleanCondition: v.boolean(),
    }),
    overallCondition: v.string(), // "excellent" | "good" | "fair" | "poor" | "damaged"
    damageNotes: v.optional(v.string()),
    repairRequired: v.boolean(),
    readyForReassignment: v.boolean(),
    deductionRequired: v.optional(v.boolean()),
    deductionAmount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get equipment
    const equipment = await ctx.db.get(args.equipmentId);
    if (!equipment) {
      throw new Error(`${args.equipmentType} not found`);
    }

    if (!equipment.assignedTo) {
      throw new Error("Equipment is not currently assigned");
    }

    const returnedBy = equipment.assignedTo;

    // Create condition check record
    const checkId = await ctx.db.insert("equipmentConditionChecks", {
      equipmentType: args.equipmentType,
      equipmentId: args.equipmentId,
      returnedBy: returnedBy,
      checkedBy: args.checkedBy,
      checkedByName: args.checkedByName,
      checklist: args.checklist,
      overallCondition: args.overallCondition,
      damageNotes: args.damageNotes,
      repairRequired: args.repairRequired,
      readyForReassignment: args.readyForReassignment,
      deductionRequired: args.deductionRequired,
      deductionAmount: args.deductionAmount,
      checkedAt: now,
      createdAt: now,
    });

    // Determine new status
    let newStatus = "available";
    if (args.repairRequired) {
      newStatus = "maintenance";
    } else if (!args.readyForReassignment) {
      newStatus = "maintenance";
    }

    // Update condition notes on equipment
    const conditionNotes = args.damageNotes
      ? `${args.overallCondition} - ${args.damageNotes}`
      : args.overallCondition;

    // Update equipment
    await ctx.db.patch(args.equipmentId, {
      status: newStatus,
      assignedTo: undefined,
      assignedAt: undefined,
      conditionNotes: conditionNotes,
      updatedAt: now,
    });

    // Revoke the active agreement
    const agreements = await ctx.db
      .query("equipmentAgreements")
      .withIndex("by_equipment", (q) =>
        q.eq("equipmentType", args.equipmentType).eq("equipmentId", args.equipmentId)
      )
      .collect();

    const activeAgreement = agreements.find(
      (a) => a.personnelId === returnedBy && !a.revokedAt
    );

    if (activeAgreement) {
      await ctx.db.patch(activeAgreement._id, {
        revokedAt: now,
        revokedBy: args.checkedBy,
        revokedReason: "Equipment returned",
      });
    }

    // Create history record
    await ctx.db.insert("equipmentHistory", {
      equipmentType: args.equipmentType,
      equipmentId: args.equipmentId,
      action: "unassigned",
      previousStatus: equipment.status,
      newStatus: newStatus,
      previousAssignee: returnedBy,
      conditionCheckId: checkId,
      performedBy: args.checkedBy,
      notes: `Returned with condition: ${args.overallCondition}${
        args.repairRequired ? " (repair required)" : ""
      }`,
      createdAt: now,
    });

    return { success: true, conditionCheckId: checkId };
  },
});

// Get equipment agreement for specific equipment
export const getEquipmentAgreement = query({
  args: {
    equipmentType: v.string(),
    equipmentId: v.union(v.id("scanners"), v.id("pickers")),
  },
  handler: async (ctx, args) => {
    const agreements = await ctx.db
      .query("equipmentAgreements")
      .withIndex("by_equipment", (q) =>
        q.eq("equipmentType", args.equipmentType).eq("equipmentId", args.equipmentId)
      )
      .order("desc")
      .collect();

    // Return the active (non-revoked) agreement, or the most recent one
    const active = agreements.find((a) => !a.revokedAt);
    return active ?? agreements[0] ?? null;
  },
});

// Get all agreements for a personnel
export const getPersonnelAgreements = query({
  args: { personnelId: v.id("personnel") },
  handler: async (ctx, args) => {
    const agreements = await ctx.db
      .query("equipmentAgreements")
      .withIndex("by_personnel", (q) => q.eq("personnelId", args.personnelId))
      .order("desc")
      .collect();

    return agreements;
  },
});

// Get condition check history for equipment
export const getEquipmentConditionHistory = query({
  args: {
    equipmentType: v.string(),
    equipmentId: v.union(v.id("scanners"), v.id("pickers")),
  },
  handler: async (ctx, args) => {
    const checks = await ctx.db
      .query("equipmentConditionChecks")
      .withIndex("by_equipment", (q) =>
        q.eq("equipmentType", args.equipmentType).eq("equipmentId", args.equipmentId)
      )
      .order("desc")
      .collect();

    // Enrich with personnel names
    return await Promise.all(
      checks.map(async (check) => {
        const personnel = await ctx.db.get(check.returnedBy);
        return {
          ...check,
          returnedByName: personnel
            ? `${personnel.firstName} ${personnel.lastName}`
            : "Unknown",
        };
      })
    );
  },
});

// List active personnel for assignment dropdown
export const listActivePersonnel = query({
  args: {},
  handler: async (ctx) => {
    const personnel = await ctx.db
      .query("personnel")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    return personnel.map((p) => ({
      _id: p._id,
      name: `${p.firstName} ${p.lastName}`,
      position: p.position,
      department: p.department,
    }));
  },
});
