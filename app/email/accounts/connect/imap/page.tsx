"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Protected from "@/app/protected";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/app/auth-context";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { encrypt } from "@/lib/email/encryption";

export default function ImapSetupPage() {
  const router = useRouter();
  const { user } = useAuth();
  const createAccount = useMutation(api.email.accounts.createImapAccount);

  // Preset options
  const [preset, setPreset] = useState<"ietires" | "custom">("ietires");

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  // IMAP settings (defaults for IETires)
  const [imapHost, setImapHost] = useState("svm.ietires.com");
  const [imapPort, setImapPort] = useState("993");
  const [imapUsername, setImapUsername] = useState("");
  const [imapPassword, setImapPassword] = useState("");
  const [imapTls, setImapTls] = useState(true);

  // SMTP settings (defaults for IETires)
  const [smtpHost, setSmtpHost] = useState("svm.ietires.com");
  const [smtpPort, setSmtpPort] = useState("465");
  const [smtpUsername, setSmtpUsername] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpTls, setSmtpTls] = useState(true);

  // Use same credentials for SMTP
  const [useSameCredentials, setUseSameCredentials] = useState(true);

  // Handle preset change
  const handlePresetChange = (newPreset: "ietires" | "custom") => {
    setPreset(newPreset);
    if (newPreset === "ietires") {
      setImapHost("svm.ietires.com");
      setImapPort("993");
      setImapTls(true);
      setSmtpHost("svm.ietires.com");
      setSmtpPort("465");
      setSmtpTls(true);
      setUseSameCredentials(true);
    } else {
      // Clear to let user enter custom values
      setImapHost("");
      setImapPort("993");
      setSmtpHost("");
      setSmtpPort("587");
    }
  };

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

      const finalSmtpUsername = useSameCredentials ? imapUsername : smtpUsername;
      const finalSmtpPassword = useSameCredentials ? imapPassword : smtpPassword;

      // Encrypt passwords before sending
      const encryptedImapPassword = encrypt(imapPassword);
      const encryptedSmtpPassword = encrypt(finalSmtpPassword);

      await createAccount({
        userId: user._id,
        emailAddress: email,
        name: name || undefined,
        imapHost,
        imapPort: parseInt(imapPort),
        imapUsername: imapUsername || email,
        imapPassword: encryptedImapPassword,
        imapTls,
        smtpHost,
        smtpPort: parseInt(smtpPort),
        smtpUsername: finalSmtpUsername || email,
        smtpPassword: encryptedSmtpPassword,
        smtpTls,
      });

      router.push("/email/accounts?connected=imap&email=" + encodeURIComponent(email));
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
          <div className="max-w-2xl mx-auto">
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
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-500 to-gray-700 flex items-center justify-center">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-semibold theme-text-primary">IMAP/SMTP Email Setup</h1>
                <p className="theme-text-secondary">Connect your IETires email or another IMAP provider</p>
              </div>
            </div>

            {/* Preset Selector */}
            <div className="theme-bg-secondary rounded-xl p-6 mb-6">
              <h2 className="font-medium theme-text-primary mb-4">Email Provider</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => handlePresetChange("ietires")}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    preset === "ietires"
                      ? "border-blue-500 bg-blue-500/10"
                      : "theme-border hover:border-gray-500"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
                      <span className="text-white font-bold text-sm">IE</span>
                    </div>
                    <div>
                      <p className={`font-medium ${preset === "ietires" ? "text-blue-400" : "theme-text-primary"}`}>
                        IETires Email
                      </p>
                      <p className="text-xs theme-text-tertiary">Recommended</p>
                    </div>
                  </div>
                  <p className="text-sm theme-text-secondary">
                    Pre-configured for svm.ietires.com
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handlePresetChange("custom")}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    preset === "custom"
                      ? "border-blue-500 bg-blue-500/10"
                      : "theme-border hover:border-gray-500"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-500 to-gray-700 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className={`font-medium ${preset === "custom" ? "text-blue-400" : "theme-text-primary"}`}>
                        Custom Provider
                      </p>
                      <p className="text-xs theme-text-tertiary">Other IMAP service</p>
                    </div>
                  </div>
                  <p className="text-sm theme-text-secondary">
                    Configure your own IMAP/SMTP settings
                  </p>
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Basic Info */}
              <div className="theme-bg-secondary rounded-xl p-6">
                <h2 className="font-medium theme-text-primary mb-4">Account Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium theme-text-secondary mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full px-4 py-2.5 rounded-lg theme-bg-primary theme-border border theme-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
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
              </div>

              {/* IMAP Settings */}
              <div className="theme-bg-secondary rounded-xl p-6">
                <h2 className="font-medium theme-text-primary mb-4">
                  {preset === "ietires" ? "Login Credentials" : "Incoming Mail (IMAP)"}
                </h2>
                {preset === "ietires" && (
                  <p className="text-sm theme-text-secondary mb-4">
                    Server: svm.ietires.com (IMAP: 993, SMTP: 465)
                  </p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {preset === "custom" && (
                    <>
                      <div>
                        <label className="block text-sm font-medium theme-text-secondary mb-1.5">
                          IMAP Server
                        </label>
                        <input
                          type="text"
                          value={imapHost}
                          onChange={(e) => setImapHost(e.target.value)}
                          placeholder="imap.example.com"
                          required
                          className="w-full px-4 py-2.5 rounded-lg theme-bg-primary theme-border border theme-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium theme-text-secondary mb-1.5">
                          Port
                        </label>
                        <input
                          type="number"
                          value={imapPort}
                          onChange={(e) => setImapPort(e.target.value)}
                          placeholder="993"
                          required
                          className="w-full px-4 py-2.5 rounded-lg theme-bg-primary theme-border border theme-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium theme-text-secondary mb-1.5">
                          Username
                        </label>
                        <input
                          type="text"
                          value={imapUsername}
                          onChange={(e) => setImapUsername(e.target.value)}
                          placeholder={email || "you@example.com"}
                          className="w-full px-4 py-2.5 rounded-lg theme-bg-primary theme-border border theme-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        />
                        <p className="mt-1 text-xs theme-text-tertiary">Leave blank to use email address</p>
                      </div>
                    </>
                  )}
                  <div className={preset === "ietires" ? "" : ""}>
                    <label className="block text-sm font-medium theme-text-secondary mb-1.5">
                      Password
                    </label>
                    <input
                      type="password"
                      value={imapPassword}
                      onChange={(e) => setImapPassword(e.target.value)}
                      placeholder="Your email password"
                      required
                      className="w-full px-4 py-2.5 rounded-lg theme-bg-primary theme-border border theme-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>
                  {preset === "custom" && (
                    <div className="md:col-span-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={imapTls}
                          onChange={(e) => setImapTls(e.target.checked)}
                          className="rounded border-gray-500 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm theme-text-secondary">Use SSL/TLS</span>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* SMTP Settings - Only show for custom preset */}
              {preset === "custom" && (
                <div className="theme-bg-secondary rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-medium theme-text-primary">Outgoing Mail (SMTP)</h2>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useSameCredentials}
                        onChange={(e) => setUseSameCredentials(e.target.checked)}
                        className="rounded border-gray-500 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm theme-text-secondary">Same credentials as IMAP</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium theme-text-secondary mb-1.5">
                        SMTP Server
                      </label>
                      <input
                        type="text"
                        value={smtpHost}
                        onChange={(e) => setSmtpHost(e.target.value)}
                        placeholder="smtp.example.com"
                        required
                        className="w-full px-4 py-2.5 rounded-lg theme-bg-primary theme-border border theme-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium theme-text-secondary mb-1.5">
                        Port
                      </label>
                      <input
                        type="number"
                        value={smtpPort}
                        onChange={(e) => setSmtpPort(e.target.value)}
                        placeholder="587"
                        required
                        className="w-full px-4 py-2.5 rounded-lg theme-bg-primary theme-border border theme-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                    </div>
                    {!useSameCredentials && (
                      <>
                        <div>
                          <label className="block text-sm font-medium theme-text-secondary mb-1.5">
                            Username
                          </label>
                          <input
                            type="text"
                            value={smtpUsername}
                            onChange={(e) => setSmtpUsername(e.target.value)}
                            placeholder={email || "you@example.com"}
                            className="w-full px-4 py-2.5 rounded-lg theme-bg-primary theme-border border theme-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium theme-text-secondary mb-1.5">
                            Password
                          </label>
                          <input
                            type="password"
                            value={smtpPassword}
                            onChange={(e) => setSmtpPassword(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-lg theme-bg-primary theme-border border theme-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                          />
                        </div>
                      </>
                    )}
                    <div className="md:col-span-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={smtpTls}
                          onChange={(e) => setSmtpTls(e.target.checked)}
                          className="rounded border-gray-500 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm theme-text-secondary">Use SSL/TLS</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Common providers help - Only show for custom preset */}
              {preset === "custom" && (
                <div className="theme-bg-secondary rounded-xl p-6">
                  <h2 className="font-medium theme-text-primary mb-4">Common Provider Settings</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm theme-text-secondary">
                    <div className="space-y-2">
                      <p className="font-medium">Fastmail</p>
                      <p>IMAP: imap.fastmail.com:993</p>
                      <p>SMTP: smtp.fastmail.com:587</p>
                    </div>
                    <div className="space-y-2">
                      <p className="font-medium">Proton Mail (Bridge)</p>
                      <p>IMAP: 127.0.0.1:1143</p>
                      <p>SMTP: 127.0.0.1:1025</p>
                    </div>
                    <div className="space-y-2">
                      <p className="font-medium">Zoho Mail</p>
                      <p>IMAP: imap.zoho.com:993</p>
                      <p>SMTP: smtp.zoho.com:587</p>
                    </div>
                    <div className="space-y-2">
                      <p className="font-medium">AOL Mail</p>
                      <p>IMAP: imap.aol.com:993</p>
                      <p>SMTP: smtp.aol.com:587</p>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !email || !imapPassword || (preset === "custom" && (!imapHost || !smtpHost))}
                className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
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
                    Connect Account
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
