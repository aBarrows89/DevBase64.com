import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ============ QUERIES ============

// List all overtime offers (for admin)
export const listOffers = query({
  args: {
    status: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let offers = await ctx.db.query("overtimeOffers").collect();

    // Filter by status
    if (args.status) {
      offers = offers.filter((o) => o.status === args.status);
    }

    // Filter by date range
    if (args.startDate) {
      offers = offers.filter((o) => o.date >= args.startDate!);
    }
    if (args.endDate) {
      offers = offers.filter((o) => o.date <= args.endDate!);
    }

    // Get response counts for each offer
    const enriched = await Promise.all(
      offers.map(async (offer) => {
        const responses = await ctx.db
          .query("overtimeResponses")
          .withIndex("by_offer", (q) => q.eq("offerId", offer._id))
          .collect();

        const accepted = responses.filter((r) => r.response === "accepted").length;
        const declined = responses.filter((r) => r.response === "declined").length;
        const pending = responses.filter((r) => r.response === "pending").length;

        // Get location name if applicable
        let locationName: string | undefined;
        if (offer.locationId) {
          const location = await ctx.db.get(offer.locationId);
          locationName = location?.name;
        }

        return {
          ...offer,
          locationName,
          responseStats: {
            accepted,
            declined,
            pending,
            total: responses.length,
          },
        };
      })
    );

    return enriched.sort((a, b) => b.date.localeCompare(a.date));
  },
});

// Get single offer with full details
export const getOfferById = query({
  args: { offerId: v.id("overtimeOffers") },
  handler: async (ctx, args) => {
    const offer = await ctx.db.get(args.offerId);
    if (!offer) return null;

    // Get all responses with personnel info
    const responses = await ctx.db
      .query("overtimeResponses")
      .withIndex("by_offer", (q) => q.eq("offerId", args.offerId))
      .collect();

    const enrichedResponses = await Promise.all(
      responses.map(async (response) => {
        const personnel = await ctx.db.get(response.personnelId);
        return {
          ...response,
          personnelName: personnel
            ? `${personnel.firstName} ${personnel.lastName}`
            : "Unknown",
          personnelDepartment: personnel?.department,
        };
      })
    );

    // Get location name
    let locationName: string | undefined;
    if (offer.locationId) {
      const location = await ctx.db.get(offer.locationId);
      locationName = location?.name;
    }

    return {
      ...offer,
      locationName,
      responses: enrichedResponses.sort((a, b) =>
        a.personnelName.localeCompare(b.personnelName)
      ),
    };
  },
});

// Get available overtime offers for an employee (mobile app)
export const getAvailableOffersForEmployee = query({
  args: { personnelId: v.id("personnel") },
  handler: async (ctx, args) => {
    const personnel = await ctx.db.get(args.personnelId);
    if (!personnel) return [];

    // Get all open offers
    const offers = await ctx.db
      .query("overtimeOffers")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .collect();

    // Filter offers that apply to this employee
    const applicableOffers = offers.filter((offer) => {
      // All employees
      if (offer.targetType === "all") return true;

      // Department-specific
      if (offer.targetType === "department" && offer.department === personnel.department) {
        return true;
      }

      // Location-specific
      if (offer.targetType === "location" && offer.locationId === personnel.locationId) {
        return true;
      }

      // Specific employees
      if (
        offer.targetType === "specific" &&
        offer.targetPersonnelIds?.includes(args.personnelId)
      ) {
        return true;
      }

      return false;
    });

    // Get employee's response for each offer
    const enriched = await Promise.all(
      applicableOffers.map(async (offer) => {
        const response = await ctx.db
          .query("overtimeResponses")
          .withIndex("by_offer_personnel", (q) =>
            q.eq("offerId", offer._id).eq("personnelId", args.personnelId)
          )
          .first();

        // Get response counts
        const allResponses = await ctx.db
          .query("overtimeResponses")
          .withIndex("by_offer", (q) => q.eq("offerId", offer._id))
          .collect();

        const acceptedCount = allResponses.filter((r) => r.response === "accepted").length;
        const slotsRemaining = offer.maxSlots ? offer.maxSlots - acceptedCount : undefined;

        // Get location name
        let locationName: string | undefined;
        if (offer.locationId) {
          const location = await ctx.db.get(offer.locationId);
          locationName = location?.name;
        }

        return {
          ...offer,
          locationName,
          myResponse: response?.response ?? null,
          myResponseId: response?._id ?? null,
          acceptedCount,
          slotsRemaining,
          isFull: offer.maxSlots ? acceptedCount >= offer.maxSlots : false,
        };
      })
    );

    // Sort by date (soonest first) and filter out past dates
    const today = new Date().toISOString().split("T")[0];
    return enriched
      .filter((o) => o.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date));
  },
});

// Get employee's overtime history
export const getEmployeeOvertimeHistory = query({
  args: { personnelId: v.id("personnel") },
  handler: async (ctx, args) => {
    const responses = await ctx.db
      .query("overtimeResponses")
      .withIndex("by_personnel", (q) => q.eq("personnelId", args.personnelId))
      .collect();

    const enriched = await Promise.all(
      responses.map(async (response) => {
        const offer = await ctx.db.get(response.offerId);
        return {
          ...response,
          offer: offer
            ? {
                _id: offer._id,
                date: offer.date,
                title: offer.title,
                startTime: offer.startTime,
                endTime: offer.endTime,
                status: offer.status,
              }
            : null,
        };
      })
    );

    return enriched
      .filter((r) => r.offer !== null)
      .sort((a, b) => (b.offer?.date ?? "").localeCompare(a.offer?.date ?? ""));
  },
});

// ============ MUTATIONS ============

// Create a new overtime offer
// Note: Pay rate is not needed - overtime is calculated as hours over 40/week
export const createOffer = mutation({
  args: {
    date: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    startTime: v.string(),
    endTime: v.string(),
    locationId: v.optional(v.id("locations")),
    department: v.optional(v.string()),
    maxSlots: v.optional(v.number()),
    targetType: v.string(),
    targetPersonnelIds: v.optional(v.array(v.id("personnel"))),
    sendNotification: v.boolean(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const user = await ctx.db.get(args.userId);

    const offerId = await ctx.db.insert("overtimeOffers", {
      date: args.date,
      title: args.title,
      description: args.description,
      startTime: args.startTime,
      endTime: args.endTime,
      locationId: args.locationId,
      department: args.department,
      maxSlots: args.maxSlots,
      targetType: args.targetType,
      targetPersonnelIds: args.targetPersonnelIds,
      status: "open",
      notificationSentAt: args.sendNotification ? now : undefined,
      createdBy: args.userId,
      createdByName: user?.name ?? "Unknown",
      createdAt: now,
      updatedAt: now,
    });

    // If sending notifications, create pending response records for all target employees
    if (args.sendNotification) {
      // Get target employees based on targetType
      let targetEmployees: Id<"personnel">[] = [];

      if (args.targetType === "specific" && args.targetPersonnelIds) {
        targetEmployees = args.targetPersonnelIds;
      } else {
        // Get all active employees that match criteria
        let personnel = await ctx.db
          .query("personnel")
          .withIndex("by_status", (q) => q.eq("status", "active"))
          .collect();

        if (args.targetType === "department" && args.department) {
          personnel = personnel.filter((p) => p.department === args.department);
        } else if (args.targetType === "location" && args.locationId) {
          personnel = personnel.filter((p) => p.locationId === args.locationId);
        }
        // "all" - keep all active employees

        targetEmployees = personnel.map((p) => p._id);
      }

      // Create pending response for each target employee
      for (const personnelId of targetEmployees) {
        await ctx.db.insert("overtimeResponses", {
          offerId,
          personnelId,
          response: "pending",
          notifiedAt: now,
          createdAt: now,
          updatedAt: now,
        });
      }

      // TODO: Actually send push notifications here
      // This would integrate with Expo Push Notifications
    }

    // Log the action
    await ctx.db.insert("auditLogs", {
      action: "Overtime offer created",
      actionType: "create",
      resourceType: "overtimeOffers",
      resourceId: offerId,
      userId: args.userId,
      userEmail: user?.email ?? "unknown",
      details: `Created overtime offer for ${args.date}: ${args.title}`,
      timestamp: now,
    });

    return offerId;
  },
});

// Employee responds to overtime offer
export const respondToOffer = mutation({
  args: {
    offerId: v.id("overtimeOffers"),
    personnelId: v.id("personnel"),
    response: v.string(), // "accepted" | "declined"
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const offer = await ctx.db.get(args.offerId);
    if (!offer) {
      throw new Error("Overtime offer not found");
    }

    if (offer.status !== "open") {
      throw new Error("This overtime offer is no longer accepting responses");
    }

    // Check if already at max capacity for accepted responses
    if (args.response === "accepted" && offer.maxSlots) {
      const acceptedCount = await ctx.db
        .query("overtimeResponses")
        .withIndex("by_offer", (q) => q.eq("offerId", args.offerId))
        .filter((q) => q.eq(q.field("response"), "accepted"))
        .collect();

      if (acceptedCount.length >= offer.maxSlots) {
        throw new Error("This overtime slot is already full");
      }
    }

    // Get personnel info for notifications
    const personnel = await ctx.db.get(args.personnelId);
    const personnelName = personnel ? `${personnel.firstName} ${personnel.lastName}` : "Unknown";

    // Check if response already exists
    const existingResponse = await ctx.db
      .query("overtimeResponses")
      .withIndex("by_offer_personnel", (q) =>
        q.eq("offerId", args.offerId).eq("personnelId", args.personnelId)
      )
      .first();

    let responseId: Id<"overtimeResponses">;

    if (existingResponse) {
      // Update existing response
      await ctx.db.patch(existingResponse._id, {
        response: args.response,
        respondedAt: now,
        notes: args.notes,
        updatedAt: now,
      });
      responseId = existingResponse._id;
    } else {
      // Create new response
      responseId = await ctx.db.insert("overtimeResponses", {
        offerId: args.offerId,
        personnelId: args.personnelId,
        response: args.response,
        respondedAt: now,
        notes: args.notes,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Send notifications to management when someone ACCEPTS overtime
    if (args.response === "accepted") {
      // Get all users who should be notified about overtime
      const users = await ctx.db.query("users").collect();
      const managementRoles = ["super_admin", "admin", "payroll_manager", "warehouse_director", "warehouse_manager"];
      const managementUsers = users.filter(
        (u) => u.isActive && managementRoles.includes(u.role)
      );

      // Format date for display
      const offerDate = new Date(offer.date + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });

      for (const manager of managementUsers) {
        await ctx.db.insert("notifications", {
          userId: manager._id,
          type: "overtime_accepted",
          title: "Overtime Accepted",
          message: `${personnelName} accepted overtime for ${offerDate} (${offer.startTime} - ${offer.endTime})`,
          link: `/overtime`,
          relatedPersonnelId: args.personnelId,
          isRead: false,
          isDismissed: false,
          createdAt: now,
        });
      }
    }

    return responseId;
  },
});

// Close an overtime offer (stop accepting responses)
export const closeOffer = mutation({
  args: {
    offerId: v.id("overtimeOffers"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.patch(args.offerId, {
      status: "closed",
      updatedAt: now,
    });

    const user = await ctx.db.get(args.userId);
    await ctx.db.insert("auditLogs", {
      action: "Overtime offer closed",
      actionType: "update",
      resourceType: "overtimeOffers",
      resourceId: args.offerId,
      userId: args.userId,
      userEmail: user?.email ?? "unknown",
      details: "Overtime offer closed for responses",
      timestamp: now,
    });

    return { success: true };
  },
});

// Cancel an overtime offer
export const cancelOffer = mutation({
  args: {
    offerId: v.id("overtimeOffers"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.patch(args.offerId, {
      status: "cancelled",
      updatedAt: now,
    });

    // TODO: Send push notification to employees who accepted

    const user = await ctx.db.get(args.userId);
    await ctx.db.insert("auditLogs", {
      action: "Overtime offer cancelled",
      actionType: "update",
      resourceType: "overtimeOffers",
      resourceId: args.offerId,
      userId: args.userId,
      userEmail: user?.email ?? "unknown",
      details: "Overtime offer was cancelled",
      timestamp: now,
    });

    return { success: true };
  },
});

// Reopen an overtime offer
export const reopenOffer = mutation({
  args: {
    offerId: v.id("overtimeOffers"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.patch(args.offerId, {
      status: "open",
      updatedAt: now,
    });

    return { success: true };
  },
});

// Delete an overtime offer
export const deleteOffer = mutation({
  args: {
    offerId: v.id("overtimeOffers"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Delete all responses first
    const responses = await ctx.db
      .query("overtimeResponses")
      .withIndex("by_offer", (q) => q.eq("offerId", args.offerId))
      .collect();

    for (const response of responses) {
      await ctx.db.delete(response._id);
    }

    // Delete the offer
    await ctx.db.delete(args.offerId);

    const user = await ctx.db.get(args.userId);
    await ctx.db.insert("auditLogs", {
      action: "Overtime offer deleted",
      actionType: "delete",
      resourceType: "overtimeOffers",
      resourceId: args.offerId,
      userId: args.userId,
      userEmail: user?.email ?? "unknown",
      details: "Overtime offer and all responses deleted",
      timestamp: now,
    });

    return { success: true };
  },
});

// Send reminder notifications for pending responses
export const sendReminders = mutation({
  args: {
    offerId: v.id("overtimeOffers"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const pendingResponses = await ctx.db
      .query("overtimeResponses")
      .withIndex("by_offer", (q) => q.eq("offerId", args.offerId))
      .filter((q) => q.eq(q.field("response"), "pending"))
      .collect();

    // Update reminder sent time
    for (const response of pendingResponses) {
      await ctx.db.patch(response._id, {
        reminderSentAt: now,
        updatedAt: now,
      });
    }

    // TODO: Actually send push notifications here

    return { success: true, count: pendingResponses.length };
  },
});
