import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Number of PBKDF2 iterations
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

async function verifyPassword(
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

// Login mutation
export const login = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (!user) {
      return { success: false, error: "Invalid email or password" };
    }

    if (!user.isActive) {
      return { success: false, error: "Account is deactivated" };
    }

    const passwordValid = await verifyPassword(args.password, user.passwordHash);
    if (!passwordValid) {
      return { success: false, error: "Invalid email or password" };
    }

    // Update last login
    await ctx.db.patch(user._id, { lastLoginAt: Date.now() });

    return {
      success: true,
      userId: user._id,
      forcePasswordChange: user.forcePasswordChange,
    };
  },
});

// Get user by ID
export const getUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    try {
      const user = await ctx.db.get(args.userId);
      return user;
    } catch (error) {
      // Return null if user not found or ID is invalid
      console.error("Error fetching user:", error);
      return null;
    }
  },
});

// Create initial admin user (for setup)
export const createInitialAdmin = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if any users exist
    const existingUsers = await ctx.db.query("users").first();
    if (existingUsers) {
      return { success: false, error: "Users already exist" };
    }

    const passwordHash = await hashPassword(args.password);

    const userId = await ctx.db.insert("users", {
      email: args.email.toLowerCase(),
      passwordHash,
      name: args.name,
      role: "admin",
      isActive: true,
      forcePasswordChange: false,
      createdAt: Date.now(),
    });

    return { success: true, userId };
  },
});

// Create user (admin only)
export const createUser = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.string(),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    // Check for existing email
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (existing) {
      return { success: false, error: "Email already exists" };
    }

    const passwordHash = await hashPassword(args.password);

    const userId = await ctx.db.insert("users", {
      email: args.email.toLowerCase(),
      passwordHash,
      name: args.name,
      role: args.role,
      isActive: true,
      forcePasswordChange: true, // Force password change on first login
      createdAt: Date.now(),
    });

    return { success: true, userId };
  },
});

// Change password
export const changePassword = mutation({
  args: {
    userId: v.id("users"),
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return { success: false, error: "User not found" };
    }

    const passwordValid = await verifyPassword(
      args.currentPassword,
      user.passwordHash
    );
    if (!passwordValid) {
      return { success: false, error: "Current password is incorrect" };
    }

    const newPasswordHash = await hashPassword(args.newPassword);

    await ctx.db.patch(args.userId, {
      passwordHash: newPasswordHash,
      forcePasswordChange: false,
    });

    return { success: true };
  },
});

// Get all users (admin only)
export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

// Seed superuser (bypasses existing user check)
export const seedSuperuser = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if this email already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (existing) {
      // Update existing user to admin with new password
      const passwordHash = await hashPassword(args.password);
      await ctx.db.patch(existing._id, {
        passwordHash,
        role: "admin",
        isActive: true,
        forcePasswordChange: false,
      });
      return { success: true, userId: existing._id, action: "updated" };
    }

    // Create new superuser
    const passwordHash = await hashPassword(args.password);

    const userId = await ctx.db.insert("users", {
      email: args.email.toLowerCase(),
      passwordHash,
      name: args.name,
      role: "admin",
      isActive: true,
      forcePasswordChange: false,
      createdAt: Date.now(),
    });

    return { success: true, userId, action: "created" };
  },
});

// Set forcePasswordChange flag for a user
export const setForcePasswordChange = mutation({
  args: {
    userId: v.id("users"),
    forcePasswordChange: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      forcePasswordChange: args.forcePasswordChange,
    });
    return { success: true };
  },
});

// Update user (admin only)
export const updateUser = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId, ...updates } = args;

    // If email is being updated, check for duplicates
    if (updates.email) {
      const existing = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", updates.email!.toLowerCase()))
        .first();

      if (existing && existing._id !== userId) {
        return { success: false, error: "Email already exists" };
      }
      updates.email = updates.email.toLowerCase();
    }

    // Filter out undefined values
    const cleanUpdates: Record<string, string | boolean> = {};
    if (updates.name !== undefined) cleanUpdates.name = updates.name;
    if (updates.email !== undefined) cleanUpdates.email = updates.email;
    if (updates.role !== undefined) cleanUpdates.role = updates.role;
    if (updates.isActive !== undefined) cleanUpdates.isActive = updates.isActive;

    await ctx.db.patch(userId, cleanUpdates);
    return { success: true };
  },
});

// Reset user password (admin only) - sets a new password and forces change
export const resetUserPassword = mutation({
  args: {
    userId: v.id("users"),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const passwordHash = await hashPassword(args.newPassword);

    await ctx.db.patch(args.userId, {
      passwordHash,
      forcePasswordChange: true,
    });

    return { success: true };
  },
});

// Delete user (admin only)
export const deleteUser = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.userId);
    return { success: true };
  },
});
