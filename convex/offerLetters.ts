import { v } from "convex/values";
import { mutation, query, internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

// ============ QUERIES ============

// Get all offer letters
export const list = query({
  args: {
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let offers;

    if (args.status) {
      offers = await ctx.db
        .query("offerLetters")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
    } else {
      offers = await ctx.db.query("offerLetters").collect();
    }

    return offers.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get a single offer letter
export const getById = query({
  args: { offerId: v.id("offerLetters") },
  handler: async (ctx, args) => {
    const offer = await ctx.db.get(args.offerId);
    if (!offer) return null;

    // Get application info
    const application = await ctx.db.get(offer.applicationId);

    return {
      ...offer,
      application,
    };
  },
});

// Get offer letter by application
export const getByApplication = query({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("offerLetters")
      .withIndex("by_application", (q) => q.eq("applicationId", args.applicationId))
      .first();
  },
});

// Get offer stats
export const getStats = query({
  handler: async (ctx) => {
    const offers = await ctx.db.query("offerLetters").collect();

    const stats = {
      total: offers.length,
      draft: offers.filter(o => o.status === "draft").length,
      sent: offers.filter(o => o.status === "sent").length,
      viewed: offers.filter(o => o.status === "viewed").length,
      accepted: offers.filter(o => o.status === "accepted").length,
      declined: offers.filter(o => o.status === "declined").length,
      expired: offers.filter(o => o.status === "expired").length,
      withdrawn: offers.filter(o => o.status === "withdrawn").length,
    };

    const acceptanceRate = stats.accepted + stats.declined > 0
      ? (stats.accepted / (stats.accepted + stats.declined)) * 100
      : null;

    return { ...stats, acceptanceRate };
  },
});

// ============ MUTATIONS ============

// Create an offer letter
export const create = mutation({
  args: {
    applicationId: v.id("applications"),
    positionTitle: v.string(),
    department: v.string(),
    locationId: v.optional(v.id("locations")),
    locationName: v.optional(v.string()),
    reportsTo: v.optional(v.string()),
    employmentType: v.string(),
    compensationType: v.string(),
    compensationAmount: v.number(),
    payFrequency: v.optional(v.string()),
    startDate: v.string(),
    workSchedule: v.optional(v.string()),
    benefitsEligible: v.boolean(),
    benefitsStartDate: v.optional(v.string()),
    ptoAccrual: v.optional(v.string()),
    additionalTerms: v.optional(v.string()),
    internalNotes: v.optional(v.string()),
    expiresInDays: v.optional(v.number()),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const application = await ctx.db.get(args.applicationId);
    if (!application) throw new Error("Application not found");

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    // Check if offer already exists for this application
    const existing = await ctx.db
      .query("offerLetters")
      .withIndex("by_application", (q) => q.eq("applicationId", args.applicationId))
      .first();

    if (existing && existing.status !== "withdrawn" && existing.status !== "declined" && existing.status !== "expired") {
      throw new Error("An active offer letter already exists for this application");
    }

    const now = Date.now();
    const expiresAt = args.expiresInDays
      ? now + (args.expiresInDays * 24 * 60 * 60 * 1000)
      : now + (7 * 24 * 60 * 60 * 1000); // Default 7 days

    const { userId, expiresInDays, ...offerData } = args;

    const offerId = await ctx.db.insert("offerLetters", {
      ...offerData,
      candidateName: `${application.firstName} ${application.lastName}`,
      candidateEmail: application.email,
      status: "draft",
      expiresAt,
      createdBy: userId,
      createdByName: user.name,
      createdAt: now,
      updatedAt: now,
    });

    return offerId;
  },
});

// Update an offer letter (only if draft)
export const update = mutation({
  args: {
    offerId: v.id("offerLetters"),
    positionTitle: v.optional(v.string()),
    department: v.optional(v.string()),
    locationId: v.optional(v.id("locations")),
    locationName: v.optional(v.string()),
    reportsTo: v.optional(v.string()),
    employmentType: v.optional(v.string()),
    compensationType: v.optional(v.string()),
    compensationAmount: v.optional(v.number()),
    payFrequency: v.optional(v.string()),
    startDate: v.optional(v.string()),
    workSchedule: v.optional(v.string()),
    benefitsEligible: v.optional(v.boolean()),
    benefitsStartDate: v.optional(v.string()),
    ptoAccrual: v.optional(v.string()),
    additionalTerms: v.optional(v.string()),
    internalNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const offer = await ctx.db.get(args.offerId);
    if (!offer) throw new Error("Offer letter not found");
    if (offer.status !== "draft") throw new Error("Can only edit draft offer letters");

    const { offerId, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );

    await ctx.db.patch(offerId, {
      ...filtered,
      updatedAt: Date.now(),
    });

    return offerId;
  },
});

// Create and immediately send an offer letter (combined for convenience)
export const createAndSend = mutation({
  args: {
    applicationId: v.id("applications"),
    positionTitle: v.string(),
    department: v.string(),
    compensationType: v.string(), // "hourly" | "salary"
    compensationAmount: v.number(),
    startDate: v.string(),
    startTime: v.optional(v.string()),
    employmentType: v.optional(v.string()),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const application = await ctx.db.get(args.applicationId);
    if (!application) throw new Error("Application not found");

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    // Check if offer already exists for this application
    const existing = await ctx.db
      .query("offerLetters")
      .withIndex("by_application", (q) => q.eq("applicationId", args.applicationId))
      .first();

    if (existing && existing.status !== "withdrawn" && existing.status !== "declined" && existing.status !== "expired") {
      throw new Error("An active offer letter already exists for this application");
    }

    const now = Date.now();
    const expiresAt = now + (7 * 24 * 60 * 60 * 1000); // 7 days

    // Create the offer
    const offerId = await ctx.db.insert("offerLetters", {
      applicationId: args.applicationId,
      candidateName: `${application.firstName} ${application.lastName}`,
      candidateEmail: application.email,
      positionTitle: args.positionTitle,
      department: args.department,
      employmentType: args.employmentType || "full_time",
      compensationType: args.compensationType,
      compensationAmount: args.compensationAmount,
      startDate: args.startDate,
      workSchedule: args.startTime ? `${args.startTime}` : undefined,
      benefitsEligible: true,
      status: "sent",
      sentAt: now,
      expiresAt,
      createdBy: args.userId,
      createdByName: user.name,
      createdAt: now,
      updatedAt: now,
    });

    // Schedule email to be sent
    await ctx.scheduler.runAfter(0, internal.offerLetters.sendOfferEmail, {
      offerId,
    });

    // Update application status
    await ctx.db.patch(args.applicationId, {
      status: "offer_sent",
      updatedAt: now,
    });

    return offerId;
  },
});

// Send an offer letter
export const send = mutation({
  args: {
    offerId: v.id("offerLetters"),
  },
  handler: async (ctx, args) => {
    const offer = await ctx.db.get(args.offerId);
    if (!offer) throw new Error("Offer letter not found");
    if (offer.status !== "draft") throw new Error("Offer has already been sent");

    const now = Date.now();

    await ctx.db.patch(args.offerId, {
      status: "sent",
      sentAt: now,
      updatedAt: now,
    });

    // Schedule email to be sent
    await ctx.scheduler.runAfter(0, internal.offerLetters.sendOfferEmail, {
      offerId: args.offerId,
    });

    // Update application status
    await ctx.db.patch(offer.applicationId, {
      status: "offer_sent",
      updatedAt: now,
    });

    return args.offerId;
  },
});

// Mark offer as viewed (called when candidate opens link)
export const markViewed = mutation({
  args: { offerId: v.id("offerLetters") },
  handler: async (ctx, args) => {
    const offer = await ctx.db.get(args.offerId);
    if (!offer) throw new Error("Offer letter not found");

    // Only update if not already viewed
    if (!offer.viewedAt) {
      await ctx.db.patch(args.offerId, {
        status: "viewed",
        viewedAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return args.offerId;
  },
});

// Accept an offer letter
export const accept = mutation({
  args: {
    offerId: v.id("offerLetters"),
    signatureData: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const offer = await ctx.db.get(args.offerId);
    if (!offer) throw new Error("Offer letter not found");
    if (offer.status === "accepted") throw new Error("Offer already accepted");
    if (offer.status === "declined") throw new Error("Offer was declined");
    if (offer.status === "expired") throw new Error("Offer has expired");
    if (offer.status === "withdrawn") throw new Error("Offer was withdrawn");

    const now = Date.now();

    // Check if expired
    if (offer.expiresAt && now > offer.expiresAt) {
      await ctx.db.patch(args.offerId, {
        status: "expired",
        updatedAt: now,
      });
      throw new Error("Offer has expired");
    }

    await ctx.db.patch(args.offerId, {
      status: "accepted",
      respondedAt: now,
      signedAt: now,
      signatureData: args.signatureData,
      signedIpAddress: args.ipAddress,
      updatedAt: now,
    });

    // Update application status
    await ctx.db.patch(offer.applicationId, {
      status: "offer_accepted",
      updatedAt: now,
    });

    return args.offerId;
  },
});

// Decline an offer letter
export const decline = mutation({
  args: {
    offerId: v.id("offerLetters"),
    declineReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const offer = await ctx.db.get(args.offerId);
    if (!offer) throw new Error("Offer letter not found");
    if (offer.status === "accepted") throw new Error("Offer already accepted");
    if (offer.status === "declined") throw new Error("Offer already declined");

    const now = Date.now();

    await ctx.db.patch(args.offerId, {
      status: "declined",
      respondedAt: now,
      declineReason: args.declineReason,
      updatedAt: now,
    });

    // Update application status
    await ctx.db.patch(offer.applicationId, {
      status: "offer_declined",
      updatedAt: now,
    });

    return args.offerId;
  },
});

// Withdraw an offer letter
export const withdraw = mutation({
  args: {
    offerId: v.id("offerLetters"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const offer = await ctx.db.get(args.offerId);
    if (!offer) throw new Error("Offer letter not found");
    if (offer.status === "accepted") throw new Error("Cannot withdraw accepted offer");

    const now = Date.now();

    await ctx.db.patch(args.offerId, {
      status: "withdrawn",
      internalNotes: args.reason
        ? `${offer.internalNotes || ""}\n\nWithdrawn: ${args.reason}`.trim()
        : offer.internalNotes,
      updatedAt: now,
    });

    return args.offerId;
  },
});

// Delete a draft offer letter
export const remove = mutation({
  args: { offerId: v.id("offerLetters") },
  handler: async (ctx, args) => {
    const offer = await ctx.db.get(args.offerId);
    if (!offer) throw new Error("Offer letter not found");
    if (offer.status !== "draft") throw new Error("Can only delete draft offers");

    await ctx.db.delete(args.offerId);
    return { success: true };
  },
});

// ============ INTERNAL QUERIES ============

// Get offer details for email (internal use only)
export const getOfferForEmail = internalQuery({
  args: { offerId: v.id("offerLetters") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.offerId);
  },
});

// ============ INTERNAL ACTIONS ============

// Send offer letter email
export const sendOfferEmail = internalAction({
  args: { offerId: v.id("offerLetters") },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string; emailId?: string; sentTo?: string[] }> => {
    // Get the offer letter details directly from DB
    const offer = await ctx.runQuery(internal.offerLetters.getOfferForEmail, {
      offerId: args.offerId,
    }) as {
      candidateName: string;
      candidateEmail: string;
      positionTitle: string;
      compensationType: string;
      compensationAmount: number;
      startDate: string;
      workSchedule?: string;
    } | null;

    if (!offer) {
      console.error("Offer letter not found:", args.offerId);
      return { success: false, error: "Offer letter not found" };
    }

    // Extract first name from candidate name
    const candidateFirstName: string = offer.candidateName.split(" ")[0];

    // Send the email
    const result = await ctx.runAction(internal.emails.sendOfferLetterEmail, {
      candidateFirstName,
      candidateName: offer.candidateName,
      candidateEmail: offer.candidateEmail,
      positionTitle: offer.positionTitle,
      compensationType: offer.compensationType,
      compensationAmount: offer.compensationAmount,
      startDate: offer.startDate,
      startTime: offer.workSchedule ? offer.workSchedule.split(",")[0]?.trim() : undefined,
      companyName: "Import Export Tire Co",
    }) as { success: boolean; error?: string; emailId?: string; sentTo?: string[] };

    console.log("Offer letter email result:", result);
    return result;
  },
});

// ============ OFFER LETTER TEMPLATE ============

// Generate offer letter HTML (for preview/PDF)
export const generateOfferHtml = query({
  args: { offerId: v.id("offerLetters") },
  handler: async (ctx, args) => {
    const offer = await ctx.db.get(args.offerId);
    if (!offer) return null;

    const compensationText = offer.compensationType === "hourly"
      ? `$${offer.compensationAmount.toFixed(2)} per hour`
      : `$${offer.compensationAmount.toLocaleString()} per year`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Employment Offer Letter</title>
  <style>
    body { font-family: 'Times New Roman', serif; max-width: 800px; margin: 0 auto; padding: 40px; line-height: 1.6; }
    .header { text-align: center; margin-bottom: 40px; }
    .logo { max-width: 200px; margin-bottom: 20px; }
    .date { text-align: right; margin-bottom: 30px; }
    .recipient { margin-bottom: 30px; }
    .subject { font-weight: bold; margin-bottom: 20px; }
    .section { margin-bottom: 20px; }
    .signature-area { margin-top: 60px; }
    .signature-line { border-top: 1px solid #000; width: 300px; margin-top: 50px; padding-top: 5px; }
    ul { margin: 10px 0; padding-left: 30px; }
    li { margin: 5px 0; }
  </style>
</head>
<body>
  <div class="header">
    <img src="https://ietires.com/logo.gif" alt="Import Export Tire Co" class="logo">
    <h2>EMPLOYMENT OFFER LETTER</h2>
  </div>

  <div class="date">
    ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
  </div>

  <div class="recipient">
    <strong>${offer.candidateName}</strong><br>
    ${offer.candidateEmail}
  </div>

  <div class="subject">
    RE: Offer of Employment - ${offer.positionTitle}
  </div>

  <div class="section">
    <p>Dear ${offer.candidateName.split(' ')[0]},</p>

    <p>We are pleased to offer you the position of <strong>${offer.positionTitle}</strong> at Import Export Tire Co.
    We were impressed with your qualifications and believe you will be a valuable addition to our team.</p>
  </div>

  <div class="section">
    <p><strong>Position Details:</strong></p>
    <ul>
      <li><strong>Position:</strong> ${offer.positionTitle}</li>
      <li><strong>Department:</strong> ${offer.department}</li>
      ${offer.locationName ? `<li><strong>Location:</strong> ${offer.locationName}</li>` : ''}
      ${offer.reportsTo ? `<li><strong>Reports To:</strong> ${offer.reportsTo}</li>` : ''}
      <li><strong>Employment Type:</strong> ${offer.employmentType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</li>
      <li><strong>Start Date:</strong> ${new Date(offer.startDate + 'T12:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</li>
      ${offer.workSchedule ? `<li><strong>Work Schedule:</strong> ${offer.workSchedule}</li>` : ''}
    </ul>
  </div>

  <div class="section">
    <p><strong>Compensation:</strong></p>
    <ul>
      <li><strong>Pay Rate:</strong> ${compensationText}</li>
      ${offer.payFrequency ? `<li><strong>Pay Frequency:</strong> ${offer.payFrequency.replace(/\b\w/g, l => l.toUpperCase())}</li>` : ''}
    </ul>
  </div>

  ${offer.benefitsEligible ? `
  <div class="section">
    <p><strong>Benefits:</strong></p>
    <ul>
      <li>You will be eligible for company benefits</li>
      ${offer.benefitsStartDate ? `<li><strong>Benefits Start Date:</strong> ${new Date(offer.benefitsStartDate + 'T12:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</li>` : ''}
      ${offer.ptoAccrual ? `<li><strong>PTO:</strong> ${offer.ptoAccrual}</li>` : ''}
    </ul>
  </div>
  ` : ''}

  ${offer.additionalTerms ? `
  <div class="section">
    <p><strong>Additional Terms:</strong></p>
    <p>${offer.additionalTerms}</p>
  </div>
  ` : ''}

  <div class="section">
    <p>This offer is contingent upon successful completion of a background check and verification of your eligibility to work in the United States.</p>

    <p>This offer will expire on <strong>${offer.expiresAt ? new Date(offer.expiresAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</strong>.
    Please indicate your acceptance by signing below.</p>

    <p>We are excited about the possibility of you joining our team and look forward to your positive response.</p>
  </div>

  <div class="section">
    <p>Sincerely,</p>
    <p><strong>Import Export Tire Co</strong></p>
  </div>

  <div class="signature-area">
    <p><strong>ACCEPTANCE</strong></p>
    <p>I, ${offer.candidateName}, accept the offer of employment as outlined above.</p>

    <div class="signature-line">
      Signature / Date
    </div>
  </div>
</body>
</html>
    `;

    return html;
  },
});
