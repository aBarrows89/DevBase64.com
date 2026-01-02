"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Protected from "../protected";
import Sidebar, { MobileHeader } from "@/components/Sidebar";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { useTheme } from "../theme-context";
import { useAuth } from "../auth-context";

type Application = Doc<"applications">;

const STATUS_OPTIONS = [
  { value: "new", label: "New", color: "cyan" },
  { value: "reviewed", label: "Reviewed", color: "amber" },
  { value: "contacted", label: "Contacted", color: "purple" },
  { value: "interviewed", label: "Interviewed", color: "blue" },
  { value: "hired", label: "Hired", color: "green" },
  { value: "rejected", label: "Rejected", color: "red" },
];

const statusColors: Record<string, string> = {
  new: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  reviewed: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  contacted: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  interviewed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  hired: "bg-green-500/20 text-green-400 border-green-500/30",
  rejected: "bg-red-500/20 text-red-400 border-red-500/30",
};

function ApplicationsContent() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { user } = useAuth();
  const router = useRouter();
  const applications = useQuery(api.applications.getAll) || [];
  const stats = useQuery(api.applications.getStats);
  const updateStatus = useMutation(api.applications.updateStatus);
  const deleteApplication = useMutation(api.applications.remove);

  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<Id<"applications"> | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortBy, setSortBy] = useState<"score" | "position" | "date">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const handleSort = (column: "score" | "position" | "date") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder(column === "score" ? "desc" : "asc");
    }
  };

  const filteredApplications = applications
    .filter((app) => {
      const matchesStatus =
        filterStatus === "all" || app.status === filterStatus;
      const matchesSearch =
        searchTerm === "" ||
        `${app.firstName} ${app.lastName}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        app.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.appliedJobTitle.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      let comparison = 0;

      if (sortBy === "score") {
        const scoreA = a.candidateAnalysis?.overallScore ?? -1;
        const scoreB = b.candidateAnalysis?.overallScore ?? -1;
        comparison = scoreA - scoreB;
      } else if (sortBy === "position") {
        comparison = a.appliedJobTitle.localeCompare(b.appliedJobTitle);
      } else if (sortBy === "date") {
        comparison = a.createdAt - b.createdAt;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

  const handleStatusChange = async (
    applicationId: Id<"applications">,
    newStatus: string
  ) => {
    await updateStatus({ applicationId, status: newStatus });
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    setIsDeleting(true);
    try {
      await deleteApplication({ applicationId: deleteConfirmId });
      setDeleteConfirmId(null);
    } catch (error) {
      console.error("Failed to delete application:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const canDeleteApplications = user?.role === "super_admin" || user?.role === "admin";

  return (
    <div className={`flex h-screen ${isDark ? "bg-slate-900" : "bg-[#f2f2f7]"}`}>
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        {/* Mobile Header */}
        <MobileHeader />

        {/* Header */}
        <header className={`sticky top-0 z-10 backdrop-blur-sm border-b px-4 sm:px-8 py-3 sm:py-4 ${isDark ? "bg-slate-900/80 border-slate-700" : "bg-white/80 border-gray-200"}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className={`text-xl sm:text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>Applications</h1>
              <p className={`text-xs sm:text-sm mt-1 hidden sm:block ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                Review and manage job applications
              </p>
            </div>
            <button
              onClick={() => router.push("/applications/bulk-upload")}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors flex-shrink-0 ${
                isDark
                  ? "bg-cyan-600 hover:bg-cyan-700 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="hidden sm:inline">Bulk Upload</span>
              <span className="sm:hidden">Upload</span>
            </button>
          </div>
        </header>

        <div className="p-4 sm:p-8 space-y-4 sm:space-y-6">
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-4">
              <div className={`rounded-lg p-2 sm:p-4 text-center ${isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white border border-gray-200 shadow-sm"}`}>
                <p className={`text-lg sm:text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{stats.total}</p>
                <p className={`text-[10px] sm:text-xs ${isDark ? "text-slate-500" : "text-gray-500"}`}>Total</p>
              </div>
              {STATUS_OPTIONS.map((status) => (
                <div
                  key={status.value}
                  className={`rounded-lg p-2 sm:p-4 text-center ${isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white border border-gray-200 shadow-sm"}`}
                >
                  <p className={`text-lg sm:text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                    {stats[status.value as keyof typeof stats] || 0}
                  </p>
                  <p className={`text-[10px] sm:text-xs ${isDark ? "text-slate-500" : "text-gray-500"}`}>{status.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Top Candidates Section */}
          {applications.length > 0 && (() => {
            const topCandidates = applications
              .filter(app =>
                app.candidateAnalysis?.overallScore &&
                app.status !== "hired" &&
                app.status !== "rejected"
              )
              .sort((a, b) => (b.candidateAnalysis?.overallScore || 0) - (a.candidateAnalysis?.overallScore || 0))
              .slice(0, 3);

            if (topCandidates.length === 0) return null;

            return (
              <div className={`rounded-xl p-4 sm:p-6 ${isDark ? "bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border border-cyan-700/50" : "bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200"}`}>
                <div className="flex items-center gap-2 mb-4">
                  <svg className={`w-5 h-5 ${isDark ? "text-cyan-400" : "text-blue-600"}`} fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <h2 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>Top Candidates</h2>
                  <span className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    (Highest scoring active applicants)
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {topCandidates.map((app, index) => (
                    <div
                      key={app._id}
                      onClick={() => router.push(`/applications/${app._id}`)}
                      className={`relative rounded-lg p-4 cursor-pointer transition-all hover:scale-[1.02] ${
                        isDark
                          ? "bg-slate-800/80 border border-slate-600 hover:border-cyan-500"
                          : "bg-white border border-gray-200 hover:border-blue-400 shadow-sm hover:shadow-md"
                      }`}
                    >
                      {/* Rank Badge */}
                      <div className={`absolute -top-2 -left-2 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0
                          ? "bg-yellow-500 text-yellow-900"
                          : index === 1
                            ? "bg-gray-300 text-gray-700"
                            : "bg-amber-600 text-amber-100"
                      }`}>
                        #{index + 1}
                      </div>

                      {/* Status Badge - moved to top right */}
                      <div className="absolute top-3 right-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColors[app.status]}`}>
                          {app.status}
                        </span>
                      </div>

                      {/* Name and Score */}
                      <div className="flex items-start justify-between mb-3 pr-16">
                        <div>
                          <p className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                            {app.firstName} {app.lastName}
                          </p>
                          <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                            {app.appliedJobTitle}
                          </p>
                        </div>
                        <div className={`text-2xl font-bold ${
                          (app.candidateAnalysis?.overallScore || 0) >= 80
                            ? "text-green-500"
                            : (app.candidateAnalysis?.overallScore || 0) >= 60
                              ? "text-amber-500"
                              : "text-red-500"
                        }`}>
                          {app.candidateAnalysis?.overallScore}
                        </div>
                      </div>

                      {/* Quick Stats */}
                      <div className="flex gap-4 text-xs">
                        <div>
                          <span className={isDark ? "text-slate-500" : "text-gray-400"}>Stability: </span>
                          <span className={isDark ? "text-slate-300" : "text-gray-700"}>{app.candidateAnalysis?.stabilityScore}</span>
                        </div>
                        <div>
                          <span className={isDark ? "text-slate-500" : "text-gray-400"}>Experience: </span>
                          <span className={isDark ? "text-slate-300" : "text-gray-700"}>{app.candidateAnalysis?.experienceScore}</span>
                        </div>
                      </div>

                      {/* Recommended Action */}
                      <div className={`mt-3 text-xs px-2 py-1 rounded inline-block ${
                        app.candidateAnalysis?.recommendedAction === "strong_candidate"
                          ? isDark ? "bg-green-900/50 text-green-400" : "bg-green-100 text-green-700"
                          : app.candidateAnalysis?.recommendedAction === "worth_interviewing"
                            ? isDark ? "bg-blue-900/50 text-blue-400" : "bg-blue-100 text-blue-700"
                            : isDark ? "bg-slate-700 text-slate-400" : "bg-gray-100 text-gray-600"
                      }`}>
                        {app.candidateAnalysis?.recommendedAction?.replace(/_/g, " ")}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search name, email, or job..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full px-3 sm:px-4 py-2 text-sm sm:text-base rounded-lg focus:outline-none ${isDark ? "bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:border-cyan-500" : "bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-600"}`}
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={`px-3 sm:px-4 py-2 text-sm sm:text-base rounded-lg focus:outline-none ${isDark ? "bg-slate-800/50 border border-slate-700 text-white focus:border-cyan-500" : "bg-white border border-gray-200 text-gray-900 focus:border-blue-600"}`}
            >
              <option value="all">All Statuses</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          {/* Applications Table */}
          <div className={`rounded-xl overflow-hidden ${isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white border border-gray-200 shadow-sm"}`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`border-b ${isDark ? "border-slate-700" : "border-gray-200"}`}>
                    <th className={`text-left px-6 py-4 text-sm font-medium ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                      Applicant
                    </th>
                    <th
                      onClick={() => handleSort("position")}
                      className={`text-left px-6 py-4 text-sm font-medium cursor-pointer select-none transition-colors ${
                        isDark
                          ? sortBy === "position" ? "text-cyan-400" : "text-slate-400 hover:text-slate-300"
                          : sortBy === "position" ? "text-blue-600" : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        Position
                        {sortBy === "position" && (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortOrder === "asc" ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                          </svg>
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("score")}
                      className={`text-left px-6 py-4 text-sm font-medium cursor-pointer select-none transition-colors ${
                        isDark
                          ? sortBy === "score" ? "text-cyan-400" : "text-slate-400 hover:text-slate-300"
                          : sortBy === "score" ? "text-blue-600" : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        Score
                        {sortBy === "score" && (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortOrder === "asc" ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                          </svg>
                        )}
                      </div>
                    </th>
                    <th className={`text-left px-6 py-4 text-sm font-medium ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                      Status
                    </th>
                    <th
                      onClick={() => handleSort("date")}
                      className={`text-left px-6 py-4 text-sm font-medium cursor-pointer select-none transition-colors ${
                        isDark
                          ? sortBy === "date" ? "text-cyan-400" : "text-slate-400 hover:text-slate-300"
                          : sortBy === "date" ? "text-blue-600" : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        Applied
                        {sortBy === "date" && (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortOrder === "asc" ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                          </svg>
                        )}
                      </div>
                    </th>
                    <th className={`text-right px-6 py-4 text-sm font-medium ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApplications.map((app) => (
                    <tr
                      key={app._id}
                      className={`border-b cursor-pointer ${isDark ? "border-slate-700/50 hover:bg-slate-700/20" : "border-gray-200 hover:bg-gray-50"}`}
                      onClick={() => router.push(`/applications/${app._id}`)}
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                            {app.firstName} {app.lastName}
                          </p>
                          <p className={`text-sm ${isDark ? "text-slate-500" : "text-gray-500"}`}>{app.email}</p>
                        </div>
                      </td>
                      <td className={`px-6 py-4 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                        {app.appliedJobTitle}
                      </td>
                      <td className="px-6 py-4">
                        {app.candidateAnalysis ? (
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded ${
                              app.candidateAnalysis.overallScore >= 70
                                ? "bg-green-500/20 text-green-400"
                                : app.candidateAnalysis.overallScore >= 50
                                  ? "bg-amber-500/20 text-amber-400"
                                  : "bg-red-500/20 text-red-400"
                            }`}
                          >
                            {app.candidateAnalysis.overallScore}%
                          </span>
                        ) : (
                          <span className={`text-sm ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                            Not analyzed
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={app.status}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleStatusChange(app._id, e.target.value);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className={`px-3 py-1 text-xs font-medium rounded border ${statusColors[app.status]} bg-transparent focus:outline-none`}
                        >
                          {STATUS_OPTIONS.map((status) => (
                            <option
                              key={status.value}
                              value={status.value}
                              className={isDark ? "bg-slate-800 text-white" : "bg-white text-gray-900"}
                            >
                              {status.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className={`px-6 py-4 text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                        {new Date(app.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/applications/${app._id}`);
                            }}
                            className={`text-sm ${isDark ? "text-cyan-400 hover:text-cyan-300" : "text-blue-600 hover:text-blue-700"}`}
                          >
                            View
                          </button>
                          {canDeleteApplications && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmId(app._id);
                              }}
                              className="text-sm text-red-400 hover:text-red-300"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredApplications.length === 0 && (
                <div className="text-center py-12">
                  <p className={isDark ? "text-slate-500" : "text-gray-500"}>No applications found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md rounded-xl p-4 sm:p-6 ${isDark ? "bg-slate-800 border border-slate-700" : "bg-white border border-gray-200 shadow-xl"}`}>
            <h3 className={`text-base sm:text-lg font-semibold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
              Delete Application
            </h3>
            <p className={`text-sm sm:text-base mb-4 sm:mb-6 ${isDark ? "text-slate-400" : "text-gray-600"}`}>
              Are you sure you want to delete this application? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                disabled={isDeleting}
                className={`px-3 sm:px-4 py-2 text-sm sm:text-base rounded-lg ${isDark ? "text-slate-300 hover:bg-slate-700" : "text-gray-700 hover:bg-gray-100"}`}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-3 sm:px-4 py-2 text-sm sm:text-base bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ApplicationsPage() {
  return (
    <Protected>
      <ApplicationsContent />
    </Protected>
  );
}
