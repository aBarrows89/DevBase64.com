"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Protected from "../../protected";
import Sidebar, { MobileHeader } from "@/components/Sidebar";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useTheme } from "../../theme-context";
import { useAuth } from "../../auth-context";
import Link from "next/link";
import SignaturePad from "@/components/SignaturePad";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "agreement", label: "Agreement" },
  { id: "meetings", label: "Meetings" },
  { id: "root-cause", label: "Root Cause" },
  { id: "training", label: "Training" },
];

const ROOT_CAUSE_OPTIONS = [
  { key: "sleepWakeIssues", label: "Sleep/Wake Issues", description: "Difficulty waking up, irregular sleep schedule" },
  { key: "transportation", label: "Transportation", description: "Unreliable vehicle, no backup transportation" },
  { key: "childcareFamily", label: "Childcare/Family", description: "Childcare issues, family responsibilities" },
  { key: "healthIssues", label: "Health Issues", description: "Chronic illness, frequent medical appointments" },
  { key: "timeManagement", label: "Time Management", description: "Poor planning, underestimating prep time" },
  { key: "scheduleConflicts", label: "Schedule Conflicts", description: "Second job, school, other commitments" },
  { key: "engagementMotivation", label: "Engagement/Motivation", description: "Low job satisfaction, disengagement" },
];

const meetingStatusColors: Record<string, string> = {
  scheduled: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  completed: "bg-green-500/20 text-green-400 border-green-500/30",
  missed: "bg-red-500/20 text-red-400 border-red-500/30",
  rescheduled: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

const trainingStatusColors: Record<string, string> = {
  assigned: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  in_progress: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  completed: "bg-green-500/20 text-green-400 border-green-500/30",
};

function ARPDetailContent() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { canManagePersonnel, user } = useAuth();
  const userId = user?._id;
  const userName = user?.name ?? "";
  const params = useParams();
  const router = useRouter();
  const enrollmentId = params.id as Id<"arpEnrollments">;

  const enrollment = useQuery(api.arp.getEnrollment, { enrollmentId });
  const availableModules = useQuery(api.arp.getAvailableTrainingModules, { enrollmentId }) || [];

  const recordMeetingMutation = useMutation(api.arp.recordMeeting);
  const missMeetingMutation = useMutation(api.arp.missMeeting);
  const rescheduleMeetingMutation = useMutation(api.arp.rescheduleMeeting);
  const saveRootCauseMutation = useMutation(api.arp.saveRootCause);
  const assignTrainingMutation = useMutation(api.arp.assignTraining);
  const completeTrainingMutation = useMutation(api.arp.completeTraining);
  const failEnrollmentMutation = useMutation(api.arp.failEnrollment);
  const completeEnrollmentMutation = useMutation(api.arp.completeEnrollment);
  const signAsAdminMutation = useMutation(api.arp.signAsAdmin);
  const signAsCoachMutation = useMutation(api.arp.signAsCoach);
  const signAsEmployeeMutation = useMutation(api.arp.signAsEmployee);

  const [activeTab, setActiveTab] = useState("overview");
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Id<"arpMeetings"> | null>(null);
  const [meetingNotes, setMeetingNotes] = useState("");
  const [meetingActionItems, setMeetingActionItems] = useState("");
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showFailModal, setShowFailModal] = useState(false);
  const [failReason, setFailReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Root cause state
  const [rootCause, setRootCause] = useState({
    sleepWakeIssues: false,
    transportation: false,
    childcareFamily: false,
    healthIssues: false,
    timeManagement: false,
    scheduleConflicts: false,
    engagementMotivation: false,
    other: false,
    otherDescription: "",
    summary: "",
  });

  // Initialize root cause from enrollment data
  if (enrollment?.rootCause && !rootCause.summary && enrollment.rootCause.summary) {
    setRootCause({
      sleepWakeIssues: enrollment.rootCause.sleepWakeIssues,
      transportation: enrollment.rootCause.transportation,
      childcareFamily: enrollment.rootCause.childcareFamily,
      healthIssues: enrollment.rootCause.healthIssues,
      timeManagement: enrollment.rootCause.timeManagement,
      scheduleConflicts: enrollment.rootCause.scheduleConflicts,
      engagementMotivation: enrollment.rootCause.engagementMotivation,
      other: enrollment.rootCause.other,
      otherDescription: enrollment.rootCause.otherDescription || "",
      summary: enrollment.rootCause.summary || "",
    });
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

  if (!enrollment) {
    return (
      <div className={`flex h-screen ${isDark ? "bg-slate-900" : "bg-[#f2f2f7]"}`}>
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className={isDark ? "text-slate-400" : "text-gray-500"}>Loading enrollment...</p>
          </div>
        </main>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleRecordMeeting = async () => {
    if (!selectedMeeting) return;
    setIsProcessing(true);
    try {
      await recordMeetingMutation({
        meetingId: selectedMeeting,
        notes: meetingNotes || undefined,
        actionItems: meetingActionItems || undefined,
      });
      setShowMeetingModal(false);
      setSelectedMeeting(null);
      setMeetingNotes("");
      setMeetingActionItems("");
    } catch (error) {
      console.error("Failed to record meeting:", error);
    }
    setIsProcessing(false);
  };

  const handleMissMeeting = async (meetingId: Id<"arpMeetings">) => {
    if (!confirm("Mark this meeting as missed? This may affect the employee's ARP status.")) return;
    try {
      await missMeetingMutation({ meetingId });
    } catch (error) {
      console.error("Failed to mark meeting as missed:", error);
    }
  };

  const handleRescheduleMeeting = async () => {
    if (!selectedMeeting || !rescheduleDate) return;
    setIsProcessing(true);
    try {
      await rescheduleMeetingMutation({
        meetingId: selectedMeeting,
        newDate: rescheduleDate,
      });
      setShowRescheduleModal(false);
      setSelectedMeeting(null);
      setRescheduleDate("");
    } catch (error) {
      console.error("Failed to reschedule meeting:", error);
    }
    setIsProcessing(false);
  };

  const handleSaveRootCause = async () => {
    setIsProcessing(true);
    try {
      await saveRootCauseMutation({
        enrollmentId,
        ...rootCause,
        otherDescription: rootCause.other ? rootCause.otherDescription : undefined,
        summary: rootCause.summary || undefined,
      });
      alert("Root cause assessment saved!");
    } catch (error) {
      console.error("Failed to save root cause:", error);
    }
    setIsProcessing(false);
  };

  const handleAssignTraining = async (moduleCode: string) => {
    try {
      await assignTrainingMutation({
        enrollmentId,
        moduleCode,
      });
    } catch (error) {
      console.error("Failed to assign training:", error);
    }
  };

  const handleCompleteTraining = async (trainingId: Id<"arpTraining">) => {
    try {
      await completeTrainingMutation({ trainingId });
    } catch (error) {
      console.error("Failed to complete training:", error);
    }
  };

  const handleFailEnrollment = async () => {
    if (!failReason.trim()) return;
    setIsProcessing(true);
    try {
      await failEnrollmentMutation({
        enrollmentId,
        reason: failReason,
      });
      setShowFailModal(false);
      router.push("/arp");
    } catch (error) {
      console.error("Failed to fail enrollment:", error);
    }
    setIsProcessing(false);
  };

  const handleSignAsAdmin = async (signature: string) => {
    if (!userId) return;
    setIsProcessing(true);
    try {
      await signAsAdminMutation({
        enrollmentId,
        adminId: userId as Id<"users">,
        adminName: userName || "Unknown Admin",
        adminTitle: "Human Resources", // TODO: Get from user profile
        signature,
      });
    } catch (error) {
      console.error("Failed to sign as admin:", error);
    }
    setIsProcessing(false);
  };

  const handleSignAsCoach = async (signature: string) => {
    setIsProcessing(true);
    try {
      await signAsCoachMutation({
        enrollmentId,
        signature,
      });
    } catch (error) {
      console.error("Failed to sign as coach:", error);
    }
    setIsProcessing(false);
  };

  const handleSignAsEmployee = async (signature: string) => {
    setIsProcessing(true);
    try {
      await signAsEmployeeMutation({
        enrollmentId,
        signature,
      });
    } catch (error) {
      console.error("Failed to sign as employee:", error);
    }
    setIsProcessing(false);
  };

  const handleCompleteEnrollment = async () => {
    if (!confirm("Complete this ARP enrollment? This will clear all attendance write-ups for this employee.")) return;
    setIsProcessing(true);
    try {
      const result = await completeEnrollmentMutation({ enrollmentId });
      alert(`Enrollment completed successfully! ${result.writeUpsCleared} attendance write-ups cleared.`);
      router.push("/arp");
    } catch (error) {
      console.error("Failed to complete enrollment:", error);
      alert("Failed to complete enrollment: " + (error as Error).message);
    }
    setIsProcessing(false);
  };

  const statusColors: Record<string, string> = {
    active: "bg-cyan-500/20 text-cyan-400",
    completed: "bg-green-500/20 text-green-400",
    failed: "bg-red-500/20 text-red-400",
  };

  return (
    <div className={`flex h-screen ${isDark ? "bg-slate-900" : "bg-[#f2f2f7]"}`}>
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <MobileHeader />

        {/* Header */}
        <header className={`sticky top-0 z-10 backdrop-blur-sm border-b px-4 sm:px-8 py-3 sm:py-4 ${isDark ? "bg-slate-900/80 border-slate-700" : "bg-white/80 border-gray-200"}`}>
          <div className="flex items-center gap-3 mb-3">
            <Link
              href="/arp"
              className={`p-2 rounded-lg transition-colors ${
                isDark ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-100 text-gray-500"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className={`text-xl sm:text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                  {enrollment.personnel?.name || "Unknown Employee"}
                </h1>
                <span className={`text-xs px-2 py-1 rounded-full ${statusColors[enrollment.status]}`}>
                  {enrollment.status}
                </span>
              </div>
              <p className={`text-xs sm:text-sm mt-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                Tier {enrollment.programTier} &bull; {enrollment.personnel?.department} &bull; Coach: {enrollment.coach?.name}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span className={isDark ? "text-slate-400" : "text-gray-500"}>
                {formatDate(enrollment.enrollmentDate)}
              </span>
              <span className={isDark ? "text-slate-400" : "text-gray-500"}>
                {enrollment.progress.daysRemaining} days remaining
              </span>
              <span className={isDark ? "text-slate-400" : "text-gray-500"}>
                {formatDate(enrollment.programEndDate)}
              </span>
            </div>
            <div className={`h-2 rounded-full ${isDark ? "bg-slate-700" : "bg-gray-200"}`}>
              <div
                className="h-2 rounded-full bg-cyan-500 transition-all"
                style={{ width: `${enrollment.progress.progressPercent}%` }}
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? isDark
                      ? "bg-cyan-500 text-white"
                      : "bg-blue-600 text-white"
                    : isDark
                      ? "text-slate-400 hover:bg-slate-700"
                      : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </header>

        <div className="p-4 sm:p-8">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className={`rounded-lg p-4 ${isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white border border-gray-200"}`}>
                  <p className={`text-2xl font-bold text-cyan-400`}>
                    {enrollment.progress.meetingsCompleted}/{enrollment.progress.meetingsTotal}
                  </p>
                  <p className={`text-xs ${isDark ? "text-slate-500" : "text-gray-500"}`}>Meetings</p>
                </div>
                <div className={`rounded-lg p-4 ${isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white border border-gray-200"}`}>
                  <p className={`text-2xl font-bold text-green-400`}>
                    {enrollment.progress.trainingCompleted}/{enrollment.progress.trainingTotal}
                  </p>
                  <p className={`text-xs ${isDark ? "text-slate-500" : "text-gray-500"}`}>Training</p>
                </div>
                <div className={`rounded-lg p-4 ${isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white border border-gray-200"}`}>
                  <p className={`text-2xl font-bold ${enrollment.progress.daysRemaining <= 7 ? "text-red-400" : "text-amber-400"}`}>
                    {enrollment.progress.daysRemaining}
                  </p>
                  <p className={`text-xs ${isDark ? "text-slate-500" : "text-gray-500"}`}>Days Left</p>
                </div>
                <div className={`rounded-lg p-4 ${isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white border border-gray-200"}`}>
                  <p className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                    {enrollment.enrollmentCount}/3
                  </p>
                  <p className={`text-xs ${isDark ? "text-slate-500" : "text-gray-500"}`}>Enrollment</p>
                </div>
              </div>

              {/* Failure Info */}
              {enrollment.status === "failed" && (
                <div className={`rounded-lg p-4 bg-red-500/10 border border-red-500/30`}>
                  <h3 className="text-red-400 font-medium mb-2">Enrollment Failed</h3>
                  <p className={`text-sm ${isDark ? "text-slate-300" : "text-gray-600"}`}>
                    Reason: {enrollment.failureReason}
                  </p>
                  {enrollment.nextEligibleDate && (
                    <p className={`text-sm mt-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                      Next eligible date: {formatDate(enrollment.nextEligibleDate)}
                    </p>
                  )}
                </div>
              )}

              {/* Actions */}
              {enrollment.status === "active" && (
                <div className={`rounded-lg p-4 ${isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white border border-gray-200"}`}>
                  <h3 className={`font-medium mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>Actions</h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={handleCompleteEnrollment}
                      disabled={enrollment.progress.meetingsCompleted < enrollment.progress.meetingsTotal}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        isDark
                          ? "bg-green-500 hover:bg-green-400 text-white"
                          : "bg-green-600 hover:bg-green-700 text-white"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      Complete Program
                    </button>
                    <button
                      onClick={() => setShowFailModal(true)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        isDark
                          ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                          : "bg-red-100 text-red-600 hover:bg-red-200"
                      }`}
                    >
                      Record Failure
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Agreement Tab */}
          {activeTab === "agreement" && (
            <div className="space-y-4">
              {/* Agreement Status */}
              <div className={`rounded-lg p-4 ${isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white border border-gray-200"}`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                    Agreement Status
                  </h3>
                  {enrollment.agreement?.status === "fully_signed" ? (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                      Fully Signed
                    </span>
                  ) : enrollment.agreement?.status === "partially_signed" ? (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      Partially Signed
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                      Pending Signatures
                    </span>
                  )}
                </div>
                <div className={`grid grid-cols-3 gap-4 text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                  <div className="flex items-center gap-2">
                    {enrollment.agreement?.adminSignature ? (
                      <span className="w-2 h-2 rounded-full bg-green-400"></span>
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                    )}
                    <span>Admin/HR</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {enrollment.agreement?.coachSignature ? (
                      <span className="w-2 h-2 rounded-full bg-green-400"></span>
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                    )}
                    <span>Coach</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {enrollment.agreement?.employeeSignature ? (
                      <span className="w-2 h-2 rounded-full bg-green-400"></span>
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                    )}
                    <span>Employee</span>
                  </div>
                </div>
              </div>

              {/* Agreement Document */}
              <div className={`rounded-lg p-4 ${isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white border border-gray-200"}`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                    Enrollment Agreement
                  </h3>
                  <button
                    onClick={() => window.print()}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isDark
                        ? "bg-slate-600 text-slate-200 hover:bg-slate-500"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    Print
                  </button>
                </div>

                {/* Agreement Text */}
                <div className={`whitespace-pre-wrap text-sm p-4 rounded-lg mb-6 ${isDark ? "bg-slate-900/50 text-slate-300" : "bg-gray-50 text-gray-700"}`}>
{`ATTENDANCE RECOVERY PROGRAM (ARP) ENROLLMENT AGREEMENT

I, ${enrollment.personnel?.name || "Unknown"}, acknowledge that I am being enrolled in the Attendance Recovery Program (ARP) at IE Tire Services, Inc. By signing this agreement, I understand and agree to the following terms:

PROGRAM OVERVIEW:
• Tier ${enrollment.programTier} Enrollment
• Program Duration: ${enrollment.programDurationDays} days
• Required Meetings: ${enrollment.meetings.length} sessions with assigned Coach
• Assigned Coach: ${enrollment.coach?.name || "Unknown"}

PROGRAM REQUIREMENTS:
1. I will attend ALL scheduled meetings with my assigned Coach
2. I will complete all assigned training modules
3. I will maintain ZERO attendance infractions for the entire program duration
4. I understand that this program is designed to help me succeed

CONSEQUENCES:
• SUCCESS: Upon successful completion, all prior attendance write-ups will be cleared from my record. I will receive a Certificate of Completion.
• FAILURE: If I receive ANY write-up (attendance, safety, conduct, or other) during the program, OR if I miss any scheduled Coach meetings:
  - My enrollment will be immediately terminated
  - I may be subject to disciplinary action up to and including termination
  - I will be ineligible to re-enroll in ARP for 90 days

I have read and understand the terms of this agreement. I am committed to successfully completing the Attendance Recovery Program and improving my attendance record.`}
                </div>

                {/* Signature Section */}
                <div className={`border-t pt-6 ${isDark ? "border-slate-700" : "border-gray-200"}`}>
                  <h4 className={`font-medium mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
                    Signatures
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Admin/HR Signature */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-medium ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                          Admin/HR Representative
                        </span>
                        {enrollment.agreement?.adminSignedAt && (
                          <span className={`text-xs ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                            {new Date(enrollment.agreement.adminSignedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {enrollment.agreement?.adminName && (
                        <p className={`text-xs mb-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                          {enrollment.agreement.adminName}, {enrollment.agreement.adminTitle}
                        </p>
                      )}
                      <SignaturePad
                        isDark={isDark}
                        savedSignature={enrollment.agreement?.adminSignature}
                        disabled={!!enrollment.agreement?.adminSignature || enrollment.status !== "active"}
                        onSave={handleSignAsAdmin}
                        width={300}
                        height={100}
                      />
                    </div>

                    {/* Coach Signature */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-medium ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                          Coach
                        </span>
                        {enrollment.agreement?.coachSignedAt && (
                          <span className={`text-xs ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                            {new Date(enrollment.agreement.coachSignedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <p className={`text-xs mb-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                        {enrollment.coach?.name || "Unknown Coach"}
                      </p>
                      <SignaturePad
                        isDark={isDark}
                        savedSignature={enrollment.agreement?.coachSignature}
                        disabled={!!enrollment.agreement?.coachSignature || enrollment.status !== "active"}
                        onSave={handleSignAsCoach}
                        width={300}
                        height={100}
                      />
                    </div>

                    {/* Employee Signature */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-medium ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                          Employee
                        </span>
                        {enrollment.agreement?.employeeSignedAt && (
                          <span className={`text-xs ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                            {new Date(enrollment.agreement.employeeSignedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <p className={`text-xs mb-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                        {enrollment.personnel?.name || "Unknown Employee"}
                      </p>
                      <SignaturePad
                        isDark={isDark}
                        savedSignature={enrollment.agreement?.employeeSignature}
                        disabled={!!enrollment.agreement?.employeeSignature || enrollment.status !== "active"}
                        onSave={handleSignAsEmployee}
                        width={300}
                        height={100}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Meetings Tab */}
          {activeTab === "meetings" && (
            <div className={`rounded-lg overflow-hidden ${isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white border border-gray-200"}`}>
              <div className="divide-y divide-slate-700">
                {enrollment.meetings.map((meeting) => (
                  <div key={meeting._id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                            Meeting #{meeting.meetingNumber}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${meetingStatusColors[meeting.status]}`}>
                            {meeting.status}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            meeting.meetingType === "initial"
                              ? "bg-purple-500/20 text-purple-400"
                              : meeting.meetingType === "final"
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-slate-500/20 text-slate-400"
                          }`}>
                            {meeting.meetingType}
                          </span>
                        </div>
                        <p className={`text-sm mt-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                          Scheduled: {formatDate(meeting.scheduledDate)}
                          {meeting.completedDate && ` | Completed: ${formatDate(meeting.completedDate)}`}
                        </p>
                        {meeting.notes && (
                          <p className={`text-sm mt-2 ${isDark ? "text-slate-300" : "text-gray-600"}`}>
                            <strong>Notes:</strong> {meeting.notes}
                          </p>
                        )}
                        {meeting.actionItems && (
                          <p className={`text-sm mt-1 ${isDark ? "text-slate-300" : "text-gray-600"}`}>
                            <strong>Action Items:</strong> {meeting.actionItems}
                          </p>
                        )}
                      </div>
                      {meeting.status === "scheduled" && enrollment.status === "active" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedMeeting(meeting._id);
                              setShowMeetingModal(true);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                              isDark
                                ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                                : "bg-green-100 text-green-600 hover:bg-green-200"
                            }`}
                          >
                            Record
                          </button>
                          <button
                            onClick={() => {
                              setSelectedMeeting(meeting._id);
                              setShowRescheduleModal(true);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                              isDark
                                ? "bg-slate-600 text-slate-300 hover:bg-slate-500"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            Reschedule
                          </button>
                          <button
                            onClick={() => handleMissMeeting(meeting._id)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                              isDark
                                ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                : "bg-red-100 text-red-600 hover:bg-red-200"
                            }`}
                          >
                            Missed
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Root Cause Tab */}
          {activeTab === "root-cause" && (
            <div className={`rounded-lg p-4 ${isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white border border-gray-200"}`}>
              <h3 className={`font-medium mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
                Root Cause Assessment
              </h3>
              <p className={`text-sm mb-4 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                Identify the underlying factors contributing to attendance issues.
              </p>

              <div className="space-y-3 mb-6">
                {ROOT_CAUSE_OPTIONS.map((option) => (
                  <label
                    key={option.key}
                    className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      isDark
                        ? "hover:bg-slate-700/50"
                        : "hover:bg-gray-50"
                    } ${rootCause[option.key as keyof typeof rootCause] ? (isDark ? "bg-cyan-500/10 border border-cyan-500/30" : "bg-blue-50 border border-blue-200") : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={!!rootCause[option.key as keyof typeof rootCause]}
                      onChange={(e) => setRootCause({ ...rootCause, [option.key]: e.target.checked })}
                      className="mt-1"
                    />
                    <div>
                      <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                        {option.label}
                      </p>
                      <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                        {option.description}
                      </p>
                    </div>
                  </label>
                ))}

                {/* Other */}
                <label
                  className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    isDark
                      ? "hover:bg-slate-700/50"
                      : "hover:bg-gray-50"
                  } ${rootCause.other ? (isDark ? "bg-cyan-500/10 border border-cyan-500/30" : "bg-blue-50 border border-blue-200") : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={rootCause.other}
                    onChange={(e) => setRootCause({ ...rootCause, other: e.target.checked })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                      Other
                    </p>
                    {rootCause.other && (
                      <input
                        type="text"
                        value={rootCause.otherDescription}
                        onChange={(e) => setRootCause({ ...rootCause, otherDescription: e.target.value })}
                        placeholder="Describe other factors..."
                        className={`w-full mt-2 px-3 py-2 rounded-lg border text-sm ${
                          isDark
                            ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                            : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                        }`}
                      />
                    )}
                  </div>
                </label>
              </div>

              {/* Summary */}
              <div className="mb-6">
                <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                  Summary / Additional Notes
                </label>
                <textarea
                  value={rootCause.summary}
                  onChange={(e) => setRootCause({ ...rootCause, summary: e.target.value })}
                  rows={4}
                  placeholder="Add any additional observations or context..."
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${
                    isDark
                      ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                  }`}
                />
              </div>

              <button
                onClick={handleSaveRootCause}
                disabled={isProcessing || enrollment.status !== "active"}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  isDark
                    ? "bg-cyan-500 hover:bg-cyan-400 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                } disabled:opacity-50`}
              >
                {isProcessing ? "Saving..." : "Save Assessment"}
              </button>
            </div>
          )}

          {/* Training Tab */}
          {activeTab === "training" && (
            <div className="space-y-4">
              {/* Assigned Training */}
              <div className={`rounded-lg overflow-hidden ${isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white border border-gray-200"}`}>
                <div className={`px-4 py-3 border-b ${isDark ? "border-slate-700" : "border-gray-200"}`}>
                  <h3 className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                    Assigned Training Modules
                  </h3>
                </div>
                {enrollment.training.length === 0 ? (
                  <div className="p-4 text-center">
                    <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                      No training modules assigned yet
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-700">
                    {enrollment.training.map((training) => (
                      <div key={training._id} className="p-4 flex items-center justify-between">
                        <div>
                          <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                            {training.moduleName}
                          </p>
                          <p className={`text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                            Assigned: {formatDate(training.assignedDate)}
                            {training.dueDate && ` | Due: ${formatDate(training.dueDate)}`}
                            {training.completedDate && ` | Completed: ${formatDate(training.completedDate)}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-1 rounded-full border ${trainingStatusColors[training.status]}`}>
                            {training.status.replace("_", " ")}
                          </span>
                          {training.status !== "completed" && enrollment.status === "active" && (
                            <button
                              onClick={() => handleCompleteTraining(training._id)}
                              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                                isDark
                                  ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                                  : "bg-green-100 text-green-600 hover:bg-green-200"
                              }`}
                            >
                              Mark Complete
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Available Training */}
              {enrollment.status === "active" && availableModules.length > 0 && (
                <div className={`rounded-lg overflow-hidden ${isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white border border-gray-200"}`}>
                  <div className={`px-4 py-3 border-b ${isDark ? "border-slate-700" : "border-gray-200"}`}>
                    <h3 className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                      Available Training Modules
                    </h3>
                  </div>
                  <div className="divide-y divide-slate-700">
                    {availableModules.map((module) => (
                      <div key={module.code} className="p-4 flex items-center justify-between">
                        <div>
                          <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                            {module.name}
                          </p>
                          {module.required && (
                            <span className="text-xs text-amber-400">Required</span>
                          )}
                        </div>
                        <button
                          onClick={() => handleAssignTraining(module.code)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                            isDark
                              ? "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                              : "bg-blue-100 text-blue-600 hover:bg-blue-200"
                          }`}
                        >
                          Assign
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Record Meeting Modal */}
      {showMeetingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className={`w-full max-w-md rounded-xl p-6 ${isDark ? "bg-slate-800" : "bg-white"}`}>
            <h2 className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
              Record Meeting
            </h2>

            <div className="space-y-4 mb-6">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                  Meeting Notes
                </label>
                <textarea
                  value={meetingNotes}
                  onChange={(e) => setMeetingNotes(e.target.value)}
                  rows={4}
                  placeholder="Discussion points, observations..."
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${
                    isDark
                      ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                  }`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                  Action Items
                </label>
                <textarea
                  value={meetingActionItems}
                  onChange={(e) => setMeetingActionItems(e.target.value)}
                  rows={3}
                  placeholder="Tasks for the employee to complete..."
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${
                    isDark
                      ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                  }`}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowMeetingModal(false);
                  setSelectedMeeting(null);
                  setMeetingNotes("");
                  setMeetingActionItems("");
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
                onClick={handleRecordMeeting}
                disabled={isProcessing}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isDark
                    ? "bg-green-500 hover:bg-green-400 text-white"
                    : "bg-green-600 hover:bg-green-700 text-white"
                } disabled:opacity-50`}
              >
                {isProcessing ? "Saving..." : "Record Complete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className={`w-full max-w-md rounded-xl p-6 ${isDark ? "bg-slate-800" : "bg-white"}`}>
            <h2 className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
              Reschedule Meeting
            </h2>

            <div className="mb-6">
              <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                New Date
              </label>
              <input
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border text-sm ${
                  isDark
                    ? "bg-slate-700 border-slate-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRescheduleModal(false);
                  setSelectedMeeting(null);
                  setRescheduleDate("");
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
                onClick={handleRescheduleMeeting}
                disabled={!rescheduleDate || isProcessing}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isDark
                    ? "bg-cyan-500 hover:bg-cyan-400 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                } disabled:opacity-50`}
              >
                {isProcessing ? "Saving..." : "Reschedule"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fail Enrollment Modal */}
      {showFailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className={`w-full max-w-md rounded-xl p-6 ${isDark ? "bg-slate-800" : "bg-white"}`}>
            <h2 className={`text-lg font-bold mb-4 text-red-400`}>
              Record Program Failure
            </h2>

            <p className={`text-sm mb-4 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
              This will mark the ARP enrollment as failed. The employee will have a 90-day cooldown before being eligible for re-enrollment.
            </p>

            <div className="mb-6">
              <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                Failure Reason
              </label>
              <textarea
                value={failReason}
                onChange={(e) => setFailReason(e.target.value)}
                rows={3}
                placeholder="Describe why the program is being failed..."
                className={`w-full px-3 py-2 rounded-lg border text-sm ${
                  isDark
                    ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                }`}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowFailModal(false);
                  setFailReason("");
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
                onClick={handleFailEnrollment}
                disabled={!failReason.trim() || isProcessing}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors bg-red-500 hover:bg-red-400 text-white disabled:opacity-50`}
              >
                {isProcessing ? "Processing..." : "Confirm Failure"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function ARPDetailPage() {
  return (
    <Protected>
      <ARPDetailContent />
    </Protected>
  );
}
