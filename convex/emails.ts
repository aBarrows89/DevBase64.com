import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { Resend } from "resend";

// Extract email addresses from text (resume)
function extractEmailsFromText(text: string): string[] {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = text.match(emailRegex) || [];
  // Filter out common false positives and Indeed relay emails
  return matches.filter(email =>
    !email.includes("indeed.com") &&
    !email.includes("indeedemail.com") &&
    !email.includes("example.com")
  );
}

// Format date for display (e.g., "Monday, January 15, 2024")
function formatDateForEmail(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00"); // Add time to avoid timezone issues
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Format time for display (e.g., "2:30 PM")
function formatTimeForEmail(timeStr: string): string {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}

// Build location string for templates
function getLocationString(location: string | undefined, companyAddress: string): string {
  if (!location) return "";
  if (location === "Video") return "Video Call (link will be sent separately)";
  if (location === "Phone") return "Phone Interview - We will call you";
  if (location === "In-person" || location.includes("3550")) return companyAddress;
  return location;
}

// Send interview scheduled email
export const sendInterviewScheduledEmail = internalAction({
  args: {
    applicantFirstName: v.string(),
    applicantLastName: v.string(),
    applicantEmail: v.string(),
    resumeText: v.optional(v.string()),
    jobTitle: v.string(),
    interviewDate: v.string(),
    interviewTime: v.string(),
    interviewLocation: v.optional(v.string()),
    scheduledByName: v.string(),
    scheduledByTitle: v.optional(v.string()),
    companyName: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return { success: false, error: "Email service not configured" };
    }

    const resend = new Resend(resendApiKey);

    // Collect all email addresses
    const emailAddresses: string[] = [args.applicantEmail];

    // Try to extract additional emails from resume
    if (args.resumeText) {
      const extractedEmails = extractEmailsFromText(args.resumeText);
      extractedEmails.forEach(email => {
        if (!emailAddresses.includes(email.toLowerCase())) {
          emailAddresses.push(email.toLowerCase());
        }
      });
    }

    const companyName = args.companyName || "IE Central";
    const formattedDate = formatDateForEmail(args.interviewDate);
    const formattedTime = formatTimeForEmail(args.interviewTime);
    const schedulerInfo = args.scheduledByTitle
      ? `${args.scheduledByName}, ${args.scheduledByTitle}`
      : args.scheduledByName;

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Interview Scheduled</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Interview Scheduled!</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Your interview with ${companyName} has been confirmed</p>
  </div>

  <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
    <p style="margin-top: 0;">Hi ${args.applicantFirstName},</p>

    <p>We're excited to meet you! Your interview has been scheduled.</p>

    <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
            <strong>Interview Scheduled With:</strong>
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; text-align: right;">
            ${schedulerInfo}
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
            <strong>Date:</strong>
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; text-align: right;">
            ${formattedDate}
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
            <strong>Time:</strong>
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; text-align: right;">
            ${formattedTime}
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
            <strong>Position Applied For:</strong>
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; text-align: right;">
            ${args.jobTitle}
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 0;" colspan="2">
            <strong>Location:</strong><br>
            <span style="color: #4b5563;">400 Unity St, Latrobe PA</span>
          </td>
        </tr>
      </table>
    </div>

    <div style="background: #dbeafe; border-radius: 8px; padding: 15px; margin: 20px 0; border-left: 4px solid #3b82f6;">
      <strong style="color: #1e40af;">Arrival Instructions:</strong>
      <p style="margin: 10px 0 0 0; color: #1e40af;">
        Park in the parking lot and head into the lobby. Have a seat, and we will be with you at your scheduled time!
      </p>
    </div>

    <div style="background: #fef3c7; border-radius: 8px; padding: 15px; margin: 20px 0; border-left: 4px solid #f59e0b;">
      <strong style="color: #92400e;">Please Bring:</strong>
      <p style="margin: 10px 0 0 0; color: #92400e;">
        A current, valid ID
      </p>
    </div>

    <p>If you need to reschedule or have any questions, please contact us:</p>
    <ul style="list-style: none; padding: 0; margin: 15px 0;">
      ${args.contactPhone ? `<li style="margin: 5px 0;">📞 ${args.contactPhone}</li>` : ""}
      ${args.contactEmail ? `<li style="margin: 5px 0;">✉️ ${args.contactEmail}</li>` : ""}
    </ul>

    <p>We look forward to meeting you!</p>

    <p style="margin-bottom: 0;">
      Best regards,<br>
      <strong>The ${companyName} Team</strong>
    </p>
  </div>

  <div style="background: #1f2937; padding: 20px; border-radius: 0 0 10px 10px; text-align: center;">
    <p style="color: #9ca3af; margin: 0; font-size: 12px;">
      This email was sent to confirm your interview. Please do not reply directly to this email.
    </p>
  </div>
</body>
</html>
    `;

    const textContent = `
Interview Scheduled - ${companyName}

Hi ${args.applicantFirstName},

Your interview has been scheduled!

Interview Scheduled With: ${schedulerInfo}
Date: ${formattedDate}
Time: ${formattedTime}
Position Applied For: ${args.jobTitle}

Location: 400 Unity St, Latrobe PA

ARRIVAL INSTRUCTIONS:
Park in the parking lot and head into the lobby. Have a seat, and we will be with you at your scheduled time!

PLEASE BRING:
A current, valid ID

${args.contactPhone ? `Phone: ${args.contactPhone}` : ""}
${args.contactEmail ? `Email: ${args.contactEmail}` : ""}

We look forward to meeting you!

Best regards,
The ${companyName} Team
    `;

    try {
      const result = await resend.emails.send({
        from: `${companyName} <interviews@iecentral.com>`,
        to: emailAddresses,
        subject: `Interview Scheduled - ${companyName} - ${args.jobTitle}`,
        html: emailHtml,
        text: textContent,
      });

      console.log("Interview email sent:", result, "to:", emailAddresses);
      return { success: true, emailId: result.data?.id, sentTo: emailAddresses };
    } catch (error) {
      console.error("Failed to send interview email:", error);
      return { success: false, error: String(error) };
    }
  },
});

// Send interview rescheduled email
export const sendInterviewRescheduledEmail = internalAction({
  args: {
    applicantFirstName: v.string(),
    applicantLastName: v.string(),
    applicantEmail: v.string(),
    resumeText: v.optional(v.string()),
    jobTitle: v.string(),
    oldDate: v.string(),
    oldTime: v.string(),
    newDate: v.string(),
    newTime: v.string(),
    interviewLocation: v.optional(v.string()),
    companyName: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return { success: false, error: "Email service not configured" };
    }

    const resend = new Resend(resendApiKey);

    // Collect all email addresses
    const emailAddresses: string[] = [args.applicantEmail];

    if (args.resumeText) {
      const extractedEmails = extractEmailsFromText(args.resumeText);
      extractedEmails.forEach(email => {
        if (!emailAddresses.includes(email.toLowerCase())) {
          emailAddresses.push(email.toLowerCase());
        }
      });
    }

    const companyName = args.companyName || "IE Central";
    const newFormattedDate = formatDateForEmail(args.newDate);
    const newFormattedTime = formatTimeForEmail(args.newTime);
    const oldFormattedDate = formatDateForEmail(args.oldDate);
    const oldFormattedTime = formatTimeForEmail(args.oldTime);

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Interview Rescheduled</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Interview Rescheduled</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Your interview time has been updated</p>
  </div>

  <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
    <p style="margin-top: 0;">Hi ${args.applicantFirstName},</p>

    <p>Your interview for the <strong>${args.jobTitle}</strong> position has been rescheduled.</p>

    <div style="background: #fee2e2; border-radius: 8px; padding: 15px; margin: 20px 0; text-decoration: line-through; opacity: 0.7;">
      <strong>Previous Time:</strong><br>
      ${oldFormattedDate} at ${oldFormattedTime}
    </div>

    <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 2px solid #10b981;">
      <div style="background: #10b981; color: white; padding: 5px 10px; border-radius: 4px; display: inline-block; margin-bottom: 15px; font-size: 12px; font-weight: bold;">NEW TIME</div>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
            <strong>Date:</strong>
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; text-align: right;">
            ${newFormattedDate}
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
            <strong>Time:</strong>
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; text-align: right;">
            ${newFormattedTime}
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 0;" colspan="2">
            <strong>Location:</strong><br>
            <span style="color: #4b5563;">400 Unity St, Latrobe PA</span>
          </td>
        </tr>
      </table>
    </div>

    <div style="background: #dbeafe; border-radius: 8px; padding: 15px; margin: 20px 0; border-left: 4px solid #3b82f6;">
      <strong style="color: #1e40af;">Arrival Instructions:</strong>
      <p style="margin: 10px 0 0 0; color: #1e40af;">
        Park in the parking lot and head into the lobby. Have a seat, and we will be with you at your scheduled time!
      </p>
    </div>

    <div style="background: #fef3c7; border-radius: 8px; padding: 15px; margin: 20px 0; border-left: 4px solid #f59e0b;">
      <strong style="color: #92400e;">Please Bring:</strong>
      <p style="margin: 10px 0 0 0; color: #92400e;">
        A current, valid ID
      </p>
    </div>

    <p>If this new time doesn't work for you, please contact us immediately:</p>
    <ul style="list-style: none; padding: 0; margin: 15px 0;">
      ${args.contactPhone ? `<li style="margin: 5px 0;">📞 ${args.contactPhone}</li>` : ""}
      ${args.contactEmail ? `<li style="margin: 5px 0;">✉️ ${args.contactEmail}</li>` : ""}
    </ul>

    <p>We apologize for any inconvenience and look forward to meeting you!</p>

    <p style="margin-bottom: 0;">
      Best regards,<br>
      <strong>The ${companyName} Team</strong>
    </p>
  </div>

  <div style="background: #1f2937; padding: 20px; border-radius: 0 0 10px 10px; text-align: center;">
    <p style="color: #9ca3af; margin: 0; font-size: 12px;">
      This email was sent to notify you of a schedule change. Please do not reply directly to this email.
    </p>
  </div>
</body>
</html>
    `;

    const textContent = `
Interview Rescheduled - ${companyName}

Hi ${args.applicantFirstName},

Your interview for the ${args.jobTitle} position has been rescheduled.

PREVIOUS TIME (CANCELLED):
${oldFormattedDate} at ${oldFormattedTime}

NEW TIME:
Date: ${newFormattedDate}
Time: ${newFormattedTime}

Location: 400 Unity St, Latrobe PA

ARRIVAL INSTRUCTIONS:
Park in the parking lot and head into the lobby. Have a seat, and we will be with you at your scheduled time!

PLEASE BRING:
A current, valid ID

If this new time doesn't work for you, please contact us immediately:
${args.contactPhone ? `Phone: ${args.contactPhone}` : ""}
${args.contactEmail ? `Email: ${args.contactEmail}` : ""}

We apologize for any inconvenience and look forward to meeting you!

Best regards,
The ${companyName} Team
    `;

    try {
      const result = await resend.emails.send({
        from: `${companyName} <interviews@iecentral.com>`,
        to: emailAddresses,
        subject: `Interview Rescheduled - ${companyName} - ${args.jobTitle}`,
        html: emailHtml,
        text: textContent,
      });

      console.log("Reschedule email sent:", result, "to:", emailAddresses);
      return { success: true, emailId: result.data?.id, sentTo: emailAddresses };
    } catch (error) {
      console.error("Failed to send reschedule email:", error);
      return { success: false, error: String(error) };
    }
  },
});
