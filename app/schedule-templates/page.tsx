"use client";

import { useState } from "react";
import Protected from "../protected";
import Sidebar from "@/components/Sidebar";
import { useTheme } from "../theme-context";
import { useAuth } from "../auth-context";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

const DEPARTMENTS = [
  "Shipping",
  "Receiving",
  "Inventory",
  "Purchases",
  "Janitorial",
  "Warehouse",
  "Executive",
  "Office",
  "Sales",
];

interface Department {
  name: string;
  position: string;
  startTime: string;
  endTime: string;
  requiredCount: number;
  assignedPersonnel: Id<"personnel">[];
  leadId?: Id<"personnel">;
}

function ScheduleTemplatesContent() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const isDark = theme === "dark";

  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Id<"shiftTemplates"> | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<Id<"locations"> | "">("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [error, setError] = useState("");

  // New department form
  const [newDept, setNewDept] = useState({
    name: "Shipping",
    position: "",
    startTime: "06:00",
    endTime: "14:30",
    requiredCount: 1,
  });

  // Queries
  const templates = useQuery(api.shiftTemplates.list, {});
  const locations = useQuery(api.locations.list);
  const personnel = useQuery(api.personnel.list, { status: "active" });

  // Mutations
  const createTemplate = useMutation(api.shiftTemplates.create);
  const updateTemplate = useMutation(api.shiftTemplates.update);
  const deleteTemplate = useMutation(api.shiftTemplates.remove);

  const resetForm = () => {
    setTemplateName("");
    setTemplateDescription("");
    setSelectedLocation("");
    setDepartments([]);
    setEditingTemplate(null);
    setError("");
  };

  const handleEdit = (template: NonNullable<typeof templates>[0]) => {
    setEditingTemplate(template._id);
    setTemplateName(template.name);
    setTemplateDescription(template.description || "");
    setSelectedLocation(template.locationId || "");
    setDepartments(template.departments.map(d => ({
      name: d.name,
      position: d.position,
      startTime: d.startTime,
      endTime: d.endTime,
      requiredCount: d.requiredCount,
      assignedPersonnel: d.assignedPersonnel,
      leadId: d.leadId,
    })));
    setShowModal(true);
  };

  const handleAddDepartment = () => {
    if (!newDept.position.trim()) {
      setError("Position is required");
      return;
    }
    setDepartments([
      ...departments,
      {
        ...newDept,
        assignedPersonnel: [],
        leadId: undefined,
      },
    ]);
    setNewDept({
      name: "Shipping",
      position: "",
      startTime: "06:00",
      endTime: "14:30",
      requiredCount: 1,
    });
    setError("");
  };

  const handleRemoveDepartment = (index: number) => {
    setDepartments(departments.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!templateName.trim()) {
      setError("Template name is required");
      return;
    }
    if (departments.length === 0) {
      setError("At least one department/shift is required");
      return;
    }
    if (!user) return;

    try {
      if (editingTemplate) {
        await updateTemplate({
          templateId: editingTemplate,
          name: templateName.trim(),
          description: templateDescription.trim() || undefined,
          locationId: selectedLocation || undefined,
          departments,
        });
      } else {
        await createTemplate({
          name: templateName.trim(),
          description: templateDescription.trim() || undefined,
          locationId: selectedLocation || undefined,
          departments,
          userId: user._id,
        });
      }
      setShowModal(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save template");
    }
  };

  const handleDelete = async (templateId: Id<"shiftTemplates">) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    try {
      await deleteTemplate({ templateId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete template");
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const h = parseInt(hours);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
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
                Schedule Templates
              </h1>
              <p className={`text-xs sm:text-sm mt-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                Create and manage reusable shift templates for different departments
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
              <span className="hidden sm:inline">New Template</span>
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

          {/* Templates Grid */}
          {!templates || templates.length === 0 ? (
            <div className={`text-center py-12 border rounded-xl ${isDark ? "bg-slate-800/50 border-slate-700 text-slate-400" : "bg-white border-gray-200 text-gray-500"}`}>
              <div className="text-4xl mb-3">📅</div>
              <p>No schedule templates yet.</p>
              <p className="text-sm mt-2">Create your first template to quickly apply shifts.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <div
                  key={template._id}
                  className={`border rounded-xl p-4 ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm"}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                        {template.name}
                      </h3>
                      <p className={`text-xs ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                        {template.locationName}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(template)}
                        className={`p-1.5 rounded ${isDark ? "hover:bg-slate-700" : "hover:bg-gray-100"}`}
                        title="Edit"
                      >
                        <svg className={`w-4 h-4 ${isDark ? "text-slate-400" : "text-gray-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(template._id)}
                        className={`p-1.5 rounded ${isDark ? "hover:bg-red-500/20" : "hover:bg-red-50"}`}
                        title="Delete"
                      >
                        <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {template.description && (
                    <p className={`text-sm mb-3 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                      {template.description}
                    </p>
                  )}

                  {/* Departments/Shifts */}
                  <div className="space-y-2">
                    {template.departments.map((dept, idx) => (
                      <div
                        key={idx}
                        className={`text-sm p-2 rounded ${isDark ? "bg-slate-700/50" : "bg-gray-50"}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                            {dept.name}
                          </span>
                          <span className={`text-xs ${isDark ? "text-cyan-400" : "text-blue-600"}`}>
                            {formatTime(dept.startTime)} - {formatTime(dept.endTime)}
                          </span>
                        </div>
                        <div className={`text-xs mt-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                          {dept.position} | {dept.requiredCount} needed
                          {dept.assignedPersonnel.length > 0 && ` | ${dept.assignedPersonnel.length} assigned`}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className={`mt-3 pt-3 border-t text-xs ${isDark ? "border-slate-700 text-slate-500" : "border-gray-200 text-gray-400"}`}>
                    {template.departments.length} shift{template.departments.length !== 1 ? "s" : ""} configured
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
              {/* Modal Header */}
              <div className={`flex items-center justify-between p-4 sm:p-6 border-b ${isDark ? "border-slate-700" : "border-gray-200"}`}>
                <h2 className={`text-xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                  {editingTemplate ? "Edit Template" : "Create Template"}
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

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                {/* Template Info */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                      Template Name *
                    </label>
                    <input
                      type="text"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="e.g., Standard Weekday"
                      className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none ${isDark ? "bg-slate-900/50 border-slate-600 text-white focus:border-cyan-500" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500"}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                      Location
                    </label>
                    <select
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value as Id<"locations"> | "")}
                      className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none ${isDark ? "bg-slate-900/50 border-slate-600 text-white focus:border-cyan-500" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500"}`}
                    >
                      <option value="">All Locations</option>
                      {locations?.map((loc) => (
                        <option key={loc._id} value={loc._id}>{loc.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                    Description
                  </label>
                  <input
                    type="text"
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    placeholder="Optional description"
                    className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none ${isDark ? "bg-slate-900/50 border-slate-600 text-white focus:border-cyan-500" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500"}`}
                  />
                </div>

                {/* Add Department/Shift */}
                <div className={`p-4 rounded-lg border ${isDark ? "bg-slate-700/30 border-slate-600" : "bg-gray-50 border-gray-200"}`}>
                  <h3 className={`text-sm font-medium mb-3 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                    Add Shift
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    <div>
                      <label className={`block text-xs mb-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>Department</label>
                      <select
                        value={newDept.name}
                        onChange={(e) => setNewDept({ ...newDept, name: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none ${isDark ? "bg-slate-800 border-slate-600 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                      >
                        {DEPARTMENTS.map((dept) => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={`block text-xs mb-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>Position *</label>
                      <input
                        type="text"
                        value={newDept.position}
                        onChange={(e) => setNewDept({ ...newDept, position: e.target.value })}
                        placeholder="e.g., Loader"
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none ${isDark ? "bg-slate-800 border-slate-600 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                      />
                    </div>
                    <div>
                      <label className={`block text-xs mb-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>Start Time</label>
                      <input
                        type="time"
                        value={newDept.startTime}
                        onChange={(e) => setNewDept({ ...newDept, startTime: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none ${isDark ? "bg-slate-800 border-slate-600 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                      />
                    </div>
                    <div>
                      <label className={`block text-xs mb-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>End Time</label>
                      <input
                        type="time"
                        value={newDept.endTime}
                        onChange={(e) => setNewDept({ ...newDept, endTime: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none ${isDark ? "bg-slate-800 border-slate-600 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                      />
                    </div>
                    <div>
                      <label className={`block text-xs mb-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>Required</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          value={newDept.requiredCount}
                          onChange={(e) => setNewDept({ ...newDept, requiredCount: parseInt(e.target.value) || 1 })}
                          className={`w-16 px-3 py-2 border rounded-lg text-sm focus:outline-none ${isDark ? "bg-slate-800 border-slate-600 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                        />
                        <button
                          onClick={handleAddDepartment}
                          className={`px-3 py-2 rounded-lg text-sm font-medium ${isDark ? "bg-cyan-500 text-white hover:bg-cyan-600" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Current Shifts */}
                {departments.length > 0 && (
                  <div>
                    <h3 className={`text-sm font-medium mb-3 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                      Shifts in Template ({departments.length})
                    </h3>
                    <div className="space-y-2">
                      {departments.map((dept, idx) => (
                        <div
                          key={idx}
                          className={`flex items-center justify-between p-3 rounded-lg ${isDark ? "bg-slate-700/50" : "bg-gray-100"}`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <span className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                                {dept.name}
                              </span>
                              <span className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                                {dept.position}
                              </span>
                            </div>
                            <div className={`text-sm ${isDark ? "text-cyan-400" : "text-blue-600"}`}>
                              {formatTime(dept.startTime)} - {formatTime(dept.endTime)} | {dept.requiredCount} needed
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveDepartment(idx)}
                            className={`p-2 rounded ${isDark ? "hover:bg-red-500/20" : "hover:bg-red-100"}`}
                          >
                            <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className={`flex justify-end gap-3 p-4 sm:p-6 border-t ${isDark ? "border-slate-700" : "border-gray-200"}`}>
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className={`px-4 py-2 font-medium rounded-lg transition-colors ${isDark ? "bg-slate-700 text-white hover:bg-slate-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!templateName.trim() || departments.length === 0}
                  className={`px-4 py-2 font-medium rounded-lg transition-colors disabled:opacity-50 ${isDark ? "bg-cyan-500 text-white hover:bg-cyan-600" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                >
                  {editingTemplate ? "Save Changes" : "Create Template"}
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
