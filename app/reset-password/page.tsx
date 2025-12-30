"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useTheme } from "../theme-context";

export default function ResetPasswordPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Validate the token
  const tokenValidation = useQuery(
    api.auth.validateResetToken,
    token ? { token } : "skip"
  );

  const resetPassword = useMutation(api.auth.resetPasswordWithToken);

  useEffect(() => {
    if (!token) {
      setError("No reset token provided");
    } else if (tokenValidation && !tokenValidation.valid) {
      setError(tokenValidation.error || "Invalid or expired reset token");
    }
  }, [token, tokenValidation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const result = await resetPassword({
        token,
        newPassword,
      });

      if (result.success) {
        setSuccess(true);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      } else {
        setError(result.error || "Failed to reset password");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${isDark ? "bg-slate-900" : "bg-[#f2f2f7]"}`}>
        <div className="w-full max-w-md">
          <div className={`rounded-xl p-8 backdrop-blur-sm ${isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white border border-gray-200 shadow-sm"}`}>
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm mb-4">
              No reset token provided
            </div>
            <a
              href="/forgot-password"
              className={`block text-center text-sm font-medium transition-colors ${isDark ? "text-cyan-400 hover:text-cyan-300" : "text-blue-600 hover:text-blue-700"}`}
            >
              Request a new reset link
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (tokenValidation && !tokenValidation.valid) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${isDark ? "bg-slate-900" : "bg-[#f2f2f7]"}`}>
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              IE Tire
            </h1>
            <p className={`mt-2 ${isDark ? "text-slate-500" : "text-gray-500"}`}>Business Intelligence Dashboard</p>
          </div>

          <div className={`rounded-xl p-8 backdrop-blur-sm ${isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white border border-gray-200 shadow-sm"}`}>
            <div className="text-center mb-6">
              <div className="mx-auto w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className={`text-xl font-semibold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                Invalid Reset Link
              </h2>
              <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                {tokenValidation?.error || "This password reset link is invalid or has expired."}
              </p>
            </div>

            <div className="space-y-3">
              <a
                href="/forgot-password"
                className={`block w-full text-center py-3 px-4 bg-gradient-to-r text-white font-semibold rounded-lg transition-all ${isDark ? "from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600" : "from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"}`}
              >
                Request New Reset Link
              </a>
              <a
                href="/login"
                className={`block text-center text-sm font-medium transition-colors ${isDark ? "text-cyan-400 hover:text-cyan-300" : "text-blue-600 hover:text-blue-700"}`}
              >
                Back to Login
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${isDark ? "bg-slate-900" : "bg-[#f2f2f7]"}`}>
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              IE Tire
            </h1>
            <p className={`mt-2 ${isDark ? "text-slate-500" : "text-gray-500"}`}>Business Intelligence Dashboard</p>
          </div>

          <div className={`rounded-xl p-8 backdrop-blur-sm ${isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white border border-gray-200 shadow-sm"}`}>
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className={`text-xl font-semibold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                Password Reset Successful
              </h2>
              <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                Your password has been reset successfully. Redirecting you to login...
              </p>
              <div className="mt-6">
                <a
                  href="/login"
                  className={`inline-block text-sm font-medium transition-colors ${isDark ? "text-cyan-400 hover:text-cyan-300" : "text-blue-600 hover:text-blue-700"}`}
                >
                  Go to Login
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${isDark ? "bg-slate-900" : "bg-[#f2f2f7]"}`}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            IE Tire
          </h1>
          <p className={`mt-2 ${isDark ? "text-slate-500" : "text-gray-500"}`}>Business Intelligence Dashboard</p>
        </div>

        {/* Reset Password Form */}
        <div className={`rounded-xl p-8 backdrop-blur-sm ${isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white border border-gray-200 shadow-sm"}`}>
          <h2 className={`text-xl font-semibold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
            Reset Password
          </h2>
          {tokenValidation?.valid && (
            <p className={`text-sm mb-6 ${isDark ? "text-slate-400" : "text-gray-600"}`}>
              Resetting password for: <span className="font-medium">{tokenValidation.email}</span>
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

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
                minLength={8}
              />
              <p className={`mt-1 text-xs ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                Must be at least 8 characters
              </p>
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
              disabled={isLoading || !tokenValidation?.valid}
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
                  Resetting...
                </span>
              ) : (
                "Reset Password"
              )}
            </button>
          </form>

          <div className="mt-6">
            <a
              href="/login"
              className={`block text-center text-sm font-medium transition-colors ${isDark ? "text-cyan-400 hover:text-cyan-300" : "text-blue-600 hover:text-blue-700"}`}
            >
              Back to Login
            </a>
          </div>
        </div>

        {/* Footer */}
        <p className={`text-center text-sm mt-6 ${isDark ? "text-slate-600" : "text-gray-500"}`}>
          &copy; {new Date().getFullYear()} Import Export Tire Company. All rights reserved.
        </p>
      </div>
    </div>
  );
}
