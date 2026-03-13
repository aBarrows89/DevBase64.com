"use client";

import { useEffect, useCallback } from "react";
import { Id } from "@/convex/_generated/dataModel";

export interface KeyboardShortcutActions {
  // Navigation
  nextEmail?: () => void;
  previousEmail?: () => void;
  openEmail?: () => void;
  goToInbox?: () => void;
  goToSent?: () => void;
  goToDrafts?: () => void;
  goToTrash?: () => void;
  goToArchive?: () => void;

  // Email actions
  compose?: () => void;
  reply?: () => void;
  replyAll?: () => void;
  forward?: () => void;
  archive?: () => void;
  deleteEmail?: () => void;
  markAsRead?: () => void;
  markAsUnread?: () => void;
  star?: () => void;
  snooze?: () => void;

  // Selection
  selectAll?: () => void;
  deselectAll?: () => void;
  toggleSelect?: () => void;

  // Search and other
  search?: () => void;
  refresh?: () => void;
  help?: () => void;
  escape?: () => void;
}

interface KeyboardShortcutsProps {
  actions: KeyboardShortcutActions;
  enabled?: boolean;
}

// Define all keyboard shortcuts
export const SHORTCUTS = {
  // Navigation
  j: { action: "nextEmail", description: "Next email" },
  k: { action: "previousEmail", description: "Previous email" },
  o: { action: "openEmail", description: "Open email" },
  Enter: { action: "openEmail", description: "Open email" },
  "g+i": { action: "goToInbox", description: "Go to Inbox" },
  "g+s": { action: "goToSent", description: "Go to Sent" },
  "g+d": { action: "goToDrafts", description: "Go to Drafts" },
  "g+t": { action: "goToTrash", description: "Go to Trash" },
  "g+a": { action: "goToArchive", description: "Go to Archive" },

  // Email actions
  c: { action: "compose", description: "Compose new email" },
  r: { action: "reply", description: "Reply" },
  a: { action: "replyAll", description: "Reply all" },
  f: { action: "forward", description: "Forward" },
  e: { action: "archive", description: "Archive" },
  "#": { action: "deleteEmail", description: "Delete" },
  Delete: { action: "deleteEmail", description: "Delete" },
  Backspace: { action: "deleteEmail", description: "Delete" },
  "Shift+i": { action: "markAsRead", description: "Mark as read" },
  "Shift+u": { action: "markAsUnread", description: "Mark as unread" },
  s: { action: "star", description: "Star/Unstar" },
  b: { action: "snooze", description: "Snooze" },

  // Selection
  "Cmd+a": { action: "selectAll", description: "Select all" },
  "Ctrl+a": { action: "selectAll", description: "Select all" },
  x: { action: "toggleSelect", description: "Toggle selection" },

  // Other
  "/": { action: "search", description: "Search" },
  "Shift+n": { action: "refresh", description: "Refresh" },
  "?": { action: "help", description: "Show shortcuts" },
  Escape: { action: "escape", description: "Close/Cancel" },
} as const;

export function KeyboardShortcuts({ actions, enabled = true }: KeyboardShortcutsProps) {
  // Track pending "g" key for go-to shortcuts
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Ignore if user is typing in an input
    const target = event.target as HTMLElement;
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable
    ) {
      // Only allow Escape in inputs
      if (event.key === "Escape" && actions.escape) {
        actions.escape();
      }
      return;
    }

    const key = event.key;
    const shift = event.shiftKey;
    const cmd = event.metaKey || event.ctrlKey;

    // Build key combo
    let combo = "";
    if (cmd) combo += "Cmd+";
    if (shift) combo += "Shift+";
    combo += key;

    // Handle shortcuts
    switch (combo) {
      // Navigation
      case "j":
        event.preventDefault();
        actions.nextEmail?.();
        break;
      case "k":
        event.preventDefault();
        actions.previousEmail?.();
        break;
      case "o":
      case "Enter":
        event.preventDefault();
        actions.openEmail?.();
        break;

      // Email actions
      case "c":
        event.preventDefault();
        actions.compose?.();
        break;
      case "r":
        event.preventDefault();
        actions.reply?.();
        break;
      case "a":
        event.preventDefault();
        actions.replyAll?.();
        break;
      case "f":
        event.preventDefault();
        actions.forward?.();
        break;
      case "e":
        event.preventDefault();
        actions.archive?.();
        break;
      case "#":
      case "Delete":
      case "Backspace":
        event.preventDefault();
        actions.deleteEmail?.();
        break;
      case "Shift+I":
        event.preventDefault();
        actions.markAsRead?.();
        break;
      case "Shift+U":
        event.preventDefault();
        actions.markAsUnread?.();
        break;
      case "s":
        event.preventDefault();
        actions.star?.();
        break;
      case "b":
        event.preventDefault();
        actions.snooze?.();
        break;

      // Selection
      case "Cmd+a":
        event.preventDefault();
        actions.selectAll?.();
        break;
      case "x":
        event.preventDefault();
        actions.toggleSelect?.();
        break;

      // Other
      case "/":
        event.preventDefault();
        actions.search?.();
        break;
      case "Shift+N":
        event.preventDefault();
        actions.refresh?.();
        break;
      case "?":
      case "Shift+/":
        event.preventDefault();
        actions.help?.();
        break;
      case "Escape":
        event.preventDefault();
        actions.escape?.();
        break;
    }
  }, [actions, enabled]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // This is a hook component, no UI
  return null;
}

// Shortcuts help modal content
export function ShortcutsHelp() {
  const sections = [
    {
      title: "Navigation",
      shortcuts: [
        { key: "j", description: "Move to next email" },
        { key: "k", description: "Move to previous email" },
        { key: "o / Enter", description: "Open selected email" },
        { key: "g then i", description: "Go to Inbox" },
        { key: "g then s", description: "Go to Sent" },
        { key: "g then d", description: "Go to Drafts" },
        { key: "g then t", description: "Go to Trash" },
      ],
    },
    {
      title: "Email Actions",
      shortcuts: [
        { key: "c", description: "Compose new email" },
        { key: "r", description: "Reply" },
        { key: "a", description: "Reply all" },
        { key: "f", description: "Forward" },
        { key: "e", description: "Archive" },
        { key: "# / Delete", description: "Delete" },
        { key: "s", description: "Star / Unstar" },
        { key: "b", description: "Snooze" },
      ],
    },
    {
      title: "Marking",
      shortcuts: [
        { key: "Shift + I", description: "Mark as read" },
        { key: "Shift + U", description: "Mark as unread" },
      ],
    },
    {
      title: "Selection",
      shortcuts: [
        { key: "x", description: "Toggle selection" },
        { key: "Cmd/Ctrl + A", description: "Select all" },
      ],
    },
    {
      title: "Other",
      shortcuts: [
        { key: "/", description: "Search" },
        { key: "Shift + N", description: "Refresh" },
        { key: "?", description: "Show keyboard shortcuts" },
        { key: "Escape", description: "Close / Cancel" },
      ],
    },
  ];

  return (
    <div className="p-4 max-h-[70vh] overflow-y-auto">
      <h2 className="text-lg font-semibold mb-4">Keyboard Shortcuts</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sections.map((section) => (
          <div key={section.title}>
            <h3 className="font-medium text-sm text-muted-foreground mb-2">
              {section.title}
            </h3>
            <div className="space-y-1">
              {section.shortcuts.map((shortcut) => (
                <div
                  key={shortcut.key}
                  className="flex items-center justify-between py-1"
                >
                  <span className="text-sm">{shortcut.description}</span>
                  <kbd className="px-2 py-0.5 bg-muted rounded text-xs font-mono">
                    {shortcut.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
