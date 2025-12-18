"use client";

import { useState } from "react";
import Protected from "../protected";
import Sidebar from "@/components/Sidebar";
import KanbanBoard from "@/components/KanbanBoard";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { useAuth } from "../auth-context";

type Project = Doc<"projects">;

function ProjectsContent() {
  const { user } = useAuth();
  const projects = useQuery(api.projects.getAll) || [];
  const updateStatus = useMutation(api.projects.updateStatus);
  const createProject = useMutation(api.projects.create);

  const [isCreating, setIsCreating] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
    priority: "medium",
    dueDate: "",
    estimatedHours: "",
  });

  const handleStatusChange = async (projectId: string, newStatus: string) => {
    await updateStatus({
      projectId: projectId as Id<"projects">,
      status: newStatus,
    });
  };

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project);
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    await createProject({
      name: newProject.name,
      description: newProject.description,
      status: "backlog",
      priority: newProject.priority,
      createdBy: user._id,
      dueDate: newProject.dueDate || undefined,
      estimatedHours: newProject.estimatedHours
        ? parseFloat(newProject.estimatedHours)
        : undefined,
    });

    setNewProject({
      name: "",
      description: "",
      priority: "medium",
      dueDate: "",
      estimatedHours: "",
    });
    setIsCreating(false);
  };

  return (
    <div className="flex h-screen bg-slate-900">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex-shrink-0 bg-slate-900/80 backdrop-blur-sm border-b border-slate-700 px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Projects</h1>
              <p className="text-slate-400 text-sm mt-1">
                Drag and drop to update status
              </p>
            </div>
            <button
              onClick={() => setIsCreating(true)}
              className="px-4 py-2 bg-cyan-500 text-white font-medium rounded-lg hover:bg-cyan-600 transition-colors flex items-center gap-2"
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              New Project
            </button>
          </div>
        </header>

        {/* Kanban Board */}
        <div className="flex-1 p-6 overflow-hidden">
          <KanbanBoard
            projects={projects}
            onStatusChange={handleStatusChange}
            onProjectClick={handleProjectClick}
          />
        </div>
      </main>

      {/* Create Project Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-lg">
            <h2 className="text-xl font-semibold text-white mb-4">
              Create New Project
            </h2>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Project Name
                </label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) =>
                    setNewProject({ ...newProject, name: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  placeholder="Enter project name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Description
                </label>
                <textarea
                  value={newProject.description}
                  onChange={(e) =>
                    setNewProject({ ...newProject, description: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 resize-none"
                  placeholder="Describe your project..."
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Priority
                  </label>
                  <select
                    value={newProject.priority}
                    onChange={(e) =>
                      setNewProject({ ...newProject, priority: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Est. Hours
                  </label>
                  <input
                    type="number"
                    value={newProject.estimatedHours}
                    onChange={(e) =>
                      setNewProject({
                        ...newProject,
                        estimatedHours: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Due Date
                </label>
                <input
                  type="date"
                  value={newProject.dueDate}
                  onChange={(e) =>
                    setNewProject({ ...newProject, dueDate: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="flex-1 px-4 py-3 bg-slate-700 text-white font-medium rounded-lg hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-cyan-500 text-white font-medium rounded-lg hover:bg-cyan-600 transition-colors"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Project Detail Modal */}
      {selectedProject && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  {selectedProject.name}
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  {selectedProject.description}
                </p>
              </div>
              <button
                onClick={() => setSelectedProject(null)}
                className="p-2 text-slate-400 hover:text-white transition-colors"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-slate-900/50 rounded-lg">
                <p className="text-sm text-slate-500 mb-1">Status</p>
                <p className="text-white font-medium capitalize">
                  {selectedProject.status.replace("_", " ")}
                </p>
              </div>
              <div className="p-4 bg-slate-900/50 rounded-lg">
                <p className="text-sm text-slate-500 mb-1">Priority</p>
                <p className="text-white font-medium capitalize">
                  {selectedProject.priority}
                </p>
              </div>
              {selectedProject.estimatedHours && (
                <div className="p-4 bg-slate-900/50 rounded-lg">
                  <p className="text-sm text-slate-500 mb-1">Estimated Hours</p>
                  <p className="text-white font-medium">
                    {selectedProject.estimatedHours}h
                  </p>
                </div>
              )}
              {selectedProject.dueDate && (
                <div className="p-4 bg-slate-900/50 rounded-lg">
                  <p className="text-sm text-slate-500 mb-1">Due Date</p>
                  <p className="text-white font-medium">
                    {new Date(selectedProject.dueDate).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>

            {/* AI Timeline Analysis */}
            {selectedProject.aiTimelineAnalysis && (
              <div className="mb-6">
                <h3 className="text-lg font-medium text-white mb-3">
                  AI Timeline Analysis
                </h3>
                <div
                  className={`p-4 rounded-lg border ${
                    selectedProject.aiTimelineAnalysis.isOnSchedule
                      ? "bg-green-500/10 border-green-500/30"
                      : "bg-red-500/10 border-red-500/30"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`text-sm font-medium ${
                        selectedProject.aiTimelineAnalysis.isOnSchedule
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {selectedProject.aiTimelineAnalysis.isOnSchedule
                        ? "On Schedule"
                        : `${selectedProject.aiTimelineAnalysis.behindByDays} days behind`}
                    </span>
                    <span className="text-sm text-slate-400">
                      ({selectedProject.aiTimelineAnalysis.confidence}%
                      confidence)
                    </span>
                  </div>
                  <p className="text-sm text-slate-300">
                    {selectedProject.aiTimelineAnalysis.reasoning}
                  </p>
                </div>
              </div>
            )}

            {/* AI Generated Steps */}
            {selectedProject.aiGeneratedSteps && (
              <div>
                <h3 className="text-lg font-medium text-white mb-3">
                  AI Generated Steps
                </h3>
                <div className="space-y-2">
                  {JSON.parse(selectedProject.aiGeneratedSteps).map(
                    (step: string, index: number) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-3 bg-slate-900/50 rounded-lg"
                      >
                        <span className="w-6 h-6 flex items-center justify-center bg-cyan-500/20 text-cyan-400 text-sm font-medium rounded">
                          {index + 1}
                        </span>
                        <span className="text-slate-300">{step}</span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <Protected>
      <ProjectsContent />
    </Protected>
  );
}
