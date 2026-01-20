import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Password hashing utilities (same as auth.ts)
const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;

function bufferToHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  const passwordKey = await crypto.subtle.importKey(
    "raw",
    passwordBuffer,
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    passwordKey,
    KEY_LENGTH * 8
  );

  const hashArray = new Uint8Array(hashBuffer);
  const saltHex = bufferToHex(salt);
  const hashHex = bufferToHex(hashArray);

  return `${saltHex}$${PBKDF2_ITERATIONS}$${hashHex}`;
}

async function verifyPasswordHash(
  password: string,
  storedHash: string
): Promise<boolean> {
  const parts = storedHash.split("$");
  if (parts.length !== 3) {
    return false;
  }

  const [saltHex, iterationsStr, hashHex] = parts;
  const iterations = parseInt(iterationsStr, 10);
  const salt = hexToBuffer(saltHex);

  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  const passwordKey = await crypto.subtle.importKey(
    "raw",
    passwordBuffer,
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: iterations,
      hash: "SHA-256",
    },
    passwordKey,
    KEY_LENGTH * 8
  );

  const computedHashHex = bufferToHex(new Uint8Array(hashBuffer));

  // Constant-time comparison
  if (computedHashHex.length !== hashHex.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < computedHashHex.length; i++) {
    result |= computedHashHex.charCodeAt(i) ^ hashHex.charCodeAt(i);
  }
  return result === 0;
}

// ============ QUERIES ============

// Get all active folders (metadata only, no documents)
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const folders = await ctx.db
      .query("documentFolders")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .order("desc")
      .collect();

    // Get document counts for each folder
    const foldersWithCounts = await Promise.all(
      folders.map(async (folder) => {
        const docs = await ctx.db
          .query("documents")
          .withIndex("by_folder", (q) => q.eq("folderId", folder._id))
          .filter((q) => q.eq(q.field("isActive"), true))
          .collect();
        return {
          ...folder,
          documentCount: docs.length,
          isProtected: !!folder.passwordHash,
        };
      })
    );

    return foldersWithCounts;
  },
});

// Get folder by ID (metadata only)
export const getById = query({
  args: { folderId: v.id("documentFolders") },
  handler: async (ctx, args) => {
    const folder = await ctx.db.get(args.folderId);
    if (!folder) return null;

    const docs = await ctx.db
      .query("documents")
      .withIndex("by_folder", (q) => q.eq("folderId", folder._id))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return {
      ...folder,
      documentCount: docs.length,
      isProtected: !!folder.passwordHash,
    };
  },
});

// Get documents in unprotected folder
export const getDocumentsInFolder = query({
  args: { folderId: v.id("documentFolders") },
  handler: async (ctx, args) => {
    const folder = await ctx.db.get(args.folderId);
    if (!folder || !folder.isActive) {
      return null;
    }

    // If folder is protected, don't return documents via query
    if (folder.passwordHash) {
      return { error: "Folder is password protected" };
    }

    const documents = await ctx.db
      .query("documents")
      .withIndex("by_folder", (q) => q.eq("folderId", args.folderId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .order("desc")
      .collect();

    return { documents };
  },
});

// ============ MUTATIONS ============

// Create a new folder (password optional)
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    password: v.optional(v.string()),
    createdBy: v.id("users"),
    createdByName: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let passwordHash: string | undefined;

    if (args.password) {
      passwordHash = await hashPassword(args.password);
    }

    return await ctx.db.insert("documentFolders", {
      name: args.name,
      description: args.description,
      passwordHash,
      createdBy: args.createdBy,
      createdByName: args.createdByName,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update folder metadata (name, description)
export const update = mutation({
  args: {
    folderId: v.id("documentFolders"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { folderId, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );

    await ctx.db.patch(folderId, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });
  },
});

// Set or change password on a folder
export const setPassword = mutation({
  args: {
    folderId: v.id("documentFolders"),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const passwordHash = await hashPassword(args.password);
    await ctx.db.patch(args.folderId, {
      passwordHash,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

// Remove password protection from a folder
export const removePassword = mutation({
  args: {
    folderId: v.id("documentFolders"),
    currentPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const folder = await ctx.db.get(args.folderId);
    if (!folder || !folder.passwordHash) {
      return { success: false, error: "Folder not found or not protected" };
    }

    const valid = await verifyPasswordHash(args.currentPassword, folder.passwordHash);
    if (!valid) {
      return { success: false, error: "Invalid password" };
    }

    await ctx.db.patch(args.folderId, {
      passwordHash: undefined,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

// Archive a folder (soft delete)
export const archive = mutation({
  args: { folderId: v.id("documentFolders") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.folderId, {
      isActive: false,
      updatedAt: Date.now(),
    });
  },
});

// Permanently delete a folder (moves documents back to root)
export const remove = mutation({
  args: { folderId: v.id("documentFolders") },
  handler: async (ctx, args) => {
    // Move all documents in this folder back to root (no folder)
    const docs = await ctx.db
      .query("documents")
      .withIndex("by_folder", (q) => q.eq("folderId", args.folderId))
      .collect();

    for (const doc of docs) {
      await ctx.db.patch(doc._id, { folderId: undefined });
    }

    // Delete the folder
    await ctx.db.delete(args.folderId);
  },
});

// Move document to folder
export const moveDocument = mutation({
  args: {
    documentId: v.id("documents"),
    folderId: v.union(v.id("documentFolders"), v.null()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.documentId, {
      folderId: args.folderId ?? undefined,
      updatedAt: Date.now(),
    });
  },
});

// ============ ACTIONS (for password-protected operations) ============

// Internal query to get folder with password hash (for action use)
export const getFolderWithPassword = query({
  args: { folderId: v.id("documentFolders") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.folderId);
  },
});

// Internal query to get documents (used by action)
export const getDocumentsInternal = query({
  args: { folderId: v.id("documentFolders") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("documents")
      .withIndex("by_folder", (q) => q.eq("folderId", args.folderId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .order("desc")
      .collect();
  },
});

// Verify folder password
export const verifyPassword = action({
  args: {
    folderId: v.id("documentFolders"),
    password: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    const folder = await ctx.runQuery(api.documentFolders.getFolderWithPassword, {
      folderId: args.folderId,
    });

    if (!folder) {
      return { success: false, error: "Folder not found" };
    }

    if (!folder.passwordHash) {
      // Folder is not protected
      return { success: true };
    }

    const valid = await verifyPasswordHash(args.password, folder.passwordHash);
    if (!valid) {
      return { success: false, error: "Invalid password" };
    }

    return { success: true };
  },
});

// Get documents from protected folder (requires password verification, super_admin bypasses)
export const getProtectedDocuments = action({
  args: {
    folderId: v.id("documentFolders"),
    password: v.string(),
    isSuperAdmin: v.optional(v.boolean()), // Super admin can bypass password
  },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string; documents?: unknown[] }> => {
    const folder = await ctx.runQuery(api.documentFolders.getFolderWithPassword, {
      folderId: args.folderId,
    });

    if (!folder) {
      return { success: false, error: "Folder not found" };
    }

    // Super admin bypasses password verification
    if (folder.passwordHash && args.password && !args.isSuperAdmin) {
      const valid = await verifyPasswordHash(args.password, folder.passwordHash);
      if (!valid) {
        return { success: false, error: "Invalid password" };
      }
    }

    // Fetch documents via internal query
    const documents = await ctx.runQuery(api.documentFolders.getDocumentsInternal, {
      folderId: args.folderId,
    });

    return { success: true, documents };
  },
});
