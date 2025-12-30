"use client";

import { useState } from "react";
import Protected from "../../protected";
import Sidebar from "@/components/Sidebar";
import { useTheme } from "../../theme-context";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

function ManagerContent() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // State
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedLocation, setSelectedLocation] = useState<Id<"locations"> | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Queries
  const locations = useQuery(api.locations.listActive);
  const completions = useQuery(api.safetyChecklist.getCompletionsByDate, {
    date: selectedDate,
    locationId: selectedLocation === "all" ? undefined : selectedLocation,
  });

  // Stats
  const totalCompletions = completions?.length || 0;
  const passedCount = completions?.filter((c) => c.allPassed).length || 0;
  const failedCount = totalCompletions - passedCount;

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <div className={`flex h-screen ${isDark ? "bg-slate-900" : "bg-gray-50"}`}>
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className={`sticky top-0 z-10 backdrop-blur-sm border-b px-4 sm:px-8 py-4 ${isDark ? "bg-slate-900/80 border-slate-700" : "bg-white/80 border-gray-200"}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className={`text-xl sm:text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                Safety Check Manager
              </h1>
              <p className={`text-xs sm:text-sm mt-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                Monitor and verify safety checklist compliance
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 mt-4">
            <div>
              <label className={`block text-xs font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className={`px-3 py-2 text-sm rounded-lg border focus:outline-none ${isDark ? "bg-slate-800 border-slate-600 text-white" : "bg-white border-gray-300 text-gray-900"}`}
              />
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                Location
              </label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value as Id<"locations"> | "all")}
                className={`px-3 py-2 text-sm rounded-lg border focus:outline-none ${isDark ? "bg-slate-800 border-slate-600 text-white" : "bg-white border-gray-300 text-gray-900"}`}
              >
                <option value="all">All Locations</option>
                {locations?.map((loc) => (
                  <option key={loc._id} value={loc._id}>{loc.name}</option>
                ))}
              </select>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-8">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className={`rounded-xl p-4 ${isDark ? "bg-slate-800 border border-slate-700" : "bg-white border border-gray-200 shadow-sm"}`}>
              <p className={`text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>Total Checks</p>
              <p className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{totalCompletions}</p>
            </div>
            <div className={`rounded-xl p-4 ${isDark ? "bg-green-500/10 border border-green-500/30" : "bg-green-50 border border-green-200"}`}>
              <p className={`text-xs ${isDark ? "text-green-400" : "text-green-600"}`}>All Passed</p>
              <p className={`text-2xl font-bold ${isDark ? "text-green-400" : "text-green-600"}`}>{passedCount}</p>
            </div>
            <div className={`rounded-xl p-4 ${isDark ? "bg-red-500/10 border border-red-500/30" : "bg-red-50 border border-red-200"}`}>
              <p className={`text-xs ${isDark ? "text-red-400" : "text-red-600"}`}>With Issues</p>
              <p className={`text-2xl font-bold ${isDark ? "text-red-400" : "text-red-600"}`}>{failedCount}</p>
            </div>
          </div>

          {/* Completions List */}
          {!completions ? (
            <div className={`text-center py-12 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
              Loading...
            </div>
          ) : completions.length === 0 ? (
            <div className={`text-center py-12 border rounded-xl ${isDark ? "bg-slate-800/50 border-slate-700 text-slate-400" : "bg-white border-gray-200 text-gray-500"}`}>
              <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <p>No safety checks completed for {selectedDate}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {completions.map((completion) => (
                <div
                  key={completion._id}
                  className={`border rounded-xl overflow-hidden ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm"}`}
                >
                  {/* Summary Row */}
                  <div
                    className="p-4 cursor-pointer hover:bg-slate-700/30 transition-colors"
                    onClick={() => setExpandedId(expandedId === completion._id ? null : completion._id)}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        {/* Status Badge */}
                        <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${
                          completion.allPassed
                            ? "bg-green-500/20 text-green-400"
                            : "bg-red-500/20 text-red-400"
                        }`}>
                          {completion.allPassed ? (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>

                        {/* Info */}
                        <div className="min-w-0">
                          <p className={`font-semibold truncate ${isDark ? "text-white" : "text-gray-900"}`}>
                            {completion.personnelName}
                          </p>
                          <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                            Picker #{completion.equipmentNumber}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="text-right">
                          <p className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                            {formatTime(completion.completedAt)}
                          </p>
                          <p className={`text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                            {formatDuration(completion.totalTimeSpent)}
                          </p>
                        </div>

                        <svg
                          className={`w-5 h-5 text-slate-400 transition-transform ${
                            expandedId === completion._id ? "rotate-180" : ""
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    {/* Issues Preview */}
                    {!completion.allPassed && completion.issues && completion.issues.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {completion.issues.slice(0, 3).map((issue, idx) => (
                          <span
                            key={idx}
                            className={`px-2 py-1 text-xs rounded ${isDark ? "bg-red-500/20 text-red-400" : "bg-red-50 text-red-600"}`}
                          >
                            {issue.description.length > 30 ? issue.description.substring(0, 30) + "..." : issue.description}
                          </span>
                        ))}
                        {completion.issues.length > 3 && (
                          <span className={`px-2 py-1 text-xs rounded ${isDark ? "bg-slate-700 text-slate-400" : "bg-gray-100 text-gray-500"}`}>
                            +{completion.issues.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Expanded Details */}
                  {expandedId === completion._id && (
                    <div className={`border-t ${isDark ? "border-slate-700" : "border-gray-200"}`}>
                      <div className="p-4 space-y-3">
                        <h4 className={`font-medium text-sm ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                          Checklist Responses
                        </h4>
                        <div className="space-y-2">
                          {completion.responses.map((r, idx) => (
                            <div
                              key={idx}
                              className={`flex items-start gap-3 p-3 rounded-lg ${
                                r.passed
                                  ? isDark ? "bg-green-500/10" : "bg-green-50"
                                  : isDark ? "bg-red-500/10" : "bg-red-50"
                              }`}
                            >
                              <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center ${
                                r.passed ? "bg-green-500 text-white" : "bg-red-500 text-white"
                              }`}>
                                {r.passed ? (
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                ) : (
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                                  {r.question}
                                </p>
                                {r.notes && (
                                  <p className={`text-xs mt-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                                    Note: {r.notes}
                                  </p>
                                )}
                              </div>
                              <span className={`text-xs ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                                {r.timeSpent}s
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function SafetyCheckManagerPage() {
  return (
    <Protected>
      <ManagerContent />
    </Protected>
  );
}
