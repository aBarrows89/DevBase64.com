"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/app/auth-context";
import { useTheme } from "@/app/theme-context";
import { useWebPush } from "@/lib/useWebPush";

export default function PushNotificationPrompt() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribeToPush,
  } = useWebPush(user?._id);

  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user || !isSupported || isSubscribed || dismissed) return;
    if (permission === "denied") return;

    // Check if user has already dismissed this prompt
    const dismissedAt = localStorage.getItem("push_prompt_dismissed");
    if (dismissedAt) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) return; // Don't show for 7 days after dismissal
    }

    // Show prompt after a short delay
    const timer = setTimeout(() => setShowPrompt(true), 3000);
    return () => clearTimeout(timer);
  }, [user, isSupported, isSubscribed, permission, dismissed]);

  const handleEnable = async () => {
    const success = await subscribeToPush();
    if (success) {
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem("push_prompt_dismissed", String(Date.now()));
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50 animate-in slide-in-from-bottom-4">
      <div className={`rounded-xl p-4 shadow-2xl border ${
        isDark
          ? "bg-slate-800 border-slate-700"
          : "bg-white border-gray-200"
      }`}>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg flex-shrink-0 ${isDark ? "bg-cyan-500/20" : "bg-blue-50"}`}>
            <svg className={`w-6 h-6 ${isDark ? "text-cyan-400" : "text-blue-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
              Enable Notifications
            </h3>
            <p className={`text-xs mt-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
              Get notified about new messages, schedule changes, and important updates.
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleEnable}
                disabled={isLoading}
                className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {isLoading ? "Enabling..." : "Enable"}
              </button>
              <button
                onClick={handleDismiss}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  isDark
                    ? "text-slate-400 hover:text-white hover:bg-slate-700"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
              >
                Not now
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className={`p-1 rounded ${isDark ? "text-slate-500 hover:text-white" : "text-gray-400 hover:text-gray-600"}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
