"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "@/app/theme-context";
import type { IncomingRemoteEvent } from "@/lib/webrtc/useRemoteControl";

// ─── Viewer overlay (I have control of someone else's screen) ────────────────

interface ViewerOverlayProps {
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseUp: (e: React.MouseEvent) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onKeyUp: (e: React.KeyboardEvent) => void;
  onWheel: (e: React.WheelEvent) => void;
  onRelease: () => void;
}

export function ViewerControlOverlay({
  onMouseMove,
  onMouseDown,
  onMouseUp,
  onKeyDown,
  onKeyUp,
  onWheel,
  onRelease,
}: ViewerOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Auto-focus so key events work immediately
  useEffect(() => {
    overlayRef.current?.focus();
  }, []);

  return (
    <div
      ref={overlayRef}
      tabIndex={0}
      className="absolute inset-0 z-20 cursor-crosshair outline-none"
      onMouseMove={onMouseMove}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onWheel={onWheel}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* "You have control" badge */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-600/90 text-white text-xs font-medium shadow-lg backdrop-blur-sm">
        <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
        You have control
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRelease();
          }}
          className="ml-1 px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 transition-colors text-[10px] uppercase tracking-wider"
        >
          Release
        </button>
      </div>

      {/* Escape hint */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 px-2 py-1 rounded bg-black/50 text-white/70 text-[10px] backdrop-blur-sm">
        Press <kbd className="px-1 py-0.5 mx-0.5 rounded bg-white/10 font-mono">Esc</kbd> to release control
      </div>
    </div>
  );
}

// ─── Sharer overlay (someone is controlling my screen) ───────────────────────

interface SharerOverlayProps {
  controllerName: string;
  remoteCursorPosition: { x: number; y: number } | null;
  incomingRemoteEvents: IncomingRemoteEvent[];
  onRevoke: () => void;
}

export function SharerControlOverlay({
  controllerName,
  remoteCursorPosition,
  incomingRemoteEvents,
  onRevoke,
}: SharerOverlayProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Get the last few keyboard events for display
  const recentKeyEvents = incomingRemoteEvents
    .filter((e) => e.type === "key-down")
    .slice(-5);

  return (
    <div className="absolute inset-0 z-20 pointer-events-none">
      {/* Remote cursor */}
      {remoteCursorPosition && (
        <div
          className="absolute z-30 pointer-events-none transition-all duration-[16ms] ease-linear"
          style={{
            left: `${remoteCursorPosition.x * 100}%`,
            top: `${remoteCursorPosition.y * 100}%`,
            transform: "translate(-2px, -2px)",
          }}
        >
          {/* Cursor arrow SVG */}
          <svg
            width="20"
            height="24"
            viewBox="0 0 20 24"
            fill="none"
            className="drop-shadow-lg"
          >
            <path
              d="M2 2L2 20L6.5 15.5L10.5 22L13.5 20.5L9.5 13.5L16 13.5L2 2Z"
              fill="#FF6B35"
              stroke="white"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
          {/* Name label */}
          <span className="absolute left-5 top-4 px-1.5 py-0.5 rounded bg-orange-500 text-white text-[10px] font-medium whitespace-nowrap shadow-md">
            {controllerName}
          </span>
        </div>
      )}

      {/* Controller info banner */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/90 text-white text-xs font-medium shadow-lg backdrop-blur-sm pointer-events-auto">
        <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
        {controllerName} is controlling
        <button
          onClick={onRevoke}
          className="ml-1 px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 transition-colors text-[10px] uppercase tracking-wider"
        >
          Revoke
        </button>
      </div>

      {/* Recent key inputs visual feedback */}
      {recentKeyEvents.length > 0 && (
        <div className="absolute bottom-3 right-3 z-30 flex items-center gap-1">
          {recentKeyEvents.map((evt, i) => (
            <span
              key={i}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                isDark
                  ? "bg-slate-700/80 text-slate-300"
                  : "bg-gray-200/80 text-gray-600"
              } backdrop-blur-sm`}
            >
              {evt.key}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
