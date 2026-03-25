"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useAuth } from "../auth-context";
import { useRouter } from "next/navigation";
import { useTheme } from "../theme-context";

export default function LoginPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const { login, user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const hasNavigated = useRef(false);

  // Wait for user data to load after successful login before navigating
  useEffect(() => {
    if (loginSuccess && user && !authLoading && !hasNavigated.current) {
      hasNavigated.current = true;
      if (user.forcePasswordChange) {
        router.push("/change-password");
      } else {
        router.push("/");
      }
    }
  }, [loginSuccess, user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        // Don't navigate immediately - wait for user data to load
        setLoginSuccess(true);
        // Keep showing loading state until navigation happens
      } else {
        setError(result.error || "Login failed");
        setIsLoading(false);
      }
    } catch {
      setError("An error occurred during login");
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${isDark ? "bg-slate-900" : "bg-[#f2f2f7]"}`}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Image
            src="/logo.gif"
            alt="IE Central"
            width={200}
            height={56}
            className="h-14 w-auto mx-auto"
            priority
          />
          <p className={`mt-3 ${isDark ? "text-slate-500" : "text-gray-500"}`}>Employee Management & Operations</p>
        </div>

        {/* Login Form */}
        <div className={`rounded-xl p-8 backdrop-blur-sm ${isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white border border-gray-200 shadow-sm"}`}>
          <h2 className={`text-xl font-semibold mb-6 ${isDark ? "text-white" : "text-gray-900"}`}>Sign in</h2>

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

            <div>
              <label
                htmlFor="password"
                className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-1 transition-colors ${isDark ? "bg-slate-900/50 border border-slate-600 text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-cyan-500" : "bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-600 focus:ring-blue-600"}`}
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || loginSuccess}
              className={`w-full py-3 px-4 bg-gradient-to-r text-white font-semibold rounded-lg focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all ${isDark ? "from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-900" : "from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:ring-blue-600 focus:ring-offset-2 focus:ring-offset-white"}`}
            >
              {isLoading || loginSuccess ? (
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
                  {loginSuccess ? "Loading..." : "Signing in..."}
                </span>
              ) : (
                "Sign in"
              )}
            </button>
          </form>
        </div>

        {/* Meeting Code */}
        <div className={`mt-6 border rounded-xl p-4 text-center ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white/50 border-gray-200"}`}>
          <p className={`text-xs font-medium mb-2 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
            Have a meeting code?
          </p>
          <button
            onClick={() => router.push("/join")}
            className={`w-full py-2.5 rounded-lg font-medium text-sm transition-colors ${
              isDark ? "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30" : "bg-blue-100 text-blue-600 hover:bg-blue-200"
            }`}
          >
            Join a Meeting
          </button>
        </div>

        {/* Footer */}
        <p className={`text-center text-sm mt-6 ${isDark ? "text-slate-600" : "text-gray-500"}`}>
          &copy; {new Date().getFullYear()} Import Export Tire Company. All rights reserved.
        </p>
      </div>
    </div>
  );
}
