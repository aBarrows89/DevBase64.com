"use client";

import Link from "next/link";
import Protected from "./protected";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "./auth-context";
import { useTheme } from "./theme-context";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

function DashboardContent() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const projects = useQuery(api.projects.getAll);
  const applications = useQuery(api.applications.getRecent);
  const repositories = useQuery(api.repositories.getAll);
  const upcomingInterviews = useQuery(api.applications.getUpcomingInterviews);
  const hiringAnalytics = useQuery(api.applications.getHiringAnalytics);

  // Calculate stats
  const projectStats = {
    total: projects?.length || 0,
    inProgress: projects?.filter((p) => p.status === "in_progress").length || 0,
    completed: projects?.filter((p) => p.status === "done").length || 0,
    behindSchedule:
      projects?.filter((p) => p.aiTimelineAnalysis?.isOnSchedule === false)
        .length || 0,
  };

  const applicationStats = {
    total: applications?.length || 0,
    new: applications?.filter((a) => a.status === "new").length || 0,
    pending:
      applications?.filter((a) =>
        ["reviewed", "contacted"].includes(a.status)
      ).length || 0,
  };

  return (
    <div className={`flex h-screen ${isDark ? "bg-slate-900" : "bg-[#f2f2f7]"}`}>
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className={`sticky top-0 z-10 backdrop-blur-sm border-b px-8 py-4 ${isDark ? "bg-slate-900/80 border-slate-700" : "bg-white/80 border-gray-200"}`}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>Dashboard</h1>
              <p className={`text-sm mt-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                Welcome back, {user?.name || "User"}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className={`text-sm ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>
        </header>

        <div className="p-8 space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Projects */}
            <div className={`border rounded-xl p-6 ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm"}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-sm font-medium ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                  Active Projects
                </h3>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? "bg-cyan-500/20" : "bg-blue-100"}`}>
                  <svg
                    className={`w-5 h-5 ${isDark ? "text-cyan-400" : "text-blue-600"}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
              </div>
              <p className={`text-3xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                {projectStats.inProgress}
              </p>
              <p className={`text-sm mt-1 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                {projectStats.total} total projects
              </p>
            </div>

            {/* Completed */}
            <div className={`border rounded-xl p-6 ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm"}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-sm font-medium ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                  Completed
                </h3>
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </div>
              <p className={`text-3xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                {projectStats.completed}
              </p>
              <p className={`text-sm mt-1 ${isDark ? "text-slate-500" : "text-gray-400"}`}>projects done</p>
            </div>

            {/* Behind Schedule */}
            <div className={`border rounded-xl p-6 ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm"}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-sm font-medium ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                  Behind Schedule
                </h3>
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-amber-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
              <p className={`text-3xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                {projectStats.behindSchedule}
              </p>
              <p className={`text-sm mt-1 ${isDark ? "text-slate-500" : "text-gray-400"}`}>need attention</p>
            </div>

            {/* Applications */}
            <div className={`border rounded-xl p-6 ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm"}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-sm font-medium ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                  New Applications
                </h3>
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-purple-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
              </div>
              <p className={`text-3xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                {applicationStats.new}
              </p>
              <p className={`text-sm mt-1 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                {applicationStats.total} total
              </p>
            </div>
          </div>

          {/* Content Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Projects */}
            <div className={`border rounded-xl p-6 ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm"}`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                  Recent Projects
                </h2>
                <a
                  href="/projects"
                  className={`text-sm transition-colors ${isDark ? "text-cyan-400 hover:text-cyan-300" : "text-blue-600 hover:text-blue-700"}`}
                >
                  View all
                </a>
              </div>
              <div className="space-y-4">
                {projects?.slice(0, 5).map((project) => (
                  <div
                    key={project._id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${isDark ? "bg-slate-900/50 border-slate-700/50" : "bg-gray-50 border-gray-100"}`}
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-medium truncate ${isDark ? "text-white" : "text-gray-900"}`}>
                        {project.name}
                      </h3>
                      <p className={`text-sm truncate ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                        {project.description}
                      </p>
                    </div>
                    <div className="ml-4">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          project.status === "done"
                            ? "bg-green-500/20 text-green-400"
                            : project.status === "in_progress"
                              ? isDark ? "bg-cyan-500/20 text-cyan-400" : "bg-blue-100 text-blue-600"
                              : project.status === "review"
                                ? "bg-amber-500/20 text-amber-400"
                                : isDark ? "bg-slate-500/20 text-slate-400" : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {project.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                )) || (
                  <p className={`text-center py-8 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                    No projects yet
                  </p>
                )}
              </div>
            </div>

            {/* Recent Applications */}
            <div className={`border rounded-xl p-6 ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm"}`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                  Recent Applications
                </h2>
                <a
                  href="/applications"
                  className={`text-sm transition-colors ${isDark ? "text-cyan-400 hover:text-cyan-300" : "text-blue-600 hover:text-blue-700"}`}
                >
                  View all
                </a>
              </div>
              <div className="space-y-4">
                {applications?.slice(0, 5).map((app) => (
                  <div
                    key={app._id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${isDark ? "bg-slate-900/50 border-slate-700/50" : "bg-gray-50 border-gray-100"}`}
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-medium truncate ${isDark ? "text-white" : "text-gray-900"}`}>
                        {app.firstName} {app.lastName}
                      </h3>
                      <p className={`text-sm truncate ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                        {app.appliedJobTitle}
                      </p>
                    </div>
                    <div className="ml-4 flex items-center gap-2">
                      {app.candidateAnalysis && (
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            app.candidateAnalysis.overallScore >= 70
                              ? "bg-green-500/20 text-green-400"
                              : app.candidateAnalysis.overallScore >= 50
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {app.candidateAnalysis.overallScore}%
                        </span>
                      )}
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          app.status === "new"
                            ? isDark ? "bg-cyan-500/20 text-cyan-400" : "bg-blue-100 text-blue-600"
                            : app.status === "reviewed"
                              ? "bg-amber-500/20 text-amber-400"
                              : isDark ? "bg-slate-500/20 text-slate-400" : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {app.status}
                      </span>
                    </div>
                  </div>
                )) || (
                  <p className={`text-center py-8 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                    No applications yet
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Upcoming Interviews & Hiring Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upcoming Interviews */}
            <div className={`border rounded-xl p-6 ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm"}`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                  Upcoming Interviews
                </h2>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${isDark ? "bg-orange-500/20 text-orange-400" : "bg-orange-100 text-orange-600"}`}>
                  {upcomingInterviews?.length || 0} scheduled
                </span>
              </div>
              <div className="space-y-3">
                {upcomingInterviews && upcomingInterviews.length > 0 ? (
                  upcomingInterviews.slice(0, 5).map((interview) => (
                    <Link
                      key={interview._id}
                      href={`/applications/${interview._id}`}
                      className={`block p-4 rounded-lg border transition-colors ${isDark ? "bg-slate-900/50 border-slate-700/50 hover:border-slate-600" : "bg-gray-50 border-gray-100 hover:border-gray-300"}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className={`font-medium hover:underline ${isDark ? "text-white" : "text-gray-900"}`}>
                            {interview.firstName} {interview.lastName}
                          </h3>
                          <p className={`text-sm ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                            {interview.appliedJobTitle}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-medium ${isDark ? "text-orange-400" : "text-orange-600"}`}>
                            {interview.scheduledInterviewDate && new Date(interview.scheduledInterviewDate + "T00:00:00").toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                          <p className={`text-sm ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                            {interview.scheduledInterviewTime}
                          </p>
                        </div>
                      </div>
                      {interview.scheduledInterviewLocation && (
                        <p className={`text-xs mt-2 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                          {interview.scheduledInterviewLocation}
                        </p>
                      )}
                    </Link>
                  ))
                ) : (
                  <div className={`text-center py-8 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                    <svg className={`w-12 h-12 mx-auto mb-3 ${isDark ? "text-slate-600" : "text-gray-300"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p>No upcoming interviews</p>
                  </div>
                )}
              </div>
            </div>

            {/* Hiring Analytics */}
            <div className={`border rounded-xl p-6 ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm"}`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                  Hiring Analytics
                </h2>
                <span className={`text-xs ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                  Based on candidate scores
                </span>
              </div>
              {hiringAnalytics ? (
                <div className="space-y-6">
                  {/* Score Comparisons */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className={`text-xs mb-1 ${isDark ? "text-slate-500" : "text-gray-400"}`}>Hired Avg</p>
                      <p className={`text-2xl font-bold ${hiringAnalytics.hiredStats.avgOverallScore !== null ? (hiringAnalytics.hiredStats.avgOverallScore >= 70 ? "text-green-400" : hiringAnalytics.hiredStats.avgOverallScore >= 50 ? "text-amber-400" : "text-red-400") : isDark ? "text-slate-500" : "text-gray-400"}`}>
                        {hiringAnalytics.hiredStats.avgOverallScore !== null ? `${hiringAnalytics.hiredStats.avgOverallScore}%` : "—"}
                      </p>
                      <p className={`text-xs ${isDark ? "text-slate-600" : "text-gray-400"}`}>
                        {hiringAnalytics.hiredStats.count} hired
                      </p>
                    </div>
                    <div className="text-center">
                      <p className={`text-xs mb-1 ${isDark ? "text-slate-500" : "text-gray-400"}`}>Interviewed Avg</p>
                      <p className={`text-2xl font-bold ${hiringAnalytics.interviewedStats.avgOverallScore !== null ? (hiringAnalytics.interviewedStats.avgOverallScore >= 70 ? "text-green-400" : hiringAnalytics.interviewedStats.avgOverallScore >= 50 ? "text-amber-400" : "text-red-400") : isDark ? "text-slate-500" : "text-gray-400"}`}>
                        {hiringAnalytics.interviewedStats.avgOverallScore !== null ? `${hiringAnalytics.interviewedStats.avgOverallScore}%` : "—"}
                      </p>
                      <p className={`text-xs ${isDark ? "text-slate-600" : "text-gray-400"}`}>
                        {hiringAnalytics.interviewedStats.count} interviewed
                      </p>
                    </div>
                    <div className="text-center">
                      <p className={`text-xs mb-1 ${isDark ? "text-slate-500" : "text-gray-400"}`}>Rejected Avg</p>
                      <p className={`text-2xl font-bold ${hiringAnalytics.rejectedStats.avgOverallScore !== null ? (hiringAnalytics.rejectedStats.avgOverallScore >= 70 ? "text-green-400" : hiringAnalytics.rejectedStats.avgOverallScore >= 50 ? "text-amber-400" : "text-red-400") : isDark ? "text-slate-500" : "text-gray-400"}`}>
                        {hiringAnalytics.rejectedStats.avgOverallScore !== null ? `${hiringAnalytics.rejectedStats.avgOverallScore}%` : "—"}
                      </p>
                      <p className={`text-xs ${isDark ? "text-slate-600" : "text-gray-400"}`}>
                        {hiringAnalytics.rejectedStats.count} rejected
                      </p>
                    </div>
                  </div>

                  {/* Conversion Rates */}
                  <div className={`p-4 rounded-lg border ${isDark ? "bg-slate-900/50 border-slate-700" : "bg-gray-50 border-gray-100"}`}>
                    <p className={`text-xs font-medium mb-3 ${isDark ? "text-slate-400" : "text-gray-500"}`}>Conversion Funnel</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm ${isDark ? "text-slate-300" : "text-gray-600"}`}>Applications → Interviewed</span>
                        <span className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>{hiringAnalytics.conversionRates.interviewRate}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-sm ${isDark ? "text-slate-300" : "text-gray-600"}`}>Interviewed → Hired</span>
                        <span className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>{hiringAnalytics.conversionRates.hireRate}%</span>
                      </div>
                      <div className={`flex items-center justify-between pt-2 border-t ${isDark ? "border-slate-700" : "border-gray-200"}`}>
                        <span className={`text-sm font-medium ${isDark ? "text-slate-300" : "text-gray-600"}`}>Overall Hire Rate</span>
                        <span className={`font-bold ${isDark ? "text-cyan-400" : "text-blue-600"}`}>{hiringAnalytics.conversionRates.overallHireRate}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Breakdown by score type */}
                  {hiringAnalytics.hiredStats.count > 0 && (
                    <div>
                      <p className={`text-xs font-medium mb-2 ${isDark ? "text-slate-400" : "text-gray-500"}`}>Hired Candidate Profile</p>
                      <div className="flex gap-4">
                        <div className={`flex-1 p-3 rounded-lg text-center ${isDark ? "bg-green-500/10 border border-green-500/20" : "bg-green-50"}`}>
                          <p className={`text-xs ${isDark ? "text-green-400/70" : "text-green-600"}`}>Stability</p>
                          <p className={`text-lg font-bold ${isDark ? "text-green-400" : "text-green-600"}`}>
                            {hiringAnalytics.hiredStats.avgStabilityScore ?? "—"}%
                          </p>
                        </div>
                        <div className={`flex-1 p-3 rounded-lg text-center ${isDark ? "bg-blue-500/10 border border-blue-500/20" : "bg-blue-50"}`}>
                          <p className={`text-xs ${isDark ? "text-blue-400/70" : "text-blue-600"}`}>Experience</p>
                          <p className={`text-lg font-bold ${isDark ? "text-blue-400" : "text-blue-600"}`}>
                            {hiringAnalytics.hiredStats.avgExperienceScore ?? "—"}%
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className={`text-center py-8 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                  <svg className={`w-12 h-12 mx-auto mb-3 ${isDark ? "text-slate-600" : "text-gray-300"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <p>Loading analytics...</p>
                </div>
              )}
            </div>
          </div>

          {/* Repositories */}
          <div className={`border rounded-xl p-6 ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm"}`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>Repositories</h2>
              <a
                href="/repositories"
                className={`text-sm transition-colors ${isDark ? "text-cyan-400 hover:text-cyan-300" : "text-blue-600 hover:text-blue-700"}`}
              >
                View all
              </a>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {repositories?.slice(0, 6).map((repo) => (
                <a
                  key={repo._id}
                  href={repo.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-4 rounded-lg border transition-colors ${isDark ? "bg-slate-900/50 border-slate-700/50 hover:border-slate-600" : "bg-gray-50 border-gray-100 hover:border-gray-300"}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className={`font-medium truncate ${isDark ? "text-white" : "text-gray-900"}`}>
                      {repo.name}
                    </h3>
                    {repo.isPrivate && (
                      <span className={`px-2 py-0.5 text-xs rounded ${isDark ? "bg-slate-700 text-slate-300" : "bg-gray-200 text-gray-600"}`}>
                        Private
                      </span>
                    )}
                  </div>
                  <p className={`text-sm line-clamp-2 mb-3 ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                    {repo.description || "No description"}
                  </p>
                  <div className={`flex items-center gap-4 text-xs ${isDark ? "text-slate-400" : "text-gray-400"}`}>
                    {repo.language && (
                      <span className="flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${isDark ? "bg-cyan-400" : "bg-blue-500"}`}></span>
                        {repo.language}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z" />
                      </svg>
                      {repo.starCount}
                    </span>
                  </div>
                </a>
              )) || (
                <p className={`text-center py-8 col-span-full ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                  No repositories synced yet
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function HomePage() {
  return (
    <Protected>
      <DashboardContent />
    </Protected>
  );
}
