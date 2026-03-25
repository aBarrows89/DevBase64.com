"use client";

import { useState } from "react";
import { useDocHub } from "./DocHubContext";
import { PRIVACY_TIERS, type PrivacyTier } from "./types";

export default function FolderModal() {
  const { isDark, showFolderModal, setShowFolderModal, handleCreateFolder, currentFolderId } = useDocHub();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [privacyTier, setPrivacyTier] = useState<PrivacyTier>("internal");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  if (!showFolderModal) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Map privacy tier to visibility + password
    const visibility = privacyTier === "public" ? "community" : privacyTier === "internal" ? "internal" : "private";
    const pw = (privacyTier === "confidential" || privacyTier === "hipaa") ? password : undefined;
    await handleCreateFolder(name, description, pw, visibility);
    setName("");
    setDescription("");
    setPrivacyTier("internal");
    setPassword("");
  };

  const close = () => {
    setShowFolderModal(false);
    setName("");
    setDescription("");
    setPrivacyTier("internal");
    setPassword("");
  };

  const inputClass = `w-full px-3 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2 transition-colors ${
    isDark
      ? "bg-slate-800/50 border-slate-700 text-white placeholder-slate-500 focus:ring-cyan-500/50 focus:border-cyan-500"
      : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-blue-500/50 focus:border-blue-500"
  }`;

  const labelClass = `block text-xs font-medium mb-1.5 ${isDark ? "text-slate-400" : "text-gray-600"}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={close}>
      <div className={`absolute inset-0 ${isDark ? "bg-black/70" : "bg-black/40"} backdrop-blur-sm`} />

      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-md mx-4 rounded-2xl overflow-hidden ${
          isDark ? "bg-slate-900 border border-slate-700" : "bg-white border border-gray-200 shadow-2xl"
        }`}
      >
        <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? "border-slate-700" : "border-gray-200"}`}>
          <h2 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
            {currentFolderId ? "New Subfolder" : "New Folder"}
          </h2>
          <button onClick={close} className={`p-1.5 rounded-lg transition-colors ${isDark ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-100 text-gray-500"}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className={labelClass}>Folder Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter name..." className={inputClass} required autoFocus />
          </div>

          <div>
            <label className={labelClass}>Description <span className={isDark ? "text-slate-600" : "text-gray-400"}>(optional)</span></label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description..." rows={2} className={inputClass} />
          </div>

          {/* Privacy Tier Selection */}
          <div>
            <label className={labelClass}>Privacy Level</label>
            <div className="space-y-2">
              {(Object.entries(PRIVACY_TIERS) as [PrivacyTier, typeof PRIVACY_TIERS[PrivacyTier]][]).map(([tier, config]) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setPrivacyTier(tier)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left ${
                    privacyTier === tier
                      ? isDark
                        ? `${config.bgDark} ${config.borderDark} ${config.textDark}`
                        : `${config.bgLight} ${config.borderLight} ${config.textLight}`
                      : isDark
                        ? "border-slate-700 text-slate-400 hover:border-slate-600"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <span className={`w-3 h-3 rounded-full flex-shrink-0 ${
                    privacyTier === tier ? (isDark ? config.dotDark : config.dotLight) : isDark ? "bg-slate-600" : "bg-gray-300"
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{config.label}</p>
                    <p className={`text-xs ${privacyTier === tier ? "opacity-70" : isDark ? "text-slate-500" : "text-gray-400"}`}>
                      {config.description}
                    </p>
                  </div>
                  <svg className={`w-4 h-4 flex-shrink-0 ${privacyTier === tier ? "opacity-100" : "opacity-0"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              ))}
            </div>
          </div>

          {/* Password for confidential/HIPAA */}
          {(privacyTier === "confidential" || privacyTier === "hipaa") && (
            <div>
              <label className={labelClass}>
                Folder Password
                {privacyTier === "hipaa" && <span className="text-red-400 ml-1">*required</span>}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Set a password..."
                  className={inputClass}
                  required={privacyTier === "hipaa"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? "text-slate-500 hover:text-slate-400" : "text-gray-400 hover:text-gray-500"}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {showPassword ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    ) : (
                      <>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={!name || (privacyTier === "hipaa" && !password)}
            className={`w-full py-2.5 text-sm font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              isDark
                ? "bg-cyan-500 text-white hover:bg-cyan-600 shadow-lg shadow-cyan-500/20"
                : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20"
            }`}
          >
            Create Folder
          </button>
        </form>
      </div>
    </div>
  );
}
