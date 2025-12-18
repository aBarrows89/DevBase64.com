"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { AuthProvider } from "./auth-context";
import { ThemeProvider } from "./theme-context";

const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL || "https://your-deployment.convex.cloud"
);

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConvexProvider client={convex}>
      <ThemeProvider>
        <AuthProvider>{children}</AuthProvider>
      </ThemeProvider>
    </ConvexProvider>
  );
}
