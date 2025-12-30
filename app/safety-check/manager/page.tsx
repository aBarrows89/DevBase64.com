"use client";

import { useState } from "react";
import Protected from "../../protected";
import Sidebar from "@/components/Sidebar";
import { useTheme } from "../../theme-context";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface CompletionRecord {
  _id: string;
  personnelName: string;
  equipmentNumber: string;
  equipmentType: string;
  completedAt: number;
  totalTimeSpent: number;
  allPassed: boolean;
  shiftDate: string;
  responses: Array<{
    itemId: string;
    question: string;
    passed: boolean;
    notes?: string;
    timeSpent: number;
    completedAt: number;
  }>;
  issues?: Array<{
    itemId: string;
    description: string;
  }>;
}

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

  const formatFullDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getLocationName = () => {
    if (selectedLocation === "all") return "All Locations";
    return locations?.find(l => l._id === selectedLocation)?.name || "Unknown";
  };

  // Print individual safety check record
  const printRecord = (completion: CompletionRecord) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const passedItems = completion.responses.filter(r => r.passed).length;
    const failedItems = completion.responses.filter(r => !r.passed).length;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Safety Check Record - ${completion.personnelName} - ${completion.shiftDate}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            .header { border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 20px; }
            .company-name { font-size: 24px; font-weight: bold; }
            .document-title { font-size: 18px; color: #333; margin-top: 5px; }
            .record-id { font-size: 12px; color: #666; margin-top: 10px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
            .info-box { border: 1px solid #ddd; padding: 15px; border-radius: 4px; }
            .info-label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
            .info-value { font-size: 16px; font-weight: 600; margin-top: 4px; }
            .status-passed { color: #16a34a; }
            .status-failed { color: #dc2626; }
            .summary-box { background: #f5f5f5; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
            .summary-title { font-weight: 600; margin-bottom: 10px; }
            .summary-stats { display: flex; gap: 30px; }
            .stat { }
            .stat-value { font-size: 20px; font-weight: bold; }
            .stat-label { font-size: 12px; color: #666; }
            .checklist { margin-top: 20px; }
            .checklist-title { font-size: 16px; font-weight: 600; margin-bottom: 15px; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
            .checklist-item { display: flex; align-items: flex-start; gap: 10px; padding: 10px 0; border-bottom: 1px solid #eee; }
            .checklist-status { width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0; }
            .checklist-status.passed { background: #dcfce7; color: #16a34a; }
            .checklist-status.failed { background: #fee2e2; color: #dc2626; }
            .checklist-content { flex: 1; }
            .checklist-question { font-size: 14px; }
            .checklist-note { font-size: 12px; color: #666; margin-top: 4px; font-style: italic; }
            .checklist-time { font-size: 12px; color: #999; }
            .issues-section { margin-top: 20px; padding: 15px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 4px; }
            .issues-title { color: #dc2626; font-weight: 600; margin-bottom: 10px; }
            .issue-item { font-size: 14px; margin: 5px 0; padding-left: 15px; position: relative; }
            .issue-item:before { content: "•"; position: absolute; left: 0; color: #dc2626; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
            .signature-line { margin-top: 40px; display: flex; gap: 40px; }
            .signature-box { flex: 1; }
            .signature-label { font-size: 12px; color: #666; margin-bottom: 30px; }
            .signature-field { border-top: 1px solid #000; padding-top: 5px; font-size: 12px; }
            @media print {
              body { padding: 20px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">IE Tire LLC</div>
            <div class="document-title">Pre-Operation Safety Inspection Record</div>
            <div class="record-id">Record ID: ${completion._id}</div>
          </div>

          <div class="info-grid">
            <div class="info-box">
              <div class="info-label">Operator Name</div>
              <div class="info-value">${completion.personnelName}</div>
            </div>
            <div class="info-box">
              <div class="info-label">Equipment</div>
              <div class="info-value">${completion.equipmentType === "picker" ? "Picker" : "Scanner"} #${completion.equipmentNumber}</div>
            </div>
            <div class="info-box">
              <div class="info-label">Inspection Date</div>
              <div class="info-value">${new Date(completion.shiftDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>
            <div class="info-box">
              <div class="info-label">Completion Time</div>
              <div class="info-value">${formatFullDateTime(completion.completedAt)}</div>
            </div>
          </div>

          <div class="summary-box">
            <div class="summary-title">Inspection Summary</div>
            <div class="summary-stats">
              <div class="stat">
                <div class="stat-value ${completion.allPassed ? 'status-passed' : 'status-failed'}">${completion.allPassed ? 'PASSED' : 'ISSUES FOUND'}</div>
                <div class="stat-label">Overall Status</div>
              </div>
              <div class="stat">
                <div class="stat-value">${passedItems}/${completion.responses.length}</div>
                <div class="stat-label">Items Passed</div>
              </div>
              <div class="stat">
                <div class="stat-value">${failedItems}</div>
                <div class="stat-label">Issues Found</div>
              </div>
              <div class="stat">
                <div class="stat-value">${formatDuration(completion.totalTimeSpent)}</div>
                <div class="stat-label">Total Duration</div>
              </div>
            </div>
          </div>

          ${completion.issues && completion.issues.length > 0 ? `
            <div class="issues-section">
              <div class="issues-title">Issues Requiring Attention</div>
              ${completion.issues.map(issue => `<div class="issue-item">${issue.description}</div>`).join('')}
            </div>
          ` : ''}

          <div class="checklist">
            <div class="checklist-title">Detailed Inspection Checklist</div>
            ${completion.responses.map((r, idx) => `
              <div class="checklist-item">
                <div class="checklist-status ${r.passed ? 'passed' : 'failed'}">${r.passed ? '✓' : '✗'}</div>
                <div class="checklist-content">
                  <div class="checklist-question">${idx + 1}. ${r.question}</div>
                  ${r.notes ? `<div class="checklist-note">Note: ${r.notes}</div>` : ''}
                </div>
                <div class="checklist-time">${r.timeSpent}s</div>
              </div>
            `).join('')}
          </div>

          <div class="signature-line">
            <div class="signature-box">
              <div class="signature-label">Operator Signature:</div>
              <div class="signature-field">Electronically signed by ${completion.personnelName} on ${formatFullDateTime(completion.completedAt)}</div>
            </div>
            <div class="signature-box">
              <div class="signature-label">Supervisor Review (if required):</div>
              <div class="signature-field">_______________________________</div>
            </div>
          </div>

          <div class="footer">
            <p>This document is an official record of a pre-operation safety inspection conducted in accordance with OSHA regulations (29 CFR 1910.178).</p>
            <p style="margin-top: 10px;">Document generated: ${new Date().toLocaleString()} | IE Tire LLC Safety Management System</p>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  // Print daily report
  const printDailyReport = () => {
    if (!completions || completions.length === 0) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const locationName = getLocationName();

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Daily Safety Inspection Report - ${selectedDate}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 40px; max-width: 1000px; margin: 0 auto; }
            .header { border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 20px; }
            .company-name { font-size: 24px; font-weight: bold; }
            .document-title { font-size: 18px; color: #333; margin-top: 5px; }
            .report-info { font-size: 14px; color: #666; margin-top: 10px; }
            .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
            .summary-box { border: 1px solid #ddd; padding: 15px; border-radius: 4px; text-align: center; }
            .summary-value { font-size: 28px; font-weight: bold; }
            .summary-label { font-size: 12px; color: #666; text-transform: uppercase; margin-top: 5px; }
            .passed { color: #16a34a; }
            .failed { color: #dc2626; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 13px; }
            th { background: #f5f5f5; font-weight: 600; }
            tr:nth-child(even) { background: #fafafa; }
            .status-badge { display: inline-block; padding: 3px 8px; border-radius: 3px; font-size: 11px; font-weight: 600; }
            .status-passed { background: #dcfce7; color: #16a34a; }
            .status-failed { background: #fee2e2; color: #dc2626; }
            .issues-cell { font-size: 11px; color: #dc2626; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
            .certification { margin-top: 30px; padding: 20px; border: 1px solid #ddd; }
            .certification-title { font-weight: 600; margin-bottom: 15px; }
            .signature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 20px; }
            .signature-box { }
            .signature-line { border-top: 1px solid #000; margin-top: 40px; padding-top: 5px; font-size: 12px; }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">IE Tire LLC</div>
            <div class="document-title">Daily Pre-Operation Safety Inspection Report</div>
            <div class="report-info">
              Date: ${new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} |
              Location: ${locationName} |
              Generated: ${new Date().toLocaleString()}
            </div>
          </div>

          <div class="summary-grid">
            <div class="summary-box">
              <div class="summary-value">${totalCompletions}</div>
              <div class="summary-label">Total Inspections</div>
            </div>
            <div class="summary-box">
              <div class="summary-value passed">${passedCount}</div>
              <div class="summary-label">All Items Passed</div>
            </div>
            <div class="summary-box">
              <div class="summary-value failed">${failedCount}</div>
              <div class="summary-label">With Issues</div>
            </div>
            <div class="summary-box">
              <div class="summary-value">${totalCompletions > 0 ? Math.round((passedCount / totalCompletions) * 100) : 0}%</div>
              <div class="summary-label">Compliance Rate</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Operator</th>
                <th>Equipment</th>
                <th>Duration</th>
                <th>Status</th>
                <th>Issues/Notes</th>
              </tr>
            </thead>
            <tbody>
              ${(completions as CompletionRecord[]).map(c => `
                <tr>
                  <td>${formatTime(c.completedAt)}</td>
                  <td>${c.personnelName}</td>
                  <td>${c.equipmentType === "picker" ? "Picker" : "Scanner"} #${c.equipmentNumber}</td>
                  <td>${formatDuration(c.totalTimeSpent)}</td>
                  <td><span class="status-badge ${c.allPassed ? 'status-passed' : 'status-failed'}">${c.allPassed ? 'PASSED' : 'ISSUES'}</span></td>
                  <td class="issues-cell">${c.issues && c.issues.length > 0 ? c.issues.map(i => i.description).join('; ') : '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="certification">
            <div class="certification-title">Supervisor Certification</div>
            <p style="font-size: 13px; color: #333;">I hereby certify that I have reviewed the above safety inspection records and confirm that all equipment with issues has been properly addressed or removed from service pending repair.</p>
            <div class="signature-grid">
              <div class="signature-box">
                <div class="signature-line">Supervisor Signature</div>
              </div>
              <div class="signature-box">
                <div class="signature-line">Date</div>
              </div>
            </div>
          </div>

          <div class="footer">
            <p>This report documents pre-operation safety inspections conducted in accordance with OSHA regulations (29 CFR 1910.178) for powered industrial trucks.</p>
            <p style="margin-top: 5px;">Retain this document for a minimum of 3 years as required by regulatory compliance standards.</p>
            <p style="margin-top: 10px;">IE Tire LLC Safety Management System | Report ID: RPT-${selectedDate}-${Date.now()}</p>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
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
            {completions && completions.length > 0 && (
              <button
                onClick={printDailyReport}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${isDark ? "bg-cyan-500 text-white hover:bg-cyan-600" : "bg-blue-600 text-white hover:bg-blue-700"}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Daily Report
              </button>
            )}
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
                        <div className="flex items-center justify-between">
                          <h4 className={`font-medium text-sm ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                            Checklist Responses
                          </h4>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              printRecord(completion as CompletionRecord);
                            }}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${isDark ? "bg-slate-700 text-slate-300 hover:bg-slate-600" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            Print Record
                          </button>
                        </div>
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
