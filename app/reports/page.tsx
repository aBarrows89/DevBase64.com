"use client";

import { useState } from "react";
import Protected from "../protected";
import Sidebar, { MobileHeader } from "@/components/Sidebar";
import { useTheme } from "../theme-context";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

// CSV export utility
function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((h) => {
          const value = String(row[h] ?? "");
          // Escape quotes and wrap in quotes if contains comma, quote, or newline
          if (value.includes(",") || value.includes('"') || value.includes("\n")) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
  link.click();
}

type ReportType = "personnel" | "applications" | "hiring" | "attendance" | "equipment";

function ReportsContent() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [activeReport, setActiveReport] = useState<ReportType>("personnel");
  const [appStatus, setAppStatus] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Queries
  const personnel = useQuery(api.reports.getPersonnelExport);
  const applications = useQuery(api.reports.getApplicationsExport, {
    status: appStatus === "all" ? undefined : appStatus,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });
  const hiringReport = useQuery(api.reports.getHiringReport, {
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });
  const equipmentReport = useQuery(api.reports.getEquipmentReport);
  const attendanceReport = useQuery(
    api.reports.getAttendanceReport,
    startDate && endDate ? { startDate, endDate } : "skip"
  );

  const reportTypes: { id: ReportType; label: string; icon: string; description: string }[] = [
    {
      id: "personnel",
      label: "Personnel",
      icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
      description: "Export all personnel records with contact info, departments, and status",
    },
    {
      id: "attendance",
      label: "Attendance",
      icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
      description: "View attendance records, late arrivals, and time tracking data",
    },
    {
      id: "applications",
      label: "Applications",
      icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
      description: "Export job applications with scores, status, and interview info",
    },
    {
      id: "hiring",
      label: "Hiring Analytics",
      icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
      description: "View hiring metrics, conversion rates, and job-specific analytics",
    },
    {
      id: "equipment",
      label: "Equipment",
      icon: "M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z",
      description: "Export scanner and picker inventory with assignments",
    },
  ];

  const handleExport = () => {
    switch (activeReport) {
      case "personnel":
        if (personnel) exportToCSV(personnel, "personnel_export");
        break;
      case "attendance":
        if (attendanceReport) exportToCSV(attendanceReport.records, "attendance_export");
        break;
      case "applications":
        if (applications) exportToCSV(applications, "applications_export");
        break;
      case "hiring":
        if (hiringReport) {
          exportToCSV(hiringReport.byJob, "hiring_by_job");
        }
        break;
      case "equipment":
        if (equipmentReport) exportToCSV(equipmentReport.equipment, "equipment_export");
        break;
    }
  };

  return (
    <div className={`flex h-screen ${isDark ? "bg-slate-900" : "bg-[#f2f2f7]"}`}>
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <MobileHeader />

        {/* Header */}
        <header className={`sticky top-0 z-10 backdrop-blur-sm border-b px-4 sm:px-8 py-3 sm:py-4 ${isDark ? "bg-slate-900/80 border-slate-700" : "bg-white/80 border-gray-200"}`}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-xl sm:text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                Reports & Export
              </h1>
              <p className={`text-xs sm:text-sm mt-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                Generate reports and export data
              </p>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-8 space-y-6">
          {/* Report Type Selection */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {reportTypes.map((report) => (
              <button
                key={report.id}
                onClick={() => setActiveReport(report.id)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  activeReport === report.id
                    ? isDark
                      ? "bg-cyan-500/20 border-cyan-500/50 ring-2 ring-cyan-500/30"
                      : "bg-blue-50 border-blue-300 ring-2 ring-blue-200"
                    : isDark
                      ? "bg-slate-800/50 border-slate-700 hover:border-slate-600"
                      : "bg-white border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                  activeReport === report.id
                    ? isDark ? "bg-cyan-500/30" : "bg-blue-100"
                    : isDark ? "bg-slate-700" : "bg-gray-100"
                }`}>
                  <svg
                    className={`w-5 h-5 ${
                      activeReport === report.id
                        ? isDark ? "text-cyan-400" : "text-blue-600"
                        : isDark ? "text-slate-400" : "text-gray-500"
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={report.icon} />
                  </svg>
                </div>
                <h3 className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                  {report.label}
                </h3>
                <p className={`text-xs mt-1 ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                  {report.description}
                </p>
              </button>
            ))}
          </div>

          {/* Filters */}
          {(activeReport === "applications" || activeReport === "hiring" || activeReport === "attendance") && (
            <div className={`border rounded-xl p-4 sm:p-6 ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200"}`}>
              <h3 className={`font-medium mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
                Filters
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {activeReport === "applications" && (
                  <div>
                    <label className={`block text-sm mb-1 ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                      Status
                    </label>
                    <select
                      value={appStatus}
                      onChange={(e) => setAppStatus(e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg border ${isDark ? "bg-slate-900 border-slate-600 text-white" : "bg-white border-gray-300"}`}
                    >
                      <option value="all">All Statuses</option>
                      <option value="new">New</option>
                      <option value="reviewed">Reviewed</option>
                      <option value="contacted">Contacted</option>
                      <option value="interview_scheduled">Interview Scheduled</option>
                      <option value="interviewed">Interviewed</option>
                      <option value="hired">Hired</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                )}
                <div>
                  <label className={`block text-sm mb-1 ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border ${isDark ? "bg-slate-900 border-slate-600 text-white" : "bg-white border-gray-300"}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm mb-1 ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border ${isDark ? "bg-slate-900 border-slate-600 text-white" : "bg-white border-gray-300"}`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Report Content */}
          <div className={`border rounded-xl p-4 sm:p-6 ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200"}`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                {reportTypes.find((r) => r.id === activeReport)?.label} Report
              </h3>
              <button
                onClick={handleExport}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isDark
                    ? "bg-cyan-500 hover:bg-cyan-600 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export CSV
              </button>
            </div>

            {/* Personnel Report */}
            {activeReport === "personnel" && (
              <div className="overflow-x-auto">
                {personnel ? (
                  <>
                    <p className={`mb-4 ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                      {personnel.length} personnel records
                    </p>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className={isDark ? "text-slate-400" : "text-gray-500"}>
                          <th className="text-left py-2 px-3">Name</th>
                          <th className="text-left py-2 px-3">Position</th>
                          <th className="text-left py-2 px-3">Department</th>
                          <th className="text-left py-2 px-3">Status</th>
                          <th className="text-left py-2 px-3">Hire Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {personnel.slice(0, 10).map((p) => (
                          <tr key={p.id} className={`border-t ${isDark ? "border-slate-700" : "border-gray-100"}`}>
                            <td className={`py-2 px-3 ${isDark ? "text-white" : "text-gray-900"}`}>
                              {p.firstName} {p.lastName}
                            </td>
                            <td className={`py-2 px-3 ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                              {p.position}
                            </td>
                            <td className={`py-2 px-3 ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                              {p.department}
                            </td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-0.5 text-xs rounded-full ${
                                p.status === "active"
                                  ? "bg-green-500/20 text-green-400"
                                  : "bg-slate-500/20 text-slate-400"
                              }`}>
                                {p.status}
                              </span>
                            </td>
                            <td className={`py-2 px-3 ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                              {p.hireDate}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {personnel.length > 10 && (
                      <p className={`mt-4 text-sm ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                        Showing 10 of {personnel.length} records. Export to see all.
                      </p>
                    )}
                  </>
                ) : (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
                  </div>
                )}
              </div>
            )}

            {/* Applications Report */}
            {activeReport === "applications" && (
              <div className="overflow-x-auto">
                {applications ? (
                  <>
                    <p className={`mb-4 ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                      {applications.length} applications
                    </p>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className={isDark ? "text-slate-400" : "text-gray-500"}>
                          <th className="text-left py-2 px-3">Name</th>
                          <th className="text-left py-2 px-3">Position</th>
                          <th className="text-left py-2 px-3">Score</th>
                          <th className="text-left py-2 px-3">Status</th>
                          <th className="text-left py-2 px-3">Applied</th>
                        </tr>
                      </thead>
                      <tbody>
                        {applications.slice(0, 10).map((a) => (
                          <tr key={a.id} className={`border-t ${isDark ? "border-slate-700" : "border-gray-100"}`}>
                            <td className={`py-2 px-3 ${isDark ? "text-white" : "text-gray-900"}`}>
                              {a.firstName} {a.lastName}
                            </td>
                            <td className={`py-2 px-3 ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                              {a.appliedJobTitle}
                            </td>
                            <td className="py-2 px-3">
                              {a.overallScore ? (
                                <span className={`px-2 py-0.5 text-xs rounded-full ${
                                  Number(a.overallScore) >= 70 ? "bg-green-500/20 text-green-400" :
                                  Number(a.overallScore) >= 50 ? "bg-amber-500/20 text-amber-400" :
                                  "bg-red-500/20 text-red-400"
                                }`}>
                                  {a.overallScore}%
                                </span>
                              ) : "-"}
                            </td>
                            <td className={`py-2 px-3 ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                              {a.status}
                            </td>
                            <td className={`py-2 px-3 ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                              {new Date(a.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {applications.length > 10 && (
                      <p className={`mt-4 text-sm ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                        Showing 10 of {applications.length} records. Export to see all.
                      </p>
                    )}
                  </>
                ) : (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
                  </div>
                )}
              </div>
            )}

            {/* Hiring Analytics */}
            {activeReport === "hiring" && hiringReport && (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className={`p-4 rounded-lg ${isDark ? "bg-slate-900/50" : "bg-gray-50"}`}>
                    <p className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                      {hiringReport.summary.totalApplications}
                    </p>
                    <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-600"}`}>Total Applications</p>
                  </div>
                  <div className={`p-4 rounded-lg ${isDark ? "bg-slate-900/50" : "bg-gray-50"}`}>
                    <p className="text-2xl font-bold text-green-400">{hiringReport.summary.hired}</p>
                    <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-600"}`}>Hired</p>
                  </div>
                  <div className={`p-4 rounded-lg ${isDark ? "bg-slate-900/50" : "bg-gray-50"}`}>
                    <p className={`text-2xl font-bold ${isDark ? "text-cyan-400" : "text-blue-600"}`}>
                      {hiringReport.summary.hireRate}%
                    </p>
                    <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-600"}`}>Hire Rate</p>
                  </div>
                  <div className={`p-4 rounded-lg ${isDark ? "bg-slate-900/50" : "bg-gray-50"}`}>
                    <p className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                      {hiringReport.summary.avgHiredScore || "-"}%
                    </p>
                    <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-600"}`}>Avg Hired Score</p>
                  </div>
                </div>

                {/* By Job Table */}
                <div>
                  <h4 className={`font-medium mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
                    By Position
                  </h4>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={isDark ? "text-slate-400" : "text-gray-500"}>
                        <th className="text-left py-2 px-3">Position</th>
                        <th className="text-left py-2 px-3">Total</th>
                        <th className="text-left py-2 px-3">Hired</th>
                        <th className="text-left py-2 px-3">Rejected</th>
                        <th className="text-left py-2 px-3">Hire Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hiringReport.byJob.map((job) => (
                        <tr key={job.jobTitle} className={`border-t ${isDark ? "border-slate-700" : "border-gray-100"}`}>
                          <td className={`py-2 px-3 ${isDark ? "text-white" : "text-gray-900"}`}>
                            {job.jobTitle}
                          </td>
                          <td className={`py-2 px-3 ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                            {job.total}
                          </td>
                          <td className="py-2 px-3 text-green-400">{job.hired}</td>
                          <td className="py-2 px-3 text-red-400">{job.rejected}</td>
                          <td className={`py-2 px-3 ${isDark ? "text-cyan-400" : "text-blue-600"}`}>
                            {job.hireRate}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Equipment Report */}
            {activeReport === "equipment" && equipmentReport && (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className={`p-4 rounded-lg ${isDark ? "bg-slate-900/50" : "bg-gray-50"}`}>
                    <p className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                      {equipmentReport.summary.totalScanners}
                    </p>
                    <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-600"}`}>Scanners</p>
                  </div>
                  <div className={`p-4 rounded-lg ${isDark ? "bg-slate-900/50" : "bg-gray-50"}`}>
                    <p className="text-2xl font-bold text-green-400">
                      {equipmentReport.summary.scannersAvailable}
                    </p>
                    <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-600"}`}>Available</p>
                  </div>
                  <div className={`p-4 rounded-lg ${isDark ? "bg-slate-900/50" : "bg-gray-50"}`}>
                    <p className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                      {equipmentReport.summary.totalPickers}
                    </p>
                    <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-600"}`}>Pickers</p>
                  </div>
                  <div className={`p-4 rounded-lg ${isDark ? "bg-slate-900/50" : "bg-gray-50"}`}>
                    <p className="text-2xl font-bold text-green-400">
                      {equipmentReport.summary.pickersAvailable}
                    </p>
                    <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-600"}`}>Available</p>
                  </div>
                </div>

                {/* Equipment Table */}
                <table className="w-full text-sm">
                  <thead>
                    <tr className={isDark ? "text-slate-400" : "text-gray-500"}>
                      <th className="text-left py-2 px-3">Type</th>
                      <th className="text-left py-2 px-3">Number</th>
                      <th className="text-left py-2 px-3">Model</th>
                      <th className="text-left py-2 px-3">Status</th>
                      <th className="text-left py-2 px-3">Assigned To</th>
                    </tr>
                  </thead>
                  <tbody>
                    {equipmentReport.equipment.slice(0, 15).map((eq, i) => (
                      <tr key={i} className={`border-t ${isDark ? "border-slate-700" : "border-gray-100"}`}>
                        <td className={`py-2 px-3 ${isDark ? "text-white" : "text-gray-900"}`}>
                          {eq.type}
                        </td>
                        <td className={`py-2 px-3 ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                          #{eq.number}
                        </td>
                        <td className={`py-2 px-3 ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                          {eq.model || "-"}
                        </td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            eq.status === "available" ? "bg-green-500/20 text-green-400" :
                            eq.status === "assigned" ? "bg-cyan-500/20 text-cyan-400" :
                            "bg-amber-500/20 text-amber-400"
                          }`}>
                            {eq.status}
                          </span>
                        </td>
                        <td className={`py-2 px-3 ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                          {eq.assignedTo || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {equipmentReport.equipment.length > 15 && (
                  <p className={`text-sm ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                    Showing 15 of {equipmentReport.equipment.length} records. Export to see all.
                  </p>
                )}
              </div>
            )}

            {/* Attendance Report */}
            {activeReport === "attendance" && (
              <div className="space-y-6">
                {!startDate || !endDate ? (
                  <div className={`text-center py-8 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p>Select a date range to view attendance records</p>
                  </div>
                ) : attendanceReport ? (
                  <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      {attendanceReport.summary.map((s) => (
                        <div key={s.name} className={`p-4 rounded-lg ${isDark ? "bg-slate-900/50" : "bg-gray-50"}`}>
                          <p className={`font-medium truncate ${isDark ? "text-white" : "text-gray-900"}`}>{s.name}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-green-400 text-sm">{s.present}P</span>
                            <span className="text-amber-400 text-sm">{s.late}L</span>
                            <span className="text-red-400 text-sm">{s.absent}A</span>
                          </div>
                          <p className={`text-xs mt-1 ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                            {s.attendanceRate}% attendance
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Records Table */}
                    <div className="overflow-x-auto">
                      <p className={`mb-4 ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                        {attendanceReport.records.length} attendance records
                      </p>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className={isDark ? "text-slate-400" : "text-gray-500"}>
                            <th className="text-left py-2 px-3">Date</th>
                            <th className="text-left py-2 px-3">Employee</th>
                            <th className="text-left py-2 px-3">Status</th>
                            <th className="text-left py-2 px-3">Scheduled</th>
                            <th className="text-left py-2 px-3">Actual</th>
                            <th className="text-left py-2 px-3">Hours</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attendanceReport.records.slice(0, 20).map((r) => (
                            <tr key={r.id} className={`border-t ${isDark ? "border-slate-700" : "border-gray-100"}`}>
                              <td className={`py-2 px-3 ${isDark ? "text-white" : "text-gray-900"}`}>
                                {r.date}
                              </td>
                              <td className={`py-2 px-3 ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                                {r.personnelName}
                              </td>
                              <td className="py-2 px-3">
                                <span className={`px-2 py-0.5 text-xs rounded-full ${
                                  r.status === "present" ? "bg-green-500/20 text-green-400" :
                                  r.status === "late" ? "bg-amber-500/20 text-amber-400" :
                                  r.status === "excused" ? "bg-blue-500/20 text-blue-400" :
                                  "bg-red-500/20 text-red-400"
                                }`}>
                                  {r.status.replace("_", " ")}
                                </span>
                              </td>
                              <td className={`py-2 px-3 ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                                {r.scheduledStart} - {r.scheduledEnd}
                              </td>
                              <td className={`py-2 px-3 ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                                {r.actualStart || "-"} - {r.actualEnd || "-"}
                              </td>
                              <td className={`py-2 px-3 ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                                {r.hoursWorked.toFixed(1)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {attendanceReport.records.length > 20 && (
                        <p className={`mt-4 text-sm ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                          Showing 20 of {attendanceReport.records.length} records. Export to see all.
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Protected>
      <ReportsContent />
    </Protected>
  );
}
