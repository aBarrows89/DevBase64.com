"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface Label {
  _id: Id<"emailLabels">;
  name: string;
  color: string;
}

interface Folder {
  _id: Id<"emailFolders">;
  name: string;
  type: string;
}

interface BulkActionsToolbarProps {
  selectedEmailIds: Id<"emails">[];
  userId: Id<"users">;
  accountId: Id<"emailAccounts">;
  labels?: Label[];
  folders?: Folder[];
  onClearSelection: () => void;
  onSelectAll?: () => void;
  totalCount?: number;
  isDark?: boolean;
}

// Snooze presets
const SNOOZE_OPTIONS = [
  { label: "Later today (6 PM)", getValue: () => {
    const now = new Date();
    const later = new Date(now);
    later.setHours(18, 0, 0, 0);
    if (later <= now) later.setDate(later.getDate() + 1);
    return later.getTime();
  }},
  { label: "Tomorrow (9 AM)", getValue: () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow.getTime();
  }},
  { label: "Next week", getValue: () => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(9, 0, 0, 0);
    return nextWeek.getTime();
  }},
  { label: "Next month", getValue: () => {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setHours(9, 0, 0, 0);
    return nextMonth.getTime();
  }},
];

// Simple dropdown component
function Dropdown({
  trigger,
  children,
  isDark,
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  isDark?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
      {isOpen && (
        <div
          className={`absolute top-full left-0 mt-1 py-1 rounded-lg shadow-lg border z-50 min-w-[160px] ${
            isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"
          }`}
          onClick={() => setIsOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function DropdownItem({
  onClick,
  children,
  isDark,
  danger,
}: {
  onClick: () => void;
  children: React.ReactNode;
  isDark?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${
        danger
          ? "text-red-500 hover:bg-red-500/10"
          : isDark
          ? "hover:bg-slate-700 text-slate-200"
          : "hover:bg-gray-100 text-gray-700"
      }`}
    >
      {children}
    </button>
  );
}

export function BulkActionsToolbar({
  selectedEmailIds,
  userId,
  labels = [],
  folders = [],
  onClearSelection,
  onSelectAll,
  totalCount,
  isDark = false,
}: BulkActionsToolbarProps) {
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Mutations
  const markAsRead = useMutation(api.email.bulkActions.markAsRead);
  const markAsUnread = useMutation(api.email.bulkActions.markAsUnread);
  const star = useMutation(api.email.bulkActions.star);
  const unstar = useMutation(api.email.bulkActions.unstar);
  const archive = useMutation(api.email.bulkActions.archive);
  const moveToTrash = useMutation(api.email.bulkActions.moveToTrash);
  const moveToFolder = useMutation(api.email.bulkActions.moveToFolder);
  const permanentDelete = useMutation(api.email.bulkActions.permanentDelete);
  const bulkSnooze = useMutation(api.email.snooze.bulkSnooze);
  const bulkAssignLabel = useMutation(api.email.labels.bulkAssign);

  const selectedCount = selectedEmailIds.length;

  if (selectedCount === 0) return null;

  const showMessage = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(""), 3000);
  };

  const handleAction = async (
    action: () => Promise<{ updated?: number; archived?: number; moved?: number; deleted?: number; snoozed?: number; assigned?: number }>,
    actionName: string
  ) => {
    setIsLoading(true);
    try {
      const result = await action();
      const count = result.updated || result.archived || result.moved || result.deleted || result.snoozed || result.assigned || 0;
      showMessage(`${actionName} ${count} email${count !== 1 ? "s" : ""}`);
      onClearSelection();
    } catch (error) {
      showMessage(`Failed to ${actionName.toLowerCase()}`);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsRead = () => handleAction(() => markAsRead({ emailIds: selectedEmailIds, userId }), "Marked as read");
  const handleMarkAsUnread = () => handleAction(() => markAsUnread({ emailIds: selectedEmailIds, userId }), "Marked as unread");
  const handleStar = () => handleAction(() => star({ emailIds: selectedEmailIds, userId }), "Starred");
  const handleUnstar = () => handleAction(() => unstar({ emailIds: selectedEmailIds, userId }), "Unstarred");
  const handleArchive = () => handleAction(() => archive({ emailIds: selectedEmailIds, userId }), "Archived");
  const handleMoveToTrash = () => handleAction(() => moveToTrash({ emailIds: selectedEmailIds, userId }), "Moved to trash");

  const handlePermanentDelete = () => {
    handleAction(() => permanentDelete({ emailIds: selectedEmailIds, userId }), "Permanently deleted");
    setIsDeleteConfirmOpen(false);
  };

  const handleMoveToFolder = (folderId: Id<"emailFolders">) => {
    handleAction(() => moveToFolder({ emailIds: selectedEmailIds, folderId, userId }), "Moved");
  };

  const handleSnooze = (snoozedUntil: number) => {
    handleAction(() => bulkSnooze({ emailIds: selectedEmailIds, userId, snoozedUntil }), "Snoozed");
  };

  const handleAssignLabel = (labelId: Id<"emailLabels">) => {
    handleAction(() => bulkAssignLabel({ emailIds: selectedEmailIds, labelId, userId }), "Labeled");
  };

  const buttonClass = `p-2 rounded-lg transition-colors ${
    isDark ? "hover:bg-slate-700 text-slate-300" : "hover:bg-gray-100 text-gray-600"
  } disabled:opacity-50`;

  return (
    <>
      <div className={`flex items-center gap-1 px-4 py-2 border-b ${isDark ? "bg-slate-800 border-slate-700" : "bg-gray-50 border-gray-200"}`}>
        {/* Selection info */}
        <div className="flex items-center gap-2">
          <button onClick={onClearSelection} className={buttonClass} title="Clear selection">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <span className={`text-sm font-medium ${isDark ? "text-slate-200" : "text-gray-700"}`}>
            {selectedCount} selected
            {totalCount && selectedCount < totalCount && onSelectAll && (
              <button onClick={onSelectAll} className="ml-1 text-blue-500 hover:underline">
                Select all {totalCount}
              </button>
            )}
          </span>
        </div>

        <div className={`h-4 w-px mx-2 ${isDark ? "bg-slate-600" : "bg-gray-300"}`} />

        {/* Quick actions */}
        <button onClick={handleArchive} disabled={isLoading} className={buttonClass} title="Archive">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
        </button>

        <button onClick={handleMoveToTrash} disabled={isLoading} className={buttonClass} title="Move to trash">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>

        {/* Read dropdown */}
        <Dropdown
          isDark={isDark}
          trigger={
            <button disabled={isLoading} className={buttonClass} title="Mark as...">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </button>
          }
        >
          <DropdownItem onClick={handleMarkAsRead} isDark={isDark}>Mark as read</DropdownItem>
          <DropdownItem onClick={handleMarkAsUnread} isDark={isDark}>Mark as unread</DropdownItem>
        </Dropdown>

        {/* Star dropdown */}
        <Dropdown
          isDark={isDark}
          trigger={
            <button disabled={isLoading} className={buttonClass} title="Star...">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </button>
          }
        >
          <DropdownItem onClick={handleStar} isDark={isDark}>Star</DropdownItem>
          <DropdownItem onClick={handleUnstar} isDark={isDark}>Remove star</DropdownItem>
        </Dropdown>

        {/* Snooze dropdown */}
        <Dropdown
          isDark={isDark}
          trigger={
            <button disabled={isLoading} className={buttonClass} title="Snooze">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          }
        >
          {SNOOZE_OPTIONS.map((option) => (
            <DropdownItem key={option.label} onClick={() => handleSnooze(option.getValue())} isDark={isDark}>
              {option.label}
            </DropdownItem>
          ))}
        </Dropdown>

        {/* Labels dropdown */}
        {labels.length > 0 && (
          <Dropdown
            isDark={isDark}
            trigger={
              <button disabled={isLoading} className={buttonClass} title="Label">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </button>
            }
          >
            {labels.map((label) => (
              <DropdownItem key={label._id} onClick={() => handleAssignLabel(label._id)} isDark={isDark}>
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: label.color }} />
                {label.name}
              </DropdownItem>
            ))}
          </Dropdown>
        )}

        {/* Folders dropdown */}
        {folders.length > 0 && (
          <Dropdown
            isDark={isDark}
            trigger={
              <button disabled={isLoading} className={buttonClass} title="Move to folder">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </button>
            }
          >
            {folders
              .filter((f) => !["trash", "spam"].includes(f.type))
              .map((folder) => (
                <DropdownItem key={folder._id} onClick={() => handleMoveToFolder(folder._id)} isDark={isDark}>
                  {folder.name}
                </DropdownItem>
              ))}
          </Dropdown>
        )}

        {/* More actions dropdown */}
        <Dropdown
          isDark={isDark}
          trigger={
            <button disabled={isLoading} className={buttonClass} title="More actions">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
              </svg>
            </button>
          }
        >
          <DropdownItem onClick={handleMarkAsRead} isDark={isDark}>Mark as read</DropdownItem>
          <DropdownItem onClick={handleMarkAsUnread} isDark={isDark}>Mark as unread</DropdownItem>
          <div className={`my-1 h-px ${isDark ? "bg-slate-700" : "bg-gray-200"}`} />
          <DropdownItem onClick={handleStar} isDark={isDark}>Star all</DropdownItem>
          <DropdownItem onClick={handleUnstar} isDark={isDark}>Remove stars</DropdownItem>
          <div className={`my-1 h-px ${isDark ? "bg-slate-700" : "bg-gray-200"}`} />
          <DropdownItem onClick={handleArchive} isDark={isDark}>Archive all</DropdownItem>
          <DropdownItem onClick={handleMoveToTrash} isDark={isDark}>Move to trash</DropdownItem>
          <div className={`my-1 h-px ${isDark ? "bg-slate-700" : "bg-gray-200"}`} />
          <DropdownItem onClick={() => setIsDeleteConfirmOpen(true)} isDark={isDark} danger>
            Delete permanently
          </DropdownItem>
        </Dropdown>

        {/* Message */}
        {message && (
          <span className={`ml-auto text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
            {message}
          </span>
        )}
      </div>

      {/* Delete confirmation modal */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className={`w-full max-w-md mx-4 rounded-xl shadow-2xl ${isDark ? "bg-slate-800" : "bg-white"}`}>
            <div className={`px-6 py-4 border-b ${isDark ? "border-slate-700" : "border-gray-200"}`}>
              <h2 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                Permanently delete emails?
              </h2>
            </div>
            <div className="px-6 py-4">
              <p className={isDark ? "text-slate-300" : "text-gray-600"}>
                This will permanently delete {selectedCount} email{selectedCount !== 1 ? "s" : ""}.
                This action cannot be undone.
              </p>
            </div>
            <div className={`flex justify-end gap-3 px-6 py-4 border-t ${isDark ? "border-slate-700" : "border-gray-200"}`}>
              <button
                onClick={() => setIsDeleteConfirmOpen(false)}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  isDark ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handlePermanentDelete}
                disabled={isLoading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg text-sm font-medium"
              >
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Compact selection checkbox for email list items
export function EmailSelectionCheckbox({
  emailId,
  selectedEmailIds,
  onToggle,
}: {
  emailId: Id<"emails">;
  selectedEmailIds: Id<"emails">[];
  onToggle: (emailId: Id<"emails">, selected: boolean) => void;
}) {
  const isSelected = selectedEmailIds.includes(emailId);

  return (
    <input
      type="checkbox"
      checked={isSelected}
      onChange={(e) => onToggle(emailId, e.target.checked)}
      onClick={(e) => e.stopPropagation()}
      className="w-4 h-4 mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
    />
  );
}

// Select all checkbox for header
export function SelectAllCheckbox({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
}: {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}) {
  const isAllSelected = selectedCount === totalCount && totalCount > 0;
  const isSomeSelected = selectedCount > 0 && selectedCount < totalCount;
  const checkboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = isSomeSelected;
    }
  }, [isSomeSelected]);

  return (
    <input
      ref={checkboxRef}
      type="checkbox"
      checked={isAllSelected}
      onChange={(e) => {
        if (e.target.checked) {
          onSelectAll();
        } else {
          onDeselectAll();
        }
      }}
      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
    />
  );
}
