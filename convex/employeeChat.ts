import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ============ CHAT ROOMS ============

// Get all chat rooms (admin view)
export const getAllRooms = query({
  args: {
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let rooms;

    if (args.includeInactive) {
      rooms = await ctx.db.query("chatRooms").order("desc").collect();
    } else {
      rooms = await ctx.db
        .query("chatRooms")
        .withIndex("by_active", (q) => q.eq("isActive", true))
        .order("desc")
        .collect();
    }

    // Get message counts and pending moderation counts
    const enriched = await Promise.all(
      rooms.map(async (room) => {
        const messages = await ctx.db
          .query("chatMessages")
          .withIndex("by_room", (q) => q.eq("roomId", room._id))
          .collect();

        const pendingModeration = messages.filter(
          (m) => m.status === "pending" && !m.isDeleted
        ).length;

        const lastMessage = messages
          .filter((m) => m.status === "approved" && !m.isDeleted)
          .sort((a, b) => b.createdAt - a.createdAt)[0];

        return {
          ...room,
          messageCount: messages.filter((m) => !m.isDeleted).length,
          pendingModeration,
          lastMessageAt: lastMessage?.createdAt,
          lastMessagePreview: lastMessage?.content?.substring(0, 50),
        };
      })
    );

    return enriched;
  },
});

// Get rooms available to an employee
export const getMyRooms = query({
  args: {
    personnelId: v.id("personnel"),
    department: v.optional(v.string()),
    locationId: v.optional(v.id("locations")),
  },
  handler: async (ctx, args) => {
    const rooms = await ctx.db
      .query("chatRooms")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Filter rooms based on type and employee's department/location
    const accessibleRooms = rooms.filter((room) => {
      if (room.type === "general") return true;

      if (room.type === "department" && args.department) {
        return room.departmentId === args.department;
      }

      if (room.type === "location" && args.locationId) {
        return room.locationId === args.locationId;
      }

      return true; // Custom rooms - would need additional access control
    });

    // Get last message for each room
    const enriched = await Promise.all(
      accessibleRooms.map(async (room) => {
        const messages = await ctx.db
          .query("chatMessages")
          .withIndex("by_room", (q) => q.eq("roomId", room._id))
          .filter((q) =>
            q.and(
              q.eq(q.field("status"), "approved"),
              q.eq(q.field("isDeleted"), false)
            )
          )
          .order("desc")
          .take(1);

        const lastMessage = messages[0];

        return {
          ...room,
          lastMessageAt: lastMessage?.createdAt,
          lastMessagePreview: lastMessage?.content?.substring(0, 50),
          lastMessageBy: lastMessage?.personnelName,
        };
      })
    );

    // Sort by last message
    enriched.sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));

    return enriched;
  },
});

// Create a chat room (admin action)
export const createRoom = mutation({
  args: {
    name: v.string(),
    type: v.string(),
    departmentId: v.optional(v.string()),
    locationId: v.optional(v.id("locations")),
    isModerated: v.boolean(),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const roomId = await ctx.db.insert("chatRooms", {
      name: args.name,
      type: args.type,
      departmentId: args.departmentId,
      locationId: args.locationId,
      isModerated: args.isModerated,
      isActive: true,
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
    });

    return roomId;
  },
});

// Update a chat room
export const updateRoom = mutation({
  args: {
    roomId: v.id("chatRooms"),
    name: v.optional(v.string()),
    isModerated: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { roomId, ...updates } = args;

    await ctx.db.patch(roomId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Delete a chat room
export const deleteRoom = mutation({
  args: {
    roomId: v.id("chatRooms"),
  },
  handler: async (ctx, args) => {
    // Delete all messages in the room
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    // Delete the room
    await ctx.db.delete(args.roomId);

    return { success: true };
  },
});

// ============ CHAT MESSAGES ============

// Get messages for a room
export const getMessages = query({
  args: {
    roomId: v.id("chatRooms"),
    limit: v.optional(v.number()),
    includeDeleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100;

    let messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_room_created", (q) => q.eq("roomId", args.roomId))
      .order("desc")
      .take(limit);

    // Filter based on status and deleted
    if (!args.includeDeleted) {
      messages = messages.filter((m) => !m.isDeleted);
    }

    // Only show approved messages (unless admin)
    messages = messages.filter(
      (m) => m.status === "approved" || m.status === "pending"
    );

    // Reverse to get chronological order
    return messages.reverse();
  },
});

// Get pending messages for moderation (admin view)
export const getPendingMessages = query({
  args: {},
  handler: async (ctx) => {
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("desc")
      .collect();

    // Enrich with room info
    const enriched = await Promise.all(
      messages.map(async (message) => {
        const room = await ctx.db.get(message.roomId);
        return {
          ...message,
          roomName: room?.name || "Unknown Room",
        };
      })
    );

    return enriched;
  },
});

// Send a message (employee action)
export const sendMessage = mutation({
  args: {
    roomId: v.id("chatRooms"),
    personnelId: v.id("personnel"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");
    if (!room.isActive) throw new Error("Room is inactive");

    const personnel = await ctx.db.get(args.personnelId);
    if (!personnel) throw new Error("Personnel not found");

    const now = Date.now();

    // If room is moderated, set status to pending; otherwise, auto-approve
    const status = room.isModerated ? "pending" : "approved";

    const messageId = await ctx.db.insert("chatMessages", {
      roomId: args.roomId,
      personnelId: args.personnelId,
      personnelName: `${personnel.firstName} ${personnel.lastName}`,
      content: args.content,
      status,
      isDeleted: false,
      createdAt: now,
    });

    return { messageId, status };
  },
});

// Approve a message (admin/moderator action)
export const approveMessage = mutation({
  args: {
    messageId: v.id("chatMessages"),
    moderatedBy: v.id("users"),
    moderationNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    await ctx.db.patch(args.messageId, {
      status: "approved",
      moderatedBy: args.moderatedBy,
      moderatedAt: Date.now(),
      moderationNotes: args.moderationNotes,
    });

    return { success: true };
  },
});

// Reject a message (admin/moderator action)
export const rejectMessage = mutation({
  args: {
    messageId: v.id("chatMessages"),
    moderatedBy: v.id("users"),
    moderationNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    await ctx.db.patch(args.messageId, {
      status: "rejected",
      moderatedBy: args.moderatedBy,
      moderatedAt: Date.now(),
      moderationNotes: args.moderationNotes,
    });

    return { success: true };
  },
});

// Delete a message (admin action or own message)
export const deleteMessage = mutation({
  args: {
    messageId: v.id("chatMessages"),
    deletedBy: v.id("users"),
    personnelId: v.optional(v.id("personnel")), // If employee deleting own message
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    // If personnelId provided, verify ownership
    if (args.personnelId && message.personnelId !== args.personnelId) {
      throw new Error("Not authorized to delete this message");
    }

    await ctx.db.patch(args.messageId, {
      isDeleted: true,
      deletedBy: args.deletedBy,
      deletedAt: Date.now(),
    });

    return { success: true };
  },
});

// Bulk approve messages
export const bulkApprove = mutation({
  args: {
    messageIds: v.array(v.id("chatMessages")),
    moderatedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    for (const messageId of args.messageIds) {
      await ctx.db.patch(messageId, {
        status: "approved",
        moderatedBy: args.moderatedBy,
        moderatedAt: now,
      });
    }

    return { success: true, count: args.messageIds.length };
  },
});

// Get chat stats
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const rooms = await ctx.db
      .query("chatRooms")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    const pendingMessages = await ctx.db
      .query("chatMessages")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    // Messages today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();

    const allMessages = await ctx.db.query("chatMessages").collect();
    const messagesToday = allMessages.filter(
      (m) => m.createdAt >= todayTimestamp && !m.isDeleted
    ).length;

    return {
      activeRooms: rooms.length,
      pendingModeration: pendingMessages.length,
      messagesToday,
    };
  },
});
