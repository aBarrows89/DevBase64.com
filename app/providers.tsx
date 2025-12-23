"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { AuthProvider } from "./auth-context";
import { ThemeProvider } from "./theme-context";
import { SidebarProvider } from "./sidebar-context";

const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL || "https://outstanding-dalmatian-787.convex.cloud"
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
