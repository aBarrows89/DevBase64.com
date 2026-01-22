"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Protected from "./protected";
import Sidebar, { MobileHeader } from "@/components/Sidebar";
import { useAuth } from "./auth-context";
import { useTheme } from "./theme-context";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { SearchButton } from "@/components/GlobalSearch";
import ActivityFeed from "@/components/ActivityFeed";
import { Id } from "@/convex/_generated/dataModel";

// Combined type for website messages
interface WebsiteMessage {
  _id: string;
  type: "contact" | "dealer";
  name: string;
  email: string;
  subject?: string;
  businessName?: string;
  status: string;
  createdAt: number;
}

// Broadcast message interface
interface BroadcastMessage {
  _id: Id<"broadcastMessages">;
  title: string;
  content: string;
  type: string;
  priority: string;
  createdByName: string;
  createdAt: number;
}

// Dashboard cards info
const DASHBOARD_CARDS = [
  { id: "projects", label: "Active Projects", description: "Your active and recent projects" },
  { id: "applications", label: "Recent Applications", description: "New job applications" },
  { id: "websiteMessages", label: "Website Messages", description: "Contact forms and dealer inquiries" },
  { id: "hiringAnalytics", label: "Hiring Analytics", description: "Hiring metrics and upcoming interviews" },
  { id: "activityFeed", label: "Activity Feed", description: "Recent system activity" },
  { id: "tenureCheckIns", label: "Tenure Check-ins", description: "Due employee milestone reviews" },
];

function DashboardContent() {
  const { user, isOfficeManager, isSuperAdmin } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const isDark = theme === "dark";

  // UI State
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({
    title: "",
    content: "",
    type: "info",
    priority: "normal",
    targetRoles: [] as string[],
  });

  // Redirect department managers to their portal
  const isDepartmentManager = user?.role === "department_manager";
  // Redirect employees to their portal
  const isEmployee = user?.role === "employee";

  useEffect(() => {
    if (isDepartmentManager) {
      router.replace("/department-portal");
    } else if (isEmployee) {
      router.replace("/portal");
    }
  }, [isDepartmentManager, isEmployee, router]);

  const shouldSkipQueries = isDepartmentManager || isEmployee;
  // Office managers only see projects - skip other queries
  const shouldSkipPeopleQueries = shouldSkipQueries || isOfficeManager;

  const projects = useQuery(api.projects.getAll, shouldSkipQueries ? "skip" : (user?._id ? { userId: user._id } : {}));
  const applications = useQuery(api.applications.getRecent, shouldSkipPeopleQueries ? "skip" : undefined);
  const upcomingInterviews = useQuery(api.applications.getUpcomingInterviews, shouldSkipPeopleQueries ? "skip" : undefined);
  const hiringAnalytics = useQuery(api.applications.getHiringAnalytics, shouldSkipPeopleQueries ? "skip" : undefined);
  const contactMessages = useQuery(api.contactMessages.getRecent, shouldSkipPeopleQueries ? "skip" : undefined);
  const dealerInquiries = useQuery(api.dealerInquiries.getRecent, shouldSkipPeopleQueries ? "skip" : undefined);
  const pendingTenureCheckIns = useQuery(api.personnel.getPendingTenureCheckIns, shouldSkipPeopleQueries ? "skip" : undefined);

  // Broadcast messages
  const broadcastMessages = useQuery(
    api.broadcastMessages.getActiveForUser,
    user ? { userId: user._id, userRole: user.role } : "skip"
  ) as BroadcastMessage[] | undefined;
  const dismissBroadcast = useMutation(api.broadcastMessages.dismiss);
  const createBroadcast = useMutation(api.broadcastMessages.create);

  // Dashboard settings
  const dashboardSettings = useQuery(
    api.dashboardSettings.getSettingsWithDefaults,
    user ? { userId: user._id, userRole: user.role } : "skip"
  );
  const saveSettings = useMutation(api.dashboardSettings.saveSettings);
  const toggleCard = useMutation(api.dashboardSettings.toggleCard);
  const resetSettings = useMutation(api.dashboardSettings.resetToDefaults);

  // Check if a card is enabled
  const isCardEnabled = (cardId: string) => {
    if (!dashboardSettings) return true;
    return dashboardSettings.enabledCards.includes(cardId);
  };

  // Handle card toggle
  const handleToggleCard = async (cardId: string) => {
    if (!user) return;
    await toggleCard({
      userId: user._id,
      userRole: user.role,
      cardId,
    });
  };

  // Handle broadcast dismiss
  const handleDismissBroadcast = async (messageId: Id<"broadcastMessages">) => {
    if (!user) return;
    await dismissBroadcast({
      messageId,
      userId: user._id,
    });
  };

  // Handle create broadcast
  const handleCreateBroadcast = async () => {
    if (!user) return;
    await createBroadcast({
      title: broadcastForm.title,
      content: broadcastForm.content,
      type: broadcastForm.type,
      priority: broadcastForm.priority,
      targetRoles: broadcastForm.targetRoles.length > 0 ? broadcastForm.targetRoles : undefined,
      createdBy: user._id,
      createdByName: user.name,
    });
    setBroadcastForm({
      title: "",
      content: "",
      type: "info",
      priority: "normal",
      targetRoles: [],
    });
    setShowBroadcastModal(false);
  };

  // Show loading while redirecting
  if (isDepartmentManager || isEmployee) {
    return (
      <div className={`flex h-screen items-center justify-center ${isDark ? "bg-slate-900" : "bg-[#f2f2f7]"}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className={isDark ? "text-slate-400" : "text-gray-500"}>Redirecting to your portal...</p>
        </div>
      </div>
    );
  }

  // Combine and sort website messages
  const websiteMessages: WebsiteMessage[] = [
    ...(contactMessages?.map((m) => ({
      _id: m._id,
      type: "contact" as const,
      name: m.name,
      email: m.email,
      subject: m.subject,
      status: m.status,
      createdAt: m.createdAt,
    })) || []),
    ...(dealerInquiries?.map((i) => ({
      _id: i._id,
      type: "dealer" as const,
      name: i.contactName,
      email: i.email,
      businessName: i.businessName,
      status: i.status,
      createdAt: i.createdAt,
    })) || []),
  ].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);

  const newMessageCount = (contactMessages?.filter((m) => m.status === "new").length || 0) +
    (dealerInquiries?.filter((i) => i.status === "new").length || 0);

  // Calculate stats
  const projectStats = {
    total: projects?.length || 0,
    inProgress: projects?.filter((p) => p.status === "in_progress").length || 0,
    completed: projects?.filter((p) => p.status === "done").length || 0,
    behindSchedule:
      projects?.filter((p) => p.aiTimelineAnalysis?.isOnSchedule === false)
        .length || 0,
  };

  const applicationStats = {
    total: applications?.length || 0,
    new: applications?.filter((a) => a.status === "new").length || 0,
    pending:
      applications?.filter((a) =>
        ["reviewed", "contacted"].includes(a.status)
      ).length || 0,
  };

  return (
    <div className={`flex h-screen ${isDark ? "bg-slate-900" : "bg-[#f2f2f7]"}`}>
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        {/* Mobile Header */}
        <MobileHeader />

        {/* Header */}
        <header className={`sticky top-0 z-10 backdrop-blur-sm border-b px-4 sm:px-8 py-3 sm:py-4 ${isDark ? "bg-slate-900/80 border-slate-700" : "bg-white/80 border-gray-200"}`}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-xl sm:text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                Welcome to IECentral, {user?.name?.split(" ")[0] || "User"}
              </h1>
              <p className={`text-xs sm:text-sm mt-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <SearchButton />
              {/* Help Button */}
              <button
                onClick={() => setShowHelp(true)}
                className={`p-2 rounded-lg transition-colors ${isDark ? "text-slate-400 hover:text-white hover:bg-slate-700" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"}`}
                title="Dashboard Help"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              {/* Settings Button */}
              <button
                onClick={() => setShowSettings(true)}
                className={`p-2 rounded-lg transition-colors ${isDark ? "text-slate-400 hover:text-white hover:bg-slate-700" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"}`}
                title="Customize Dashboard"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              {/* Create Broadcast Button (Super Admin only) */}
              {isSuperAdmin && (
                <button
                  onClick={() => setShowBroadcastModal(true)}
                  className={`hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${isDark ? "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30" : "bg-blue-100 text-blue-600 hover:bg-blue-200"}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                  </svg>
                  <span className="text-sm font-medium">Broadcast</span>
                </button>
              )}
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-8 space-y-6 sm:space-y-8">
          {/* Broadcast Messages */}
          {broadcastMessages && broadcastMessages.length > 0 && (
            <div className="space-y-3">
              {broadcastMessages.map((msg) => (
                <div
                  key={msg._id}
                  className={`relative rounded-xl p-4 border ${
                    msg.type === "warning"
                      ? isDark ? "bg-amber-500/10 border-amber-500/30" : "bg-amber-50 border-amber-200"
                      : msg.type === "success"
                        ? isDark ? "bg-green-500/10 border-green-500/30" : "bg-green-50 border-green-200"
                        : msg.type === "update"
                          ? isDark ? "bg-purple-500/10 border-purple-500/30" : "bg-purple-50 border-purple-200"
                          : isDark ? "bg-cyan-500/10 border-cyan-500/30" : "bg-blue-50 border-blue-200"
                  }`}
                >
                  <button
                    onClick={() => handleDismissBroadcast(msg._id)}
                    className={`absolute top-3 right-3 p-1 rounded-lg transition-colors ${
                      isDark ? "text-slate-400 hover:text-white hover:bg-slate-700" : "text-gray-400 hover:text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <div className="flex items-start gap-3 pr-8">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                      msg.type === "warning"
                        ? "bg-amber-500/20"
                        : msg.type === "success"
                          ? "bg-green-500/20"
                          : msg.type === "update"
                            ? "bg-purple-500/20"
                            : isDark ? "bg-cyan-500/20" : "bg-blue-100"
                    }`}>
                      <svg className={`w-4 h-4 ${
                        msg.type === "warning"
                          ? "text-amber-400"
                          : msg.type === "success"
                            ? "text-green-400"
                            : msg.type === "update"
                              ? "text-purple-400"
                              : isDark ? "text-cyan-400" : "text-blue-600"
                      }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {msg.type === "warning" ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        ) : msg.type === "success" ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        ) : msg.type === "update" ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                        )}
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-semibold ${
                          msg.type === "warning"
                            ? isDark ? "text-amber-300" : "text-amber-700"
                            : msg.type === "success"
                              ? isDark ? "text-green-300" : "text-green-700"
                              : msg.type === "update"
                                ? isDark ? "text-purple-300" : "text-purple-700"
                                : isDark ? "text-cyan-300" : "text-blue-700"
                        }`}>
                          {msg.title}
                        </h3>
                        {msg.priority === "high" && (
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            isDark ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-600"
                          }`}>
                            Important
                          </span>
                        )}
                      </div>
                      <p className={`text-sm ${
                        msg.type === "warning"
                          ? isDark ? "text-amber-200/80" : "text-amber-600"
                          : msg.type === "success"
                            ? isDark ? "text-green-200/80" : "text-green-600"
                            : msg.type === "update"
                              ? isDark ? "text-purple-200/80" : "text-purple-600"
                              : isDark ? "text-cyan-200/80" : "text-blue-600"
                      }`}>
                        {msg.content}
                      </p>
                      <p className={`text-xs mt-2 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                        Posted by {msg.createdByName} on {new Date(msg.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Stats Grid - Only show if projects or applications cards are enabled */}
          {(isCardEnabled("projects") || (!isOfficeManager && isCardEnabled("applications"))) && (
          <div className={`grid grid-cols-2 md:grid-cols-2 ${isOfficeManager ? "lg:grid-cols-3" : "lg:grid-cols-4"} gap-3 sm:gap-6`}>
            {/* Projects Stats - Only show if projects card enabled */}
            {isCardEnabled("projects") && (
            <>
            <div className={`border rounded-xl p-4 sm:p-6 ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm"}`}>
              <div className="flex items-center justify-between mb-2 sm:mb-4">
                <h3 className={`text-xs sm:text-sm font-medium ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                  Active Projects
                </h3>
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center ${isDark ? "bg-cyan-500/20" : "bg-blue-100"}`}>
                  <svg
                    className={`w-4 h-4 sm:w-5 sm:h-5 ${isDark ? "text-cyan-400" : "text-blue-600"}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
              </div>
              <p className={`text-2xl sm:text-3xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                {projectStats.inProgress}
              </p>
              <p className={`text-xs sm:text-sm mt-1 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                {projectStats.total} total projects
              </p>
            </div>

            {/* Completed */}
            <div className={`border rounded-xl p-4 sm:p-6 ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm"}`}>
              <div className="flex items-center justify-between mb-2 sm:mb-4">
                <h3 className={`text-xs sm:text-sm font-medium ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                  Completed
                </h3>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <svg
                    className="w-4 h-4 sm:w-5 sm:h-5 text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </div>
              <p className={`text-2xl sm:text-3xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                {projectStats.completed}
              </p>
              <p className={`text-xs sm:text-sm mt-1 ${isDark ? "text-slate-500" : "text-gray-400"}`}>projects done</p>
            </div>

            {/* Behind Schedule */}
            <div className={`border rounded-xl p-4 sm:p-6 ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm"}`}>
              <div className="flex items-center justify-between mb-2 sm:mb-4">
                <h3 className={`text-xs sm:text-sm font-medium ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                  Behind Schedule
                </h3>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <svg
                    className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
              <p className={`text-2xl sm:text-3xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                {projectStats.behindSchedule}
              </p>
              <p className={`text-xs sm:text-sm mt-1 ${isDark ? "text-slate-500" : "text-gray-400"}`}>need attention</p>
            </div>
            </>
            )}

            {/* Applications - Hide for office managers and check card setting */}
            {!isOfficeManager && isCardEnabled("applications") && (
              <div className={`border rounded-xl p-4 sm:p-6 ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm"}`}>
                <div className="flex items-center justify-between mb-2 sm:mb-4">
                  <h3 className={`text-xs sm:text-sm font-medium ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    New Applications
                  </h3>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <svg
                      className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                </div>
                <p className={`text-2xl sm:text-3xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                  {applicationStats.new}
                </p>
                <p className={`text-xs sm:text-sm mt-1 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                  {applicationStats.total} total
                </p>
              </div>
            )}
          </div>
          )}

          {/* Content Sections */}
          {(isCardEnabled("projects") || (!isOfficeManager && isCardEnabled("applications"))) && (
          <div className={`grid grid-cols-1 ${isOfficeManager ? "" : "lg:grid-cols-2"} gap-4 sm:gap-6`}>
            {/* Recent Projects */}
            {isCardEnabled("projects") && (
            <div className={`border rounded-xl p-4 sm:p-6 ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm"}`}>
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className={`text-base sm:text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                  Recent Projects
                </h2>
                <a
                  href="/projects"
                  className={`text-sm transition-colors ${isDark ? "text-cyan-400 hover:text-cyan-300" : "text-blue-600 hover:text-blue-700"}`}
                >
                  View all
                </a>
              </div>
              <div className="space-y-3 sm:space-y-4">
                {projects?.slice(0, 5).map((project) => (
                  <div
                    key={project._id}
                    className={`flex items-center justify-between p-3 sm:p-4 rounded-lg border ${isDark ? "bg-slate-900/50 border-slate-700/50" : "bg-gray-50 border-gray-100"}`}
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-sm sm:text-base font-medium truncate ${isDark ? "text-white" : "text-gray-900"}`}>
                        {project.name}
                      </h3>
                      <p className={`text-xs sm:text-sm truncate ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                        {project.description}
                      </p>
                    </div>
                    <div className="ml-2 sm:ml-4">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${
                          project.status === "done"
                            ? "bg-green-500/20 text-green-400"
                            : project.status === "in_progress"
                              ? isDark ? "bg-cyan-500/20 text-cyan-400" : "bg-blue-100 text-blue-600"
                              : project.status === "review"
                                ? "bg-amber-500/20 text-amber-400"
                                : isDark ? "bg-slate-500/20 text-slate-400" : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {project.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                )) || (
                  <p className={`text-center py-8 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                    No projects yet
                  </p>
                )}
              </div>
            </div>
            )}

            {/* Recent Applications - Hide for office managers and check card setting */}
            {!isOfficeManager && isCardEnabled("applications") && (
              <div className={`border rounded-xl p-4 sm:p-6 ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm"}`}>
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <h2 className={`text-base sm:text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                    Recent Applications
                  </h2>
                  <a
                    href="/applications"
                    className={`text-sm transition-colors ${isDark ? "text-cyan-400 hover:text-cyan-300" : "text-blue-600 hover:text-blue-700"}`}
                  >
                    View all
                  </a>
                </div>
                <div className="space-y-3 sm:space-y-4">
                  {applications?.slice(0, 5).map((app) => (
                    <div
                      key={app._id}
                      className={`flex items-center justify-between p-3 sm:p-4 rounded-lg border ${isDark ? "bg-slate-900/50 border-slate-700/50" : "bg-gray-50 border-gray-100"}`}
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className={`text-sm sm:text-base font-medium truncate ${isDark ? "text-white" : "text-gray-900"}`}>
                          {app.firstName} {app.lastName}
                        </h3>
                        <p className={`text-xs sm:text-sm truncate ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                          {app.appliedJobTitle}
                        </p>
                      </div>
                      <div className="ml-2 sm:ml-4 flex items-center gap-1 sm:gap-2">
                        {app.candidateAnalysis && (
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              app.candidateAnalysis.overallScore >= 70
                                ? "bg-green-500/20 text-green-400"
                                : app.candidateAnalysis.overallScore >= 50
                                  ? "bg-amber-500/20 text-amber-400"
                                  : "bg-red-500/20 text-red-400"
                            }`}
                          >
                            {app.candidateAnalysis.overallScore}%
                          </span>
                        )}
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            app.status === "new"
                              ? isDark ? "bg-cyan-500/20 text-cyan-400" : "bg-blue-100 text-blue-600"
                              : app.status === "reviewed"
                                ? "bg-amber-500/20 text-amber-400"
                                : isDark ? "bg-slate-500/20 text-slate-400" : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {app.status}
                        </span>
                      </div>
                    </div>
                  )) || (
                    <p className={`text-center py-8 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                      No applications yet
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
          )}

          {/* Website Messages & Hiring Analytics - Hide for office managers and check card settings */}
          {!isOfficeManager && (isCardEnabled("websiteMessages") || isCardEnabled("hiringAnalytics")) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Website Messages */}
            {isCardEnabled("websiteMessages") && (
            <div className={`border rounded-xl p-4 sm:p-6 ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm"}`}>
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className={`text-base sm:text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                  Website Messages
                </h2>
                <div className="flex items-center gap-2">
                  {newMessageCount > 0 && (
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${isDark ? "bg-cyan-500/20 text-cyan-400" : "bg-blue-100 text-blue-600"}`}>
                      {newMessageCount} new
                    </span>
                  )}
                  <Link
                    href="/website-messages"
                    className={`text-sm transition-colors ${isDark ? "text-cyan-400 hover:text-cyan-300" : "text-blue-600 hover:text-blue-700"}`}
                  >
                    View all
                  </Link>
                </div>
              </div>
              <div className="space-y-3">
                {websiteMessages.length > 0 ? (
                  websiteMessages.map((msg) => (
                    <Link
                      key={`${msg.type}-${msg._id}`}
                      href={`/website-messages?type=${msg.type}&id=${msg._id}`}
                      className={`block p-4 rounded-lg border transition-colors ${isDark ? "bg-slate-900/50 border-slate-700/50 hover:border-slate-600" : "bg-gray-50 border-gray-100 hover:border-gray-300"}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className={`font-medium truncate ${isDark ? "text-white" : "text-gray-900"}`}>
                              {msg.type === "dealer" ? msg.businessName : msg.name}
                            </h3>
                            <span className={`px-2 py-0.5 text-xs rounded-full flex-shrink-0 ${
                              msg.type === "dealer"
                                ? isDark ? "bg-purple-500/20 text-purple-400" : "bg-purple-100 text-purple-600"
                                : isDark ? "bg-slate-600/50 text-slate-300" : "bg-gray-200 text-gray-600"
                            }`}>
                              {msg.type === "dealer" ? "Dealer" : "Contact"}
                            </span>
                            {msg.status === "new" && (
                              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isDark ? "bg-cyan-400" : "bg-blue-500"}`}></span>
                            )}
                          </div>
                          <p className={`text-sm truncate ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                            {msg.type === "dealer" ? msg.name : msg.subject}
                          </p>
                        </div>
                        <p className={`text-xs ml-4 flex-shrink-0 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                          {new Date(msg.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className={`text-center py-8 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                    <svg className={`w-12 h-12 mx-auto mb-3 ${isDark ? "text-slate-600" : "text-gray-300"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <p>No website messages</p>
                  </div>
                )}
              </div>
            </div>
            )}

            {/* Hiring Analytics */}
            {isCardEnabled("hiringAnalytics") && (
            <div className={`border rounded-xl p-4 sm:p-6 ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm"}`}>
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className={`text-base sm:text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                  Hiring Analytics
                </h2>
                <div className="flex items-center gap-3">
                  {upcomingInterviews && upcomingInterviews.length > 0 && (
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${isDark ? "bg-orange-500/20 text-orange-400" : "bg-orange-100 text-orange-600"}`}>
                      {upcomingInterviews.length} interviews
                    </span>
                  )}
                </div>
              </div>
              {hiringAnalytics ? (
                <div className="space-y-4">
                  {/* Score Comparisons - More compact */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <p className={`text-xs mb-1 ${isDark ? "text-slate-500" : "text-gray-400"}`}>Hired Avg</p>
                      <p className={`text-xl font-bold ${hiringAnalytics.hiredStats.avgOverallScore !== null ? (hiringAnalytics.hiredStats.avgOverallScore >= 70 ? "text-green-400" : hiringAnalytics.hiredStats.avgOverallScore >= 50 ? "text-amber-400" : "text-red-400") : isDark ? "text-slate-500" : "text-gray-400"}`}>
                        {hiringAnalytics.hiredStats.avgOverallScore !== null ? `${hiringAnalytics.hiredStats.avgOverallScore}%` : "—"}
                      </p>
                      <p className={`text-xs ${isDark ? "text-slate-600" : "text-gray-400"}`}>
                        {hiringAnalytics.hiredStats.count} hired
                      </p>
                    </div>
                    <div className="text-center">
                      <p className={`text-xs mb-1 ${isDark ? "text-slate-500" : "text-gray-400"}`}>Interviewed</p>
                      <p className={`text-xl font-bold ${hiringAnalytics.interviewedStats.avgOverallScore !== null ? (hiringAnalytics.interviewedStats.avgOverallScore >= 70 ? "text-green-400" : hiringAnalytics.interviewedStats.avgOverallScore >= 50 ? "text-amber-400" : "text-red-400") : isDark ? "text-slate-500" : "text-gray-400"}`}>
                        {hiringAnalytics.interviewedStats.avgOverallScore !== null ? `${hiringAnalytics.interviewedStats.avgOverallScore}%` : "—"}
                      </p>
                      <p className={`text-xs ${isDark ? "text-slate-600" : "text-gray-400"}`}>
                        {hiringAnalytics.interviewedStats.count} total
                      </p>
                    </div>
                    <div className="text-center">
                      <p className={`text-xs mb-1 ${isDark ? "text-slate-500" : "text-gray-400"}`}>Rejected</p>
                      <p className={`text-xl font-bold ${hiringAnalytics.rejectedStats.avgOverallScore !== null ? (hiringAnalytics.rejectedStats.avgOverallScore >= 70 ? "text-green-400" : hiringAnalytics.rejectedStats.avgOverallScore >= 50 ? "text-amber-400" : "text-red-400") : isDark ? "text-slate-500" : "text-gray-400"}`}>
                        {hiringAnalytics.rejectedStats.avgOverallScore !== null ? `${hiringAnalytics.rejectedStats.avgOverallScore}%` : "—"}
                      </p>
                      <p className={`text-xs ${isDark ? "text-slate-600" : "text-gray-400"}`}>
                        {hiringAnalytics.rejectedStats.count} total
                      </p>
                    </div>
                  </div>

                  {/* Conversion Rates - Compact */}
                  <div className={`p-3 rounded-lg border ${isDark ? "bg-slate-900/50 border-slate-700" : "bg-gray-50 border-gray-100"}`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>App → Interview</span>
                      <span className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>{hiringAnalytics.conversionRates.interviewRate}%</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className={`text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>Interview → Hired</span>
                      <span className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>{hiringAnalytics.conversionRates.hireRate}%</span>
                    </div>
                    <div className={`flex items-center justify-between mt-2 pt-2 border-t ${isDark ? "border-slate-700" : "border-gray-200"}`}>
                      <span className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-gray-600"}`}>Overall Rate</span>
                      <span className={`text-sm font-bold ${isDark ? "text-cyan-400" : "text-blue-600"}`}>{hiringAnalytics.conversionRates.overallHireRate}%</span>
                    </div>
                  </div>

                  {/* Upcoming Interviews Section */}
                  {upcomingInterviews && upcomingInterviews.length > 0 && (
                    <div className={`pt-3 border-t ${isDark ? "border-slate-700" : "border-gray-200"}`}>
                      <p className={`text-xs font-medium mb-2 ${isDark ? "text-slate-400" : "text-gray-500"}`}>Upcoming Interviews</p>
                      <div className="space-y-2">
                        {upcomingInterviews.slice(0, 3).map((interview) => (
                          <Link
                            key={interview._id}
                            href={`/applications/${interview._id}`}
                            className={`flex items-center justify-between p-2 rounded-lg transition-colors ${isDark ? "hover:bg-slate-700/50" : "hover:bg-gray-100"}`}
                          >
                            <div className="min-w-0">
                              <p className={`text-sm font-medium truncate ${isDark ? "text-white" : "text-gray-900"}`}>
                                {interview.firstName} {interview.lastName}
                              </p>
                              <p className={`text-xs truncate ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                                {interview.appliedJobTitle}
                              </p>
                            </div>
                            <div className="text-right ml-2 flex-shrink-0">
                              <p className={`text-xs font-medium ${isDark ? "text-orange-400" : "text-orange-600"}`}>
                                {interview.scheduledInterviewDate && new Date(interview.scheduledInterviewDate + "T00:00:00").toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </p>
                              <p className={`text-xs ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                                {interview.scheduledInterviewTime}
                              </p>
                            </div>
                          </Link>
                        ))}
                        {upcomingInterviews.length > 3 && (
                          <Link
                            href="/applications?status=interview_scheduled"
                            className={`block text-center text-xs py-1 ${isDark ? "text-cyan-400 hover:text-cyan-300" : "text-blue-600 hover:text-blue-700"}`}
                          >
                            View all {upcomingInterviews.length} interviews
                          </Link>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className={`text-center py-8 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                  <svg className={`w-12 h-12 mx-auto mb-3 ${isDark ? "text-slate-600" : "text-gray-300"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <p>Loading analytics...</p>
                </div>
              )}
            </div>
            )}
          </div>
          )}

          {/* Activity Feed & Tenure Check-ins */}
          {(isCardEnabled("activityFeed") || (!isOfficeManager && isCardEnabled("tenureCheckIns"))) && (
          <div className={`grid grid-cols-1 ${isOfficeManager ? "" : "lg:grid-cols-2"} gap-4 sm:gap-6`}>
            {isCardEnabled("activityFeed") && <ActivityFeed limit={15} />}

            {/* Pending Tenure Check-ins - Hide for office managers and check card setting */}
            {!isOfficeManager && isCardEnabled("tenureCheckIns") && pendingTenureCheckIns && pendingTenureCheckIns.length > 0 && (
              <div className={`border rounded-xl p-4 sm:p-6 ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm"}`}>
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <h2 className={`text-base sm:text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                    Due Tenure Check-ins
                  </h2>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${isDark ? "bg-amber-500/20 text-amber-400" : "bg-amber-100 text-amber-600"}`}>
                    {pendingTenureCheckIns.length} pending
                  </span>
                  <Link
                    href="/personnel"
                    className={`text-sm transition-colors ${isDark ? "text-cyan-400 hover:text-cyan-300" : "text-blue-600 hover:text-blue-700"}`}
                  >
                    View all
                  </Link>
                </div>
              </div>
              <div className="space-y-3">
                {pendingTenureCheckIns.slice(0, 8).map((item, idx) => (
                  <Link
                    key={`${item.personnelId}-${item.milestone}-${idx}`}
                    href={`/personnel/${item.personnelId}`}
                    className={`block p-4 rounded-lg border transition-colors ${isDark ? "bg-slate-900/50 border-slate-700/50 hover:border-slate-600" : "bg-gray-50 border-gray-100 hover:border-gray-300"}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={`font-medium truncate ${isDark ? "text-white" : "text-gray-900"}`}>
                            {item.personnelName}
                          </h3>
                          <span className={`px-2 py-0.5 text-xs rounded-full flex-shrink-0 ${
                            item.daysOverdue > 7
                              ? isDark ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-600"
                              : item.daysOverdue > 0
                                ? isDark ? "bg-amber-500/20 text-amber-400" : "bg-amber-100 text-amber-600"
                                : isDark ? "bg-green-500/20 text-green-400" : "bg-green-100 text-green-600"
                          }`}>
                            {item.milestoneLabel} Check-in
                          </span>
                        </div>
                        <p className={`text-sm truncate ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                          {item.department}
                        </p>
                      </div>
                      <div className="text-right ml-4 flex-shrink-0">
                        <p className={`text-xs font-medium ${
                          item.daysOverdue > 7
                            ? isDark ? "text-red-400" : "text-red-600"
                            : item.daysOverdue > 0
                              ? isDark ? "text-amber-400" : "text-amber-600"
                              : isDark ? "text-green-400" : "text-green-600"
                        }`}>
                          {item.daysOverdue === 0 ? "Due today" : `${item.daysOverdue} days overdue`}
                        </p>
                        <p className={`text-xs ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                          Hired {new Date(item.hireDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
                {pendingTenureCheckIns.length > 8 && (
                  <Link
                    href="/personnel"
                    className={`block text-center text-sm py-2 ${isDark ? "text-cyan-400 hover:text-cyan-300" : "text-blue-600 hover:text-blue-700"}`}
                  >
                    View all {pendingTenureCheckIns.length} pending check-ins
                  </Link>
                )}
              </div>
            </div>
          )}
          </div>
          )}

        </div>
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-lg rounded-xl p-6 ${isDark ? "bg-slate-800" : "bg-white"}`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                Customize Your Dashboard
              </h2>
              <button
                onClick={() => setShowSettings(false)}
                className={`p-2 rounded-lg transition-colors ${isDark ? "text-slate-400 hover:text-white hover:bg-slate-700" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className={`text-sm mb-4 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
              Choose which cards to display on your dashboard. Your preferences are saved automatically.
            </p>

            <div className="space-y-3 mb-6">
              {DASHBOARD_CARDS.map((card) => {
                const enabled = isCardEnabled(card.id);
                // Hide certain cards for office managers
                if (isOfficeManager && ["applications", "websiteMessages", "hiringAnalytics", "tenureCheckIns"].includes(card.id)) {
                  return null;
                }
                return (
                  <label
                    key={card.id}
                    className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors ${
                      enabled
                        ? isDark ? "bg-cyan-500/10 border-cyan-500/30" : "bg-blue-50 border-blue-200"
                        : isDark ? "bg-slate-900/50 border-slate-700" : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                        {card.label}
                      </p>
                      <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                        {card.description}
                      </p>
                    </div>
                    <div className="ml-4">
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={() => handleToggleCard(card.id)}
                        className="sr-only"
                      />
                      <div className={`relative w-11 h-6 rounded-full transition-colors ${
                        enabled
                          ? isDark ? "bg-cyan-500" : "bg-blue-500"
                          : isDark ? "bg-slate-600" : "bg-gray-300"
                      }`}>
                        <div className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-transform ${
                          enabled ? "translate-x-5" : "translate-x-0.5"
                        }`} />
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-700">
              <button
                onClick={async () => {
                  if (user) {
                    await resetSettings({ userId: user._id });
                  }
                }}
                className={`text-sm transition-colors ${isDark ? "text-slate-400 hover:text-white" : "text-gray-500 hover:text-gray-700"}`}
              >
                Reset to defaults
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${isDark ? "bg-cyan-500 text-white hover:bg-cyan-600" : "bg-blue-500 text-white hover:bg-blue-600"}`}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-lg rounded-xl p-6 max-h-[90vh] overflow-y-auto ${isDark ? "bg-slate-800" : "bg-white"}`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                Dashboard Help
              </h2>
              <button
                onClick={() => setShowHelp(false)}
                className={`p-2 rounded-lg transition-colors ${isDark ? "text-slate-400 hover:text-white hover:bg-slate-700" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Customization */}
              <div>
                <h3 className={`font-medium mb-2 flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                  <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Customize Your Dashboard
                </h3>
                <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                  Click the gear icon in the header to choose which cards appear on your dashboard.
                  Toggle cards on/off based on what&apos;s most relevant to your role. Your preferences
                  are saved automatically and persist across sessions.
                </p>
              </div>

              {/* Broadcast Messages */}
              <div>
                <h3 className={`font-medium mb-2 flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                  </svg>
                  Broadcast Messages
                </h3>
                <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                  Important announcements and updates appear at the top of your dashboard.
                  Click the X to dismiss a message after you&apos;ve read it. Messages may be
                  targeted to specific roles, so you&apos;ll only see what&apos;s relevant to you.
                </p>
              </div>

              {/* Available Cards */}
              <div>
                <h3 className={`font-medium mb-2 flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  Available Dashboard Cards
                </h3>
                <ul className={`text-sm space-y-2 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                  <li><strong>Active Projects</strong> - Your current projects and their status</li>
                  <li><strong>Recent Applications</strong> - New job applications to review</li>
                  <li><strong>Website Messages</strong> - Contact forms and dealer inquiries</li>
                  <li><strong>Hiring Analytics</strong> - Metrics and upcoming interviews</li>
                  <li><strong>Activity Feed</strong> - Recent system activity</li>
                  <li><strong>Tenure Check-ins</strong> - Due employee milestone reviews</li>
                </ul>
              </div>

              {/* Tips */}
              <div className={`p-4 rounded-lg ${isDark ? "bg-slate-700/50" : "bg-gray-100"}`}>
                <p className={`text-sm font-medium mb-2 ${isDark ? "text-cyan-400" : "text-blue-600"}`}>
                  Pro Tips
                </p>
                <ul className={`text-sm space-y-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                  <li>• Press <kbd className={`px-1.5 py-0.5 rounded ${isDark ? "bg-slate-600" : "bg-gray-200"}`}>Ctrl+K</kbd> to open global search</li>
                  <li>• Your dashboard settings are unique to you</li>
                  <li>• Click &quot;Reset to defaults&quot; to restore original layout</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-700">
              <button
                onClick={() => setShowHelp(false)}
                className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${isDark ? "bg-cyan-500 text-white hover:bg-cyan-600" : "bg-blue-500 text-white hover:bg-blue-600"}`}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Broadcast Create Modal (Super Admin) */}
      {showBroadcastModal && isSuperAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-lg rounded-xl p-6 ${isDark ? "bg-slate-800" : "bg-white"}`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                Create Broadcast Message
              </h2>
              <button
                onClick={() => setShowBroadcastModal(false)}
                className={`p-2 rounded-lg transition-colors ${isDark ? "text-slate-400 hover:text-white hover:bg-slate-700" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                  Title
                </label>
                <input
                  type="text"
                  value={broadcastForm.title}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
                  placeholder="e.g., New Feature Released"
                  className={`w-full px-3 py-2 rounded-lg border ${isDark ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400" : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"}`}
                />
              </div>

              {/* Content */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                  Message
                </label>
                <textarea
                  value={broadcastForm.content}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, content: e.target.value })}
                  placeholder="Write your message here..."
                  rows={3}
                  className={`w-full px-3 py-2 rounded-lg border resize-none ${isDark ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400" : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"}`}
                />
              </div>

              {/* Type & Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                    Type
                  </label>
                  <select
                    value={broadcastForm.type}
                    onChange={(e) => setBroadcastForm({ ...broadcastForm, type: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                  >
                    <option value="info">Info</option>
                    <option value="update">Update</option>
                    <option value="success">Success</option>
                    <option value="warning">Warning</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                    Priority
                  </label>
                  <select
                    value={broadcastForm.priority}
                    onChange={(e) => setBroadcastForm({ ...broadcastForm, priority: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High (Important)</option>
                  </select>
                </div>
              </div>

              {/* Target Roles */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                  Target Roles <span className={isDark ? "text-slate-500" : "text-gray-400"}>(leave empty for all)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {["super_admin", "admin", "office_manager", "warehouse_manager"].map((role) => (
                    <button
                      key={role}
                      onClick={() => {
                        const roles = broadcastForm.targetRoles.includes(role)
                          ? broadcastForm.targetRoles.filter((r) => r !== role)
                          : [...broadcastForm.targetRoles, role];
                        setBroadcastForm({ ...broadcastForm, targetRoles: roles });
                      }}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                        broadcastForm.targetRoles.includes(role)
                          ? isDark ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400" : "bg-blue-100 border-blue-300 text-blue-600"
                          : isDark ? "bg-slate-700 border-slate-600 text-slate-300" : "bg-gray-100 border-gray-200 text-gray-600"
                      }`}
                    >
                      {role.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-700">
              <button
                onClick={() => setShowBroadcastModal(false)}
                className={`px-4 py-2 rounded-lg transition-colors ${isDark ? "text-slate-400 hover:text-white" : "text-gray-500 hover:text-gray-700"}`}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBroadcast}
                disabled={!broadcastForm.title || !broadcastForm.content}
                className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isDark ? "bg-cyan-500 text-white hover:bg-cyan-600" : "bg-blue-500 text-white hover:bg-blue-600"}`}
              >
                Send Broadcast
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <Protected>
      <DashboardContent />
    </Protected>
  );
}
