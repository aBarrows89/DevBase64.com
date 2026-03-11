"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Protected from "@/app/protected";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/app/auth-context";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface EmailAccount {
  _id: Id<"emailAccounts">;
  name: string;
  emailAddress: string;
  provider: string;
  oauthProvider?: string;
  lastSyncAt?: number;
  syncStatus: string;
  syncError?: string;
  isActive: boolean;
  isPrimary: boolean;
  createdAt: number;
}

const providerConfig: Record<string, { name: string; icon: React.ReactNode; color: string }> = {
  gmail: {
    name: "Gmail",
    color: "from-red-500 to-orange-500",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 18h-2V9.25L12 13 6 9.25V18H4V6h1.2l6.8 4.25L18.8 6H20m0-2H4c-1.11 0-2 .89-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2z" />
      </svg>
    ),
  },
  outlook: {
    name: "Outlook",
    color: "from-blue-500 to-blue-700",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M7.88 12.04q0 .45-.11.87-.1.41-.33.74-.22.33-.58.52-.37.2-.87.2t-.85-.2q-.35-.21-.57-.55-.22-.33-.33-.75-.1-.42-.1-.86t.1-.87q.1-.43.34-.76.22-.34.59-.54.36-.2.87-.2t.86.2q.35.21.57.55.22.34.31.77.1.43.1.88zM24 12v9.38q0 .46-.33.8-.33.32-.8.32H7.13q-.46 0-.8-.33-.32-.33-.32-.8V18H1q-.41 0-.7-.3-.3-.29-.3-.7V7q0-.41.3-.7Q.58 6 1 6h6.5V2.55q0-.44.3-.75.3-.3.75-.3h12.9q.44 0 .75.3.3.3.3.75V12zm-6-8.25v3h3v-3h-3zm0 4.5v3h3v-3h-3zm0 4.5v1.83l3.05-1.83H18zm-5.25-9v3h3.75v-3h-3.75zm0 4.5v3h3.75v-3h-3.75zm0 4.5v2.03l2.41 1.5 1.34-.8v-2.73h-3.75zM9 3.75V6h2l.13.01.12.04v-2.3H9zM3.88 11.46q.06-.17.19-.29.13-.1.31-.1.17 0 .29.1.12.12.19.3.07.17.1.35.03.19.03.38t-.03.37q-.03.18-.1.35-.07.18-.19.3-.12.12-.29.12-.18 0-.31-.12-.13-.12-.19-.3-.06-.18-.09-.35-.03-.19-.03-.37t.03-.38q.03-.18.09-.35zM7.13 17h9.67v-2.9l-3.33 2.04-3.44-2.14-2.9 1.74V17zm8.36-4.13l-4.26 2.55-4.26-2.64L6 13.3V6H1.88v10.5h13.61z" />
      </svg>
    ),
  },
  yahoo: {
    name: "Yahoo",
    color: "from-purple-500 to-purple-700",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.996 4.003L17.004 4 19.5 9.747 22 4h4l-6.504 12.998L19.5 24h-4l.004-7.002L9 4h3.996z" />
        <path d="M2 4h4l2.496 6.248L6 10.5 2 4z" />
      </svg>
    ),
  },
  icloud: {
    name: "iCloud",
    color: "from-blue-400 to-blue-600",
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
      </svg>
    ),
  },
  imap: {
    name: "Custom IMAP",
    color: "from-gray-500 to-gray-700",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
      </svg>
    ),
  },
};

export default function EmailAccountsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [deletingId, setDeletingId] = useState<Id<"emailAccounts"> | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const accounts = useQuery(
    api.email.accounts.listByUser,
    user?._id ? { userId: user._id } : "skip"
  ) as EmailAccount[] | undefined;

  const setPrimary = useMutation(api.email.accounts.setPrimary);
  const deactivate = useMutation(api.email.accounts.deactivate);
  const reactivate = useMutation(api.email.accounts.reactivate);
  const remove = useMutation(api.email.accounts.remove);

  // Handle URL params for notifications
  useEffect(() => {
    const connected = searchParams.get("connected");
    const email = searchParams.get("email");
    const error = searchParams.get("error");

    if (connected && email) {
      setNotification({
        type: "success",
        message: `Successfully connected ${connected === "imap" ? "IMAP account" : connected} (${decodeURIComponent(email)})`,
      });
      router.replace("/email/accounts", { scroll: false });
    } else if (error) {
      const errorMessages: Record<string, string> = {
        state_expired: "Session expired. Please try again.",
        state_mismatch: "Security validation failed. Please try again.",
        token_exchange_failed: "Failed to authenticate with provider.",
        userinfo_failed: "Failed to get account information.",
        no_email: "Could not retrieve email address from provider.",
        callback_failed: "Authentication failed. Please try again.",
        missing_params: "Invalid OAuth response.",
      };
      setNotification({
        type: "error",
        message: errorMessages[error] || `Error: ${error}`,
      });
      router.replace("/email/accounts", { scroll: false });
    }
  }, [searchParams, router]);

  // Auto-dismiss notification
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleSetPrimary = async (accountId: Id<"emailAccounts">) => {
    if (!user?._id) return;
    try {
      await setPrimary({ accountId, userId: user._id });
    } catch {
      setNotification({ type: "error", message: "Failed to set primary account" });
    }
  };

  const handleToggleActive = async (account: EmailAccount) => {
    if (!user?._id) return;
    try {
      if (account.isActive) {
        await deactivate({ accountId: account._id, userId: user._id });
      } else {
        await reactivate({ accountId: account._id, userId: user._id });
      }
    } catch {
      setNotification({ type: "error", message: "Failed to update account status" });
    }
  };

  const handleDelete = async () => {
    if (!user?._id || !deletingId) return;
    try {
      await remove({ accountId: deletingId, userId: user._id });
      setShowDeleteConfirm(false);
      setDeletingId(null);
      setNotification({ type: "success", message: "Account removed successfully" });
    } catch {
      setNotification({ type: "error", message: "Failed to remove account" });
    }
  };

  const formatLastSync = (timestamp?: number) => {
    if (!timestamp) return "Never";
    const diff = Date.now() - timestamp;
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <Protected requireFlag="hasEmailAccess">
      <div className="min-h-screen theme-bg-primary flex">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-semibold theme-text-primary">Email Accounts</h1>
                <p className="theme-text-secondary">Manage your connected email accounts</p>
              </div>
              <button
                onClick={() => router.push("/email")}
                className="flex items-center gap-2 px-4 py-2 theme-bg-secondary rounded-lg theme-text-secondary hover:theme-text-primary transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Go to Inbox
              </button>
            </div>

            {/* Notification */}
            {notification && (
              <div
                className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
                  notification.type === "success"
                    ? "bg-green-500/10 border border-green-500/20 text-green-400"
                    : "bg-red-500/10 border border-red-500/20 text-red-400"
                }`}
              >
                {notification.type === "success" ? (
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                )}
                <span>{notification.message}</span>
                <button
                  onClick={() => setNotification(null)}
                  className="ml-auto hover:opacity-70"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* Connected Accounts */}
            <div className="mb-8">
              <h2 className="text-lg font-medium theme-text-primary mb-4">Connected Accounts</h2>
              {accounts === undefined ? (
                <div className="theme-bg-secondary rounded-xl p-8 flex items-center justify-center">
                  <svg className="animate-spin w-6 h-6 theme-text-secondary" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
              ) : accounts.length === 0 ? (
                <div className="theme-bg-secondary rounded-xl p-8 text-center">
                  <svg className="w-12 h-12 mx-auto mb-4 theme-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <p className="theme-text-secondary">No email accounts connected yet</p>
                  <p className="theme-text-tertiary text-sm mt-1">Connect an account below to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {accounts.map((account) => {
                    const config = providerConfig[account.provider] || providerConfig.imap;
                    return (
                      <div
                        key={account._id}
                        className={`theme-bg-secondary rounded-xl p-4 ${!account.isActive ? "opacity-60" : ""}`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${config.color} flex items-center justify-center text-white`}>
                            {config.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium theme-text-primary truncate">{account.emailAddress}</h3>
                              {account.isPrimary && (
                                <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded-full">
                                  Primary
                                </span>
                              )}
                              {!account.isActive && (
                                <span className="px-2 py-0.5 text-xs bg-gray-500/20 theme-text-tertiary rounded-full">
                                  Inactive
                                </span>
                              )}
                            </div>
                            <p className="text-sm theme-text-secondary">{account.name} &middot; {config.name}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs theme-text-tertiary">
                              <span className="flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Last sync: {formatLastSync(account.lastSyncAt)}
                              </span>
                              {account.syncError && (
                                <span className="text-red-400 flex items-center gap-1">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                  </svg>
                                  Error
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {!account.isPrimary && account.isActive && (
                              <button
                                onClick={() => handleSetPrimary(account._id)}
                                className="p-2 rounded-lg theme-bg-primary hover:bg-blue-500/10 hover:text-blue-400 transition-colors"
                                title="Set as primary"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                </svg>
                              </button>
                            )}
                            <button
                              onClick={() => handleToggleActive(account)}
                              className={`p-2 rounded-lg theme-bg-primary transition-colors ${
                                account.isActive
                                  ? "hover:bg-yellow-500/10 hover:text-yellow-400"
                                  : "hover:bg-green-500/10 hover:text-green-400"
                              }`}
                              title={account.isActive ? "Deactivate" : "Reactivate"}
                            >
                              {account.isActive ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              )}
                            </button>
                            <button
                              onClick={() => {
                                setDeletingId(account._id);
                                setShowDeleteConfirm(true);
                              }}
                              className="p-2 rounded-lg theme-bg-primary hover:bg-red-500/10 hover:text-red-400 transition-colors"
                              title="Remove account"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Add Account */}
            <div>
              <h2 className="text-lg font-medium theme-text-primary mb-4">Add Account</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Gmail */}
                <button
                  onClick={() => user && window.location.assign(`/api/email/oauth/google?userId=${user._id}`)}
                  className="theme-bg-secondary rounded-xl p-4 text-left hover:ring-2 hover:ring-blue-500/50 transition-all group"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white">
                      {providerConfig.gmail.icon}
                    </div>
                    <div>
                      <h3 className="font-medium theme-text-primary">Gmail</h3>
                      <p className="text-xs theme-text-secondary">Connect with Google</p>
                    </div>
                  </div>
                </button>

                {/* Outlook */}
                <button
                  onClick={() => user && window.location.assign(`/api/email/oauth/microsoft?userId=${user._id}`)}
                  className="theme-bg-secondary rounded-xl p-4 text-left hover:ring-2 hover:ring-blue-500/50 transition-all group"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white">
                      {providerConfig.outlook.icon}
                    </div>
                    <div>
                      <h3 className="font-medium theme-text-primary">Outlook</h3>
                      <p className="text-xs theme-text-secondary">Connect with Microsoft</p>
                    </div>
                  </div>
                </button>

                {/* Yahoo */}
                <button
                  onClick={() => user && window.location.assign(`/api/email/oauth/yahoo?userId=${user._id}`)}
                  className="theme-bg-secondary rounded-xl p-4 text-left hover:ring-2 hover:ring-blue-500/50 transition-all group"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white">
                      {providerConfig.yahoo.icon}
                    </div>
                    <div>
                      <h3 className="font-medium theme-text-primary">Yahoo Mail</h3>
                      <p className="text-xs theme-text-secondary">Connect with Yahoo</p>
                    </div>
                  </div>
                </button>

                {/* iCloud */}
                <button
                  onClick={() => router.push("/email/accounts/connect/icloud")}
                  className="theme-bg-secondary rounded-xl p-4 text-left hover:ring-2 hover:ring-blue-500/50 transition-all group"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white">
                      {providerConfig.icloud.icon}
                    </div>
                    <div>
                      <h3 className="font-medium theme-text-primary">iCloud Mail</h3>
                      <p className="text-xs theme-text-secondary">Use app-specific password</p>
                    </div>
                  </div>
                </button>

                {/* Custom IMAP */}
                <button
                  onClick={() => router.push("/email/accounts/connect/imap")}
                  className="theme-bg-secondary rounded-xl p-4 text-left hover:ring-2 hover:ring-blue-500/50 transition-all group"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-500 to-gray-700 flex items-center justify-center text-white">
                      {providerConfig.imap.icon}
                    </div>
                    <div>
                      <h3 className="font-medium theme-text-primary">Custom IMAP</h3>
                      <p className="text-xs theme-text-secondary">Any IMAP/SMTP server</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="theme-bg-primary rounded-xl p-6 max-w-md mx-4 shadow-xl">
                <h3 className="text-lg font-semibold theme-text-primary mb-2">Remove Account?</h3>
                <p className="theme-text-secondary mb-6">
                  This will permanently delete this email account and all associated emails, drafts, and attachments. This action cannot be undone.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeletingId(null);
                    }}
                    className="px-4 py-2 theme-bg-secondary rounded-lg theme-text-secondary hover:theme-text-primary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    Remove Account
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </Protected>
  );
}
