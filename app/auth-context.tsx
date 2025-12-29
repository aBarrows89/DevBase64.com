"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export type UserRole = "super_admin" | "admin" | "department_manager" | "warehouse_manager" | "member";

export interface User {
  _id: Id<"users">;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  forcePasswordChange: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string; forcePasswordChange?: boolean }>;
  logout: () => void;
  canEdit: boolean;
  canManageUsers: boolean;
  canManageAdmins: boolean;
  // Personnel management permissions
  canViewPersonnel: boolean;
  canManagePersonnel: boolean;
  canEditShifts: boolean;
  canViewShifts: boolean;
  // Super admin and warehouse manager - delete write-ups and attendance records
  canDeleteRecords: boolean;
  // Edit personnel info (email, phone, etc.) - super_admin and admin only
  canEditPersonnelInfo: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  // Track if we've ever successfully loaded user data for this session
  // This prevents clearing the session during transient null states (navigation, resubscription)
  const hasLoadedUserData = useRef(false);

  const loginMutation = useMutation(api.auth.login);
  const userData = useQuery(
    api.auth.getUser,
    userId ? { userId: userId as Id<"users"> } : "skip"
  );

  // Load saved session on mount
  useEffect(() => {
    const savedUserId = localStorage.getItem("devbase64_user_id");
    if (savedUserId) {
      // Basic validation - Convex user IDs should be a specific format
      // Clear invalid IDs that might be from other tables/projects
      if (savedUserId.length > 0) {
        setUserId(savedUserId);
      } else {
        localStorage.removeItem("devbase64_user_id");
        setInitialLoadComplete(true);
      }
    } else {
      setInitialLoadComplete(true);
    }
  }, []);

  // Update loading state based on user data
  // Track successful user loads to avoid clearing session during transient null states
  useEffect(() => {
    if (userId && userData === undefined) {
      // Query is loading - keep waiting
    } else if (userId && userData) {
      // Successfully loaded user data - mark as loaded
      hasLoadedUserData.current = true;
      setInitialLoadComplete(true);
    } else if (userId && userData === null) {
      // Query returned null - only clear if we've never successfully loaded
      // This prevents logout during navigation/resubscription when queries temporarily return null
      if (!hasLoadedUserData.current) {
        // User ID in localStorage doesn't match any user in database
        // This can happen if the ID is from a different table/project
        console.warn("Invalid user session detected, clearing...");
        localStorage.removeItem("devbase64_user_id");
        setUserId(null);
      }
      setInitialLoadComplete(true);
    }
  }, [userId, userData]);

  // Compute isLoading: true if we haven't completed initial load, OR if we have a userId but query is still loading
  const isLoading = !initialLoadComplete || (userId !== null && userData === undefined);

  const login = async (email: string, password: string) => {
    try {
      const result = await loginMutation({ email, password });
      if (result.success && result.userId) {
        setUserId(result.userId);
        localStorage.setItem("devbase64_user_id", result.userId);
        return {
          success: true,
          forcePasswordChange: result.forcePasswordChange,
        };
      }
      return { success: false, error: result.error || "Login failed" };
    } catch (error) {
      return { success: false, error: "An error occurred during login" };
    }
  };

  const logout = () => {
    setUserId(null);
    localStorage.removeItem("devbase64_user_id");
    hasLoadedUserData.current = false; // Reset for next login
    setInitialLoadComplete(true); // Keep as complete since we know there's no session
  };

  const user: User | null = userData
    ? {
        _id: userData._id,
        email: userData.email,
        name: userData.name,
        role: userData.role as UserRole,
        isActive: userData.isActive,
        forcePasswordChange: userData.forcePasswordChange,
      }
    : null;

  // Super Admin & Admin have full edit access
  const canEdit =
    user?.role === "super_admin" ||
    user?.role === "admin" ||
    user?.role === "department_manager" ||
    user?.role === "member";

  // Only Super Admin can manage other admins, Admin can manage non-admin users
  const canManageUsers =
    user?.role === "super_admin" ||
    user?.role === "admin";

  // Super Admin can create/edit admin users
  const canManageAdmins = user?.role === "super_admin";

  // Personnel management permissions
  // View personnel: super_admin, admin, department_manager, warehouse_manager
  const canViewPersonnel =
    user?.role === "super_admin" ||
    user?.role === "admin" ||
    user?.role === "department_manager" ||
    user?.role === "warehouse_manager";

  // Manage personnel (add, edit, delete records): super_admin, admin, department_manager, warehouse_manager
  const canManagePersonnel =
    user?.role === "super_admin" ||
    user?.role === "admin" ||
    user?.role === "department_manager" ||
    user?.role === "warehouse_manager";

  // Edit shifts: super_admin, admin, department_manager, warehouse_manager
  const canEditShifts =
    user?.role === "super_admin" ||
    user?.role === "admin" ||
    user?.role === "department_manager" ||
    user?.role === "warehouse_manager";

  // View shifts: everyone except viewer
  const canViewShifts =
    user?.role === "super_admin" ||
    user?.role === "admin" ||
    user?.role === "department_manager" ||
    user?.role === "warehouse_manager" ||
    user?.role === "member";

  // Super admin and warehouse manager - can delete write-ups and attendance records
  const canDeleteRecords =
    user?.role === "super_admin" ||
    user?.role === "warehouse_manager";

  // Edit personnel info (email, phone, etc.) - super_admin and admin only
  const canEditPersonnelInfo =
    user?.role === "super_admin" ||
    user?.role === "admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        canEdit,
        canManageUsers,
        canManageAdmins,
        canViewPersonnel,
        canManagePersonnel,
        canEditShifts,
        canViewShifts,
        canDeleteRecords,
        canEditPersonnelInfo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
