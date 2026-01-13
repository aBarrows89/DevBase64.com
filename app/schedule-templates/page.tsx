"use client";

import { useState } from "react";
import Protected from "../protected";
import Sidebar from "@/components/Sidebar";
import { useTheme } from "../theme-context";
import { useAuth } from "../auth-context";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

function ScheduleTemplatesContent() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const isDark = theme === "dark";

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<Id<"shiftTemplates"> | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("06:00");
  const [endTime, setEndTime] = useState("14:30");
  const [error, setError] = useState("");

  // Queries
  const templates = useQuery(api.shiftTemplates.list, {});

  // Mutations
  const createTemplate = useMutation(api.shiftTemplates.create);
  const updateTemplate = useMutation(api.shiftTemplates.update);
  const deleteTemplate = useMutation(api.shiftTemplates.remove);

  const resetForm = () => {
    setName("");
    setDescription("");
    setStartTime("06:00");
    setEndTime("14:30");
    setEditingId(null);
    setError("");
  };

  const handleEdit = (template: NonNullable<typeof templates>[0]) => {
    setEditingId(template._id);
    setName(template.name);
    setDescription(template.description || "");
    // Get times from first department if exists
    if (template.departments.length > 0) {
      setStartTime(template.departments[0].startTime);
      setEndTime(template.departments[0].endTime);
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Schedule name is required");
      return;
    }
    if (!user) return;

    try {
      // Create a simple department entry to store the times
      const departments = [{
        name: "Default",
        position: "Employee",
        startTime,
        endTime,
        requiredCount: 1,
        assignedPersonnel: [] as Id<"personnel">[],
      }];

      if (editingId) {
        await updateTemplate({
          templateId: editingId,
          name: name.trim(),
          description: description.trim() || undefined,
          departments,
        });
      } else {
        await createTemplate({
          name: name.trim(),
          description: description.trim() || undefined,
          departments,
          userId: user._id,
        });
      }
      setShowModal(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    }
  };

  const handleDelete = async (templateId: Id<"shiftTemplates">) => {
    if (!confirm("Delete this schedule?")) return;
    try {
      await deleteTemplate({ templateId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const h = parseInt(hours);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  const getScheduleTimes = (template: NonNullable<typeof templates>[0]) => {
    if (template.departments.length > 0) {
      const dept = template.departments[0];
      return `${formatTime(dept.startTime)} - ${formatTime(dept.endTime)}`;
    }
    return "No times set";
  };

  return (
    <div className={`flex h-screen ${isDark ? "bg-slate-900" : "bg-gray-50"}`}>
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className={`sticky top-0 z-10 backdrop-blur-sm border-b px-4 sm:px-8 py-4 ${isDark ? "bg-slate-900/80 border-slate-700" : "bg-white/80 border-gray-200"}`}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-xl sm:text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                Work Schedules
              </h1>
              <p className={`text-xs sm:text-sm mt-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                Define shift times to assign to employees
              </p>
            </div>
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className={`px-3 sm:px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${isDark ? "bg-cyan-500 text-white hover:bg-cyan-600" : "bg-blue-600 text-white hover:bg-blue-700"}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>New Schedule</span>
            </button>
          </div>
        </header>

        <div className="p-4 sm:p-8">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm mb-6">
              {error}
              <button onClick={() => setError("")} className="ml-4 text-red-300 hover:text-red-100">Dismiss</button>
            </div>
          )}

          {/* Info Box */}
          <div className={`mb-6 p-4 rounded-lg border ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-blue-50 border-blue-200"}`}>
            <p className={`text-sm ${isDark ? "text-slate-300" : "text-blue-800"}`}>
              Create work schedules here, then assign them to employees on their profile page or when hiring.
            </p>
          </div>

          {/* Schedules List */}
          {!templates || templates.length === 0 ? (
            <div className={`text-center py-12 border rounded-xl ${isDark ? "bg-slate-800/50 border-slate-700 text-slate-400" : "bg-white border-gray-200 text-gray-500"}`}>
              <div className="text-4xl mb-3">🕐</div>
              <p>No work schedules yet.</p>
              <p className="text-sm mt-2">Create schedules like "Day Shift" or "Executive Hours"</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <div
                  key={template._id}
                  className={`border rounded-xl p-5 ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm"}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                        {template.name}
                      </h3>
                      <p className={`text-xl font-medium mt-1 ${isDark ? "text-cyan-400" : "text-blue-600"}`}>
                        {getScheduleTimes(template)}
                      </p>
                      {template.description && (
                        <p className={`text-sm mt-2 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                          {template.description}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(template)}
                        className={`p-2 rounded-lg ${isDark ? "hover:bg-slate-700" : "hover:bg-gray-100"}`}
                        title="Edit"
                      >
                        <svg className={`w-5 h-5 ${isDark ? "text-slate-400" : "text-gray-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(template._id)}
                        className={`p-2 rounded-lg ${isDark ? "hover:bg-red-500/20" : "hover:bg-red-50"}`}
                        title="Delete"
                      >
                        <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`border rounded-xl w-full max-w-md ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
              <div className={`flex items-center justify-between p-5 border-b ${isDark ? "border-slate-700" : "border-gray-200"}`}>
                <h2 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                  {editingId ? "Edit Schedule" : "New Schedule"}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className={`p-2 rounded-lg ${isDark ? "hover:bg-slate-700" : "hover:bg-gray-100"}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                    Schedule Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Day Shift, Executive Hours"
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none ${isDark ? "bg-slate-900/50 border-slate-600 text-white focus:border-cyan-500" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500"}`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none ${isDark ? "bg-slate-900/50 border-slate-600 text-white focus:border-cyan-500" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500"}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                      End Time
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none ${isDark ? "bg-slate-900/50 border-slate-600 text-white focus:border-cyan-500" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500"}`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                    Description (optional)
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g., Standard warehouse hours"
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none ${isDark ? "bg-slate-900/50 border-slate-600 text-white focus:border-cyan-500" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500"}`}
                  />
                </div>
              </div>

              <div className={`flex justify-end gap-3 p-5 border-t ${isDark ? "border-slate-700" : "border-gray-200"}`}>
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className={`px-4 py-2.5 font-medium rounded-lg ${isDark ? "bg-slate-700 text-white hover:bg-slate-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!name.trim()}
                  className={`px-4 py-2.5 font-medium rounded-lg disabled:opacity-50 ${isDark ? "bg-cyan-500 text-white hover:bg-cyan-600" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                >
                  {editingId ? "Save" : "Create"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function ScheduleTemplatesPage() {
  return (
    <Protected>
      <ScheduleTemplatesContent />
    </Protected>
  );
}
