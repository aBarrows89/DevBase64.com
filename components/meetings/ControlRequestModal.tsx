"use client";

import { useEffect, useState, useCallback } from "react";
import { useTheme } from "@/app/theme-context";
import type { ControlRequest } from "@/lib/webrtc/useRemoteControl";

// ─── Control Request Modal (shown to the screen sharer) ──────────────────────

interface ControlRequestModalProps {
  request: ControlRequest;
  onGrant: (participantId: string) => void;
  onDeny: (participantId: string) => void;
}

export function ControlRequestModal({
  request,
  onGrant,
  onDeny,
}: ControlRequestModalProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [countdown, setCountdown] = useState(30);

  // Auto-deny after 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          onDeny(request.participantId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [request.participantId, onDeny]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className={`relative w-full max-w-sm rounded-2xl border shadow-2xl ${
          isDark
            ? "bg-slate-800 border-slate-700"
            : "bg-white border-gray-200"
        }`}
      >
        <div className="px-6 py-5 text-center">
          {/* Icon */}
          <div
            className={`mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-4 ${
              isDark ? "bg-cyan-500/20" : "bg-blue-100"
            }`}
          >
            <svg
              className={`w-7 h-7 ${isDark ? "text-cyan-400" : "text-blue-600"}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59"
              />
            </svg>
          </div>

          {/* Title */}
          <h3
            className={`text-lg font-semibold mb-1 ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            Remote Control Request
          </h3>

          {/* Description */}
          <p
            className={`text-sm mb-5 ${
              isDark ? "text-slate-400" : "text-gray-500"
            }`}
          >
            <span className="font-medium text-cyan-400">
              {request.displayName}
            </span>{" "}
            is requesting control of your screen.
          </p>

          {/* Countdown */}
          <div
            className={`mb-5 text-xs ${
              isDark ? "text-slate-500" : "text-gray-400"
            }`}
          >
            Auto-denying in {countdown}s
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onDeny(request.participantId)}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
                isDark
                  ? "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Deny
            </button>
            <button
              onClick={() => onGrant(request.participantId)}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
                isDark
                  ? "bg-cyan-500 hover:bg-cyan-600 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              Allow
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Control Granted Notification (shown to the viewer) ──────────────────────

interface ControlGrantedNotificationProps {
  onDismiss: () => void;
}

export function ControlGrantedNotification({
  onDismiss,
}: ControlGrantedNotificationProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Auto-dismiss after 3 seconds
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] animate-in fade-in slide-in-from-top-2 duration-300">
      <div
        className={`flex items-center gap-3 px-5 py-3 rounded-xl border shadow-xl backdrop-blur-sm ${
          isDark
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
            : "bg-emerald-50 border-emerald-200 text-emerald-700"
        }`}
      >
        <svg
          className="w-5 h-5 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
        <p className="text-sm font-medium">
          Control granted. Click on the shared screen to start.
        </p>
      </div>
    </div>
  );
}
