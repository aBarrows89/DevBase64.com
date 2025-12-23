"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { AuthProvider } from "./auth-context";
import { ThemeProvider } from "./theme-context";
import { SidebarProvider } from "./sidebar-context";

// Hardcoded to production to avoid env variable issues
const convex = new ConvexReactClient(
  "https://outstanding-dalmatian-787.convex.cloud"
);

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConvexProvider client={convex}>
      <ThemeProvider>
        <SidebarProvider>
          <AuthProvider>{children}</AuthProvider>
        </SidebarProvider>
      </ThemeProvider>
    </ConvexProvider>
  );
}
