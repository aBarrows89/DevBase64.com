"use client";

import Protected from "../protected";
import Sidebar from "@/components/Sidebar";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

function RepositoriesContent() {
  const repositories = useQuery(api.repositories.getAll) || [];

  const languageColors: Record<string, string> = {
    TypeScript: "bg-blue-500",
    JavaScript: "bg-yellow-500",
    Python: "bg-green-500",
    Rust: "bg-orange-500",
    Go: "bg-cyan-500",
    Java: "bg-red-500",
    Swift: "bg-orange-400",
    Kotlin: "bg-purple-500",
    Ruby: "bg-red-600",
    PHP: "bg-indigo-500",
  };

  return (
    <div className="flex h-screen bg-slate-900">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur-sm border-b border-slate-700 px-3 sm:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-3 sm:gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-2xl font-bold text-white">Repositories</h1>
              <p className="text-slate-400 text-[11px] sm:text-sm mt-0.5 sm:mt-1 truncate">
                GitHub repositories synced from your account
              </p>
            </div>
            <button className="px-3 sm:px-4 py-2 text-xs sm:text-base bg-cyan-500 text-white font-medium rounded-lg hover:bg-cyan-600 transition-colors flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span className="hidden sm:inline">Sync Repos</span>
              <span className="sm:hidden">Sync</span>
            </button>
          </div>
        </header>

        <div className="p-3 sm:p-8">
          {/* Repository Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
            {repositories.map((repo) => (
              <a
                key={repo._id}
                href={repo.htmlUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 sm:p-6 hover:border-slate-600 transition-all group"
              >
                <div className="flex items-start justify-between gap-2 mb-3 sm:mb-4">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white text-sm sm:text-base font-semibold truncate group-hover:text-cyan-400 transition-colors">
                        {repo.name}
                      </h3>
                      <p className="text-[10px] sm:text-xs text-slate-500 truncate">{repo.fullName}</p>
                    </div>
                  </div>
                  {repo.isPrivate && (
                    <span className="px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs bg-slate-700 text-slate-300 rounded flex-shrink-0">
                      Private
                    </span>
                  )}
                </div>

                <p className="text-xs sm:text-sm text-slate-400 line-clamp-2 mb-3 sm:mb-4 min-h-[32px] sm:min-h-[40px]">
                  {repo.description || "No description"}
                </p>

                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                    {repo.language && (
                      <span className="flex items-center gap-1 sm:gap-1.5 text-slate-400">
                        <span
                          className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${languageColors[repo.language] || "bg-slate-500"}`}
                        />
                        <span className="text-xs">{repo.language}</span>
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-slate-400">
                      <svg
                        className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                        fill="currentColor"
                        viewBox="0 0 16 16"
                      >
                        <path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z" />
                      </svg>
                      {repo.starCount}
                    </span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <svg
                        className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                        fill="currentColor"
                        viewBox="0 0 16 16"
                      >
                        <path d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75v-.878a2.25 2.25 0 111.5 0v.878a2.25 2.25 0 01-2.25 2.25h-1.5v2.128a2.251 2.251 0 11-1.5 0V8.5h-1.5A2.25 2.25 0 013.5 6.25v-.878a2.25 2.25 0 115.5 0zM5 3.25a.75.75 0 10-1.5 0 .75.75 0 001.5 0zm6.75.75a.75.75 0 100-1.5.75.75 0 000 1.5zm-3 8.75a.75.75 0 10-1.5 0 .75.75 0 001.5 0z" />
                      </svg>
                      {repo.forkCount}
                    </span>
                  </div>
                </div>

                <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-700/50">
                  <div className="flex items-center justify-between text-[10px] sm:text-xs text-slate-500">
                    <span>
                      Updated{" "}
                      {new Date(repo.lastPushedAt).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg
                        className="w-3 h-3 sm:w-3.5 sm:h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                        />
                      </svg>
                      {repo.defaultBranch}
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>

          {repositories.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-slate-800 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-slate-500"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">
                No repositories synced
              </h3>
              <p className="text-slate-500 mb-4">
                Click &quot;Sync Repos&quot; to fetch repositories from GitHub
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function RepositoriesPage() {
  return (
    <Protected>
      <RepositoriesContent />
    </Protected>
  );
}
