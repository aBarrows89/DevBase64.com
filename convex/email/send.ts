/**
 * Email Send Actions
 *
 * SMTP sending functionality using nodemailer.
 */

"use node";

import { action, internalAction } from "../_generated/server";
import { internal, api } from "../_generated/api";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { decrypt } from "./encryptionUtils";

// ============ TYPES ============

interface SmtpCredentials {
  host: string;
  port: number;
  user: string;
  pass: string;
  secure: boolean;
}

interface EmailAddress {
  name?: string;
  address: string;
}

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ============ HELPER FUNCTIONS ============

/**
 * Get SMTP credentials from the account.
 */
function getSmtpCredentials(account: {
  provider: string;
  emailAddress: string;
  accessToken?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUsername?: string;
  smtpPassword?: string;
  smtpTls?: boolean;
  oauthProvider?: string;
}): SmtpCredentials {
  // For OAuth providers (Gmail, Outlook, Yahoo)
  if (account.oauthProvider && account.accessToken) {
    const configs: Record<string, { host: string; port: number }> = {
      google: { host: "smtp.gmail.com", port: 465 },
      microsoft: { host: "smtp.office365.com", port: 587 },
      yahoo: { host: "smtp.mail.yahoo.com", port: 465 },
    };

    const config = configs[account.oauthProvider] || configs.google;

    return {
      host: config.host,
      port: config.port,
      user: account.emailAddress,
      pass: decrypt(account.accessToken), // Decrypt OAuth access token
      secure: config.port === 465,
    };
  }

  // For generic SMTP - decrypt the password
  const decryptedPassword = account.smtpPassword ? decrypt(account.smtpPassword) : "";

  return {
    host: account.smtpHost || "smtp.gmail.com",
    port: account.smtpPort || 587,
    user: account.smtpUsername || account.emailAddress,
    pass: decryptedPassword,
    secure: account.smtpTls !== false && (account.smtpPort === 465),
  };
}

/**
 * Create nodemailer transporter.
 */
function createTransporter(credentials: SmtpCredentials, oauthProvider?: string): Transporter {
  if (oauthProvider) {
    // OAuth2 authentication
    return nodemailer.createTransport({
      host: credentials.host,
      port: credentials.port,
      secure: credentials.secure,
      auth: {
        type: "OAuth2",
        user: credentials.user,
        accessToken: credentials.pass,
      },
    });
  }

  // Standard authentication
  return nodemailer.createTransport({
    host: credentials.host,
    port: credentials.port,
    secure: credentials.secure,
    auth: {
      user: credentials.user,
      pass: credentials.pass,
    },
  });
}

/**
 * Format email address for nodemailer.
 */
function formatAddress(addr: EmailAddress): string {
  if (addr.name) {
    return `"${addr.name}" <${addr.address}>`;
  }
  return addr.address;
}

/**
 * Format array of addresses.
 */
function formatAddresses(addrs: EmailAddress[]): string {
  return addrs.map(formatAddress).join(", ");
}

// ============ SEND ACTIONS ============

/**
 * Send an email immediately.
 */
export const sendEmail = action({
  args: {
    accountId: v.id("emailAccounts"),
    to: v.array(v.object({
      name: v.optional(v.string()),
      address: v.string(),
    })),
    cc: v.optional(v.array(v.object({
      name: v.optional(v.string()),
      address: v.string(),
    }))),
    bcc: v.optional(v.array(v.object({
      name: v.optional(v.string()),
      address: v.string(),
    }))),
    subject: v.string(),
    bodyHtml: v.string(),
    bodyText: v.optional(v.string()),
    replyToEmailId: v.optional(v.id("emails")),
    attachmentStorageIds: v.optional(v.array(v.id("_storage"))),
    draftId: v.optional(v.id("emailDrafts")),
  },
  handler: async (ctx, args): Promise<SendResult> => {
    // Get account with credentials
    const account = await ctx.runQuery(
      api.email.accounts.getWithCredentials,
      { accountId: args.accountId }
    );

    if (!account || !account.isActive) {
      return { success: false, error: "Account not found or inactive" };
    }

    try {
      const credentials = getSmtpCredentials(account);
      const transporter = createTransporter(credentials, account.oauthProvider);

      // Build email options
      const mailOptions: nodemailer.SendMailOptions = {
        from: account.name
          ? `"${account.name}" <${account.emailAddress}>`
          : account.emailAddress,
        to: formatAddresses(args.to),
        subject: args.subject,
        html: args.bodyHtml,
        text: args.bodyText || args.bodyHtml.replace(/<[^>]+>/g, ""),
      };

      if (args.cc && args.cc.length > 0) {
        mailOptions.cc = formatAddresses(args.cc);
      }

      if (args.bcc && args.bcc.length > 0) {
        mailOptions.bcc = formatAddresses(args.bcc);
      }

      // Handle reply headers
      if (args.replyToEmailId) {
        const originalEmail = await ctx.runQuery(
          api.email.emails.get,
          { emailId: args.replyToEmailId }
        );

        if (originalEmail) {
          mailOptions.inReplyTo = originalEmail.messageId;
          mailOptions.references = originalEmail.references
            ? [...originalEmail.references, originalEmail.messageId].join(" ")
            : originalEmail.messageId;
        }
      }

      // Handle attachments
      if (args.attachmentStorageIds && args.attachmentStorageIds.length > 0) {
        mailOptions.attachments = [];

        for (const storageId of args.attachmentStorageIds) {
          try {
            const url = await ctx.storage.getUrl(storageId);
            if (url) {
              // Fetch the file content
              const response = await fetch(url);
              const buffer = Buffer.from(await response.arrayBuffer());

              // Get metadata from draft attachments if available
              let fileName = `attachment_${storageId}`;
              let contentType = "application/octet-stream";

              if (args.draftId) {
                const draft = await ctx.runQuery(
                  api.email.drafts.get,
                  { draftId: args.draftId }
                );
                const attachment = draft?.attachments?.find(
                  (a) => a.storageId === storageId
                );
                if (attachment) {
                  fileName = attachment.fileName;
                  contentType = attachment.mimeType;
                }
              }

              mailOptions.attachments.push({
                filename: fileName,
                content: buffer,
                contentType,
              });
            }
          } catch (err) {
            console.error(`Failed to fetch attachment ${storageId}:`, err);
          }
        }
      }

      // Add signature if configured
      if (account.signature) {
        mailOptions.html = `${args.bodyHtml}<br><br>${account.signature}`;
      }

      // Send the email
      const info = await transporter.sendMail(mailOptions);

      // Log the send
      await ctx.runMutation(internal.email.syncMutations.logSync, {
        accountId: args.accountId,
        action: "send",
        status: "success",
        emailsProcessed: 1,
      });

      // Delete the draft if provided
      if (args.draftId) {
        await ctx.runMutation(api.email.drafts.remove, {
          draftId: args.draftId,
        });
      }

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      console.error("Send email error:", error);

      // Log the failure
      await ctx.runMutation(internal.email.syncMutations.logSync, {
        accountId: args.accountId,
        action: "send",
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

/**
 * Queue an email for sending (for scheduled send or retry).
 */
export const queueEmail = action({
  args: {
    accountId: v.id("emailAccounts"),
    to: v.array(v.object({
      name: v.optional(v.string()),
      address: v.string(),
    })),
    cc: v.optional(v.array(v.object({
      name: v.optional(v.string()),
      address: v.string(),
    }))),
    bcc: v.optional(v.array(v.object({
      name: v.optional(v.string()),
      address: v.string(),
    }))),
    subject: v.string(),
    bodyHtml: v.string(),
    bodyText: v.optional(v.string()),
    scheduledFor: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{ queueId: Id<"emailSendQueue"> }> => {
    // Create queue entry
    const queueId = await ctx.runMutation(internal.email.sendMutations.insertQueueEntry, {
      accountId: args.accountId,
      to: args.to,
      cc: args.cc,
      bcc: args.bcc,
      subject: args.subject,
      bodyHtml: args.bodyHtml,
      bodyText: args.bodyText,
      scheduledFor: args.scheduledFor,
    });

    return { queueId };
  },
});

/**
 * Process scheduled emails that are due (called by cron).
 */
export const processScheduledSends = internalAction({
  args: {},
  handler: async (ctx): Promise<{ processed: number; failed: number }> => {
    // Get due scheduled emails
    const dueEmails = await ctx.runMutation(
      internal.email.sendMutations.getDueScheduledEmails,
      {}
    );

    let processed = 0;
    let failed = 0;

    for (const queueEntry of dueEmails) {
      // Mark as sending
      await ctx.runMutation(internal.email.sendMutations.updateQueueStatus, {
        queueId: queueEntry._id,
        status: "sending",
      });

      try {
        // Send the email
        const result = await sendQueuedEmail(ctx, queueEntry);

        if (result.success) {
          await ctx.runMutation(internal.email.sendMutations.updateQueueStatus, {
            queueId: queueEntry._id,
            status: "sent",
            messageId: result.messageId,
          });
          processed++;
        } else {
          await ctx.runMutation(internal.email.sendMutations.moveToRetryQueue, {
            queueId: queueEntry._id,
            error: result.error || "Unknown error",
          });
          failed++;
        }
      } catch (error) {
        await ctx.runMutation(internal.email.sendMutations.moveToRetryQueue, {
          queueId: queueEntry._id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        failed++;
      }
    }

    return { processed, failed };
  },
});

/**
 * Retry failed emails (called by cron).
 */
export const retryFailedSends = internalAction({
  args: {},
  handler: async (ctx): Promise<{ retried: number; failed: number }> => {
    // Get failed emails eligible for retry
    const failedEmails = await ctx.runMutation(
      internal.email.sendMutations.getFailedEmailsForRetry,
      { maxAttempts: 3 }
    );

    let retried = 0;
    let failed = 0;

    for (const queueEntry of failedEmails) {
      // Mark as sending
      await ctx.runMutation(internal.email.sendMutations.updateQueueStatus, {
        queueId: queueEntry._id,
        status: "sending",
      });

      try {
        // Retry sending the email
        const result = await sendQueuedEmail(ctx, queueEntry);

        if (result.success) {
          await ctx.runMutation(internal.email.sendMutations.updateQueueStatus, {
            queueId: queueEntry._id,
            status: "sent",
            messageId: result.messageId,
          });
          retried++;
        } else {
          await ctx.runMutation(internal.email.sendMutations.moveToRetryQueue, {
            queueId: queueEntry._id,
            error: result.error || "Unknown error",
          });
          failed++;
        }
      } catch (error) {
        await ctx.runMutation(internal.email.sendMutations.moveToRetryQueue, {
          queueId: queueEntry._id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        failed++;
      }
    }

    return { retried, failed };
  },
});

/**
 * Helper to send a queued email.
 */
async function sendQueuedEmail(
  ctx: { runQuery: Function; storage: { getUrl: Function }; runMutation: Function },
  queueEntry: {
    accountId: Id<"emailAccounts">;
    to: EmailAddress[];
    cc?: EmailAddress[];
    bcc?: EmailAddress[];
    subject: string;
    bodyHtml: string;
    bodyText?: string;
  }
): Promise<SendResult> {
  // Get account with credentials
  const account = await ctx.runQuery(
    api.email.accounts.getWithCredentials,
    { accountId: queueEntry.accountId }
  );

  if (!account || !account.isActive) {
    return { success: false, error: "Account not found or inactive" };
  }

  try {
    const credentials = getSmtpCredentials(account);
    const transporter = createTransporter(credentials, account.oauthProvider);

    // Build email options
    const mailOptions: nodemailer.SendMailOptions = {
      from: account.name
        ? `"${account.name}" <${account.emailAddress}>`
        : account.emailAddress,
      to: formatAddresses(queueEntry.to),
      subject: queueEntry.subject,
      html: account.signature
        ? `${queueEntry.bodyHtml}<br><br>${account.signature}`
        : queueEntry.bodyHtml,
      text: queueEntry.bodyText || queueEntry.bodyHtml.replace(/<[^>]+>/g, ""),
    };

    if (queueEntry.cc && queueEntry.cc.length > 0) {
      mailOptions.cc = formatAddresses(queueEntry.cc);
    }

    if (queueEntry.bcc && queueEntry.bcc.length > 0) {
      mailOptions.bcc = formatAddresses(queueEntry.bcc);
    }

    // Send the email
    const info = await transporter.sendMail(mailOptions);

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error("Send queued email error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

