"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Protected from "@/app/protected";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/app/auth-context";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function ICloudSetupPage() {
  const router = useRouter();
  const { user } = useAuth();
  const createAccount = useAction(api.email.accountActions.createIcloudAccount);

  const [email, setEmail] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?._id) return;

    setIsLoading(true);
    setError(null);

    try {
      // Validate email
      if (!email.includes("@")) {
        throw new Error("Please enter a valid email address");
      }

      // Password will be encrypted server-side in Convex
      await createAccount({
        userId: user._id,
        emailAddress: email,
        name: name || undefined,
        appPassword,
      });

      router.push("/email/accounts?connected=icloud&email=" + encodeURIComponent(email));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect account");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Protected requireFlag="hasEmailAccess">
      <div className="min-h-screen theme-bg-primary flex">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-xl mx-auto">
            {/* Back button */}
            <button
              onClick={() => router.push("/email/accounts")}
              className="flex items-center gap-2 theme-text-secondary hover:theme-text-primary mb-6 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Accounts
            </button>

            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-semibold theme-text-primary">Connect iCloud Mail</h1>
                <p className="theme-text-secondary">Use an app-specific password for secure access</p>
              </div>
            </div>

            {/* Instructions */}
            <div className="theme-bg-secondary rounded-xl p-6 mb-6">
              <h2 className="font-medium theme-text-primary mb-4">How to generate an app-specific password:</h2>
              <ol className="space-y-3 theme-text-secondary">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-sm flex items-center justify-center">1</span>
                  <span>Go to <a href="https://appleid.apple.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">appleid.apple.com</a> and sign in</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-sm flex items-center justify-center">2</span>
                  <span>Navigate to <strong>Sign-In and Security</strong> → <strong>App-Specific Passwords</strong></span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-sm flex items-center justify-center">3</span>
                  <span>Click <strong>Generate an app-specific password</strong></span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-sm flex items-center justify-center">4</span>
                  <span>Enter a label (e.g., &quot;IECentral Email&quot;) and click <strong>Create</strong></span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-sm flex items-center justify-center">5</span>
                  <span>Copy the generated password and paste it below</span>
                </li>
              </ol>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="theme-bg-secondary rounded-xl p-6">
              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium theme-text-secondary mb-1.5">
                    iCloud Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@icloud.com"
                    required
                    className="w-full px-4 py-2.5 rounded-lg theme-bg-primary theme-border border theme-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                  <p className="mt-1 text-xs theme-text-tertiary">
                    Works with @icloud.com, @me.com, and @mac.com addresses
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium theme-text-secondary mb-1.5">
                    App-Specific Password
                  </label>
                  <input
                    type="password"
                    value={appPassword}
                    onChange={(e) => setAppPassword(e.target.value)}
                    placeholder="xxxx-xxxx-xxxx-xxxx"
                    required
                    className="w-full px-4 py-2.5 rounded-lg theme-bg-primary theme-border border theme-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                  <p className="mt-1 text-xs theme-text-tertiary">
                    This password will be encrypted before storage
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium theme-text-secondary mb-1.5">
                    Display Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-4 py-2.5 rounded-lg theme-bg-primary theme-border border theme-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !email || !appPassword}
                className="w-full mt-6 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Connecting...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    Connect iCloud Account
                  </>
                )}
              </button>
            </form>
          </div>
        </main>
      </div>
    </Protected>
  );
}
