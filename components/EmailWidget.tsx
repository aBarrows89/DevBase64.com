"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { useTheme } from "@/app/theme-context";
import { useAuth } from "@/app/auth-context";
import { Id } from "@/convex/_generated/dataModel";

function timeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function EmailWidget() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { user } = useAuth();

  const accounts = useQuery(
    api.email.accounts.listByUser,
    user?._id ? { userId: user._id } : "skip"
  );

  const primaryAccount = accounts?.find((a) => a.isPrimary) || accounts?.[0];

  const unreadEmails = useQuery(
    api.email.emails.getUnreadInbox,
    primaryAccount?._id ? { accountId: primaryAccount._id as Id<"emailAccounts">, limit: 5 } : "skip"
  );

  const folders = useQuery(
    api.email.folders.listByAccount,
    primaryAccount?._id ? { accountId: primaryAccount._id as Id<"emailAccounts"> } : "skip"
  );

  const inboxFolder = folders?.find((f) => f.type === "inbox");
  const unreadCount = inboxFolder?.unreadCount || 0;

  // No email access or no accounts
  if (accounts !== undefined && accounts.length === 0) {
    return (
      <div className={`border rounded-xl p-4 sm:p-6 ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm"}`}>
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center gap-2">
            <svg className={`w-5 h-5 ${isDark ? "text-cyan-400" : "text-blue-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <h2 className={`text-base sm:text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
              Email
            </h2>
          </div>
        </div>
        <div className={`text-center py-8 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
          <svg className="w-10 h-10 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <p className="text-sm mb-2">No email accounts connected</p>
          <Link
            href="/email/accounts"
            className={`text-sm font-medium transition-colors ${isDark ? "text-cyan-400 hover:text-cyan-300" : "text-blue-600 hover:text-blue-700"}`}
          >
            Connect an account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`border rounded-xl p-4 sm:p-6 ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm"}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div className="flex items-center gap-2">
          <svg className={`w-5 h-5 ${isDark ? "text-cyan-400" : "text-blue-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <h2 className={`text-base sm:text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
            Email
          </h2>
          {unreadCount > 0 && (
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${isDark ? "bg-cyan-500/20 text-cyan-400" : "bg-blue-100 text-blue-600"}`}>
              {unreadCount} unread
            </span>
          )}
        </div>
        <Link
          href="/email"
          className={`text-sm transition-colors ${isDark ? "text-cyan-400 hover:text-cyan-300" : "text-blue-600 hover:text-blue-700"}`}
        >
          View all
        </Link>
      </div>

      {/* Loading */}
      {!unreadEmails ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-500"></div>
        </div>
      ) : unreadEmails.length === 0 ? (
        /* Empty state */
        <div className={`text-center py-8 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
          <svg className="w-10 h-10 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm">All caught up! No unread emails.</p>
        </div>
      ) : (
        /* Email list */
        <div className="space-y-1">
          {unreadEmails.map((email) => (
            <Link
              key={email._id}
              href="/email"
              className={`block p-3 rounded-lg transition-colors ${isDark ? "hover:bg-slate-700/50" : "hover:bg-gray-50"}`}
            >
              <div className="flex items-start gap-3">
                {/* Unread dot */}
                <div className="flex-shrink-0 mt-2">
                  <div className={`w-2 h-2 rounded-full ${isDark ? "bg-cyan-400" : "bg-blue-500"}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className={`text-sm font-semibold truncate ${isDark ? "text-white" : "text-gray-900"}`}>
                      {email.from.name || email.from.address}
                    </span>
                    <span className={`text-xs flex-shrink-0 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                      {timeAgo(email.date)}
                    </span>
                  </div>
                  <p className={`text-sm truncate ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                    {email.subject}
                  </p>
                  <p className={`text-xs truncate mt-0.5 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                    {email.snippet}
                  </p>
                </div>

                {/* Attachment indicator */}
                {email.hasAttachments && (
                  <div className={`flex-shrink-0 mt-1 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </div>
                )}
              </div>
            </Link>
          ))}

          {unreadCount > 5 && (
            <Link
              href="/email"
              className={`block text-center text-sm py-2 mt-2 ${isDark ? "text-cyan-400 hover:text-cyan-300" : "text-blue-600 hover:text-blue-700"}`}
            >
              View all {unreadCount} unread emails
            </Link>
          )}
        </div>
      )}

      {/* Folder summary bar */}
      {folders && folders.length > 0 && (
        <div className={`flex items-center gap-4 mt-4 pt-4 border-t ${isDark ? "border-slate-700" : "border-gray-100"}`}>
          {folders.filter((f) => ["inbox", "sent", "drafts"].includes(f.type)).map((folder) => (
            <Link
              key={folder._id}
              href="/email"
              className={`flex items-center gap-1.5 text-xs transition-colors ${isDark ? "text-slate-400 hover:text-slate-300" : "text-gray-500 hover:text-gray-700"}`}
            >
              {folder.type === "inbox" && (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              )}
              {folder.type === "sent" && (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
              {folder.type === "drafts" && (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              )}
              <span className="capitalize">{folder.type}</span>
              <span className={`font-medium ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                {folder.type === "inbox" ? folder.unreadCount : folder.totalCount}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
