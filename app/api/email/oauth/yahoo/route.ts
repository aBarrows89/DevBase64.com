/**
 * Yahoo OAuth Initiation Route
 *
 * Redirects user to Yahoo's OAuth consent screen for email access.
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { cookies } from "next/headers";

// Yahoo OAuth configuration
const YAHOO_CLIENT_ID = process.env.YAHOO_CLIENT_ID!;
const YAHOO_AUTH_URL = "https://api.login.yahoo.com/oauth2/request_auth";

// Yahoo OAuth scopes
const SCOPES = [
  "openid",
  "email",
  "profile",
  "mail-r",
  "mail-w",
].join(" ");

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    if (!YAHOO_CLIENT_ID) {
      return NextResponse.json(
        { error: "Yahoo OAuth not configured" },
        { status: 500 }
      );
    }

    // Generate state token for CSRF protection
    const state = crypto.randomBytes(32).toString("hex");

    // Store state in cookie (expires in 10 minutes)
    const cookieStore = await cookies();
    cookieStore.set("oauth_state_yahoo", `${state}:${userId}`, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });

    // Build OAuth URL
    const params = new URLSearchParams({
      client_id: YAHOO_CLIENT_ID,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/email/oauth/yahoo/callback`,
      response_type: "code",
      scope: SCOPES,
      state: state,
    });

    const authUrl = `${YAHOO_AUTH_URL}?${params.toString()}`;

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Yahoo OAuth initiation error:", error);
    return NextResponse.json(
      { error: "Failed to initiate OAuth" },
      { status: 500 }
    );
  }
}
