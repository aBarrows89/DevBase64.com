"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Protected from "../protected";
import Sidebar, { MobileHeader } from "@/components/Sidebar";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useTheme } from "../theme-context";
import { useAuth } from "../auth-context";
import Link from "next/link";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
];

const statusColors: Record<string, string> = {
  active: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  completed: "bg-green-500/20 text-green-400 border-green-500/30",
  failed: "bg-red-500/20 text-red-400 border-red-500/30",
};

const tierLabels: Record<number, string> = {
  1: "Tier 1 (30 days)",
  2: "Tier 2 (60 days)",
  3: "Tier 3 (90 days)",
};

function ARPContent() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { user, canManagePersonnel } = useAuth();
  const router = useRouter();

  // Restrict warehouse_manager role from accessing this page (part of Hiring & HR)
  const isWarehouseManager = user?.role === "warehouse_manager";

  useEffect(() => {
    if (isWarehouseManager) {
      router.push("/");
    }
  }, [isWarehouseManager, router]);

  // Show nothing while redirecting warehouse manager
  if (isWarehouseManager) {
    return (
      <div className={`flex h-screen items-center justify-center ${isDark ? "bg-slate-900" : "bg-[#f2f2f7]"}`}>
        <div className={`text-center ${isDark ? "text-slate-400" : "text-gray-500"}`}>
          <p>You do not have access to this page.</p>
          <p className="text-sm mt-2">Redirecting...</p>
        </div>
      </div>
    );
  }

  const stats = useQuery(api.arp.getStats) || {
    activeCount: 0,
    completedThisMonth: 0,
    failedThisMonth: 0,
    successRate: 0,
    totalCompleted: 0,
    totalFailed: 0,
    meetingsTodayCount: 0,
    overdueMeetingsCount: 0,
  };

  const activeEnrollments = useQuery(api.arp.getActiveEnrollments) || [];
  const meetingsToday = useQuery(api.arp.getMeetingsToday) || [];
  const overdueMeetings = useQuery(api.arp.getOverdueMeetings) || [];
  const coaches = useQuery(api.arp.getCoaches) || [];
  const allPersonnel = useQuery(api.personnel.list, {}) || [];

  const enrollMutation = useMutation(api.arp.enroll);

  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [selectedPersonnelId, setSelectedPersonnelId] = useState<Id<"personnel"> | null>(null);
  const [selectedCoachId, setSelectedCoachId] = useState<Id<"personnel"> | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [eligibilityResult, setEligibilityResult] = useState<{
    eligible: boolean;
    reason?: string;
    tier?: number;
    durationDays?: number;
    meetingCount?: number;
  } | null>(null);

  const checkEligibility = useQuery(
    api.arp.checkEligibility,
    selectedPersonnelId ? { personnelId: selectedPersonnelId } : "skip"
  );

  // Update eligibility result when query returns
  if (checkEligibility && checkEligibility !== eligibilityResult) {
    setEligibilityResult(checkEligibility);
  }

  // Redirect if user doesn't have permission
  if (!canManagePersonnel) {
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

  const filteredPersonnel = allPersonnel
    .filter((p) => p.status === "active")
    .filter(
      (p) =>
        searchTerm === "" ||
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const handleEnroll = async () => {
    if (!selectedPersonnelId || !selectedCoachId || !eligibilityResult?.eligible) return;
    setIsProcessing(true);
    try {
      await enrollMutation({
        personnelId: selectedPersonnelId,
        coachId: selectedCoachId,
      });
      setShowEnrollModal(false);
      setSelectedPersonnelId(null);
      setSelectedCoachId(null);
      setSearchTerm("");
      setEligibilityResult(null);
    } catch (error) {
      console.error("Failed to enroll:", error);
      alert("Failed to enroll employee. " + (error as Error).message);
    }
    setIsProcessing(false);
  };

  const getDaysRemainingColor = (days: number) => {
    if (days <= 7) return "text-red-400";
    if (days <= 14) return "text-amber-400";
    return "text-green-400";
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className={`flex h-screen ${isDark ? "bg-slate-900" : "bg-[#f2f2f7]"}`}>
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <MobileHeader />

        {/* Header */}
        <header className={`sticky top-0 z-10 backdrop-blur-sm border-b px-4 sm:px-8 py-3 sm:py-4 ${isDark ? "bg-slate-900/80 border-slate-700" : "bg-white/80 border-gray-200"}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className={`text-xl sm:text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                Attendance Recovery Program
              </h1>
              <p className={`text-xs sm:text-sm mt-1 hidden sm:block ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                Coaching-based intervention for attendance improvement
              </p>
            </div>
            <button
              onClick={() => setShowEnrollModal(true)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isDark
                  ? "bg-cyan-500 hover:bg-cyan-400 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              Enroll Employee
            </button>
          </div>
        </header>

        <div className="p-4 sm:p-8 space-y-4 sm:space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
            <div className={`rounded-lg p-2 sm:p-4 text-center ${isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white border border-gray-200 shadow-sm"}`}>
              <p className={`text-lg sm:text-2xl font-bold text-cyan-400`}>{stats.activeCount}</p>
              <p className={`text-[10px] sm:text-xs ${isDark ? "text-slate-500" : "text-gray-500"}`}>Active</p>
            </div>
            <div className={`rounded-lg p-2 sm:p-4 text-center ${isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white border border-gray-200 shadow-sm"}`}>
              <p className={`text-lg sm:text-2xl font-bold text-green-400`}>{stats.completedThisMonth}</p>
              <p className={`text-[10px] sm:text-xs ${isDark ? "text-slate-500" : "text-gray-500"}`}>Completed (Month)</p>
            </div>
            <div className={`rounded-lg p-2 sm:p-4 text-center ${isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white border border-gray-200 shadow-sm"}`}>
              <p className={`text-lg sm:text-2xl font-bold text-red-400`}>{stats.failedThisMonth}</p>
              <p className={`text-[10px] sm:text-xs ${isDark ? "text-slate-500" : "text-gray-500"}`}>Failed (Month)</p>
            </div>
            <div className={`rounded-lg p-2 sm:p-4 text-center ${isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white border border-gray-200 shadow-sm"}`}>
              <p className={`text-lg sm:text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{stats.successRate}%</p>
              <p className={`text-[10px] sm:text-xs ${isDark ? "text-slate-500" : "text-gray-500"}`}>Success Rate</p>
            </div>
          </div>

          {/* Meetings Today & Overdue */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Meetings Today */}
            <div className={`rounded-lg overflow-hidden ${isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white border border-gray-200 shadow-sm"}`}>
              <div className={`px-4 py-3 border-b ${isDark ? "border-slate-700" : "border-gray-200"}`}>
                <h2 className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                  Meetings Today ({stats.meetingsTodayCount})
                </h2>
              </div>
              {meetingsToday.length === 0 ? (
                <div className="p-4 text-center">
                  <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    No meetings scheduled for today
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-700">
                  {meetingsToday.slice(0, 5).map((meeting) => (
                    <div key={meeting._id} className="p-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                            {meeting.personnelName}
                          </p>
                          <p className={`text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                            Meeting #{meeting.meetingNumber} &bull; Coach: {meeting.coachName}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          meeting.meetingType === "initial"
                            ? "bg-purple-500/20 text-purple-400"
                            : meeting.meetingType === "final"
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-slate-500/20 text-slate-400"
                        }`}>
                          {meeting.meetingType}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Overdue Meetings */}
            <div className={`rounded-lg overflow-hidden ${isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white border border-gray-200 shadow-sm"}`}>
              <div className={`px-4 py-3 border-b ${isDark ? "border-slate-700" : "border-gray-200"}`}>
                <h2 className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                  Overdue Meetings ({stats.overdueMeetingsCount})
                </h2>
              </div>
              {overdueMeetings.length === 0 ? (
                <div className="p-4 text-center">
                  <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    No overdue meetings
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-700">
                  {overdueMeetings.slice(0, 5).map((meeting) => (
                    <div key={meeting._id} className="p-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                            {meeting.personnelName}
                          </p>
                          <p className={`text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                            Meeting #{meeting.meetingNumber} &bull; Coach: {meeting.coachName}
                          </p>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-400">
                          {meeting.daysOverdue} day{meeting.daysOverdue !== 1 ? "s" : ""} overdue
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Active Enrollments */}
          <div className={`rounded-lg overflow-hidden ${isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white border border-gray-200 shadow-sm"}`}>
            <div className={`px-4 py-3 border-b ${isDark ? "border-slate-700" : "border-gray-200"}`}>
              <h2 className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                Active Enrollments
              </h2>
            </div>
            {activeEnrollments.length === 0 ? (
              <div className="p-8 text-center">
                <svg
                  className={`w-12 h-12 mx-auto mb-3 ${isDark ? "text-slate-600" : "text-gray-300"}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className={isDark ? "text-slate-400" : "text-gray-500"}>
                  No active ARP enrollments
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className={isDark ? "bg-slate-700/50" : "bg-gray-50"}>
                    <tr>
                      <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                        Employee
                      </th>
                      <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                        Coach
                      </th>
                      <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                        Tier
                      </th>
                      <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                        Days Left
                      </th>
                      <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                        Next Meeting
                      </th>
                      <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                        Progress
                      </th>
                      <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? "divide-slate-700" : "divide-gray-200"}`}>
                    {activeEnrollments.map((enrollment) => (
                      <tr key={enrollment._id} className={isDark ? "hover:bg-slate-700/50" : "hover:bg-gray-50"}>
                        <td className="px-4 py-3">
                          <div>
                            <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                              {enrollment.personnelName}
                            </p>
                            <p className={`text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                              {enrollment.personnelDepartment} &bull; {enrollment.locationName || "No location"}
                            </p>
                          </div>
                        </td>
                        <td className={`px-4 py-3 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                          {enrollment.coachName}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-400">
                            Tier {enrollment.programTier}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-medium ${getDaysRemainingColor(enrollment.daysRemaining)}`}>
                            {enrollment.daysRemaining} days
                          </span>
                        </td>
                        <td className={`px-4 py-3 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                          {enrollment.nextMeetingDate ? formatDate(enrollment.nextMeetingDate) : "None scheduled"}
                        </td>
                        <td className="px-4 py-3">
                          <div className={`text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                            <span className="text-cyan-400">{enrollment.meetingsCompleted}</span>/{enrollment.meetingsTotal} meetings
                            <br />
                            <span className="text-green-400">{enrollment.trainingCompleted}</span>/{enrollment.trainingTotal} training
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/arp/${enrollment._id}`}
                            className={`text-sm font-medium ${
                              isDark
                                ? "text-cyan-400 hover:text-cyan-300"
                                : "text-blue-600 hover:text-blue-700"
                            }`}
                          >
                            View Details
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Enroll Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className={`w-full max-w-md rounded-xl p-6 ${isDark ? "bg-slate-800" : "bg-white"}`}>
            <h2 className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
              Enroll Employee in ARP
            </h2>

            {/* Employee Selection */}
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                Select Employee
              </label>
              <input
                type="text"
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setSelectedPersonnelId(null);
                  setEligibilityResult(null);
                }}
                className={`w-full px-3 py-2 rounded-lg border text-sm mb-2 ${
                  isDark
                    ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                }`}
              />
              {searchTerm && !selectedPersonnelId && (
                <div className={`max-h-40 overflow-y-auto rounded-lg border ${isDark ? "bg-slate-700 border-slate-600" : "bg-white border-gray-200"}`}>
                  {filteredPersonnel.slice(0, 10).map((person) => (
                    <button
                      key={person._id}
                      onClick={() => {
                        setSelectedPersonnelId(person._id);
                        setSearchTerm(`${person.firstName} ${person.lastName}`);
                        setEligibilityResult(null);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm ${
                        isDark
                          ? "hover:bg-slate-600 text-white"
                          : "hover:bg-gray-100 text-gray-900"
                      }`}
                    >
                      {person.firstName} {person.lastName}
                      <span className={`ml-2 text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                        {person.department}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Eligibility Result */}
            {selectedPersonnelId && eligibilityResult && (
              <div className={`mb-4 p-3 rounded-lg ${
                eligibilityResult.eligible
                  ? "bg-green-500/20 border border-green-500/30"
                  : "bg-red-500/20 border border-red-500/30"
              }`}>
                {eligibilityResult.eligible ? (
                  <div>
                    <p className="text-green-400 font-medium">Eligible for ARP</p>
                    <p className={`text-sm mt-1 ${isDark ? "text-slate-300" : "text-gray-600"}`}>
                      {tierLabels[eligibilityResult.tier!]} &bull; {eligibilityResult.meetingCount} meetings
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-red-400 font-medium">Not Eligible</p>
                    <p className={`text-sm mt-1 ${isDark ? "text-slate-300" : "text-gray-600"}`}>
                      {eligibilityResult.reason}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Coach Selection */}
            {eligibilityResult?.eligible && (
              <div className="mb-6">
                <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                  Assign Coach
                </label>
                <select
                  value={selectedCoachId || ""}
                  onChange={(e) => setSelectedCoachId(e.target.value as Id<"personnel">)}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${
                    isDark
                      ? "bg-slate-700 border-slate-600 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                >
                  <option value="">Select a coach...</option>
                  {coaches.map((coach) => (
                    <option key={coach._id} value={coach._id}>
                      {coach.name} - {coach.department}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowEnrollModal(false);
                  setSelectedPersonnelId(null);
                  setSelectedCoachId(null);
                  setSearchTerm("");
                  setEligibilityResult(null);
                }}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isDark
                    ? "bg-slate-700 hover:bg-slate-600 text-slate-300"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleEnroll}
                disabled={!eligibilityResult?.eligible || !selectedCoachId || isProcessing}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isDark
                    ? "bg-cyan-500 hover:bg-cyan-400 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isProcessing ? "Enrolling..." : "Enroll"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ARPPage() {
  return (
    <Protected>
      <ARPContent />
    </Protected>
  );
}
