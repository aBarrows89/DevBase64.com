import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all signatures for a document
export const getByDocument = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const signatures = await ctx.db
      .query("docHubSignatures")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .collect();

    return signatures.sort((a, b) => b.signedAt - a.signedAt);
  },
});

// Check if a specific user has signed a specific document
export const hasUserSigned = query({
  args: {
    documentId: v.id("documents"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const signatures = await ctx.db
      .query("docHubSignatures")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .collect();

    return signatures.some((s) => s.signedBy === args.userId);
  },
});

// Sign a document
export const sign = mutation({
  args: {
    documentId: v.id("documents"),
    userId: v.id("users"),
    signatureData: v.string(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.documentId);
    if (!doc) throw new Error("Document not found");
    if (!doc.isActive) throw new Error("Document is no longer active");

    // Get user info
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    // Check if already signed
    const existingSignatures = await ctx.db
      .query("docHubSignatures")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .collect();

    const alreadySigned = existingSignatures.some(
      (s) => s.signedBy === args.userId
    );

    if (alreadySigned) {
      throw new Error("You have already signed this document");
    }

    const now = Date.now();

    // Create signature record
    const signatureId = await ctx.db.insert("docHubSignatures", {
      documentId: args.documentId,
      signedBy: args.userId,
      signedByName: user.name,
      signedByEmail: user.email,
      signatureData: args.signatureData,
      signedAt: now,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      createdAt: now,
    });

    // Increment signature count on the document
    await ctx.db.patch(args.documentId, {
      signatureCount: (doc.signatureCount || 0) + 1,
      updatedAt: now,
    });

    return signatureId;
  },
});

// Get documents that require signature but user hasn't signed yet
export const getUnsignedForUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Get all active documents that require signatures
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    const requiresSigDocs = documents.filter((d) => d.requiresSignature);

    if (requiresSigDocs.length === 0) return [];

    // Get all signatures by this user
    const userSignatures = await ctx.db
      .query("docHubSignatures")
      .withIndex("by_user", (q) => q.eq("signedBy", args.userId))
      .collect();

    const signedDocIds = new Set(userSignatures.map((s) => s.documentId));

    // Return documents that require signature but user hasn't signed
    return requiresSigDocs.filter((d) => !signedDocIds.has(d._id));
  },
});
