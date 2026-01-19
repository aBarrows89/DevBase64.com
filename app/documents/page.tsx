"use client";

import { useState, useRef } from "react";
import Protected from "../protected";
import Sidebar from "@/components/Sidebar";
import { useTheme } from "../theme-context";
import { useAuth } from "../auth-context";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { QRCodeSVG } from "qrcode.react";

const CATEGORIES = [
  { value: "forms", label: "Forms", icon: "📋" },
  { value: "policies", label: "Policies", icon: "📜" },
  { value: "sops", label: "SOPs", icon: "📝" },
  { value: "templates", label: "Templates", icon: "📄" },
  { value: "training", label: "Training", icon: "📚" },
  { value: "other", label: "Other", icon: "📁" },
];

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function DocumentsContent() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const isDark = theme === "dark";

  const documents = useQuery(api.documents.getAll);
  const archivedDocuments = useQuery(api.documents.getArchived);
  const categoryCounts = useQuery(api.documents.getCategoryCounts);
  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const createDocument = useMutation(api.documents.create);
  const updateDocument = useMutation(api.documents.update);
  const archiveDocument = useMutation(api.documents.archive);
  const restoreDocument = useMutation(api.documents.restore);
  const removeDocument = useMutation(api.documents.remove);
  const incrementDownload = useMutation(api.documents.incrementDownload);
  const getFileDownloadUrl = useAction(api.documents.getFileDownloadUrl);
  const togglePublic = useMutation(api.documents.togglePublic);

  // Check if user is admin
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Id<"documents"> | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "forms",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preview modal state
  const [previewDocument, setPreviewDocument] = useState<NonNullable<typeof documents>[0] | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const previewIframeRef = useRef<HTMLIFrameElement>(null);

  // Share modal state
  const [shareDocumentId, setShareDocumentId] = useState<Id<"documents"> | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [togglingPublic, setTogglingPublic] = useState(false);

  // Get current document data for share modal (to stay in sync with mutations)
  const shareDocument = shareDocumentId ? documents?.find(d => d._id === shareDocumentId) : null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!formData.name) {
        setFormData({ ...formData, name: file.name.replace(/\.[^/.]+$/, "") });
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !user) return;

    setUploading(true);
    setError("");

    try {
      // Get upload URL
      const uploadUrl = await generateUploadUrl();

      if (!uploadUrl) {
        throw new Error("Failed to generate upload URL");
      }

      // Upload file to Convex storage
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": selectedFile.type },
        body: selectedFile,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      const storageId = result.storageId;

      if (!storageId) {
        throw new Error("No storage ID returned from upload");
      }

      // Create document record
      await createDocument({
        name: formData.name,
        description: formData.description || undefined,
        category: formData.category,
        fileId: storageId,
        fileName: selectedFile.name,
        fileType: selectedFile.type,
        fileSize: selectedFile.size,
        uploadedBy: user._id,
        uploadedByName: user.name,
      });

      // Reset form
      setShowUploadModal(false);
      setSelectedFile(null);
      setFormData({ name: "", description: "", category: "forms" });
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc: NonNullable<typeof documents>[0]) => {
    try {
      // Get the download URL using the action
      const url = await getFileDownloadUrl({ documentId: doc._id });

      if (!url) {
        setError("Could not get download URL");
        return;
      }

      // Increment download count
      await incrementDownload({ documentId: doc._id });

      // Open in new tab
      window.open(url, "_blank");
    } catch (err) {
      console.error("Download error:", err);
      setError(err instanceof Error ? err.message : "Download failed");
    }
  };

  const handlePreview = async (doc: NonNullable<typeof documents>[0]) => {
    setPreviewDocument(doc);
    setLoadingPreview(true);
    setPreviewUrl(null);

    try {
      const url = await getFileDownloadUrl({ documentId: doc._id });
      if (url) {
        setPreviewUrl(url);
      } else {
        setError("Could not load document preview");
        setPreviewDocument(null);
      }
    } catch (err) {
      console.error("Preview error:", err);
      setError(err instanceof Error ? err.message : "Preview failed");
      setPreviewDocument(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handlePrintPreview = () => {
    if (previewIframeRef.current) {
      previewIframeRef.current.contentWindow?.print();
    }
  };

  const closePreview = () => {
    setPreviewDocument(null);
    setPreviewUrl(null);
  };

  // Share/Public link handlers
  const handleShare = (doc: NonNullable<typeof documents>[0]) => {
    setShareDocumentId(doc._id);
    setCopiedUrl(false);
  };

  const handleTogglePublic = async () => {
    if (!shareDocument) return;
    setTogglingPublic(true);
    try {
      await togglePublic({ documentId: shareDocument._id });
      // Refresh the document data - it will update from the query
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle public access");
    } finally {
      setTogglingPublic(false);
    }
  };

  const getPublicUrl = (slug: string) => {
    // Use the current origin for the public URL
    if (typeof window !== "undefined") {
      return `${window.location.origin}/public/doc/${slug}`;
    }
    return `/public/doc/${slug}`;
  };

  const copyPublicUrl = async (slug: string) => {
    const url = getPublicUrl(slug);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch (err) {
      console.error("Failed to copy URL:", err);
    }
  };

  const closeShare = () => {
    setShareDocumentId(null);
    setCopiedUrl(false);
  };

  // Check if file type supports preview
  const canPreview = (fileType: string) => {
    return fileType.includes("pdf") || fileType.includes("image") || isOfficeDocument(fileType);
  };

  // Check if file is an Office document (Word, Excel, PowerPoint)
  const isOfficeDocument = (fileType: string) => {
    return (
      fileType.includes("word") ||
      fileType.includes("document") ||
      fileType.includes("msword") ||
      fileType.includes("spreadsheet") ||
      fileType.includes("excel") ||
      fileType.includes("presentation") ||
      fileType.includes("powerpoint")
    );
  };

  // Get Office Online viewer URL for Office documents
  const getOfficeViewerUrl = (fileUrl: string) => {
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDocument) return;

    try {
      await updateDocument({
        documentId: editingDocument,
        name: formData.name || undefined,
        description: formData.description || undefined,
        category: formData.category || undefined,
      });
      setEditingDocument(null);
      setShowUploadModal(false);
      setFormData({ name: "", description: "", category: "forms" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  };

  const handleEdit = (doc: NonNullable<typeof documents>[0]) => {
    setEditingDocument(doc._id);
    setFormData({
      name: doc.name,
      description: doc.description || "",
      category: doc.category,
    });
    setShowUploadModal(true);
  };

  const handleArchive = async (docId: Id<"documents">) => {
    if (!confirm("Are you sure you want to archive this document?")) return;
    try {
      await archiveDocument({ documentId: docId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Archive failed");
    }
  };

  const handleDelete = async (docId: Id<"documents">) => {
    if (!confirm("Are you sure you want to permanently delete this document? This cannot be undone.")) return;
    try {
      await removeDocument({ documentId: docId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const handleRestore = async (docId: Id<"documents">) => {
    try {
      await restoreDocument({ documentId: docId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Restore failed");
    }
  };

  // Use archived or active documents based on view
  const sourceDocuments = showArchived ? archivedDocuments : documents;

  const filteredDocuments = sourceDocuments?.filter((d) => {
    // Filter by category
    if (selectedCategory && d.category !== selectedCategory) return false;
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        d.name.toLowerCase().includes(query) ||
        d.fileName.toLowerCase().includes(query) ||
        (d.description && d.description.toLowerCase().includes(query))
      );
    }
    return true;
  });

  return (
    <div className={`flex h-screen ${isDark ? "bg-slate-900" : "bg-gray-50"}`}>
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className={`sticky top-0 z-10 backdrop-blur-sm border-b px-4 sm:px-8 py-4 ${isDark ? "bg-slate-900/80 border-slate-700" : "bg-white/80 border-gray-200"}`}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-xl sm:text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                Doc Hub {showArchived && <span className="text-amber-500">(Archived)</span>}
              </h1>
              <p className={`text-xs sm:text-sm mt-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                {showArchived ? "Manage archived documents" : "Frequently used documents and forms"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <button
                  onClick={() => setShowArchived(!showArchived)}
                  className={`px-3 sm:px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                    showArchived
                      ? isDark ? "bg-amber-500 text-white hover:bg-amber-600" : "bg-amber-600 text-white hover:bg-amber-700"
                      : isDark ? "bg-slate-700 text-slate-300 hover:bg-slate-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                  <span className="hidden sm:inline">{showArchived ? "View Active" : "View Archived"}</span>
                  {archivedDocuments && archivedDocuments.length > 0 && !showArchived && (
                    <span className={`px-1.5 py-0.5 text-xs rounded-full ${isDark ? "bg-amber-500/30 text-amber-300" : "bg-amber-100 text-amber-700"}`}>
                      {archivedDocuments.length}
                    </span>
                  )}
                </button>
              )}
              {!showArchived && (
                <button
                  onClick={() => {
                    setShowUploadModal(true);
                    setEditingDocument(null);
                    setSelectedFile(null);
                    setFormData({ name: "", description: "", category: "forms" });
                  }}
                  className={`px-3 sm:px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${isDark ? "bg-cyan-500 text-white hover:bg-cyan-600" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span className="hidden sm:inline">Upload Document</span>
                </button>
              )}
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-8">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm mb-6">
              {error}
              <button onClick={() => setError("")} className="ml-4 text-red-300 hover:text-red-100">Dismiss</button>
            </div>
          )}

          {/* Search Bar */}
          <div className="relative mb-4">
            <svg
              className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? "text-slate-500" : "text-gray-400"}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 ${
                isDark
                  ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:ring-cyan-500/50 focus:border-cyan-500"
                  : "bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500/50 focus:border-blue-500"
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full ${isDark ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-100 text-gray-500"}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                selectedCategory === null
                  ? isDark ? "bg-cyan-500 text-white" : "bg-blue-600 text-white"
                  : isDark ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              All ({documents?.length || 0})
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                  selectedCategory === cat.value
                    ? isDark ? "bg-cyan-500 text-white" : "bg-blue-600 text-white"
                    : isDark ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <span>{cat.icon}</span>
                {cat.label} ({categoryCounts?.[cat.value] || 0})
              </button>
            ))}
          </div>

          {/* Documents Grid */}
          {!filteredDocuments || filteredDocuments.length === 0 ? (
            <div className={`text-center py-12 border rounded-xl ${isDark ? "bg-slate-800/50 border-slate-700 text-slate-400" : "bg-white border-gray-200 text-gray-500"}`}>
              <div className="text-4xl mb-3">{showArchived ? "📦" : "📄"}</div>
              <p>{showArchived ? "No archived documents." : "No documents yet. Upload your first document to get started."}</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredDocuments.map((doc) => {
                const category = CATEGORIES.find((c) => c.value === doc.category);
                const previewable = canPreview(doc.fileType);
                return (
                  <div
                    key={doc._id}
                    className={`border rounded-xl p-4 ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm"} ${previewable ? "cursor-pointer hover:border-cyan-500/50 transition-colors" : ""}`}
                    onClick={previewable ? () => handlePreview(doc) : undefined}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`text-2xl p-2 rounded-lg ${isDark ? "bg-slate-700" : "bg-gray-100"}`}>
                        {category?.icon || "📄"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-semibold truncate ${isDark ? "text-white" : "text-gray-900"}`}>
                          {doc.name}
                        </h3>
                        <p className={`text-xs mt-0.5 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                          {doc.fileName}
                        </p>
                        {doc.description && (
                          <p className={`text-sm mt-1 line-clamp-2 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                            {doc.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className={`flex items-center gap-3 mt-3 text-xs ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                      <span className={`px-2 py-0.5 rounded ${isDark ? "bg-slate-700" : "bg-gray-100"}`}>
                        {category?.label}
                      </span>
                      <span>{formatFileSize(doc.fileSize)}</span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        {doc.downloadCount}
                      </span>
                      {previewable && (
                        <span className={`px-2 py-0.5 rounded ${isDark ? "bg-cyan-500/20 text-cyan-400" : "bg-blue-100 text-blue-600"}`}>
                          Click to preview
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-700/50" onClick={(e) => e.stopPropagation()}>
                      {previewable && (
                        <button
                          onClick={() => handlePreview(doc)}
                          className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center justify-center gap-1 ${isDark ? "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30" : "bg-purple-100 text-purple-600 hover:bg-purple-200"}`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Preview
                        </button>
                      )}
                      <button
                        onClick={() => handleDownload(doc)}
                        className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center justify-center gap-1 ${isDark ? "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30" : "bg-blue-100 text-blue-600 hover:bg-blue-200"}`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download
                      </button>
                      {!showArchived && (
                        <button
                          onClick={() => handleShare(doc)}
                          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center justify-center gap-1 ${doc.isPublic ? (isDark ? "bg-green-500/20 text-green-400 hover:bg-green-500/30" : "bg-green-100 text-green-600 hover:bg-green-200") : (isDark ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30" : "bg-amber-100 text-amber-600 hover:bg-amber-200")}`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                          </svg>
                          {doc.isPublic ? "Shared" : "Share"}
                        </button>
                      )}
                      {showArchived ? (
                        <>
                          <button
                            onClick={() => handleRestore(doc._id)}
                            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center justify-center gap-1 ${isDark ? "bg-green-500/20 text-green-400 hover:bg-green-500/30" : "bg-green-100 text-green-600 hover:bg-green-200"}`}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Restore
                          </button>
                          <button
                            onClick={() => handleDelete(doc._id)}
                            className="px-3 py-1.5 text-xs font-medium rounded transition-colors bg-red-500/20 text-red-400 hover:bg-red-500/30"
                          >
                            Delete Forever
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEdit(doc)}
                            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${isDark ? "bg-slate-700 text-slate-300 hover:bg-slate-600" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleArchive(doc._id)}
                            className="px-3 py-1.5 text-xs font-medium rounded transition-colors bg-red-500/10 text-red-400 hover:bg-red-500/20"
                          >
                            Archive
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Preview Modal */}
        {previewDocument && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex flex-col z-50">
            {/* Preview Header */}
            <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200"}`}>
              <div className="flex items-center gap-3">
                <span className="text-xl">{CATEGORIES.find((c) => c.value === previewDocument.category)?.icon || "📄"}</span>
                <div>
                  <h3 className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>{previewDocument.name}</h3>
                  <p className={`text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>{previewDocument.fileName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintPreview}
                  disabled={!previewUrl}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 ${isDark ? "bg-purple-500 text-white hover:bg-purple-600" : "bg-purple-600 text-white hover:bg-purple-700"}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print
                </button>
                <button
                  onClick={() => handleDownload(previewDocument)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${isDark ? "bg-cyan-500 text-white hover:bg-cyan-600" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </button>
                <button
                  onClick={closePreview}
                  className={`p-2 rounded-lg transition-colors ${isDark ? "hover:bg-slate-700 text-slate-400 hover:text-white" : "hover:bg-gray-100 text-gray-500 hover:text-gray-700"}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Preview Content */}
            <div className="flex-1 overflow-hidden p-4">
              {loadingPreview ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <svg className="w-8 h-8 animate-spin text-cyan-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <p className={isDark ? "text-slate-400" : "text-gray-500"}>Loading preview...</p>
                  </div>
                </div>
              ) : previewUrl ? (
                previewDocument.fileType.includes("image") ? (
                  <div className="flex items-center justify-center h-full">
                    <img
                      src={previewUrl}
                      alt={previewDocument.name}
                      className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                    />
                  </div>
                ) : isOfficeDocument(previewDocument.fileType) ? (
                  <iframe
                    ref={previewIframeRef}
                    src={getOfficeViewerUrl(previewUrl)}
                    className="w-full h-full rounded-lg bg-white"
                    title={previewDocument.name}
                  />
                ) : (
                  <iframe
                    ref={previewIframeRef}
                    src={previewUrl}
                    className="w-full h-full rounded-lg bg-white"
                    title={previewDocument.name}
                  />
                )
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className={isDark ? "text-slate-400" : "text-gray-500"}>Unable to load preview</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Share Modal */}
        {shareDocument && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`border rounded-xl p-4 sm:p-6 w-full max-w-md ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                  Share Document
                </h2>
                <button
                  onClick={closeShare}
                  className={`p-2 rounded-lg transition-colors ${isDark ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-100 text-gray-500"}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className={`p-3 rounded-lg ${isDark ? "bg-slate-700/50" : "bg-gray-50"}`}>
                  <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>{shareDocument.name}</p>
                  <p className={`text-xs mt-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>{shareDocument.fileName}</p>
                </div>

                {/* Public toggle */}
                <div className={`flex items-center justify-between p-4 rounded-lg border ${isDark ? "bg-slate-700/30 border-slate-600" : "bg-gray-50 border-gray-200"}`}>
                  <div>
                    <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>Public Access</p>
                    <p className={`text-xs mt-0.5 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                      {shareDocument.isPublic ? "Anyone with the link can view" : "Only authenticated users can view"}
                    </p>
                  </div>
                  <button
                    onClick={handleTogglePublic}
                    disabled={togglingPublic}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      shareDocument.isPublic
                        ? isDark ? "bg-green-500" : "bg-green-600"
                        : isDark ? "bg-slate-600" : "bg-gray-300"
                    } ${togglingPublic ? "opacity-50" : ""}`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        shareDocument.isPublic ? "translate-x-7" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* QR Code and URL - only show when public */}
                {shareDocument.isPublic && shareDocument.publicSlug && (
                  <>
                    <div className={`flex flex-col items-center p-6 rounded-lg border ${isDark ? "bg-white border-slate-600" : "bg-white border-gray-200"}`}>
                      <QRCodeSVG
                        value={getPublicUrl(shareDocument.publicSlug)}
                        size={180}
                        level="H"
                        includeMargin={true}
                      />
                      <p className={`text-xs mt-3 ${isDark ? "text-slate-600" : "text-gray-500"}`}>
                        Scan to view document
                      </p>
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                        Public URL
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={getPublicUrl(shareDocument.publicSlug)}
                          readOnly
                          className={`flex-1 px-3 py-2 text-sm border rounded-lg ${isDark ? "bg-slate-900/50 border-slate-600 text-slate-300" : "bg-gray-50 border-gray-300 text-gray-700"}`}
                        />
                        <button
                          onClick={() => copyPublicUrl(shareDocument.publicSlug!)}
                          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                            copiedUrl
                              ? isDark ? "bg-green-500 text-white" : "bg-green-600 text-white"
                              : isDark ? "bg-cyan-500 text-white hover:bg-cyan-600" : "bg-blue-600 text-white hover:bg-blue-700"
                          }`}
                        >
                          {copiedUrl ? (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Copied!
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              Copy
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <a
                      href={getPublicUrl(shareDocument.publicSlug)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`block w-full text-center px-4 py-3 font-medium rounded-lg transition-colors ${isDark ? "bg-slate-700 text-white hover:bg-slate-600" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                    >
                      Open Public Page
                    </a>
                  </>
                )}

                {!shareDocument.isPublic && (
                  <div className={`text-center py-6 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <p className="text-sm">Enable public access to generate a shareable link and QR code</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Upload/Edit Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`border rounded-xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
              <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
                {editingDocument ? "Edit Document" : "Upload Document"}
              </h2>
              <form onSubmit={editingDocument ? handleUpdate : handleUpload} className="space-y-4">
                {!editingDocument && (
                  <div>
                    <span className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                      File *
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
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.png,.jpg,.jpeg"
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
                          <p className={isDark ? "text-slate-400" : "text-gray-500"}>Click to select a file</p>
                          <p className={`text-xs mt-1 ${isDark ? "text-slate-500" : "text-gray-400"}`}>PDF, DOC, XLS, TXT, Images</p>
                        </div>
                      )}
                    </label>
                  </div>
                )}

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                    Document Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none ${isDark ? "bg-slate-900/50 border-slate-600 text-white focus:border-cyan-500" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500"}`}
                    required
                    placeholder="e.g., Vacation Request Form"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none ${isDark ? "bg-slate-900/50 border-slate-600 text-white focus:border-cyan-500" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500"}`}
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.icon} {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none resize-none ${isDark ? "bg-slate-900/50 border-slate-600 text-white focus:border-cyan-500" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500"}`}
                    placeholder="Brief description of the document..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUploadModal(false);
                      setEditingDocument(null);
                      setSelectedFile(null);
                      setFormData({ name: "", description: "", category: "forms" });
                    }}
                    className={`flex-1 px-4 py-3 font-medium rounded-lg transition-colors ${isDark ? "bg-slate-700 text-white hover:bg-slate-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading || (!editingDocument && !selectedFile)}
                    className={`flex-1 px-4 py-3 font-medium rounded-lg transition-colors disabled:opacity-50 ${isDark ? "bg-cyan-500 text-white hover:bg-cyan-600" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                  >
                    {uploading ? "Uploading..." : editingDocument ? "Update" : "Upload"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function DocumentsPage() {
  return (
    <Protected>
      <DocumentsContent />
    </Protected>
  );
}
