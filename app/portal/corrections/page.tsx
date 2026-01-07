"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Protected from "../../protected";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useTheme } from "../../theme-context";
import { useAuth } from "../../auth-context";

const ENTRY_TYPES = [
  { value: "clock_in", label: "Clock In" },
  { value: "clock_out", label: "Clock Out" },
  { value: "break_start", label: "Break Start" },
  { value: "break_end", label: "Break End" },
];

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function CorrectionsContent() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const router = useRouter();
  const { user, canAccessEmployeePortal } = useAuth();
  const personnelId = user?.personnelId;

  const [showForm, setShowForm] = useState(false);
  const [requestType, setRequestType] = useState<"add_missed" | "edit">("add_missed");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [entryType, setEntryType] = useState("clock_in");
  const [requestedTime, setRequestedTime] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const corrections = useQuery(
    api.employeePortal.getMyTimeCorrections,
    personnelId ? { personnelId } : "skip"
  );

  const submitCorrection = useMutation(api.timeClock.requestCorrection);

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
      if (!date || !requestedTime || !reason.trim()) {
        throw new Error("Please fill in all required fields");
      }

      // Convert time to timestamp
      const [hours, minutes] = requestedTime.split(":").map(Number);
      const dateObj = new Date(date + "T00:00:00");
      dateObj.setHours(hours, minutes, 0, 0);
      const requestedTimestamp = dateObj.getTime();

      await submitCorrection({
        personnelId,
        date,
        requestType,
        requestedTimestamp,
        requestedType: entryType,
        reason: reason.trim(),
      });

      setShowForm(false);
      setRequestType("add_missed");
      setDate(new Date().toISOString().split("T")[0]);
      setEntryType("clock_in");
      setRequestedTime("");
      setReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit correction");
    }

    setIsSubmitting(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return isDark ? "bg-green-500/20 text-green-400" : "bg-green-100 text-green-700";
      case "denied":
        return isDark ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-700";
      default:
        return isDark ? "bg-amber-500/20 text-amber-400" : "bg-amber-100 text-amber-700";
    }
  };

  const pendingCorrections = corrections?.filter((c) => c.status === "pending") || [];
  const pastCorrections = corrections?.filter((c) => c.status !== "pending") || [];

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
              Time Corrections
            </h1>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className={`px-4 py-2 rounded-lg font-medium ${isDark ? "bg-cyan-500 text-white" : "bg-blue-600 text-white"}`}
            >
              Request
            </button>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Request Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className={`rounded-2xl p-6 ${isDark ? "bg-slate-800 border border-slate-700" : "bg-white border border-gray-200"}`}>
            <h2 className={`text-lg font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
              Request Time Correction
            </h2>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                  Correction Type
                </label>
                <select
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value as "add_missed" | "edit")}
                  className={`w-full px-4 py-3 rounded-lg border ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                >
                  <option value="add_missed">Add Missed Punch</option>
                  <option value="edit">Edit Existing Entry</option>
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                  className={`w-full px-4 py-3 rounded-lg border ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                  Entry Type
                </label>
                <select
                  value={entryType}
                  onChange={(e) => setEntryType(e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg border ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                >
                  {ENTRY_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                  Requested Time
                </label>
                <input
                  type="time"
                  value={requestedTime}
                  onChange={(e) => setRequestedTime(e.target.value)}
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
                  rows={3}
                  required
                  className={`w-full px-4 py-3 rounded-lg border ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                  placeholder="Explain why this correction is needed..."
                />
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
                  className={`flex-1 py-3 rounded-lg font-medium text-white disabled:opacity-50 ${isDark ? "bg-cyan-500" : "bg-blue-600"}`}
                >
                  {isSubmitting ? "Submitting..." : "Submit"}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Pending Requests */}
        {pendingCorrections.length > 0 && (
          <div>
            <h2 className={`font-semibold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
              Pending Requests
            </h2>
            <div className="space-y-3">
              {pendingCorrections.map((corr) => (
                <div
                  key={corr._id}
                  className={`rounded-xl p-4 ${isDark ? "bg-slate-800 border border-slate-700" : "bg-white border border-gray-200"}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                      {new Date(corr.date + "T00:00:00").toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadge(corr.status)}`}>
                      {corr.status}
                    </span>
                  </div>
                  <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    {corr.requestType === "add_missed" ? "Add Missed:" : "Edit:"}{" "}
                    {corr.requestedType?.replace("_", " ")}{" "}
                    {corr.requestedTimestamp && `at ${formatTime(corr.requestedTimestamp)}`}
                  </p>
                  <p className={`text-sm mt-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    {corr.reason}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Past Requests */}
        <div>
          <h2 className={`font-semibold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
            Request History
          </h2>
          {pastCorrections.length > 0 ? (
            <div className="space-y-3">
              {pastCorrections.map((corr) => (
                <div
                  key={corr._id}
                  className={`rounded-xl p-4 ${isDark ? "bg-slate-800 border border-slate-700" : "bg-white border border-gray-200"}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                      {new Date(corr.date + "T00:00:00").toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full capitalize ${getStatusBadge(corr.status)}`}>
                      {corr.status}
                    </span>
                  </div>
                  <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    {corr.requestedType?.replace("_", " ")}{" "}
                    {corr.requestedTimestamp && `at ${formatTime(corr.requestedTimestamp)}`}
                  </p>
                  {corr.reviewNotes && (
                    <p className={`text-sm mt-2 italic ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                      Manager: {corr.reviewNotes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className={`rounded-xl p-6 text-center ${isDark ? "bg-slate-800 border border-slate-700" : "bg-white border border-gray-200"}`}>
              <p className={isDark ? "text-slate-400" : "text-gray-500"}>
                No previous requests
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function CorrectionsPage() {
  return (
    <Protected>
      <CorrectionsContent />
    </Protected>
  );
}
