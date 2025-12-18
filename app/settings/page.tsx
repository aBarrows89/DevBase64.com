"use client";

import { useState } from "react";
import Protected from "../protected";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "../auth-context";
import { useTheme } from "../theme-context";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

function SettingsContent() {
  const { user, canManageUsers } = useAuth();
  const { theme, setTheme } = useTheme();
  const users = useQuery(api.auth.getAllUsers);
  const changePassword = useMutation(api.auth.changePassword);
  const createUser = useMutation(api.auth.createUser);

  const isDark = theme === "dark";

  const [activeTab, setActiveTab] = useState<"profile" | "users" | "security">(
    "profile"
  );

  // Password change state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // New user state
  const [showNewUser, setShowNewUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "member",
  });
  const [newUserError, setNewUserError] = useState("");

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess(false);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }

    if (!user) return;

    try {
      const result = await changePassword({
        userId: user._id,
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      if (result.success) {
        setPasswordSuccess(true);
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        setPasswordError(result.error || "Failed to change password");
      }
    } catch {
      setPasswordError("An error occurred");
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewUserError("");

    if (newUserForm.password.length < 8) {
      setNewUserError("Password must be at least 8 characters");
      return;
    }

    try {
      const result = await createUser({
        name: newUserForm.name,
        email: newUserForm.email,
        password: newUserForm.password,
        role: newUserForm.role,
      });

      if (result.success) {
        setShowNewUser(false);
        setNewUserForm({ name: "", email: "", password: "", role: "member" });
      } else {
        setNewUserError(result.error || "Failed to create user");
      }
    } catch {
      setNewUserError("An error occurred");
    }
  };

  return (
    <div className={`flex h-screen ${isDark ? "bg-slate-900" : "bg-gray-50"}`}>
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className={`sticky top-0 z-10 backdrop-blur-sm border-b px-8 py-4 ${isDark ? "bg-slate-900/80 border-slate-700" : "bg-white/80 border-gray-200"}`}>
          <h1 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>Settings</h1>
          <p className={`text-sm mt-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
            Manage your account and team settings
          </p>
        </header>

        <div className="p-8">
          {/* Tabs */}
          <div className={`flex gap-4 mb-8 border-b pb-4 ${isDark ? "border-slate-700" : "border-gray-200"}`}>
            <button
              onClick={() => setActiveTab("profile")}
              className={`px-4 py-2 font-medium rounded-lg transition-colors ${
                activeTab === "profile"
                  ? isDark
                    ? "bg-cyan-500/20 text-cyan-400"
                    : "bg-blue-50 text-blue-600"
                  : isDark
                    ? "text-slate-400 hover:text-white"
                    : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Profile
            </button>
            <button
              onClick={() => setActiveTab("security")}
              className={`px-4 py-2 font-medium rounded-lg transition-colors ${
                activeTab === "security"
                  ? isDark
                    ? "bg-cyan-500/20 text-cyan-400"
                    : "bg-blue-50 text-blue-600"
                  : isDark
                    ? "text-slate-400 hover:text-white"
                    : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Security
            </button>
            {canManageUsers && (
              <button
                onClick={() => setActiveTab("users")}
                className={`px-4 py-2 font-medium rounded-lg transition-colors ${
                  activeTab === "users"
                    ? isDark
                      ? "bg-cyan-500/20 text-cyan-400"
                      : "bg-blue-50 text-blue-600"
                    : isDark
                      ? "text-slate-400 hover:text-white"
                      : "text-gray-500 hover:text-gray-900"
                }`}
              >
                Users
              </button>
            )}
          </div>

          {/* Profile Tab */}
          {activeTab === "profile" && (
            <div className="max-w-2xl space-y-6">
              {/* Profile Information Card */}
              <div className={`border rounded-xl p-6 ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm"}`}>
                <h2 className={`text-lg font-semibold mb-6 ${isDark ? "text-white" : "text-gray-900"}`}>
                  Profile Information
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                      Name
                    </label>
                    <input
                      type="text"
                      value={user?.name || ""}
                      disabled
                      className={`w-full px-4 py-3 border rounded-lg disabled:opacity-50 ${isDark ? "bg-slate-900/50 border-slate-600 text-white" : "bg-gray-50 border-gray-300 text-gray-900"}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                      Email
                    </label>
                    <input
                      type="email"
                      value={user?.email || ""}
                      disabled
                      className={`w-full px-4 py-3 border rounded-lg disabled:opacity-50 ${isDark ? "bg-slate-900/50 border-slate-600 text-white" : "bg-gray-50 border-gray-300 text-gray-900"}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                      Role
                    </label>
                    <input
                      type="text"
                      value={user?.role || ""}
                      disabled
                      className={`w-full px-4 py-3 border rounded-lg disabled:opacity-50 capitalize ${isDark ? "bg-slate-900/50 border-slate-600 text-white" : "bg-gray-50 border-gray-300 text-gray-900"}`}
                    />
                  </div>
                </div>
              </div>

              {/* Theme Preference Card */}
              <div className={`border rounded-xl p-6 ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm"}`}>
                <h2 className={`text-lg font-semibold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                  Appearance
                </h2>
                <p className={`text-sm mb-6 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                  Choose your preferred theme
                </p>

                <div className="grid grid-cols-2 gap-4">
                  {/* Light Theme Option */}
                  <button
                    onClick={() => setTheme("light")}
                    className={`relative p-4 rounded-xl border-2 transition-all ${
                      theme === "light"
                        ? "border-blue-500 ring-2 ring-blue-500/20"
                        : isDark
                          ? "border-slate-600 hover:border-slate-500"
                          : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {/* Light Theme Preview */}
                    <div className="aspect-[4/3] rounded-lg overflow-hidden bg-gray-100 mb-3">
                      <div className="h-full flex">
                        {/* Sidebar preview */}
                        <div className="w-1/4 bg-white border-r border-gray-200 p-2">
                          <div className="w-full h-2 bg-blue-500 rounded mb-2"></div>
                          <div className="w-3/4 h-1.5 bg-gray-300 rounded mb-1"></div>
                          <div className="w-2/3 h-1.5 bg-gray-300 rounded mb-1"></div>
                          <div className="w-3/4 h-1.5 bg-gray-300 rounded"></div>
                        </div>
                        {/* Content preview */}
                        <div className="flex-1 p-2">
                          <div className="w-1/2 h-2 bg-gray-400 rounded mb-2"></div>
                          <div className="w-full h-8 bg-white rounded border border-gray-200 mb-2"></div>
                          <div className="w-full h-8 bg-white rounded border border-gray-200"></div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>Light</p>
                        <p className={`text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>Clean iOS-style theme</p>
                      </div>
                      {theme === "light" && (
                        <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>

                  {/* Dark Theme Option */}
                  <button
                    onClick={() => setTheme("dark")}
                    className={`relative p-4 rounded-xl border-2 transition-all ${
                      theme === "dark"
                        ? "border-cyan-500 ring-2 ring-cyan-500/20"
                        : isDark
                          ? "border-slate-600 hover:border-slate-500"
                          : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {/* Dark Theme Preview */}
                    <div className="aspect-[4/3] rounded-lg overflow-hidden bg-slate-800 mb-3">
                      <div className="h-full flex">
                        {/* Sidebar preview */}
                        <div className="w-1/4 bg-slate-900 border-r border-slate-700 p-2">
                          <div className="w-full h-2 bg-gradient-to-r from-cyan-400 to-blue-500 rounded mb-2"></div>
                          <div className="w-3/4 h-1.5 bg-slate-600 rounded mb-1"></div>
                          <div className="w-2/3 h-1.5 bg-slate-600 rounded mb-1"></div>
                          <div className="w-3/4 h-1.5 bg-slate-600 rounded"></div>
                        </div>
                        {/* Content preview */}
                        <div className="flex-1 p-2">
                          <div className="w-1/2 h-2 bg-slate-400 rounded mb-2"></div>
                          <div className="w-full h-8 bg-slate-700/50 rounded border border-slate-600 mb-2"></div>
                          <div className="w-full h-8 bg-slate-700/50 rounded border border-slate-600"></div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>Dark</p>
                        <p className={`text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>Blue & cyan accents</p>
                      </div>
                      {theme === "dark" && (
                        <div className="w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === "security" && (
            <div className="max-w-2xl">
              <div className={`border rounded-xl p-6 ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm"}`}>
                <h2 className={`text-lg font-semibold mb-6 ${isDark ? "text-white" : "text-gray-900"}`}>
                  Change Password
                </h2>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  {passwordError && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
                      {passwordError}
                    </div>
                  )}
                  {passwordSuccess && (
                    <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-lg text-sm">
                      Password changed successfully
                    </div>
                  )}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          currentPassword: e.target.value,
                        })
                      }
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none ${isDark ? "bg-slate-900/50 border-slate-600 text-white focus:border-cyan-500" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500"}`}
                      required
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                      New Password
                    </label>
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          newPassword: e.target.value,
                        })
                      }
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none ${isDark ? "bg-slate-900/50 border-slate-600 text-white focus:border-cyan-500" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500"}`}
                      required
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          confirmPassword: e.target.value,
                        })
                      }
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none ${isDark ? "bg-slate-900/50 border-slate-600 text-white focus:border-cyan-500" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500"}`}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className={`px-6 py-3 font-medium rounded-lg transition-colors ${isDark ? "bg-cyan-500 text-white hover:bg-cyan-600" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                  >
                    Update Password
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === "users" && canManageUsers && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>Team Users</h2>
                <button
                  onClick={() => setShowNewUser(true)}
                  className={`px-4 py-2 font-medium rounded-lg transition-colors flex items-center gap-2 ${isDark ? "bg-cyan-500 text-white hover:bg-cyan-600" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Add User
                </button>
              </div>

              <div className={`border rounded-xl overflow-hidden ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm"}`}>
                <table className="w-full">
                  <thead>
                    <tr className={`border-b ${isDark ? "border-slate-700" : "border-gray-200"}`}>
                      <th className={`text-left px-6 py-4 text-sm font-medium ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                        User
                      </th>
                      <th className={`text-left px-6 py-4 text-sm font-medium ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                        Role
                      </th>
                      <th className={`text-left px-6 py-4 text-sm font-medium ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                        Status
                      </th>
                      <th className={`text-left px-6 py-4 text-sm font-medium ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                        Last Login
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users?.map((u) => (
                      <tr
                        key={u._id}
                        className={`border-b ${isDark ? "border-slate-700/50" : "border-gray-100"}`}
                      >
                        <td className="px-6 py-4">
                          <div>
                            <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>{u.name}</p>
                            <p className={`text-sm ${isDark ? "text-slate-500" : "text-gray-500"}`}>{u.email}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs font-medium rounded capitalize ${isDark ? "bg-slate-700 text-slate-300" : "bg-gray-100 text-gray-700"}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded ${
                              u.isActive
                                ? "bg-green-500/20 text-green-400"
                                : "bg-red-500/20 text-red-400"
                            }`}
                          >
                            {u.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className={`px-6 py-4 text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                          {u.lastLoginAt
                            ? new Date(u.lastLoginAt).toLocaleDateString()
                            : "Never"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* New User Modal */}
              {showNewUser && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                  <div className={`border rounded-xl p-6 w-full max-w-md ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
                    <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
                      Add New User
                    </h2>
                    <form onSubmit={handleCreateUser} className="space-y-4">
                      {newUserError && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
                          {newUserError}
                        </div>
                      )}
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                          Name
                        </label>
                        <input
                          type="text"
                          value={newUserForm.name}
                          onChange={(e) =>
                            setNewUserForm({
                              ...newUserForm,
                              name: e.target.value,
                            })
                          }
                          className={`w-full px-4 py-3 border rounded-lg focus:outline-none ${isDark ? "bg-slate-900/50 border-slate-600 text-white focus:border-cyan-500" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500"}`}
                          required
                        />
                      </div>
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                          Email
                        </label>
                        <input
                          type="email"
                          value={newUserForm.email}
                          onChange={(e) =>
                            setNewUserForm({
                              ...newUserForm,
                              email: e.target.value,
                            })
                          }
                          className={`w-full px-4 py-3 border rounded-lg focus:outline-none ${isDark ? "bg-slate-900/50 border-slate-600 text-white focus:border-cyan-500" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500"}`}
                          required
                        />
                      </div>
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                          Password
                        </label>
                        <input
                          type="password"
                          value={newUserForm.password}
                          onChange={(e) =>
                            setNewUserForm({
                              ...newUserForm,
                              password: e.target.value,
                            })
                          }
                          className={`w-full px-4 py-3 border rounded-lg focus:outline-none ${isDark ? "bg-slate-900/50 border-slate-600 text-white focus:border-cyan-500" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500"}`}
                          required
                        />
                      </div>
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                          Role
                        </label>
                        <select
                          value={newUserForm.role}
                          onChange={(e) =>
                            setNewUserForm({
                              ...newUserForm,
                              role: e.target.value,
                            })
                          }
                          className={`w-full px-4 py-3 border rounded-lg focus:outline-none ${isDark ? "bg-slate-900/50 border-slate-600 text-white focus:border-cyan-500" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500"}`}
                        >
                          <option value="viewer">Viewer</option>
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <div className="flex gap-3 pt-4">
                        <button
                          type="button"
                          onClick={() => setShowNewUser(false)}
                          className={`flex-1 px-4 py-3 font-medium rounded-lg transition-colors ${isDark ? "bg-slate-700 text-white hover:bg-slate-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className={`flex-1 px-4 py-3 font-medium rounded-lg transition-colors ${isDark ? "bg-cyan-500 text-white hover:bg-cyan-600" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                        >
                          Create User
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Protected>
      <SettingsContent />
    </Protected>
  );
}
