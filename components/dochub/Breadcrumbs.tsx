"use client";

import { useDocHub } from "./DocHubContext";

export default function Breadcrumbs() {
  const { isDark, breadcrumbs, navigateToFolder, navigateToRoot } = useDocHub();

  return (
    <nav className="flex items-center gap-1.5 text-sm">
      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1;
        return (
          <div key={crumb.id ?? "root"} className="flex items-center gap-1.5">
            {index > 0 && (
              <svg className={`w-3.5 h-3.5 ${isDark ? "text-slate-600" : "text-gray-300"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
            <button
              onClick={() => crumb.id === null ? navigateToRoot() : navigateToFolder(crumb.id, crumb.name)}
              disabled={isLast}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                isLast
                  ? isDark ? "text-white font-medium" : "text-gray-900 font-medium"
                  : isDark
                    ? "text-slate-400 hover:text-cyan-400 hover:bg-slate-800/50"
                    : "text-gray-500 hover:text-blue-600 hover:bg-blue-50/50"
              }`}
            >
              {crumb.name}
            </button>
          </div>
        );
      })}
    </nav>
  );
}
