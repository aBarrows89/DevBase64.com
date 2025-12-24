"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/app/auth-context";
import { useTheme } from "@/app/theme-context";
import { useSidebar } from "@/app/sidebar-context";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  requiresPermission?: "viewPersonnel" | "viewShifts";
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { href: "/projects", label: "Projects", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
  { href: "/jobs", label: "Job Listings", icon: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
  { href: "/applications", label: "Applications", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { href: "/personnel", label: "Personnel", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z", requiresPermission: "viewPersonnel" },
  { href: "/time-clock", label: "Time Clock", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", requiresPermission: "viewPersonnel" },
  { href: "/locations", label: "Locations", icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" },
  { href: "/equipment", label: "Equipment", icon: "M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" },
  { href: "/documents", label: "Doc Hub", icon: "M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z M12 3v6h6" },
  { href: "/shifts", label: "Shift Planning", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z", requiresPermission: "viewShifts" },
  { href: "/website-messages", label: "Website Messages", icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
  { href: "/users", label: "Users", icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" },
  { href: "/messages", label: "Messages", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" },
];

const BOTTOM_NAV_ITEMS = [
  { href: "/settings", label: "Settings", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout, canViewPersonnel, canViewShifts } = useAuth();
  const { theme } = useTheme();
  const { isOpen, close } = useSidebar();

  const isDark = theme === "dark";

  // Filter nav items based on permissions
  const filteredNavItems = NAV_ITEMS.filter((item) => {
    if (!item.requiresPermission) return true;
    if (item.requiresPermission === "viewPersonnel") return canViewPersonnel;
    if (item.requiresPermission === "viewShifts") return canViewShifts;
    return true;
  });

  const handleNavClick = () => {
    // Close sidebar on mobile when nav item is clicked
    close();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={close}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 border-r flex flex-col theme-sidebar
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          ${isDark ? "bg-slate-800/95 lg:bg-slate-800/50 border-slate-700" : "bg-white border-gray-200"}
        `}
      >
        {/* Logo */}
        <div className={`p-4 sm:p-6 border-b flex items-center justify-between ${isDark ? "border-slate-700" : "border-gray-200"}`}>
          <div>
            <h1 className={`text-lg sm:text-xl font-bold ${isDark ? "bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent" : "text-blue-600"}`}>
              IE Tire
            </h1>
            <p className={`text-xs mt-1 ${isDark ? "text-slate-500" : "text-gray-500"}`}>Business Intelligence</p>
          </div>
          {/* Close button for mobile */}
          <button
            onClick={close}
            className={`lg:hidden p-2 rounded-lg transition-colors ${isDark ? "text-slate-400 hover:text-white hover:bg-slate-700" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 sm:p-4 space-y-1 overflow-y-auto">
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavClick}
                className={`flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg transition-all ${
                  isActive
                    ? isDark
                      ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                      : "bg-blue-50 text-blue-600 border border-blue-200"
                    : isDark
                      ? "text-slate-400 hover:bg-slate-700/50 hover:text-white"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <svg
                  className="w-5 h-5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={item.icon}
                  />
                </svg>
                <span className="font-medium text-sm sm:text-base truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Navigation */}
        <div className={`p-3 sm:p-4 border-t space-y-1 ${isDark ? "border-slate-700" : "border-gray-200"}`}>
          {BOTTOM_NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavClick}
                className={`flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg transition-all ${
                  isActive
                    ? isDark
                      ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                      : "bg-blue-50 text-blue-600 border border-blue-200"
                    : isDark
                      ? "text-slate-400 hover:bg-slate-700/50 hover:text-white"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <svg
                  className="w-5 h-5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={item.icon}
                  />
                </svg>
                <span className="font-medium text-sm sm:text-base">{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* User Info */}
        <div className={`p-3 sm:p-4 border-t ${isDark ? "border-slate-700" : "border-gray-200"}`}>
          <div className="flex items-center gap-3 px-2">
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 ${isDark ? "bg-gradient-to-br from-cyan-400 to-blue-500" : "bg-gradient-to-br from-blue-500 to-blue-600"}`}>
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${isDark ? "text-white" : "text-gray-900"}`}>
                {user?.name || "User"}
              </p>
              <p className={`text-xs truncate ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                {user?.email || ""}
              </p>
            </div>
            <button
              onClick={logout}
              className={`p-2 transition-colors flex-shrink-0 ${isDark ? "text-slate-400 hover:text-red-400" : "text-gray-400 hover:text-red-500"}`}
              title="Sign out"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

// Mobile header component with hamburger menu
export function MobileHeader() {
  const { theme } = useTheme();
  const { toggle } = useSidebar();
  const isDark = theme === "dark";

  return (
    <div className={`lg:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3 border-b ${isDark ? "bg-slate-900/95 backdrop-blur-sm border-slate-700" : "bg-white/95 backdrop-blur-sm border-gray-200"}`}>
      <button
        onClick={toggle}
        className={`p-2 rounded-lg transition-colors ${isDark ? "text-slate-400 hover:text-white hover:bg-slate-700" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"}`}
        aria-label="Toggle menu"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <h1 className={`text-lg font-bold ${isDark ? "bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent" : "text-blue-600"}`}>
        IE Tire
      </h1>
    </div>
  );
}
