/**
 * Email Integration Module
 *
 * Bridges external email with internal messaging system.
 * - Convert emails to internal conversation threads
 * - Forward internal messages as emails
 */

import { v } from "convex/values";
import { mutation, query, action, internalQuery } from "../_generated/server";
import { api, internal } from "../_generated/api";
import { Id, Doc } from "../_generated/dataModel";

// Type definitions
interface LinkedEmailInfo {
  _id: Id<"emails">;
  subject: string;
  from: { name?: string; address: string };
  receivedAt: number;
  snippet: string;
}

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ============ QUERIES ============

/**
 * Get the linked conversation for an email.
 */
export const getLinkedConversation = query({
  args: {
    emailId: v.id("emails"),
  },
  handler: async (ctx, args) => {
    const email = await ctx.db.get(args.emailId);
    if (!email || !email.linkedConversationId) {
      return null;
    }

    const conversation = await ctx.db.get(email.linkedConversationId);
    if (!conversation) {
      return null;
    }

    // Get participant info
    const participants = await Promise.all(
      conversation.participants.map((id) => ctx.db.get(id))
    );

    return {
      ...conversation,
      participants: participants.filter(Boolean),
    };
  },
});

/**
 * Get emails linked to a conversation.
 */
export const getLinkedEmails = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args): Promise<LinkedEmailInfo[]> => {
    const emails = await ctx.db
      .query("emails")
      .filter((q) => q.eq(q.field("linkedConversationId"), args.conversationId))
      .order("desc")
      .collect();

    return emails.map((email) => ({
      _id: email._id,
      subject: email.subject,
      from: email.from,
      receivedAt: email.receivedAt,
      snippet: email.snippet,
    }));
  },
});

/**
 * Internal query to get linked emails (for use in actions).
 */
export const getLinkedEmailsInternal = internalQuery({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args): Promise<LinkedEmailInfo[]> => {
    const emails = await ctx.db
      .query("emails")
      .filter((q) => q.eq(q.field("linkedConversationId"), args.conversationId))
      .order("desc")
      .collect();

    return emails.map((email) => ({
      _id: email._id,
      subject: email.subject,
      from: email.from,
      receivedAt: email.receivedAt,
      snippet: email.snippet,
    }));
  },
});

/**
 * Find internal users by email address.
 */
export const findUsersByEmail = query({
  args: {
    emailAddresses: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const users = await ctx.db.query("users").collect();

    const matchedUsers: Array<{
      email: string;
      userId: Id<"users">;
      name: string;
    }> = [];

    for (const email of args.emailAddresses) {
      const normalizedEmail = email.toLowerCase();
      const user = users.find(
        (u) => u.email?.toLowerCase() === normalizedEmail
      );
      if (user) {
        matchedUsers.push({
          email: normalizedEmail,
          userId: user._id,
          name: user.name,
        });
      }
    }

    return matchedUsers;
  },
});

// ============ MUTATIONS ============

/**
 * Convert an email to an internal conversation thread.
 * Creates a new conversation (or uses existing) and adds the email content as the first message.
 */
export const convertEmailToThread = mutation({
  args: {
    emailId: v.id("emails"),
    userId: v.id("users"), // User initiating the conversion
    participantIds: v.array(v.id("users")), // Selected internal participants
    conversationName: v.optional(v.string()), // For group conversations
  },
  handler: async (ctx, args) => {
    // Get the email
    const email = await ctx.db.get(args.emailId);
    if (!email) {
      throw new Error("Email not found");
    }

    // Check if already linked
    if (email.linkedConversationId) {
      return { conversationId: email.linkedConversationId, isNew: false };
    }

    // Determine conversation type
    const allParticipants = [...new Set([args.userId, ...args.participantIds])];
    const type = allParticipants.length === 2 ? "direct" : "group";

    // Check for existing direct conversation
    let conversationId: Id<"conversations"> | null = null;

    if (type === "direct") {
      const existingConversations = await ctx.db
        .query("conversations")
        .collect();

      const existing = existingConversations.find(
        (conv) =>
          conv.type === "direct" &&
          conv.participants.length === 2 &&
          conv.participants.includes(allParticipants[0]) &&
          conv.participants.includes(allParticipants[1])
      );

      if (existing) {
        conversationId = existing._id;
      }
    }

    // Create new conversation if needed
    const isNew = !conversationId;
    if (!conversationId) {
      conversationId = await ctx.db.insert("conversations", {
        type,
        participants: allParticipants,
        name: type === "group" ? (args.conversationName || `Email: ${email.subject}`) : undefined,
        createdBy: type === "group" ? args.userId : undefined,
        lastMessageAt: Date.now(),
        createdAt: Date.now(),
      });
    }

    // Format email content as message
    const fromName = email.from.name || email.from.address;
    const toNames = email.to?.map((t) => t.name || t.address).join(", ") || "";

    const messageContent = `📧 **Converted from Email**

**From:** ${fromName}
**To:** ${toNames}
**Subject:** ${email.subject}
**Date:** ${new Date(email.receivedAt).toLocaleString()}

---

${email.bodyText || email.bodyHtml?.replace(/<[^>]+>/g, "") || "(No content)"}`;

    // Create the message
    await ctx.db.insert("messages", {
      conversationId,
      senderId: args.userId,
      content: messageContent,
      mentions: [],
      readBy: [args.userId],
      createdAt: Date.now(),
    });

    // Update conversation's lastMessageAt
    await ctx.db.patch(conversationId, {
      lastMessageAt: Date.now(),
    });

    // Link the email to the conversation
    await ctx.db.patch(args.emailId, {
      linkedConversationId: conversationId,
      updatedAt: Date.now(),
    });

    return { conversationId, isNew };
  },
});

/**
 * Unlink an email from a conversation.
 */
export const unlinkEmail = mutation({
  args: {
    emailId: v.id("emails"),
  },
  handler: async (ctx, args) => {
    const email = await ctx.db.get(args.emailId);
    if (!email) return;

    await ctx.db.patch(args.emailId, {
      linkedConversationId: undefined,
      updatedAt: Date.now(),
    });
  },
});

// ============ ACTIONS ============

/**
 * Forward internal messages as an email.
 * Formats message thread as HTML and sends via selected email account.
 */
export const forwardMessagesAsEmail = action({
  args: {
    conversationId: v.id("conversations"),
    accountId: v.id("emailAccounts"),
    to: v.array(v.object({
      name: v.optional(v.string()),
      address: v.string(),
    })),
    cc: v.optional(v.array(v.object({
      name: v.optional(v.string()),
      address: v.string(),
    }))),
    subject: v.string(),
    additionalMessage: v.optional(v.string()), // User's note before the thread
    messageIds: v.optional(v.array(v.id("messages"))), // Specific messages to include (all if not specified)
  },
  handler: async (ctx, args): Promise<SendResult> => {
    // Get conversation details
    const conversation = await ctx.runQuery(api.messages.getMessages, {
      conversationId: args.conversationId,
    });

    if (!conversation || conversation.length === 0) {
      throw new Error("No messages found in conversation");
    }

    // Filter to specific messages if provided
    let messages = conversation;
    if (args.messageIds && args.messageIds.length > 0) {
      messages = conversation.filter((m: { _id: Id<"messages"> }) =>
        args.messageIds!.includes(m._id)
      );
    }

    // Format messages as HTML
    const messagesHtml = messages.map((msg: {
      sender?: { name?: string } | null;
      createdAt: number;
      content: string;
    }) => {
      const senderName = msg.sender?.name || "Unknown";
      const timestamp = new Date(msg.createdAt).toLocaleString();

      return `
        <div style="margin-bottom: 16px; padding: 12px; background-color: #f5f5f5; border-radius: 8px;">
          <div style="font-weight: bold; color: #333;">${senderName}</div>
          <div style="font-size: 12px; color: #666; margin-bottom: 8px;">${timestamp}</div>
          <div style="color: #333; white-space: pre-wrap;">${escapeHtml(msg.content)}</div>
        </div>
      `;
    }).join("");

    // Build email body
    let bodyHtml = "";

    if (args.additionalMessage) {
      bodyHtml += `<div style="margin-bottom: 24px;">${escapeHtml(args.additionalMessage).replace(/\n/g, "<br>")}</div>`;
    }

    bodyHtml += `
      <div style="border-top: 1px solid #ddd; padding-top: 16px; margin-top: 16px;">
        <div style="font-size: 12px; color: #666; margin-bottom: 12px;">--- Forwarded from internal messages ---</div>
        ${messagesHtml}
      </div>
    `;

    // Send the email
    const result: SendResult = await ctx.runAction(api.email.send.sendEmail, {
      accountId: args.accountId,
      to: args.to,
      cc: args.cc,
      subject: args.subject,
      bodyHtml,
    });

    return result;
  },
});

// Helper function to escape HTML
function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return text.replace(/[&<>"']/g, (char) => htmlEntities[char]);
}

/**
 * Reply to an email thread from internal messaging.
 * When a conversation is linked to an email, this allows replying via email.
 */
export const replyViaEmail = action({
  args: {
    conversationId: v.id("conversations"),
    accountId: v.id("emailAccounts"),
    content: v.string(),
  },
  handler: async (ctx, args): Promise<SendResult> => {
    // Find linked emails using internal query
    const linkedEmails: LinkedEmailInfo[] = await ctx.runQuery(
      internal.email.integration.getLinkedEmailsInternal,
      { conversationId: args.conversationId }
    );

    if (linkedEmails.length === 0) {
      throw new Error("No linked email found for this conversation");
    }

    // Get the most recent linked email to reply to
    const originalEmail = linkedEmails[0];

    // Get full email details
    const fullEmail: Doc<"emails"> | null = await ctx.runQuery(api.email.emails.get, {
      emailId: originalEmail._id,
    });

    if (!fullEmail) {
      throw new Error("Original email not found");
    }

    // Build reply
    const replySubject = fullEmail.subject.startsWith("Re:")
      ? fullEmail.subject
      : `Re: ${fullEmail.subject}`;

    const replyTo: Array<{ name?: string; address: string }> = [fullEmail.from];

    const bodyHtml = `
      <div>${escapeHtml(args.content).replace(/\n/g, "<br>")}</div>
      <br><br>
      <div style="border-left: 2px solid #ccc; padding-left: 12px; color: #666;">
        <div style="margin-bottom: 8px;">
          On ${new Date(fullEmail.receivedAt).toLocaleString()}, ${fullEmail.from.name || fullEmail.from.address} wrote:
        </div>
        <div>${fullEmail.bodyHtml || escapeHtml(fullEmail.bodyText || "").replace(/\n/g, "<br>")}</div>
      </div>
    `;

    // Send the reply
    const result: SendResult = await ctx.runAction(api.email.send.sendEmail, {
      accountId: args.accountId,
      to: replyTo,
      subject: replySubject,
      bodyHtml,
      replyToEmailId: originalEmail._id,
    });

    return result;
  },
});
