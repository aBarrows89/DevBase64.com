"use client";

import React, { useState, useEffect } from "react";
import Protected from "../protected";
import Sidebar, { MobileHeader } from "@/components/Sidebar";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "../auth-context";
import { Id } from "@/convex/_generated/dataModel";

function DailyLogContent() {
  const { user } = useAuth();
  const today = new Date().toISOString().split("T")[0];

  const [selectedDate, setSelectedDate] = useState(today);
  const [summary, setSummary] = useState("");
  const [accomplishments, setAccomplishments] = useState<string[]>([""]);
  const [blockers, setBlockers] = useState("");
  const [goalsForTomorrow, setGoalsForTomorrow] = useState("");
  const [hoursWorked, setHoursWorked] = useState<string>("");
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showPastLogs, setShowPastLogs] = useState(false);

  // Queries
  const existingLog = useQuery(
    api.dailyLogs.getByDate,
    user?._id ? { userId: user._id, date: selectedDate } : "skip"
  );
  const autoActivities = useQuery(
    api.dailyLogs.getAutoActivities,
    user?._id ? { userId: user._id, date: selectedDate } : "skip"
  );
  const myLogs = useQuery(
    api.dailyLogs.getMyLogs,
    user?._id ? { userId: user._id, limit: 14 } : "skip"
  );
  const projects = useQuery(api.projects.getAll, user?._id ? { userId: user._id } : {}) || [];

  // Mutations
  const saveLog = useMutation(api.dailyLogs.saveLog);

  // Load existing log into form when date changes
  useEffect(() => {
    if (existingLog) {
      setSummary(existingLog.summary);
      setAccomplishments(
        existingLog.accomplishments.length > 0 ? existingLog.accomplishments : [""]
      );
      setBlockers(existingLog.blockers || "");
      setGoalsForTomorrow(existingLog.goalsForTomorrow || "");
      setHoursWorked(existingLog.hoursWorked?.toString() || "");
      setSelectedProjects(
        existingLog.projectIds?.map((id) => id.toString()) || []
      );
    } else {
      // Reset form for new date
      setSummary("");
      setAccomplishments([""]);
      setBlockers("");
      setGoalsForTomorrow("");
      setHoursWorked("");
      setSelectedProjects([]);
    }
  }, [existingLog, selectedDate]);

  const handleAddAccomplishment = () => {
    setAccomplishments([...accomplishments, ""]);
  };

  const handleRemoveAccomplishment = (index: number) => {
    if (accomplishments.length > 1) {
      setAccomplishments(accomplishments.filter((_, i) => i !== index));
    }
  };

  const handleAccomplishmentChange = (index: number, value: string) => {
    const updated = [...accomplishments];
    updated[index] = value;
    setAccomplishments(updated);
  };

  const handleSave = async (submit: boolean = false) => {
    if (!user) return;

    setIsSaving(true);
    try {
      await saveLog({
        userId: user._id,
        date: selectedDate,
        summary,
        accomplishments: accomplishments.filter((a) => a.trim() !== ""),
        blockers: blockers || undefined,
        goalsForTomorrow: goalsForTomorrow || undefined,
        hoursWorked: hoursWorked ? parseFloat(hoursWorked) : undefined,
        projectIds: selectedProjects.length > 0
          ? selectedProjects.map((id) => id as Id<"projects">)
          : undefined,
        isSubmitted: submit,
      });
    } catch (error) {
      console.error("Failed to save log:", error);
      alert(error instanceof Error ? error.message : "Failed to save log");
    } finally {
      setIsSaving(false);
    }
  };

  const isLocked = existingLog?.isSubmitted || false;
  const canSubmit = summary.trim() !== "" && accomplishments.some((a) => a.trim() !== "");

  return (
    <div className="flex h-screen bg-slate-900">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        <MobileHeader />

        {/* Header */}
        <header className="flex-shrink-0 bg-slate-900/80 backdrop-blur-sm border-b border-slate-700 px-4 sm:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Daily Activity Log</h1>
              <p className="text-slate-400 text-xs sm:text-sm mt-1">
                Track your daily work and accomplishments
              </p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={today}
                className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
              />
              <button
                onClick={() => setShowPastLogs(!showPastLogs)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  showPastLogs
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50"
                    : "bg-slate-700 text-slate-300 hover:text-white"
                }`}
              >
                Past Logs
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Status Banner */}
              {isLocked && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-center gap-3">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-green-400 font-medium">This log has been submitted</span>
                </div>
              )}

              {/* Summary */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 sm:p-6">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  What did you work on today? <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  disabled={isLocked}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none disabled:opacity-50"
                  placeholder="Describe your main focus and activities..."
                  rows={4}
                />
              </div>

              {/* Accomplishments */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 sm:p-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-300">
                    Accomplishments <span className="text-red-400">*</span>
                  </label>
                  {!isLocked && (
                    <button
                      onClick={handleAddAccomplishment}
                      className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {accomplishments.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-green-400">•</span>
                      <input
                        type="text"
                        value={item}
                        onChange={(e) => handleAccomplishmentChange(index, e.target.value)}
                        disabled={isLocked}
                        className="flex-1 px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-sm disabled:opacity-50"
                        placeholder="What did you accomplish?"
                      />
                      {!isLocked && accomplishments.length > 1 && (
                        <button
                          onClick={() => handleRemoveAccomplishment(index)}
                          className="text-slate-500 hover:text-red-400 p-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Blockers */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 sm:p-6">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Blockers / Challenges
                </label>
                <textarea
                  value={blockers}
                  onChange={(e) => setBlockers(e.target.value)}
                  disabled={isLocked}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none disabled:opacity-50"
                  placeholder="Any blockers or challenges you faced..."
                  rows={2}
                />
              </div>

              {/* Goals for Tomorrow */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 sm:p-6">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Goals for Tomorrow
                </label>
                <textarea
                  value={goalsForTomorrow}
                  onChange={(e) => setGoalsForTomorrow(e.target.value)}
                  disabled={isLocked}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none disabled:opacity-50"
                  placeholder="What do you plan to focus on tomorrow?"
                  rows={2}
                />
              </div>

              {/* Hours & Projects Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 sm:p-6">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Hours Worked
                  </label>
                  <input
                    type="number"
                    value={hoursWorked}
                    onChange={(e) => setHoursWorked(e.target.value)}
                    disabled={isLocked}
                    min="0"
                    max="24"
                    step="0.5"
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 disabled:opacity-50"
                    placeholder="8"
                  />
                </div>

                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 sm:p-6">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Projects Worked On
                  </label>
                  <select
                    multiple
                    value={selectedProjects}
                    onChange={(e) =>
                      setSelectedProjects(
                        Array.from(e.target.selectedOptions, (opt) => opt.value)
                      )
                    }
                    disabled={isLocked}
                    className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500 disabled:opacity-50"
                    size={3}
                  >
                    {projects.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
                </div>
              </div>

              {/* Action Buttons */}
              {!isLocked && (
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => handleSave(false)}
                    disabled={isSaving}
                    className="px-6 py-3 bg-slate-700 text-white font-medium rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50"
                  >
                    {isSaving ? "Saving..." : "Save Draft"}
                  </button>
                  <button
                    onClick={() => handleSave(true)}
                    disabled={isSaving || !canSubmit}
                    className="px-6 py-3 bg-cyan-500 text-white font-medium rounded-lg hover:bg-cyan-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? "Submitting..." : "Submit Log"}
                  </button>
                </div>
              )}
            </div>

            {/* Sidebar - Auto Activities & Past Logs */}
            <div className="space-y-6">
              {/* Auto-Tracked Activities */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 sm:p-6">
                <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Auto-Tracked Today
                </h3>
                {autoActivities ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-sm">Projects Created</span>
                      <span className="text-white font-medium">{autoActivities.projectsCreated}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-sm">Projects Moved</span>
                      <span className="text-white font-medium">{autoActivities.projectsMoved}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-sm">Tasks Completed</span>
                      <span className="text-white font-medium">{autoActivities.tasksCompleted}</span>
                    </div>
                    <div className="border-t border-slate-700 pt-3 flex justify-between items-center">
                      <span className="text-slate-300 text-sm font-medium">Total Actions</span>
                      <span className="text-cyan-400 font-bold">{autoActivities.totalActions}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">Loading...</p>
                )}
              </div>

              {/* Past Logs */}
              {(showPastLogs || !existingLog) && myLogs && myLogs.length > 0 && (
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 sm:p-6">
                  <h3 className="text-sm font-medium text-slate-300 mb-4">Recent Logs</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {myLogs.map((log) => (
                      <button
                        key={log._id}
                        onClick={() => setSelectedDate(log.date)}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                          log.date === selectedDate
                            ? "bg-cyan-500/20 border border-cyan-500/50"
                            : "bg-slate-900/50 hover:bg-slate-700/50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-white text-sm">
                            {new Date(log.date + "T00:00:00").toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          {log.isSubmitted ? (
                            <span className="text-green-400 text-xs flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Submitted
                            </span>
                          ) : (
                            <span className="text-amber-400 text-xs">Draft</span>
                          )}
                        </div>
                        <p className="text-slate-400 text-xs truncate mt-1">
                          {log.accomplishments.length} accomplishments
                          {log.hoursWorked ? ` • ${log.hoursWorked}h` : ""}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Stats */}
              {existingLog && (
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 sm:p-6">
                  <h3 className="text-sm font-medium text-slate-300 mb-4">Log Summary</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-sm">Accomplishments</span>
                      <span className="text-white font-medium">{existingLog.accomplishments.length}</span>
                    </div>
                    {existingLog.hoursWorked && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 text-sm">Hours</span>
                        <span className="text-white font-medium">{existingLog.hoursWorked}h</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-sm">Status</span>
                      <span className={`text-xs font-medium ${existingLog.isSubmitted ? "text-green-400" : "text-amber-400"}`}>
                        {existingLog.isSubmitted ? "Submitted" : "Draft"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function DailyLogPage() {
  return (
    <Protected>
      <DailyLogContent />
    </Protected>
  );
}
