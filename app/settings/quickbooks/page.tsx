"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Protected from "../../protected";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useTheme } from "../../theme-context";
import { useAuth } from "../../auth-context";
import { Id } from "@/convex/_generated/dataModel";

function QuickBooksSettingsContent() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { user } = useAuth();
  const router = useRouter();

  // Queries
  const connection = useQuery(api.quickbooks.getConnection);
  const syncStats = useQuery(api.quickbooks.getSyncStats);
  const employeeMappings = useQuery(api.quickbooks.getEmployeeMappings);
  const unmappedPersonnel = useQuery(api.quickbooks.getUnmappedPersonnel);
  const pendingExports = useQuery(api.quickbooks.getPendingTimeExports);
  const syncLogs = useQuery(api.quickbooks.getSyncLogs, { limit: 20 });

  // Mutations
  const saveConnection = useMutation(api.quickbooks.saveConnection);
  const createMapping = useMutation(api.quickbooks.createEmployeeMapping);
  const deleteMapping = useMutation(api.quickbooks.deleteEmployeeMapping);
  const approveExport = useMutation(api.quickbooks.approveTimeExport);
  const calculateExports = useMutation(api.quickbooks.calculatePendingTimeExports);

  // State
  const [activeTab, setActiveTab] = useState<"connection" | "mapping" | "exports" | "logs">("connection");
  const [showSetup, setShowSetup] = useState(false);
  const [setupForm, setSetupForm] = useState({
    companyName: "",
    wcUsername: "IECentral",
    wcPassword: "",
    syncTimeEntries: true,
    syncPayStubs: true,
    syncEmployees: true,
    autoSyncEnabled: true,
    syncIntervalMinutes: 15,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [selectedPersonnel, setSelectedPersonnel] = useState<Id<"personnel"> | null>(null);
  const [qbListId, setQbListId] = useState("");
  const [qbName, setQbName] = useState("");

  // Check permissions
  const canManageQB = user?.role === "super_admin" || user?.role === "admin";

  if (!canManageQB) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? "bg-slate-900" : "bg-gray-50"}`}>
        <div className="text-center">
          <h1 className={`text-2xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
            Access Denied
          </h1>
          <p className={`${isDark ? "text-slate-400" : "text-gray-500"}`}>
            You don't have permission to manage QuickBooks settings.
          </p>
        </div>
      </div>
    );
  }

  const handleSaveConnection = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await saveConnection({
        ...setupForm,
        userId: user._id,
      });
      setShowSetup(false);
    } catch (error) {
      console.error("Failed to save connection:", error);
    }
    setIsSaving(false);
  };

  const handleCreateMapping = async () => {
    if (!selectedPersonnel || !qbListId || !qbName) return;
    try {
      await createMapping({
        personnelId: selectedPersonnel,
        qbListId,
        qbName,
      });
      setShowMappingModal(false);
      setSelectedPersonnel(null);
      setQbListId("");
      setQbName("");
    } catch (error) {
      console.error("Failed to create mapping:", error);
    }
  };

  const handleApproveExport = async (exportId: Id<"qbPendingTimeExport">) => {
    if (!user) return;
    try {
      await approveExport({ exportId, userId: user._id });
    } catch (error) {
      console.error("Failed to approve export:", error);
    }
  };

  const handleCalculateExports = async () => {
    // Calculate for current week (Sunday)
    const today = new Date();
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - today.getDay());
    const weekStart = sunday.toISOString().split("T")[0];

    try {
      await calculateExports({ weekStartDate: weekStart });
    } catch (error) {
      console.error("Failed to calculate exports:", error);
    }
  };

  const downloadQwcFile = () => {
    if (!connection) return;

    const appUrl = window.location.origin;
    const content = `<?xml version="1.0"?>
<QBWCXML>
  <AppName>IE Central Time Sync</AppName>
  <AppID></AppID>
  <AppURL>${appUrl}/api/qbwc</AppURL>
  <AppDescription>IE Central - QuickBooks Time &amp; Payroll Sync</AppDescription>
  <AppSupport>${appUrl}/support</AppSupport>
  <UserName>${connection.wcUsername}</UserName>
  <OwnerID>{${crypto.randomUUID().toUpperCase()}}</OwnerID>
  <FileID>{${crypto.randomUUID().toUpperCase()}}</FileID>
  <QBType>QBFS</QBType>
  <Scheduler>
    <RunEveryNMinutes>${connection.syncIntervalMinutes}</RunEveryNMinutes>
  </Scheduler>
  <IsReadOnly>false</IsReadOnly>
</QBWCXML>`;

    const blob = new Blob([content], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "IECentral.qwc";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected":
        return "text-green-400";
      case "disconnected":
        return "text-slate-400";
      case "error":
        return "text-red-400";
      default:
        return "text-amber-400";
    }
  };

  return (
    <div className={`flex h-screen ${isDark ? "bg-slate-900" : "bg-[#f2f2f7]"}`}>
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <header className={`sticky top-0 z-10 border-b px-4 sm:px-8 py-4 sm:py-6 ${isDark ? "bg-slate-800/95 border-slate-700 backdrop-blur-sm" : "bg-white/95 border-gray-200 backdrop-blur-sm"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className={`p-2 rounded-lg ${isDark ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-100 text-gray-500"}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className={`text-xl sm:text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                  QuickBooks Integration
                </h1>
                <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                  Sync time entries and payroll with QuickBooks Desktop
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-8 space-y-6">
          {/* Connection Status Card */}
          <div className={`rounded-xl p-6 ${isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white border border-gray-200 shadow-sm"}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                Connection Status
              </h2>
              {connection && (
                <button
                  onClick={downloadQwcFile}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${isDark ? "bg-cyan-600 hover:bg-cyan-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
                >
                  Download .QWC File
                </button>
              )}
            </div>

            {!connection ? (
              <div className="text-center py-8">
                <svg className={`w-16 h-16 mx-auto mb-4 ${isDark ? "text-slate-600" : "text-gray-300"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <h3 className={`text-lg font-medium mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                  QuickBooks Not Connected
                </h3>
                <p className={`mb-4 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                  Set up the connection to start syncing time entries and payroll.
                </p>
                <button
                  onClick={() => setShowSetup(true)}
                  className={`px-6 py-2 rounded-lg font-medium ${isDark ? "bg-cyan-600 hover:bg-cyan-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
                >
                  Set Up Connection
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>Company</p>
                  <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>{connection.companyName}</p>
                </div>
                <div>
                  <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>Status</p>
                  <p className={`font-medium capitalize ${getStatusColor(connection.connectionStatus)}`}>
                    {connection.connectionStatus}
                  </p>
                </div>
                <div>
                  <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>Last Connected</p>
                  <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                    {connection.lastConnectedAt
                      ? new Date(connection.lastConnectedAt).toLocaleString()
                      : "Never"}
                  </p>
                </div>
                <div>
                  <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>Last Sync</p>
                  <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                    {connection.lastSyncAt
                      ? new Date(connection.lastSyncAt).toLocaleString()
                      : "Never"}
                  </p>
                </div>
              </div>
            )}

            {connection?.lastError && (
              <div className="mt-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30">
                <p className="text-red-400 text-sm">{connection.lastError}</p>
              </div>
            )}
          </div>

          {/* Tabs */}
          {connection && (
            <>
              <div className={`flex gap-1 p-1 rounded-lg ${isDark ? "bg-slate-800" : "bg-gray-100"}`}>
                {[
                  { id: "connection", label: "Settings" },
                  { id: "mapping", label: "Employee Mapping" },
                  { id: "exports", label: "Time Exports" },
                  { id: "logs", label: "Sync Logs" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? isDark ? "bg-slate-700 text-white" : "bg-white text-gray-900 shadow-sm"
                        : isDark ? "text-slate-400 hover:text-white" : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              {activeTab === "connection" && (
                <div className={`rounded-xl p-6 ${isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white border border-gray-200 shadow-sm"}`}>
                  <h3 className={`text-lg font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
                    Sync Settings
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-slate-700/50">
                      <div>
                        <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>Sync Time Entries</p>
                        <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>Export employee hours to QuickBooks</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm ${connection.syncTimeEntries ? "bg-green-500/20 text-green-400" : "bg-slate-700 text-slate-400"}`}>
                        {connection.syncTimeEntries ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-slate-700/50">
                      <div>
                        <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>Import Pay Stubs</p>
                        <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>Pull paycheck data from QuickBooks</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm ${connection.syncPayStubs ? "bg-green-500/20 text-green-400" : "bg-slate-700 text-slate-400"}`}>
                        {connection.syncPayStubs ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-slate-700/50">
                      <div>
                        <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>Sync Employees</p>
                        <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>Keep employee list in sync</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm ${connection.syncEmployees ? "bg-green-500/20 text-green-400" : "bg-slate-700 text-slate-400"}`}>
                        {connection.syncEmployees ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <div>
                        <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>Sync Interval</p>
                        <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>How often Web Connector syncs</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm bg-slate-700 text-slate-300`}>
                        Every {connection.syncIntervalMinutes} minutes
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowSetup(true)}
                    className={`mt-6 px-4 py-2 rounded-lg text-sm font-medium ${isDark ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}
                  >
                    Edit Settings
                  </button>
                </div>
              )}

              {activeTab === "mapping" && (
                <div className={`rounded-xl p-6 ${isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white border border-gray-200 shadow-sm"}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                        Employee Mapping
                      </h3>
                      <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                        Link IE Central personnel to QuickBooks employees
                      </p>
                    </div>
                    <button
                      onClick={() => setShowMappingModal(true)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium ${isDark ? "bg-cyan-600 hover:bg-cyan-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
                    >
                      Add Mapping
                    </button>
                  </div>

                  {syncStats && (
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className={`p-4 rounded-lg ${isDark ? "bg-slate-700/50" : "bg-gray-50"}`}>
                        <p className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{syncStats.mappings.total}</p>
                        <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>Mapped Employees</p>
                      </div>
                      <div className={`p-4 rounded-lg ${isDark ? "bg-slate-700/50" : "bg-gray-50"}`}>
                        <p className={`text-2xl font-bold ${syncStats.mappings.unmapped > 0 ? "text-amber-400" : isDark ? "text-white" : "text-gray-900"}`}>{syncStats.mappings.unmapped}</p>
                        <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>Unmapped Employees</p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    {employeeMappings?.map((mapping) => (
                      <div
                        key={mapping._id}
                        className={`flex items-center justify-between p-4 rounded-lg ${isDark ? "bg-slate-700/30" : "bg-gray-50"}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? "bg-slate-600" : "bg-gray-200"}`}>
                            <span className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-700"}`}>
                              {mapping.personnel?.firstName?.[0]}{mapping.personnel?.lastName?.[0]}
                            </span>
                          </div>
                          <div>
                            <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                              {mapping.personnel?.firstName} {mapping.personnel?.lastName}
                            </p>
                            <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                              QB: {mapping.qbName}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs ${mapping.isSynced ? "bg-green-500/20 text-green-400" : "bg-amber-500/20 text-amber-400"}`}>
                            {mapping.isSynced ? "Synced" : "Pending"}
                          </span>
                          <button
                            onClick={() => deleteMapping({ mappingId: mapping._id })}
                            className="p-2 text-red-400 hover:bg-red-500/20 rounded"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}

                    {(!employeeMappings || employeeMappings.length === 0) && (
                      <div className="text-center py-8">
                        <p className={isDark ? "text-slate-400" : "text-gray-500"}>
                          No employee mappings yet. Add mappings to sync time entries.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "exports" && (
                <div className={`rounded-xl p-6 ${isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white border border-gray-200 shadow-sm"}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                        Pending Time Exports
                      </h3>
                      <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                        Review and approve time entries for QuickBooks export
                      </p>
                    </div>
                    <button
                      onClick={handleCalculateExports}
                      className={`px-4 py-2 rounded-lg text-sm font-medium ${isDark ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}
                    >
                      Calculate This Week
                    </button>
                  </div>

                  {syncStats && (
                    <div className="grid grid-cols-4 gap-4 mb-6">
                      <div className={`p-4 rounded-lg ${isDark ? "bg-slate-700/50" : "bg-gray-50"}`}>
                        <p className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{syncStats.exports.pending}</p>
                        <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>Pending</p>
                      </div>
                      <div className={`p-4 rounded-lg ${isDark ? "bg-slate-700/50" : "bg-gray-50"}`}>
                        <p className={`text-2xl font-bold text-green-400`}>{syncStats.exports.approved}</p>
                        <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>Approved</p>
                      </div>
                      <div className={`p-4 rounded-lg ${isDark ? "bg-slate-700/50" : "bg-gray-50"}`}>
                        <p className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{syncStats.exports.totalPendingHours.toFixed(1)}</p>
                        <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>Pending Hours</p>
                      </div>
                      <div className={`p-4 rounded-lg ${isDark ? "bg-slate-700/50" : "bg-gray-50"}`}>
                        <p className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{syncStats.queue.pending}</p>
                        <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>In Queue</p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    {pendingExports?.map((exp) => (
                      <div
                        key={exp._id}
                        className={`flex items-center justify-between p-4 rounded-lg ${isDark ? "bg-slate-700/30" : "bg-gray-50"}`}
                      >
                        <div>
                          <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                            {exp.personnel?.firstName} {exp.personnel?.lastName}
                          </p>
                          <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                            Week of {exp.weekStartDate} • {exp.totalHours.toFixed(1)} hrs
                            {exp.overtimeHours > 0 && ` (${exp.overtimeHours.toFixed(1)} OT)`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {!exp.qbMapping && (
                            <span className="px-2 py-1 rounded text-xs bg-red-500/20 text-red-400">
                              Not Mapped
                            </span>
                          )}
                          {exp.status === "pending" && exp.qbMapping && (
                            <button
                              onClick={() => handleApproveExport(exp._id)}
                              className="px-3 py-1 rounded text-sm font-medium bg-green-500/20 text-green-400 hover:bg-green-500/30"
                            >
                              Approve
                            </button>
                          )}
                          {exp.status === "approved" && (
                            <span className="px-2 py-1 rounded text-xs bg-green-500/20 text-green-400">
                              Approved
                            </span>
                          )}
                        </div>
                      </div>
                    ))}

                    {(!pendingExports || pendingExports.length === 0) && (
                      <div className="text-center py-8">
                        <p className={isDark ? "text-slate-400" : "text-gray-500"}>
                          No pending exports. Click "Calculate This Week" to generate.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "logs" && (
                <div className={`rounded-xl p-6 ${isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white border border-gray-200 shadow-sm"}`}>
                  <h3 className={`text-lg font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
                    Sync Logs
                  </h3>
                  <div className="space-y-2">
                    {syncLogs?.map((log) => (
                      <div
                        key={log._id}
                        className={`flex items-center justify-between p-3 rounded-lg ${isDark ? "bg-slate-700/30" : "bg-gray-50"}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-2 h-2 rounded-full ${
                            log.status === "completed" ? "bg-green-400" :
                            log.status === "failed" ? "bg-red-400" : "bg-amber-400"
                          }`} />
                          <div>
                            <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                              {log.operation}
                            </p>
                            {log.message && (
                              <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                                {log.message}
                              </p>
                            )}
                          </div>
                        </div>
                        <p className={`text-sm ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                          {new Date(log.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))}

                    {(!syncLogs || syncLogs.length === 0) && (
                      <div className="text-center py-8">
                        <p className={isDark ? "text-slate-400" : "text-gray-500"}>
                          No sync logs yet.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Setup Instructions */}
          <div className={`rounded-xl p-6 ${isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white border border-gray-200 shadow-sm"}`}>
            <h3 className={`text-lg font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
              Setup Instructions
            </h3>
            <ol className={`list-decimal list-inside space-y-3 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
              <li>Configure the connection settings above with your QuickBooks company name</li>
              <li>Download the .QWC file and save it to the computer running QuickBooks</li>
              <li>Open QuickBooks Desktop and go to <strong>File → App Management → Update Web Services</strong></li>
              <li>Click "Add an Application" and select the downloaded .QWC file</li>
              <li>When prompted, enter the password you configured above</li>
              <li>Grant access permissions when QuickBooks asks</li>
              <li>Map your IE Central employees to QuickBooks employees in the Mapping tab</li>
              <li>The Web Connector will automatically sync at the configured interval</li>
            </ol>
          </div>
        </div>
      </main>

      {/* Setup Modal */}
      {showSetup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={`w-full max-w-lg rounded-xl p-6 ${isDark ? "bg-slate-800 border border-slate-700" : "bg-white border border-gray-200"}`}>
            <h2 className={`text-xl font-bold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
              QuickBooks Connection Setup
            </h2>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                  Company Name
                </label>
                <input
                  type="text"
                  value={setupForm.companyName}
                  onChange={(e) => setSetupForm({ ...setupForm, companyName: e.target.value })}
                  placeholder="Your QuickBooks Company Name"
                  className={`w-full px-4 py-2 rounded-lg ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-gray-300 text-gray-900"} border`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                  Web Connector Username
                </label>
                <input
                  type="text"
                  value={setupForm.wcUsername}
                  onChange={(e) => setSetupForm({ ...setupForm, wcUsername: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-gray-300 text-gray-900"} border`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                  Web Connector Password
                </label>
                <input
                  type="password"
                  value={setupForm.wcPassword}
                  onChange={(e) => setSetupForm({ ...setupForm, wcPassword: e.target.value })}
                  placeholder="Create a secure password"
                  className={`w-full px-4 py-2 rounded-lg ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-gray-300 text-gray-900"} border`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                  Sync Interval (minutes)
                </label>
                <select
                  value={setupForm.syncIntervalMinutes}
                  onChange={(e) => setSetupForm({ ...setupForm, syncIntervalMinutes: parseInt(e.target.value) })}
                  className={`w-full px-4 py-2 rounded-lg ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-gray-300 text-gray-900"} border`}
                >
                  <option value={5}>Every 5 minutes</option>
                  <option value={15}>Every 15 minutes</option>
                  <option value={30}>Every 30 minutes</option>
                  <option value={60}>Every hour</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className={`flex items-center gap-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                  <input
                    type="checkbox"
                    checked={setupForm.syncTimeEntries}
                    onChange={(e) => setSetupForm({ ...setupForm, syncTimeEntries: e.target.checked })}
                    className="rounded"
                  />
                  <span>Export time entries to QuickBooks</span>
                </label>
                <label className={`flex items-center gap-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                  <input
                    type="checkbox"
                    checked={setupForm.syncPayStubs}
                    onChange={(e) => setSetupForm({ ...setupForm, syncPayStubs: e.target.checked })}
                    className="rounded"
                  />
                  <span>Import pay stubs from QuickBooks</span>
                </label>
                <label className={`flex items-center gap-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                  <input
                    type="checkbox"
                    checked={setupForm.syncEmployees}
                    onChange={(e) => setSetupForm({ ...setupForm, syncEmployees: e.target.checked })}
                    className="rounded"
                  />
                  <span>Sync employee list</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowSetup(false)}
                className={`px-4 py-2 rounded-lg ${isDark ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveConnection}
                disabled={isSaving || !setupForm.companyName || !setupForm.wcPassword}
                className={`px-4 py-2 rounded-lg font-medium disabled:opacity-50 ${isDark ? "bg-cyan-600 hover:bg-cyan-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
              >
                {isSaving ? "Saving..." : "Save Connection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Mapping Modal */}
      {showMappingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={`w-full max-w-lg rounded-xl p-6 ${isDark ? "bg-slate-800 border border-slate-700" : "bg-white border border-gray-200"}`}>
            <h2 className={`text-xl font-bold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
              Map Employee to QuickBooks
            </h2>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                  IE Central Employee
                </label>
                <select
                  value={selectedPersonnel || ""}
                  onChange={(e) => setSelectedPersonnel(e.target.value as Id<"personnel">)}
                  className={`w-full px-4 py-2 rounded-lg ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-gray-300 text-gray-900"} border`}
                >
                  <option value="">Select employee...</option>
                  {unmappedPersonnel?.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.firstName} {p.lastName} - {p.position}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                  QuickBooks Employee Name
                </label>
                <input
                  type="text"
                  value={qbName}
                  onChange={(e) => setQbName(e.target.value)}
                  placeholder="Name as it appears in QuickBooks"
                  className={`w-full px-4 py-2 rounded-lg ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-gray-300 text-gray-900"} border`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                  QuickBooks List ID
                </label>
                <input
                  type="text"
                  value={qbListId}
                  onChange={(e) => setQbListId(e.target.value)}
                  placeholder="e.g., 80000001-1234567890"
                  className={`w-full px-4 py-2 rounded-lg ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-gray-300 text-gray-900"} border`}
                />
                <p className={`text-xs mt-1 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                  The List ID is auto-populated when employees sync from QuickBooks
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowMappingModal(false);
                  setSelectedPersonnel(null);
                  setQbListId("");
                  setQbName("");
                }}
                className={`px-4 py-2 rounded-lg ${isDark ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateMapping}
                disabled={!selectedPersonnel || !qbListId || !qbName}
                className={`px-4 py-2 rounded-lg font-medium disabled:opacity-50 ${isDark ? "bg-cyan-600 hover:bg-cyan-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
              >
                Create Mapping
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function QuickBooksSettingsPage() {
  return (
    <Protected>
      <QuickBooksSettingsContent />
    </Protected>
  );
}
