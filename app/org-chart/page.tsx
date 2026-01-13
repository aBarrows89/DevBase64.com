"use client";

import Protected from "../protected";
import Sidebar, { MobileHeader } from "@/components/Sidebar";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useTheme } from "../theme-context";

// Role badge colors
const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  admin: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  warehouse_director: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  warehouse_manager: "bg-green-500/20 text-green-400 border-green-500/30",
  department_manager: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  payroll_manager: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  coo: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  employee: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  member: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

interface OrgUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  roleLabel: string;
  managedDepartments: string[];
  managedLocationNames: string[];
}

// Individual user card component
function OrgCard({ user, isDark }: { user: OrgUser; isDark: boolean }) {
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={`relative p-4 rounded-xl border min-w-[180px] max-w-[220px] ${
        isDark
          ? "bg-slate-800/50 border-slate-700 hover:bg-slate-800"
          : "bg-white border-gray-200 shadow-sm hover:shadow-md"
      } transition-all`}
    >
      {/* Connector line from above */}
      <div
        className={`absolute -top-3 left-1/2 -translate-x-1/2 w-0.5 h-3 ${
          isDark ? "bg-slate-600" : "bg-gray-300"
        }`}
      />

      {/* Avatar */}
      <div className="flex justify-center mb-3">
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold ${
            isDark
              ? "bg-gradient-to-br from-cyan-400 to-blue-500"
              : "bg-gradient-to-br from-blue-500 to-blue-600"
          }`}
        >
          {initials}
        </div>
      </div>

      {/* Name */}
      <h3
        className={`text-sm font-semibold text-center truncate ${
          isDark ? "text-white" : "text-gray-900"
        }`}
      >
        {user.name}
      </h3>

      {/* Role badge */}
      <div className="flex justify-center mt-2">
        <span
          className={`px-2 py-0.5 text-xs font-medium rounded border ${
            ROLE_COLORS[user.role] || ROLE_COLORS.member
          }`}
        >
          {user.roleLabel}
        </span>
      </div>

      {/* Managed items */}
      {(user.managedDepartments.length > 0 ||
        user.managedLocationNames.length > 0) && (
        <div
          className={`mt-3 pt-3 border-t ${
            isDark ? "border-slate-700" : "border-gray-200"
          }`}
        >
          {user.managedDepartments.length > 0 && (
            <div className="mb-1">
              <p
                className={`text-[10px] uppercase tracking-wide ${
                  isDark ? "text-slate-500" : "text-gray-400"
                }`}
              >
                Departments
              </p>
              <p
                className={`text-xs ${
                  isDark ? "text-slate-300" : "text-gray-600"
                }`}
              >
                {user.managedDepartments.join(", ")}
              </p>
            </div>
          )}
          {user.managedLocationNames.length > 0 && (
            <div>
              <p
                className={`text-[10px] uppercase tracking-wide ${
                  isDark ? "text-slate-500" : "text-gray-400"
                }`}
              >
                Locations
              </p>
              <p
                className={`text-xs ${
                  isDark ? "text-slate-300" : "text-gray-600"
                }`}
              >
                {user.managedLocationNames.join(", ")}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Role level component
function OrgLevel({
  role,
  roleLabel,
  users,
  isDark,
  isFirst,
}: {
  role: string;
  roleLabel: string;
  users: OrgUser[];
  isDark: boolean;
  isFirst: boolean;
}) {
  if (users.length === 0) return null;

  return (
    <div className="flex flex-col items-center relative">
      {/* Vertical connector from above (except first level) */}
      {!isFirst && (
        <div
          className={`w-0.5 h-6 ${isDark ? "bg-slate-600" : "bg-gray-300"}`}
        />
      )}

      {/* Level label */}
      <div
        className={`px-3 py-1 rounded-full text-xs font-medium mb-3 ${
          isDark ? "bg-slate-700/50 text-slate-400" : "bg-gray-100 text-gray-500"
        }`}
      >
        {roleLabel} ({users.length})
      </div>

      {/* Cards container */}
      <div className="relative">
        {/* Horizontal connector line (if multiple cards) */}
        {users.length > 1 && (
          <div
            className={`absolute top-0 left-[90px] right-[90px] h-0.5 -translate-y-3 ${
              isDark ? "bg-slate-600" : "bg-gray-300"
            }`}
          />
        )}

        {/* Cards */}
        <div className="flex flex-wrap justify-center gap-4">
          {users.map((user) => (
            <OrgCard key={user._id} user={user} isDark={isDark} />
          ))}
        </div>
      </div>
    </div>
  );
}

function OrgChartContent() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const orgData = useQuery(api.orgChart.getOrgChartData);

  // Loading state
  if (!orgData) {
    return (
      <div
        className={`flex h-screen ${isDark ? "bg-slate-900" : "bg-[#f2f2f7]"}`}
      >
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div
            className={`text-center ${
              isDark ? "text-slate-400" : "text-gray-500"
            }`}
          >
            Loading org chart...
          </div>
        </main>
      </div>
    );
  }

  // Track if we've rendered any level (for first level detection)
  let renderedLevels = 0;

  return (
    <div
      className={`flex h-screen ${isDark ? "bg-slate-900" : "bg-[#f2f2f7]"}`}
    >
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <MobileHeader />

        {/* Header */}
        <header
          className={`sticky top-0 z-10 backdrop-blur-sm border-b px-4 sm:px-8 py-3 sm:py-4 ${
            isDark
              ? "bg-slate-900/80 border-slate-700"
              : "bg-white/80 border-gray-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h1
                className={`text-xl sm:text-2xl font-bold ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                Organization Chart
              </h1>
              <p
                className={`text-xs sm:text-sm mt-1 ${
                  isDark ? "text-slate-400" : "text-gray-500"
                }`}
              >
                Role-based hierarchy and management structure
              </p>
            </div>
            <div
              className={`text-sm ${
                isDark ? "text-slate-400" : "text-gray-500"
              }`}
            >
              {orgData.totalUsers} active users
            </div>
          </div>
        </header>

        {/* Tree */}
        <div className="p-4 sm:p-8">
          <div className="flex flex-col items-center gap-6">
            {orgData.roleHierarchy.map((role: string) => {
              const users = orgData.usersByRole[role] || [];
              if (users.length === 0) return null;

              const isFirst = renderedLevels === 0;
              renderedLevels++;

              return (
                <OrgLevel
                  key={role}
                  role={role}
                  roleLabel={orgData.roleLabels[role] || role}
                  users={users}
                  isDark={isDark}
                  isFirst={isFirst}
                />
              );
            })}
          </div>

          {/* Empty state */}
          {orgData.totalUsers === 0 && (
            <div className="text-center py-12">
              <p className={isDark ? "text-slate-500" : "text-gray-500"}>
                No users found in the organization.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function OrgChartPage() {
  return (
    <Protected>
      <OrgChartContent />
    </Protected>
  );
}
