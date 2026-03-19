"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";
import { internal } from "./_generated/api";

// Send meeting invite email via Resend
export const sendInviteEmail = action({
  args: {
    meetingId: v.id("meetings"),
    email: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; inviteToken: string; emailSent: boolean; emailId?: string; error?: string }> => {
    const inviteData: { inviteToken: string; meetingTitle: string; hostName: string; joinCode: string } = await ctx.runMutation(
      internal.meetingInvites.createInvite,
      {
        meetingId: args.meetingId,
        email: args.email,
        name: args.name,
      }
    );

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return {
        success: true,
        inviteToken: inviteData.inviteToken,
        emailSent: false,
        error: "Email service not configured",
      };
    }

    const resend = new Resend(resendApiKey);

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://iecentral.com";
    const inviteUrl = `${baseUrl}/join/invite/${inviteData.inviteToken}`;
    const joinCodeUrl = `${baseUrl}/join/${inviteData.joinCode}`;
    const guestName = args.name || "there";

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
      <body style="margin:0;padding:0;background-color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;padding:40px 20px;">
          <tr><td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
              <tr><td align="center" style="padding-bottom:24px;">
                <span style="color:#06b6d4;font-size:20px;font-weight:700;">IECentral</span>
              </td></tr>
              <tr><td style="background-color:#1e293b;border:1px solid #334155;border-radius:16px;overflow:hidden;">
                <div style="background:linear-gradient(135deg,rgba(6,182,212,0.1),rgba(59,130,246,0.1));padding:24px 28px;border-bottom:1px solid #334155;">
                  <h1 style="margin:0 0 4px;color:#ffffff;font-size:20px;font-weight:600;">You're Invited to a Meeting</h1>
                  <p style="margin:0;color:#94a3b8;font-size:14px;">Hosted by ${inviteData.hostName}</p>
                </div>
                <div style="padding:28px;">
                  <p style="color:#cbd5e1;font-size:15px;line-height:1.6;margin:0 0 20px;">Hi ${guestName},</p>
                  <p style="color:#cbd5e1;font-size:15px;line-height:1.6;margin:0 0 24px;">
                    You've been invited to join <strong style="color:#ffffff;">${inviteData.meetingTitle}</strong>.
                    Click the button below to join the meeting.
                  </p>
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                    <tr><td align="center">
                      <a href="${inviteUrl}" style="display:inline-block;padding:14px 32px;background-color:#06b6d4;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;border-radius:10px;">Join Meeting</a>
                    </td></tr>
                  </table>
                  <div style="background-color:#0f172a;border:1px solid #334155;border-radius:10px;padding:16px;text-align:center;">
                    <p style="color:#94a3b8;font-size:13px;margin:0 0 8px;">Or join with meeting code:</p>
                    <p style="color:#06b6d4;font-size:24px;font-weight:700;letter-spacing:4px;margin:0;">${inviteData.joinCode}</p>
                    <p style="color:#64748b;font-size:12px;margin:8px 0 0;">
                      Visit <a href="${joinCodeUrl}" style="color:#06b6d4;text-decoration:none;">${baseUrl}/join/${inviteData.joinCode}</a>
                    </p>
                  </div>
                </div>
              </td></tr>
              <tr><td align="center" style="padding-top:24px;">
                <p style="color:#475569;font-size:12px;margin:0;">Import Export Tire Co. &mdash; IECentral Platform</p>
              </td></tr>
            </table>
          </td></tr>
        </table>
      </body>
      </html>
    `;

    const textContent = `You're invited to a meeting!\n\nHi ${guestName},\n\nYou've been invited to join "${inviteData.meetingTitle}" hosted by ${inviteData.hostName}.\n\nJoin here: ${inviteUrl}\n\nOr use meeting code: ${inviteData.joinCode}\nJoin URL: ${joinCodeUrl}\n\n--\nImport Export Tire Co. - IECentral Platform`;

    try {
      const result = await resend.emails.send({
        from: "Import Export Tire Co <meetings@notifications.iecentral.com>",
        to: [args.email.toLowerCase().trim()],
        subject: `Meeting Invite: ${inviteData.meetingTitle}`,
        html: emailHtml,
        text: textContent,
      });

      return {
        success: true,
        inviteToken: inviteData.inviteToken,
        emailSent: true,
        emailId: result.data?.id,
      };
    } catch (err) {
      console.error("Failed to send invite email:", err);
      return {
        success: true,
        inviteToken: inviteData.inviteToken,
        emailSent: false,
        error: "Failed to send email",
      };
    }
  },
});
