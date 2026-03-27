"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Protected from "../../../protected";
import Sidebar, { MobileHeader } from "@/components/Sidebar";
import { useTheme } from "../../../theme-context";
import { useAuth } from "../../../auth-context";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import ScannerStatusDot, { getScannerHealth } from "../components/ScannerStatusDot";
import ScannerBatteryBar from "../components/ScannerBatteryBar";
import WifiSignalIcon from "../components/WifiSignalIcon";

type CommandType = "lock" | "unlock" | "wipe" | "install_apk" | "push_config" | "restart" | "update_pin";

function ScannerDetailContent() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const scannerId = params.id as Id<"scanners">;

  const [activeTab, setActiveTab] = useState<"commands" | "history" | "conditions">("commands");
  const [showCommandModal, setShowCommandModal] = useState(false);
  const [pendingCommand, setPendingCommand] = useState<CommandType | null>(null);
  const [commandPayload, setCommandPayload] = useState("");
  const [wipeConfirmText, setWipeConfirmText] = useState("");
  const [sending, setSending] = useState(false);

  const scanner = useQuery(api.scannerMdm.getScannerDetail, { id: scannerId });
  const logCommand = useMutation(api.scannerMdm.logScannerCommand);

  const canEdit = user?.role === "super_admin" || user?.role === "admin" || user?.role === "warehouse_director" || user?.role === "warehouse_manager";
  const isSuperAdmin = user?.role === "super_admin";

  const timeAgo = (ts?: number) => {
    if (!ts) return "Never";
    const diff = Date.now() - ts;
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  const formatDate = (ts?: number) => {
    if (!ts) return "—";
    return new Date(ts).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
    });
  };

  const initiateCommand = (cmd: CommandType) => {
    setPendingCommand(cmd);
    setCommandPayload("");
    setWipeConfirmText("");
    setShowCommandModal(true);
  };

  const executeCommand = async () => {
    if (!pendingCommand || !scanner || !user) return;

    // Wipe requires typing the scanner number
    if (pendingCommand === "wipe" && wipeConfirmText !== scanner.number) return;

    setSending(true);
    try {
      // Log command in Convex
      await logCommand({
        scannerId,
        command: pendingCommand,
        payload: commandPayload || undefined,
        userId: user._id,
        userName: user.name ?? user.email,
      });

      // Send command to AWS
      await fetch("/api/scanner-mdm/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thingName: scanner.iotThingName,
          command: pendingCommand,
          payload: commandPayload ? JSON.parse(commandPayload) : {},
          scannerId,
          userId: user._id,
          confirmed: true,
        }),
      });

      setShowCommandModal(false);
      setPendingCommand(null);
    } catch (err) {
      console.error("Command failed:", err);
    } finally {
      setSending(false);
    }
  };

  if (!scanner) {
    return (
      <Protected>
        <div className="flex h-screen">
          <Sidebar />
          <main className={`flex-1 flex items-center justify-center ${isDark ? "bg-slate-950" : "bg-gray-50"}`}>
            <MobileHeader />
            <div className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>Loading scanner...</div>
          </main>
        </div>
      </Protected>
    );
  }

  const health = getScannerHealth(scanner);
  const isProvisioned = scanner.mdmStatus === "provisioned";

  const commandButtons: { cmd: CommandType; label: string; icon: string; color: string; requiresAdmin?: boolean }[] = [
    { cmd: "lock", label: "Lock", icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z", color: "amber" },
    { cmd: "unlock", label: "Unlock", icon: "M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z", color: "emerald" },
    { cmd: "install_apk", label: "Push Update", icon: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4", color: "cyan" },
    { cmd: "push_config", label: "Push Config", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z", color: "purple" },
    { cmd: "update_pin", label: "Change PIN", icon: "M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z", color: "blue" },
    { cmd: "restart", label: "Restart", icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15", color: "slate" },
    { cmd: "wipe", label: "Factory Reset", icon: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16", color: "red", requiresAdmin: true },
  ];

  const commandStatusColors: Record<string, string> = {
    sent: "text-blue-400 bg-blue-500/10",
    acknowledged: "text-cyan-400 bg-cyan-500/10",
    completed: "text-emerald-400 bg-emerald-500/10",
    failed: "text-red-400 bg-red-500/10",
    timeout: "text-amber-400 bg-amber-500/10",
  };

  return (
    <Protected>
      <div className="flex h-screen">
        <Sidebar />
        <main className={`flex-1 overflow-auto ${isDark ? "bg-slate-950" : "bg-gray-50"}`}>
          <MobileHeader />

          {/* Header */}
          <div className={`border-b ${isDark ? "bg-slate-950 border-slate-800" : "bg-gray-50 border-gray-200"}`}>
            <div className="px-4 sm:px-6 lg:px-8 py-4">
              <button
                onClick={() => router.push("/equipment/scanners")}
                className={`flex items-center gap-1 text-sm mb-3 transition-colors ${isDark ? "text-slate-400 hover:text-slate-200" : "text-gray-500 hover:text-gray-700"}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Fleet
              </button>
              <div className="flex items-center gap-3">
                <ScannerStatusDot health={health} size="lg" />
                <div>
                  <h1 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                    Scanner {scanner.number}
                  </h1>
                  <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    {scanner.locationName} &middot; {scanner.model ?? "Unknown Model"} &middot; {health === "online" ? "Online" : health === "warning" ? "Needs Attention" : health === "offline" ? "Offline" : "Not Provisioned"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 sm:px-6 lg:px-8 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Left Column: Device Info */}
              <div className="space-y-6">
                {/* Device Info Card */}
                <div className={`rounded-xl border p-5 ${isDark ? "bg-slate-900/50 border-slate-800" : "bg-white border-gray-200"}`}>
                  <h3 className={`text-sm font-semibold uppercase tracking-wider mb-4 ${isDark ? "text-slate-400" : "text-gray-500"}`}>Device Info</h3>
                  <div className="space-y-3">
                    {[
                      { label: "Model", value: scanner.model },
                      { label: "Serial #", value: scanner.serialNumber },
                      { label: "Android", value: scanner.androidVersion },
                      { label: "Agent", value: scanner.agentVersion ? `v${scanner.agentVersion}` : null },
                      { label: "IoT Thing", value: scanner.iotThingName },
                      { label: "MDM Status", value: scanner.mdmStatus },
                      { label: "Provisioned", value: scanner.provisionedAt ? formatDate(scanner.provisionedAt) : null },
                      { label: "PIN", value: scanner.pin ? "****" : null },
                      { label: "Status", value: scanner.status },
                      { label: "Purchase Date", value: scanner.purchaseDate },
                    ].map(({ label, value }) => value && (
                      <div key={label} className="flex items-center justify-between">
                        <span className={`text-xs ${isDark ? "text-slate-500" : "text-gray-400"}`}>{label}</span>
                        <span className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-gray-700"}`}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Assignment Card */}
                <div className={`rounded-xl border p-5 ${isDark ? "bg-slate-900/50 border-slate-800" : "bg-white border-gray-200"}`}>
                  <h3 className={`text-sm font-semibold uppercase tracking-wider mb-4 ${isDark ? "text-slate-400" : "text-gray-500"}`}>Assignment</h3>
                  {scanner.assignedPersonName ? (
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${isDark ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-600"}`}>
                        {scanner.assignedPersonName.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <div>
                        <div className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>{scanner.assignedPersonName}</div>
                        <div className={`text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                          Since {scanner.assignedAt ? formatDate(scanner.assignedAt) : "—"}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className={`text-sm ${isDark ? "text-slate-500" : "text-gray-400"}`}>Unassigned</p>
                  )}
                </div>

                {/* Notes */}
                {(scanner.notes || scanner.conditionNotes) && (
                  <div className={`rounded-xl border p-5 ${isDark ? "bg-slate-900/50 border-slate-800" : "bg-white border-gray-200"}`}>
                    <h3 className={`text-sm font-semibold uppercase tracking-wider mb-3 ${isDark ? "text-slate-400" : "text-gray-500"}`}>Notes</h3>
                    {scanner.notes && (
                      <p className={`text-sm mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>{scanner.notes}</p>
                    )}
                    {scanner.conditionNotes && (
                      <p className={`text-sm px-3 py-2 rounded-lg ${isDark ? "bg-amber-500/10 text-amber-300" : "bg-amber-50 text-amber-700"}`}>{scanner.conditionNotes}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column: Telemetry + Actions + Timeline */}
              <div className="lg:col-span-2 space-y-6">
                {/* Live Telemetry */}
                <div className={`rounded-xl border p-5 ${isDark ? "bg-slate-900/50 border-slate-800" : "bg-white border-gray-200"}`}>
                  <h3 className={`text-sm font-semibold uppercase tracking-wider mb-4 ${isDark ? "text-slate-400" : "text-gray-500"}`}>Live Telemetry</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <div className={`text-xs mb-1 ${isDark ? "text-slate-500" : "text-gray-400"}`}>Battery</div>
                      <ScannerBatteryBar level={scanner.batteryLevel} size="md" showLabel />
                    </div>
                    <div>
                      <div className={`text-xs mb-1 ${isDark ? "text-slate-500" : "text-gray-400"}`}>WiFi Signal</div>
                      <WifiSignalIcon signal={scanner.wifiSignal} showLabel />
                    </div>
                    <div>
                      <div className={`text-xs mb-1 ${isDark ? "text-slate-500" : "text-gray-400"}`}>Last Seen</div>
                      <span className={`text-sm font-medium ${isDark ? "text-slate-300" : "text-gray-700"}`}>{timeAgo(scanner.lastSeen)}</span>
                    </div>
                    <div>
                      <div className={`text-xs mb-1 ${isDark ? "text-slate-500" : "text-gray-400"}`}>Locked</div>
                      <span className={`text-sm font-medium ${scanner.isLocked ? "text-amber-400" : isDark ? "text-emerald-400" : "text-emerald-600"}`}>
                        {scanner.isLocked ? "Yes" : "No"}
                      </span>
                    </div>
                  </div>

                  {/* Installed Apps */}
                  {scanner.installedApps && (
                    <div className={`mt-4 pt-4 border-t ${isDark ? "border-slate-800" : "border-gray-100"}`}>
                      <div className={`text-xs mb-2 ${isDark ? "text-slate-500" : "text-gray-400"}`}>Installed Apps</div>
                      <div className="flex flex-wrap gap-2">
                        {scanner.installedApps.tireTrack && (
                          <span className={`text-xs px-2.5 py-1 rounded-full ${isDark ? "bg-cyan-500/10 text-cyan-400" : "bg-cyan-50 text-cyan-700"}`}>
                            TireTrack v{scanner.installedApps.tireTrack}
                          </span>
                        )}
                        {scanner.installedApps.rtLocator && (
                          <span className={`text-xs px-2.5 py-1 rounded-full ${isDark ? "bg-purple-500/10 text-purple-400" : "bg-purple-50 text-purple-700"}`}>
                            RT Locator v{scanner.installedApps.rtLocator}
                          </span>
                        )}
                        {scanner.installedApps.scannerAgent && (
                          <span className={`text-xs px-2.5 py-1 rounded-full ${isDark ? "bg-slate-500/10 text-slate-400" : "bg-gray-100 text-gray-600"}`}>
                            Agent v{scanner.installedApps.scannerAgent}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Remote Actions */}
                {canEdit && isProvisioned && (
                  <div className={`rounded-xl border p-5 ${isDark ? "bg-slate-900/50 border-slate-800" : "bg-white border-gray-200"}`}>
                    <h3 className={`text-sm font-semibold uppercase tracking-wider mb-4 ${isDark ? "text-slate-400" : "text-gray-500"}`}>Remote Actions</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                      {commandButtons
                        .filter((btn) => !btn.requiresAdmin || isSuperAdmin)
                        .map((btn) => (
                          <button
                            key={btn.cmd}
                            onClick={() => initiateCommand(btn.cmd)}
                            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                              isDark
                                ? `bg-${btn.color}-500/10 text-${btn.color}-400 hover:bg-${btn.color}-500/20 border border-${btn.color}-500/20`
                                : `bg-${btn.color}-50 text-${btn.color}-600 hover:bg-${btn.color}-100 border border-${btn.color}-200`
                            }`}
                          >
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={btn.icon} />
                            </svg>
                            {btn.label}
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {/* Timeline Tabs */}
                <div className={`rounded-xl border ${isDark ? "bg-slate-900/50 border-slate-800" : "bg-white border-gray-200"}`}>
                  <div className={`flex border-b ${isDark ? "border-slate-800" : "border-gray-200"}`}>
                    {(["commands", "history", "conditions"] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                          activeTab === tab
                            ? isDark ? "text-cyan-400 border-b-2 border-cyan-400" : "text-blue-600 border-b-2 border-blue-600"
                            : isDark ? "text-slate-400 hover:text-slate-300" : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        {tab === "commands" ? "Command History" : tab === "history" ? "Assignment History" : "Condition Checks"}
                      </button>
                    ))}
                  </div>

                  <div className="p-5">
                    {activeTab === "commands" && (
                      <div className="space-y-3">
                        {scanner.commands?.length === 0 && (
                          <p className={`text-sm ${isDark ? "text-slate-500" : "text-gray-400"}`}>No commands sent yet</p>
                        )}
                        {scanner.commands?.map((cmd) => (
                          <div key={cmd._id} className={`flex items-center justify-between p-3 rounded-lg ${isDark ? "bg-slate-800/50" : "bg-gray-50"}`}>
                            <div className="flex items-center gap-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${commandStatusColors[cmd.status] ?? "text-slate-400 bg-slate-500/10"}`}>
                                {cmd.status}
                              </span>
                              <div>
                                <span className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>{cmd.command}</span>
                                <span className={`text-xs ml-2 ${isDark ? "text-slate-500" : "text-gray-400"}`}>by {cmd.issuedByName}</span>
                              </div>
                            </div>
                            <span className={`text-xs ${isDark ? "text-slate-500" : "text-gray-400"}`}>{formatDate(cmd.issuedAt)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {activeTab === "history" && (
                      <div className="space-y-3">
                        {scanner.history?.length === 0 && (
                          <p className={`text-sm ${isDark ? "text-slate-500" : "text-gray-400"}`}>No history yet</p>
                        )}
                        {scanner.history?.map((h) => (
                          <div key={h._id} className={`flex items-center justify-between p-3 rounded-lg ${isDark ? "bg-slate-800/50" : "bg-gray-50"}`}>
                            <div>
                              <span className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>{h.action.replace(/_/g, " ")}</span>
                              {h.newAssigneeName && (
                                <span className={`text-xs ml-2 ${isDark ? "text-slate-400" : "text-gray-500"}`}>to {h.newAssigneeName}</span>
                              )}
                              {h.notes && (
                                <p className={`text-xs mt-0.5 ${isDark ? "text-slate-500" : "text-gray-400"}`}>{h.notes}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <div className={`text-xs ${isDark ? "text-slate-500" : "text-gray-400"}`}>{formatDate(h.createdAt)}</div>
                              <div className={`text-xs ${isDark ? "text-slate-600" : "text-gray-300"}`}>{h.performedByName}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {activeTab === "conditions" && (
                      <p className={`text-sm ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                        Condition checks are performed during equipment returns and reassignments on the Equipment page.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Command Confirmation Modal */}
          {showCommandModal && pendingCommand && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className={`border rounded-xl p-6 w-full max-w-md ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
                <h2 className={`text-lg font-semibold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                  {pendingCommand === "wipe" ? "Factory Reset Scanner" : `${pendingCommand.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} — Scanner ${scanner.number}`}
                </h2>

                {pendingCommand === "wipe" ? (
                  <>
                    <div className={`p-3 rounded-lg mb-4 ${isDark ? "bg-red-500/10 border border-red-500/30" : "bg-red-50 border border-red-200"}`}>
                      <p className={`text-sm font-medium ${isDark ? "text-red-300" : "text-red-700"}`}>
                        This will erase ALL data on the scanner and restore factory settings. This cannot be undone.
                      </p>
                    </div>
                    <label className={`block text-sm mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                      Type <span className="font-bold">{scanner.number}</span> to confirm:
                    </label>
                    <input
                      type="text"
                      value={wipeConfirmText}
                      onChange={(e) => setWipeConfirmText(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg text-sm mb-4 focus:outline-none ${isDark ? "bg-slate-900/50 border-slate-600 text-white focus:border-red-500" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-red-500"}`}
                      placeholder={scanner.number}
                    />
                  </>
                ) : pendingCommand === "update_pin" ? (
                  <>
                    <p className={`text-sm mb-3 ${isDark ? "text-slate-300" : "text-gray-600"}`}>Enter new PIN for this scanner:</p>
                    <input
                      type="text"
                      value={commandPayload}
                      onChange={(e) => setCommandPayload(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className={`w-full px-3 py-2 border rounded-lg text-sm mb-4 focus:outline-none ${isDark ? "bg-slate-900/50 border-slate-600 text-white focus:border-cyan-500" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500"}`}
                      placeholder="1234"
                      maxLength={6}
                    />
                  </>
                ) : (
                  <p className={`text-sm mb-4 ${isDark ? "text-slate-300" : "text-gray-600"}`}>
                    {pendingCommand === "lock" && "This will lock the scanner screen immediately."}
                    {pendingCommand === "unlock" && "This will unlock the scanner screen."}
                    {pendingCommand === "install_apk" && "This will push the latest APK updates to the scanner."}
                    {pendingCommand === "push_config" && "This will push the latest RT Locator configuration."}
                    {pendingCommand === "restart" && "This will restart the scanner device."}
                  </p>
                )}

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => { setShowCommandModal(false); setPendingCommand(null); }}
                    className={`px-4 py-2 text-sm font-medium rounded-lg ${isDark ? "text-slate-300 hover:bg-slate-700" : "text-gray-600 hover:bg-gray-100"}`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={executeCommand}
                    disabled={sending || (pendingCommand === "wipe" && wipeConfirmText !== scanner.number)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
                      pendingCommand === "wipe"
                        ? "bg-red-500 text-white hover:bg-red-600"
                        : isDark ? "bg-cyan-500 text-white hover:bg-cyan-600" : "bg-blue-500 text-white hover:bg-blue-600"
                    }`}
                  >
                    {sending ? "Sending..." : pendingCommand === "wipe" ? "Factory Reset" : "Send Command"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </Protected>
  );
}

export default function ScannerDetailPage() {
  return <ScannerDetailContent />;
}
