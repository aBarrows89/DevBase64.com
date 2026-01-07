"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Protected from "../../protected";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useTheme } from "../../theme-context";
import { useAuth } from "../../auth-context";

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDuration(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function HoursContent() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const router = useRouter();
  const { user, canAccessEmployeePortal } = useAuth();
  const personnelId = user?.personnelId;

  const [periodOffset, setPeriodOffset] = useState(0);

  // Get current pay period
  const payPeriod = useQuery(api.employeePortal.getCurrentPayPeriod);

  // Calculate the pay period based on offset
  const getPeriodDates = () => {
    if (!payPeriod) return { startDate: "", endDate: "" };

    const start = new Date(payPeriod.startDate);
    start.setDate(start.getDate() + periodOffset * 14);
    const end = new Date(start);
    end.setDate(end.getDate() + 13);

    return {
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
    };
  };

  const { startDate, endDate } = getPeriodDates();

  const hours = useQuery(
    api.employeePortal.getMyHours,
    personnelId && startDate ? { personnelId, startDate, endDate } : "skip"
  );

  if (!canAccessEmployeePortal) {
    router.push("/");
    return null;
  }

  if (!personnelId) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? "bg-slate-900" : "bg-gray-50"}`}>
        <p className={isDark ? "text-slate-400" : "text-gray-500"}>Account not linked to personnel record.</p>
      </div>
    );
  }

  const startDateObj = startDate ? new Date(startDate + "T00:00:00") : new Date();
  const endDateObj = endDate ? new Date(endDate + "T00:00:00") : new Date();

  return (
    <div className={`min-h-screen ${isDark ? "bg-slate-900" : "bg-gray-50"}`}>
      {/* Header */}
      <header className={`sticky top-0 z-10 border-b px-4 py-4 ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
        <div className="max-w-lg mx-auto flex items-center gap-4">
          <Link
            href="/portal"
            className={`p-2 -ml-2 rounded-lg ${isDark ? "hover:bg-slate-700" : "hover:bg-gray-100"}`}
          >
            <svg className={`w-6 h-6 ${isDark ? "text-white" : "text-gray-900"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
              My Hours
            </h1>
            <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
              Pay Period: {startDateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" })} -{" "}
              {endDateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Period Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPeriodOffset((o) => o - 1)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${isDark ? "bg-slate-800 text-white hover:bg-slate-700" : "bg-white text-gray-900 hover:bg-gray-100 border border-gray-200"}`}
          >
            Previous
          </button>
          {periodOffset !== 0 && (
            <button
              onClick={() => setPeriodOffset(0)}
              className={`px-4 py-2 rounded-lg font-medium ${isDark ? "text-cyan-400" : "text-blue-600"}`}
            >
              Current
            </button>
          )}
          <button
            onClick={() => setPeriodOffset((o) => o + 1)}
            disabled={periodOffset >= 0}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${periodOffset >= 0 ? "opacity-50 cursor-not-allowed" : ""} ${isDark ? "bg-slate-800 text-white hover:bg-slate-700" : "bg-white text-gray-900 hover:bg-gray-100 border border-gray-200"}`}
          >
            Next
          </button>
        </div>

        {/* Summary Card */}
        <div className={`rounded-2xl p-6 ${isDark ? "bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30" : "bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200"}`}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className={`text-sm ${isDark ? "text-cyan-400" : "text-blue-600"}`}>Total Hours</p>
              <p className={`text-3xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                {hours ? formatDuration(hours.totalHours) : "--"}
              </p>
            </div>
            <div>
              <p className={`text-sm ${isDark ? "text-cyan-400" : "text-blue-600"}`}>Days Worked</p>
              <p className={`text-3xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                {hours?.daysWorked || 0}
              </p>
            </div>
          </div>
          {hours && hours.totalBreakMinutes > 0 && (
            <p className={`text-sm mt-4 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
              Total break time: {Math.floor(hours.totalBreakMinutes / 60)}h {hours.totalBreakMinutes % 60}m
            </p>
          )}
        </div>

        {/* Daily Breakdown */}
        <div className="space-y-3">
          <h2 className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>Daily Breakdown</h2>

          {hours?.days && hours.days.length > 0 ? (
            hours.days.map((day) => (
              <div
                key={day.date}
                className={`rounded-xl p-4 ${isDark ? "bg-slate-800 border border-slate-700" : "bg-white border border-gray-200"}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                    {new Date(day.date + "T00:00:00").toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <span className={`font-bold ${isDark ? "text-cyan-400" : "text-blue-600"}`}>
                    {formatDuration(day.totalHours)}
                  </span>
                </div>
                <div className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                  {day.clockIn && (
                    <span>In: {formatTime(day.clockIn)}</span>
                  )}
                  {day.clockOut && (
                    <span className="ml-4">Out: {formatTime(day.clockOut)}</span>
                  )}
                  {day.breakMinutes > 0 && (
                    <span className="ml-4">Break: {day.breakMinutes}m</span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className={`rounded-xl p-6 text-center ${isDark ? "bg-slate-800 border border-slate-700" : "bg-white border border-gray-200"}`}>
              <p className={isDark ? "text-slate-400" : "text-gray-500"}>
                No hours recorded for this pay period
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function HoursPage() {
  return (
    <Protected>
      <HoursContent />
    </Protected>
  );
}
