"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

interface Banner {
  _id: string;
  message: string;
  type: "info" | "warning" | "error" | "success";
  showOnMobile: boolean;
  showOnDesktop: boolean;
  dismissible: boolean;
  linkUrl?: string;
  linkText?: string;
}

export default function SystemBanner() {
  const banners = useQuery(api.systemBanners.getActive) as Banner[] | undefined;
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile/desktop
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Load dismissed banners from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("dismissedBanners");
    if (stored) {
      try {
        const ids = JSON.parse(stored);
        setDismissedIds(new Set(ids));
      } catch {
        // Invalid JSON, ignore
      }
    }
  }, []);

  const dismissBanner = (bannerId: string) => {
    const newDismissed = new Set(dismissedIds);
    newDismissed.add(bannerId);
    setDismissedIds(newDismissed);
    localStorage.setItem("dismissedBanners", JSON.stringify([...newDismissed]));
  };

  if (!banners || banners.length === 0) return null;

  // Filter banners based on device and dismissed state
  const visibleBanners = banners.filter((banner) => {
    if (dismissedIds.has(banner._id)) return false;
    if (isMobile && !banner.showOnMobile) return false;
    if (!isMobile && !banner.showOnDesktop) return false;
    return true;
  });

  if (visibleBanners.length === 0) return null;

  const getTypeStyles = (type: string) => {
    switch (type) {
      case "error":
        return "bg-red-600 text-white";
      case "warning":
        return "bg-amber-500 text-white";
      case "success":
        return "bg-green-600 text-white";
      default:
        return "bg-blue-600 text-white";
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "error":
        return (
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case "warning":
        return (
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case "success":
        return (
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[100]">
      {visibleBanners.map((banner) => (
        <div
          key={banner._id}
          className={`${getTypeStyles(banner.type)} px-4 py-3`}
        >
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
            {getIcon(banner.type)}
            <p className="text-sm font-medium flex-1 text-center">
              {banner.message}
              {banner.linkUrl && banner.linkText && (
                <Link
                  href={banner.linkUrl}
                  className="ml-2 underline hover:no-underline font-semibold"
                >
                  {banner.linkText}
                </Link>
              )}
            </p>
            {banner.dismissible && (
              <button
                onClick={() => dismissBanner(banner._id)}
                className="p-1 rounded hover:bg-white/20 transition-colors flex-shrink-0"
                aria-label="Dismiss"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
