"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { AuthProvider } from "./auth-context";
import { ThemeProvider } from "./theme-context";
import { SidebarProvider } from "./sidebar-context";
import GlobalSearch from "@/components/GlobalSearch";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";
import SystemBanner from "@/components/SystemBanner";

// Production deployment
const convex = new ConvexReactClient(
  "https://outstanding-dalmatian-787.convex.cloud"
);

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConvexProvider client={convex}>
      <ThemeProvider>
        <SidebarProvider>
          <AuthProvider>
            <SystemBanner />
            {children}
            <GlobalSearch />
            <KeyboardShortcuts />
          </AuthProvider>
        </SidebarProvider>
      </ThemeProvider>
    </ConvexProvider>
  );
}
