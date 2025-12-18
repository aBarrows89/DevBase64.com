"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Protected from "../protected";
import Sidebar from "@/components/Sidebar";
import { useTheme } from "../theme-context";

const STATUS_OPTIONS = [
  { value: "open", label: "Accepting Applications", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  { value: "closed", label: "Closed", color: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
];

const DEPARTMENT_OPTIONS = ["Operations", "IT", "Sales", "Logistics", "Management", "HR", "Finance"];
const TYPE_OPTIONS = ["Full-time", "Part-time", "Contract", "Temporary"];
const POSITION_TYPE_OPTIONS = [
  { value: "hourly", label: "Hourly" },
  { value: "salaried", label: "Salaried" },
  { value: "management", label: "Management" },
];

const BADGE_TYPE_OPTIONS = [
  { value: "urgently_hiring", label: "Urgently Hiring", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  { value: "accepting_applications", label: "Accepting Applications", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  { value: "open_position", label: "Open Position", color: "bg-green-500/20 text-green-400 border-green-500/30" },
];

interface Job {
  _id: Id<"jobs">;
  title: string;
  location: string;
  type: string;
  positionType?: string;
  department: string;
  status: string;
  description: string;
  benefits: string[];
  keywords: string[];
  isActive: boolean;
  urgentHiring?: boolean;
  badgeType?: string;
  displayOrder?: number;
  createdAt: number;
  updatedAt: number;
}

interface JobFormData {
  title: string;
  location: string;
  type: string;
  positionType: string;
  department: string;
  description: string;
  benefits: string;
  keywords: string;
  status: string;
  isActive: boolean;
  badgeType: string;
}

// Helper function to get effective badge type (supports legacy urgentHiring field)
const getEffectiveBadgeType = (job: Job): string => {
  if (job.badgeType) return job.badgeType;
  if (job.urgentHiring) return "urgently_hiring";
  return "open_position";
};

export default function JobsPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const jobs = useQuery(api.jobs.getAll);
  const createJob = useMutation(api.jobs.create);
  const updateJob = useMutation(api.jobs.update);
  const deleteJob = useMutation(api.jobs.remove);

  const [showModal, setShowModal] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Job | null>(null);
  const [filterDepartment, setFilterDepartment] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const [formData, setFormData] = useState<JobFormData>({
    title: "",
    location: "Bensenville, IL",
    type: "Full-time",
    positionType: "hourly",
    department: "Operations",
    description: "",
    benefits: "",
    keywords: "",
    status: "open",
    isActive: true,
    badgeType: "open_position",
  });

  const resetForm = () => {
    setFormData({
      title: "",
      location: "Bensenville, IL",
      type: "Full-time",
      positionType: "hourly",
      department: "Operations",
      description: "",
      benefits: "",
      keywords: "",
      status: "open",
      isActive: true,
      badgeType: "open_position",
    });
    setEditingJob(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (job: Job) => {
    setEditingJob(job);
    setFormData({
      title: job.title,
      location: job.location,
      type: job.type,
      positionType: job.positionType || "hourly",
      department: job.department,
      description: job.description,
      benefits: job.benefits.join(", "),
      keywords: job.keywords.join(", "),
      status: job.status,
      isActive: job.isActive,
      badgeType: getEffectiveBadgeType(job),
    });
    setShowModal(true);
  };

  const handleBadgeTypeChange = async (job: Job, badgeType: string) => {
    try {
      console.log("Updating badge type for job:", job._id, "to:", badgeType);
      await updateJob({
        jobId: job._id,
        badgeType,
        // Also clear the legacy urgentHiring field to prevent conflicts
        urgentHiring: badgeType === "urgently_hiring",
      });
      console.log("Badge type updated successfully");
    } catch (error: unknown) {
      console.error("Failed to update badge type:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      alert(`Failed to update badge type: ${errorMessage}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const benefitsArray = formData.benefits
      .split(",")
      .map((b) => b.trim())
      .filter((b) => b);
    const keywordsArray = formData.keywords
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k);

    try {
      if (editingJob) {
        console.log("Updating job:", editingJob._id, formData);
        await updateJob({
          jobId: editingJob._id,
          title: formData.title,
          location: formData.location,
          type: formData.type,
          positionType: formData.positionType,
          department: formData.department,
          description: formData.description,
          benefits: benefitsArray,
          keywords: keywordsArray,
          status: formData.status,
          isActive: formData.isActive,
          badgeType: formData.badgeType,
          // Also sync the legacy urgentHiring field
          urgentHiring: formData.badgeType === "urgently_hiring",
        });
        console.log("Job updated successfully");
      } else {
        console.log("Creating job:", formData);
        await createJob({
          title: formData.title,
          location: formData.location,
          type: formData.type,
          positionType: formData.positionType,
          department: formData.department,
          description: formData.description,
          benefits: benefitsArray,
          keywords: keywordsArray,
          badgeType: formData.badgeType,
          urgentHiring: formData.badgeType === "urgently_hiring",
        });
        console.log("Job created successfully");
      }

      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error("Failed to save job:", error);
      alert("Failed to save job. Please try again.");
    }
  };

  const handleDelete = async () => {
    if (showDeleteConfirm) {
      await deleteJob({ jobId: showDeleteConfirm._id });
      setShowDeleteConfirm(null);
    }
  };

  const handleQuickStatusChange = async (job: Job, newStatus: string) => {
    await updateJob({
      jobId: job._id,
      status: newStatus,
    });
  };

  const getStatusBadge = (status: string) => {
    const statusOption = STATUS_OPTIONS.find((s) => s.value === status);
    if (!statusOption) {
      return <span className="px-2 py-1 text-xs rounded-full bg-slate-500/20 text-slate-400">{status}</span>;
    }
    return (
      <span className={`px-2 py-1 text-xs rounded-full border ${statusOption.color}`}>
        {statusOption.label}
      </span>
    );
  };

  const filteredJobs = jobs?.filter((job) => {
    if (filterDepartment !== "all" && job.department !== filterDepartment) return false;
    if (filterStatus !== "all" && job.status !== filterStatus) return false;
    return true;
  });

  const departments = [...new Set(jobs?.map((j) => j.department) || [])];

  return (
    <Protected>
      <div className={`min-h-screen flex ${isDark ? "bg-slate-900 text-white" : "bg-[#f2f2f7] text-gray-900"}`}>
        <Sidebar />
        <main className="flex-1 p-8 overflow-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold">Job Listings</h1>
              <p className={`mt-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>Manage positions for IE Tire careers page</p>
            </div>
            <button
              onClick={openAddModal}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${isDark ? "bg-cyan-500 hover:bg-cyan-600" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Job
            </button>
          </div>

          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className={`px-4 py-2 rounded-lg focus:outline-none ${isDark ? "bg-slate-800 border border-slate-700 text-white focus:border-cyan-500" : "bg-white border border-gray-200 text-gray-900 focus:border-blue-600"}`}
            >
              <option value="all">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={`px-4 py-2 rounded-lg focus:outline-none ${isDark ? "bg-slate-800 border border-slate-700 text-white focus:border-cyan-500" : "bg-white border border-gray-200 text-gray-900 focus:border-blue-600"}`}
            >
              <option value="all">All Statuses</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className={`p-4 rounded-lg ${isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white border border-gray-200 shadow-sm"}`}>
              <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>Total Jobs</p>
              <p className="text-2xl font-bold">{jobs?.length || 0}</p>
            </div>
            <div className={`p-4 rounded-lg ${isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white border border-gray-200 shadow-sm"}`}>
              <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>Active</p>
              <p className="text-2xl font-bold text-green-400">
                {jobs?.filter((j) => j.isActive).length || 0}
              </p>
            </div>
            <div className={`p-4 rounded-lg ${isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white border border-gray-200 shadow-sm"}`}>
              <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>Urgently Hiring</p>
              <p className="text-2xl font-bold text-red-400">
                {jobs?.filter((j) => getEffectiveBadgeType(j) === "urgently_hiring").length || 0}
              </p>
            </div>
            <div className={`p-4 rounded-lg ${isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white border border-gray-200 shadow-sm"}`}>
              <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>Inactive</p>
              <p className={`text-2xl font-bold ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                {jobs?.filter((j) => !j.isActive).length || 0}
              </p>
            </div>
          </div>

          {/* Jobs Table */}
          <div className={`rounded-lg overflow-hidden ${isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white border border-gray-200 shadow-sm"}`}>
            <table className="w-full">
              <thead className={isDark ? "bg-slate-800" : "bg-gray-50"}>
                <tr>
                  <th className={`px-6 py-4 text-left text-sm font-medium ${isDark ? "text-slate-400" : "text-gray-500"}`}>Title</th>
                  <th className={`px-6 py-4 text-left text-sm font-medium ${isDark ? "text-slate-400" : "text-gray-500"}`}>Department</th>
                  <th className={`px-6 py-4 text-left text-sm font-medium ${isDark ? "text-slate-400" : "text-gray-500"}`}>Position Type</th>
                  <th className={`px-6 py-4 text-center text-sm font-medium ${isDark ? "text-slate-400" : "text-gray-500"}`}>Badge Type</th>
                  <th className={`px-6 py-4 text-center text-sm font-medium ${isDark ? "text-slate-400" : "text-gray-500"}`}>Active</th>
                  <th className={`px-6 py-4 text-right text-sm font-medium ${isDark ? "text-slate-400" : "text-gray-500"}`}>Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? "divide-slate-700" : "divide-gray-200"}`}>
                {filteredJobs?.map((job) => (
                  <tr key={job._id} className={`transition-colors ${isDark ? "hover:bg-slate-800/50" : "hover:bg-gray-50"}`}>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium">{job.title}</p>
                        <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>{job.location}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        {job.department}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full border ${
                        job.positionType === "management"
                          ? "bg-purple-500/20 text-purple-400 border-purple-500/30"
                          : job.positionType === "salaried"
                          ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                          : "bg-slate-500/20 text-slate-400 border-slate-500/30"
                      }`}>
                        {job.positionType || "hourly"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <select
                        value={getEffectiveBadgeType(job)}
                        onChange={(e) => handleBadgeTypeChange(job, e.target.value)}
                        className={`px-3 py-1.5 text-xs rounded-lg border cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                          getEffectiveBadgeType(job) === "urgently_hiring"
                            ? isDark
                              ? "bg-red-500/20 text-red-400 border-red-500/30 focus:ring-red-500/50"
                              : "bg-red-100 text-red-700 border-red-300 focus:ring-red-500"
                            : getEffectiveBadgeType(job) === "accepting_applications"
                            ? isDark
                              ? "bg-blue-500/20 text-blue-400 border-blue-500/30 focus:ring-blue-500/50"
                              : "bg-blue-100 text-blue-700 border-blue-300 focus:ring-blue-500"
                            : isDark
                              ? "bg-green-500/20 text-green-400 border-green-500/30 focus:ring-green-500/50"
                              : "bg-green-100 text-green-700 border-green-300 focus:ring-green-500"
                        }`}
                      >
                        {BADGE_TYPE_OPTIONS.map((badge) => (
                          <option key={badge.value} value={badge.value} className={isDark ? "bg-slate-800 text-white" : "bg-white text-gray-900"}>
                            {badge.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {job.isActive ? (
                        <span className="inline-flex items-center gap-1 text-green-400">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Active
                        </span>
                      ) : (
                        <span className="text-slate-500">Inactive</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(job)}
                          className={`p-2 transition-colors ${isDark ? "text-slate-400 hover:text-cyan-400" : "text-gray-500 hover:text-blue-600"}`}
                          title="Edit job"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(job)}
                          className={`p-2 transition-colors ${isDark ? "text-slate-400" : "text-gray-500"} hover:text-red-400`}
                          title="Delete job"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredJobs?.length === 0 && (
              <div className={`text-center py-12 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                No jobs found matching your filters
              </div>
            )}
          </div>

          {/* Add/Edit Modal */}
          {showModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className={`rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto ${isDark ? "bg-slate-800 border border-slate-700" : "bg-white border border-gray-200 shadow-sm"}`}>
                <h2 className="text-xl font-bold mb-6">
                  {editingJob ? "Edit Job" : "Add New Job"}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-700"}`}>
                        Job Title *
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className={`w-full px-4 py-2 rounded-lg focus:outline-none ${isDark ? "bg-slate-700 border border-slate-600 text-white focus:border-cyan-500" : "bg-gray-50 border border-gray-300 text-gray-900 focus:border-blue-600"}`}
                        required
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-700"}`}>
                        Location *
                      </label>
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        className={`w-full px-4 py-2 rounded-lg focus:outline-none ${isDark ? "bg-slate-700 border border-slate-600 text-white focus:border-cyan-500" : "bg-gray-50 border border-gray-300 text-gray-900 focus:border-blue-600"}`}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-700"}`}>
                        Department *
                      </label>
                      <select
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        className={`w-full px-4 py-2 rounded-lg focus:outline-none ${isDark ? "bg-slate-700 border border-slate-600 text-white focus:border-cyan-500" : "bg-gray-50 border border-gray-300 text-gray-900 focus:border-blue-600"}`}
                      >
                        {DEPARTMENT_OPTIONS.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-700"}`}>
                        Employment Type *
                      </label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        className={`w-full px-4 py-2 rounded-lg focus:outline-none ${isDark ? "bg-slate-700 border border-slate-600 text-white focus:border-cyan-500" : "bg-gray-50 border border-gray-300 text-gray-900 focus:border-blue-600"}`}
                      >
                        {TYPE_OPTIONS.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-700"}`}>
                        Position Type *
                      </label>
                      <select
                        value={formData.positionType}
                        onChange={(e) => setFormData({ ...formData, positionType: e.target.value })}
                        className={`w-full px-4 py-2 rounded-lg focus:outline-none ${isDark ? "bg-slate-700 border border-slate-600 text-white focus:border-cyan-500" : "bg-gray-50 border border-gray-300 text-gray-900 focus:border-blue-600"}`}
                      >
                        {POSITION_TYPE_OPTIONS.map((pt) => (
                          <option key={pt.value} value={pt.value}>
                            {pt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-700"}`}>
                        Badge Type
                      </label>
                      <select
                        value={formData.badgeType}
                        onChange={(e) => setFormData({ ...formData, badgeType: e.target.value })}
                        className={`w-full px-4 py-2 rounded-lg focus:outline-none ${isDark ? "bg-slate-700 border border-slate-600 text-white focus:border-cyan-500" : "bg-gray-50 border border-gray-300 text-gray-900 focus:border-blue-600"}`}
                      >
                        {BADGE_TYPE_OPTIONS.map((badge) => (
                          <option key={badge.value} value={badge.value}>
                            {badge.label}
                          </option>
                        ))}
                      </select>
                      <p className={`text-xs mt-1 ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                        Badge displayed on the careers page
                      </p>
                    </div>
                    {editingJob && (
                      <div className="flex items-center">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.isActive}
                            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                            className={`w-5 h-5 rounded focus:ring-cyan-500 ${isDark ? "border-slate-600 bg-slate-700 text-cyan-500" : "border-gray-300 bg-white text-blue-600"}`}
                          />
                          <div>
                            <span className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>Active</span>
                            <p className={`text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>Visible on IE Tire website</p>
                          </div>
                        </label>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-700"}`}>
                      Description *
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={4}
                      className={`w-full px-4 py-2 rounded-lg focus:outline-none resize-none ${isDark ? "bg-slate-700 border border-slate-600 text-white focus:border-cyan-500" : "bg-gray-50 border border-gray-300 text-gray-900 focus:border-blue-600"}`}
                      required
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-700"}`}>
                      Benefits (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={formData.benefits}
                      onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                      placeholder="Health Insurance, 401k Match, Paid Time Off"
                      className={`w-full px-4 py-2 rounded-lg focus:outline-none ${isDark ? "bg-slate-700 border border-slate-600 text-white focus:border-cyan-500" : "bg-gray-50 border border-gray-300 text-gray-900 focus:border-blue-600"}`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-700"}`}>
                      Keywords for AI Matching (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={formData.keywords}
                      onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                      placeholder="warehouse, logistics, leadership, forklift"
                      className={`w-full px-4 py-2 rounded-lg focus:outline-none ${isDark ? "bg-slate-700 border border-slate-600 text-white focus:border-cyan-500" : "bg-gray-50 border border-gray-300 text-gray-900 focus:border-blue-600"}`}
                    />
                    <p className={`text-xs mt-1 ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                      These keywords help the AI match resumes to this position
                    </p>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        resetForm();
                      }}
                      className={`px-4 py-2 rounded-lg transition-colors ${isDark ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-900"}`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className={`px-4 py-2 rounded-lg transition-colors ${isDark ? "bg-cyan-500 hover:bg-cyan-600 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
                    >
                      {editingJob ? "Save Changes" : "Create Job"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className={`rounded-lg p-6 w-full max-w-md ${isDark ? "bg-slate-800 border border-slate-700" : "bg-white border border-gray-200 shadow-sm"}`}>
                <h2 className="text-xl font-bold mb-4">Delete Job</h2>
                <p className={`mb-6 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                  Are you sure you want to delete <strong>{showDeleteConfirm.title}</strong>? This
                  action cannot be undone.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(null)}
                    className={`px-4 py-2 rounded-lg transition-colors ${isDark ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-900"}`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg transition-colors text-white"
                  >
                    Delete
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
