"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Protected from "../../protected";
import Sidebar from "@/components/Sidebar";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useTheme } from "../../theme-context";
import { useAuth } from "../../auth-context";

const STATUS_OPTIONS = [
  { value: "active", label: "Active", color: "green" },
  { value: "on_leave", label: "On Leave", color: "amber" },
  { value: "terminated", label: "Terminated", color: "red" },
];

const statusColors: Record<string, string> = {
  active: "bg-green-500/20 text-green-400 border-green-500/30",
  on_leave: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  terminated: "bg-red-500/20 text-red-400 border-red-500/30",
};

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "writeups", label: "Write-Ups" },
  { id: "attendance", label: "Attendance" },
  { id: "merits", label: "Merits" },
];

// Write-up severity colors
const severityColors: Record<string, string> = {
  verbal: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  written: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  final: "bg-red-500/20 text-red-400 border-red-500/30",
  termination: "bg-red-700/20 text-red-500 border-red-700/30",
};

// Attendance status colors
const attendanceStatusColors: Record<string, string> = {
  present: "bg-green-500/20 text-green-400 border-green-500/30",
  absent: "bg-red-500/20 text-red-400 border-red-500/30",
  late: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  excused: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  no_call_no_show: "bg-red-700/20 text-red-500 border-red-700/30",
};

// Merit type colors
const meritTypeColors: Record<string, string> = {
  commendation: "bg-green-500/20 text-green-400 border-green-500/30",
  achievement: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  recognition: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  bonus: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

function PersonnelDetailContent() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const router = useRouter();
  const params = useParams();
  const personnelId = params.id as Id<"personnel">;
  const { user, canViewPersonnel, canManagePersonnel, canDeleteRecords, canEditPersonnelInfo } = useAuth();

  const [activeTab, setActiveTab] = useState("overview");
  const [showWriteUpModal, setShowWriteUpModal] = useState(false);
  const [showMeritModal, setShowMeritModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showEditPersonnelModal, setShowEditPersonnelModal] = useState(false);

  // Queries
  const personnel = useQuery(api.personnel.getWithStats, { personnelId });
  const writeUps = useQuery(api.writeUps.listByPersonnel, { personnelId });
  const attendance = useQuery(api.attendance.listByPersonnel, { personnelId });
  const merits = useQuery(api.merits.listByPersonnel, { personnelId });

  // Mutations
  const createWriteUp = useMutation(api.writeUps.create);
  const createMerit = useMutation(api.merits.create);
  const upsertAttendance = useMutation(api.attendance.upsert);
  const updatePersonnel = useMutation(api.personnel.update);
  const deleteWriteUp = useMutation(api.writeUps.remove);
  const deleteAttendance = useMutation(api.attendance.remove);

  // Form states
  const [writeUpForm, setWriteUpForm] = useState({
    date: new Date().toISOString().split("T")[0],
    severity: "verbal",
    category: "",
    description: "",
    followUpDate: "",
  });

  const [meritForm, setMeritForm] = useState({
    date: new Date().toISOString().split("T")[0],
    type: "commendation",
    title: "",
    description: "",
  });

  const [attendanceForm, setAttendanceForm] = useState({
    date: new Date().toISOString().split("T")[0],
    status: "absent",
    notes: "",
  });

  const [editPersonnelForm, setEditPersonnelForm] = useState({
    email: "",
    phone: "",
    position: "",
    department: "",
    hourlyRate: 0,
    notes: "",
  });

  // Initialize edit form when personnel data loads
  const initEditForm = () => {
    if (personnel) {
      setEditPersonnelForm({
        email: personnel.email,
        phone: personnel.phone,
        position: personnel.position,
        department: personnel.department,
        hourlyRate: personnel.hourlyRate || 0,
        notes: personnel.notes || "",
      });
    }
  };

  // Redirect if user doesn't have permission
  if (!canViewPersonnel) {
    return (
      <div className={`flex h-screen ${isDark ? "bg-slate-900" : "bg-[#f2f2f7]"}`}>
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
              Access Denied
            </h1>
            <p className={`mt-2 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
              You don&apos;t have permission to view this page.
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (!personnel) {
    return (
      <div className={`flex h-screen ${isDark ? "bg-slate-900" : "bg-[#f2f2f7]"}`}>
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className={`animate-pulse ${isDark ? "text-slate-400" : "text-gray-500"}`}>
            Loading...
          </div>
        </main>
      </div>
    );
  }

  const handleCreateWriteUp = async () => {
    if (!user || !writeUpForm.category || !writeUpForm.description) return;
    await createWriteUp({
      personnelId,
      date: writeUpForm.date,
      severity: writeUpForm.severity,
      category: writeUpForm.category,
      description: writeUpForm.description,
      followUpRequired: false,
      followUpDate: writeUpForm.followUpDate || undefined,
      issuedBy: user._id as Id<"users">,
    });
    setShowWriteUpModal(false);
    setWriteUpForm({
      date: new Date().toISOString().split("T")[0],
      severity: "verbal",
      category: "",
      description: "",
      followUpDate: "",
    });
  };

  const handleCreateMerit = async () => {
    if (!user || !meritForm.title || !meritForm.description) return;
    await createMerit({
      personnelId,
      date: meritForm.date,
      type: meritForm.type,
      title: meritForm.title,
      description: meritForm.description,
      issuedBy: user._id as Id<"users">,
    });
    setShowMeritModal(false);
    setMeritForm({
      date: new Date().toISOString().split("T")[0],
      type: "commendation",
      title: "",
      description: "",
    });
  };

  const handleAddAttendance = async () => {
    await upsertAttendance({
      personnelId,
      date: attendanceForm.date,
      status: attendanceForm.status,
      notes: attendanceForm.notes || undefined,
    });
    setShowAttendanceModal(false);
    setAttendanceForm({
      date: new Date().toISOString().split("T")[0],
      status: "absent",
      notes: "",
    });
  };

  const handleUpdatePersonnel = async () => {
    await updatePersonnel({
      personnelId,
      email: editPersonnelForm.email,
      phone: editPersonnelForm.phone,
      position: editPersonnelForm.position,
      department: editPersonnelForm.department,
      hourlyRate: editPersonnelForm.hourlyRate || undefined,
      notes: editPersonnelForm.notes || undefined,
    });
    setShowEditPersonnelModal(false);
  };

  const handleDeleteWriteUp = async (writeUpId: Id<"writeUps">) => {
    if (confirm("Are you sure you want to delete this write-up? This action cannot be undone.")) {
      await deleteWriteUp({ writeUpId });
    }
  };

  const handleDeleteAttendance = async (attendanceId: Id<"attendance">) => {
    if (confirm("Are you sure you want to delete this attendance record? This action cannot be undone.")) {
      await deleteAttendance({ attendanceId });
    }
  };

  return (
    <div className={`flex h-screen ${isDark ? "bg-slate-900" : "bg-[#f2f2f7]"}`}>
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className={`sticky top-0 z-10 backdrop-blur-sm border-b px-8 py-4 ${isDark ? "bg-slate-900/80 border-slate-700" : "bg-white/80 border-gray-200"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/personnel")}
                className={`p-2 rounded-lg transition-colors ${isDark ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-100 text-gray-500"}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl text-white font-bold ${isDark ? "bg-gradient-to-br from-cyan-400 to-blue-500" : "bg-gradient-to-br from-blue-500 to-blue-600"}`}>
                  {personnel.firstName.charAt(0)}{personnel.lastName.charAt(0)}
                </div>
                <div>
                  <h1 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                    {personnel.firstName} {personnel.lastName}
                  </h1>
                  <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    {personnel.position} • {personnel.department}
                  </p>
                </div>
              </div>
            </div>
            <span className={`px-3 py-1 text-sm font-medium rounded border ${statusColors[personnel.status] || statusColors.active}`}>
              {STATUS_OPTIONS.find((s) => s.value === personnel.status)?.label || personnel.status}
            </span>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-4">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? isDark
                      ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                      : "bg-blue-50 text-blue-600 border border-blue-200"
                    : isDark
                      ? "text-slate-400 hover:bg-slate-700/50"
                      : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </header>

        <div className="p-8">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className={`rounded-lg p-4 text-center ${isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white border border-gray-200 shadow-sm"}`}>
                  <p className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                    {personnel.stats?.writeUpsCount || 0}
                  </p>
                  <p className={`text-xs ${isDark ? "text-slate-500" : "text-gray-500"}`}>Write-Ups</p>
                </div>
                <div className={`rounded-lg p-4 text-center ${isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white border border-gray-200 shadow-sm"}`}>
                  <p className={`text-2xl font-bold text-green-400`}>
                    {personnel.stats?.meritsCount || 0}
                  </p>
                  <p className={`text-xs ${isDark ? "text-slate-500" : "text-gray-500"}`}>Merits</p>
                </div>
                <div className={`rounded-lg p-4 text-center ${isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white border border-gray-200 shadow-sm"}`}>
                  <p className={`text-2xl font-bold text-blue-400`}>
                    {personnel.stats?.attendance?.presentDays || 0}
                  </p>
                  <p className={`text-xs ${isDark ? "text-slate-500" : "text-gray-500"}`}>Present (30d)</p>
                </div>
                <div className={`rounded-lg p-4 text-center ${isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white border border-gray-200 shadow-sm"}`}>
                  <p className={`text-2xl font-bold text-red-400`}>
                    {personnel.stats?.activeWriteUps || 0}
                  </p>
                  <p className={`text-xs ${isDark ? "text-slate-500" : "text-gray-500"}`}>Active Write-Ups</p>
                </div>
              </div>

              {/* Profile Info */}
              <div className={`rounded-xl p-6 ${isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white border border-gray-200 shadow-sm"}`}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                    Profile Information
                  </h2>
                  {canEditPersonnelInfo && (
                    <button
                      onClick={() => {
                        initEditForm();
                        setShowEditPersonnelModal(true);
                      }}
                      className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                        isDark
                          ? "bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/30"
                          : "bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200"
                      }`}
                    >
                      Edit
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className={`text-xs font-medium ${isDark ? "text-slate-500" : "text-gray-500"}`}>Email</p>
                    <p className={`${isDark ? "text-white" : "text-gray-900"}`}>{personnel.email}</p>
                  </div>
                  <div>
                    <p className={`text-xs font-medium ${isDark ? "text-slate-500" : "text-gray-500"}`}>Phone</p>
                    <p className={`${isDark ? "text-white" : "text-gray-900"}`}>{personnel.phone}</p>
                  </div>
                  <div>
                    <p className={`text-xs font-medium ${isDark ? "text-slate-500" : "text-gray-500"}`}>Hire Date</p>
                    <p className={`${isDark ? "text-white" : "text-gray-900"}`}>
                      {new Date(personnel.hireDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className={`text-xs font-medium ${isDark ? "text-slate-500" : "text-gray-500"}`}>Hourly Rate</p>
                    <p className={`${isDark ? "text-white" : "text-gray-900"}`}>
                      ${personnel.hourlyRate?.toFixed(2) || "N/A"}/hr
                    </p>
                  </div>
                  {personnel.emergencyContact && (
                    <div className="md:col-span-2">
                      <p className={`text-xs font-medium ${isDark ? "text-slate-500" : "text-gray-500"}`}>Emergency Contact</p>
                      <p className={`${isDark ? "text-white" : "text-gray-900"}`}>
                        {personnel.emergencyContact.name} ({personnel.emergencyContact.relationship}) - {personnel.emergencyContact.phone}
                      </p>
                    </div>
                  )}
                  {personnel.notes && (
                    <div className="md:col-span-2">
                      <p className={`text-xs font-medium ${isDark ? "text-slate-500" : "text-gray-500"}`}>Notes</p>
                      <p className={`${isDark ? "text-slate-300" : "text-gray-700"}`}>{personnel.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Write-Ups Tab */}
          {activeTab === "writeups" && (
            <div className="space-y-4">
              {canManagePersonnel && (
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowWriteUpModal(true)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      isDark
                        ? "bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30"
                        : "bg-red-50 hover:bg-red-100 text-red-600 border border-red-200"
                    }`}
                  >
                    Add Write-Up
                  </button>
                </div>
              )}

              {writeUps && writeUps.length > 0 ? (
                <div className="space-y-4">
                  {writeUps.map((writeUp) => (
                    <div
                      key={writeUp._id}
                      className={`rounded-xl p-6 ${
                        writeUp.isArchived
                          ? isDark
                            ? "bg-slate-800/30 border border-slate-700/50 opacity-70"
                            : "bg-gray-50 border border-gray-200 opacity-70"
                          : isDark
                            ? "bg-slate-800/50 border border-slate-700"
                            : "bg-white border border-gray-200 shadow-sm"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded border ${severityColors[writeUp.severity] || severityColors.verbal}`}>
                              {writeUp.severity.charAt(0).toUpperCase() + writeUp.severity.slice(1)}
                            </span>
                            <span className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                              {new Date(writeUp.date).toLocaleDateString()}
                            </span>
                            {writeUp.isArchived && (
                              <span className={`px-2 py-1 text-xs font-medium rounded border ${
                                writeUp.isExpired
                                  ? isDark
                                    ? "bg-slate-600/50 text-slate-400 border-slate-500/30"
                                    : "bg-gray-200 text-gray-500 border-gray-300"
                                  : isDark
                                    ? "bg-purple-500/20 text-purple-400 border-purple-500/30"
                                    : "bg-purple-100 text-purple-600 border-purple-200"
                              }`}>
                                {writeUp.isExpired ? "Expired (90+ days)" : "Archived"}
                              </span>
                            )}
                          </div>
                          <h3 className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                            {writeUp.category}
                          </h3>
                          <p className={`mt-2 text-sm ${isDark ? "text-slate-300" : "text-gray-600"}`}>
                            {writeUp.description}
                          </p>
                          {writeUp.followUpDate && (
                            <p className={`mt-2 text-xs ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                              Follow-up: {new Date(writeUp.followUpDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2 ml-4">
                          <p className={`text-xs ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                            By: {writeUp.issuerName}
                          </p>
                          {canDeleteRecords && (
                            <button
                              onClick={() => handleDeleteWriteUp(writeUp._id)}
                              className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                                isDark
                                  ? "bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30"
                                  : "bg-red-50 hover:bg-red-100 text-red-600 border border-red-200"
                              }`}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`text-center py-12 ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                  No write-ups on record
                </div>
              )}
            </div>
          )}

          {/* Attendance Tab */}
          {activeTab === "attendance" && (
            <div className="space-y-4">
              {canManagePersonnel && (
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowAttendanceModal(true)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      isDark
                        ? "bg-cyan-500 hover:bg-cyan-400 text-white"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                    }`}
                  >
                    Add Attendance Record
                  </button>
                </div>
              )}

              {attendance && attendance.length > 0 ? (
                <div className={`rounded-xl overflow-hidden ${isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white border border-gray-200 shadow-sm"}`}>
                  <table className="w-full">
                    <thead>
                      <tr className={`border-b ${isDark ? "border-slate-700" : "border-gray-200"}`}>
                        <th className={`text-left px-6 py-4 text-sm font-medium ${isDark ? "text-slate-400" : "text-gray-500"}`}>Date</th>
                        <th className={`text-left px-6 py-4 text-sm font-medium ${isDark ? "text-slate-400" : "text-gray-500"}`}>Status</th>
                        <th className={`text-left px-6 py-4 text-sm font-medium ${isDark ? "text-slate-400" : "text-gray-500"}`}>Time In</th>
                        <th className={`text-left px-6 py-4 text-sm font-medium ${isDark ? "text-slate-400" : "text-gray-500"}`}>Time Out</th>
                        <th className={`text-left px-6 py-4 text-sm font-medium ${isDark ? "text-slate-400" : "text-gray-500"}`}>Hours</th>
                        {canDeleteRecords && (
                          <th className={`text-right px-6 py-4 text-sm font-medium ${isDark ? "text-slate-400" : "text-gray-500"}`}>Actions</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {attendance.map((record) => (
                        <tr key={record._id} className={`border-b ${isDark ? "border-slate-700/50" : "border-gray-200"}`}>
                          <td className={`px-6 py-4 ${isDark ? "text-white" : "text-gray-900"}`}>
                            {new Date(record.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 text-xs font-medium rounded border ${attendanceStatusColors[record.status] || attendanceStatusColors.present}`}>
                              {record.status.replace("_", " ").charAt(0).toUpperCase() + record.status.replace("_", " ").slice(1)}
                            </span>
                          </td>
                          <td className={`px-6 py-4 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                            {record.actualStart || "-"}
                          </td>
                          <td className={`px-6 py-4 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                            {record.actualEnd || "-"}
                          </td>
                          <td className={`px-6 py-4 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                            {record.hoursWorked?.toFixed(1) || "-"}
                          </td>
                          {canDeleteRecords && (
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => handleDeleteAttendance(record._id)}
                                className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                                  isDark
                                    ? "bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30"
                                    : "bg-red-50 hover:bg-red-100 text-red-600 border border-red-200"
                                }`}
                              >
                                Delete
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className={`text-center py-12 ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                  No attendance records
                </div>
              )}
            </div>
          )}

          {/* Merits Tab */}
          {activeTab === "merits" && (
            <div className="space-y-4">
              {canManagePersonnel && (
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowMeritModal(true)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      isDark
                        ? "bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30"
                        : "bg-green-50 hover:bg-green-100 text-green-600 border border-green-200"
                    }`}
                  >
                    Add Merit
                  </button>
                </div>
              )}

              {merits && merits.length > 0 ? (
                <div className="space-y-4">
                  {merits.map((merit) => (
                    <div
                      key={merit._id}
                      className={`rounded-xl p-6 ${isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white border border-gray-200 shadow-sm"}`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded border ${meritTypeColors[merit.type] || meritTypeColors.commendation}`}>
                              {merit.type.charAt(0).toUpperCase() + merit.type.slice(1)}
                            </span>
                            <span className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                              {new Date(merit.date).toLocaleDateString()}
                            </span>
                          </div>
                          <h3 className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                            {merit.title}
                          </h3>
                          <p className={`mt-2 text-sm ${isDark ? "text-slate-300" : "text-gray-600"}`}>
                            {merit.description}
                          </p>
                        </div>
                        <p className={`text-xs ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                          By: {merit.issuerName}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`text-center py-12 ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                  No merits on record
                </div>
              )}
            </div>
          )}
        </div>

        {/* Write-Up Modal */}
        {showWriteUpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className={`w-full max-w-md rounded-xl p-6 ${isDark ? "bg-slate-800" : "bg-white"}`}>
              <h2 className={`text-lg font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
                Add Write-Up
              </h2>
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    Date
                  </label>
                  <input
                    type="date"
                    value={writeUpForm.date}
                    onChange={(e) => setWriteUpForm({ ...writeUpForm, date: e.target.value })}
                    className={`w-full px-4 py-2 rounded-lg ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-gray-50 border-gray-200 text-gray-900"} border focus:outline-none`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    Severity
                  </label>
                  <select
                    value={writeUpForm.severity}
                    onChange={(e) => setWriteUpForm({ ...writeUpForm, severity: e.target.value })}
                    className={`w-full px-4 py-2 rounded-lg ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-gray-50 border-gray-200 text-gray-900"} border focus:outline-none`}
                  >
                    <option value="verbal">Verbal Warning</option>
                    <option value="written">Written Warning</option>
                    <option value="final">Final Warning</option>
                    <option value="termination">Termination</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    Category
                  </label>
                  <select
                    value={writeUpForm.category}
                    onChange={(e) => setWriteUpForm({ ...writeUpForm, category: e.target.value })}
                    className={`w-full px-4 py-2 rounded-lg ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-gray-50 border-gray-200 text-gray-900"} border focus:outline-none`}
                  >
                    <option value="">Select category...</option>
                    <option value="attendance">Attendance</option>
                    <option value="behavior">Behavior</option>
                    <option value="safety">Safety</option>
                    <option value="performance">Performance</option>
                    <option value="policy_violation">Policy Violation</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    Description
                  </label>
                  <textarea
                    value={writeUpForm.description}
                    onChange={(e) => setWriteUpForm({ ...writeUpForm, description: e.target.value })}
                    placeholder="Detailed description of the incident"
                    rows={3}
                    className={`w-full px-4 py-2 rounded-lg ${isDark ? "bg-slate-700 border-slate-600 text-white placeholder-slate-500" : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400"} border focus:outline-none`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    Follow-up Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={writeUpForm.followUpDate}
                    onChange={(e) => setWriteUpForm({ ...writeUpForm, followUpDate: e.target.value })}
                    className={`w-full px-4 py-2 rounded-lg ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-gray-50 border-gray-200 text-gray-900"} border focus:outline-none`}
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowWriteUpModal(false)}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${isDark ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-900"}`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateWriteUp}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${isDark ? "bg-red-500 hover:bg-red-400 text-white" : "bg-red-600 hover:bg-red-700 text-white"}`}
                >
                  Add Write-Up
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Merit Modal */}
        {showMeritModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className={`w-full max-w-md rounded-xl p-6 ${isDark ? "bg-slate-800" : "bg-white"}`}>
              <h2 className={`text-lg font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
                Add Merit
              </h2>
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    Date
                  </label>
                  <input
                    type="date"
                    value={meritForm.date}
                    onChange={(e) => setMeritForm({ ...meritForm, date: e.target.value })}
                    className={`w-full px-4 py-2 rounded-lg ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-gray-50 border-gray-200 text-gray-900"} border focus:outline-none`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    Type
                  </label>
                  <select
                    value={meritForm.type}
                    onChange={(e) => setMeritForm({ ...meritForm, type: e.target.value })}
                    className={`w-full px-4 py-2 rounded-lg ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-gray-50 border-gray-200 text-gray-900"} border focus:outline-none`}
                  >
                    <option value="commendation">Commendation</option>
                    <option value="achievement">Achievement</option>
                    <option value="recognition">Recognition</option>
                    <option value="bonus">Bonus</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    Title
                  </label>
                  <input
                    type="text"
                    value={meritForm.title}
                    onChange={(e) => setMeritForm({ ...meritForm, title: e.target.value })}
                    placeholder="Merit title"
                    className={`w-full px-4 py-2 rounded-lg ${isDark ? "bg-slate-700 border-slate-600 text-white placeholder-slate-500" : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400"} border focus:outline-none`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    Description
                  </label>
                  <textarea
                    value={meritForm.description}
                    onChange={(e) => setMeritForm({ ...meritForm, description: e.target.value })}
                    placeholder="Describe the achievement or recognition"
                    rows={3}
                    className={`w-full px-4 py-2 rounded-lg ${isDark ? "bg-slate-700 border-slate-600 text-white placeholder-slate-500" : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400"} border focus:outline-none`}
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowMeritModal(false)}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${isDark ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-900"}`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateMerit}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${isDark ? "bg-green-500 hover:bg-green-400 text-white" : "bg-green-600 hover:bg-green-700 text-white"}`}
                >
                  Add Merit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Attendance Modal - Absence Tracking Only */}
        {showAttendanceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className={`w-full max-w-md rounded-xl p-6 ${isDark ? "bg-slate-800" : "bg-white"}`}>
              <h2 className={`text-lg font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
                Record Absence
              </h2>
              <p className={`text-sm mb-4 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                Track when personnel are not present. Time clock integration coming soon.
              </p>
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    Date
                  </label>
                  <input
                    type="date"
                    value={attendanceForm.date}
                    onChange={(e) => setAttendanceForm({ ...attendanceForm, date: e.target.value })}
                    className={`w-full px-4 py-2 rounded-lg ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-gray-50 border-gray-200 text-gray-900"} border focus:outline-none`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    Absence Type
                  </label>
                  <select
                    value={attendanceForm.status}
                    onChange={(e) => setAttendanceForm({ ...attendanceForm, status: e.target.value })}
                    className={`w-full px-4 py-2 rounded-lg ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-gray-50 border-gray-200 text-gray-900"} border focus:outline-none`}
                  >
                    <option value="absent">Absent</option>
                    <option value="late">Late</option>
                    <option value="excused">Excused</option>
                    <option value="no_call_no_show">No Call No Show</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    Notes (Optional)
                  </label>
                  <textarea
                    value={attendanceForm.notes}
                    onChange={(e) => setAttendanceForm({ ...attendanceForm, notes: e.target.value })}
                    placeholder="Reason for absence, call-in details, etc."
                    rows={3}
                    className={`w-full px-4 py-2 rounded-lg ${isDark ? "bg-slate-700 border-slate-600 text-white placeholder-slate-500" : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400"} border focus:outline-none`}
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAttendanceModal(false)}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${isDark ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-900"}`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddAttendance}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${isDark ? "bg-red-500 hover:bg-red-400 text-white" : "bg-red-600 hover:bg-red-700 text-white"}`}
                >
                  Record Absence
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Personnel Modal */}
        {showEditPersonnelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className={`w-full max-w-md rounded-xl p-6 ${isDark ? "bg-slate-800" : "bg-white"}`}>
              <h2 className={`text-lg font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
                Edit Personnel Information
              </h2>
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={editPersonnelForm.email}
                    onChange={(e) => setEditPersonnelForm({ ...editPersonnelForm, email: e.target.value })}
                    className={`w-full px-4 py-2 rounded-lg ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-gray-50 border-gray-200 text-gray-900"} border focus:outline-none`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={editPersonnelForm.phone}
                    onChange={(e) => setEditPersonnelForm({ ...editPersonnelForm, phone: e.target.value })}
                    className={`w-full px-4 py-2 rounded-lg ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-gray-50 border-gray-200 text-gray-900"} border focus:outline-none`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    Position
                  </label>
                  <input
                    type="text"
                    value={editPersonnelForm.position}
                    onChange={(e) => setEditPersonnelForm({ ...editPersonnelForm, position: e.target.value })}
                    className={`w-full px-4 py-2 rounded-lg ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-gray-50 border-gray-200 text-gray-900"} border focus:outline-none`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    Department
                  </label>
                  <select
                    value={editPersonnelForm.department}
                    onChange={(e) => setEditPersonnelForm({ ...editPersonnelForm, department: e.target.value })}
                    className={`w-full px-4 py-2 rounded-lg ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-gray-50 border-gray-200 text-gray-900"} border focus:outline-none`}
                  >
                    <option value="Warehouse">Warehouse</option>
                    <option value="Sales">Sales</option>
                    <option value="Management">Management</option>
                    <option value="Administration">Administration</option>
                    <option value="Delivery">Delivery</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    Hourly Rate ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editPersonnelForm.hourlyRate}
                    onChange={(e) => setEditPersonnelForm({ ...editPersonnelForm, hourlyRate: parseFloat(e.target.value) || 0 })}
                    className={`w-full px-4 py-2 rounded-lg ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-gray-50 border-gray-200 text-gray-900"} border focus:outline-none`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    Notes
                  </label>
                  <textarea
                    value={editPersonnelForm.notes}
                    onChange={(e) => setEditPersonnelForm({ ...editPersonnelForm, notes: e.target.value })}
                    placeholder="Additional notes"
                    rows={3}
                    className={`w-full px-4 py-2 rounded-lg ${isDark ? "bg-slate-700 border-slate-600 text-white placeholder-slate-500" : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400"} border focus:outline-none`}
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowEditPersonnelModal(false)}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${isDark ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-900"}`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdatePersonnel}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${isDark ? "bg-cyan-500 hover:bg-cyan-400 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function PersonnelDetailPage() {
  return (
    <Protected>
      <PersonnelDetailContent />
    </Protected>
  );
}
