"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Shortcut {
  keys: string[];
  label: string;
  description: string;
  action?: () => void;
  href?: string;
}

const shortcutGroups: { title: string; shortcuts: Shortcut[] }[] = [
  {
    title: "Navigation",
    shortcuts: [
      { keys: ["g", "h"], label: "Go Home", description: "Navigate to Dashboard", href: "/" },
      { keys: ["g", "p"], label: "Projects", description: "Navigate to Projects", href: "/projects" },
      { keys: ["g", "m"], label: "Messages", description: "Navigate to Messages", href: "/messages" },
      { keys: ["g", "n"], label: "Notifications", description: "Navigate to Notifications", href: "/notifications" },
      { keys: ["g", "r"], label: "Reports", description: "Navigate to Reports", href: "/reports" },
      { keys: ["g", "s"], label: "Settings", description: "Navigate to Settings", href: "/settings" },
    ],
  },
  {
    title: "Actions",
    shortcuts: [
      { keys: ["Cmd/Ctrl", "k"], label: "Search", description: "Open global search" },
      { keys: ["?"], label: "Shortcuts", description: "Show keyboard shortcuts" },
      { keys: ["Esc"], label: "Close", description: "Close modals and dialogs" },
    ],
  },
];

export default function KeyboardShortcuts() {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const router = useRouter();

  // Navigation shortcuts handler
  const handleNavigation = useCallback((href: string) => {
    router.push(href);
    setPendingKey(null);
  }, [router]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.contentEditable === "true"
      ) {
        return;
      }

      // Show shortcuts help with ?
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setIsOpen(true);
        return;
      }

      // Handle "g" prefix for navigation
      if (pendingKey === "g") {
        e.preventDefault();
        clearTimeout(timeout);

        switch (e.key.toLowerCase()) {
          case "h":
            handleNavigation("/");
            break;
          case "p":
            handleNavigation("/projects");
            break;
          case "m":
            handleNavigation("/messages");
            break;
          case "n":
            handleNavigation("/notifications");
            break;
          case "r":
            handleNavigation("/reports");
            break;
          case "s":
            handleNavigation("/settings");
            break;
          default:
            setPendingKey(null);
        }
        return;
      }

      // Start "g" navigation mode
      if (e.key === "g" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setPendingKey("g");
        // Clear pending key after 1 second
        timeout = setTimeout(() => setPendingKey(null), 1000);
        return;
      }

      // Close modal with Escape
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timeout);
    };
  }, [pendingKey, handleNavigation]);

  // Listen for custom event to open shortcuts
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener("openKeyboardShortcuts", handleOpen);
    return () => window.removeEventListener("openKeyboardShortcuts", handleOpen);
  }, []);

  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={() => setIsOpen(false)}
      />

      {/* Modal */}
      <div className="fixed inset-x-4 top-[10%] sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-lg z-50">
        <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
            <h2 className="text-lg font-semibold text-white">Keyboard Shortcuts</h2>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Shortcuts List */}
          <div className="max-h-[60vh] overflow-y-auto p-4 space-y-6">
            {shortcutGroups.map((group) => (
              <div key={group.title}>
                <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
                  {group.title}
                </h3>
                <div className="space-y-2">
                  {group.shortcuts.map((shortcut) => (
                    <div
                      key={shortcut.label}
                      className="flex items-center justify-between py-2"
                    >
                      <div>
                        <span className="text-sm text-white">{shortcut.label}</span>
                        <span className="text-xs text-slate-500 ml-2">
                          {shortcut.description}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, i) => (
                          <span key={i}>
                            {i > 0 && (
                              <span className="text-slate-600 mx-1">then</span>
                            )}
                            <kbd className="px-2 py-1 text-xs font-medium text-slate-300 bg-slate-800 border border-slate-600 rounded">
                              {key}
                            </kbd>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 bg-slate-800/50 border-t border-slate-700">
            <p className="text-xs text-slate-500 text-center">
              Press <kbd className="px-1.5 py-0.5 bg-slate-700 rounded">?</kbd> anywhere to show this dialog
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

// Utility to open keyboard shortcuts from anywhere
export const openKeyboardShortcuts = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("openKeyboardShortcuts"));
  }
};
