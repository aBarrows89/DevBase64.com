"use client";

import { useState } from "react";
import Protected from "../protected";
import Sidebar, { MobileHeader } from "@/components/Sidebar";
import KanbanBoard from "@/components/KanbanBoard";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { useAuth } from "../auth-context";

type Project = Doc<"projects">;
type Task = Doc<"tasks">;
type User = Doc<"users">;

const PRIORITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  urgent: { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/30" },
  high: { bg: "bg-orange-500/20", text: "text-orange-400", border: "border-orange-500/30" },
  medium: { bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/30" },
  low: { bg: "bg-green-500/20", text: "text-green-400", border: "border-green-500/30" },
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  backlog: { bg: "bg-slate-500/20", text: "text-slate-400" },
  in_progress: { bg: "bg-cyan-500/20", text: "text-cyan-400" },
  review: { bg: "bg-amber-500/20", text: "text-amber-400" },
  done: { bg: "bg-green-500/20", text: "text-green-400" },
};

function ProjectsContent() {
  const { user } = useAuth();
  const projects = useQuery(api.projects.getAll) || [];
  const users = useQuery(api.auth.getAllUsers) || [];
  const updateStatus = useMutation(api.projects.updateStatus);
  const createProject = useMutation(api.projects.create);
  const updateProject = useMutation(api.projects.update);
  const deleteProject = useMutation(api.projects.remove);

  // Task mutations and actions
  const createTask = useMutation(api.tasks.create);
  const updateTaskStatus = useMutation(api.tasks.updateStatus);
  const deleteTask = useMutation(api.tasks.remove);
  const generateTasks = useAction(api.aiTasks.generateTasks);

  const [isCreating, setIsCreating] = useState(false);
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [taskFilter, setTaskFilter] = useState<"all" | "mine">("all"); // For task filtering
  const [selectedProjectId, setSelectedProjectId] = useState<Id<"projects"> | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
    priority: "medium",
    dueDate: "",
    estimatedHours: "",
    assignedTo: "",
  });

  // Fetch project with tasks when a project is selected
  const projectWithTasks = useQuery(
    api.projects.getWithTasks,
    selectedProjectId ? { projectId: selectedProjectId } : "skip"
  );

  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    priority: "",
    status: "",
    dueDate: "",
    estimatedHours: "",
    assignedTo: "",
  });

  const handleStatusChange = async (projectId: string, newStatus: string) => {
    await updateStatus({
      projectId: projectId as Id<"projects">,
      status: newStatus,
    });
  };

  const handleProjectClick = (project: Project) => {
    setSelectedProjectId(project._id);
    setEditForm({
      name: project.name,
      description: project.description,
      priority: project.priority,
      status: project.status,
      dueDate: project.dueDate || "",
      estimatedHours: project.estimatedHours?.toString() || "",
      assignedTo: project.assignedTo || "",
    });
  };

  const handleCloseDetail = () => {
    setSelectedProjectId(null);
    setIsEditing(false);
    setShowDeleteConfirm(false);
  };

  const handleSaveEdit = async () => {
    if (!selectedProjectId) return;
    await updateProject({
      projectId: selectedProjectId,
      name: editForm.name,
      description: editForm.description,
      priority: editForm.priority,
      status: editForm.status,
      dueDate: editForm.dueDate || undefined,
      estimatedHours: editForm.estimatedHours ? parseFloat(editForm.estimatedHours) : undefined,
      assignedTo: editForm.assignedTo ? editForm.assignedTo as Id<"users"> : undefined,
    });
    setIsEditing(false);
  };

  const handleDeleteProject = async () => {
    if (!selectedProjectId) return;
    await deleteProject({ projectId: selectedProjectId });
    handleCloseDetail();
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
      assignedTo: newProject.assignedTo ? newProject.assignedTo as Id<"users"> : undefined,
    });

    setNewProject({
      name: "",
      description: "",
      priority: "medium",
      dueDate: "",
      estimatedHours: "",
      assignedTo: "",
    });
    setIsCreating(false);
  };

  // Task handlers
  const handleGenerateTasks = async () => {
    if (!selectedProjectId || !projectWithTasks) return;
    setIsGeneratingTasks(true);
    try {
      await generateTasks({
        projectId: selectedProjectId,
        projectName: projectWithTasks.name,
        projectDescription: projectWithTasks.description,
      });
    } catch (error) {
      console.error("Failed to generate tasks:", error);
    } finally {
      setIsGeneratingTasks(false);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !newTaskTitle.trim()) return;
    await createTask({
      projectId: selectedProjectId,
      title: newTaskTitle.trim(),
    });
    setNewTaskTitle("");
    setShowAddTask(false);
  };

  const handleToggleTaskStatus = async (taskId: Id<"tasks">, currentStatus: string) => {
    const nextStatus = currentStatus === "todo" ? "in_progress" : currentStatus === "in_progress" ? "done" : "todo";
    await updateTaskStatus({ taskId, status: nextStatus });
  };

  const handleDeleteTask = async (taskId: Id<"tasks">) => {
    await deleteTask({ taskId });
  };

  // Check if user is admin or above
  const isAdmin = user?.role === "super_admin" || user?.role === "admin" || user?.role === "department_manager";

  // Filter tasks based on taskFilter
  const filteredTasks = projectWithTasks?.tasks?.filter((task: Task) => {
    if (taskFilter === "all") return true;
    return task.assignedTo === user?._id;
  }) || [];

  return (
    <div className="flex h-screen bg-slate-900">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <MobileHeader />

        {/* Header */}
        <header className="flex-shrink-0 bg-slate-900/80 backdrop-blur-sm border-b border-slate-700 px-4 sm:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-white">Projects</h1>
              <p className="text-slate-400 text-xs sm:text-sm mt-1 hidden sm:block">
                Drag and drop to update status
              </p>
            </div>
            <button
              onClick={() => setIsCreating(true)}
              className="px-3 sm:px-4 py-2 bg-cyan-500 text-white font-medium rounded-lg hover:bg-cyan-600 transition-colors flex items-center gap-2 flex-shrink-0"
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
              <span className="hidden sm:inline">New Project</span>
              <span className="sm:hidden">New</span>
            </button>
          </div>
        </header>

        {/* Kanban Board */}
        <div className="flex-1 p-3 sm:p-6 overflow-hidden">
          <KanbanBoard
            projects={projects}
            onStatusChange={handleStatusChange}
            onProjectClick={handleProjectClick}
          />
        </div>
      </main>

      {/* Create Project Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 sm:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
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

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Assign To
                </label>
                <select
                  value={newProject.assignedTo}
                  onChange={(e) =>
                    setNewProject({ ...newProject, assignedTo: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u._id} value={u._id}>{u.name}</option>
                  ))}
                </select>
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
      {selectedProjectId && projectWithTasks && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-slate-700 flex-shrink-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="text-xl font-semibold text-white bg-transparent border-b border-cyan-500 focus:outline-none w-full"
                    />
                  ) : (
                    <h2 className="text-xl font-semibold text-white">{projectWithTasks.name}</h2>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded border ${STATUS_COLORS[projectWithTasks.status]?.bg} ${STATUS_COLORS[projectWithTasks.status]?.text}`}>
                      {projectWithTasks.status.replace("_", " ").toUpperCase()}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded border ${PRIORITY_COLORS[projectWithTasks.priority]?.bg} ${PRIORITY_COLORS[projectWithTasks.priority]?.text} ${PRIORITY_COLORS[projectWithTasks.priority]?.border}`}>
                      {projectWithTasks.priority.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-3 py-1.5 text-sm text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        className="px-3 py-1.5 text-sm bg-cyan-500 text-white rounded-lg hover:bg-cyan-600"
                      >
                        Save
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setIsEditing(true)}
                        className="p-2 text-slate-400 hover:text-cyan-400 transition-colors"
                        title="Edit Project"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                        title="Delete Project"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </>
                  )}
                  <button
                    onClick={handleCloseDetail}
                    className="p-2 text-slate-400 hover:text-white transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {/* Description */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-slate-400 mb-2">Description</h3>
                {isEditing ? (
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white resize-none focus:outline-none focus:border-cyan-500"
                    rows={3}
                  />
                ) : (
                  <p className="text-slate-300">{projectWithTasks.description}</p>
                )}
              </div>

              {/* Project Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {isEditing ? (
                  <>
                    <div className="p-4 bg-slate-900/50 rounded-lg">
                      <p className="text-xs text-slate-500 mb-1">Status</p>
                      <select
                        value={editForm.status}
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                        className="w-full bg-transparent text-white text-sm focus:outline-none"
                      >
                        <option value="backlog" className="bg-slate-800">Backlog</option>
                        <option value="in_progress" className="bg-slate-800">In Progress</option>
                        <option value="review" className="bg-slate-800">Review</option>
                        <option value="done" className="bg-slate-800">Done</option>
                      </select>
                    </div>
                    <div className="p-4 bg-slate-900/50 rounded-lg">
                      <p className="text-xs text-slate-500 mb-1">Priority</p>
                      <select
                        value={editForm.priority}
                        onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                        className="w-full bg-transparent text-white text-sm focus:outline-none"
                      >
                        <option value="low" className="bg-slate-800">Low</option>
                        <option value="medium" className="bg-slate-800">Medium</option>
                        <option value="high" className="bg-slate-800">High</option>
                        <option value="urgent" className="bg-slate-800">Urgent</option>
                      </select>
                    </div>
                    <div className="p-4 bg-slate-900/50 rounded-lg">
                      <p className="text-xs text-slate-500 mb-1">Est. Hours</p>
                      <input
                        type="number"
                        value={editForm.estimatedHours}
                        onChange={(e) => setEditForm({ ...editForm, estimatedHours: e.target.value })}
                        className="w-full bg-transparent text-white text-sm focus:outline-none"
                        placeholder="0"
                      />
                    </div>
                    <div className="p-4 bg-slate-900/50 rounded-lg">
                      <p className="text-xs text-slate-500 mb-1">Due Date</p>
                      <input
                        type="date"
                        value={editForm.dueDate}
                        onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                        className="w-full bg-transparent text-white text-sm focus:outline-none"
                      />
                    </div>
                    <div className="p-4 bg-slate-900/50 rounded-lg">
                      <p className="text-xs text-slate-500 mb-1">Assigned To</p>
                      <select
                        value={editForm.assignedTo}
                        onChange={(e) => setEditForm({ ...editForm, assignedTo: e.target.value })}
                        className="w-full bg-transparent text-white text-sm focus:outline-none"
                      >
                        <option value="" className="bg-slate-800">Unassigned</option>
                        {users.map((u) => (
                          <option key={u._id} value={u._id} className="bg-slate-800">{u.name}</option>
                        ))}
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-4 bg-slate-900/50 rounded-lg">
                      <p className="text-xs text-slate-500 mb-1">Created</p>
                      <p className="text-white text-sm font-medium">
                        {new Date(projectWithTasks.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    {projectWithTasks.dueDate && (
                      <div className="p-4 bg-slate-900/50 rounded-lg">
                        <p className="text-xs text-slate-500 mb-1">Due Date</p>
                        <p className="text-white text-sm font-medium">
                          {new Date(projectWithTasks.dueDate).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {projectWithTasks.estimatedHours && (
                      <div className="p-4 bg-slate-900/50 rounded-lg">
                        <p className="text-xs text-slate-500 mb-1">Est. Hours</p>
                        <p className="text-white text-sm font-medium">{projectWithTasks.estimatedHours}h</p>
                      </div>
                    )}
                    {projectWithTasks.actualHours && (
                      <div className="p-4 bg-slate-900/50 rounded-lg">
                        <p className="text-xs text-slate-500 mb-1">Actual Hours</p>
                        <p className="text-white text-sm font-medium">{projectWithTasks.actualHours}h</p>
                      </div>
                    )}
                    {(() => {
                      const assignedUser = users.find(u => u._id === projectWithTasks.assignedTo);
                      return assignedUser ? (
                        <div className="p-4 bg-slate-900/50 rounded-lg">
                          <p className="text-xs text-slate-500 mb-1">Assigned To</p>
                          <p className="text-white text-sm font-medium">{assignedUser.name}</p>
                        </div>
                      ) : null;
                    })()}
                  </>
                )}
              </div>

              {/* AI Timeline Analysis */}
              {projectWithTasks.aiTimelineAnalysis && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-slate-400 mb-2">AI Timeline Analysis</h3>
                  <div className={`p-4 rounded-lg border ${
                    projectWithTasks.aiTimelineAnalysis.isOnSchedule
                      ? "bg-green-500/10 border-green-500/30"
                      : "bg-red-500/10 border-red-500/30"
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-sm font-medium ${
                        projectWithTasks.aiTimelineAnalysis.isOnSchedule ? "text-green-400" : "text-red-400"
                      }`}>
                        {projectWithTasks.aiTimelineAnalysis.isOnSchedule
                          ? "On Schedule"
                          : `${projectWithTasks.aiTimelineAnalysis.behindByDays} days behind`}
                      </span>
                      <span className="text-xs text-slate-400">
                        ({projectWithTasks.aiTimelineAnalysis.confidence}% confidence)
                      </span>
                    </div>
                    <p className="text-sm text-slate-300">{projectWithTasks.aiTimelineAnalysis.reasoning}</p>
                  </div>
                </div>
              )}

              {/* Tasks Section */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-4">
                    <h3 className="text-sm font-medium text-slate-400">
                      Tasks ({filteredTasks.length}{taskFilter === "mine" ? ` of ${projectWithTasks.tasks?.length || 0}` : ""})
                    </h3>
                    {/* Task Filter Toggle */}
                    {isAdmin && (
                      <div className="flex items-center gap-1 bg-slate-900/50 rounded-lg p-1">
                        <button
                          onClick={() => setTaskFilter("all")}
                          className={`px-2 py-1 text-xs rounded ${
                            taskFilter === "all"
                              ? "bg-cyan-500/20 text-cyan-400"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          All Tasks
                        </button>
                        <button
                          onClick={() => setTaskFilter("mine")}
                          className={`px-2 py-1 text-xs rounded ${
                            taskFilter === "mine"
                              ? "bg-cyan-500/20 text-cyan-400"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          My Tasks
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleGenerateTasks}
                      disabled={isGeneratingTasks}
                      className="px-3 py-1.5 text-xs bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg hover:bg-purple-500/30 transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      {isGeneratingTasks ? (
                        <>
                          <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Generating...
                        </>
                      ) : (
                        <>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          AI Generate
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setShowAddTask(true)}
                      className="px-3 py-1.5 text-xs bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/30 transition-colors flex items-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Task
                    </button>
                  </div>
                </div>

                {/* Add Task Form */}
                {showAddTask && (
                  <form onSubmit={handleAddTask} className="mb-3 flex gap-2">
                    <input
                      type="text"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="Enter task title..."
                      className="flex-1 px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-cyan-500 text-white text-sm rounded-lg hover:bg-cyan-600"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddTask(false);
                        setNewTaskTitle("");
                      }}
                      className="px-4 py-2 bg-slate-700 text-white text-sm rounded-lg hover:bg-slate-600"
                    >
                      Cancel
                    </button>
                  </form>
                )}

                {filteredTasks.length > 0 ? (
                  <div className="space-y-2">
                    {filteredTasks.sort((a: Task, b: Task) => a.order - b.order).map((task: Task) => (
                      <div
                        key={task._id}
                        className={`flex items-center gap-3 p-3 rounded-lg border group ${
                          task.status === "done"
                            ? "bg-green-500/10 border-green-500/20"
                            : task.status === "in_progress"
                            ? "bg-cyan-500/10 border-cyan-500/20"
                            : "bg-slate-900/50 border-slate-700"
                        }`}
                      >
                        {/* Clickable status indicator */}
                        <button
                          onClick={() => handleToggleTaskStatus(task._id, task.status)}
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                            task.status === "done"
                              ? "bg-green-400 border-green-400"
                              : task.status === "in_progress"
                              ? "border-cyan-400 bg-cyan-400/20"
                              : "border-slate-500 hover:border-cyan-400"
                          }`}
                          title={`Click to change status (${task.status} → ${task.status === "todo" ? "in_progress" : task.status === "in_progress" ? "done" : "todo"})`}
                        >
                          {task.status === "done" && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                          {task.status === "in_progress" && (
                            <div className="w-2 h-2 bg-cyan-400 rounded-full" />
                          )}
                        </button>
                        <div className="flex-1">
                          <span className={`text-sm ${task.status === "done" ? "text-slate-400 line-through" : "text-white"}`}>
                            {task.title}
                          </span>
                          {task.estimatedMinutes && (
                            <span className="ml-2 text-xs text-slate-500">
                              ~{task.estimatedMinutes < 60 ? `${task.estimatedMinutes}m` : `${Math.round(task.estimatedMinutes / 60)}h`}
                            </span>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          task.status === "done" ? "bg-green-500/20 text-green-400" :
                          task.status === "in_progress" ? "bg-cyan-500/20 text-cyan-400" :
                          "bg-slate-700 text-slate-400"
                        }`}>
                          {task.status.replace("_", " ")}
                        </span>
                        <button
                          onClick={() => handleDeleteTask(task._id)}
                          className="p-1 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete task"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500 text-sm">
                    {taskFilter === "mine" && projectWithTasks.tasks?.length > 0
                      ? "No tasks assigned to you. Switch to 'All Tasks' to see other tasks."
                      : "No tasks yet. Click 'AI Generate' to create tasks from the project description or 'Add Task' to add manually."}
                  </div>
                )}
              </div>

              {/* AI Generated Steps */}
              {projectWithTasks.aiGeneratedSteps && (
                <div>
                  <h3 className="text-sm font-medium text-slate-400 mb-3">AI Generated Steps</h3>
                  <div className="space-y-2">
                    {JSON.parse(projectWithTasks.aiGeneratedSteps).map((step: string, index: number) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-slate-900/50 rounded-lg">
                        <span className="w-6 h-6 flex items-center justify-center bg-cyan-500/20 text-cyan-400 text-xs font-medium rounded flex-shrink-0">
                          {index + 1}
                        </span>
                        <span className="text-sm text-slate-300">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 sm:p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-2">Delete Project</h3>
            <p className="text-slate-400 mb-6">
              Are you sure you want to delete this project? This will also delete all associated tasks. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProject}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Delete Project
              </button>
            </div>
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
