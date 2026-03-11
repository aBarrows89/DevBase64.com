/**
 * OAuth Token Refresh
 *
 * Handles refreshing expired OAuth tokens for email accounts.
 */

"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { encrypt, decrypt } from "./encryptionUtils";

// Token URLs for each provider
const TOKEN_URLS: Record<string, string> = {
  google: "https://oauth2.googleapis.com/token",
  microsoft: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
  yahoo: "https://api.login.yahoo.com/oauth2/get_token",
};

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  token_type: string;
}

/**
 * Refresh an OAuth token for an email account.
 */
export const refreshToken = internalAction({
  args: {
    accountId: v.id("emailAccounts"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    // Get account details
    const account = await ctx.runQuery(internal.email.syncMutations.getAccountForSync, {
      accountId: args.accountId,
    });

    if (!account) {
      return { success: false, error: "Account not found" };
    }

    if (!account.oauthProvider || !account.refreshToken) {
      return { success: false, error: "Account is not OAuth or missing refresh token" };
    }

    const tokenUrl = TOKEN_URLS[account.oauthProvider];
    if (!tokenUrl) {
      return { success: false, error: `Unknown OAuth provider: ${account.oauthProvider}` };
    }

    try {
      // Decrypt refresh token
      const refreshToken = decrypt(account.refreshToken);

      // Get client credentials from environment
      let clientId: string;
      let clientSecret: string;

      switch (account.oauthProvider) {
        case "google":
          clientId = process.env.GOOGLE_CLIENT_ID || "";
          clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
          break;
        case "microsoft":
          clientId = process.env.MICROSOFT_CLIENT_ID || "";
          clientSecret = process.env.MICROSOFT_CLIENT_SECRET || "";
          break;
        case "yahoo":
          clientId = process.env.YAHOO_CLIENT_ID || "";
          clientSecret = process.env.YAHOO_CLIENT_SECRET || "";
          break;
        default:
          return { success: false, error: "Unknown OAuth provider" };
      }

      if (!clientId || !clientSecret) {
        return { success: false, error: "OAuth credentials not configured" };
      }

      // Build request based on provider
      let response: Response;

      if (account.oauthProvider === "yahoo") {
        // Yahoo uses Basic Auth
        const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
        response = await fetch(tokenUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${basicAuth}`,
          },
          body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: refreshToken,
          }),
        });
      } else {
        // Google and Microsoft use POST body
        response = await fetch(tokenUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: "refresh_token",
            refresh_token: refreshToken,
          }),
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Token refresh failed:", errorText);
        return { success: false, error: `Token refresh failed: ${response.status}` };
      }

      const tokens: TokenResponse = await response.json();

      if (!tokens.access_token) {
        return { success: false, error: "No access token in response" };
      }

      // Encrypt new tokens
      const encryptedAccessToken = encrypt(tokens.access_token);
      const encryptedRefreshToken = tokens.refresh_token
        ? encrypt(tokens.refresh_token)
        : undefined;

      // Calculate new expiration
      const tokenExpiresAt = Date.now() + (tokens.expires_in || 3600) * 1000;

      // Update account with new tokens
      await ctx.runMutation(internal.email.accounts.updateTokens, {
        accountId: args.accountId,
        accessToken: encryptedAccessToken,
        tokenExpiresAt,
        refreshToken: encryptedRefreshToken,
      });

      return { success: true };
    } catch (error) {
      console.error("Token refresh error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

/**
 * Check if account token needs refresh and refresh if necessary.
 * Returns true if token is valid (either didn't need refresh or was refreshed successfully).
 */
export const ensureValidToken = internalAction({
  args: {
    accountId: v.id("emailAccounts"),
  },
  handler: async (ctx, args): Promise<{ valid: boolean; error?: string }> => {
    const account = await ctx.runQuery(internal.email.syncMutations.getAccountForSync, {
      accountId: args.accountId,
    });

    if (!account) {
      return { valid: false, error: "Account not found" };
    }

    // Non-OAuth accounts don't need token refresh
    if (!account.oauthProvider) {
      return { valid: true };
    }

    // Check if token expires within next 5 minutes
    const fiveMinutesFromNow = Date.now() + 5 * 60 * 1000;
    const tokenExpiry = account.tokenExpiresAt || 0;

    if (tokenExpiry > fiveMinutesFromNow) {
      // Token is still valid
      return { valid: true };
    }

    // Token needs refresh
    const result = await ctx.runAction(internal.email.tokenRefresh.refreshToken, {
      accountId: args.accountId,
    });

    if (result.success) {
      return { valid: true };
    }

    return { valid: false, error: result.error };
  },
});
