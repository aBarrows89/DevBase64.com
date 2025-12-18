"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Protected from "../../protected";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/app/auth-context";

const STATUS_OPTIONS = [
  { value: "new", label: "New", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
  { value: "reviewed", label: "Reviewed", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  { value: "contacted", label: "Contacted", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  { value: "scheduled", label: "Scheduled", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  { value: "interviewed", label: "Interviewed", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  { value: "hired", label: "Hired", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  { value: "rejected", label: "Rejected", color: "bg-red-500/20 text-red-400 border-red-500/30" },
];

const RECOMMENDED_ACTION_STYLES: Record<string, string> = {
  strong_candidate: "bg-green-500/20 text-green-400 border-green-500/30",
  worth_interviewing: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  review_carefully: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  likely_pass: "bg-red-500/20 text-red-400 border-red-500/30",
};

function ApplicationDetailContent({ id }: { id: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const application = useQuery(api.applications.getById, {
    applicationId: id as Id<"applications">,
  });
  const updateStatus = useMutation(api.applications.updateStatus);
  const deleteApplication = useMutation(api.applications.remove);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Interview state
  const [showNewInterview, setShowNewInterview] = useState(false);
  const [interviewerName, setInterviewerName] = useState("");
  const [selectedRound, setSelectedRound] = useState(1);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [expandedRound, setExpandedRound] = useState<number | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<number | null>(null);
  const [answerInputs, setAnswerInputs] = useState<Record<string, string>>({});

  // Interview mutations and actions
  const generateQuestions = useAction(api.aiInterview.generateInterviewQuestions);
  const evaluateInterview = useAction(api.aiInterview.evaluateInterview);
  const startInterviewRound = useMutation(api.applications.startInterviewRound);
  const updateInterviewAnswer = useMutation(api.applications.updateInterviewAnswer);
  const updateInterviewNotes = useMutation(api.applications.updateInterviewNotes);
  const saveInterviewEvaluation = useMutation(api.applications.saveInterviewEvaluation);
  const deleteInterviewRound = useMutation(api.applications.deleteInterviewRound);
  const updateNotes = useMutation(api.applications.updateNotes);
  const scheduleInterview = useMutation(api.applications.scheduleInterview);
  const clearScheduledInterview = useMutation(api.applications.clearScheduledInterview);
  const createPersonnel = useMutation(api.personnel.createFromApplication);

  // Check if personnel record already exists for this application
  const existingPersonnel = useQuery(api.personnel.getByApplicationId, {
    applicationId: id as Id<"applications">,
  });

  // Notes state
  const [notesInput, setNotesInput] = useState("");
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Scheduling state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduleLocation, setScheduleLocation] = useState("In-person");
  const [isScheduling, setIsScheduling] = useState(false);

  // Hiring state
  const [showHireModal, setShowHireModal] = useState(false);
  const [isHiring, setIsHiring] = useState(false);
  const [hireForm, setHireForm] = useState({
    position: "",
    department: "",
    employeeType: "full_time",
    hireDate: new Date().toISOString().split("T")[0],
    hourlyRate: "",
  });

  const handleDelete = async () => {
    if (!application) return;
    setIsDeleting(true);
    try {
      await deleteApplication({ applicationId: application._id });
      router.push("/applications");
    } catch (error) {
      console.error("Failed to delete application:", error);
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleHire = async () => {
    if (!application || !hireForm.position || !hireForm.department) return;
    setIsHiring(true);
    try {
      const personnelId = await createPersonnel({
        applicationId: application._id,
        position: hireForm.position,
        department: hireForm.department,
        employeeType: hireForm.employeeType,
        hireDate: hireForm.hireDate,
        hourlyRate: hireForm.hourlyRate ? parseFloat(hireForm.hourlyRate) : undefined,
      });
      setShowHireModal(false);
      // Navigate to the new personnel record
      router.push(`/personnel/${personnelId}`);
    } catch (error) {
      console.error("Failed to hire applicant:", error);
      setIsHiring(false);
    }
  };

  if (!application) {
    return (
      <div className="flex h-screen bg-slate-900">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-slate-400">Loading...</div>
        </main>
      </div>
    );
  }

  const handleStatusChange = async (newStatus: string) => {
    await updateStatus({ applicationId: application._id, status: newStatus });
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-green-400";
    if (score >= 50) return "text-amber-400";
    return "text-red-400";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 70) return "bg-green-500/20 border-green-500/30";
    if (score >= 50) return "bg-amber-500/20 border-amber-500/30";
    return "bg-red-500/20 border-red-500/30";
  };

  // Interview handlers
  const handleStartInterview = async () => {
    if (!application || !interviewerName.trim()) return;
    setIsGeneratingQuestions(true);
    try {
      const result = await generateQuestions({
        applicationId: application._id,
        round: selectedRound,
        interviewerName: interviewerName.trim(),
      });

      if (result.questions.length > 0) {
        await startInterviewRound({
          applicationId: application._id,
          round: selectedRound,
          interviewerName: interviewerName.trim(),
          questions: result.questions,
        });
        setShowNewInterview(false);
        setInterviewerName("");
        setExpandedRound(selectedRound);
      }
    } catch (error) {
      console.error("Failed to start interview:", error);
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const handleSaveAnswer = async (round: number, questionIndex: number, answer: string) => {
    if (!application) return;
    await updateInterviewAnswer({
      applicationId: application._id,
      round,
      questionIndex,
      answer,
    });
  };

  const handleEvaluateInterview = async (round: number) => {
    if (!application) return;
    setIsEvaluating(round);
    try {
      const result = await evaluateInterview({
        applicationId: application._id,
        round,
      });

      if (!result.error) {
        await saveInterviewEvaluation({
          applicationId: application._id,
          round,
          evaluation: {
            overallScore: result.overallScore,
            strengths: result.strengths,
            concerns: result.concerns,
            recommendation: result.recommendation,
            detailedFeedback: result.detailedFeedback,
          },
        });
      }
    } catch (error) {
      console.error("Failed to evaluate interview:", error);
    } finally {
      setIsEvaluating(null);
    }
  };

  const handleDeleteRound = async (round: number) => {
    if (!application) return;
    if (!confirm(`Delete interview round ${round}? This cannot be undone.`)) return;
    await deleteInterviewRound({ applicationId: application._id, round });
    if (expandedRound === round) setExpandedRound(null);
  };

  const getNextRound = () => {
    const existingRounds = application?.interviewRounds?.map((r) => r.round) || [];
    for (let i = 1; i <= 3; i++) {
      if (!existingRounds.includes(i)) return i;
    }
    return null;
  };

  return (
    <div className="flex h-screen bg-slate-900">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur-sm border-b border-slate-700 px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/applications"
                className="p-2 text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {application.firstName} {application.lastName}
                </h1>
                <p className="text-slate-400 text-sm">
                  Applied for: {application.appliedJobTitle}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Show "View Personnel Record" button if already hired */}
              {existingPersonnel && (
                <button
                  onClick={() => router.push(`/personnel/${existingPersonnel._id}`)}
                  className="px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/30 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  View Personnel Record
                </button>
              )}
              {/* Show "Hire" button if not already hired */}
              {!existingPersonnel && application.status !== "rejected" && (
                <button
                  onClick={() => {
                    setHireForm({
                      ...hireForm,
                      position: application.appliedJobTitle,
                    });
                    setShowHireModal(true);
                  }}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Hire Applicant
                </button>
              )}
              <select
                value={application.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className={`px-4 py-2 rounded-lg border ${
                  STATUS_OPTIONS.find((s) => s.value === application.status)?.color ||
                  "bg-slate-700"
                } bg-transparent focus:outline-none`}
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value} className="bg-slate-800 text-white">
                    {status.label}
                  </option>
                ))}
              </select>
              {(user?.role === "super_admin" || user?.role === "admin") && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-md mx-4">
              <h3 className="text-xl font-bold text-white mb-4">Delete Application?</h3>
              <p className="text-slate-300 mb-6">
                Are you sure you want to delete the application from{" "}
                <span className="font-semibold text-white">
                  {application.firstName} {application.lastName}
                </span>
                ? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="p-8 space-y-6">
          {/* Contact Info & Quick Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Contact Info */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Contact Information</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-500">Email</p>
                  <a href={`mailto:${application.email}`} className="text-cyan-400 hover:underline">
                    {application.email}
                  </a>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Phone</p>
                  <a href={`tel:${application.phone}`} className="text-white hover:text-cyan-400">
                    {application.phone}
                  </a>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Applied</p>
                  <p className="text-white">
                    {new Date(application.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Overall Scores */}
            {application.candidateAnalysis && (
              <div className="lg:col-span-2 bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Candidate Scores</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className={`p-4 rounded-lg border text-center ${getScoreBgColor(application.candidateAnalysis.overallScore)}`}>
                    <p className={`text-3xl font-bold ${getScoreColor(application.candidateAnalysis.overallScore)}`}>
                      {application.candidateAnalysis.overallScore}%
                    </p>
                    <p className="text-sm text-slate-400 mt-1">Overall</p>
                  </div>
                  <div className={`p-4 rounded-lg border text-center ${getScoreBgColor(application.candidateAnalysis.stabilityScore)}`}>
                    <p className={`text-3xl font-bold ${getScoreColor(application.candidateAnalysis.stabilityScore)}`}>
                      {application.candidateAnalysis.stabilityScore}%
                    </p>
                    <p className="text-sm text-slate-400 mt-1">Stability</p>
                  </div>
                  <div className={`p-4 rounded-lg border text-center ${getScoreBgColor(application.candidateAnalysis.experienceScore)}`}>
                    <p className={`text-3xl font-bold ${getScoreColor(application.candidateAnalysis.experienceScore)}`}>
                      {application.candidateAnalysis.experienceScore}%
                    </p>
                    <p className="text-sm text-slate-400 mt-1">Experience</p>
                  </div>
                  <div className="p-4 rounded-lg border border-slate-600 bg-slate-900/50 text-center">
                    <p className="text-3xl font-bold text-white">
                      {application.candidateAnalysis.totalYearsExperience.toFixed(1)}
                    </p>
                    <p className="text-sm text-slate-400 mt-1">Years Exp.</p>
                  </div>
                </div>

                {/* Recommended Action */}
                <div className="mt-4">
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${
                    RECOMMENDED_ACTION_STYLES[application.candidateAnalysis.recommendedAction] || "bg-slate-700"
                  }`}>
                    <span className="text-sm font-medium">
                      Recommended: {application.candidateAnalysis.recommendedAction.replace(/_/g, " ").toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Cover Message */}
          {application.message && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-3">Cover Message</h2>
              <p className="text-slate-300 whitespace-pre-wrap">{application.message}</p>
            </div>
          )}

          {/* Red & Green Flags */}
          {application.candidateAnalysis && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Red Flags */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" />
                  </svg>
                  Red Flags ({application.candidateAnalysis.redFlags.length})
                </h2>
                {application.candidateAnalysis.redFlags.length === 0 ? (
                  <p className="text-slate-500 text-sm">No red flags identified</p>
                ) : (
                  <div className="space-y-3">
                    {application.candidateAnalysis.redFlags.map((flag, i) => (
                      <div key={i} className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-bold text-red-400 uppercase px-2 py-0.5 bg-red-500/20 rounded">
                            {flag.type.replace(/_/g, " ")}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            flag.severity === "high"
                              ? "bg-red-500/30 text-red-300"
                              : flag.severity === "medium"
                                ? "bg-amber-500/30 text-amber-300"
                                : "bg-slate-500/30 text-slate-300"
                          }`}>
                            {flag.severity}
                          </span>
                        </div>
                        <p className="text-sm text-slate-300">{flag.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Green Flags */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-green-400 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Green Flags ({application.candidateAnalysis.greenFlags.length})
                </h2>
                {application.candidateAnalysis.greenFlags.length === 0 ? (
                  <p className="text-slate-500 text-sm">No green flags identified</p>
                ) : (
                  <div className="space-y-3">
                    {application.candidateAnalysis.greenFlags.map((flag, i) => (
                      <div key={i} className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <span className="text-xs font-bold text-green-400 uppercase px-2 py-0.5 bg-green-500/20 rounded mb-2 inline-block">
                          {flag.type.replace(/_/g, " ")}
                        </span>
                        <p className="text-sm text-slate-300 mt-2">{flag.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Employment History */}
          {application.candidateAnalysis && application.candidateAnalysis.employmentHistory.length > 0 && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Employment History</h2>
              <div className="space-y-4">
                {application.candidateAnalysis.employmentHistory.map((job, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                    <div>
                      <p className="text-white font-medium">{job.title}</p>
                      <p className="text-slate-400 text-sm">{job.company}</p>
                      {job.startDate && (
                        <p className="text-slate-500 text-xs mt-1">
                          {job.startDate} - {job.endDate || "Present"}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-white font-medium">{job.duration}</p>
                      <p className="text-slate-500 text-xs">{job.durationMonths} months</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 pt-4 border-t border-slate-700">
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">
                    {application.candidateAnalysis.averageTenureMonths.toFixed(0)}
                  </p>
                  <p className="text-sm text-slate-400">Avg. Tenure (months)</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">
                    {application.candidateAnalysis.longestTenureMonths}
                  </p>
                  <p className="text-sm text-slate-400">Longest Tenure (months)</p>
                </div>
              </div>
            </div>
          )}

          {/* Interview Rounds */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Interview Rounds
                {application.interviewRounds && application.interviewRounds.length > 0 && (
                  <span className="text-sm bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded">
                    {application.interviewRounds.length}/3 completed
                  </span>
                )}
              </h2>
              {getNextRound() && (
                <button
                  onClick={() => {
                    setSelectedRound(getNextRound()!);
                    setShowNewInterview(true);
                  }}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Start Round {getNextRound()}
                </button>
              )}
            </div>

            {/* Existing Interview Rounds */}
            {application.interviewRounds && application.interviewRounds.length > 0 ? (
              <div className="space-y-4">
                {application.interviewRounds
                  .sort((a, b) => a.round - b.round)
                  .map((round) => (
                    <div
                      key={round.round}
                      className="bg-slate-900/50 border border-slate-700 rounded-lg overflow-hidden"
                    >
                      {/* Round Header */}
                      <div
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-800/50 transition-colors"
                        onClick={() =>
                          setExpandedRound(expandedRound === round.round ? null : round.round)
                        }
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                            <span className="text-cyan-400 font-bold">{round.round}</span>
                          </div>
                          <div>
                            <p className="text-white font-medium">Round {round.round}</p>
                            <p className="text-slate-400 text-sm">
                              Interviewer: {round.interviewerName} • {new Date(round.conductedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {round.aiEvaluation && (
                            <div className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreBgColor(round.aiEvaluation.overallScore)}`}>
                              <span className={getScoreColor(round.aiEvaluation.overallScore)}>
                                {round.aiEvaluation.overallScore}%
                              </span>
                            </div>
                          )}
                          <svg
                            className={`w-5 h-5 text-slate-400 transition-transform ${
                              expandedRound === round.round ? "rotate-180" : ""
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>

                      {/* Expanded Content */}
                      {expandedRound === round.round && (
                        <div className="border-t border-slate-700 p-4 space-y-4">
                          {/* Questions & Answers */}
                          <div className="space-y-4">
                            {round.questions.map((q, qIndex) => (
                              <div key={qIndex} className="bg-slate-800/50 rounded-lg p-4">
                                <div className="flex items-start gap-3 mb-3">
                                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 text-xs flex items-center justify-center font-medium">
                                    {qIndex + 1}
                                  </span>
                                  <p className="text-white font-medium">{q.question}</p>
                                  {q.aiGenerated && (
                                    <span className="flex-shrink-0 text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">
                                      AI
                                    </span>
                                  )}
                                </div>
                                <div className="ml-9">
                                  {q.answer ? (
                                    <p className="text-slate-300 text-sm whitespace-pre-wrap">{q.answer}</p>
                                  ) : (
                                    <div className="space-y-2">
                                      <textarea
                                        placeholder="Record candidate's answer..."
                                        value={answerInputs[`${round.round}-${qIndex}`] || ""}
                                        onChange={(e) =>
                                          setAnswerInputs((prev) => ({
                                            ...prev,
                                            [`${round.round}-${qIndex}`]: e.target.value,
                                          }))
                                        }
                                        rows={3}
                                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 resize-none text-sm"
                                      />
                                      <button
                                        onClick={() => {
                                          const answer = answerInputs[`${round.round}-${qIndex}`];
                                          if (answer?.trim()) {
                                            handleSaveAnswer(round.round, qIndex, answer.trim());
                                            setAnswerInputs((prev) => {
                                              const newInputs = { ...prev };
                                              delete newInputs[`${round.round}-${qIndex}`];
                                              return newInputs;
                                            });
                                          }
                                        }}
                                        disabled={!answerInputs[`${round.round}-${qIndex}`]?.trim()}
                                        className="px-3 py-1 bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded text-sm transition-colors"
                                      >
                                        Save Answer
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Interview Notes */}
                          <div className="pt-4 border-t border-slate-700">
                            <label className="block text-sm text-slate-400 mb-2">Interview Notes</label>
                            <textarea
                              placeholder="Add general notes about this interview..."
                              defaultValue={round.interviewNotes || ""}
                              onBlur={(e) => {
                                if (e.target.value !== (round.interviewNotes || "")) {
                                  updateInterviewNotes({
                                    applicationId: application._id,
                                    round: round.round,
                                    notes: e.target.value,
                                  });
                                }
                              }}
                              rows={3}
                              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 resize-none text-sm"
                            />
                          </div>

                          {/* AI Evaluation */}
                          {round.aiEvaluation ? (
                            <div className="pt-4 border-t border-slate-700 space-y-4">
                              <h4 className="text-white font-medium flex items-center gap-2">
                                <svg className="w-4 h-4 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                                </svg>
                                AI Evaluation
                              </h4>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Strengths */}
                                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                                  <p className="text-green-400 font-medium text-sm mb-2">Strengths</p>
                                  <ul className="space-y-1">
                                    {round.aiEvaluation.strengths.map((s, i) => (
                                      <li key={i} className="text-slate-300 text-sm flex items-start gap-2">
                                        <svg className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        {s}
                                      </li>
                                    ))}
                                  </ul>
                                </div>

                                {/* Concerns */}
                                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                                  <p className="text-amber-400 font-medium text-sm mb-2">Concerns</p>
                                  <ul className="space-y-1">
                                    {round.aiEvaluation.concerns.map((c, i) => (
                                      <li key={i} className="text-slate-300 text-sm flex items-start gap-2">
                                        <svg className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                        {c}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>

                              <div className={`p-4 rounded-lg border ${
                                round.aiEvaluation.recommendation.includes("STRONG YES") || round.aiEvaluation.recommendation.includes("YES")
                                  ? "bg-green-500/10 border-green-500/30"
                                  : round.aiEvaluation.recommendation.includes("MAYBE")
                                    ? "bg-amber-500/10 border-amber-500/30"
                                    : "bg-red-500/10 border-red-500/30"
                              }`}>
                                <p className="text-white font-medium text-sm mb-1">Recommendation</p>
                                <p className="text-slate-300 text-sm">{round.aiEvaluation.recommendation}</p>
                              </div>

                              <div className="bg-slate-800/50 rounded-lg p-4">
                                <p className="text-slate-400 font-medium text-sm mb-2">Detailed Feedback</p>
                                <p className="text-slate-300 text-sm whitespace-pre-wrap">{round.aiEvaluation.detailedFeedback}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="pt-4 border-t border-slate-700">
                              <button
                                onClick={() => handleEvaluateInterview(round.round)}
                                disabled={
                                  isEvaluating === round.round ||
                                  round.questions.some((q) => !q.answer || q.answer.trim() === "")
                                }
                                className="w-full px-4 py-3 bg-purple-500/20 border border-purple-500/30 text-purple-400 hover:bg-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2"
                              >
                                {isEvaluating === round.round ? (
                                  <>
                                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Evaluating with AI...
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                                    </svg>
                                    Generate AI Evaluation
                                  </>
                                )}
                              </button>
                              {round.questions.some((q) => !q.answer || q.answer.trim() === "") && (
                                <p className="text-amber-400 text-xs text-center mt-2">
                                  Complete all answers before generating evaluation
                                </p>
                              )}
                            </div>
                          )}

                          {/* Delete Round Button */}
                          <div className="pt-4 border-t border-slate-700 flex justify-end">
                            <button
                              onClick={() => handleDeleteRound(round.round)}
                              className="px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors text-sm flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete Round
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-slate-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-slate-400">No interviews conducted yet</p>
                <p className="text-slate-500 text-sm mt-1">Start the first interview round to track the hiring process</p>
              </div>
            )}
          </div>

          {/* New Interview Modal */}
          {showNewInterview && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-md mx-4 w-full">
                <h3 className="text-xl font-bold text-white mb-4">Start Interview Round {selectedRound}</h3>
                <p className="text-slate-400 text-sm mb-6">
                  AI will generate personalized interview questions based on the candidate&apos;s profile and the position they applied for.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Interviewer Name</label>
                    <input
                      type="text"
                      placeholder="Enter your name"
                      value={interviewerName}
                      onChange={(e) => setInterviewerName(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Interview Round</label>
                    <select
                      value={selectedRound}
                      onChange={(e) => setSelectedRound(Number(e.target.value))}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                    >
                      {[1, 2, 3]
                        .filter((r) => !application.interviewRounds?.some((ir) => ir.round === r))
                        .map((r) => (
                          <option key={r} value={r}>
                            Round {r} - {r === 1 ? "Initial Screening" : r === 2 ? "Skills Assessment" : "Final Interview"}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowNewInterview(false);
                      setInterviewerName("");
                    }}
                    disabled={isGeneratingQuestions}
                    className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleStartInterview}
                    disabled={!interviewerName.trim() || isGeneratingQuestions}
                    className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isGeneratingQuestions ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Generating Questions...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                        </svg>
                        Generate Questions
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* AI Job Match Scores */}
          {application.aiAnalysis && application.aiAnalysis.allScores.length > 0 && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">AI Job Match Analysis</h2>
              <div className="space-y-3">
                {application.aiAnalysis.allScores
                  .sort((a, b) => b.score - a.score)
                  .map((score, i) => (
                    <div
                      key={i}
                      className={`p-4 rounded-lg border ${
                        score.jobTitle === application.appliedJobTitle
                          ? "bg-cyan-500/10 border-cyan-500/30"
                          : "bg-slate-900/50 border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-white font-medium">{score.jobTitle}</p>
                            {score.jobTitle === application.appliedJobTitle && (
                              <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded">
                                Applied
                              </span>
                            )}
                          </div>
                          {score.matchedKeywords.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {score.matchedKeywords.map((keyword, j) => (
                                <span
                                  key={j}
                                  className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded"
                                >
                                  {keyword}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className={`text-2xl font-bold ${getScoreColor(score.score)}`}>
                          {score.score}%
                        </div>
                      </div>
                      {score.reasoning && (
                        <p className="text-sm text-slate-400 mt-2">{score.reasoning}</p>
                      )}
                    </div>
                  ))}
              </div>
              {application.aiAnalysis.extractedSkills.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <p className="text-sm text-slate-400 mb-2">Extracted Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {application.aiAnalysis.extractedSkills.map((skill, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full text-sm"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Hiring Team Notes */}
          {application.candidateAnalysis && (
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-cyan-400 mb-3">Hiring Team Notes</h2>
              <p className="text-slate-300">{application.candidateAnalysis.hiringTeamNotes}</p>
            </div>
          )}

          {/* Scheduled Interview Banner */}
          {application.scheduledInterviewDate && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
                    <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-orange-400">Interview Scheduled</h2>
                    <p className="text-white">
                      {new Date(application.scheduledInterviewDate + "T00:00:00").toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                      {application.scheduledInterviewTime && (
                        <span className="text-slate-300"> at {application.scheduledInterviewTime}</span>
                      )}
                    </p>
                    {application.scheduledInterviewLocation && (
                      <p className="text-slate-400 text-sm mt-1">
                        Location: {application.scheduledInterviewLocation}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setScheduleDate(application.scheduledInterviewDate || "");
                      setScheduleTime(application.scheduledInterviewTime || "");
                      setScheduleLocation(application.scheduledInterviewLocation || "In-person");
                      setShowScheduleModal(true);
                    }}
                    className="px-3 py-2 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-lg hover:bg-orange-500/30 transition-colors text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm("Clear the scheduled interview?")) {
                        await clearScheduledInterview({ applicationId: application._id });
                      }
                    }}
                    className="px-3 py-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-sm"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Schedule Interview Button (when not scheduled) */}
          {!application.scheduledInterviewDate && (
            <div className="bg-slate-800/50 border border-slate-700 border-dashed rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center">
                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Schedule Interview</h2>
                    <p className="text-slate-400 text-sm">No interview scheduled yet</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowScheduleModal(true)}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Schedule
                </button>
              </div>
            </div>
          )}

          {/* Schedule Interview Modal */}
          {showScheduleModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-md mx-4 w-full">
                <h3 className="text-xl font-bold text-white mb-4">
                  {application.scheduledInterviewDate ? "Edit Interview Schedule" : "Schedule Interview"}
                </h3>
                <p className="text-slate-400 text-sm mb-6">
                  Set the date, time, and location for the interview with {application.firstName}.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Date *</label>
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Time *</label>
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Location</label>
                    <select
                      value={scheduleLocation}
                      onChange={(e) => setScheduleLocation(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="In-person">In-person</option>
                      <option value="Phone">Phone</option>
                      <option value="Video">Video Call</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowScheduleModal(false);
                      setScheduleDate("");
                      setScheduleTime("");
                      setScheduleLocation("In-person");
                    }}
                    disabled={isScheduling}
                    className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (!scheduleDate || !scheduleTime) return;
                      setIsScheduling(true);
                      try {
                        await scheduleInterview({
                          applicationId: application._id,
                          date: scheduleDate,
                          time: scheduleTime,
                          location: scheduleLocation,
                        });
                        setShowScheduleModal(false);
                        setScheduleDate("");
                        setScheduleTime("");
                        setScheduleLocation("In-person");
                      } catch (error) {
                        console.error("Failed to schedule interview:", error);
                      } finally {
                        setIsScheduling(false);
                      }
                    }}
                    disabled={!scheduleDate || !scheduleTime || isScheduling}
                    className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isScheduling ? "Scheduling..." : "Schedule Interview"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Hire Applicant Modal */}
          {showHireModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-lg mx-4 w-full">
                <h3 className="text-xl font-bold text-white mb-2">Hire Applicant</h3>
                <p className="text-slate-400 text-sm mb-6">
                  Create a personnel record for {application.firstName} {application.lastName}. This will also update their application status to &quot;Hired&quot;.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Position *</label>
                    <input
                      type="text"
                      placeholder="e.g., Warehouse Associate"
                      value={hireForm.position}
                      onChange={(e) => setHireForm({ ...hireForm, position: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Department *</label>
                    <input
                      type="text"
                      placeholder="e.g., Warehouse, Sales, Operations"
                      value={hireForm.department}
                      onChange={(e) => setHireForm({ ...hireForm, department: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Employee Type *</label>
                    <select
                      value={hireForm.employeeType}
                      onChange={(e) => setHireForm({ ...hireForm, employeeType: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="full_time">Full Time</option>
                      <option value="part_time">Part Time</option>
                      <option value="contract">Contract</option>
                      <option value="seasonal">Seasonal</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">Hire Date *</label>
                      <input
                        type="date"
                        value={hireForm.hireDate}
                        onChange={(e) => setHireForm({ ...hireForm, hireDate: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-slate-400 mb-2">Hourly Rate</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="e.g., 18.00"
                        value={hireForm.hourlyRate}
                        onChange={(e) => setHireForm({ ...hireForm, hourlyRate: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowHireModal(false);
                      setHireForm({
                        position: "",
                        department: "",
                        employeeType: "full_time",
                        hireDate: new Date().toISOString().split("T")[0],
                        hourlyRate: "",
                      });
                    }}
                    disabled={isHiring}
                    className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleHire}
                    disabled={!hireForm.position || !hireForm.department || isHiring}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isHiring ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Creating Personnel Record...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                        Create Personnel Record
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Internal Notes (Editable) */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Internal Notes</h2>
              {!isEditingNotes && (
                <button
                  onClick={() => {
                    setNotesInput(application.notes || "");
                    setIsEditingNotes(true);
                  }}
                  className="px-3 py-1 text-sm text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded transition-colors"
                >
                  {application.notes ? "Edit" : "Add Notes"}
                </button>
              )}
            </div>
            {isEditingNotes ? (
              <div className="space-y-3">
                <textarea
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="Add internal notes about this candidate..."
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 resize-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setIsEditingNotes(false);
                      setNotesInput("");
                    }}
                    disabled={isSavingNotes}
                    className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      setIsSavingNotes(true);
                      try {
                        await updateNotes({
                          applicationId: application._id,
                          notes: notesInput,
                        });
                        setIsEditingNotes(false);
                        setNotesInput("");
                      } catch (error) {
                        console.error("Failed to save notes:", error);
                      } finally {
                        setIsSavingNotes(false);
                      }
                    }}
                    disabled={isSavingNotes}
                    className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors disabled:opacity-50"
                  >
                    {isSavingNotes ? "Saving..." : "Save Notes"}
                  </button>
                </div>
              </div>
            ) : application.notes ? (
              <p className="text-slate-300 whitespace-pre-wrap">{application.notes}</p>
            ) : (
              <p className="text-slate-500 text-sm italic">No notes added yet</p>
            )}
          </div>

          {/* Resume Text */}
          {application.resumeText && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-3">Submitted Resume</h2>
              <div className="bg-slate-900/50 border border-slate-600 rounded-lg p-4 max-h-96 overflow-y-auto">
                <pre className="text-slate-300 text-sm whitespace-pre-wrap font-mono">
                  {application.resumeText}
                </pre>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);

  return (
    <Protected>
      <ApplicationDetailContent id={resolvedParams.id} />
    </Protected>
  );
}
