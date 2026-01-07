"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Protected from "../../protected";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useTheme } from "../../theme-context";
import { useAuth } from "../../auth-context";

function CallOffContent() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const router = useRouter();
  const { user, canAccessEmployeePortal } = useAuth();
  const personnelId = user?.personnelId;

  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const callOffs = useQuery(
    api.employeePortal.getMyCallOffs,
    personnelId ? { personnelId } : "skip"
  );

  const submitCallOff = useMutation(api.employeePortal.submitCallOff);

  if (!canAccessEmployeePortal) {
    router.push("/");
    return null;
  }

  if (!personnelId) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? "bg-slate-900" : "bg-gray-50"}`}>
        <p className={isDark ? "text-slate-400" : "text-gray-500"}>Account not linked to personnel record.</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (!date) {
        throw new Error("Please select a date");
      }

      if (!reason.trim()) {
        throw new Error("Please provide a reason");
      }

      await submitCallOff({
        personnelId,
        date,
        reason: reason.trim(),
      });

      setSuccess(true);
      setTimeout(() => {
        setShowForm(false);
        setReason("");
        setSuccess(false);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit call off");
    }

    setIsSubmitting(false);
  };

  // Recent call offs (last 30 days)
  const recentCallOffs = callOffs?.slice(0, 10) || [];

  return (
    <div className={`min-h-screen ${isDark ? "bg-slate-900" : "bg-gray-50"}`}>
      {/* Header */}
      <header className={`sticky top-0 z-10 border-b px-4 py-4 ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/portal"
              className={`p-2 -ml-2 rounded-lg ${isDark ? "hover:bg-slate-700" : "hover:bg-gray-100"}`}
            >
              <svg className={`w-6 h-6 ${isDark ? "text-white" : "text-gray-900"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
              Call Off
            </h1>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className={`px-4 py-2 rounded-lg font-medium ${isDark ? "bg-red-500 text-white" : "bg-red-600 text-white"}`}
            >
              Call Off
            </button>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Call Off Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className={`rounded-2xl p-6 ${isDark ? "bg-slate-800 border border-slate-700" : "bg-white border border-gray-200"}`}>
            <h2 className={`text-lg font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
              Report Call Off
            </h2>

            {success ? (
              <div className="p-4 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 text-center">
                <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p>Call off submitted successfully!</p>
              </div>
            ) : (
              <>
                {error && (
                  <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                      Date
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className={`w-full px-4 py-3 rounded-lg border ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                      Reason
                    </label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={4}
                      required
                      className={`w-full px-4 py-3 rounded-lg border ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                      placeholder="Please provide a reason for calling off..."
                    />
                  </div>

                  <div className={`p-3 rounded-lg ${isDark ? "bg-amber-500/10 border border-amber-500/30" : "bg-amber-50 border border-amber-200"}`}>
                    <p className={`text-sm ${isDark ? "text-amber-400" : "text-amber-700"}`}>
                      <strong>Important:</strong> Please call off as early as possible to allow for shift coverage.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className={`flex-1 py-3 rounded-lg font-medium ${isDark ? "bg-slate-700 text-white" : "bg-gray-100 text-gray-900"}`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 py-3 rounded-lg font-medium text-white bg-red-500 disabled:opacity-50"
                    >
                      {isSubmitting ? "Submitting..." : "Submit Call Off"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </form>
        )}

        {/* Recent Call Offs */}
        <div>
          <h2 className={`font-semibold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
            Recent Call Offs
          </h2>
          {recentCallOffs.length > 0 ? (
            <div className="space-y-3">
              {recentCallOffs.map((co) => (
                <div
                  key={co._id}
                  className={`rounded-xl p-4 ${isDark ? "bg-slate-800 border border-slate-700" : "bg-white border border-gray-200"}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                      {new Date(co.date + "T00:00:00").toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      co.acknowledgedBy
                        ? isDark ? "bg-green-500/20 text-green-400" : "bg-green-100 text-green-700"
                        : isDark ? "bg-amber-500/20 text-amber-400" : "bg-amber-100 text-amber-700"
                    }`}>
                      {co.acknowledgedBy ? "Acknowledged" : "Pending"}
                    </span>
                  </div>
                  <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    {co.reason}
                  </p>
                  <p className={`text-xs mt-2 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                    Submitted: {new Date(co.reportedAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className={`rounded-xl p-6 text-center ${isDark ? "bg-slate-800 border border-slate-700" : "bg-white border border-gray-200"}`}>
              <p className={isDark ? "text-slate-400" : "text-gray-500"}>
                No call offs on record
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function CallOffPage() {
  return (
    <Protected>
      <CallOffContent />
    </Protected>
  );
}
