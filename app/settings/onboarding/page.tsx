"use client";

import { useState, useRef } from "react";
import Protected from "../../protected";
import Sidebar from "@/components/Sidebar";
import { useTheme } from "../../theme-context";
import { useAuth } from "../../auth-context";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

const DOCUMENT_TYPES = [
  { value: "handbook", label: "Employee Handbook", icon: "📘" },
  { value: "policy", label: "Company Policy", icon: "📋" },
  { value: "agreement", label: "Agreement", icon: "📝" },
  { value: "form", label: "Form", icon: "📄" },
];

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function OnboardingContent() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const isDark = theme === "dark";

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showSignaturesModal, setShowSignaturesModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Id<"onboardingDocuments"> | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    documentType: "handbook",
    requiresSignature: true,
    isRequired: true,
    version: "1.0",
    effectiveDate: new Date().toISOString().split("T")[0],
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Queries
  const documents = useQuery(api.onboardingDocuments.listAll);
  const signatures = useQuery(
    api.onboardingDocuments.getSignaturesForDocument,
    selectedDocument ? { documentId: selectedDocument } : "skip"
  );
  const unsignedEmployees = useQuery(
    api.onboardingDocuments.getUnsignedEmployees,
    selectedDocument ? { documentId: selectedDocument } : "skip"
  );

  // Mutations
  const generateUploadUrl = useMutation(api.onboardingDocuments.generateUploadUrl);
  const createDocument = useMutation(api.onboardingDocuments.create);
  const updateDocument = useMutation(api.onboardingDocuments.update);
  const deleteDocument = useMutation(api.onboardingDocuments.deleteDocument);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!formData.title) {
        setFormData({ ...formData, title: file.name.replace(/\.[^/.]+$/, "") });
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !user) return;

    setUploading(true);
    setError("");

    try {
      const uploadUrl = await generateUploadUrl();
      if (!uploadUrl) throw new Error("Failed to generate upload URL");

      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": selectedFile.type },
        body: selectedFile,
      });

      if (!response.ok) throw new Error("Upload failed");

      const result = await response.json();
      const storageId = result.storageId;

      await createDocument({
        title: formData.title,
        description: formData.description || undefined,
        documentType: formData.documentType,
        storageId,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        requiresSignature: formData.requiresSignature,
        isRequired: formData.isRequired,
        version: formData.version,
        effectiveDate: formData.effectiveDate,
        createdBy: user._id,
      });

      setShowUploadModal(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setFormData({
      title: "",
      description: "",
      documentType: "handbook",
      requiresSignature: true,
      isRequired: true,
      version: "1.0",
      effectiveDate: new Date().toISOString().split("T")[0],
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleToggleActive = async (docId: Id<"onboardingDocuments">, currentActive: boolean) => {
    try {
      await updateDocument({ documentId: docId, isActive: !currentActive });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  };

  const handleDelete = async (docId: Id<"onboardingDocuments">) => {
    if (!confirm("Are you sure you want to delete this document? All signature records will be lost.")) return;
    try {
      await deleteDocument({ documentId: docId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const handleViewSignatures = (docId: Id<"onboardingDocuments">) => {
    setSelectedDocument(docId);
    setShowSignaturesModal(true);
  };

  const selectedDocDetails = documents?.find((d) => d._id === selectedDocument);

  return (
    <div className={`flex h-screen ${isDark ? "bg-slate-900" : "bg-gray-50"}`}>
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className={`sticky top-0 z-10 backdrop-blur-sm border-b px-4 sm:px-8 py-4 ${isDark ? "bg-slate-900/80 border-slate-700" : "bg-white/80 border-gray-200"}`}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-xl sm:text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                Onboarding Documents
              </h1>
              <p className={`text-xs sm:text-sm mt-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                Manage employee handbooks, policies, and required documents
              </p>
            </div>
            <button
              onClick={() => {
                setShowUploadModal(true);
                resetForm();
              }}
              className={`px-3 sm:px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${isDark ? "bg-cyan-500 text-white hover:bg-cyan-600" : "bg-blue-600 text-white hover:bg-blue-700"}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Add Document</span>
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

          {/* Stats Cards */}
          <div className="grid gap-4 sm:grid-cols-3 mb-6">
            <div className={`p-4 rounded-xl border ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200"}`}>
              <div className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                {documents?.length || 0}
              </div>
              <div className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>Total Documents</div>
            </div>
            <div className={`p-4 rounded-xl border ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200"}`}>
              <div className={`text-2xl font-bold text-green-400`}>
                {documents?.filter((d) => d.isActive).length || 0}
              </div>
              <div className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>Active Documents</div>
            </div>
            <div className={`p-4 rounded-xl border ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200"}`}>
              <div className={`text-2xl font-bold text-amber-400`}>
                {documents?.filter((d) => d.requiresSignature && d.isRequired).length || 0}
              </div>
              <div className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>Require Signature</div>
            </div>
          </div>

          {/* Documents List */}
          {!documents || documents.length === 0 ? (
            <div className={`text-center py-12 border rounded-xl ${isDark ? "bg-slate-800/50 border-slate-700 text-slate-400" : "bg-white border-gray-200 text-gray-500"}`}>
              <div className="text-4xl mb-3">📋</div>
              <p>No onboarding documents yet.</p>
              <p className="text-sm mt-2">Upload your employee handbook or company policies to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((doc) => {
                const docType = DOCUMENT_TYPES.find((t) => t.value === doc.documentType);
                return (
                  <div
                    key={doc._id}
                    className={`border rounded-xl p-4 sm:p-6 ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm"} ${!doc.isActive && "opacity-60"}`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      {/* Icon */}
                      <div className={`text-3xl p-3 rounded-lg shrink-0 ${isDark ? "bg-slate-700" : "bg-gray-100"}`}>
                        {docType?.icon || "📄"}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                              {doc.title}
                            </h3>
                            <div className={`flex flex-wrap items-center gap-2 mt-1 text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                              <span className={`px-2 py-0.5 rounded ${isDark ? "bg-slate-700" : "bg-gray-100"}`}>
                                {docType?.label}
                              </span>
                              <span>v{doc.version}</span>
                              <span>|</span>
                              <span>{formatFileSize(doc.fileSize)}</span>
                              {doc.pageCount && <span>| {doc.pageCount} pages</span>}
                            </div>
                          </div>

                          {/* Status Badge */}
                          <div className={`px-3 py-1 rounded-full text-xs font-medium ${doc.isActive ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}`}>
                            {doc.isActive ? "Active" : "Inactive"}
                          </div>
                        </div>

                        {doc.description && (
                          <p className={`mt-2 text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                            {doc.description}
                          </p>
                        )}

                        {/* Meta Info */}
                        <div className={`flex flex-wrap items-center gap-4 mt-4 text-xs ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                          <div className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Effective: {doc.effectiveDate}
                          </div>
                          <div className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Added: {formatDate(doc.createdAt)}
                          </div>
                          {doc.requiresSignature && (
                            <div className="flex items-center gap-1 text-amber-400">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                              Requires Signature
                            </div>
                          )}
                          {doc.isRequired && (
                            <div className="flex items-center gap-1 text-red-400">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              Required
                            </div>
                          )}
                        </div>

                        {/* Signature Stats */}
                        {doc.requiresSignature && (
                          <div className={`flex items-center gap-4 mt-4 pt-4 border-t ${isDark ? "border-slate-700" : "border-gray-200"}`}>
                            <button
                              onClick={() => handleViewSignatures(doc._id)}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isDark ? "bg-slate-700 text-slate-300 hover:bg-slate-600" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                            >
                              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-green-400 font-bold">{doc.signatureCount}</span>
                              Signed
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex sm:flex-col gap-2 shrink-0">
                        <button
                          onClick={() => handleToggleActive(doc._id, doc.isActive)}
                          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${doc.isActive ? isDark ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30" : "bg-amber-100 text-amber-600 hover:bg-amber-200" : isDark ? "bg-green-500/20 text-green-400 hover:bg-green-500/30" : "bg-green-100 text-green-600 hover:bg-green-200"}`}
                        >
                          {doc.isActive ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() => handleDelete(doc._id)}
                          className="px-3 py-1.5 text-xs font-medium rounded transition-colors bg-red-500/10 text-red-400 hover:bg-red-500/20"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`border rounded-xl p-4 sm:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
              <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
                Add Onboarding Document
              </h2>
              <form onSubmit={handleUpload} className="space-y-4">
                {/* File Upload */}
                <div>
                  <span className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                    Document File *
                  </span>
                  <label
                    htmlFor="file-upload"
                    className={`block border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                      selectedFile
                        ? isDark ? "border-cyan-500 bg-cyan-500/10" : "border-blue-500 bg-blue-50"
                        : isDark ? "border-slate-600 hover:border-slate-500" : "border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    <input
                      id="file-upload"
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileSelect}
                      className="sr-only"
                      accept=".pdf,.doc,.docx"
                    />
                    {selectedFile ? (
                      <div>
                        <div className="text-2xl mb-2">📄</div>
                        <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>{selectedFile.name}</p>
                        <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>{formatFileSize(selectedFile.size)}</p>
                      </div>
                    ) : (
                      <div>
                        <div className="text-2xl mb-2">📤</div>
                        <p className={isDark ? "text-slate-400" : "text-gray-500"}>Click to select a document</p>
                        <p className={`text-xs mt-1 ${isDark ? "text-slate-500" : "text-gray-400"}`}>PDF or Word documents</p>
                      </div>
                    )}
                  </label>
                </div>

                {/* Title */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                    Document Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none ${isDark ? "bg-slate-900/50 border-slate-600 text-white focus:border-cyan-500" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500"}`}
                    required
                    placeholder="e.g., Employee Handbook 2025"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none resize-none ${isDark ? "bg-slate-900/50 border-slate-600 text-white focus:border-cyan-500" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500"}`}
                    placeholder="Brief description..."
                  />
                </div>

                {/* Document Type & Version */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                      Document Type *
                    </label>
                    <select
                      value={formData.documentType}
                      onChange={(e) => setFormData({ ...formData, documentType: e.target.value })}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none ${isDark ? "bg-slate-900/50 border-slate-600 text-white focus:border-cyan-500" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500"}`}
                    >
                      {DOCUMENT_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.icon} {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                      Version *
                    </label>
                    <input
                      type="text"
                      value={formData.version}
                      onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none ${isDark ? "bg-slate-900/50 border-slate-600 text-white focus:border-cyan-500" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500"}`}
                      required
                      placeholder="1.0"
                    />
                  </div>
                </div>

                {/* Effective Date */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                    Effective Date *
                  </label>
                  <input
                    type="date"
                    value={formData.effectiveDate}
                    onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none ${isDark ? "bg-slate-900/50 border-slate-600 text-white focus:border-cyan-500" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500"}`}
                    required
                  />
                </div>

                {/* Checkboxes */}
                <div className="space-y-3">
                  <label className={`flex items-center gap-3 cursor-pointer ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                    <input
                      type="checkbox"
                      checked={formData.requiresSignature}
                      onChange={(e) => setFormData({ ...formData, requiresSignature: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-600 text-cyan-500 focus:ring-cyan-500"
                    />
                    <span className="text-sm">Requires digital signature</span>
                  </label>
                  <label className={`flex items-center gap-3 cursor-pointer ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                    <input
                      type="checkbox"
                      checked={formData.isRequired}
                      onChange={(e) => setFormData({ ...formData, isRequired: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-600 text-cyan-500 focus:ring-cyan-500"
                    />
                    <span className="text-sm">Required for all employees</span>
                  </label>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUploadModal(false);
                      resetForm();
                    }}
                    className={`flex-1 px-4 py-3 font-medium rounded-lg transition-colors ${isDark ? "bg-slate-700 text-white hover:bg-slate-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading || !selectedFile}
                    className={`flex-1 px-4 py-3 font-medium rounded-lg transition-colors disabled:opacity-50 ${isDark ? "bg-cyan-500 text-white hover:bg-cyan-600" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                  >
                    {uploading ? "Uploading..." : "Add Document"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Signatures Modal */}
        {showSignaturesModal && selectedDocDetails && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
              {/* Modal Header */}
              <div className={`flex items-center justify-between p-4 sm:p-6 border-b ${isDark ? "border-slate-700" : "border-gray-200"}`}>
                <div>
                  <h2 className={`text-xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                    Signature Status
                  </h2>
                  <p className={`text-sm mt-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    {selectedDocDetails.title} (v{selectedDocDetails.version})
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowSignaturesModal(false);
                    setSelectedDocument(null);
                  }}
                  className={`p-2 rounded-lg ${isDark ? "hover:bg-slate-700" : "hover:bg-gray-100"}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className={`p-4 rounded-lg ${isDark ? "bg-green-500/10 border border-green-500/20" : "bg-green-50 border border-green-200"}`}>
                    <div className="text-2xl font-bold text-green-400">{signatures?.length || 0}</div>
                    <div className={`text-sm ${isDark ? "text-green-400/80" : "text-green-600"}`}>Signed</div>
                  </div>
                  <div className={`p-4 rounded-lg ${isDark ? "bg-amber-500/10 border border-amber-500/20" : "bg-amber-50 border border-amber-200"}`}>
                    <div className="text-2xl font-bold text-amber-400">{unsignedEmployees?.length || 0}</div>
                    <div className={`text-sm ${isDark ? "text-amber-400/80" : "text-amber-600"}`}>Pending</div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="space-y-6">
                  {/* Signed List */}
                  <div>
                    <h3 className={`text-sm font-medium mb-3 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                      Signed ({signatures?.length || 0})
                    </h3>
                    {signatures && signatures.length > 0 ? (
                      <div className="space-y-2">
                        {signatures.map((sig) => (
                          <div
                            key={sig._id}
                            className={`flex items-center justify-between p-3 rounded-lg ${isDark ? "bg-slate-700/50" : "bg-gray-50"}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${isDark ? "bg-green-500/20 text-green-400" : "bg-green-100 text-green-600"}`}>
                                {sig.personnelName.charAt(0)}
                              </div>
                              <span className={isDark ? "text-white" : "text-gray-900"}>
                                {sig.personnelName}
                              </span>
                            </div>
                            <span className={`text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                              {formatDate(sig.signedAt)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className={`text-sm ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                        No signatures yet
                      </p>
                    )}
                  </div>

                  {/* Unsigned List */}
                  <div>
                    <h3 className={`text-sm font-medium mb-3 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                      Pending Signatures ({unsignedEmployees?.length || 0})
                    </h3>
                    {unsignedEmployees && unsignedEmployees.length > 0 ? (
                      <div className="space-y-2">
                        {unsignedEmployees.map((emp) => (
                          <div
                            key={emp._id}
                            className={`flex items-center justify-between p-3 rounded-lg ${isDark ? "bg-slate-700/50" : "bg-gray-50"}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${isDark ? "bg-amber-500/20 text-amber-400" : "bg-amber-100 text-amber-600"}`}>
                                {emp.name.charAt(0)}
                              </div>
                              <div>
                                <span className={isDark ? "text-white" : "text-gray-900"}>
                                  {emp.name}
                                </span>
                                {emp.department && (
                                  <span className={`block text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                                    {emp.department}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className={`text-sm text-green-400`}>
                        All active employees have signed!
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Protected>
      <OnboardingContent />
    </Protected>
  );
}
