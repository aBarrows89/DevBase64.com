"use client";

import { useState } from "react";
import Protected from "../protected";
import Sidebar, { MobileHeader } from "@/components/Sidebar";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useTheme } from "../theme-context";
import { useAuth } from "../auth-context";

const REQUEST_TYPES = [
  { value: "vacation", label: "Vacation", color: "blue" },
  { value: "sick", label: "Sick", color: "amber" },
  { value: "personal", label: "Personal", color: "purple" },
  { value: "bereavement", label: "Bereavement", color: "slate" },
  { value: "other", label: "Other", color: "gray" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All Requests" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "denied", label: "Denied" },
];

const typeColors: Record<string, string> = {
  vacation: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  sick: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  personal: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  bereavement: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  other: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const statusColors: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  approved: "bg-green-500/20 text-green-400 border-green-500/30",
  denied: "bg-red-500/20 text-red-400 border-red-500/30",
};

function TimeOffContent() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { user, canManageTimeOff } = useAuth();

  const allRequests = useQuery(api.timeOffRequests.getAll, {}) || [];
  const stats = useQuery(api.timeOffRequests.getStats) || {
    pendingCount: 0,
    outToday: 0,
    requestsThisWeek: 0,
    approvedUpcoming: 0,
  };

  const approveMutation = useMutation(api.timeOffRequests.approve);
  const denyMutation = useMutation(api.timeOffRequests.deny);

  const [filterStatus, setFilterStatus] = useState<string>("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<Id<"timeOffRequests"> | null>(null);
  const [managerNotes, setManagerNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Redirect if user doesn't have permission
  if (!canManageTimeOff) {
    return (
      <div className={`flex h-screen ${isDark ? "bg-slate-900" : "bg-[#f2f2f7]"}`}>
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
              Access Denied
            </h1>
            <p className={`mt-2 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
              You don&apos;t have permission to view this page.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const filteredRequests = allRequests.filter((request) => {
    const matchesStatus = filterStatus === "all" || request.status === filterStatus;
    const matchesSearch =
      searchTerm === "" ||
      request.personnelName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.personnelDepartment?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleApprove = async (requestId: Id<"timeOffRequests">) => {
    if (!user) return;
    setIsProcessing(true);
    try {
      await approveMutation({
        requestId,
        reviewedBy: user._id,
        managerNotes: managerNotes || undefined,
      });
      setSelectedRequest(null);
      setManagerNotes("");
    } catch (error) {
      console.error("Failed to approve request:", error);
    }
    setIsProcessing(false);
  };

  const handleDeny = async (requestId: Id<"timeOffRequests">) => {
    if (!user) return;
    setIsProcessing(true);
    try {
      await denyMutation({
        requestId,
        reviewedBy: user._id,
        managerNotes: managerNotes || undefined,
      });
      setSelectedRequest(null);
      setManagerNotes("");
    } catch (error) {
      console.error("Failed to deny request:", error);
    }
    setIsProcessing(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const selectedRequestData = selectedRequest
    ? allRequests.find((r) => r._id === selectedRequest)
    : null;

  return (
    <div className={`flex h-screen ${isDark ? "bg-slate-900" : "bg-[#f2f2f7]"}`}>
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <MobileHeader />

        {/* Header */}
        <header className={`sticky top-0 z-10 backdrop-blur-sm border-b px-4 sm:px-8 py-3 sm:py-4 ${isDark ? "bg-slate-900/80 border-slate-700" : "bg-white/80 border-gray-200"}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className={`text-xl sm:text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                Time Off Requests
              </h1>
              <p className={`text-xs sm:text-sm mt-1 hidden sm:block ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                Review and manage employee time off requests
              </p>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-8 space-y-4 sm:space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
            <div className={`rounded-lg p-2 sm:p-4 text-center ${isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white border border-gray-200 shadow-sm"}`}>
              <p className={`text-lg sm:text-2xl font-bold text-amber-400`}>{stats.pendingCount}</p>
              <p className={`text-[10px] sm:text-xs ${isDark ? "text-slate-500" : "text-gray-500"}`}>Pending</p>
            </div>
            <div className={`rounded-lg p-2 sm:p-4 text-center ${isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white border border-gray-200 shadow-sm"}`}>
              <p className={`text-lg sm:text-2xl font-bold text-blue-400`}>{stats.outToday}</p>
              <p className={`text-[10px] sm:text-xs ${isDark ? "text-slate-500" : "text-gray-500"}`}>Out Today</p>
            </div>
            <div className={`rounded-lg p-2 sm:p-4 text-center ${isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white border border-gray-200 shadow-sm"}`}>
              <p className={`text-lg sm:text-2xl font-bold text-green-400`}>{stats.approvedUpcoming}</p>
              <p className={`text-[10px] sm:text-xs ${isDark ? "text-slate-500" : "text-gray-500"}`}>Upcoming</p>
            </div>
            <div className={`rounded-lg p-2 sm:p-4 text-center ${isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white border border-gray-200 shadow-sm"}`}>
              <p className={`text-lg sm:text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{stats.requestsThisWeek}</p>
              <p className={`text-[10px] sm:text-xs ${isDark ? "text-slate-500" : "text-gray-500"}`}>This Week</p>
            </div>
          </div>

          {/* Filters */}
          <div className={`rounded-lg p-3 sm:p-4 ${isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white border border-gray-200 shadow-sm"}`}>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search by name or department..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${
                    isDark
                      ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                  }`}
                />
              </div>
              <div className="flex gap-2 overflow-x-auto">
                {STATUS_OPTIONS.map((status) => (
                  <button
                    key={status.value}
                    onClick={() => setFilterStatus(status.value)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                      filterStatus === status.value
                        ? isDark
                          ? "bg-cyan-500 text-white"
                          : "bg-blue-600 text-white"
                        : isDark
                          ? "bg-slate-700 text-slate-300 hover:bg-slate-600"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {status.label}
                    {status.value === "pending" && stats.pendingCount > 0 && (
                      <span className="ml-1.5 bg-amber-500 text-white px-1.5 py-0.5 rounded-full text-xs">
                        {stats.pendingCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Requests List */}
          <div className={`rounded-lg overflow-hidden ${isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white border border-gray-200 shadow-sm"}`}>
            {filteredRequests.length === 0 ? (
              <div className="p-8 text-center">
                <svg
                  className={`w-12 h-12 mx-auto mb-3 ${isDark ? "text-slate-600" : "text-gray-300"}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p className={isDark ? "text-slate-400" : "text-gray-500"}>
                  No time off requests found
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-700">
                {filteredRequests.map((request) => (
                  <div
                    key={request._id}
                    className={`p-4 ${isDark ? "hover:bg-slate-700/50" : "hover:bg-gray-50"} transition-colors`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                            {request.personnelName}
                          </h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${typeColors[request.requestType]}`}>
                            {REQUEST_TYPES.find((t) => t.value === request.requestType)?.label || request.requestType}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColors[request.status]}`}>
                            {request.status}
                          </span>
                        </div>
                        <div className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                          {request.personnelDepartment} &bull; {request.personnelPosition}
                        </div>
                        <div className={`mt-2 text-sm ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                          <span className="font-medium">{formatDate(request.startDate)}</span>
                          {request.startDate !== request.endDate && (
                            <>
                              <span className={isDark ? "text-slate-500" : "text-gray-400"}> to </span>
                              <span className="font-medium">{formatDate(request.endDate)}</span>
                            </>
                          )}
                          <span className={`ml-2 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                            ({request.totalDays} day{request.totalDays !== 1 ? "s" : ""})
                          </span>
                        </div>
                        {request.reason && (
                          <p className={`mt-2 text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                            {request.reason}
                          </p>
                        )}
                        <p className={`mt-2 text-xs ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                          Requested {formatTimestamp(request.requestedAt)}
                          {request.reviewedBy && (
                            <>
                              <span> &bull; </span>
                              {request.status === "approved" ? "Approved" : "Denied"} by {request.reviewerName}
                            </>
                          )}
                        </p>
                        {request.managerNotes && (
                          <p className={`mt-1 text-xs italic ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                            Note: {request.managerNotes}
                          </p>
                        )}
                      </div>

                      {request.status === "pending" && (
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => {
                              setSelectedRequest(request._id);
                              setManagerNotes("");
                            }}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                              isDark
                                ? "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                                : "bg-blue-100 text-blue-600 hover:bg-blue-200"
                            }`}
                          >
                            Review
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Review Modal */}
      {selectedRequest && selectedRequestData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className={`w-full max-w-md rounded-xl p-6 ${isDark ? "bg-slate-800" : "bg-white"}`}>
            <h2 className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
              Review Time Off Request
            </h2>

            <div className="space-y-3 mb-6">
              <div>
                <span className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>Employee:</span>
                <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                  {selectedRequestData.personnelName}
                </p>
              </div>
              <div>
                <span className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>Type:</span>
                <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                  {REQUEST_TYPES.find((t) => t.value === selectedRequestData.requestType)?.label}
                </p>
              </div>
              <div>
                <span className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>Dates:</span>
                <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                  {formatDate(selectedRequestData.startDate)}
                  {selectedRequestData.startDate !== selectedRequestData.endDate && (
                    <> to {formatDate(selectedRequestData.endDate)}</>
                  )}
                  <span className={`ml-2 font-normal ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    ({selectedRequestData.totalDays} day{selectedRequestData.totalDays !== 1 ? "s" : ""})
                  </span>
                </p>
              </div>
              {selectedRequestData.reason && (
                <div>
                  <span className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>Reason:</span>
                  <p className={`${isDark ? "text-white" : "text-gray-900"}`}>
                    {selectedRequestData.reason}
                  </p>
                </div>
              )}
            </div>

            <div className="mb-6">
              <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                Manager Notes (optional)
              </label>
              <textarea
                value={managerNotes}
                onChange={(e) => setManagerNotes(e.target.value)}
                rows={3}
                className={`w-full px-3 py-2 rounded-lg border text-sm ${
                  isDark
                    ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                }`}
                placeholder="Add a note for the employee..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleDeny(selectedRequest)}
                disabled={isProcessing}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isDark
                    ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                    : "bg-red-100 text-red-600 hover:bg-red-200"
                } disabled:opacity-50`}
              >
                Deny
              </button>
              <button
                onClick={() => handleApprove(selectedRequest)}
                disabled={isProcessing}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isDark
                    ? "bg-green-500 hover:bg-green-400 text-white"
                    : "bg-green-600 hover:bg-green-700 text-white"
                } disabled:opacity-50`}
              >
                Approve
              </button>
            </div>

            <button
              onClick={() => {
                setSelectedRequest(null);
                setManagerNotes("");
              }}
              className={`w-full mt-3 px-4 py-2 rounded-lg font-medium transition-colors ${
                isDark
                  ? "bg-slate-700 hover:bg-slate-600 text-slate-300"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              }`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
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
