"use client";

import React, { useState, useEffect } from "react";
import Protected from "../protected";
import Sidebar, { MobileHeader } from "@/components/Sidebar";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "../auth-context";
import { Id } from "@/convex/_generated/dataModel";

// Admin View Component - Shows all team logs with live activity
function AdminDailyLogView() {
  const { user } = useAuth();
  const [showDrafts, setShowDrafts] = useState(true);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [editingCommentLogId, setEditingCommentLogId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [savingComment, setSavingComment] = useState(false);

  const allLogs = useQuery(api.dailyLogs.getAllLogsIncludingDrafts, { limit: 50 });
  const todayLiveActivity = useQuery(api.dailyLogs.getTodayLiveActivity, {});
  const addReviewerComment = useMutation(api.dailyLogs.addReviewerComment);

  // Handle saving reviewer comment
  const handleSaveComment = async (logId: Id<"dailyLogs">) => {
    if (!user) return;
    setSavingComment(true);
    try {
      await addReviewerComment({
        logId,
        reviewerId: user._id,
        comment: commentText,
      });
      setEditingCommentLogId(null);
      setCommentText("");
    } catch (error) {
      console.error("Failed to save comment:", error);
      alert("Failed to save comment");
    } finally {
      setSavingComment(false);
    }
  };

  // Start editing a comment
  const handleStartEditing = (logId: string, existingComment?: string) => {
    setEditingCommentLogId(logId);
    setCommentText(existingComment || "");
  };

  // Filter logs based on showDrafts toggle
  const filteredLogs = allLogs?.filter(log => showDrafts || log.isSubmitted) || [];

  // Group logs by date
  const logsByDate = filteredLogs.reduce((acc, log) => {
    if (!acc[log.date]) {
      acc[log.date] = [];
    }
    acc[log.date].push(log);
    return acc;
  }, {} as Record<string, typeof filteredLogs>);

  const sortedDates = Object.keys(logsByDate).sort((a, b) => b.localeCompare(a));
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="flex h-screen bg-slate-900">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        <MobileHeader />

        {/* Header */}
        <header className="flex-shrink-0 bg-slate-900/80 backdrop-blur-sm border-b border-slate-700 px-4 sm:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Team Daily Logs</h1>
              <p className="text-slate-400 text-xs sm:text-sm mt-1">
                View team activity and daily logs in real-time
              </p>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showDrafts}
                  onChange={(e) => setShowDrafts(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0"
                />
                <span className="text-sm text-slate-300">Show Drafts</span>
              </label>
              <a
                href="/daily-log/report"
                className="px-4 py-2 bg-cyan-500 text-white font-medium rounded-lg hover:bg-cyan-600 transition-colors flex items-center gap-2 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Print Report
              </a>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-5xl mx-auto space-y-6">

            {/* Today's Live Activity Section */}
            {todayLiveActivity && todayLiveActivity.length > 0 && (
              <div className="bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/30 rounded-xl p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <h2 className="text-lg font-semibold text-white">Today&apos;s Live Activity</h2>
                  <span className="text-slate-400 text-sm">({new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })})</span>
                </div>

                <div className="space-y-4">
                  {todayLiveActivity.map((userActivity) => (
                    <div key={userActivity.userId} className="bg-slate-800/50 rounded-lg p-4">
                      <div
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => setExpandedUser(expandedUser === userActivity.userId ? null : userActivity.userId)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-medium">
                            {userActivity.userName
                              .split(" ")
                              .map((n: string) => n[0])
                              .join("")
                              .slice(0, 2)}
                          </div>
                          <div>
                            <p className="text-white font-medium">{userActivity.userName}</p>
                            <div className="flex items-center gap-3 text-sm">
                              <span className="text-cyan-400">{userActivity.activity.totalActions} actions today</span>
                              {userActivity.todayLog ? (
                                userActivity.todayLog.isSubmitted ? (
                                  <span className="text-green-400 flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Log Submitted
                                  </span>
                                ) : (
                                  <span className="text-amber-400 flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Draft in Progress
                                  </span>
                                )
                              ) : (
                                <span className="text-slate-500">No log started</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="hidden sm:flex gap-4 text-sm">
                            {userActivity.activity.projectsCreated > 0 && (
                              <span className="text-slate-300">{userActivity.activity.projectsCreated} projects</span>
                            )}
                            {userActivity.activity.tasksCompleted > 0 && (
                              <span className="text-slate-300">{userActivity.activity.tasksCompleted} tasks</span>
                            )}
                          </div>
                          <svg
                            className={`w-5 h-5 text-slate-400 transition-transform ${expandedUser === userActivity.userId ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {expandedUser === userActivity.userId && (
                        <div className="mt-4 pt-4 border-t border-slate-700 space-y-4">
                          {/* Activity Stats */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                              <p className="text-2xl font-bold text-purple-400">{userActivity.activity.projectsCreated}</p>
                              <p className="text-xs text-slate-400">Projects Created</p>
                            </div>
                            <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                              <p className="text-2xl font-bold text-blue-400">{userActivity.activity.projectsMoved}</p>
                              <p className="text-xs text-slate-400">Projects Moved</p>
                            </div>
                            <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                              <p className="text-2xl font-bold text-green-400">{userActivity.activity.tasksCompleted}</p>
                              <p className="text-xs text-slate-400">Tasks Done</p>
                            </div>
                            <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                              <p className="text-2xl font-bold text-cyan-400">{userActivity.activity.totalActions}</p>
                              <p className="text-xs text-slate-400">Total Actions</p>
                            </div>
                          </div>

                          {/* Current Draft Log */}
                          {userActivity.todayLog && !userActivity.todayLog.isSubmitted && (
                            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                              <h4 className="text-amber-400 text-sm font-medium mb-2 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Current Draft
                                <span className="text-slate-400 font-normal">
                                  (Last updated: {new Date(userActivity.todayLog.updatedAt).toLocaleTimeString()})
                                </span>
                              </h4>
                              {userActivity.todayLog.summary && (
                                <div className="mb-2">
                                  <span className="text-slate-400 text-xs">Summary: </span>
                                  <span className="text-white text-sm">{userActivity.todayLog.summary}</span>
                                </div>
                              )}
                              {userActivity.todayLog.accomplishments && userActivity.todayLog.accomplishments.length > 0 && (
                                <div className="mb-2">
                                  <span className="text-slate-400 text-xs">Accomplishments: </span>
                                  <span className="text-green-400 text-sm">{userActivity.todayLog.accomplishments.length} items</span>
                                </div>
                              )}
                              {userActivity.todayLog.hoursWorked && (
                                <div>
                                  <span className="text-slate-400 text-xs">Hours: </span>
                                  <span className="text-white text-sm">{userActivity.todayLog.hoursWorked}h</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Recent Actions Feed */}
                          {userActivity.recentActions.length > 0 && (
                            <div>
                              <h4 className="text-slate-300 text-sm font-medium mb-2">Recent Activity</h4>
                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                {userActivity.recentActions.map((action, idx) => (
                                  <div key={idx} className="flex items-start gap-2 text-sm">
                                    <span className="text-slate-500 text-xs whitespace-nowrap">
                                      {new Date(action.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <span className="text-slate-400">{action.action || action.details}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Historical Logs Section */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Log History
              </h2>

              {!allLogs ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
                </div>
              ) : sortedDates.length === 0 ? (
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
                  <svg className="w-12 h-12 mx-auto text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-slate-400">No daily logs yet</p>
                  <p className="text-slate-500 text-sm mt-2">
                    Team members with &quot;Requires Daily Log&quot; enabled can submit logs from their Daily Log page
                  </p>
                </div>
              ) : (
                sortedDates.map((date) => (
                  <div key={date} className="space-y-4 mb-6">
                    <h3 className="text-md font-medium text-slate-300 flex items-center gap-2">
                      <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {new Date(date + "T12:00:00").toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                      {date === today && <span className="text-cyan-400 text-xs bg-cyan-500/20 px-2 py-0.5 rounded-full ml-2">Today</span>}
                    </h3>

                    {logsByDate[date]?.map((log) => (
                      <div
                        key={log._id}
                        className={`bg-slate-800 border rounded-xl p-4 sm:p-6 ${
                          log.isSubmitted ? 'border-slate-700' : 'border-amber-500/30'
                        }`}
                      >
                        {/* User Header */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-medium">
                              {log.userName
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)}
                            </div>
                            <div>
                              <p className="text-white font-medium">{log.userName}</p>
                              {log.hoursWorked && (
                                <p className="text-slate-400 text-sm">{log.hoursWorked} hours worked</p>
                              )}
                            </div>
                          </div>
                          {log.isSubmitted ? (
                            <span className="text-green-400 text-xs flex items-center gap-1 bg-green-500/10 px-2 py-1 rounded-full">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Submitted
                            </span>
                          ) : (
                            <span className="text-amber-400 text-xs flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded-full">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Draft
                            </span>
                          )}
                        </div>

                        {/* Summary */}
                        <div className="mb-4">
                          <h4 className="text-slate-400 text-xs uppercase tracking-wide mb-1">Summary</h4>
                          <p className="text-white">{log.summary || <span className="text-slate-500 italic">No summary yet</span>}</p>
                        </div>

                        {/* Accomplishments */}
                        {log.accomplishments && log.accomplishments.length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-slate-400 text-xs uppercase tracking-wide mb-2">Accomplishments</h4>
                            <ul className="space-y-1">
                              {log.accomplishments.map((acc, i) => (
                                <li key={i} className="flex items-start gap-2 text-green-400">
                                  <span className="mt-1">•</span>
                                  <span>{acc}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Blockers */}
                        {log.blockers && (
                          <div className="mb-4">
                            <h4 className="text-slate-400 text-xs uppercase tracking-wide mb-1">Blockers</h4>
                            <p className="text-amber-400">{log.blockers}</p>
                          </div>
                        )}

                        {/* Goals for Tomorrow */}
                        {log.goalsForTomorrow && (
                          <div>
                            <h4 className="text-slate-400 text-xs uppercase tracking-wide mb-1">Goals for Tomorrow</h4>
                            <p className="text-slate-300">{log.goalsForTomorrow}</p>
                          </div>
                        )}

                        {/* Auto Activities */}
                        {log.autoActivities && log.autoActivities.totalActions > 0 && (
                          <div className="mt-4 pt-4 border-t border-slate-700">
                            <h4 className="text-slate-400 text-xs uppercase tracking-wide mb-2">Auto-Tracked Activity</h4>
                            <div className="flex gap-4 text-sm">
                              {log.autoActivities.projectsCreated > 0 && (
                                <span className="text-slate-300">
                                  {log.autoActivities.projectsCreated} project{log.autoActivities.projectsCreated !== 1 ? "s" : ""} created
                                </span>
                              )}
                              {log.autoActivities.tasksCompleted > 0 && (
                                <span className="text-slate-300">
                                  {log.autoActivities.tasksCompleted} task{log.autoActivities.tasksCompleted !== 1 ? "s" : ""} completed
                                </span>
                              )}
                              <span className="text-cyan-400">
                                {log.autoActivities.totalActions} total actions
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Reviewer Notes - Only for submitted logs */}
                        {log.isSubmitted && (
                          <div className="mt-4 pt-4 border-t border-slate-700">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-slate-400 text-xs uppercase tracking-wide flex items-center gap-2">
                                <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Reviewer Notes
                                <span className="text-slate-500 normal-case text-xs">(not visible to submitter)</span>
                              </h4>
                              {!editingCommentLogId && (
                                <button
                                  onClick={() => handleStartEditing(log._id, log.reviewerComment)}
                                  className="text-indigo-400 hover:text-indigo-300 text-xs flex items-center gap-1"
                                >
                                  {log.reviewerComment ? "Edit" : "Add Note"}
                                </button>
                              )}
                            </div>

                            {editingCommentLogId === log._id ? (
                              <div className="space-y-2">
                                <textarea
                                  value={commentText}
                                  onChange={(e) => setCommentText(e.target.value)}
                                  className="w-full px-3 py-2 bg-slate-900/50 border border-indigo-500/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 text-sm resize-none"
                                  placeholder="Add reviewer notes for this log..."
                                  rows={3}
                                />
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => {
                                      setEditingCommentLogId(null);
                                      setCommentText("");
                                    }}
                                    className="px-3 py-1.5 text-slate-400 hover:text-white text-sm"
                                    disabled={savingComment}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => handleSaveComment(log._id as Id<"dailyLogs">)}
                                    disabled={savingComment}
                                    className="px-3 py-1.5 bg-indigo-500 text-white text-sm rounded-lg hover:bg-indigo-600 disabled:opacity-50"
                                  >
                                    {savingComment ? "Saving..." : "Save Note"}
                                  </button>
                                </div>
                              </div>
                            ) : log.reviewerComment ? (
                              <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-3">
                                <p className="text-indigo-300 text-sm">{log.reviewerComment}</p>
                                {log.reviewerCommentByName && log.reviewerCommentAt && (
                                  <p className="text-slate-500 text-xs mt-2">
                                    — {log.reviewerCommentByName}, {new Date(log.reviewerCommentAt).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <p className="text-slate-500 text-sm italic">No reviewer notes yet</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Employee View Component - Entry form for daily logs
function EmployeeDailyLogView() {
  const { user } = useAuth();
  const today = new Date().toISOString().split("T")[0];

  const [selectedDate, setSelectedDate] = useState(today);
  const [summary, setSummary] = useState("");
  const [accomplishments, setAccomplishments] = useState<string[]>([""]);
  const [blockers, setBlockers] = useState("");
  const [goalsForTomorrow, setGoalsForTomorrow] = useState("");
  const [hoursWorked, setHoursWorked] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [showPastLogs, setShowPastLogs] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Auto-save state
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const isInitialLoad = React.useRef(true);
  const autoSaveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

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

  // Mutations
  const saveLog = useMutation(api.dailyLogs.saveLog);

  // Load existing log into form when date changes
  useEffect(() => {
    isInitialLoad.current = true;
    if (existingLog) {
      setSummary(existingLog.summary);
      setAccomplishments(
        existingLog.accomplishments.length > 0 ? existingLog.accomplishments : [""]
      );
      setBlockers(existingLog.blockers || "");
      setGoalsForTomorrow(existingLog.goalsForTomorrow || "");
      setHoursWorked(existingLog.hoursWorked?.toString() || "");
      if (existingLog.updatedAt) {
        setLastSaved(new Date(existingLog.updatedAt));
      }
    } else {
      // Reset form for new date
      setSummary("");
      setAccomplishments([""]);
      setBlockers("");
      setGoalsForTomorrow("");
      setHoursWorked("");
      setLastSaved(null);
    }
    // Allow auto-save after a short delay to prevent saving on initial load
    setTimeout(() => {
      isInitialLoad.current = false;
    }, 500);
  }, [existingLog, selectedDate]);

  // Auto-save function
  const performAutoSave = React.useCallback(async () => {
    if (!user || isInitialLoad.current) return;

    // Don't auto-save if already submitted
    if (existingLog?.isSubmitted) return;

    // Don't auto-save empty forms
    const hasContent = summary.trim() || accomplishments.some(a => a.trim()) || blockers.trim() || goalsForTomorrow.trim() || hoursWorked;
    if (!hasContent) return;

    setAutoSaveStatus("saving");
    try {
      await saveLog({
        userId: user._id,
        date: selectedDate,
        summary,
        accomplishments: accomplishments.filter((a) => a.trim() !== ""),
        blockers: blockers || undefined,
        goalsForTomorrow: goalsForTomorrow || undefined,
        hoursWorked: hoursWorked ? parseFloat(hoursWorked) : undefined,
        isSubmitted: false,
      });
      setAutoSaveStatus("saved");
      setLastSaved(new Date());
      // Reset to idle after 3 seconds
      setTimeout(() => setAutoSaveStatus("idle"), 3000);
    } catch (error) {
      console.error("Auto-save failed:", error);
      setAutoSaveStatus("error");
    }
  }, [user, selectedDate, summary, accomplishments, blockers, goalsForTomorrow, hoursWorked, saveLog, existingLog?.isSubmitted]);

  // Debounced auto-save effect - triggers 2 seconds after user stops typing
  useEffect(() => {
    if (isInitialLoad.current) return;
    if (existingLog?.isSubmitted) return;

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout for auto-save
    autoSaveTimeoutRef.current = setTimeout(() => {
      performAutoSave();
    }, 2000);

    // Cleanup on unmount
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [summary, accomplishments, blockers, goalsForTomorrow, hoursWorked, performAutoSave, existingLog?.isSubmitted]);

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
              <div className="flex items-center gap-3 mt-1">
                <p className="text-slate-400 text-xs sm:text-sm">
                  Track your daily work and accomplishments
                </p>
                {/* Auto-save status indicator */}
                {!existingLog?.isSubmitted && (
                  <div className="flex items-center gap-1.5">
                    {autoSaveStatus === "saving" && (
                      <>
                        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></div>
                        <span className="text-amber-400 text-xs">Saving...</span>
                      </>
                    )}
                    {autoSaveStatus === "saved" && (
                      <>
                        <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-green-400 text-xs">Saved</span>
                      </>
                    )}
                    {autoSaveStatus === "error" && (
                      <>
                        <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-red-400 text-xs">Save failed</span>
                      </>
                    )}
                    {autoSaveStatus === "idle" && lastSaved && (
                      <span className="text-slate-500 text-xs">
                        Last saved {lastSaved.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                )}
              </div>
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
              {/* Help Button */}
              <button
                onClick={() => setShowHelp(true)}
                className="p-2 rounded-lg transition-colors text-slate-400 hover:text-white hover:bg-slate-700"
                title="How to use Daily Log"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* Reminder Banner - show if today's log not submitted */}
        {selectedDate === today && !existingLog?.isSubmitted && (
          <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 sm:px-8 py-3">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-amber-400 text-sm">
                <span className="font-medium">Daily log reminder:</span> Add your accomplishments throughout the day - they auto-save as you type! Submit before you leave.
              </p>
            </div>
          </div>
        )}

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

              {/* Hours Worked */}
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

              {/* Action Buttons */}
              {!isLocked && (
                <div className="flex items-center justify-between">
                  <p className="text-slate-500 text-sm flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Changes auto-save as you type
                  </p>
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

        {/* Help Modal */}
        {showHelp && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-lg rounded-xl p-6 max-h-[90vh] overflow-y-auto bg-slate-800">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">
                  How to Use Daily Logs
                </h2>
                <button
                  onClick={() => setShowHelp(false)}
                  className="p-2 rounded-lg transition-colors text-slate-400 hover:text-white hover:bg-slate-700"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* Why Daily Logs */}
                <div>
                  <h3 className="font-medium mb-2 flex items-center gap-2 text-white">
                    <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Why Fill Out Daily Logs?
                  </h3>
                  <p className="text-sm text-slate-400">
                    Daily logs help management track team progress and provide visibility to stakeholders.
                    They also help you keep a record of your accomplishments for performance reviews.
                  </p>
                </div>

                {/* What to Include */}
                <div>
                  <h3 className="font-medium mb-2 flex items-center gap-2 text-white">
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    What to Include
                  </h3>
                  <ul className="text-sm text-slate-400 space-y-2 ml-7">
                    <li><span className="text-white font-medium">Summary:</span> Brief overview of what you worked on today</li>
                    <li><span className="text-white font-medium">Accomplishments:</span> Specific tasks you completed (be specific!)</li>
                    <li><span className="text-white font-medium">Blockers:</span> Any issues preventing progress (optional)</li>
                    <li><span className="text-white font-medium">Goals:</span> What you plan to work on tomorrow (optional)</li>
                    <li><span className="text-white font-medium">Hours:</span> How many hours you worked</li>
                  </ul>
                </div>

                {/* Auto-Tracked Activities */}
                <div>
                  <h3 className="font-medium mb-2 flex items-center gap-2 text-white">
                    <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Auto-Tracked Activities
                  </h3>
                  <p className="text-sm text-slate-400 mb-2">
                    The system automatically tracks some of your activities:
                  </p>
                  <ul className="text-sm text-slate-400 space-y-1 ml-7 list-disc">
                    <li><span className="text-purple-400">Projects Created</span> - When you create a new project</li>
                    <li><span className="text-purple-400">Projects Moved</span> - Moving projects between status columns</li>
                    <li><span className="text-purple-400">Tasks Completed</span> - Marking tasks as done on your project board</li>
                    <li><span className="text-purple-400">Total Actions</span> - All tracked activities combined</li>
                  </ul>
                  <p className="text-sm text-slate-500 mt-2 italic">
                    These are captured automatically when you submit - no need to list them manually!
                  </p>
                </div>

                {/* Save vs Submit */}
                <div>
                  <h3 className="font-medium mb-2 flex items-center gap-2 text-white">
                    <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    Auto-Save & Submit
                  </h3>
                  <ul className="text-sm text-slate-400 space-y-2 ml-7">
                    <li><span className="text-white font-medium">Auto-Save:</span> Your progress saves automatically as you type - no need to click save! Just add items throughout the day.</li>
                    <li><span className="text-white font-medium">Submit:</span> Finalizes your log and sends it to management. Click this at the end of your day.</li>
                  </ul>
                </div>

                {/* Tips */}
                <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
                  <h3 className="font-medium mb-2 flex items-center gap-2 text-cyan-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Pro Tips
                  </h3>
                  <ul className="text-sm text-cyan-300/80 space-y-1 list-disc ml-5">
                    <li>Add accomplishments throughout the day - everything auto-saves!</li>
                    <li>Be specific - &quot;Fixed login bug&quot; is better than &quot;worked on bugs&quot;</li>
                    <li>Submit before you leave for the day</li>
                    <li>Check the sidebar for your auto-tracked activities</li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-700">
                <button
                  onClick={() => setShowHelp(false)}
                  className="w-full px-4 py-2 rounded-lg font-medium transition-colors bg-cyan-500 text-white hover:bg-cyan-600"
                >
                  Got it!
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Main Component - Decides which view to show
function DailyLogContent() {
  const { user } = useAuth();

  // Show admin view if user doesn't have requiresDailyLog set
  // Show employee view if they need to fill out daily logs
  const isEmployee = user?.requiresDailyLog === true;

  if (!user) {
    return (
      <div className="flex h-screen bg-slate-900 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return isEmployee ? <EmployeeDailyLogView /> : <AdminDailyLogView />;
}

export default function DailyLogPage() {
  return (
    <Protected>
      <DailyLogContent />
    </Protected>
  );
}
