"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Protected from "../../protected";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useTheme } from "../../theme-context";
import { useAuth } from "../../auth-context";

const REQUEST_TYPES = [
  { value: "vacation", label: "Vacation" },
  { value: "sick", label: "Sick" },
  { value: "personal", label: "Personal" },
  { value: "bereavement", label: "Bereavement" },
  { value: "other", label: "Other" },
];

function TimeOffContent() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const router = useRouter();
  const { user, canAccessEmployeePortal } = useAuth();
  const personnelId = user?.personnelId;

  const [showForm, setShowForm] = useState(false);
  const [requestType, setRequestType] = useState("vacation");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requests = useQuery(
    api.employeePortal.getMyTimeOffRequests,
    personnelId ? { personnelId } : "skip"
  );

  const submitRequest = useMutation(api.employeePortal.submitTimeOffRequest);
  const cancelRequest = useMutation(api.employeePortal.cancelTimeOffRequest);

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
      if (!startDate || !endDate) {
        throw new Error("Please select start and end dates");
      }

      if (new Date(endDate) < new Date(startDate)) {
        throw new Error("End date must be after start date");
      }

      await submitRequest({
        personnelId,
        requestType,
        startDate,
        endDate,
        reason: reason || undefined,
      });

      setShowForm(false);
      setRequestType("vacation");
      setStartDate("");
      setEndDate("");
      setReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit request");
    }

    setIsSubmitting(false);
  };

  const handleCancel = async (requestId: string) => {
    if (!confirm("Are you sure you want to cancel this request?")) return;

    try {
      await cancelRequest({
        requestId: requestId as any,
        personnelId,
      });
    } catch (err) {
      alert("Failed to cancel request");
    }
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

  const pendingRequests = requests?.filter((r) => r.status === "pending") || [];
  const pastRequests = requests?.filter((r) => r.status !== "pending") || [];

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
              Time Off
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
              New Time Off Request
            </h2>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                  Type
                </label>
                <select
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg border ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                >
                  {REQUEST_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className={`w-full px-4 py-3 rounded-lg border ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate || new Date().toISOString().split("T")[0]}
                    className={`w-full px-4 py-3 rounded-lg border ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                  Reason (Optional)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className={`w-full px-4 py-3 rounded-lg border ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                  placeholder="Additional details..."
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
        {pendingRequests.length > 0 && (
          <div>
            <h2 className={`font-semibold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
              Pending Requests
            </h2>
            <div className="space-y-3">
              {pendingRequests.map((req) => (
                <div
                  key={req._id}
                  className={`rounded-xl p-4 ${isDark ? "bg-slate-800 border border-slate-700" : "bg-white border border-gray-200"}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-medium capitalize ${isDark ? "text-white" : "text-gray-900"}`}>
                      {req.requestType}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadge(req.status)}`}>
                      {req.status}
                    </span>
                  </div>
                  <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    {new Date(req.startDate + "T00:00:00").toLocaleDateString()} -{" "}
                    {new Date(req.endDate + "T00:00:00").toLocaleDateString()}
                    <span className="ml-2">({req.totalDays} day{req.totalDays > 1 ? "s" : ""})</span>
                  </p>
                  {req.reason && (
                    <p className={`text-sm mt-2 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                      {req.reason}
                    </p>
                  )}
                  <button
                    onClick={() => handleCancel(req._id)}
                    className={`mt-3 text-sm font-medium ${isDark ? "text-red-400" : "text-red-600"}`}
                  >
                    Cancel Request
                  </button>
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
          {pastRequests.length > 0 ? (
            <div className="space-y-3">
              {pastRequests.map((req) => (
                <div
                  key={req._id}
                  className={`rounded-xl p-4 ${isDark ? "bg-slate-800 border border-slate-700" : "bg-white border border-gray-200"}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-medium capitalize ${isDark ? "text-white" : "text-gray-900"}`}>
                      {req.requestType}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full capitalize ${getStatusBadge(req.status)}`}>
                      {req.status}
                    </span>
                  </div>
                  <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    {new Date(req.startDate + "T00:00:00").toLocaleDateString()} -{" "}
                    {new Date(req.endDate + "T00:00:00").toLocaleDateString()}
                  </p>
                  {req.managerNotes && (
                    <p className={`text-sm mt-2 italic ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                      Manager: {req.managerNotes}
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

export default function TimeOffPage() {
  return (
    <Protected>
      <TimeOffContent />
    </Protected>
  );
}
