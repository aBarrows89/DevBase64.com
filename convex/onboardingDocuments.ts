import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ============ QUERIES ============

// Get all active onboarding documents
export const listActive = query({
  handler: async (ctx) => {
    const documents = await ctx.db
      .query("onboardingDocuments")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    return documents.sort((a, b) => a.title.localeCompare(b.title));
  },
});

// Get all onboarding documents (admin view)
export const listAll = query({
  handler: async (ctx) => {
    const documents = await ctx.db.query("onboardingDocuments").collect();

    // Get signature counts for each document
    const enriched = await Promise.all(
      documents.map(async (doc) => {
        const signatures = await ctx.db
          .query("documentSignatures")
          .withIndex("by_document", (q) => q.eq("documentId", doc._id))
          .collect();

        return {
          ...doc,
          signatureCount: signatures.length,
        };
      })
    );

    return enriched.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get a document by ID
export const getById = query({
  args: { documentId: v.id("onboardingDocuments") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.documentId);
  },
});

// Get document URL for viewing
export const getDocumentUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

// Get documents for an employee with their signature status
export const getForEmployee = query({
  args: { personnelId: v.id("personnel") },
  handler: async (ctx, args) => {
    const documents = await ctx.db
      .query("onboardingDocuments")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Get signatures for this employee
    const signatures = await ctx.db
      .query("documentSignatures")
      .withIndex("by_personnel", (q) => q.eq("personnelId", args.personnelId))
      .collect();

    const signatureMap = new Map(
      signatures.map((s) => [s.documentId, s])
    );

    return documents.map((doc) => {
      const signature = signatureMap.get(doc._id);
      return {
        ...doc,
        isSigned: !!signature,
        signedAt: signature?.signedAt,
        signedVersion: signature?.documentVersion,
        needsResign: signature && signature.documentVersion !== doc.version,
      };
    });
  },
});

// Get pending (unsigned required) documents for an employee
export const getPendingForEmployee = query({
  args: { personnelId: v.id("personnel") },
  handler: async (ctx, args) => {
    const documents = await ctx.db
      .query("onboardingDocuments")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Get signatures for this employee
    const signatures = await ctx.db
      .query("documentSignatures")
      .withIndex("by_personnel", (q) => q.eq("personnelId", args.personnelId))
      .collect();

    const signatureMap = new Map(
      signatures.map((s) => [s.documentId, s])
    );

    // Filter to required documents that need signing
    return documents.filter((doc) => {
      if (!doc.requiresSignature || !doc.isRequired) return false;
      const signature = signatureMap.get(doc._id);
      // Need to sign if never signed or version changed
      return !signature || signature.documentVersion !== doc.version;
    });
  },
});

// Get signatures for a document (admin view)
export const getSignaturesForDocument = query({
  args: { documentId: v.id("onboardingDocuments") },
  handler: async (ctx, args) => {
    const signatures = await ctx.db
      .query("documentSignatures")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .collect();

    // Enrich with personnel info
    const enriched = await Promise.all(
      signatures.map(async (sig) => {
        const personnel = await ctx.db.get(sig.personnelId);
        return {
          ...sig,
          personnelName: personnel
            ? `${personnel.firstName} ${personnel.lastName}`
            : "Unknown",
        };
      })
    );

    return enriched.sort((a, b) => b.signedAt - a.signedAt);
  },
});

// Get employees who haven't signed a required document
export const getUnsignedEmployees = query({
  args: { documentId: v.id("onboardingDocuments") },
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.documentId);
    if (!document) return [];

    // Get all active personnel
    const personnel = await ctx.db
      .query("personnel")
      .collect();
    const activePersonnel = personnel.filter((p) => p.status === "active");

    // Get signatures for this document
    const signatures = await ctx.db
      .query("documentSignatures")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .collect();

    const signedPersonnelIds = new Set(
      signatures
        .filter((s) => s.documentVersion === document.version)
        .map((s) => s.personnelId)
    );

    // Return personnel who haven't signed current version
    return activePersonnel
      .filter((p) => !signedPersonnelIds.has(p._id))
      .map((p) => ({
        _id: p._id,
        name: `${p.firstName} ${p.lastName}`,
        department: p.department,
        hireDate: p.hireDate,
      }));
  },
});

// ============ MUTATIONS ============

// Generate upload URL for document
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Create a new onboarding document
export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    documentType: v.string(),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),
    pageCount: v.optional(v.number()),
    requiresSignature: v.boolean(),
    isRequired: v.boolean(),
    version: v.string(),
    effectiveDate: v.string(),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const documentId = await ctx.db.insert("onboardingDocuments", {
      title: args.title,
      description: args.description,
      documentType: args.documentType,
      storageId: args.storageId,
      fileName: args.fileName,
      fileSize: args.fileSize,
      pageCount: args.pageCount,
      requiresSignature: args.requiresSignature,
      isRequired: args.isRequired,
      isActive: true,
      version: args.version,
      effectiveDate: args.effectiveDate,
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
    });

    return documentId;
  },
});

// Update an onboarding document
export const update = mutation({
  args: {
    documentId: v.id("onboardingDocuments"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    requiresSignature: v.optional(v.boolean()),
    isRequired: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { documentId, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    await ctx.db.patch(documentId, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });

    return documentId;
  },
});

// Upload a new version of a document
export const uploadNewVersion = mutation({
  args: {
    documentId: v.id("onboardingDocuments"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),
    pageCount: v.optional(v.number()),
    version: v.string(),
    effectiveDate: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.documentId, {
      storageId: args.storageId,
      fileName: args.fileName,
      fileSize: args.fileSize,
      pageCount: args.pageCount,
      version: args.version,
      effectiveDate: args.effectiveDate,
      updatedAt: Date.now(),
    });

    return args.documentId;
  },
});

// Sign a document (employee action)
export const signDocument = mutation({
  args: {
    documentId: v.id("onboardingDocuments"),
    personnelId: v.id("personnel"),
    userId: v.optional(v.id("users")),
    signatureData: v.optional(v.string()),
    deviceInfo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.documentId);
    if (!document) throw new Error("Document not found");
    if (!document.isActive) throw new Error("Document is no longer active");

    // Check if already signed this version
    const existingSignatures = await ctx.db
      .query("documentSignatures")
      .withIndex("by_document_personnel", (q) =>
        q.eq("documentId", args.documentId).eq("personnelId", args.personnelId)
      )
      .collect();

    const currentVersionSignature = existingSignatures.find(
      (s) => s.documentVersion === document.version
    );

    if (currentVersionSignature) {
      throw new Error("You have already signed this version of the document");
    }

    const signatureId = await ctx.db.insert("documentSignatures", {
      documentId: args.documentId,
      personnelId: args.personnelId,
      userId: args.userId,
      signedAt: Date.now(),
      signatureData: args.signatureData,
      deviceInfo: args.deviceInfo,
      acknowledgmentText: `I have read, understand, and agree to comply with the ${document.title} (Version ${document.version})`,
      documentVersion: document.version,
    });

    return signatureId;
  },
});

// Delete a document (admin only)
export const deleteDocument = mutation({
  args: { documentId: v.id("onboardingDocuments") },
  handler: async (ctx, args) => {
    // Delete all signatures for this document
    const signatures = await ctx.db
      .query("documentSignatures")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .collect();

    for (const sig of signatures) {
      await ctx.db.delete(sig._id);
    }

    // Delete the document
    await ctx.db.delete(args.documentId);

    return true;
  },
});
