"use client";

import { useState, useMemo } from "react";
import Protected from "../protected";
import Sidebar from "@/components/Sidebar";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useTheme } from "../theme-context";
import { useAuth } from "../auth-context";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function getWeekDates(currentDate: Date): Date[] {
  const dates: Date[] = [];
  const start = new Date(currentDate);
  start.setDate(start.getDate() - start.getDay()); // Start of week (Sunday)

  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    dates.push(date);
  }
  return dates;
}

interface ShiftCardProps {
  shift: {
    _id: Id<"shifts">;
    name?: string;
    startTime: string;
    endTime: string;
    position: string;
    department: string;
    requiredCount: number;
    assignedNames: string[];
    assignedPersonnel: Id<"personnel">[];
  };
  isDark: boolean;
  canEdit: boolean;
  onDelete: (id: Id<"shifts">) => void;
  onAssign: (shift: ShiftCardProps["shift"]) => void;
}

function ShiftCard({ shift, isDark, canEdit, onDelete, onAssign }: ShiftCardProps) {
  const isFilled = shift.assignedPersonnel.length >= shift.requiredCount;
  const isPartial = shift.assignedPersonnel.length > 0 && shift.assignedPersonnel.length < shift.requiredCount;

  return (
    <div
      className={`p-3 rounded-lg border mb-2 ${
        isFilled
          ? isDark
            ? "bg-green-500/10 border-green-500/30"
            : "bg-green-50 border-green-200"
          : isPartial
            ? isDark
              ? "bg-amber-500/10 border-amber-500/30"
              : "bg-amber-50 border-amber-200"
            : isDark
              ? "bg-red-500/10 border-red-500/30"
              : "bg-red-50 border-red-200"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-gray-500"}`}>
            {shift.startTime} - {shift.endTime}
          </div>
          <div className={`font-medium truncate ${isDark ? "text-white" : "text-gray-900"}`}>
            {shift.name || shift.position}
          </div>
          <div className={`text-xs ${isDark ? "text-slate-500" : "text-gray-500"}`}>
            {shift.department}
          </div>
        </div>
        {canEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(shift._id);
            }}
            className={`p-1 rounded hover:bg-red-500/20 ${isDark ? "text-slate-500 hover:text-red-400" : "text-gray-400 hover:text-red-500"}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Assigned Personnel */}
      <div className="mt-2">
        <div className={`text-xs font-medium mb-1 ${isDark ? "text-slate-500" : "text-gray-500"}`}>
          Assigned ({shift.assignedPersonnel.length}/{shift.requiredCount}):
        </div>
        {shift.assignedNames.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {shift.assignedNames.map((name, idx) => (
              <span
                key={idx}
                className={`px-2 py-0.5 text-xs rounded ${
                  isDark
                    ? "bg-slate-700 text-slate-300"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {name}
              </span>
            ))}
          </div>
        ) : (
          <span className={`text-xs italic ${isDark ? "text-slate-500" : "text-gray-400"}`}>
            No one assigned
          </span>
        )}
      </div>

      {/* Assign Button */}
      {canEdit && (
        <button
          onClick={() => onAssign(shift)}
          className={`mt-2 w-full px-2 py-1 text-xs rounded font-medium transition-colors ${
            isDark
              ? "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
              : "bg-blue-50 text-blue-600 hover:bg-blue-100"
          }`}
        >
          {shift.assignedPersonnel.length < shift.requiredCount ? "Assign Staff" : "Manage"}
        </button>
      )}
    </div>
  );
}

function ShiftsContent() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { user, canViewShifts, canEditShifts } = useAuth();

  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    today.setDate(today.getDate() - today.getDay());
    return today;
  });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedShift, setSelectedShift] = useState<ShiftCardProps["shift"] | null>(null);
  const [filterDepartment, setFilterDepartment] = useState<string>("all");

  const weekDates = useMemo(() => getWeekDates(currentWeekStart), [currentWeekStart]);
  const startDate = formatDate(weekDates[0]);
  const endDate = formatDate(weekDates[6]);

  // Queries
  const shifts = useQuery(api.shifts.listByDateRange, {
    startDate,
    endDate,
    department: filterDepartment === "all" ? undefined : filterDepartment,
  }) || [];

  const departments = useQuery(api.personnel.getDepartments) || [];
  const activePersonnel = useQuery(api.personnel.list, { status: "active" }) || [];

  const availablePersonnel = useQuery(
    api.shifts.getAvailablePersonnel,
    selectedShift
      ? {
          date: selectedDate,
          startTime: selectedShift.startTime,
          endTime: selectedShift.endTime,
          department: selectedShift.department,
          excludeShiftId: selectedShift._id,
        }
      : "skip"
  );

  // Mutations
  const createShift = useMutation(api.shifts.create);
  const removeShift = useMutation(api.shifts.remove);
  const assignPersonnel = useMutation(api.shifts.assignPersonnel);
  const unassignPersonnel = useMutation(api.shifts.unassignPersonnel);
  const copyFromDate = useMutation(api.shifts.copyFromDate);

  // Form state
  const [shiftForm, setShiftForm] = useState({
    name: "",
    startTime: "09:00",
    endTime: "17:00",
    position: "",
    department: "",
    requiredCount: 1,
    notes: "",
  });

  // Group shifts by date
  const shiftsByDate = useMemo(() => {
    const grouped: Record<string, typeof shifts> = {};
    for (const date of weekDates) {
      grouped[formatDate(date)] = [];
    }
    for (const shift of shifts) {
      if (grouped[shift.date]) {
        grouped[shift.date].push(shift);
      }
    }
    return grouped;
  }, [shifts, weekDates]);

  // Navigate weeks
  const goToPreviousWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() - 7);
    setCurrentWeekStart(newStart);
  };

  const goToNextWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() + 7);
    setCurrentWeekStart(newStart);
  };

  const goToToday = () => {
    const today = new Date();
    today.setDate(today.getDate() - today.getDay());
    setCurrentWeekStart(today);
  };

  // Handlers
  const handleCreateShift = async () => {
    if (!user || !shiftForm.position || !shiftForm.department || !selectedDate) return;
    await createShift({
      date: selectedDate,
      name: shiftForm.name || undefined,
      startTime: shiftForm.startTime,
      endTime: shiftForm.endTime,
      position: shiftForm.position,
      department: shiftForm.department,
      requiredCount: shiftForm.requiredCount,
      assignedPersonnel: [],
      notes: shiftForm.notes || undefined,
      createdBy: user._id as Id<"users">,
    });
    setShowCreateModal(false);
    setShiftForm({
      name: "",
      startTime: "09:00",
      endTime: "17:00",
      position: "",
      department: "",
      requiredCount: 1,
      notes: "",
    });
  };

  const handleDeleteShift = async (shiftId: Id<"shifts">) => {
    if (confirm("Are you sure you want to delete this shift?")) {
      await removeShift({ shiftId });
    }
  };

  const handleAssignPersonnel = async (personnelId: Id<"personnel">) => {
    if (!selectedShift) return;
    await assignPersonnel({
      shiftId: selectedShift._id,
      personnelId,
    });
    // Refresh shift data
    setSelectedShift(null);
    setShowAssignModal(false);
  };

  const handleUnassignPersonnel = async (personnelId: Id<"personnel">) => {
    if (!selectedShift) return;
    await unassignPersonnel({
      shiftId: selectedShift._id,
      personnelId,
    });
  };

  const handleCopyFromPreviousWeek = async () => {
    if (!user) return;
    const prevWeekStart = new Date(currentWeekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);

    for (let i = 0; i < 7; i++) {
      const sourceDate = new Date(prevWeekStart);
      sourceDate.setDate(prevWeekStart.getDate() + i);
      const targetDate = new Date(currentWeekStart);
      targetDate.setDate(currentWeekStart.getDate() + i);

      await copyFromDate({
        sourceDate: formatDate(sourceDate),
        targetDate: formatDate(targetDate),
        createdBy: user._id as Id<"users">,
      });
    }
  };

  const openCreateModal = (date: string) => {
    setSelectedDate(date);
    setShowCreateModal(true);
  };

  const openAssignModal = (shift: ShiftCardProps["shift"], date: string) => {
    setSelectedShift(shift);
    setSelectedDate(date);
    setShowAssignModal(true);
  };

  // Permission check
  if (!canViewShifts) {
    return (
      <div className={`flex h-screen ${isDark ? "bg-slate-900" : "bg-[#f2f2f7]"}`}>
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
              Access Denied
            </h1>
            <p className={`mt-2 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
              You don&apos;t have permission to view shift planning.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={`flex h-screen ${isDark ? "bg-slate-900" : "bg-[#f2f2f7]"}`}>
      <Sidebar />

      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Header */}
        <header className={`flex-shrink-0 border-b px-8 py-4 ${isDark ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200"}`}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                Shift Planning
              </h1>
              <p className={`text-sm mt-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                Whiteboard-style shift schedule
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* Department Filter */}
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className={`px-4 py-2 rounded-lg focus:outline-none ${
                  isDark
                    ? "bg-slate-800 border border-slate-700 text-white"
                    : "bg-white border border-gray-200 text-gray-900"
                }`}
              >
                <option value="all">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>

              {canEditShifts && (
                <button
                  onClick={handleCopyFromPreviousWeek}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    isDark
                      ? "bg-slate-700 hover:bg-slate-600 text-white"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                  }`}
                >
                  Copy Previous Week
                </button>
              )}
            </div>
          </div>

          {/* Week Navigation */}
          <div className="flex items-center gap-4 mt-4">
            <button
              onClick={goToPreviousWeek}
              className={`p-2 rounded-lg transition-colors ${
                isDark ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-100 text-gray-500"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={goToToday}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isDark
                  ? "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                  : "bg-blue-50 text-blue-600 hover:bg-blue-100"
              }`}
            >
              Today
            </button>
            <button
              onClick={goToNextWeek}
              className={`p-2 rounded-lg transition-colors ${
                isDark ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-100 text-gray-500"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <span className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
              {weekDates[0].toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </span>
          </div>
        </header>

        {/* Whiteboard Grid */}
        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-7 gap-4 min-w-[1200px]">
            {weekDates.map((date, idx) => {
              const dateStr = formatDate(date);
              const dayShifts = shiftsByDate[dateStr] || [];
              const isToday = formatDate(new Date()) === dateStr;

              return (
                <div
                  key={dateStr}
                  className={`rounded-xl flex flex-col ${
                    isDark
                      ? isToday
                        ? "bg-cyan-500/10 border-2 border-cyan-500/30"
                        : "bg-slate-800/50 border border-slate-700"
                      : isToday
                        ? "bg-blue-50 border-2 border-blue-200"
                        : "bg-white border border-gray-200 shadow-sm"
                  }`}
                >
                  {/* Day Header */}
                  <div
                    className={`p-3 border-b text-center ${
                      isDark ? "border-slate-700" : "border-gray-200"
                    }`}
                  >
                    <div className={`text-xs font-medium ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                      {DAYS_OF_WEEK[idx]}
                    </div>
                    <div
                      className={`text-xl font-bold ${
                        isToday
                          ? isDark
                            ? "text-cyan-400"
                            : "text-blue-600"
                          : isDark
                            ? "text-white"
                            : "text-gray-900"
                      }`}
                    >
                      {date.getDate()}
                    </div>
                  </div>

                  {/* Shifts */}
                  <div className="flex-1 p-3 min-h-[300px] overflow-y-auto">
                    {dayShifts.map((shift) => (
                      <ShiftCard
                        key={shift._id}
                        shift={shift}
                        isDark={isDark}
                        canEdit={canEditShifts}
                        onDelete={handleDeleteShift}
                        onAssign={(s) => openAssignModal(s, dateStr)}
                      />
                    ))}

                    {dayShifts.length === 0 && (
                      <div className={`text-center py-8 ${isDark ? "text-slate-600" : "text-gray-400"}`}>
                        <svg
                          className="w-8 h-8 mx-auto mb-2 opacity-50"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <p className="text-xs">No shifts</p>
                      </div>
                    )}
                  </div>

                  {/* Add Shift Button */}
                  {canEditShifts && (
                    <div className={`p-3 border-t ${isDark ? "border-slate-700" : "border-gray-200"}`}>
                      <button
                        onClick={() => openCreateModal(dateStr)}
                        className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                          isDark
                            ? "bg-slate-700/50 hover:bg-slate-700 text-slate-400 hover:text-white"
                            : "bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        + Add Shift
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Create Shift Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className={`w-full max-w-md rounded-xl p-6 ${isDark ? "bg-slate-800" : "bg-white"}`}>
              <h2 className={`text-lg font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
                Create Shift for {new Date(selectedDate).toLocaleDateString()}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    Shift Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={shiftForm.name}
                    onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })}
                    placeholder="e.g., Morning Rush"
                    className={`w-full px-4 py-2 rounded-lg ${isDark ? "bg-slate-700 border-slate-600 text-white placeholder-slate-500" : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400"} border focus:outline-none`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={shiftForm.startTime}
                      onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                      className={`w-full px-4 py-2 rounded-lg ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-gray-50 border-gray-200 text-gray-900"} border focus:outline-none`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                      End Time
                    </label>
                    <input
                      type="time"
                      value={shiftForm.endTime}
                      onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                      className={`w-full px-4 py-2 rounded-lg ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-gray-50 border-gray-200 text-gray-900"} border focus:outline-none`}
                    />
                  </div>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    Position
                  </label>
                  <input
                    type="text"
                    value={shiftForm.position}
                    onChange={(e) => setShiftForm({ ...shiftForm, position: e.target.value })}
                    placeholder="e.g., Warehouse Associate"
                    className={`w-full px-4 py-2 rounded-lg ${isDark ? "bg-slate-700 border-slate-600 text-white placeholder-slate-500" : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400"} border focus:outline-none`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    Department
                  </label>
                  <select
                    value={shiftForm.department}
                    onChange={(e) => setShiftForm({ ...shiftForm, department: e.target.value })}
                    className={`w-full px-4 py-2 rounded-lg ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-gray-50 border-gray-200 text-gray-900"} border focus:outline-none`}
                  >
                    <option value="">Select department...</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                    <option value="Warehouse">Warehouse</option>
                    <option value="Shipping">Shipping</option>
                    <option value="Receiving">Receiving</option>
                    <option value="Office">Office</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    Required Staff
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={shiftForm.requiredCount}
                    onChange={(e) => setShiftForm({ ...shiftForm, requiredCount: parseInt(e.target.value) || 1 })}
                    className={`w-full px-4 py-2 rounded-lg ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-gray-50 border-gray-200 text-gray-900"} border focus:outline-none`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    Notes (Optional)
                  </label>
                  <textarea
                    value={shiftForm.notes}
                    onChange={(e) => setShiftForm({ ...shiftForm, notes: e.target.value })}
                    placeholder="Any additional notes..."
                    rows={2}
                    className={`w-full px-4 py-2 rounded-lg ${isDark ? "bg-slate-700 border-slate-600 text-white placeholder-slate-500" : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400"} border focus:outline-none`}
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${isDark ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-900"}`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateShift}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${isDark ? "bg-cyan-500 hover:bg-cyan-400 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
                >
                  Create Shift
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Assign Personnel Modal */}
        {showAssignModal && selectedShift && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className={`w-full max-w-md rounded-xl p-6 ${isDark ? "bg-slate-800" : "bg-white"}`}>
              <h2 className={`text-lg font-semibold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                Assign Staff to Shift
              </h2>
              <p className={`text-sm mb-4 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                {selectedShift.name || selectedShift.position} ({selectedShift.startTime} - {selectedShift.endTime})
              </p>

              {/* Currently Assigned */}
              {selectedShift.assignedPersonnel.length > 0 && (
                <div className="mb-4">
                  <h3 className={`text-sm font-medium mb-2 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    Currently Assigned:
                  </h3>
                  <div className="space-y-2">
                    {selectedShift.assignedNames.map((name, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center justify-between p-2 rounded-lg ${isDark ? "bg-slate-700" : "bg-gray-100"}`}
                      >
                        <span className={isDark ? "text-white" : "text-gray-900"}>{name}</span>
                        <button
                          onClick={() => handleUnassignPersonnel(selectedShift.assignedPersonnel[idx])}
                          className={`text-xs px-2 py-1 rounded ${isDark ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : "bg-red-50 text-red-600 hover:bg-red-100"}`}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Available Personnel */}
              <div>
                <h3 className={`text-sm font-medium mb-2 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                  Available Staff:
                </h3>
                {availablePersonnel && availablePersonnel.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {availablePersonnel.map((person) => (
                      <button
                        key={person._id}
                        onClick={() => handleAssignPersonnel(person._id)}
                        className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                          isDark
                            ? "bg-slate-700/50 hover:bg-slate-700 text-white"
                            : "bg-gray-50 hover:bg-gray-100 text-gray-900"
                        }`}
                      >
                        <div>
                          <div className="font-medium">{person.name}</div>
                          <div className={`text-xs ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                            {person.position} • {person.department}
                          </div>
                        </div>
                        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className={`text-sm text-center py-4 ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                    No available staff for this time slot
                  </p>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedShift(null);
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${isDark ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-900"}`}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function ShiftsPage() {
  return (
    <Protected>
      <ShiftsContent />
    </Protected>
  );
}
