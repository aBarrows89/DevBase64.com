"use client";

import { useState, useMemo, useRef } from "react";
import Protected from "../protected";
import Sidebar from "@/components/Sidebar";
import { useTheme } from "../theme-context";
import { useAuth } from "../auth-context";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

const DEFAULT_FROM_LOCATION = "Latrobe, PA";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function MileageContent() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const isDark = theme === "dark";
  const printRef = useRef<HTMLDivElement>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Id<"mileageEntries"> | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    fromLocation: DEFAULT_FROM_LOCATION,
    toLocation: "",
    miles: "",
    isRoundTrip: true,
    purpose: "",
    vehicle: "",
    notes: "",
  });

  // Check if user is super_admin
  const isSuperAdmin = user?.role === "super_admin";

  // Queries
  const entries = useQuery(api.mileage.list, {
    year: selectedYear,
    month: selectedMonth ?? undefined,
    status: selectedStatus ?? undefined,
  });

  const summary = useQuery(api.mileage.getSummary, {
    year: selectedYear,
    month: selectedMonth ?? undefined,
  });

  const currentRate = useQuery(api.mileage.getCurrentRate);

  // Mutations
  const createEntry = useMutation(api.mileage.create);
  const updateEntry = useMutation(api.mileage.update);
  const updateStatus = useMutation(api.mileage.updateStatus);
  const removeEntry = useMutation(api.mileage.remove);

  // Years for filter
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear, currentYear - 1, currentYear - 2];
  }, []);

  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  const handleSubmit = async () => {
    if (!user || !formData.toLocation || !formData.miles || !formData.purpose) return;

    try {
      if (editingEntry) {
        await updateEntry({
          entryId: editingEntry,
          date: formData.date,
          fromLocation: formData.fromLocation,
          toLocation: formData.toLocation,
          miles: parseFloat(formData.miles),
          isRoundTrip: formData.isRoundTrip,
          purpose: formData.purpose,
          vehicle: formData.vehicle || undefined,
          notes: formData.notes || undefined,
        });
      } else {
        await createEntry({
          date: formData.date,
          fromLocation: formData.fromLocation,
          toLocation: formData.toLocation,
          miles: parseFloat(formData.miles),
          isRoundTrip: formData.isRoundTrip,
          purpose: formData.purpose,
          vehicle: formData.vehicle || undefined,
          notes: formData.notes || undefined,
          userId: user._id as Id<"users">,
        });
      }

      setShowAddModal(false);
      setEditingEntry(null);
      resetForm();
    } catch (err) {
      console.error("Failed to save entry:", err);
    }
  };

  const handleEdit = (entry: NonNullable<typeof entries>[0]) => {
    setEditingEntry(entry._id);
    setFormData({
      date: entry.date,
      fromLocation: entry.fromLocation,
      toLocation: entry.toLocation,
      miles: entry.miles.toString(),
      isRoundTrip: entry.isRoundTrip,
      purpose: entry.purpose,
      vehicle: entry.vehicle || "",
      notes: entry.notes || "",
    });
    setShowAddModal(true);
  };

  const handleDelete = async (entryId: Id<"mileageEntries">) => {
    if (!confirm("Are you sure you want to delete this entry?")) return;
    try {
      await removeEntry({ entryId });
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split("T")[0],
      fromLocation: DEFAULT_FROM_LOCATION,
      toLocation: "",
      miles: "",
      isRoundTrip: true,
      purpose: "",
      vehicle: "",
      notes: "",
    });
  };

  const handlePrint = () => {
    window.print();
  };

  // If not super_admin, show access denied
  if (!isSuperAdmin) {
    return (
      <div className={`flex h-screen ${isDark ? "bg-slate-900" : "bg-gray-50"}`}>
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className={`text-center p-8 rounded-xl ${isDark ? "bg-slate-800" : "bg-white"}`}>
            <div className="text-4xl mb-4">🔒</div>
            <h1 className={`text-xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
              Access Denied
            </h1>
            <p className={isDark ? "text-slate-400" : "text-gray-500"}>
              This page is only available to super administrators.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={`flex h-screen ${isDark ? "bg-slate-900" : "bg-gray-50"}`}>
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        {/* Print styles */}
        <style jsx global>{`
          @media print {
            body * { visibility: hidden; }
            .print-area, .print-area * { visibility: visible; }
            .print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              background: white !important;
              color: black !important;
              padding: 0.4in;
            }
            .no-print { display: none !important; }
            .print-only { display: block !important; }
            @page {
              margin: 0.4in;
              size: letter;
            }
            table {
              border-collapse: collapse;
              width: 100%;
              font-size: 9pt;
              margin-top: 16px;
            }
            th, td {
              border: 1px solid #555;
              padding: 5px 6px;
              text-align: left;
            }
            th {
              background: #e5e7eb !important;
              font-weight: 600;
              color: #111 !important;
              text-transform: uppercase;
              font-size: 8pt;
            }
            td {
              color: #333 !important;
            }
            tfoot td {
              background: #f3f4f6 !important;
              font-weight: bold;
            }
            .print-header {
              border-bottom: 3px solid #111;
              padding-bottom: 12px;
              margin-bottom: 0;
            }
            .print-header h1 {
              font-size: 18pt;
              letter-spacing: 1px;
            }
            .print-summary {
              background: #f9fafb !important;
              border: 2px solid #333;
              padding: 10px;
              margin-top: 12px;
              border-radius: 4px;
            }
            .print-summary p {
              margin: 0;
            }
            .print-footer {
              margin-top: 24px;
              page-break-inside: avoid;
            }
            .signature-line {
              border-top: 1px solid #333;
              width: 100%;
              max-width: 280px;
              margin-top: 50px;
              padding-top: 4px;
            }
            .grid {
              display: grid !important;
            }
            .grid-cols-2 {
              grid-template-columns: repeat(2, 1fr) !important;
            }
            .grid-cols-3 {
              grid-template-columns: repeat(3, 1fr) !important;
            }
            .gap-4 {
              gap: 16px !important;
            }
            .gap-8 {
              gap: 32px !important;
            }
            .text-center {
              text-align: center !important;
            }
            .text-right {
              text-align: right !important;
            }
            strong {
              font-weight: 700 !important;
            }
          }
        `}</style>

        {/* Header */}
        <header
          className={`sticky top-0 z-10 backdrop-blur-sm border-b px-4 sm:px-8 py-4 no-print ${
            isDark ? "bg-slate-900/80 border-slate-700" : "bg-white/80 border-gray-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-xl sm:text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                Mileage Tracker
              </h1>
              <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                IRS Rate: ${currentRate?.toFixed(2)}/mile
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isDark
                    ? "bg-slate-700 text-white hover:bg-slate-600"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Print
              </button>
              <button
                onClick={() => {
                  resetForm();
                  setEditingEntry(null);
                  setShowAddModal(true);
                }}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isDark
                    ? "bg-cyan-500 text-white hover:bg-cyan-600"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                + Add Entry
              </button>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-8 print-area" ref={printRef}>
          {/* Print Header */}
          <div className="hidden print:block print-header">
            <div className="text-center mb-4">
              <h1 className="text-2xl font-bold mb-1">MILEAGE REIMBURSEMENT REQUEST</h1>
              <p className="text-sm text-gray-500">Business Travel Expense Report</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
              <div>
                <p><strong>Employee:</strong> {user?.name || "N/A"}</p>
                <p><strong>Email:</strong> {user?.email || "N/A"}</p>
              </div>
              <div className="text-right">
                <p><strong>Period:</strong> {selectedMonth ? months.find((m) => m.value === selectedMonth)?.label : "All Months"} {selectedYear}</p>
                <p><strong>IRS Standard Rate:</strong> ${currentRate?.toFixed(3)}/mile</p>
              </div>
            </div>

            <div className="print-summary mt-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Total Entries</p>
                  <p className="text-lg font-bold">{summary?.totalEntries || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Total Miles</p>
                  <p className="text-lg font-bold">{summary?.totalMiles?.toFixed(1) || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Total Reimbursement</p>
                  <p className="text-lg font-bold">{formatCurrency(summary?.totalReimbursement || 0)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className={`flex flex-wrap gap-3 mb-6 no-print`}>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className={`px-3 py-2 rounded-lg border ${
                isDark
                  ? "bg-slate-800 border-slate-600 text-white"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            <select
              value={selectedMonth ?? ""}
              onChange={(e) => setSelectedMonth(e.target.value ? parseInt(e.target.value) : null)}
              className={`px-3 py-2 rounded-lg border ${
                isDark
                  ? "bg-slate-800 border-slate-600 text-white"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
            >
              <option value="">All Months</option>
              {months.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus ?? ""}
              onChange={(e) => setSelectedStatus(e.target.value || null)}
              className={`px-3 py-2 rounded-lg border ${
                isDark
                  ? "bg-slate-800 border-slate-600 text-white"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className={`p-4 rounded-xl border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
              <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>Total Entries</p>
              <p className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                {summary?.totalEntries || 0}
              </p>
            </div>
            <div className={`p-4 rounded-xl border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
              <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>Total Miles</p>
              <p className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                {summary?.totalMiles?.toFixed(1) || 0}
              </p>
            </div>
            <div className={`p-4 rounded-xl border ${isDark ? "bg-cyan-500/10 border-cyan-500/30" : "bg-blue-50 border-blue-200"}`}>
              <p className={`text-sm ${isDark ? "text-cyan-400" : "text-blue-600"}`}>Total Reimbursement</p>
              <p className={`text-2xl font-bold ${isDark ? "text-cyan-400" : "text-blue-700"}`}>
                {formatCurrency(summary?.totalReimbursement || 0)}
              </p>
            </div>
            <div className={`p-4 rounded-xl border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
              <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>Pending</p>
              <p className={`text-2xl font-bold ${isDark ? "text-amber-400" : "text-amber-600"}`}>
                {summary?.byStatus?.pending || 0}
              </p>
            </div>
          </div>

          {/* Entries Table */}
          <div className={`rounded-xl border overflow-hidden ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
            <table className="w-full">
              <thead className={isDark ? "bg-slate-700" : "bg-gray-50"}>
                <tr>
                  <th className={`px-4 py-3 text-left text-sm font-medium ${isDark ? "text-slate-300" : "text-gray-600"}`}>Date</th>
                  <th className={`px-4 py-3 text-left text-sm font-medium ${isDark ? "text-slate-300" : "text-gray-600"}`}>From</th>
                  <th className={`px-4 py-3 text-left text-sm font-medium ${isDark ? "text-slate-300" : "text-gray-600"}`}>To</th>
                  <th className={`px-4 py-3 text-left text-sm font-medium ${isDark ? "text-slate-300" : "text-gray-600"}`}>Miles</th>
                  <th className={`px-4 py-3 text-left text-sm font-medium ${isDark ? "text-slate-300" : "text-gray-600"}`}>Vehicle</th>
                  <th className={`px-4 py-3 text-left text-sm font-medium ${isDark ? "text-slate-300" : "text-gray-600"}`}>Purpose</th>
                  <th className={`px-4 py-3 text-left text-sm font-medium ${isDark ? "text-slate-300" : "text-gray-600"}`}>Reimbursement</th>
                  <th className={`px-4 py-3 text-left text-sm font-medium ${isDark ? "text-slate-300" : "text-gray-600"}`}>Status</th>
                  <th className={`px-4 py-3 text-right text-sm font-medium no-print ${isDark ? "text-slate-300" : "text-gray-600"}`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {entries?.map((entry) => (
                  <tr key={entry._id} className={isDark ? "hover:bg-slate-700/50" : "hover:bg-gray-50"}>
                    <td className={`px-4 py-3 text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
                      {formatDate(entry.date)}
                    </td>
                    <td className={`px-4 py-3 text-sm ${isDark ? "text-slate-300" : "text-gray-600"}`}>
                      {entry.fromLocation}
                    </td>
                    <td className={`px-4 py-3 text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
                      {entry.toLocation}
                    </td>
                    <td className={`px-4 py-3 text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
                      {entry.miles} {entry.isRoundTrip && <span className="text-xs text-slate-500">(RT)</span>}
                    </td>
                    <td className={`px-4 py-3 text-sm ${isDark ? "text-slate-300" : "text-gray-600"}`}>
                      {entry.vehicle || "-"}
                    </td>
                    <td className={`px-4 py-3 text-sm max-w-[200px] truncate ${isDark ? "text-slate-300" : "text-gray-600"}`}>
                      {entry.purpose}
                    </td>
                    <td className={`px-4 py-3 text-sm font-medium ${isDark ? "text-cyan-400" : "text-blue-600"}`}>
                      {formatCurrency(entry.reimbursementAmount)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          entry.status === "paid"
                            ? "bg-green-500/20 text-green-400"
                            : entry.status === "approved"
                            ? "bg-blue-500/20 text-blue-400"
                            : entry.status === "submitted"
                            ? "bg-purple-500/20 text-purple-400"
                            : "bg-amber-500/20 text-amber-400"
                        }`}
                      >
                        {entry.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right no-print">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(entry)}
                          className={`px-2 py-1 text-xs font-medium rounded ${
                            isDark
                              ? "bg-slate-700 text-slate-300 hover:bg-slate-600"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(entry._id)}
                          className="px-2 py-1 text-xs font-medium rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {(!entries || entries.length === 0) && (
                  <tr>
                    <td colSpan={9} className={`px-4 py-8 text-center ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                      No mileage entries found. Add your first entry to get started.
                    </td>
                  </tr>
                )}
              </tbody>
              {entries && entries.length > 0 && (
                <tfoot className={isDark ? "bg-slate-700" : "bg-gray-50"}>
                  <tr>
                    <td colSpan={3} className={`px-4 py-3 text-sm font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                      TOTALS
                    </td>
                    <td className={`px-4 py-3 text-sm font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                      {summary?.totalMiles?.toFixed(1)}
                    </td>
                    <td colSpan={2}></td>
                    <td className={`px-4 py-3 text-sm font-bold ${isDark ? "text-cyan-400" : "text-blue-600"}`}>
                      {formatCurrency(summary?.totalReimbursement || 0)}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Print Footer with Signatures */}
          <div className="hidden print:block print-footer">
            <div className="mt-6 p-4 border border-gray-300 bg-gray-50">
              <p className="text-xs text-gray-600 mb-2">
                <strong>EMPLOYEE CERTIFICATION:</strong> I certify that the above mileage was incurred in the performance
                of official business duties and that I have not been reimbursed from any other source.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-8 mt-8">
              <div>
                <div className="signature-line"></div>
                <p className="text-sm"><strong>Employee Signature</strong></p>
                <p className="text-xs text-gray-500 mt-1">Date: ________________</p>
              </div>
              <div>
                <div className="signature-line"></div>
                <p className="text-sm"><strong>Supervisor Approval</strong></p>
                <p className="text-xs text-gray-500 mt-1">Date: ________________</p>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-gray-300 text-xs text-gray-400 text-center">
              <p>Report Generated: {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
              <p className="mt-1">This document is for internal use only.</p>
            </div>
          </div>
        </div>

        {/* Add/Edit Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 no-print">
            <div className={`w-full max-w-lg rounded-xl border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
              <div className={`p-4 border-b ${isDark ? "border-slate-700" : "border-gray-200"}`}>
                <h2 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                  {editingEntry ? "Edit Mileage Entry" : "Add Mileage Entry"}
                </h2>
              </div>

              <div className="p-4 space-y-4">
                {/* Date */}
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                    Date *
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${isDark ? "bg-slate-900 border-slate-600 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                  />
                </div>

                {/* From Location */}
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                    From *
                  </label>
                  <input
                    type="text"
                    value={formData.fromLocation}
                    onChange={(e) => setFormData({ ...formData, fromLocation: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${isDark ? "bg-slate-900 border-slate-600 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                    placeholder="Latrobe, PA"
                  />
                </div>

                {/* To Location */}
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                    To *
                  </label>
                  <input
                    type="text"
                    value={formData.toLocation}
                    onChange={(e) => setFormData({ ...formData, toLocation: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${isDark ? "bg-slate-900 border-slate-600 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                    placeholder="Pittsburgh, PA"
                  />
                </div>

                {/* Miles and Round Trip */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                      Miles (one way) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.miles}
                      onChange={(e) => setFormData({ ...formData, miles: e.target.value })}
                      className={`w-full px-3 py-2 rounded-lg border ${isDark ? "bg-slate-900 border-slate-600 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                      placeholder="45.5"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isRoundTrip}
                        onChange={(e) => setFormData({ ...formData, isRoundTrip: e.target.checked })}
                        className="rounded"
                      />
                      <span className={isDark ? "text-white" : "text-gray-900"}>Round Trip</span>
                    </label>
                  </div>
                </div>

                {/* Calculated Reimbursement Preview */}
                {formData.miles && currentRate && (
                  <div className={`p-3 rounded-lg ${isDark ? "bg-cyan-500/10" : "bg-blue-50"}`}>
                    <p className={`text-sm ${isDark ? "text-cyan-400" : "text-blue-600"}`}>
                      Estimated Reimbursement:{" "}
                      <span className="font-bold">
                        {formatCurrency(
                          parseFloat(formData.miles) * (formData.isRoundTrip ? 2 : 1) * currentRate
                        )}
                      </span>
                      {formData.isRoundTrip && (
                        <span className="text-xs ml-2">
                          ({parseFloat(formData.miles) * 2} miles total)
                        </span>
                      )}
                    </p>
                  </div>
                )}

                {/* Purpose */}
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                    Business Purpose *
                  </label>
                  <input
                    type="text"
                    value={formData.purpose}
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${isDark ? "bg-slate-900 border-slate-600 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                    placeholder="Client meeting, site visit, etc."
                  />
                </div>

                {/* Vehicle */}
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                    Vehicle
                  </label>
                  <input
                    type="text"
                    value={formData.vehicle}
                    onChange={(e) => setFormData({ ...formData, vehicle: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${isDark ? "bg-slate-900 border-slate-600 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                    placeholder="2022 Ford F-150, Personal car, etc."
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    className={`w-full px-3 py-2 rounded-lg border resize-none ${isDark ? "bg-slate-900 border-slate-600 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                    placeholder="Additional notes..."
                  />
                </div>
              </div>

              <div className={`p-4 border-t flex gap-3 ${isDark ? "border-slate-700" : "border-gray-200"}`}>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingEntry(null);
                    resetForm();
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium ${isDark ? "bg-slate-700 text-white hover:bg-slate-600" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!formData.toLocation || !formData.miles || !formData.purpose}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium disabled:opacity-50 ${isDark ? "bg-cyan-500 text-white hover:bg-cyan-600" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                >
                  {editingEntry ? "Save Changes" : "Add Entry"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function MileagePage() {
  return (
    <Protected>
      <MileageContent />
    </Protected>
  );
}
