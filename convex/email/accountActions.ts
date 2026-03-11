/**
 * Email Account Actions
 *
 * Actions that handle password encryption before creating accounts.
 * These use Node.js crypto and call internal mutations.
 */

"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import { encrypt } from "./encryptionUtils";
import { Id } from "../_generated/dataModel";

/**
 * Create a generic IMAP/SMTP email account.
 * Encrypts passwords before storing.
 */
export const createImapAccount = action({
  args: {
    userId: v.id("users"),
    emailAddress: v.string(),
    name: v.optional(v.string()),
    imapHost: v.string(),
    imapPort: v.number(),
    imapUsername: v.string(),
    imapPassword: v.string(),
    imapTls: v.boolean(),
    smtpHost: v.string(),
    smtpPort: v.number(),
    smtpUsername: v.string(),
    smtpPassword: v.string(),
    smtpTls: v.boolean(),
  },
  handler: async (ctx, args): Promise<Id<"emailAccounts">> => {
    // Encrypt passwords server-side
    const encryptedImapPassword = encrypt(args.imapPassword);
    const encryptedSmtpPassword = encrypt(args.smtpPassword);

    // Call internal mutation with encrypted passwords
    const accountId: Id<"emailAccounts"> = await ctx.runMutation(internal.email.accounts.createImapAccountInternal, {
      userId: args.userId,
      emailAddress: args.emailAddress,
      name: args.name,
      imapHost: args.imapHost,
      imapPort: args.imapPort,
      imapUsername: args.imapUsername,
      imapPassword: encryptedImapPassword,
      imapTls: args.imapTls,
      smtpHost: args.smtpHost,
      smtpPort: args.smtpPort,
      smtpUsername: args.smtpUsername,
      smtpPassword: encryptedSmtpPassword,
      smtpTls: args.smtpTls,
    });

    return accountId;
  },
});

/**
 * Create an iCloud account (uses app-specific password).
 * Encrypts password before storing.
 */
export const createIcloudAccount = action({
  args: {
    userId: v.id("users"),
    emailAddress: v.string(),
    name: v.optional(v.string()),
    appPassword: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"emailAccounts">> => {
    // Encrypt password server-side
    const encryptedPassword = encrypt(args.appPassword);

    // Call internal mutation with encrypted password
    const accountId: Id<"emailAccounts"> = await ctx.runMutation(internal.email.accounts.createIcloudAccountInternal, {
      userId: args.userId,
      emailAddress: args.emailAddress,
      name: args.name,
      appPassword: encryptedPassword,
    });

    return accountId;
  },
});
