import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ============ QUERIES ============

// Get all events for a date range
export const listByDateRange = query({
  args: {
    startDate: v.number(), // Unix timestamp
    endDate: v.number(), // Unix timestamp
  },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_start")
      .filter((q) =>
        q.and(
          q.gte(q.field("startTime"), args.startDate),
          q.lte(q.field("startTime"), args.endDate),
          q.neq(q.field("isCancelled"), true)
        )
      )
      .collect();

    // Enrich with invite counts
    const enrichedEvents = await Promise.all(
      events.map(async (event) => {
        const invites = await ctx.db
          .query("eventInvites")
          .withIndex("by_event", (q) => q.eq("eventId", event._id))
          .collect();

        const acceptedCount = invites.filter((i) => i.status === "accepted").length;
        const pendingCount = invites.filter((i) => i.status === "pending").length;
        const declinedCount = invites.filter((i) => i.status === "declined").length;

        return {
          ...event,
          inviteStats: {
            total: invites.length,
            accepted: acceptedCount,
            pending: pendingCount,
            declined: declinedCount,
          },
        };
      })
    );

    return enrichedEvents;
  },
});

// Get events for current user (where they are invited or created)
export const listMyEvents = query({
  args: {
    userId: v.id("users"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get events user created
    const createdEvents = await ctx.db
      .query("events")
      .withIndex("by_created_by", (q) => q.eq("createdBy", args.userId))
      .filter((q) => q.neq(q.field("isCancelled"), true))
      .collect();

    // Get events user is invited to
    const invites = await ctx.db
      .query("eventInvites")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const invitedEventIds = new Set(invites.map((i) => i.eventId));
    const invitedEvents = await Promise.all(
      [...invitedEventIds].map((id) => ctx.db.get(id))
    );

    // Combine and deduplicate
    const allEventIds = new Set<string>();
    const allEvents = [];

    for (const event of [...createdEvents, ...invitedEvents.filter(Boolean)]) {
      if (event && !allEventIds.has(event._id) && !event.isCancelled) {
        allEventIds.add(event._id);
        allEvents.push(event);
      }
    }

    // Filter by date range if provided
    let filtered = allEvents;
    if (args.startDate) {
      filtered = filtered.filter((e) => e.startTime >= args.startDate!);
    }
    if (args.endDate) {
      filtered = filtered.filter((e) => e.startTime <= args.endDate!);
    }

    // Enrich with user's invite status
    const enriched = await Promise.all(
      filtered.map(async (event) => {
        const invite = invites.find((i) => i.eventId === event._id);
        const allInvites = await ctx.db
          .query("eventInvites")
          .withIndex("by_event", (q) => q.eq("eventId", event._id))
          .collect();

        // Get invitee details
        const inviteeDetails = await Promise.all(
          allInvites.map(async (inv) => {
            const user = await ctx.db.get(inv.userId);
            return {
              ...inv,
              userName: user?.name || "Unknown",
              userEmail: user?.email || "",
            };
          })
        );

        return {
          ...event,
          myInviteStatus: invite?.status || (event.createdBy === args.userId ? "organizer" : null),
          invitees: inviteeDetails,
        };
      })
    );

    // Sort by start time
    return enriched.sort((a, b) => a.startTime - b.startTime);
  },
});

// Get single event by ID
export const getById = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) return null;

    // Get all invites with user details
    const invites = await ctx.db
      .query("eventInvites")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const inviteeDetails = await Promise.all(
      invites.map(async (inv) => {
        const user = await ctx.db.get(inv.userId);
        return {
          ...inv,
          userName: user?.name || "Unknown",
          userEmail: user?.email || "",
        };
      })
    );

    return {
      ...event,
      invitees: inviteeDetails,
    };
  },
});

// Get pending event invites for a user (for notification badge)
export const getPendingInvites = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const invites = await ctx.db
      .query("eventInvites")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", args.userId).eq("status", "pending")
      )
      .collect();

    // Get event details for each invite
    const enriched = await Promise.all(
      invites.map(async (inv) => {
        const event = await ctx.db.get(inv.eventId);
        return {
          ...inv,
          event,
        };
      })
    );

    // Filter out cancelled events
    return enriched.filter((inv) => inv.event && !inv.event.isCancelled);
  },
});

// Get count of unread event invites (for badge)
export const getUnreadInviteCount = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const invites = await ctx.db
      .query("eventInvites")
      .withIndex("by_user_unread", (q) =>
        q.eq("userId", args.userId).eq("isRead", false)
      )
      .collect();

    // Filter for pending status only
    return invites.filter((i) => i.status === "pending").length;
  },
});

// ============ MUTATIONS ============

// Create a new event
export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    startTime: v.number(),
    endTime: v.number(),
    isAllDay: v.boolean(),
    location: v.optional(v.string()),
    meetingLink: v.optional(v.string()),
    meetingType: v.optional(v.string()),
    inviteeIds: v.array(v.id("users")),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const now = Date.now();

    // Create the event
    const eventId = await ctx.db.insert("events", {
      title: args.title,
      description: args.description,
      startTime: args.startTime,
      endTime: args.endTime,
      isAllDay: args.isAllDay,
      location: args.location,
      meetingLink: args.meetingLink,
      meetingType: args.meetingType,
      createdBy: args.userId,
      createdByName: user.name,
      createdAt: now,
      updatedAt: now,
    });

    // Create invites for all invitees
    for (const inviteeId of args.inviteeIds) {
      await ctx.db.insert("eventInvites", {
        eventId,
        userId: inviteeId,
        status: "pending",
        isRead: false,
        notifiedAt: now,
        createdAt: now,
      });
    }

    return eventId;
  },
});

// Update an event
export const update = mutation({
  args: {
    eventId: v.id("events"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
    isAllDay: v.optional(v.boolean()),
    location: v.optional(v.string()),
    meetingLink: v.optional(v.string()),
    meetingType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { eventId, ...updates } = args;
    const event = await ctx.db.get(eventId);
    if (!event) throw new Error("Event not found");

    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );

    await ctx.db.patch(eventId, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });

    return eventId;
  },
});

// Cancel an event
export const cancel = mutation({
  args: {
    eventId: v.id("events"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");

    await ctx.db.patch(args.eventId, {
      isCancelled: true,
      cancelledAt: Date.now(),
      cancelledBy: args.userId,
      updatedAt: Date.now(),
    });

    return args.eventId;
  },
});

// Add invitees to an existing event
export const addInvitees = mutation({
  args: {
    eventId: v.id("events"),
    inviteeIds: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");

    const now = Date.now();

    // Get existing invites
    const existingInvites = await ctx.db
      .query("eventInvites")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const existingUserIds = new Set(existingInvites.map((i) => i.userId));

    // Add new invites
    for (const inviteeId of args.inviteeIds) {
      if (!existingUserIds.has(inviteeId)) {
        await ctx.db.insert("eventInvites", {
          eventId: args.eventId,
          userId: inviteeId,
          status: "pending",
          isRead: false,
          notifiedAt: now,
          createdAt: now,
        });
      }
    }

    return args.eventId;
  },
});

// Remove an invitee from an event
export const removeInvitee = mutation({
  args: {
    eventId: v.id("events"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const invite = await ctx.db
      .query("eventInvites")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (invite) {
      await ctx.db.delete(invite._id);
    }

    return args.eventId;
  },
});

// Respond to an event invite
export const respondToInvite = mutation({
  args: {
    eventId: v.id("events"),
    userId: v.id("users"),
    status: v.string(), // "accepted" | "declined" | "maybe"
  },
  handler: async (ctx, args) => {
    const invite = await ctx.db
      .query("eventInvites")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (!invite) throw new Error("Invite not found");

    await ctx.db.patch(invite._id, {
      status: args.status,
      respondedAt: Date.now(),
      isRead: true,
    });

    return invite._id;
  },
});

// Mark invite as read
export const markInviteRead = mutation({
  args: {
    eventId: v.id("events"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const invite = await ctx.db
      .query("eventInvites")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (invite && !invite.isRead) {
      await ctx.db.patch(invite._id, { isRead: true });
    }

    return true;
  },
});

// Mark all invites as read for a user
export const markAllInvitesRead = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const invites = await ctx.db
      .query("eventInvites")
      .withIndex("by_user_unread", (q) =>
        q.eq("userId", args.userId).eq("isRead", false)
      )
      .collect();

    for (const invite of invites) {
      await ctx.db.patch(invite._id, { isRead: true });
    }

    return invites.length;
  },
});
