import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all active templates, optionally filter by category
export const list = query({
  args: {
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let templates;
    if (args.category) {
      templates = await ctx.db
        .query("documentTemplates")
        .withIndex("by_category", (q) => q.eq("category", args.category!))
        .collect();
      templates = templates.filter((t) => t.isActive);
    } else {
      templates = await ctx.db
        .query("documentTemplates")
        .withIndex("by_active", (q) => q.eq("isActive", true))
        .collect();
    }
    return templates;
  },
});

// Get a single template by ID
export const get = query({
  args: { templateId: v.id("documentTemplates") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.templateId);
  },
});

// Create a template from an existing document (copies its file reference)
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    category: v.string(),
    documentId: v.id("documents"),
    createdBy: v.id("users"),
    createdByName: v.string(),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.documentId);
    if (!doc) throw new Error("Document not found");

    const now = Date.now();
    return await ctx.db.insert("documentTemplates", {
      name: args.name,
      description: args.description,
      category: args.category,
      fileId: doc.fileId,
      fileName: doc.fileName,
      fileType: doc.fileType,
      fileSize: doc.fileSize,
      createdBy: args.createdBy,
      createdByName: args.createdByName,
      usageCount: 0,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Create a template from a new upload
export const createFromUpload = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    category: v.string(),
    fileId: v.id("_storage"),
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
    createdBy: v.id("users"),
    createdByName: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("documentTemplates", {
      name: args.name,
      description: args.description,
      category: args.category,
      fileId: args.fileId,
      fileName: args.fileName,
      fileType: args.fileType,
      fileSize: args.fileSize,
      createdBy: args.createdBy,
      createdByName: args.createdByName,
      usageCount: 0,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Use a template: create a new document from a template
export const useTemplate = mutation({
  args: {
    templateId: v.id("documentTemplates"),
    name: v.string(),
    folderId: v.optional(v.id("documentFolders")),
    uploadedBy: v.id("users"),
    uploadedByName: v.string(),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);
    if (!template || !template.isActive) {
      throw new Error("Template not found or inactive");
    }

    const now = Date.now();

    // Create a new document from the template
    const docId = await ctx.db.insert("documents", {
      name: args.name,
      description: template.description,
      category: template.category,
      folderId: args.folderId,
      fileId: template.fileId,
      fileName: template.fileName,
      fileType: template.fileType,
      fileSize: template.fileSize,
      uploadedBy: args.uploadedBy,
      uploadedByName: args.uploadedByName,
      isActive: true,
      downloadCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    // Increment usage count
    await ctx.db.patch(args.templateId, {
      usageCount: template.usageCount + 1,
      updatedAt: now,
    });

    return docId;
  },
});

// Archive a template (soft delete)
export const archive = mutation({
  args: { templateId: v.id("documentTemplates") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.templateId, {
      isActive: false,
      updatedAt: Date.now(),
    });
  },
});

// Generate upload URL for template files
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
