"use client";

import { useState } from "react";
import { useAuth } from "../auth-context";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useTheme } from "../theme-context";

export default function ChangePasswordPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  const changePassword = useMutation(api.auth.changePassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }

    if (!user) {
      setError("You must be logged in");
      return;
    }

    setIsLoading(true);

    try {
      const result = await changePassword({
        userId: user._id,
        currentPassword,
        newPassword,
      });

      if (result.success) {
        router.push("/");
      } else {
        setError(result.error || "Failed to change password");
      }
    } catch {
      setError("An error occurred while changing password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${isDark ? "bg-slate-900" : "bg-[#f2f2f7]"}`}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            IE Central
          </h1>
          <p className={`mt-2 ${isDark ? "text-slate-500" : "text-gray-500"}`}>Import Export Tire Company</p>
        </div>

        {/* Change Password Form */}
        <div className={`rounded-xl p-8 backdrop-blur-sm ${isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white border border-gray-200 shadow-sm"}`}>
          <h2 className={`text-xl font-semibold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
            Change Password
          </h2>
          <p className={`text-sm mb-6 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
            {user?.forcePasswordChange
              ? "You must change your password before continuing."
              : "Update your password to keep your account secure."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="currentPassword"
                className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}
              >
                Current Password
              </label>
              <input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-1 transition-colors ${isDark ? "bg-slate-900/50 border border-slate-600 text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-cyan-500" : "bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-600 focus:ring-blue-600"}`}
                placeholder="••••••••"
                required
              />
            </div>

            <div>
              <label
                htmlFor="newPassword"
                className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}
              >
                New Password
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-1 transition-colors ${isDark ? "bg-slate-900/50 border border-slate-600 text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-cyan-500" : "bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-600 focus:ring-blue-600"}`}
                placeholder="••••••••"
                required
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}
              >
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-1 transition-colors ${isDark ? "bg-slate-900/50 border border-slate-600 text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-cyan-500" : "bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-600 focus:ring-blue-600"}`}
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 bg-gradient-to-r text-white font-semibold rounded-lg focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all ${isDark ? "from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-900" : "from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:ring-blue-600 focus:ring-offset-2 focus:ring-offset-white"}`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Updating...
                </span>
              ) : (
                "Update Password"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
