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
// Optionally filter by parentFolderId (null = root folders)
export const getAll = query({
  args: {
    parentFolderId: v.optional(v.union(v.id("documentFolders"), v.null())),
  },
  handler: async (ctx, args) => {
    const folders = await ctx.db
      .query("documentFolders")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .order("desc")
      .collect();

    // Filter by parent folder
    const filteredFolders = folders.filter((f) => {
      if (args.parentFolderId === undefined) {
        // Return all folders
        return true;
      } else if (args.parentFolderId === null) {
        // Return only root folders (no parent)
        return !f.parentFolderId;
      } else {
        // Return folders with specific parent
        return f.parentFolderId === args.parentFolderId;
      }
    });

    // Get document counts and subfolder counts for each folder
    const foldersWithCounts = await Promise.all(
      filteredFolders.map(async (folder) => {
        const docs = await ctx.db
          .query("documents")
          .withIndex("by_folder", (q) => q.eq("folderId", folder._id))
          .filter((q) => q.eq(q.field("isActive"), true))
          .collect();

        // Count subfolders
        const subfolders = folders.filter(
          (f) => f.parentFolderId === folder._id && f.isActive
        );

        return {
          ...folder,
          documentCount: docs.length,
          subfolderCount: subfolders.length,
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
    parentFolderId: v.optional(v.id("documentFolders")),
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
      parentFolderId: args.parentFolderId,
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

// Archive a folder (soft delete) - only if empty
export const archive = mutation({
  args: { folderId: v.id("documentFolders") },
  handler: async (ctx, args) => {
    // Check if folder has documents
    const docs = await ctx.db
      .query("documents")
      .withIndex("by_folder", (q) => q.eq("folderId", args.folderId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    if (docs.length > 0) {
      throw new Error("Cannot archive folder with documents. Move or delete documents first.");
    }

    // Check if folder has subfolders
    const subfolders = await ctx.db
      .query("documentFolders")
      .withIndex("by_parent", (q) => q.eq("parentFolderId", args.folderId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    if (subfolders.length > 0) {
      throw new Error("Cannot archive folder with subfolders. Move or delete subfolders first.");
    }

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

// Move a folder into another folder (nested folders)
export const moveFolder = mutation({
  args: {
    folderId: v.id("documentFolders"),
    parentFolderId: v.union(v.id("documentFolders"), v.null()),
  },
  handler: async (ctx, args) => {
    // Prevent moving a folder into itself
    if (args.folderId === args.parentFolderId) {
      throw new Error("Cannot move a folder into itself");
    }

    // Prevent circular references - check if target is a descendant
    if (args.parentFolderId) {
      let current = await ctx.db.get(args.parentFolderId);
      while (current?.parentFolderId) {
        if (current.parentFolderId === args.folderId) {
          throw new Error("Cannot move a folder into its own descendant");
        }
        current = await ctx.db.get(current.parentFolderId);
      }
    }

    await ctx.db.patch(args.folderId, {
      parentFolderId: args.parentFolderId ?? undefined,
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

// Get documents from protected folder (requires password verification, super_admin bypasses, or has access grant)
export const getProtectedDocuments = action({
  args: {
    folderId: v.id("documentFolders"),
    password: v.string(),
    isSuperAdmin: v.optional(v.boolean()), // Super admin can bypass password
    userId: v.optional(v.id("users")), // To check access grants
  },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string; documents?: unknown[] }> => {
    const folder = await ctx.runQuery(api.documentFolders.getFolderWithPassword, {
      folderId: args.folderId,
    });

    if (!folder) {
      return { success: false, error: "Folder not found" };
    }

    // Check if user has been granted access (bypasses password)
    let hasGrantedAccess = false;
    if (args.userId && folder.passwordHash) {
      const accessCheck = await ctx.runQuery(api.documentFolders.checkUserAccess, {
        folderId: args.folderId,
        userId: args.userId,
      });
      hasGrantedAccess = accessCheck.hasAccess;
    }

    // Super admin or granted access bypasses password verification
    if (folder.passwordHash && args.password && !args.isSuperAdmin && !hasGrantedAccess) {
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

// ============ FOLDER SHARING ============

// Get all access grants for a folder
export const getFolderAccessGrants = query({
  args: { folderId: v.id("documentFolders") },
  handler: async (ctx, args) => {
    const grants = await ctx.db
      .query("folderAccessGrants")
      .withIndex("by_folder", (q) => q.eq("folderId", args.folderId))
      .collect();

    // Filter out revoked grants and return active ones
    return grants.filter((g) => !g.isRevoked);
  },
});

// Check if a user has access to a folder (via grant)
export const checkUserAccess = query({
  args: {
    folderId: v.id("documentFolders"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const grants = await ctx.db
      .query("folderAccessGrants")
      .withIndex("by_folder_user", (q) =>
        q.eq("folderId", args.folderId).eq("grantedToUserId", args.userId)
      )
      .collect();

    // Check for active, non-expired grant
    const now = Date.now();
    const activeGrant = grants.find(
      (g) => !g.isRevoked && (!g.expiresAt || g.expiresAt > now)
    );

    return { hasAccess: !!activeGrant, grant: activeGrant || null };
  },
});

// Grant access to a folder
export const grantAccess = mutation({
  args: {
    folderId: v.id("documentFolders"),
    grantedToUserId: v.id("users"),
    grantedToUserName: v.string(),
    grantedByUserId: v.id("users"),
    grantedByUserName: v.string(),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Check if grant already exists
    const existing = await ctx.db
      .query("folderAccessGrants")
      .withIndex("by_folder_user", (q) =>
        q.eq("folderId", args.folderId).eq("grantedToUserId", args.grantedToUserId)
      )
      .filter((q) => q.eq(q.field("isRevoked"), false))
      .first();

    if (existing) {
      // Update existing grant
      await ctx.db.patch(existing._id, {
        expiresAt: args.expiresAt,
        grantedAt: Date.now(),
        grantedByUserId: args.grantedByUserId,
        grantedByUserName: args.grantedByUserName,
      });
      return existing._id;
    }

    // Create new grant
    return await ctx.db.insert("folderAccessGrants", {
      folderId: args.folderId,
      grantedToUserId: args.grantedToUserId,
      grantedToUserName: args.grantedToUserName,
      grantedByUserId: args.grantedByUserId,
      grantedByUserName: args.grantedByUserName,
      grantedAt: Date.now(),
      expiresAt: args.expiresAt,
      isRevoked: false,
    });
  },
});

// Revoke access to a folder
export const revokeAccess = mutation({
  args: {
    grantId: v.id("folderAccessGrants"),
    revokedByUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.grantId, {
      isRevoked: true,
      revokedAt: Date.now(),
      revokedByUserId: args.revokedByUserId,
    });
  },
});

// Get all folders shared with a user
export const getSharedFolders = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const grants = await ctx.db
      .query("folderAccessGrants")
      .withIndex("by_user", (q) => q.eq("grantedToUserId", args.userId))
      .filter((q) => q.eq(q.field("isRevoked"), false))
      .collect();

    // Get folder details for each grant
    const now = Date.now();
    const sharedFolders = await Promise.all(
      grants
        .filter((g) => !g.expiresAt || g.expiresAt > now)
        .map(async (grant) => {
          const folder = await ctx.db.get(grant.folderId);
          if (!folder || !folder.isActive) return null;

          const docs = await ctx.db
            .query("documents")
            .withIndex("by_folder", (q) => q.eq("folderId", folder._id))
            .filter((q) => q.eq(q.field("isActive"), true))
            .collect();

          return {
            ...folder,
            documentCount: docs.length,
            isProtected: !!folder.passwordHash,
            grantedAt: grant.grantedAt,
            grantedByUserName: grant.grantedByUserName,
            expiresAt: grant.expiresAt,
          };
        })
    );

    return sharedFolders.filter(Boolean);
  },
});

// Get all users for sharing dropdown
export const getUsersForSharing = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return users.map((u) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
    }));
  },
});
