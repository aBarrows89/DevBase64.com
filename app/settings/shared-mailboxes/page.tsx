"use client";

import { useState } from "react";
import Protected from "../../protected";
import Sidebar, { MobileHeader } from "@/components/Sidebar";
import { useAuth } from "../../auth-context";
import { useTheme } from "../../theme-context";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";

interface SharedMailbox {
  _id: Id<"sharedMailboxes">;
  accountId: Id<"emailAccounts">;
  name: string;
  description?: string;
  ownerUserId: Id<"users">;
  memberUserIds: Id<"users">[];
  permissions: {
    canRead: boolean;
    canSend: boolean;
    canDelete: boolean;
    canManageMembers: boolean;
  };
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

const DEFAULT_PERMISSIONS = {
  canRead: true,
  canSend: false,
  canDelete: false,
  canManageMembers: false,
};

function SharedMailboxesContent() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const mailboxes = useQuery(api.email.sharedMailboxes.listAll);
  const emailAccounts = useQuery(
    api.email.accounts.listByUser,
    user?._id ? { userId: user._id } : "skip"
  );
  const allUsers = useQuery(api.auth.getAllUsers);

  const createMailbox = useMutation(api.email.sharedMailboxes.create);
  const updateMailbox = useMutation(api.email.sharedMailboxes.update);
  const addMember = useMutation(api.email.sharedMailboxes.addMember);
  const removeMember = useMutation(api.email.sharedMailboxes.removeMember);
  const removeMailbox = useMutation(api.email.sharedMailboxes.remove);

  const [showModal, setShowModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [selectedMailboxId, setSelectedMailboxId] = useState<Id<"sharedMailboxes"> | null>(null);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [form, setForm] = useState({
    accountId: "",
    name: "",
    description: "",
    permissions: DEFAULT_PERMISSIONS,
  });

  const [memberForm, setMemberForm] = useState({
    userId: "",
  });

  const openCreate = () => {
    setForm({
      accountId: "",
      name: "",
      description: "",
      permissions: DEFAULT_PERMISSIONS,
    });
    setError("");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?._id || !form.accountId || !form.name) {
      setError("Please fill in all required fields");
      return;
    }

    setError("");
    setIsSaving(true);

    try {
      await createMailbox({
        accountId: form.accountId as Id<"emailAccounts">,
        name: form.name,
        description: form.description || undefined,
        createdBy: user._id,
        permissions: form.permissions,
      });
      setShowModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create shared mailbox");
    } finally {
      setIsSaving(false);
    }
  };

  const openAddMember = (mailboxId: Id<"sharedMailboxes">) => {
    setSelectedMailboxId(mailboxId);
    setMemberForm({ userId: "" });
    setError("");
    setShowMemberModal(true);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?._id || !selectedMailboxId || !memberForm.userId) {
      setError("Please select a user");
      return;
    }

    setError("");
    setIsSaving(true);

    try {
      await addMember({
        sharedMailboxId: selectedMailboxId,
        newUserId: memberForm.userId as Id<"users">,
        addedBy: user._id,
      });
      setShowMemberModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add member");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveMember = async (mailboxId: Id<"sharedMailboxes">, userIdToRemove: Id<"users">) => {
    if (!user?._id) return;
    if (!confirm("Remove this member from the shared mailbox?")) return;

    try {
      await removeMember({
        sharedMailboxId: mailboxId,
        userIdToRemove,
        removedBy: user._id,
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove member");
    }
  };

  const handleToggleActive = async (mailbox: SharedMailbox) => {
    if (!user?._id) return;

    try {
      await updateMailbox({
        sharedMailboxId: mailbox._id,
        userId: user._id,
        isActive: !mailbox.isActive,
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update mailbox");
    }
  };

  const handleDelete = async (mailboxId: Id<"sharedMailboxes">) => {
    if (!user?._id) return;
    if (!confirm("Are you sure you want to delete this shared mailbox?")) return;

    try {
      await removeMailbox({
        sharedMailboxId: mailboxId,
        userId: user._id,
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete mailbox");
    }
  };

  const getUserName = (userId: Id<"users">) => {
    const u = allUsers?.find((u) => u._id === userId);
    return u?.name || u?.email || "Unknown";
  };

  return (
    <div className="h-screen theme-bg-primary flex overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto p-8">
        <MobileHeader />
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Link
                  href="/settings"
                  className={`p-2 rounded-lg ${isDark ? "hover:bg-slate-700" : "hover:bg-gray-100"}`}
                >
                  <svg className="w-5 h-5 theme-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </Link>
                <h1 className="text-2xl font-bold theme-text-primary">Shared Mailboxes</h1>
              </div>
              <p className="theme-text-secondary">
                Manage shared email accounts accessible by multiple users.
              </p>
            </div>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Shared Mailbox
            </button>
          </div>

          {/* Mailboxes List */}
          <div className="space-y-4">
            {!mailboxes ? (
              <div className={`rounded-xl border p-8 text-center ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200"}`}>
                <svg className="w-8 h-8 mx-auto mb-2 animate-spin theme-text-tertiary" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="theme-text-secondary">Loading shared mailboxes...</p>
              </div>
            ) : mailboxes.length === 0 ? (
              <div className={`rounded-xl border p-8 text-center ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200"}`}>
                <svg className="w-16 h-16 mx-auto mb-4 theme-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h3 className="text-lg font-semibold theme-text-primary mb-2">No Shared Mailboxes</h3>
                <p className="theme-text-secondary mb-4">
                  Create a shared mailbox to allow multiple users to access the same email account.
                </p>
                <button
                  onClick={openCreate}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Create Shared Mailbox
                </button>
              </div>
            ) : (
              mailboxes.map(({ mailbox, account, owner, memberCount }) => (
                <div
                  key={mailbox._id}
                  className={`rounded-xl border ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200"}`}
                >
                  {/* Mailbox Header */}
                  <div className={`px-6 py-4 border-b ${isDark ? "border-slate-700" : "border-gray-200"}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isDark ? "bg-blue-500/20" : "bg-blue-100"}`}>
                          <svg className={`w-6 h-6 ${isDark ? "text-blue-400" : "text-blue-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold theme-text-primary">{mailbox.name}</h3>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                              mailbox.isActive
                                ? "bg-green-500/20 text-green-400"
                                : isDark ? "bg-slate-600 text-slate-400" : "bg-gray-200 text-gray-500"
                            }`}>
                              {mailbox.isActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <p className="text-sm theme-text-secondary flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            {account?.emailAddress || "Unknown account"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleActive(mailbox)}
                          className={`px-3 py-1.5 text-sm font-medium rounded-lg ${
                            isDark ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                          }`}
                        >
                          {mailbox.isActive ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() => handleDelete(mailbox._id)}
                          className={`p-1.5 rounded text-red-500 ${isDark ? "hover:bg-red-500/20" : "hover:bg-red-50"}`}
                          title="Delete"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    {mailbox.description && (
                      <p className="mt-2 text-sm theme-text-tertiary">{mailbox.description}</p>
                    )}
                  </div>

                  {/* Members Section */}
                  <div className="px-6 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium theme-text-primary flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        Members ({memberCount + 1})
                      </h4>
                      <button
                        onClick={() => openAddMember(mailbox._id)}
                        className={`flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg ${
                          isDark ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                        Add
                      </button>
                    </div>

                    <div className="space-y-2">
                      {/* Owner */}
                      <div className={`flex items-center justify-between p-3 rounded-lg ${isDark ? "bg-slate-700/50" : "bg-gray-50"}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? "bg-yellow-500/20 text-yellow-400" : "bg-yellow-100 text-yellow-600"}`}>
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium theme-text-primary">{owner?.userName || "Unknown"}</p>
                            <p className="text-xs theme-text-tertiary">Owner</p>
                          </div>
                        </div>
                        <span className="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-400">
                          Full Access
                        </span>
                      </div>

                      {/* Members */}
                      {mailbox.memberUserIds.map((memberId) => (
                        <div
                          key={memberId}
                          className={`flex items-center justify-between p-3 rounded-lg ${isDark ? "bg-slate-700/50" : "bg-gray-50"}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? "bg-slate-600" : "bg-gray-200"}`}>
                              <svg className="w-4 h-4 theme-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                            <div>
                              <p className="font-medium theme-text-primary">{getUserName(memberId)}</p>
                              <p className="text-xs theme-text-tertiary">Member</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-400">
                              {mailbox.permissions.canSend ? "Read/Write" : "Read Only"}
                            </span>
                            <button
                              onClick={() => handleRemoveMember(mailbox._id, memberId)}
                              className={`p-1 rounded text-red-500 ${isDark ? "hover:bg-red-500/20" : "hover:bg-red-50"}`}
                              title="Remove member"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}

                      {mailbox.memberUserIds.length === 0 && (
                        <p className="text-sm theme-text-tertiary text-center py-2">
                          No members added yet
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Create Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className={`w-full max-w-lg mx-4 rounded-xl shadow-2xl ${isDark ? "bg-slate-800" : "bg-white"}`}>
              <div className={`px-6 py-4 border-b ${isDark ? "border-slate-700" : "border-gray-200"} flex items-center justify-between`}>
                <h2 className="text-lg font-semibold theme-text-primary">Create Shared Mailbox</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className={`p-2 rounded-lg ${isDark ? "hover:bg-slate-700" : "hover:bg-gray-100"}`}
                >
                  <svg className="w-5 h-5 theme-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {error && (
                  <div className="p-3 bg-red-500/10 text-red-500 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                    Email Account *
                  </label>
                  <select
                    value={form.accountId}
                    onChange={(e) => setForm({ ...form, accountId: e.target.value })}
                    required
                    className={`w-full px-3 py-2 rounded-lg border ${
                      isDark
                        ? "bg-slate-700 border-slate-600 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  >
                    <option value="">Select an email account</option>
                    {emailAccounts?.map((account) => (
                      <option key={account._id} value={account._id}>
                        {account.emailAddress}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                    Mailbox Name *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g., Support Team"
                    required
                    className={`w-full px-3 py-2 rounded-lg border ${
                      isDark
                        ? "bg-slate-700 border-slate-600 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                    Description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Optional description"
                    rows={2}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      isDark
                        ? "bg-slate-700 border-slate-600 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                    Default Member Permissions
                  </label>
                  <div className="space-y-2">
                    {[
                      { key: "canRead", label: "Can Read Emails" },
                      { key: "canSend", label: "Can Send Emails" },
                      { key: "canDelete", label: "Can Delete Emails" },
                      { key: "canManageMembers", label: "Can Manage Members" },
                    ].map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={form.permissions[key as keyof typeof form.permissions]}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              permissions: { ...form.permissions, [key]: e.target.checked },
                            })
                          }
                          className="rounded border-gray-300"
                        />
                        <span className={`text-sm ${isDark ? "text-slate-300" : "text-gray-700"}`}>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className={`flex justify-end gap-3 pt-4 border-t ${isDark ? "border-slate-700" : "border-gray-200"}`}>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      isDark ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium"
                  >
                    {isSaving ? "Creating..." : "Create"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Member Modal */}
        {showMemberModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className={`w-full max-w-md mx-4 rounded-xl shadow-2xl ${isDark ? "bg-slate-800" : "bg-white"}`}>
              <div className={`px-6 py-4 border-b ${isDark ? "border-slate-700" : "border-gray-200"} flex items-center justify-between`}>
                <h2 className="text-lg font-semibold theme-text-primary">Add Member</h2>
                <button
                  onClick={() => setShowMemberModal(false)}
                  className={`p-2 rounded-lg ${isDark ? "hover:bg-slate-700" : "hover:bg-gray-100"}`}
                >
                  <svg className="w-5 h-5 theme-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleAddMember} className="p-6 space-y-4">
                {error && (
                  <div className="p-3 bg-red-500/10 text-red-500 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                    Select User *
                  </label>
                  <select
                    value={memberForm.userId}
                    onChange={(e) => setMemberForm({ ...memberForm, userId: e.target.value })}
                    required
                    className={`w-full px-3 py-2 rounded-lg border ${
                      isDark
                        ? "bg-slate-700 border-slate-600 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  >
                    <option value="">Select a user</option>
                    {allUsers?.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className={`flex justify-end gap-3 pt-4 border-t ${isDark ? "border-slate-700" : "border-gray-200"}`}>
                  <button
                    type="button"
                    onClick={() => setShowMemberModal(false)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      isDark ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium"
                  >
                    {isSaving ? "Adding..." : "Add Member"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function SharedMailboxesPage() {
  return (
    <Protected requiredRoles={["super_admin", "admin"]}>
      <SharedMailboxesContent />
    </Protected>
  );
}
