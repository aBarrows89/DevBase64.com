"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useTheme } from "../theme-context";

export default function ForgotPasswordPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const requestPasswordReset = useMutation(api.auth.requestPasswordReset);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await requestPasswordReset({ email });
      if (result.success) {
        setSuccess(true);
        // In development, we'll show the token. In production, this would be sent via email
        if (result.token) {
          setResetToken(result.token);
        }
      } else {
        setError(result.error || "Failed to send reset email");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
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

          {/* Success Message */}
          <div className={`rounded-xl p-8 backdrop-blur-sm ${isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white border border-gray-200 shadow-sm"}`}>
            <div className="text-center mb-6">
              <div className="mx-auto w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className={`text-xl font-semibold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                Check Your Email
              </h2>
              <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                If an account exists for {email}, you will receive a password reset link shortly.
              </p>
            </div>

            {/* Development mode: Show the reset link directly */}
            {resetToken && (
              <div className="mt-6">
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
                  <p className={`text-sm font-medium mb-2 ${isDark ? "text-yellow-300" : "text-yellow-700"}`}>
                    Development Mode
                  </p>
                  <p className={`text-xs mb-3 ${isDark ? "text-yellow-400" : "text-yellow-600"}`}>
                    In production, this link would be sent via email
                  </p>
                  <a
                    href={`/reset-password?token=${resetToken}`}
                    className={`inline-block w-full text-center py-2 px-4 rounded-lg font-medium transition-colors ${isDark ? "bg-cyan-600 hover:bg-cyan-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
                  >
                    Reset Password Now
                  </a>
                </div>
              </div>
            )}

            <div className="mt-6">
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

        {/* Forgot Password Form */}
        <div className={`rounded-xl p-8 backdrop-blur-sm ${isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white border border-gray-200 shadow-sm"}`}>
          <h2 className={`text-xl font-semibold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
            Forgot Password?
          </h2>
          <p className={`text-sm mb-6 ${isDark ? "text-slate-400" : "text-gray-600"}`}>
            Enter your email address and we'll send you a link to reset your password.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-1 transition-colors ${isDark ? "bg-slate-900/50 border border-slate-600 text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-cyan-500" : "bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-600 focus:ring-blue-600"}`}
                placeholder="you@example.com"
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
                  Sending...
                </span>
              ) : (
                "Send Reset Link"
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
