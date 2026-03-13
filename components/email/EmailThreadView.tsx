"use client";

import { useState, useRef, useEffect } from "react";
import { Id } from "@/convex/_generated/dataModel";

interface Email {
  _id: Id<"emails">;
  subject: string;
  from: { name?: string; address: string };
  to: { name?: string; address: string }[];
  cc?: { name?: string; address: string }[];
  bcc?: { name?: string; address: string }[];
  date: number;
  bodyHtml?: string;
  bodyText?: string;
  snippet: string;
  isRead: boolean;
  isStarred: boolean;
  hasAttachments: boolean;
  threadId?: string;
}

interface EmailThreadViewProps {
  emails: Email[];
  isDark?: boolean;
  onReply?: (email: Email) => void;
  onReplyAll?: (email: Email) => void;
  onForward?: (email: Email) => void;
  onStar?: (email: Email) => void;
  onArchive?: (email: Email) => void;
  onDelete?: (email: Email) => void;
  onSnooze?: (email: Email) => void;
  onLabel?: (email: Email) => void;
}

// Simple date formatting
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = diff / (1000 * 60 * 60 * 24);

  const timeStr = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  if (days < 1) {
    return timeStr;
  } else if (days < 7) {
    const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
    const monthDay = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${dayName}, ${monthDay}, ${timeStr}`;
  } else {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + ", " + timeStr;
  }
}

function formatFullDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

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
          className={`absolute top-full right-0 mt-1 py-1 rounded-lg shadow-lg border z-50 min-w-[160px] ${
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
  onClick?: () => void;
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

function EmailMessage({
  email,
  isExpanded: initialExpanded,
  isFirst,
  isLast,
  isDark,
  onReply,
  onReplyAll,
  onForward,
  onStar,
  onArchive,
  onDelete,
  onSnooze,
  onLabel,
}: {
  email: Email;
  isExpanded: boolean;
  isFirst: boolean;
  isLast: boolean;
  isDark?: boolean;
  onReply?: (email: Email) => void;
  onReplyAll?: (email: Email) => void;
  onForward?: (email: Email) => void;
  onStar?: (email: Email) => void;
  onArchive?: (email: Email) => void;
  onDelete?: (email: Email) => void;
  onSnooze?: (email: Email) => void;
  onLabel?: (email: Email) => void;
}) {
  const [isOpen, setIsOpen] = useState(initialExpanded);

  const getInitials = (name?: string, emailAddr?: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return emailAddr?.charAt(0).toUpperCase() || "?";
  };

  const formatRecipients = (recipients: { name?: string; address: string }[]) => {
    return recipients.map((r) => r.name || r.address).join(", ");
  };

  const buttonClass = `p-2 rounded-lg transition-colors ${
    isDark ? "hover:bg-slate-700 text-slate-300" : "hover:bg-gray-100 text-gray-600"
  }`;

  const outlineButtonClass = `px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors flex items-center gap-1 ${
    isDark
      ? "border-slate-600 hover:bg-slate-700 text-slate-200"
      : "border-gray-300 hover:bg-gray-50 text-gray-700"
  }`;

  return (
    <div
      className={`border-b ${isDark ? "border-slate-700" : "border-gray-200"} ${
        isFirst ? "rounded-t-lg" : ""
      } ${isLast ? "rounded-b-lg border-b-0" : ""}`}
    >
      {/* Header */}
      <div
        className={`flex items-center gap-3 p-4 cursor-pointer ${
          isDark ? "hover:bg-slate-700/50" : "hover:bg-gray-50"
        } ${!isOpen ? "" : isDark ? "bg-slate-700/30" : "bg-gray-50"}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
            isDark ? "bg-slate-600 text-white" : "bg-gray-200 text-gray-700"
          }`}
        >
          {getInitials(email.from.name, email.from.address)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-medium truncate ${isDark ? "text-white" : "text-gray-900"}`}>
              {email.from.name || email.from.address}
            </span>
            {email.isStarred && (
              <svg className="w-4 h-4 fill-yellow-400 text-yellow-400" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            )}
            {email.hasAttachments && (
              <svg className={`w-4 h-4 ${isDark ? "text-slate-400" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            )}
          </div>
          {!isOpen && (
            <p className={`text-sm truncate ${isDark ? "text-slate-400" : "text-gray-500"}`}>
              {email.snippet}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-sm whitespace-nowrap ${isDark ? "text-slate-400" : "text-gray-500"}`}>
            {formatDate(email.date)}
          </span>
          <svg
            className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""} ${isDark ? "text-slate-400" : "text-gray-400"}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Expanded Content */}
      {isOpen && (
        <div className="px-4 pb-4 pt-2">
          {/* Email Details */}
          <div className={`mb-4 text-sm ${isDark ? "text-slate-300" : "text-gray-600"}`}>
            <div className="flex items-start gap-2">
              <span className={`w-12 ${isDark ? "text-slate-400" : "text-gray-500"}`}>From:</span>
              <span>
                {email.from.name && <span className="font-medium">{email.from.name} </span>}
                <span className="text-blue-500">&lt;{email.from.address}&gt;</span>
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className={`w-12 ${isDark ? "text-slate-400" : "text-gray-500"}`}>To:</span>
              <span>{formatRecipients(email.to)}</span>
            </div>
            {email.cc && email.cc.length > 0 && (
              <div className="flex items-start gap-2">
                <span className={`w-12 ${isDark ? "text-slate-400" : "text-gray-500"}`}>Cc:</span>
                <span>{formatRecipients(email.cc)}</span>
              </div>
            )}
            <div className="flex items-start gap-2">
              <span className={`w-12 ${isDark ? "text-slate-400" : "text-gray-500"}`}>Date:</span>
              <span>{formatFullDate(email.date)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <button className={outlineButtonClass} onClick={() => onReply?.(email)}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              Reply
            </button>
            <button className={outlineButtonClass} onClick={() => onReplyAll?.(email)}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              Reply All
            </button>
            <button className={outlineButtonClass} onClick={() => onForward?.(email)}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
              Forward
            </button>

            <div className="flex-1" />

            <button className={buttonClass} onClick={() => onStar?.(email)}>
              <svg
                className={`w-4 h-4 ${email.isStarred ? "fill-yellow-400 text-yellow-400" : ""}`}
                fill={email.isStarred ? "currentColor" : "none"}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </button>

            <Dropdown
              isDark={isDark}
              trigger={
                <button className={buttonClass}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                  </svg>
                </button>
              }
            >
              <DropdownItem onClick={() => onArchive?.(email)} isDark={isDark}>Archive</DropdownItem>
              <DropdownItem onClick={() => onSnooze?.(email)} isDark={isDark}>Snooze</DropdownItem>
              <DropdownItem onClick={() => onLabel?.(email)} isDark={isDark}>Add Label</DropdownItem>
              <div className={`my-1 h-px ${isDark ? "bg-slate-700" : "bg-gray-200"}`} />
              <DropdownItem isDark={isDark}>Print</DropdownItem>
              <DropdownItem isDark={isDark}>Download</DropdownItem>
              <div className={`my-1 h-px ${isDark ? "bg-slate-700" : "bg-gray-200"}`} />
              <DropdownItem onClick={() => onDelete?.(email)} isDark={isDark} danger>Delete</DropdownItem>
            </Dropdown>
          </div>

          {/* Email Body */}
          <div className={`border rounded-lg p-4 ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
            {email.bodyHtml ? (
              <div
                className={`prose prose-sm max-w-none ${isDark ? "prose-invert" : ""}`}
                dangerouslySetInnerHTML={{ __html: email.bodyHtml }}
              />
            ) : (
              <pre className={`whitespace-pre-wrap font-sans text-sm ${isDark ? "text-slate-200" : "text-gray-800"}`}>
                {email.bodyText || email.snippet}
              </pre>
            )}
          </div>

          {/* Attachments */}
          {email.hasAttachments && (
            <div className="mt-4">
              <div className={`flex items-center gap-2 text-sm mb-2 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                <span>Attachments</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function EmailThreadView({
  emails,
  isDark = false,
  onReply,
  onReplyAll,
  onForward,
  onStar,
  onArchive,
  onDelete,
  onSnooze,
  onLabel,
}: EmailThreadViewProps) {
  if (emails.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full ${isDark ? "text-slate-400" : "text-gray-500"}`}>
        No emails in thread
      </div>
    );
  }

  // Sort emails by date (oldest first for thread view)
  const sortedEmails = [...emails].sort((a, b) => a.date - b.date);

  // Get thread subject from first email
  const subject = sortedEmails[0].subject.replace(/^(Re:|Fwd:)\s*/gi, "").trim();

  const primaryButtonClass = `px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 ${
    isDark
      ? "bg-blue-600 hover:bg-blue-700 text-white"
      : "bg-blue-600 hover:bg-blue-700 text-white"
  }`;

  const outlineButtonClass = `px-4 py-2 text-sm font-medium rounded-lg border flex items-center gap-2 ${
    isDark
      ? "border-slate-600 hover:bg-slate-700 text-slate-200"
      : "border-gray-300 hover:bg-gray-50 text-gray-700"
  }`;

  return (
    <div className="flex flex-col h-full">
      {/* Thread Header */}
      <div className={`p-4 border-b ${isDark ? "border-slate-700" : "border-gray-200"}`}>
        <h1 className={`text-xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>{subject}</h1>
        <div className={`flex items-center gap-2 mt-1 text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
          <span>{emails.length} messages in conversation</span>
          {emails.some((e) => e.isStarred) && (
            <span className={`px-2 py-0.5 text-xs rounded flex items-center gap-1 ${isDark ? "bg-slate-700" : "bg-gray-100"}`}>
              <svg className="w-3 h-3 fill-yellow-400 text-yellow-400" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              Starred
            </span>
          )}
        </div>
      </div>

      {/* Thread Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className={`border rounded-lg ${isDark ? "border-slate-700" : "border-gray-200"}`}>
          {sortedEmails.map((email, index) => (
            <EmailMessage
              key={email._id}
              email={email}
              isExpanded={index === sortedEmails.length - 1}
              isFirst={index === 0}
              isLast={index === sortedEmails.length - 1}
              isDark={isDark}
              onReply={onReply}
              onReplyAll={onReplyAll}
              onForward={onForward}
              onStar={onStar}
              onArchive={onArchive}
              onDelete={onDelete}
              onSnooze={onSnooze}
              onLabel={onLabel}
            />
          ))}
        </div>
      </div>

      {/* Quick Reply Section */}
      <div className={`p-4 border-t ${isDark ? "border-slate-700" : "border-gray-200"}`}>
        <div className="flex gap-2">
          <button
            className={`flex-1 ${primaryButtonClass}`}
            onClick={() => onReply?.(sortedEmails[sortedEmails.length - 1])}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            Reply
          </button>
          <button
            className={outlineButtonClass}
            onClick={() => onReplyAll?.(sortedEmails[sortedEmails.length - 1])}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            Reply All
          </button>
          <button
            className={outlineButtonClass}
            onClick={() => onForward?.(sortedEmails[sortedEmails.length - 1])}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
            Forward
          </button>
        </div>
      </div>
    </div>
  );
}

// Thread list item for email list view
export function EmailThreadListItem({
  emails,
  isSelected,
  isDark = false,
  onClick,
  onSelect,
}: {
  emails: Email[];
  isSelected: boolean;
  isDark?: boolean;
  onClick: () => void;
  onSelect?: (selected: boolean) => void;
}) {
  if (emails.length === 0) return null;

  // Sort by date desc to get latest
  const sortedEmails = [...emails].sort((a, b) => b.date - a.date);
  const latestEmail = sortedEmails[0];
  const hasUnread = emails.some((e) => !e.isRead);
  const hasStarred = emails.some((e) => e.isStarred);
  const hasAttachments = emails.some((e) => e.hasAttachments);

  // Get unique senders
  const senders = [...new Set(emails.map((e) => e.from.name || e.from.address))];
  const displaySenders =
    senders.length <= 3
      ? senders.join(", ")
      : `${senders.slice(0, 2).join(", ")} +${senders.length - 2}`;

  const formatShortDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = diff / (1000 * 60 * 60 * 24);

    if (days < 1) {
      return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    } else if (days < 7) {
      return date.toLocaleDateString("en-US", { weekday: "short" });
    } else {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
  };

  return (
    <div
      className={`flex items-start gap-3 p-3 cursor-pointer border-b ${
        isDark ? "border-slate-700 hover:bg-slate-700/50" : "border-gray-200 hover:bg-gray-50"
      } ${isSelected ? (isDark ? "bg-slate-700" : "bg-gray-100") : hasUnread ? (isDark ? "bg-blue-900/20" : "bg-blue-50") : ""}`}
      onClick={onClick}
    >
      {onSelect && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            onSelect(e.target.checked);
          }}
          className="mt-1 w-4 h-4 rounded border-gray-300"
        />
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`font-medium truncate ${hasUnread ? "font-bold" : ""} ${isDark ? "text-white" : "text-gray-900"}`}>
            {displaySenders}
          </span>
          {emails.length > 1 && (
            <span className={`px-1.5 py-0.5 text-xs rounded ${isDark ? "bg-slate-600 text-slate-300" : "bg-gray-200 text-gray-600"}`}>
              {emails.length}
            </span>
          )}
          {hasStarred && (
            <svg className="w-4 h-4 fill-yellow-400 text-yellow-400 flex-shrink-0" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          )}
          {hasAttachments && (
            <svg className={`w-4 h-4 flex-shrink-0 ${isDark ? "text-slate-400" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          )}
        </div>
        <div className={`text-sm truncate ${hasUnread ? "font-semibold" : ""} ${isDark ? "text-slate-200" : "text-gray-800"}`}>
          {latestEmail.subject}
        </div>
        <p className={`text-sm truncate ${isDark ? "text-slate-400" : "text-gray-500"}`}>
          {latestEmail.snippet}
        </p>
      </div>

      <span className={`text-sm whitespace-nowrap ${isDark ? "text-slate-400" : "text-gray-500"}`}>
        {formatShortDate(latestEmail.date)}
      </span>
    </div>
  );
}
