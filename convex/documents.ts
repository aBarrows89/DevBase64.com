import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Get all active documents
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("documents")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .order("desc")
      .collect();
  },
});

// Get documents by category
export const getByCategory = query({
  args: { category: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("documents")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .filter((q) => q.eq(q.field("isActive"), true))
      .order("desc")
      .collect();
  },
});

// Get single document by ID
export const getById = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.documentId);
  },
});

// Generate upload URL for file storage
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Get download URL for a document
export const getDownloadUrl = query({
  args: { fileId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.fileId);
  },
});

// Create a new document
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    category: v.string(),
    fileId: v.id("_storage"),
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
    uploadedBy: v.id("users"),
    uploadedByName: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("documents", {
      ...args,
      isActive: true,
      downloadCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update document metadata
export const update = mutation({
  args: {
    documentId: v.id("documents"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { documentId, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(documentId, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });
  },
});

// Increment download count
export const incrementDownload = mutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.documentId);
    if (!doc) throw new Error("Document not found");
    await ctx.db.patch(args.documentId, {
      downloadCount: doc.downloadCount + 1,
    });
  },
});

// Archive a document (soft delete)
export const archive = mutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.documentId, {
      isActive: false,
      updatedAt: Date.now(),
    });
  },
});

// Permanently delete a document
export const remove = mutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.documentId);
    if (doc) {
      // Delete the file from storage
      await ctx.storage.delete(doc.fileId);
      // Delete the document record
      await ctx.db.delete(args.documentId);
    }
  },
});

// Get document categories with counts
export const getCategoryCounts = query({
  args: {},
  handler: async (ctx) => {
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    const counts: Record<string, number> = {};
    for (const doc of documents) {
      counts[doc.category] = (counts[doc.category] || 0) + 1;
    }
    return counts;
  },
});

// Action to get download URL (can be called imperatively)
export const getFileDownloadUrl = action({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args): Promise<string | null> => {
    // Get the document to find the fileId
    const doc = await ctx.runQuery(api.documents.getById, { documentId: args.documentId });
    if (!doc) {
      throw new Error("Document not found");
    }

    // Get the download URL from storage
    const url = await ctx.storage.getUrl(doc.fileId);
    return url;
  },
});

// ============ PUBLIC DOCUMENT ACCESS ============

// Generate a URL-friendly slug from a name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 50);
}

// Toggle public access for a document
export const togglePublic = mutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.documentId);
    if (!doc) throw new Error("Document not found");

    const isPublic = !doc.isPublic;

    if (isPublic) {
      // Turning ON public access - generate a slug
      // Convert document ID to string for slicing
      const idString = String(args.documentId);
      const publicSlug = generateSlug(doc.name) + "-" + idString.slice(-6);
      await ctx.db.patch(args.documentId, {
        isPublic: true,
        publicSlug,
        updatedAt: Date.now(),
      });
      return { isPublic: true, publicSlug };
    } else {
      // Turning OFF public access - keep the slug but mark as not public
      await ctx.db.patch(args.documentId, {
        isPublic: false,
        updatedAt: Date.now(),
      });
      return { isPublic: false, publicSlug: doc.publicSlug };
    }
  },
});

// Get public document by slug (no auth required)
export const getPublicBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const doc = await ctx.db
      .query("documents")
      .withIndex("by_public_slug", (q) => q.eq("publicSlug", args.slug))
      .first();

    if (!doc || !doc.isPublic || !doc.isActive) {
      return null;
    }

    return doc;
  },
});

// Get public document file URL by slug (no auth required)
export const getPublicFileUrl = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const doc = await ctx.db
      .query("documents")
      .withIndex("by_public_slug", (q) => q.eq("publicSlug", args.slug))
      .first();

    if (!doc || !doc.isPublic || !doc.isActive) {
      return null;
    }

    return await ctx.storage.getUrl(doc.fileId);
  },
});
