import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { Resend } from "resend";
import { internal } from "./_generated/api";

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

    const companyName = args.companyName || "Import Export Tire Co";
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
      <strong>The Import Export Tire Co Team</strong>
    </p>
  </div>

  <div style="background: #1f2937; padding: 20px; border-radius: 0 0 10px 10px; text-align: center;">
    <img src="https://iecentral.com/logo.gif" alt="Import Export Tire Co" style="max-width: 150px; margin-bottom: 15px;">
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
The Import Export Tire Co Team
    `;

    try {
      const result = await resend.emails.send({
        from: `Import Export Tire Co <interviews@notifications.iecentral.com>`,
        replyTo: "andy@ietires.com",
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

    const companyName = args.companyName || "Import Export Tire Co";
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
      <strong>The Import Export Tire Co Team</strong>
    </p>
  </div>

  <div style="background: #1f2937; padding: 20px; border-radius: 0 0 10px 10px; text-align: center;">
    <img src="https://iecentral.com/logo.gif" alt="Import Export Tire Co" style="max-width: 150px; margin-bottom: 15px;">
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
The Import Export Tire Co Team
    `;

    try {
      const result = await resend.emails.send({
        from: `Import Export Tire Co <interviews@notifications.iecentral.com>`,
        replyTo: "andy@ietires.com",
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

// Send interview thank you email after interview is completed
export const sendInterviewThankYouEmail = internalAction({
  args: {
    applicantFirstName: v.string(),
    applicantLastName: v.string(),
    applicantEmail: v.string(),
    resumeText: v.optional(v.string()),
    jobTitle: v.string(),
    interviewDate: v.string(),
    interviewerName: v.string(),
    companyName: v.optional(v.string()),
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

    const companyName = args.companyName || "Import Export Tire Co";
    const formattedDate = formatDateForEmail(args.interviewDate);

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thank You for Interviewing</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Thank You!</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">We appreciate you taking the time to interview with us</p>
  </div>

  <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
    <p style="margin-top: 0;">Hi ${args.applicantFirstName},</p>

    <p>Thank you for taking the time to interview with us on <strong>${formattedDate}</strong> for the <strong>${args.jobTitle}</strong> position. We truly enjoyed meeting you and learning more about your background and experience.</p>

    <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
      <h3 style="margin-top: 0; color: #374151;">What Happens Next?</h3>
      <p style="margin-bottom: 0;">Our team is currently reviewing all candidates and will be in touch regarding next steps. We aim to make a decision within the next week or two.</p>
    </div>

    <p>If you have any questions in the meantime, please don't hesitate to reach out to us at <a href="mailto:${args.contactEmail || 'andy@ietires.com'}" style="color: #10b981;">${args.contactEmail || 'andy@ietires.com'}</a>.</p>

    <p>Thank you again for your interest in joining our team. We'll be in touch soon!</p>

    <p style="margin-bottom: 0;">
      Best regards,<br>
      <strong>${args.interviewerName}</strong><br>
      <span style="color: #6b7280;">${companyName}</span>
    </p>
  </div>

  <div style="background: #1f2937; padding: 20px; border-radius: 0 0 10px 10px; text-align: center;">
    <img src="https://iecentral.com/logo.gif" alt="Import Export Tire Co" style="max-width: 150px; margin-bottom: 15px;">
    <p style="color: #9ca3af; margin: 0; font-size: 12px;">
      This is an automated message. Please contact us directly if you have any questions.
    </p>
  </div>
</body>
</html>
    `;

    const textContent = `
Thank You for Interviewing - ${companyName}

Hi ${args.applicantFirstName},

Thank you for taking the time to interview with us on ${formattedDate} for the ${args.jobTitle} position. We truly enjoyed meeting you and learning more about your background and experience.

WHAT HAPPENS NEXT?
Our team is currently reviewing all candidates and will be in touch regarding next steps. We aim to make a decision within the next week or two.

If you have any questions in the meantime, please don't hesitate to reach out to us at ${args.contactEmail || 'andy@ietires.com'}.

Thank you again for your interest in joining our team. We'll be in touch soon!

Best regards,
${args.interviewerName}
${companyName}
    `;

    try {
      const result = await resend.emails.send({
        from: `Import Export Tire Co <interviews@notifications.iecentral.com>`,
        replyTo: args.contactEmail || "andy@ietires.com",
        to: emailAddresses,
        subject: `Thank You for Interviewing - ${companyName}`,
        html: emailHtml,
        text: textContent,
      });

      console.log("Thank you email sent:", result, "to:", emailAddresses);
      return { success: true, emailId: result.data?.id, sentTo: emailAddresses };
    } catch (error) {
      console.error("Failed to send thank you email:", error);
      return { success: false, error: String(error) };
    }
  },
});

// Send offer letter email
export const sendOfferLetterEmail = internalAction({
  args: {
    candidateFirstName: v.string(),
    candidateName: v.string(),
    candidateEmail: v.string(),
    positionTitle: v.string(),
    compensationType: v.string(), // "hourly" | "salary"
    compensationAmount: v.number(),
    startDate: v.string(),
    startTime: v.optional(v.string()),
    companyName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return { success: false, error: "Email service not configured" };
    }

    const resend = new Resend(resendApiKey);

    const companyName = args.companyName || "Import Export Tire Co";
    const formattedDate = formatDateForEmail(args.startDate);
    const formattedTime = args.startTime ? formatTimeForEmail(args.startTime) : "8:00 AM";

    // Format compensation
    const compensationText = args.compensationType === "hourly"
      ? `$${args.compensationAmount.toFixed(2)} per hour`
      : `$${args.compensationAmount.toLocaleString()} per year`;

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Job Offer - ${companyName}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Congratulations!</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">We have great news for you</p>
  </div>

  <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
    <p style="margin-top: 0;">Hi ${args.candidateFirstName},</p>

    <p>We are pleased to inform you that we would like to extend an offer of employment for the <strong>${args.positionTitle}</strong> position at ${companyName}!</p>

    <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 2px solid #10b981;">
      <div style="background: #10b981; color: white; padding: 5px 10px; border-radius: 4px; display: inline-block; margin-bottom: 15px; font-size: 12px; font-weight: bold;">YOUR OFFER</div>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
            <strong>Position:</strong>
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; text-align: right;">
            ${args.positionTitle}
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
            <strong>Compensation:</strong>
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; text-align: right; color: #10b981; font-weight: bold;">
            ${compensationText}
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
            <strong>Start Date:</strong>
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; text-align: right;">
            ${formattedDate}
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 0;">
            <strong>Start Time:</strong>
          </td>
          <td style="padding: 12px 0; text-align: right;">
            ${formattedTime}
          </td>
        </tr>
      </table>
    </div>

    <div style="background: #dbeafe; border-radius: 8px; padding: 15px; margin: 20px 0; border-left: 4px solid #3b82f6;">
      <strong style="color: #1e40af;">Questions?</strong>
      <p style="margin: 10px 0 0 0; color: #1e40af;">
        If you have any questions about this offer or need additional information, please don't hesitate to reach out.
      </p>
    </div>

    <p>We're excited about the possibility of you joining our team and look forward to hearing from you!</p>

    <p style="margin-bottom: 0;">
      Best regards,<br><br>
      <strong>Andy Barrows</strong><br>
      <span style="color: #6b7280;">Chief Technology Officer</span><br>
      <span style="color: #6b7280;">Technology and Development Department</span><br>
      <span style="color: #10b981;">📞 (814) 600-6587</span>
    </p>
  </div>

  <div style="background: #1f2937; padding: 20px; border-radius: 0 0 10px 10px; text-align: center;">
    <img src="https://iecentral.com/logo.gif" alt="Import Export Tire Co" style="max-width: 150px; margin-bottom: 15px;">
    <p style="color: #9ca3af; margin: 0; font-size: 12px;">
      ${companyName} - We're excited to have you join our team!
    </p>
  </div>
</body>
</html>
    `;

    const textContent = `
Congratulations! - Job Offer from ${companyName}

Hi ${args.candidateFirstName},

We are pleased to inform you that we would like to extend an offer of employment for the ${args.positionTitle} position at ${companyName}!

YOUR OFFER DETAILS:
- Position: ${args.positionTitle}
- Compensation: ${compensationText}
- Start Date: ${formattedDate}
- Start Time: ${formattedTime}

If you have any questions about this offer or need additional information, please don't hesitate to reach out.

We're excited about the possibility of you joining our team and look forward to hearing from you!

Best regards,

Andy Barrows
Chief Technology Officer
Technology and Development Department
Phone: (814) 600-6587
    `;

    try {
      const result = await resend.emails.send({
        from: `Import Export Tire Co <interviews@notifications.iecentral.com>`,
        replyTo: "andy@ietires.com",
        to: [args.candidateEmail],
        subject: `Congratulations! Job Offer - ${args.positionTitle} at ${companyName}`,
        html: emailHtml,
        text: textContent,
      });

      console.log("Offer letter email sent:", result, "to:", args.candidateEmail);
      return { success: true, emailId: result.data?.id, sentTo: [args.candidateEmail] };
    } catch (error) {
      console.error("Failed to send offer letter email:", error);
      return { success: false, error: String(error) };
    }
  },
});

// Send missed interview email (Did Not Show)
export const sendMissedInterviewEmail = internalAction({
  args: {
    applicantFirstName: v.string(),
    applicantLastName: v.string(),
    applicantEmail: v.string(),
    resumeText: v.optional(v.string()),
    jobTitle: v.string(),
    interviewDate: v.string(),
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

    const companyName = args.companyName || "Import Export Tire Co";
    const formattedDate = formatDateForEmail(args.interviewDate);
    const contactPhone = args.contactPhone || "(724) 537-7797";
    const contactEmail = args.contactEmail || "andy@ietires.com";

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>We Missed You!</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">We Missed You Today!</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Let's find a time that works better</p>
  </div>

  <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
    <p style="margin-top: 0;">Hi ${args.applicantFirstName},</p>

    <p>We had you scheduled for an interview on <strong>${formattedDate}</strong> for the <strong>${args.jobTitle}</strong> position, but it looks like we missed each other.</p>

    <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb; text-align: center;">
      <h3 style="margin-top: 0; color: #374151;">Still Interested?</h3>
      <p style="margin-bottom: 15px;">We'd love to reschedule! Give us a call and we'll find a time that works for you.</p>
      <a href="tel:${contactPhone.replace(/[^0-9+]/g, '')}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
        📞 Call Us: ${contactPhone}
      </a>
    </div>

    <p>Life happens - we understand! If you're still interested in joining our team, just reach out and we'll get you back on the calendar.</p>

    <p>You can also email us at <a href="mailto:${contactEmail}" style="color: #6366f1;">${contactEmail}</a> if that's easier.</p>

    <p style="margin-bottom: 0;">
      We hope to hear from you soon!<br><br>
      Best regards,<br>
      <strong>The ${companyName} Team</strong>
    </p>
  </div>

  <div style="background: #1f2937; padding: 20px; border-radius: 0 0 10px 10px; text-align: center;">
    <img src="https://iecentral.com/logo.gif" alt="Import Export Tire Co" style="max-width: 150px; margin-bottom: 15px;">
    <p style="color: #9ca3af; margin: 0; font-size: 12px;">
      This is an automated message regarding your scheduled interview.
    </p>
  </div>
</body>
</html>
    `;

    const textContent = `
We Missed You Today! - ${companyName}

Hi ${args.applicantFirstName},

We had you scheduled for an interview on ${formattedDate} for the ${args.jobTitle} position, but it looks like we missed each other.

STILL INTERESTED?
We'd love to reschedule! Give us a call and we'll find a time that works for you.

Phone: ${contactPhone}
Email: ${contactEmail}

Life happens - we understand! If you're still interested in joining our team, just reach out and we'll get you back on the calendar.

We hope to hear from you soon!

Best regards,
The ${companyName} Team
    `;

    try {
      const result = await resend.emails.send({
        from: `Import Export Tire Co <interviews@notifications.iecentral.com>`,
        replyTo: contactEmail,
        to: emailAddresses,
        subject: `We Missed You! - ${companyName} Interview`,
        html: emailHtml,
        text: textContent,
      });

      console.log("Missed interview email sent:", result, "to:", emailAddresses);
      return { success: true, emailId: result.data?.id, sentTo: emailAddresses };
    } catch (error) {
      console.error("Failed to send missed interview email:", error);
      return { success: false, error: String(error) };
    }
  },
});

// Send weekly daily log digest email to admins
export const sendWeeklyDailyLogDigest = internalAction({
  args: {
    adminEmail: v.string(),
    adminName: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    totalLogs: v.number(),
    totalHours: v.number(),
    totalAccomplishments: v.number(),
    teamMembers: v.number(),
    userSummaries: v.array(v.object({
      userName: v.string(),
      daysLogged: v.number(),
      totalHours: v.number(),
      totalAccomplishments: v.number(),
      missedDays: v.number(),
    })),
    companyName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return { success: false, error: "Email service not configured" };
    }

    const resend = new Resend(resendApiKey);

    const companyName = args.companyName || "Import Export Tire Co";
    const formattedStartDate = formatDateForEmail(args.startDate);
    const formattedEndDate = formatDateForEmail(args.endDate);

    // Generate user summaries HTML
    const userSummariesHtml = args.userSummaries.map(user => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          <strong>${user.userName}</strong>
          ${user.missedDays > 0 ? `<br><span style="color: #ef4444; font-size: 12px;">${user.missedDays} day(s) missed</span>` : ''}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${user.daysLogged}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${user.totalHours.toFixed(1)}h</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #10b981; font-weight: bold;">${user.totalAccomplishments}</td>
      </tr>
    `).join('');

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weekly Daily Log Digest</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Weekly Daily Log Digest</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">${formattedStartDate} - ${formattedEndDate}</p>
  </div>

  <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
    <p style="margin-top: 0;">Hi ${args.adminName.split(' ')[0]},</p>

    <p>Here's your weekly summary of team daily activity logs.</p>

    <!-- Summary Cards -->
    <div style="display: flex; gap: 15px; margin: 20px 0; flex-wrap: wrap;">
      <div style="flex: 1; min-width: 120px; background: white; border-radius: 8px; padding: 15px; text-align: center; border: 1px solid #e5e7eb;">
        <p style="margin: 0; font-size: 28px; font-weight: bold; color: #3b82f6;">${args.totalLogs}</p>
        <p style="margin: 5px 0 0 0; font-size: 12px; color: #6b7280;">Logs Submitted</p>
      </div>
      <div style="flex: 1; min-width: 120px; background: white; border-radius: 8px; padding: 15px; text-align: center; border: 1px solid #e5e7eb;">
        <p style="margin: 0; font-size: 28px; font-weight: bold; color: #10b981;">${args.totalHours.toFixed(1)}</p>
        <p style="margin: 5px 0 0 0; font-size: 12px; color: #6b7280;">Hours Logged</p>
      </div>
      <div style="flex: 1; min-width: 120px; background: white; border-radius: 8px; padding: 15px; text-align: center; border: 1px solid #e5e7eb;">
        <p style="margin: 0; font-size: 28px; font-weight: bold; color: #8b5cf6;">${args.totalAccomplishments}</p>
        <p style="margin: 5px 0 0 0; font-size: 12px; color: #6b7280;">Accomplishments</p>
      </div>
      <div style="flex: 1; min-width: 120px; background: white; border-radius: 8px; padding: 15px; text-align: center; border: 1px solid #e5e7eb;">
        <p style="margin: 0; font-size: 28px; font-weight: bold; color: #06b6d4;">${args.teamMembers}</p>
        <p style="margin: 5px 0 0 0; font-size: 12px; color: #6b7280;">Team Members</p>
      </div>
    </div>

    <!-- Team Breakdown -->
    <div style="background: white; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; overflow: hidden;">
      <h3 style="margin: 0; padding: 15px; background: #f3f4f6; border-bottom: 1px solid #e5e7eb;">Team Breakdown</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #f9fafb;">
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Team Member</th>
            <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb;">Days</th>
            <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb;">Hours</th>
            <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb;">Accomplishments</th>
          </tr>
        </thead>
        <tbody>
          ${userSummariesHtml}
        </tbody>
      </table>
    </div>

    <div style="text-align: center; margin: 25px 0;">
      <a href="https://iecentral.com/daily-log/report" style="display: inline-block; background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">
        View Full Report
      </a>
    </div>

    <p style="margin-bottom: 0; color: #6b7280; font-size: 14px;">
      This is your weekly automated digest. You can view detailed reports and manage daily logs at <a href="https://iecentral.com/daily-log" style="color: #06b6d4;">iecentral.com/daily-log</a>.
    </p>
  </div>

  <div style="background: #1f2937; padding: 20px; border-radius: 0 0 10px 10px; text-align: center;">
    <img src="https://iecentral.com/logo.gif" alt="Import Export Tire Co" style="max-width: 150px; margin-bottom: 15px;">
    <p style="color: #9ca3af; margin: 0; font-size: 12px;">
      IE Central Weekly Digest • ${companyName}
    </p>
  </div>
</body>
</html>
    `;

    const textContent = `
Weekly Daily Log Digest
${formattedStartDate} - ${formattedEndDate}

Hi ${args.adminName.split(' ')[0]},

Here's your weekly summary of team daily activity logs.

SUMMARY
-------
Logs Submitted: ${args.totalLogs}
Hours Logged: ${args.totalHours.toFixed(1)}
Accomplishments: ${args.totalAccomplishments}
Team Members: ${args.teamMembers}

TEAM BREAKDOWN
--------------
${args.userSummaries.map(user => `${user.userName}: ${user.daysLogged} days, ${user.totalHours.toFixed(1)}h, ${user.totalAccomplishments} accomplishments${user.missedDays > 0 ? ` (${user.missedDays} days missed)` : ''}`).join('\n')}

View full report at: https://iecentral.com/daily-log/report

---
IE Central Weekly Digest
${companyName}
    `;

    try {
      const result = await resend.emails.send({
        from: `IE Central <notifications@notifications.iecentral.com>`,
        to: args.adminEmail,
        subject: `Weekly Daily Log Digest - ${formattedStartDate} to ${formattedEndDate}`,
        html: emailHtml,
        text: textContent,
      });

      console.log("Weekly digest email sent:", result, "to:", args.adminEmail);
      return { success: true, emailId: result.data?.id };
    } catch (error) {
      console.error("Failed to send weekly digest email:", error);
      return { success: false, error: String(error) };
    }
  },
});

// Send new user welcome email with login credentials
export const sendNewUserWelcomeEmail = internalAction({
  args: {
    userName: v.string(),
    userEmail: v.string(),
    temporaryPassword: v.string(),
    role: v.string(),
    loginUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return { success: false, error: "Email service not configured" };
    }

    const resend = new Resend(resendApiKey);

    const firstName = args.userName.split(" ")[0];

    // Determine if this is an admin/manager or regular employee
    const isAdmin = ["super_admin", "admin", "warehouse_director", "warehouse_manager", "department_manager", "office_manager", "payroll_manager"].includes(args.role);

    // Set appropriate login URL based on role
    const loginUrl = args.loginUrl || (isAdmin ? "https://iecentral.com/login" : "https://iecentral.com/portal");

    // Format role for display
    const roleDisplay = args.role
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

    // Different content based on role
    const welcomeMessage = isAdmin
      ? "Your IE Central admin account has been created! You now have access to the management dashboard and all administrative tools."
      : "Your IE Central account has been created! You can now access the Employee Portal to clock in/out, view your schedule, request time off, and more.";

    const featuresHtml = isAdmin
      ? `
        <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
          <h3 style="margin-top: 0; color: #374151;">What You Can Do:</h3>
          <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
            <li>Manage employees and schedules</li>
            <li>Review time entries and approve timesheets</li>
            <li>Handle time-off requests</li>
            <li>Access reports and analytics</li>
            <li>And much more...</li>
          </ul>
        </div>`
      : `
        <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
          <h3 style="margin-top: 0; color: #374151;">What You Can Do:</h3>
          <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
            <li>Clock in and out</li>
            <li>View your schedule</li>
            <li>Request time off</li>
            <li>View your pay stubs</li>
            <li>Update your information</li>
          </ul>
        </div>`;

    const buttonText = isAdmin ? "Log In to Dashboard" : "Log In to Employee Portal";

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to IE Central!</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to IE Central!</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Your account has been created</p>
  </div>

  <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
    <p style="margin-top: 0;">Hi ${firstName},</p>

    <p>${welcomeMessage}</p>

    <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
      <h3 style="margin-top: 0; color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px;">Your Login Credentials</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; width: 120px;">Email:</td>
          <td style="padding: 8px 0; font-weight: bold;">${args.userEmail}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Password:</td>
          <td style="padding: 8px 0; font-weight: bold; font-family: monospace; background: #fef3c7; padding: 5px 10px; border-radius: 4px; display: inline-block;">${args.temporaryPassword}</td>
        </tr>
      </table>
    </div>

    ${featuresHtml}

    <div style="background: #fef3c7; border-radius: 8px; padding: 15px; margin: 20px 0; border-left: 4px solid #f59e0b;">
      <p style="margin: 0; color: #92400e;">
        <strong>Important:</strong> You will be asked to change your password when you first log in.
      </p>
    </div>

    <div style="background: #e0f2fe; border-radius: 8px; padding: 15px; margin: 20px 0; border-left: 4px solid #0ea5e9;">
      <p style="margin: 0; color: #0369a1;">
        <strong>Please Note:</strong> This website and app are a work in progress and constantly being updated. Please see Andy Barrows with any questions, comments, or additions you would like to see!
      </p>
    </div>

    <div style="text-align: center; margin: 25px 0;">
      <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
        ${buttonText}
      </a>
    </div>

    <p style="margin-bottom: 0;">
      If you have any questions, contact your manager or HR.<br><br>
      Welcome to the team!<br>
      <strong>Import Export Tire Co</strong>
    </p>
  </div>

  <div style="background: #1f2937; padding: 20px; border-radius: 0 0 10px 10px; text-align: center;">
    <img src="https://iecentral.com/logo.gif" alt="Import Export Tire Co" style="max-width: 150px; margin-bottom: 15px;">
    <p style="color: #9ca3af; margin: 0; font-size: 12px;">
      This is an automated message from IE Central.
    </p>
  </div>
</body>
</html>
    `;

    const featuresText = isAdmin
      ? `WHAT YOU CAN DO:
- Manage employees and schedules
- Review time entries and approve timesheets
- Handle time-off requests
- Access reports and analytics
- And much more...`
      : `WHAT YOU CAN DO:
- Clock in and out
- View your schedule
- Request time off
- View your pay stubs
- Update your information`;

    const textContent = `
Welcome to IE Central!

Hi ${firstName},

${isAdmin
  ? "Your IE Central admin account has been created! You now have access to the management dashboard and all administrative tools."
  : "Your IE Central account has been created! You can now access the Employee Portal to clock in/out, view your schedule, request time off, and more."}

YOUR LOGIN CREDENTIALS
----------------------
Email: ${args.userEmail}
Password: ${args.temporaryPassword}

${featuresText}

IMPORTANT: You will be asked to change your password when you first log in.

PLEASE NOTE: This website and app are a work in progress and constantly being updated. Please see Andy Barrows with any questions, comments, or additions you would like to see!

Log in at: ${loginUrl}

If you have any questions, contact your manager or HR.

Welcome to the team!
Import Export Tire Co
    `;

    try {
      const result = await resend.emails.send({
        from: `IE Central <notifications@notifications.iecentral.com>`,
        to: args.userEmail,
        subject: `Welcome to IE Central - Your Account is Ready!`,
        html: emailHtml,
        text: textContent,
      });

      console.log("New user welcome email sent:", result, "to:", args.userEmail);
      return { success: true, emailId: result.data?.id };
    } catch (error) {
      console.error("Failed to send new user welcome email:", error);
      return { success: false, error: String(error) };
    }
  },
});

// Send exit interview survey email to terminated employee
export const sendExitInterviewEmail = internalAction({
  args: {
    employeeName: v.string(),
    employeeEmail: v.string(),
    exitInterviewId: v.string(),
    terminationDate: v.string(),
    position: v.optional(v.string()),
    department: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return { success: false, error: "Email service not configured" };
    }

    const resend = new Resend(resendApiKey);
    const firstName = args.employeeName.split(" ")[0];
    const formattedDate = formatDateForEmail(args.terminationDate);
    const surveyUrl = `https://www.iecentral.com/exit-survey/${args.exitInterviewId}`;

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Exit Interview Survey</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Exit Interview Survey</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">We value your feedback</p>
  </div>

  <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
    <p style="margin-top: 0;">Hi ${firstName},</p>

    <p>As you transition from Import Export Tire Co, we would greatly appreciate your honest feedback about your time with us. Your insights will help us improve the workplace for future employees.</p>

    <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
      <h3 style="margin-top: 0; color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px;">Your Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        ${args.position ? `<tr>
          <td style="padding: 8px 0; color: #6b7280; width: 140px;">Position:</td>
          <td style="padding: 8px 0; font-weight: bold;">${args.position}</td>
        </tr>` : ""}
        ${args.department ? `<tr>
          <td style="padding: 8px 0; color: #6b7280;">Department:</td>
          <td style="padding: 8px 0; font-weight: bold;">${args.department}</td>
        </tr>` : ""}
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Separation Date:</td>
          <td style="padding: 8px 0; font-weight: bold;">${formattedDate}</td>
        </tr>
      </table>
    </div>

    <div style="background: #eff6ff; border-radius: 8px; padding: 15px; margin: 20px 0; border-left: 4px solid #3b82f6;">
      <p style="margin: 0; color: #1e40af;">
        <strong>Your feedback is confidential.</strong> This survey takes approximately 5-10 minutes to complete and covers topics like job satisfaction, management, work environment, and suggestions for improvement.
      </p>
    </div>

    <div style="text-align: center; margin: 25px 0;">
      <a href="${surveyUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
        Complete Exit Survey
      </a>
    </div>

    <p style="color: #6b7280; font-size: 14px;">
      If you prefer not to complete the survey online, please contact HR to schedule an in-person or phone exit interview.
    </p>

    <p style="margin-bottom: 0;">
      Thank you for your contributions to Import Export Tire Co. We wish you the best in your future endeavors.<br><br>
      <strong>Human Resources</strong><br>
      Import Export Tire Co
    </p>
  </div>

  <div style="background: #1f2937; padding: 20px; border-radius: 0 0 10px 10px; text-align: center;">
    <img src="https://iecentral.com/logo.gif" alt="Import Export Tire Co" style="max-width: 150px; margin-bottom: 15px;">
    <p style="color: #9ca3af; margin: 0; font-size: 12px;">
      This is an automated message from IE Central.
    </p>
  </div>
</body>
</html>
    `;

    const textContent = `
EXIT INTERVIEW SURVEY

Hi ${firstName},

As you transition from Import Export Tire Co, we would greatly appreciate your honest feedback about your time with us. Your insights will help us improve the workplace for future employees.

YOUR DETAILS:
${args.position ? `Position: ${args.position}` : ""}
${args.department ? `Department: ${args.department}` : ""}
Separation Date: ${formattedDate}

Your feedback is confidential. This survey takes approximately 5-10 minutes to complete.

Complete your exit survey here: ${surveyUrl}

If you prefer not to complete the survey online, please contact HR to schedule an in-person or phone exit interview.

Thank you for your contributions to Import Export Tire Co. We wish you the best in your future endeavors.

Human Resources
Import Export Tire Co
    `;

    try {
      const result = await resend.emails.send({
        from: `Import Export Tire Co <notifications@notifications.iecentral.com>`,
        to: args.employeeEmail,
        replyTo: "hr@ietires.com",
        subject: `Exit Interview Survey - Import Export Tire Co`,
        html: emailHtml,
        text: textContent,
      });

      console.log("Exit interview email sent:", result, "to:", args.employeeEmail);
      return { success: true, emailId: result.data?.id };
    } catch (error) {
      console.error("Failed to send exit interview email:", error);
      return { success: false, error: String(error) };
    }
  },
});

// Send survey email to employee
export const sendSurveyEmail = internalAction({
  args: {
    employeeName: v.string(),
    employeeEmail: v.string(),
    surveyName: v.string(),
    surveyDescription: v.optional(v.string()),
    assignmentId: v.string(),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return { success: false, error: "Email service not configured" };
    }

    const resend = new Resend(resendApiKey);
    const firstName = args.employeeName.split(" ")[0];
    const surveyUrl = `https://iecentral.com/portal/surveys?assignment=${args.assignmentId}`;

    // Format expiration date if provided
    let expirationText = "";
    if (args.expiresAt) {
      const expiresDate = new Date(args.expiresAt);
      expirationText = expiresDate.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Survey Request</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Survey Request</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Your feedback matters to us</p>
  </div>

  <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
    <p style="margin-top: 0;">Hi ${firstName},</p>

    <p>You have been invited to complete a survey. Your honest feedback helps us improve our workplace and make Import Export Tire Co a better place to work.</p>

    <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
      <h3 style="margin-top: 0; color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px;">${args.surveyName}</h3>
      ${args.surveyDescription ? `<p style="color: #6b7280; margin-bottom: 0;">${args.surveyDescription}</p>` : ""}
    </div>

    ${expirationText ? `
    <div style="background: #fef3c7; border-radius: 8px; padding: 15px; margin: 20px 0; border-left: 4px solid #f59e0b;">
      <p style="margin: 0; color: #92400e;">
        <strong>Please complete by:</strong> ${expirationText}
      </p>
    </div>
    ` : ""}

    <div style="background: #ecfdf5; border-radius: 8px; padding: 15px; margin: 20px 0; border-left: 4px solid #10b981;">
      <p style="margin: 0; color: #065f46;">
        <strong>Your responses are anonymous.</strong> We cannot see who submitted which answers. This allows you to be completely honest in your feedback.
      </p>
    </div>

    <div style="text-align: center; margin: 25px 0;">
      <a href="${surveyUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
        Take Survey Now
      </a>
    </div>

    <p style="margin-bottom: 0; color: #6b7280; font-size: 14px;">
      Thank you for taking the time to share your thoughts!<br><br>
      <strong>Import Export Tire Co</strong>
    </p>
  </div>

  <div style="background: #1f2937; padding: 20px; border-radius: 0 0 10px 10px; text-align: center;">
    <img src="https://iecentral.com/logo.gif" alt="Import Export Tire Co" style="max-width: 150px; margin-bottom: 15px;">
    <p style="color: #9ca3af; margin: 0; font-size: 12px;">
      This is an automated message from IE Central.
    </p>
  </div>
</body>
</html>
    `;

    const textContent = `
SURVEY REQUEST

Hi ${firstName},

You have been invited to complete a survey: ${args.surveyName}

${args.surveyDescription ? args.surveyDescription : ""}

${expirationText ? `Please complete by: ${expirationText}` : ""}

Your responses are anonymous. We cannot see who submitted which answers.

Take the survey here: ${surveyUrl}

Thank you for taking the time to share your thoughts!

Import Export Tire Co
    `;

    try {
      const result = await resend.emails.send({
        from: `IE Central <notifications@notifications.iecentral.com>`,
        to: args.employeeEmail,
        subject: `Survey: ${args.surveyName} - Import Export Tire Co`,
        html: emailHtml,
        text: textContent,
      });

      console.log("Survey email sent:", result, "to:", args.employeeEmail);
      return { success: true, emailId: result.data?.id };
    } catch (error) {
      console.error("Failed to send survey email:", error);
      return { success: false, error: String(error) };
    }
  },
});

// Test action for sending exit interview email (admin use only)
export const testExitInterviewEmail = action({
  args: {
    employeeName: v.string(),
    employeeEmail: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; emailId?: string; error?: string }> => {
    const result = await ctx.runAction(internal.emails.sendExitInterviewEmail, {
      employeeName: args.employeeName,
      employeeEmail: args.employeeEmail,
      exitInterviewId: "test-" + Date.now(),
      terminationDate: new Date().toISOString().split("T")[0],
      position: "Test Position",
      department: "IT",
    });
    return result as { success: boolean; emailId?: string; error?: string };
  },
});
