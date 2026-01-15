"use client";

import { useState } from "react";
import Protected from "@/app/protected";
import Sidebar from "@/components/Sidebar";
import { useTheme } from "@/app/theme-context";
import { useAuth } from "@/app/auth-context";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface Holiday {
  _id: Id<"holidays">;
  name: string;
  date: string;
  type: string;
  isPaidHoliday: boolean;
  affectedLocations?: Id<"locations">[];
  affectedDepartments?: string[];
  isRecurring?: boolean;
  notes?: string;
  createdAt: number;
}

function HolidaysContent() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { user } = useAuth();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    date: "",
    type: "holiday",
    isPaidHoliday: true,
    isRecurring: false,
    notes: "",
  });

  const holidays = useQuery(api.holidays.listByYear, { year: selectedYear }) as Holiday[] | undefined;
  const locations = useQuery(api.locations.list);
  const createHoliday = useMutation(api.holidays.create);
  const updateHoliday = useMutation(api.holidays.update);
  const deleteHoliday = useMutation(api.holidays.remove);
  const createStandardHolidays = useMutation(api.holidays.createStandardHolidays);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (editingHoliday) {
      await updateHoliday({
        holidayId: editingHoliday._id,
        name: formData.name,
        date: formData.date,
        type: formData.type,
        isPaidHoliday: formData.isPaidHoliday,
        isRecurring: formData.isRecurring,
        notes: formData.notes || undefined,
      });
    } else {
      await createHoliday({
        name: formData.name,
        date: formData.date,
        type: formData.type,
        isPaidHoliday: formData.isPaidHoliday,
        isRecurring: formData.isRecurring,
        notes: formData.notes || undefined,
        createdBy: user._id,
      });
    }

    setShowAddModal(false);
    setEditingHoliday(null);
    setFormData({
      name: "",
      date: "",
      type: "holiday",
      isPaidHoliday: true,
      isRecurring: false,
      notes: "",
    });
  };

  const handleEdit = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    setFormData({
      name: holiday.name,
      date: holiday.date,
      type: holiday.type,
      isPaidHoliday: holiday.isPaidHoliday,
      isRecurring: holiday.isRecurring || false,
      notes: holiday.notes || "",
    });
    setShowAddModal(true);
  };

  const handleDelete = async (holidayId: Id<"holidays">) => {
    if (confirm("Are you sure you want to delete this holiday?")) {
      await deleteHoliday({ holidayId });
    }
  };

  const handleAddStandardHolidays = async () => {
    if (!user) return;
    if (confirm(`Add standard US holidays for ${selectedYear}? Existing holidays on the same dates will be skipped.`)) {
      await createStandardHolidays({ year: selectedYear, createdBy: user._id });
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T12:00:00");
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "holiday":
        return isDark ? "bg-green-500/20 text-green-400" : "bg-green-100 text-green-700";
      case "closure":
        return isDark ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-700";
      case "override":
        return isDark ? "bg-amber-500/20 text-amber-400" : "bg-amber-100 text-amber-700";
      default:
        return isDark ? "bg-slate-500/20 text-slate-400" : "bg-slate-100 text-slate-600";
    }
  };

  return (
    <div className={`flex min-h-screen ${isDark ? "bg-slate-900" : "bg-gray-50"}`}>
      <Sidebar />

      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                Holidays & Schedule Overrides
              </h1>
              <p className={`mt-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                Manage company holidays to prevent false no-call-no-show triggers
              </p>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className={`px-3 py-2 rounded-lg border ${
                  isDark
                    ? "bg-slate-800 border-slate-700 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              >
                {[currentYear - 1, currentYear, currentYear + 1].map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>

              <button
                onClick={handleAddStandardHolidays}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  isDark
                    ? "bg-slate-700 text-white hover:bg-slate-600"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                + Add US Holidays
              </button>

              <button
                onClick={() => {
                  setEditingHoliday(null);
                  setFormData({
                    name: "",
                    date: `${selectedYear}-01-01`,
                    type: "holiday",
                    isPaidHoliday: true,
                    isRecurring: false,
                    notes: "",
                  });
                  setShowAddModal(true);
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  isDark
                    ? "bg-cyan-500 text-white hover:bg-cyan-600"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                + Add Custom
              </button>
            </div>
          </div>

          {/* Holiday List */}
          <div className={`rounded-xl border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
            {!holidays || holidays.length === 0 ? (
              <div className="p-8 text-center">
                <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${isDark ? "bg-slate-700" : "bg-gray-100"}`}>
                  <svg className={`w-8 h-8 ${isDark ? "text-slate-500" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className={`text-lg font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                  No holidays for {selectedYear}
                </h3>
                <p className={`mt-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                  Add standard US holidays or create custom ones
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-700">
                {holidays.map((holiday) => (
                  <div
                    key={holiday._id}
                    className={`p-4 flex items-center justify-between ${isDark ? "hover:bg-slate-700/50" : "hover:bg-gray-50"}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isDark ? "bg-slate-700" : "bg-gray-100"}`}>
                        <span className="text-xl">
                          {holiday.type === "holiday" ? "🎉" : holiday.type === "closure" ? "🚫" : "📅"}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                            {holiday.name}
                          </h3>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(holiday.type)}`}>
                            {holiday.type}
                          </span>
                          {holiday.isPaidHoliday && (
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${isDark ? "bg-purple-500/20 text-purple-400" : "bg-purple-100 text-purple-700"}`}>
                              Paid
                            </span>
                          )}
                          {holiday.isRecurring && (
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${isDark ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-700"}`}>
                              Recurring
                            </span>
                          )}
                        </div>
                        <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                          {formatDate(holiday.date)}
                          {holiday.notes && ` - ${holiday.notes}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(holiday)}
                        className={`p-2 rounded-lg transition-colors ${isDark ? "hover:bg-slate-600" : "hover:bg-gray-200"}`}
                      >
                        <svg className={`w-4 h-4 ${isDark ? "text-slate-400" : "text-gray-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(holiday._id)}
                        className={`p-2 rounded-lg transition-colors ${isDark ? "hover:bg-red-500/20 text-red-400" : "hover:bg-red-100 text-red-600"}`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className={`mt-6 p-4 rounded-xl border ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-blue-50 border-blue-200"}`}>
            <div className="flex gap-3">
              <svg className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isDark ? "text-cyan-400" : "text-blue-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className={`font-medium ${isDark ? "text-white" : "text-blue-900"}`}>How holidays work</h4>
                <ul className={`mt-1 text-sm space-y-1 ${isDark ? "text-slate-400" : "text-blue-700"}`}>
                  <li>- Holidays prevent automatic No-Call-No-Show detection</li>
                  <li>- Employees won&apos;t be flagged as missing on holiday dates</li>
                  <li>- You can restrict holidays to specific locations or departments</li>
                  <li>- Recurring holidays will be auto-created for future years</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md rounded-xl border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
            <div className={`p-4 border-b ${isDark ? "border-slate-700" : "border-gray-200"}`}>
              <h2 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                {editingHoliday ? "Edit Holiday" : "Add Holiday"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Christmas Day"
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDark
                      ? "bg-slate-900 border-slate-600 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                  Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDark
                      ? "bg-slate-900 border-slate-600 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                  Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDark
                      ? "bg-slate-900 border-slate-600 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                >
                  <option value="holiday">Holiday</option>
                  <option value="closure">Office Closure</option>
                  <option value="override">Schedule Override</option>
                </select>
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isPaidHoliday}
                    onChange={(e) => setFormData({ ...formData, isPaidHoliday: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-600"
                  />
                  <span className={`text-sm ${isDark ? "text-slate-300" : "text-gray-700"}`}>Paid Holiday</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isRecurring}
                    onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-600"
                  />
                  <span className={`text-sm ${isDark ? "text-slate-300" : "text-gray-700"}`}>Recurring Annually</span>
                </label>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional notes..."
                  rows={2}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDark
                      ? "bg-slate-900 border-slate-600 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingHoliday(null);
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium ${
                    isDark
                      ? "bg-slate-700 text-white hover:bg-slate-600"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`flex-1 px-4 py-2 rounded-lg font-medium ${
                    isDark
                      ? "bg-cyan-500 text-white hover:bg-cyan-600"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {editingHoliday ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HolidaysPage() {
  return (
    <Protected>
      <HolidaysContent />
    </Protected>
  );
}
