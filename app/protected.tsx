"use client";

import { useAuth } from "./auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface ProtectedProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requiredRoles?: string[]; // Array of allowed roles
}

export default function Protected({ children, requireAdmin = false, requiredRoles }: ProtectedProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Check if user has required role
  const hasRequiredRole = () => {
    if (!user) return false;
    if (!requiredRoles || requiredRoles.length === 0) return true;
    return requiredRoles.includes(user.role);
  };

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
    if (!isLoading && user && requireAdmin && user.role !== "admin") {
      router.push("/");
    }
    if (!isLoading && user && requiredRoles && !hasRequiredRole()) {
      router.push("/");
    }
  }, [user, isLoading, router, requireAdmin, requiredRoles]);

  if (isLoading) {
    return (
      <div className="min-h-screen theme-bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent-primary)] mx-auto mb-4"></div>
          <p className="theme-text-tertiary">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (requireAdmin && user.role !== "admin") {
    return null;
  }

  if (requiredRoles && !hasRequiredRole()) {
    return null;
  }

  return <>{children}</>;
}
