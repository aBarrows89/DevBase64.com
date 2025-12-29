"use client";

import Link from "next/link";
import Protected from "./protected";
import Sidebar, { MobileHeader } from "@/components/Sidebar";
import { useAuth } from "./auth-context";
import { useTheme } from "./theme-context";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

// Combined type for website messages
interface WebsiteMessage {
  _id: string;
  type: "contact" | "dealer";
  name: string;
  email: string;
  subject?: string;
  businessName?: string;
  status: string;
  createdAt: number;
}

function DashboardContent() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const projects = useQuery(api.projects.getAll);
  const applications = useQuery(api.applications.getRecent);
  const upcomingInterviews = useQuery(api.applications.getUpcomingInterviews);
  const hiringAnalytics = useQuery(api.applications.getHiringAnalytics);
  const contactMessages = useQuery(api.contactMessages.getRecent);
  const dealerInquiries = useQuery(api.dealerInquiries.getRecent);
  const pendingTenureCheckIns = useQuery(api.personnel.getPendingTenureCheckIns);

  // Combine and sort website messages
  const websiteMessages: WebsiteMessage[] = [
    ...(contactMessages?.map((m) => ({
      _id: m._id,
      type: "contact" as const,
      name: m.name,
      email: m.email,
      subject: m.subject,
      status: m.status,
      createdAt: m.createdAt,
    })) || []),
    ...(dealerInquiries?.map((i) => ({
      _id: i._id,
      type: "dealer" as const,
      name: i.contactName,
      email: i.email,
      businessName: i.businessName,
      status: i.status,
      createdAt: i.createdAt,
    })) || []),
  ].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);

  const newMessageCount = (contactMessages?.filter((m) => m.status === "new").length || 0) +
    (dealerInquiries?.filter((i) => i.status === "new").length || 0);

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
        {/* Mobile Header */}
        <MobileHeader />

        {/* Header */}
        <header className={`sticky top-0 z-10 backdrop-blur-sm border-b px-4 sm:px-8 py-3 sm:py-4 ${isDark ? "bg-slate-900/80 border-slate-700" : "bg-white/80 border-gray-200"}`}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-xl sm:text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>Dashboard</h1>
              <p className={`text-xs sm:text-sm mt-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                Welcome back, {user?.name || "User"}
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-4">
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

        <div className="p-4 sm:p-8 space-y-6 sm:space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {/* Projects */}
            <div className={`border rounded-xl p-4 sm:p-6 ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm"}`}>
              <div className="flex items-center justify-between mb-2 sm:mb-4">
                <h3 className={`text-xs sm:text-sm font-medium ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                  Active Projects
                </h3>
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center ${isDark ? "bg-cyan-500/20" : "bg-blue-100"}`}>
                  <svg
                    className={`w-4 h-4 sm:w-5 sm:h-5 ${isDark ? "text-cyan-400" : "text-blue-600"}`}
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
              <p className={`text-2xl sm:text-3xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                {projectStats.inProgress}
              </p>
              <p className={`text-xs sm:text-sm mt-1 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                {projectStats.total} total projects
              </p>
            </div>

            {/* Completed */}
            <div className={`border rounded-xl p-4 sm:p-6 ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm"}`}>
              <div className="flex items-center justify-between mb-2 sm:mb-4">
                <h3 className={`text-xs sm:text-sm font-medium ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                  Completed
                </h3>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <svg
                    className="w-4 h-4 sm:w-5 sm:h-5 text-green-400"
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
              <p className={`text-2xl sm:text-3xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                {projectStats.completed}
              </p>
              <p className={`text-xs sm:text-sm mt-1 ${isDark ? "text-slate-500" : "text-gray-400"}`}>projects done</p>
            </div>

            {/* Behind Schedule */}
            <div className={`border rounded-xl p-4 sm:p-6 ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm"}`}>
              <div className="flex items-center justify-between mb-2 sm:mb-4">
                <h3 className={`text-xs sm:text-sm font-medium ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                  Behind Schedule
                </h3>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <svg
                    className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400"
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
              <p className={`text-2xl sm:text-3xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                {projectStats.behindSchedule}
              </p>
              <p className={`text-xs sm:text-sm mt-1 ${isDark ? "text-slate-500" : "text-gray-400"}`}>need attention</p>
            </div>

            {/* Applications */}
            <div className={`border rounded-xl p-4 sm:p-6 ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm"}`}>
              <div className="flex items-center justify-between mb-2 sm:mb-4">
                <h3 className={`text-xs sm:text-sm font-medium ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                  New Applications
                </h3>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <svg
                    className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400"
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
              <p className={`text-2xl sm:text-3xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                {applicationStats.new}
              </p>
              <p className={`text-xs sm:text-sm mt-1 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                {applicationStats.total} total
              </p>
            </div>
          </div>

          {/* Content Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Recent Projects */}
            <div className={`border rounded-xl p-4 sm:p-6 ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm"}`}>
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className={`text-base sm:text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                  Recent Projects
                </h2>
                <a
                  href="/projects"
                  className={`text-sm transition-colors ${isDark ? "text-cyan-400 hover:text-cyan-300" : "text-blue-600 hover:text-blue-700"}`}
                >
                  View all
                </a>
              </div>
              <div className="space-y-3 sm:space-y-4">
                {projects?.slice(0, 5).map((project) => (
                  <div
                    key={project._id}
                    className={`flex items-center justify-between p-3 sm:p-4 rounded-lg border ${isDark ? "bg-slate-900/50 border-slate-700/50" : "bg-gray-50 border-gray-100"}`}
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-sm sm:text-base font-medium truncate ${isDark ? "text-white" : "text-gray-900"}`}>
                        {project.name}
                      </h3>
                      <p className={`text-xs sm:text-sm truncate ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                        {project.description}
                      </p>
                    </div>
                    <div className="ml-2 sm:ml-4">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${
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
            <div className={`border rounded-xl p-4 sm:p-6 ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm"}`}>
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className={`text-base sm:text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                  Recent Applications
                </h2>
                <a
                  href="/applications"
                  className={`text-sm transition-colors ${isDark ? "text-cyan-400 hover:text-cyan-300" : "text-blue-600 hover:text-blue-700"}`}
                >
                  View all
                </a>
              </div>
              <div className="space-y-3 sm:space-y-4">
                {applications?.slice(0, 5).map((app) => (
                  <div
                    key={app._id}
                    className={`flex items-center justify-between p-3 sm:p-4 rounded-lg border ${isDark ? "bg-slate-900/50 border-slate-700/50" : "bg-gray-50 border-gray-100"}`}
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-sm sm:text-base font-medium truncate ${isDark ? "text-white" : "text-gray-900"}`}>
                        {app.firstName} {app.lastName}
                      </h3>
                      <p className={`text-xs sm:text-sm truncate ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                        {app.appliedJobTitle}
                      </p>
                    </div>
                    <div className="ml-2 sm:ml-4 flex items-center gap-1 sm:gap-2">
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

          {/* Website Messages & Hiring Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Website Messages */}
            <div className={`border rounded-xl p-4 sm:p-6 ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm"}`}>
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className={`text-base sm:text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                  Website Messages
                </h2>
                <div className="flex items-center gap-2">
                  {newMessageCount > 0 && (
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${isDark ? "bg-cyan-500/20 text-cyan-400" : "bg-blue-100 text-blue-600"}`}>
                      {newMessageCount} new
                    </span>
                  )}
                  <Link
                    href="/website-messages"
                    className={`text-sm transition-colors ${isDark ? "text-cyan-400 hover:text-cyan-300" : "text-blue-600 hover:text-blue-700"}`}
                  >
                    View all
                  </Link>
                </div>
              </div>
              <div className="space-y-3">
                {websiteMessages.length > 0 ? (
                  websiteMessages.map((msg) => (
                    <Link
                      key={`${msg.type}-${msg._id}`}
                      href={`/website-messages?type=${msg.type}&id=${msg._id}`}
                      className={`block p-4 rounded-lg border transition-colors ${isDark ? "bg-slate-900/50 border-slate-700/50 hover:border-slate-600" : "bg-gray-50 border-gray-100 hover:border-gray-300"}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className={`font-medium truncate ${isDark ? "text-white" : "text-gray-900"}`}>
                              {msg.type === "dealer" ? msg.businessName : msg.name}
                            </h3>
                            <span className={`px-2 py-0.5 text-xs rounded-full flex-shrink-0 ${
                              msg.type === "dealer"
                                ? isDark ? "bg-purple-500/20 text-purple-400" : "bg-purple-100 text-purple-600"
                                : isDark ? "bg-slate-600/50 text-slate-300" : "bg-gray-200 text-gray-600"
                            }`}>
                              {msg.type === "dealer" ? "Dealer" : "Contact"}
                            </span>
                            {msg.status === "new" && (
                              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isDark ? "bg-cyan-400" : "bg-blue-500"}`}></span>
                            )}
                          </div>
                          <p className={`text-sm truncate ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                            {msg.type === "dealer" ? msg.name : msg.subject}
                          </p>
                        </div>
                        <p className={`text-xs ml-4 flex-shrink-0 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                          {new Date(msg.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className={`text-center py-8 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                    <svg className={`w-12 h-12 mx-auto mb-3 ${isDark ? "text-slate-600" : "text-gray-300"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <p>No website messages</p>
                  </div>
                )}
              </div>
            </div>

            {/* Hiring Analytics */}
            <div className={`border rounded-xl p-4 sm:p-6 ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm"}`}>
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className={`text-base sm:text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                  Hiring Analytics
                </h2>
                <div className="flex items-center gap-3">
                  {upcomingInterviews && upcomingInterviews.length > 0 && (
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${isDark ? "bg-orange-500/20 text-orange-400" : "bg-orange-100 text-orange-600"}`}>
                      {upcomingInterviews.length} interviews
                    </span>
                  )}
                </div>
              </div>
              {hiringAnalytics ? (
                <div className="space-y-4">
                  {/* Score Comparisons - More compact */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <p className={`text-xs mb-1 ${isDark ? "text-slate-500" : "text-gray-400"}`}>Hired Avg</p>
                      <p className={`text-xl font-bold ${hiringAnalytics.hiredStats.avgOverallScore !== null ? (hiringAnalytics.hiredStats.avgOverallScore >= 70 ? "text-green-400" : hiringAnalytics.hiredStats.avgOverallScore >= 50 ? "text-amber-400" : "text-red-400") : isDark ? "text-slate-500" : "text-gray-400"}`}>
                        {hiringAnalytics.hiredStats.avgOverallScore !== null ? `${hiringAnalytics.hiredStats.avgOverallScore}%` : "—"}
                      </p>
                      <p className={`text-xs ${isDark ? "text-slate-600" : "text-gray-400"}`}>
                        {hiringAnalytics.hiredStats.count} hired
                      </p>
                    </div>
                    <div className="text-center">
                      <p className={`text-xs mb-1 ${isDark ? "text-slate-500" : "text-gray-400"}`}>Interviewed</p>
                      <p className={`text-xl font-bold ${hiringAnalytics.interviewedStats.avgOverallScore !== null ? (hiringAnalytics.interviewedStats.avgOverallScore >= 70 ? "text-green-400" : hiringAnalytics.interviewedStats.avgOverallScore >= 50 ? "text-amber-400" : "text-red-400") : isDark ? "text-slate-500" : "text-gray-400"}`}>
                        {hiringAnalytics.interviewedStats.avgOverallScore !== null ? `${hiringAnalytics.interviewedStats.avgOverallScore}%` : "—"}
                      </p>
                      <p className={`text-xs ${isDark ? "text-slate-600" : "text-gray-400"}`}>
                        {hiringAnalytics.interviewedStats.count} total
                      </p>
                    </div>
                    <div className="text-center">
                      <p className={`text-xs mb-1 ${isDark ? "text-slate-500" : "text-gray-400"}`}>Rejected</p>
                      <p className={`text-xl font-bold ${hiringAnalytics.rejectedStats.avgOverallScore !== null ? (hiringAnalytics.rejectedStats.avgOverallScore >= 70 ? "text-green-400" : hiringAnalytics.rejectedStats.avgOverallScore >= 50 ? "text-amber-400" : "text-red-400") : isDark ? "text-slate-500" : "text-gray-400"}`}>
                        {hiringAnalytics.rejectedStats.avgOverallScore !== null ? `${hiringAnalytics.rejectedStats.avgOverallScore}%` : "—"}
                      </p>
                      <p className={`text-xs ${isDark ? "text-slate-600" : "text-gray-400"}`}>
                        {hiringAnalytics.rejectedStats.count} total
                      </p>
                    </div>
                  </div>

                  {/* Conversion Rates - Compact */}
                  <div className={`p-3 rounded-lg border ${isDark ? "bg-slate-900/50 border-slate-700" : "bg-gray-50 border-gray-100"}`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>App → Interview</span>
                      <span className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>{hiringAnalytics.conversionRates.interviewRate}%</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className={`text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>Interview → Hired</span>
                      <span className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>{hiringAnalytics.conversionRates.hireRate}%</span>
                    </div>
                    <div className={`flex items-center justify-between mt-2 pt-2 border-t ${isDark ? "border-slate-700" : "border-gray-200"}`}>
                      <span className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-gray-600"}`}>Overall Rate</span>
                      <span className={`text-sm font-bold ${isDark ? "text-cyan-400" : "text-blue-600"}`}>{hiringAnalytics.conversionRates.overallHireRate}%</span>
                    </div>
                  </div>

                  {/* Upcoming Interviews Section */}
                  {upcomingInterviews && upcomingInterviews.length > 0 && (
                    <div className={`pt-3 border-t ${isDark ? "border-slate-700" : "border-gray-200"}`}>
                      <p className={`text-xs font-medium mb-2 ${isDark ? "text-slate-400" : "text-gray-500"}`}>Upcoming Interviews</p>
                      <div className="space-y-2">
                        {upcomingInterviews.slice(0, 3).map((interview) => (
                          <Link
                            key={interview._id}
                            href={`/applications/${interview._id}`}
                            className={`flex items-center justify-between p-2 rounded-lg transition-colors ${isDark ? "hover:bg-slate-700/50" : "hover:bg-gray-100"}`}
                          >
                            <div className="min-w-0">
                              <p className={`text-sm font-medium truncate ${isDark ? "text-white" : "text-gray-900"}`}>
                                {interview.firstName} {interview.lastName}
                              </p>
                              <p className={`text-xs truncate ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                                {interview.appliedJobTitle}
                              </p>
                            </div>
                            <div className="text-right ml-2 flex-shrink-0">
                              <p className={`text-xs font-medium ${isDark ? "text-orange-400" : "text-orange-600"}`}>
                                {interview.scheduledInterviewDate && new Date(interview.scheduledInterviewDate + "T00:00:00").toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </p>
                              <p className={`text-xs ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                                {interview.scheduledInterviewTime}
                              </p>
                            </div>
                          </Link>
                        ))}
                        {upcomingInterviews.length > 3 && (
                          <Link
                            href="/applications?status=interview_scheduled"
                            className={`block text-center text-xs py-1 ${isDark ? "text-cyan-400 hover:text-cyan-300" : "text-blue-600 hover:text-blue-700"}`}
                          >
                            View all {upcomingInterviews.length} interviews
                          </Link>
                        )}
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

          {/* Pending Tenure Check-ins */}
          {pendingTenureCheckIns && pendingTenureCheckIns.length > 0 && (
            <div className={`border rounded-xl p-4 sm:p-6 ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm"}`}>
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className={`text-base sm:text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                  Due Tenure Check-ins
                </h2>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${isDark ? "bg-amber-500/20 text-amber-400" : "bg-amber-100 text-amber-600"}`}>
                    {pendingTenureCheckIns.length} pending
                  </span>
                  <Link
                    href="/personnel"
                    className={`text-sm transition-colors ${isDark ? "text-cyan-400 hover:text-cyan-300" : "text-blue-600 hover:text-blue-700"}`}
                  >
                    View all
                  </Link>
                </div>
              </div>
              <div className="space-y-3">
                {pendingTenureCheckIns.slice(0, 8).map((item, idx) => (
                  <Link
                    key={`${item.personnelId}-${item.milestone}-${idx}`}
                    href={`/personnel/${item.personnelId}`}
                    className={`block p-4 rounded-lg border transition-colors ${isDark ? "bg-slate-900/50 border-slate-700/50 hover:border-slate-600" : "bg-gray-50 border-gray-100 hover:border-gray-300"}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={`font-medium truncate ${isDark ? "text-white" : "text-gray-900"}`}>
                            {item.personnelName}
                          </h3>
                          <span className={`px-2 py-0.5 text-xs rounded-full flex-shrink-0 ${
                            item.daysOverdue > 7
                              ? isDark ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-600"
                              : item.daysOverdue > 0
                                ? isDark ? "bg-amber-500/20 text-amber-400" : "bg-amber-100 text-amber-600"
                                : isDark ? "bg-green-500/20 text-green-400" : "bg-green-100 text-green-600"
                          }`}>
                            {item.milestoneLabel} Check-in
                          </span>
                        </div>
                        <p className={`text-sm truncate ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                          {item.department}
                        </p>
                      </div>
                      <div className="text-right ml-4 flex-shrink-0">
                        <p className={`text-xs font-medium ${
                          item.daysOverdue > 7
                            ? isDark ? "text-red-400" : "text-red-600"
                            : item.daysOverdue > 0
                              ? isDark ? "text-amber-400" : "text-amber-600"
                              : isDark ? "text-green-400" : "text-green-600"
                        }`}>
                          {item.daysOverdue === 0 ? "Due today" : `${item.daysOverdue} days overdue`}
                        </p>
                        <p className={`text-xs ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                          Hired {new Date(item.hireDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
                {pendingTenureCheckIns.length > 8 && (
                  <Link
                    href="/personnel"
                    className={`block text-center text-sm py-2 ${isDark ? "text-cyan-400 hover:text-cyan-300" : "text-blue-600 hover:text-blue-700"}`}
                  >
                    View all {pendingTenureCheckIns.length} pending check-ins
                  </Link>
                )}
              </div>
            </div>
          )}

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
