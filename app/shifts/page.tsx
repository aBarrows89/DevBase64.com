"use client";

import { useState, useMemo } from "react";
import Protected from "../protected";
import Sidebar from "@/components/Sidebar";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useTheme } from "../theme-context";
import { useAuth } from "../auth-context";

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

interface DepartmentShift {
  _id: Id<"shifts">;
  department: string;
  assignedPersonnel: Id<"personnel">[];
  assignedNames: string[];
  leadId?: Id<"personnel">;
  leadName?: string;
}

function ShiftsContent() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { user, canViewShifts, canEditShifts } = useAuth();

  const [selectedDate, setSelectedDate] = useState(() => formatDate(new Date()));
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentShift | null>(null);
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [draggedPerson, setDraggedPerson] = useState<{ personnelId: Id<"personnel">; name: string; fromDepartment: string; isLead?: boolean } | null>(null);

  // Default departments
  const DEFAULT_DEPARTMENTS = [
    "Shipping",
    "Receiving",
    "Inventory",
    "Purchases",
    "Janitorial",
  ];

  // Parse selected date
  const currentDate = useMemo(() => new Date(selectedDate + "T12:00:00"), [selectedDate]);
  const isToday = formatDate(new Date()) === selectedDate;

  // Queries
  const shifts = useQuery(api.shifts.listByDate, { date: selectedDate }) || [];
  const activePersonnel = useQuery(api.personnel.list, { status: "active" }) || [];

  // Get all personnel not yet assigned to any shift today
  const unassignedPersonnel = useMemo(() => {
    const assignedIds = new Set<string>();
    shifts.forEach(shift => {
      shift.assignedPersonnel.forEach(id => assignedIds.add(id));
    });
    return activePersonnel.filter(p => !assignedIds.has(p._id));
  }, [shifts, activePersonnel]);

  // Mutations
  const createShift = useMutation(api.shifts.create);
  const removeShift = useMutation(api.shifts.remove);
  const assignPersonnel = useMutation(api.shifts.assignPersonnel);
  const unassignPersonnel = useMutation(api.shifts.unassignPersonnel);
  const copyFromDate = useMutation(api.shifts.copyFromDate);
  const setLead = useMutation(api.shifts.setLead);
  const removeLead = useMutation(api.shifts.removeLead);

  // Navigate dates
  const goToPreviousDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(formatDate(newDate));
  };

  const goToNextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(formatDate(newDate));
  };

  const goToToday = () => {
    setSelectedDate(formatDate(new Date()));
  };

  // Handlers
  const handleCreateDepartment = async () => {
    if (!user || !newDepartmentName.trim()) return;
    await createShift({
      date: selectedDate,
      name: newDepartmentName.trim(),
      startTime: "00:00",
      endTime: "23:59",
      position: "Staff",
      department: newDepartmentName.trim(),
      requiredCount: 99,
      assignedPersonnel: [],
      createdBy: user._id as Id<"users">,
    });
    setShowCreateModal(false);
    setNewDepartmentName("");
  };

  const handleDeleteDepartment = async (shiftId: Id<"shifts">) => {
    if (confirm("Are you sure you want to delete this department for today?")) {
      await removeShift({ shiftId });
    }
  };

  const handleAssignPersonnel = async (personnelId: Id<"personnel">) => {
    if (!selectedDepartment) return;
    await assignPersonnel({
      shiftId: selectedDepartment._id,
      personnelId,
    });
  };

  const handleUnassignPersonnel = async (shiftId: Id<"shifts">, personnelId: Id<"personnel">) => {
    await unassignPersonnel({
      shiftId,
      personnelId,
    });
  };

  const handleCopyFromYesterday = async () => {
    if (!user) return;
    const yesterday = new Date(currentDate);
    yesterday.setDate(yesterday.getDate() - 1);

    await copyFromDate({
      sourceDate: formatDate(yesterday),
      targetDate: selectedDate,
      createdBy: user._id as Id<"users">,
    });
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, personnelId: Id<"personnel">, name: string, fromDepartment: string, isLead?: boolean) => {
    e.dataTransfer.setData("text/plain", personnelId);
    e.dataTransfer.effectAllowed = "move";
    setDraggedPerson({ personnelId, name, fromDepartment, isLead });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragEnd = () => {
    setDraggedPerson(null);
  };

  const handleDrop = async (targetShift: DepartmentShift) => {
    if (!draggedPerson) return;

    // If coming from another department, unassign first
    if (draggedPerson.fromDepartment !== "unassigned") {
      const sourceShift = shifts.find(s => s.department === draggedPerson.fromDepartment);
      if (sourceShift) {
        await unassignPersonnel({
          shiftId: sourceShift._id,
          personnelId: draggedPerson.personnelId,
        });
      }
    }

    // Assign to target department
    await assignPersonnel({
      shiftId: targetShift._id,
      personnelId: draggedPerson.personnelId,
    });

    setDraggedPerson(null);
  };

  // Drop on lead zone
  const handleDropLead = async (e: React.DragEvent, targetShift: DepartmentShift) => {
    e.preventDefault();
    e.stopPropagation();

    // Get personnel ID from dataTransfer as fallback
    const personnelIdFromTransfer = e.dataTransfer.getData("text/plain");
    const person = draggedPerson || (personnelIdFromTransfer ? {
      personnelId: personnelIdFromTransfer as Id<"personnel">,
      name: "",
      fromDepartment: "unassigned",
      isLead: false
    } : null);

    if (!person) return;

    // If dragging from lead position to this lead position
    if (person.isLead && person.fromDepartment !== "unassigned") {
      const sourceShift = shifts.find(s => s.department === person.fromDepartment);
      if (sourceShift) {
        await removeLead({ shiftId: sourceShift._id });
      }
    }

    // If coming from unassigned, need to assign them first
    if (person.fromDepartment === "unassigned") {
      await assignPersonnel({
        shiftId: targetShift._id,
        personnelId: person.personnelId,
      });
    } else if (person.fromDepartment !== targetShift.department && !person.isLead) {
      // Moving from another department's staff to lead position
      const sourceShift = shifts.find(s => s.department === person.fromDepartment);
      if (sourceShift) {
        await unassignPersonnel({
          shiftId: sourceShift._id,
          personnelId: person.personnelId,
        });
      }
      await assignPersonnel({
        shiftId: targetShift._id,
        personnelId: person.personnelId,
      });
    }

    // Set as lead
    await setLead({
      shiftId: targetShift._id,
      personnelId: person.personnelId,
    });

    setDraggedPerson(null);
  };

  // Handle remove lead
  const handleRemoveLead = async (shiftId: Id<"shifts">) => {
    await removeLead({ shiftId });
  };

  // Handle create default departments
  const handleCreateDefaultDepartments = async () => {
    if (!user) return;
    for (const dept of DEFAULT_DEPARTMENTS) {
      await createShift({
        date: selectedDate,
        name: dept,
        startTime: "00:00",
        endTime: "23:59",
        position: "Staff",
        department: dept,
        requiredCount: 99,
        assignedPersonnel: [],
        createdBy: user._id as Id<"users">,
      });
    }
  };

  const handlePrint = () => {
    setIsPrintMode(true);
    setTimeout(() => {
      window.print();
      setIsPrintMode(false);
    }, 100);
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

  // Print mode layout
  if (isPrintMode) {
    return (
      <div className="p-8 bg-white min-h-screen print:p-4">
        <style jsx global>{`
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .no-print { display: none !important; }
          }
        `}</style>
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Daily Shift Schedule</h1>
          <p className="text-lg text-gray-600">{formatDisplayDate(currentDate)}</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {shifts.map((shift) => (
            <div key={shift._id} className="border border-gray-300 rounded-lg p-4">
              <h3 className="font-bold text-lg border-b border-gray-300 pb-2 mb-3">
                {shift.name || shift.department || "Unnamed Department"}
              </h3>
              {shift.leadName && (
                <div className="mb-2 pb-2 border-b border-gray-200">
                  <span className="text-xs font-medium text-gray-500 uppercase">Lead:</span>
                  <p className="font-semibold text-gray-800">{shift.leadName}</p>
                </div>
              )}
              <ul className="space-y-1">
                {shift.assignedNames.map((name, idx) => (
                  <li key={idx} className="text-gray-700">
                    {name}
                  </li>
                ))}
                {shift.assignedNames.length === 0 && !shift.leadName && (
                  <li className="text-gray-400 italic">No staff assigned</li>
                )}
              </ul>
            </div>
          ))}
        </div>
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
                Drag staff between departments
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrint}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  isDark
                    ? "bg-slate-700 hover:bg-slate-600 text-white"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print
              </button>
              {canEditShifts && (
                <>
                  <button
                    onClick={handleCopyFromYesterday}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      isDark
                        ? "bg-slate-700 hover:bg-slate-600 text-white"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                    }`}
                  >
                    Copy Yesterday
                  </button>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      isDark
                        ? "bg-cyan-500 hover:bg-cyan-400 text-white"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                    }`}
                  >
                    + Add Department
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Date Navigation */}
          <div className="flex items-center gap-4 mt-4">
            <button
              onClick={goToPreviousDay}
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
                isToday
                  ? isDark
                    ? "bg-cyan-500 text-white"
                    : "bg-blue-600 text-white"
                  : isDark
                    ? "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                    : "bg-blue-50 text-blue-600 hover:bg-blue-100"
              }`}
            >
              Today
            </button>
            <button
              onClick={goToNextDay}
              className={`p-2 rounded-lg transition-colors ${
                isDark ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-100 text-gray-500"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className={`px-4 py-2 rounded-lg focus:outline-none ${
                isDark
                  ? "bg-slate-800 border border-slate-700 text-white"
                  : "bg-white border border-gray-200 text-gray-900"
              }`}
            />

            <span className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
              {formatDisplayDate(currentDate)}
            </span>

            {isToday && (
              <span className={`px-2 py-1 text-xs rounded-full ${isDark ? "bg-cyan-500/20 text-cyan-400" : "bg-blue-100 text-blue-600"}`}>
                Today
              </span>
            )}
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="flex gap-6 h-full">
            {/* Department Columns */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-min">
              {shifts.map((shift) => (
                <div
                  key={shift._id}
                  className={`rounded-xl border min-h-[200px] ${
                    isDark
                      ? "bg-slate-800/50 border-slate-700"
                      : "bg-white border-gray-200 shadow-sm"
                  } ${draggedPerson ? "ring-2 ring-dashed ring-cyan-400/50" : ""}`}
                >
                  {/* Department Header */}
                  <div className={`flex items-center justify-between p-4 border-b ${isDark ? "border-slate-700" : "border-gray-200"}`}>
                    <h3 className={`font-semibold text-lg ${isDark ? "text-white" : "text-gray-900"}`}>
                      {shift.department}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                        {shift.assignedPersonnel.length}
                      </span>
                      {canEditShifts && (
                        <button
                          onClick={() => handleDeleteDepartment(shift._id)}
                          className={`p-1 rounded hover:bg-red-500/20 ${isDark ? "text-slate-500 hover:text-red-400" : "text-gray-400 hover:text-red-500"}`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Department Lead Section */}
                  <div
                    className={`p-3 border-b ${isDark ? "border-slate-700" : "border-gray-200"}`}
                  >
                    <div className={`flex items-center gap-2 mb-2`}>
                      <svg className={`w-4 h-4 ${isDark ? "text-amber-400" : "text-amber-500"}`} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                      <span className={`text-xs font-medium ${isDark ? "text-amber-400" : "text-amber-600"}`}>
                        Department Lead
                      </span>
                    </div>
                    {shift.leadId && shift.leadName ? (
                      <div
                        draggable={canEditShifts}
                        onDragStart={(e) => handleDragStart(e, shift.leadId!, shift.leadName!, shift.department, true)}
                        onDragEnd={handleDragEnd}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDropLead(e, shift)}
                        className={`flex items-center justify-between p-2 rounded-lg ${
                          isDark
                            ? "bg-amber-500/10 border border-amber-500/30"
                            : "bg-amber-50 border border-amber-200"
                        }`}
                      >
                        <span className={`font-medium ${isDark ? "text-amber-300" : "text-amber-700"}`}>
                          {shift.leadName}
                        </span>
                        {canEditShifts && (
                          <button
                            onClick={() => handleRemoveLead(shift._id)}
                            className={`p-1 rounded hover:bg-red-500/20 ${isDark ? "text-amber-400 hover:text-red-400" : "text-amber-500 hover:text-red-500"}`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ) : (
                      <div
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDropLead(e, shift)}
                        className={`p-4 rounded-lg border-2 border-dashed text-center min-h-[50px] flex items-center justify-center ${
                        isDark
                          ? "border-slate-600 text-slate-500"
                          : "border-gray-300 text-gray-400"
                      } ${draggedPerson ? "ring-2 ring-amber-400/50 bg-amber-500/10 border-amber-400" : ""}`}>
                        <span className="text-sm">Drop to set as lead</span>
                      </div>
                    )}
                  </div>

                  {/* Personnel List */}
                  <div
                    onDragOver={handleDragOver}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDrop(shift);
                    }}
                    className="p-3 space-y-2 min-h-[60px]"
                  >
                    {shift.assignedNames.map((name, idx) => (
                      <div
                        key={shift.assignedPersonnel[idx]}
                        draggable={canEditShifts}
                        onDragStart={(e) => handleDragStart(e, shift.assignedPersonnel[idx], name, shift.department)}
                        onDragEnd={handleDragEnd}
                        className={`flex items-center justify-between p-3 rounded-lg cursor-move transition-colors ${
                          isDark
                            ? "bg-slate-700/50 hover:bg-slate-700"
                            : "bg-gray-50 hover:bg-gray-100"
                        }`}
                      >
                        <span className={isDark ? "text-white" : "text-gray-900"}>{name}</span>
                        {canEditShifts && (
                          <button
                            onClick={() => handleUnassignPersonnel(shift._id, shift.assignedPersonnel[idx])}
                            className={`p-1 rounded hover:bg-red-500/20 ${isDark ? "text-slate-500 hover:text-red-400" : "text-gray-400 hover:text-red-500"}`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                    {shift.assignedNames.length === 0 && (
                      <div className={`text-center py-8 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                        <p className="text-sm">Drop staff here</p>
                      </div>
                    )}
                  </div>

                  {/* Add Personnel Button */}
                  {canEditShifts && (
                    <div className={`p-3 border-t ${isDark ? "border-slate-700" : "border-gray-200"}`}>
                      <button
                        onClick={() => {
                          setSelectedDepartment(shift);
                          setShowAssignModal(true);
                        }}
                        className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                          isDark
                            ? "bg-slate-700/50 hover:bg-slate-700 text-slate-400 hover:text-white"
                            : "bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        + Add Staff
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {shifts.length === 0 && (
                <div className={`col-span-full text-center py-16 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                  <svg
                    className="w-16 h-16 mx-auto mb-4 opacity-50"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                  <h3 className={`text-lg font-medium mb-2 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    No departments for today
                  </h3>
                  <p className="text-sm mb-4">Add a department to start assigning staff</p>
                  {canEditShifts && (
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <button
                        onClick={handleCreateDefaultDepartments}
                        className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                          isDark
                            ? "bg-cyan-500 hover:bg-cyan-400 text-white"
                            : "bg-blue-600 hover:bg-blue-700 text-white"
                        }`}
                      >
                        Create Default Departments
                      </button>
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                          isDark
                            ? "bg-slate-700 hover:bg-slate-600 text-white"
                            : "bg-gray-200 hover:bg-gray-300 text-gray-900"
                        }`}
                      >
                        + Add Custom Department
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Unassigned Personnel Panel */}
            <div className={`w-64 flex-shrink-0 rounded-xl border ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm"}`}>
              <div className={`p-4 border-b ${isDark ? "border-slate-700" : "border-gray-200"}`}>
                <h3 className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                  Unassigned Staff
                </h3>
                <p className={`text-xs mt-1 ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                  {unassignedPersonnel.length} available
                </p>
              </div>
              <div className="p-3 space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
                {unassignedPersonnel.map((person) => (
                  <div
                    key={person._id}
                    draggable={canEditShifts}
                    onDragStart={(e) => handleDragStart(e, person._id, `${person.firstName} ${person.lastName}`, "unassigned")}
                    onDragEnd={handleDragEnd}
                    className={`p-3 rounded-lg cursor-move transition-colors ${
                      isDark
                        ? "bg-slate-700/50 hover:bg-slate-700"
                        : "bg-gray-50 hover:bg-gray-100"
                    }`}
                  >
                    <div className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                      {person.firstName} {person.lastName}
                    </div>
                    <div className={`text-xs ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                      {person.department}
                    </div>
                  </div>
                ))}
                {unassignedPersonnel.length === 0 && (
                  <div className={`text-center py-8 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                    <p className="text-sm">All staff assigned</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Create Department Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className={`w-full max-w-md rounded-xl p-6 ${isDark ? "bg-slate-800 border border-slate-700" : "bg-white border border-gray-200 shadow-xl"}`}>
              <h2 className={`text-lg font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
                Add Department for {formatDisplayDate(currentDate)}
              </h2>
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                  Department Name
                </label>
                <input
                  type="text"
                  value={newDepartmentName}
                  onChange={(e) => setNewDepartmentName(e.target.value)}
                  placeholder="e.g., Warehouse, Shipping, Office"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleCreateDepartment()}
                  className={`w-full px-4 py-3 rounded-lg ${isDark ? "bg-slate-700 border-slate-600 text-white placeholder-slate-500" : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400"} border focus:outline-none focus:ring-2 focus:ring-cyan-500`}
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewDepartmentName("");
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${isDark ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-900"}`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateDepartment}
                  disabled={!newDepartmentName.trim()}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${isDark ? "bg-cyan-500 hover:bg-cyan-400 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
                >
                  Add Department
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Assign Personnel Modal */}
        {showAssignModal && selectedDepartment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className={`w-full max-w-md rounded-xl p-6 ${isDark ? "bg-slate-800 border border-slate-700" : "bg-white border border-gray-200 shadow-xl"}`}>
              <h2 className={`text-lg font-semibold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                Add Staff to {selectedDepartment.department}
              </h2>
              <p className={`text-sm mb-4 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                Select staff members to assign
              </p>

              <div className="space-y-2 max-h-80 overflow-y-auto">
                {unassignedPersonnel.length > 0 ? (
                  unassignedPersonnel.map((person) => (
                    <button
                      key={person._id}
                      onClick={() => handleAssignPersonnel(person._id)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                        isDark
                          ? "bg-slate-700/50 hover:bg-slate-700 text-white"
                          : "bg-gray-50 hover:bg-gray-100 text-gray-900"
                      }`}
                    >
                      <div className="text-left">
                        <div className="font-medium">{person.firstName} {person.lastName}</div>
                        <div className={`text-xs ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                          {person.department} - {person.position}
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </button>
                  ))
                ) : (
                  <p className={`text-sm text-center py-8 ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                    All staff have been assigned
                  </p>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedDepartment(null);
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${isDark ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-900"}`}
                >
                  Done
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
