"use client";

import { useState, useRef, useEffect } from "react";
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

  const documents = useQuery(api.documents.getAll, { rootOnly: true });
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

  // Folder APIs
  const createFolder = useMutation(api.documentFolders.create);
  const moveFolder = useMutation(api.documentFolders.moveFolder);
  const updateFolder = useMutation(api.documentFolders.update);
  const archiveFolder = useMutation(api.documentFolders.archive);
  const setFolderPasswordMutation = useMutation(api.documentFolders.setPassword);
  const removeFolderPasswordMutation = useMutation(api.documentFolders.removePassword);
  const verifyFolderPassword = useAction(api.documentFolders.verifyPassword);
  const getProtectedDocuments = useAction(api.documentFolders.getProtectedDocuments);
  const moveDocumentToFolder = useMutation(api.documentFolders.moveDocument);

  // Folder sharing APIs
  const grantFolderAccess = useMutation(api.documentFolders.grantAccess);
  const revokeFolderAccess = useMutation(api.documentFolders.revokeAccess);
  const usersForSharing = useQuery(api.documentFolders.getUsersForSharing);
  const sharedFoldersWithMe = useQuery(
    api.documentFolders.getSharedFolders,
    user ? { userId: user._id } : "skip"
  );

  // Check if user is admin or super_admin
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const isSuperAdmin = user?.role === "super_admin";

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

  // Folder state
  const [currentFolderId, setCurrentFolderId] = useState<Id<"documentFolders"> | null>(null);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState<Id<"documentFolders"> | null>(null);
  const [folderFormData, setFolderFormData] = useState({
    name: "",
    description: "",
    password: "",
    isProtected: false,
    visibility: "private" as "private" | "community",
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordModalFolderId, setPasswordModalFolderId] = useState<Id<"documentFolders"> | null>(null);
  const [unlockedFolders, setUnlockedFolders] = useState<Set<string>>(new Set());
  const [folderPassword, setFolderPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [folderDocuments, setFolderDocuments] = useState<NonNullable<typeof documents> | null>(null);
  const [loadingFolderDocs, setLoadingFolderDocs] = useState(false);

  // Drag and drop state
  const [draggedDocId, setDraggedDocId] = useState<Id<"documents"> | null>(null);
  const [draggedFolderId, setDraggedFolderId] = useState<Id<"documentFolders"> | null>(null);
  const [dropTargetFolderId, setDropTargetFolderId] = useState<Id<"documentFolders"> | null>(null);

  // Folder sharing state
  const [showShareFolderModal, setShowShareFolderModal] = useState(false);
  const [shareFolderId, setShareFolderId] = useState<Id<"documentFolders"> | null>(null);
  const [selectedUserToShare, setSelectedUserToShare] = useState<Id<"users"> | null>(null);
  const [sharingInProgress, setSharingInProgress] = useState(false);

  // How To modal state
  const [showHowToModal, setShowHowToModal] = useState(false);

  // Load unlocked folders from sessionStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("unlockedFolders");
      if (stored) {
        try {
          setUnlockedFolders(new Set(JSON.parse(stored)));
        } catch (e) {
          console.error("Failed to parse unlocked folders", e);
        }
      }
    }
  }, []);

  // Save unlocked folders to sessionStorage
  const unlockFolder = (folderId: string) => {
    const newUnlocked = new Set(unlockedFolders);
    newUnlocked.add(folderId);
    setUnlockedFolders(newUnlocked);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("unlockedFolders", JSON.stringify([...newUnlocked]));
    }
  };

  // HIPAA-compliant folder queries
  // My Folders: User's own folders
  const myFolders = useQuery(
    api.documentFolders.getMyFolders,
    user ? { userId: user._id, parentFolderId: currentFolderId ?? null } : "skip"
  );

  // Community Folders: Public folders for everyone
  const communityFolders = useQuery(api.documentFolders.getCommunityFolders, {
    parentFolderId: currentFolderId ?? null,
  });

  // Legacy: Combined folders for backward compatibility (filtered by user access)
  const folders = useQuery(api.documentFolders.getAll, {
    parentFolderId: currentFolderId ?? null,
    userId: user?._id,
  });

  // Get current folder info
  const currentFolder = useQuery(
    api.documentFolders.getById,
    currentFolderId ? { folderId: currentFolderId } : "skip"
  );

  // Get access grants for folder being shared
  const folderAccessGrants = useQuery(
    api.documentFolders.getFolderAccessGrants,
    shareFolderId ? { folderId: shareFolderId } : "skip"
  );

  // Check if current user has access to a protected folder (for bypass)
  const userAccessCheck = useQuery(
    api.documentFolders.checkUserAccess,
    user && currentFolderId ? { folderId: currentFolderId, userId: user._id } : "skip"
  );

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
  // Check both root documents and folder documents
  const shareDocument = shareDocumentId
    ? (documents?.find(d => d._id === shareDocumentId) ||
       folderDocuments?.find(d => d._id === shareDocumentId))
    : null;

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
        folderId: currentFolderId || undefined,
        fileId: storageId,
        fileName: selectedFile.name,
        fileType: selectedFile.type,
        fileSize: selectedFile.size,
        uploadedBy: user._id,
        uploadedByName: user.name,
      });

      // Reset form first so modal closes
      setShowUploadModal(false);
      setSelectedFile(null);
      setFormData({ name: "", description: "", category: "forms" });
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Refresh folder documents if we're in a folder
      // Small delay to ensure mutation is committed
      if (currentFolderId) {
        setTimeout(async () => {
          const folder = folders?.find(f => f._id === currentFolderId) ||
                        myFolders?.find(f => f._id === currentFolderId) ||
                        communityFolders?.find(f => f._id === currentFolderId);
          if (folder) {
            await loadFolderDocuments(currentFolderId, folder.isProtected);
          } else {
            // If we can't find the folder in queries, still try to load
            await loadFolderDocuments(currentFolderId, currentFolder?.isProtected || false);
          }
        }, 100);
      }
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
      // Name and category are required, description can be cleared
      await updateDocument({
        documentId: editingDocument,
        name: formData.name || undefined,
        description: formData.description, // Allow empty string to clear description
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

  // Folder handlers
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await createFolder({
        name: folderFormData.name,
        description: folderFormData.description || undefined,
        password: folderFormData.isProtected ? folderFormData.password : undefined,
        visibility: folderFormData.visibility,
        parentFolderId: currentFolderId || undefined,
        createdBy: user._id,
        createdByName: user.name,
      });
      setShowFolderModal(false);
      setFolderFormData({ name: "", description: "", password: "", isProtected: false, visibility: "private" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create folder");
    }
  };

  const handleUpdateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFolderId) return;

    try {
      await updateFolder({
        folderId: editingFolderId,
        name: folderFormData.name,
        description: folderFormData.description || undefined,
        visibility: folderFormData.visibility,
      });
      setShowFolderModal(false);
      setEditingFolderId(null);
      setFolderFormData({ name: "", description: "", password: "", isProtected: false, visibility: "private" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update folder");
    }
  };

  const handleOpenFolder = async (folder: NonNullable<typeof folders>[0], hasAccessGrant = false) => {
    // Check if user has access grant from shared folders list
    // This ensures password bypass works even when clicking from main Folders list
    const hasAccessFromSharing = sharedFoldersWithMe?.some(f => f?._id === folder._id) || false;
    const effectiveHasAccess = hasAccessGrant || hasAccessFromSharing;

    // HIPAA-compliant: Only owner, grant holders, or password entry can access
    // Super admin does NOT bypass (minimum necessary principle)
    if (folder.isProtected && !unlockedFolders.has(folder._id) && !effectiveHasAccess && folder.createdBy !== user?._id) {
      // Show password modal
      setPasswordModalFolderId(folder._id);
      setShowPasswordModal(true);
      setFolderPassword("");
      setPasswordError("");
    } else {
      // Open folder directly (super_admin or access grant bypasses password)
      await loadFolderDocuments(folder._id, folder.isProtected);
    }
  };

  const loadFolderDocuments = async (folderId: Id<"documentFolders">, isProtected: boolean) => {
    setLoadingFolderDocs(true);
    setCurrentFolderId(folderId);

    try {
      // HIPAA-compliant: Backend checks owner, grant, or password - no admin bypass
      const result = await getProtectedDocuments({
        folderId,
        password: "",
        userId: user?._id,
        userName: user?.name,
        userEmail: user?.email,
      });
      if (result.success && result.documents) {
        setFolderDocuments(result.documents as NonNullable<typeof documents>);
      } else if (!result.success) {
        setError(result.error || "Access denied");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load folder documents");
    } finally {
      setLoadingFolderDocs(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalFolderId) return;

    try {
      // Load documents using the password - HIPAA-compliant access logging included
      setLoadingFolderDocs(true);
      setCurrentFolderId(passwordModalFolderId);

      const docsResult = await getProtectedDocuments({
        folderId: passwordModalFolderId,
        password: folderPassword,
        userId: user?._id,
        userName: user?.name,
        userEmail: user?.email,
      });

      if (docsResult.success && docsResult.documents) {
        unlockFolder(passwordModalFolderId);
        setShowPasswordModal(false);
        setFolderDocuments(docsResult.documents as NonNullable<typeof documents>);
      } else {
        setPasswordError(docsResult.error || "Invalid password");
      }
      setLoadingFolderDocs(false);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Verification failed");
      setLoadingFolderDocs(false);
    }
  };

  const handleBackToRoot = () => {
    setCurrentFolderId(null);
    setFolderDocuments(null);
  };

  const handleEditFolder = (folder: NonNullable<typeof folders>[0]) => {
    setEditingFolderId(folder._id);
    setFolderFormData({
      name: folder.name,
      description: folder.description || "",
      password: "",
      isProtected: folder.isProtected,
      visibility: (folder as { visibility?: string }).visibility as "private" | "community" || "private",
    });
    setShowFolderModal(true);
  };

  const handleArchiveFolder = async (folderId: Id<"documentFolders">) => {
    if (!confirm("Are you sure you want to archive this folder? Documents will remain in the folder.")) return;
    try {
      await archiveFolder({ folderId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive folder");
    }
  };

  // Drag and drop handlers for documents
  const handleDragStart = (e: React.DragEvent, docId: Id<"documents">) => {
    e.dataTransfer.setData("text/plain", `doc:${docId}`);
    e.dataTransfer.effectAllowed = "move";
    setDraggedDocId(docId);
  };

  // Drag handlers for folders
  const handleFolderDragStart = (e: React.DragEvent, folderId: Id<"documentFolders">) => {
    e.dataTransfer.setData("text/plain", `folder:${folderId}`);
    e.dataTransfer.effectAllowed = "move";
    setDraggedFolderId(folderId);
    e.stopPropagation();
  };

  const handleDragEnd = () => {
    setDraggedDocId(null);
    setDraggedFolderId(null);
    setDropTargetFolderId(null);
  };

  const handleFolderDragOver = (e: React.DragEvent, folderId: Id<"documentFolders">) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    // Don't allow dropping a folder on itself
    if (draggedFolderId !== folderId) {
      setDropTargetFolderId(folderId);
    }
  };

  const handleFolderDragLeave = () => {
    setDropTargetFolderId(null);
  };

  const handleFolderDrop = async (e: React.DragEvent, targetFolderId: Id<"documentFolders">) => {
    e.preventDefault();
    e.stopPropagation();
    const data = e.dataTransfer.getData("text/plain");

    if (data.startsWith("doc:")) {
      // Moving a document
      const docId = data.replace("doc:", "") as Id<"documents">;
      try {
        await moveDocumentToFolder({
          documentId: docId,
          folderId: targetFolderId,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to move document");
      }
    } else if (data.startsWith("folder:")) {
      // Moving a folder
      const folderId = data.replace("folder:", "") as Id<"documentFolders">;
      if (folderId !== targetFolderId) {
        try {
          await moveFolder({
            folderId: folderId,
            parentFolderId: targetFolderId,
          });
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to move folder");
        }
      }
    }

    setDraggedDocId(null);
    setDraggedFolderId(null);
    setDropTargetFolderId(null);
  };

  // Use archived, folder, or root documents based on view
  const sourceDocuments = showArchived
    ? archivedDocuments
    : currentFolderId
      ? folderDocuments
      : documents;

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
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 mb-1">
                <button
                  onClick={handleBackToRoot}
                  className={`text-xl sm:text-2xl font-bold transition-colors ${
                    currentFolderId
                      ? isDark ? "text-slate-400 hover:text-cyan-400" : "text-gray-500 hover:text-blue-600"
                      : isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  Doc Hub
                </button>
                {currentFolder && (
                  <>
                    <span className={isDark ? "text-slate-500" : "text-gray-400"}>/</span>
                    <span className={`text-xl sm:text-2xl font-bold flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                      {currentFolder.isProtected && (
                        <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      )}
                      {currentFolder.name}
                    </span>
                  </>
                )}
                {showArchived && <span className="text-amber-500 text-xl sm:text-2xl font-bold">(Archived)</span>}
              </div>
              <p className={`text-xs sm:text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                {showArchived
                  ? "Manage archived documents"
                  : currentFolder
                    ? currentFolder.description || `${currentFolder.documentCount} document${currentFolder.documentCount !== 1 ? "s" : ""}`
                    : "Frequently used documents and forms"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* How To button */}
              <button
                onClick={() => setShowHowToModal(true)}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${isDark ? "bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-slate-300" : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"}`}
                title="How to use Doc Hub"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="hidden sm:inline">Help</span>
              </button>
              {/* Back button when in folder */}
              {currentFolderId && (
                <button
                  onClick={handleBackToRoot}
                  className={`px-3 sm:px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${isDark ? "bg-slate-700 text-slate-300 hover:bg-slate-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  <span className="hidden sm:inline">Back</span>
                </button>
              )}
              {isAdmin && !currentFolderId && (
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
                    setShowFolderModal(true);
                    setEditingFolderId(null);
                    setFolderFormData({ name: "", description: "", password: "", isProtected: false, visibility: "private" });
                  }}
                  className={`px-3 sm:px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${isDark ? "bg-slate-700 text-slate-300 hover:bg-slate-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  </svg>
                  <span className="hidden sm:inline">{currentFolderId ? "New Subfolder" : "New Folder"}</span>
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

          {/* My Folders Section - User's own folders */}
          {!showArchived && myFolders && myFolders.length > 0 && (
            <div className="mb-6">
              <h2 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                My Folders
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {myFolders.map((folder) => {
                  const isDraggingThisFolder = draggedFolderId === folder._id;
                  return (
                  <div
                    key={folder._id}
                    draggable
                    onDragStart={(e) => handleFolderDragStart(e, folder._id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => handleOpenFolder(folder)}
                    onDragOver={(e) => handleFolderDragOver(e, folder._id)}
                    onDragLeave={handleFolderDragLeave}
                    onDrop={(e) => handleFolderDrop(e, folder._id)}
                    className={`border rounded-xl p-4 cursor-pointer transition-all hover:scale-[1.02] ${
                      isDraggingThisFolder
                        ? "opacity-50 scale-95"
                        : dropTargetFolderId === folder._id
                          ? isDark
                            ? "bg-cyan-500/20 border-cyan-500 scale-[1.02]"
                            : "bg-blue-50 border-blue-500 scale-[1.02]"
                          : isDark
                            ? "bg-slate-800/50 border-slate-700 hover:border-cyan-500/50"
                            : "bg-white border-gray-200 shadow-sm hover:border-blue-500/50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`text-2xl p-2 rounded-lg ${isDark ? "bg-slate-700" : "bg-gray-100"}`}>
                        {folder.isProtected ? (
                          <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        ) : (
                          <svg className={`w-6 h-6 ${isDark ? "text-cyan-400" : "text-blue-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-semibold truncate ${isDark ? "text-white" : "text-gray-900"}`}>
                          {folder.name}
                        </h3>
                        <p className={`text-xs mt-0.5 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                          {folder.documentCount} document{folder.documentCount !== 1 ? "s" : ""}
                        </p>
                        {folder.description && (
                          <p className={`text-sm mt-1 line-clamp-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                            {folder.description}
                          </p>
                        )}
                      </div>
                    </div>
                    {/* Folder actions */}
                    <div className="flex gap-2 mt-3 pt-3 border-t border-slate-700/50" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleEditFolder(folder)}
                        className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${isDark ? "bg-slate-700 text-slate-300 hover:bg-slate-600" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                      >
                        Edit
                      </button>
                      {/* Share button - only for protected folders and admins */}
                      {folder.isProtected && isAdmin && (
                        <button
                          onClick={() => {
                            setShareFolderId(folder._id);
                            setShowShareFolderModal(true);
                            setSelectedUserToShare(null);
                          }}
                          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1 ${isDark ? "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30" : "bg-blue-100 text-blue-600 hover:bg-blue-200"}`}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                          </svg>
                          Share
                        </button>
                      )}
                      <button
                        onClick={() => handleArchiveFolder(folder._id)}
                        className="px-3 py-1.5 text-xs font-medium rounded transition-colors bg-red-500/10 text-red-400 hover:bg-red-500/20"
                      >
                        Archive
                      </button>
                    </div>
                  </div>
                )})}
              </div>
            </div>
          )}

          {/* Shared With Me Section - show at root level only */}
          {!showArchived && !currentFolderId && sharedFoldersWithMe && sharedFoldersWithMe.length > 0 && (
            <div className="mb-6">
              <h2 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Shared With Me
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {sharedFoldersWithMe.filter((f): f is NonNullable<typeof f> => f !== null).map((folder) => (
                  <div
                    key={folder._id}
                    onClick={() => handleOpenFolder({ ...folder, subfolderCount: 0 } as NonNullable<typeof folders>[0], true)}
                    className={`border rounded-xl p-4 cursor-pointer transition-all hover:scale-[1.02] ${
                      isDark
                        ? "bg-slate-800/50 border-slate-700 hover:border-cyan-500/50"
                        : "bg-white border-gray-200 shadow-sm hover:border-blue-500/50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`text-2xl p-2 rounded-lg ${isDark ? "bg-cyan-500/20" : "bg-blue-100"}`}>
                        <svg className="w-6 h-6 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-semibold truncate flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                          {folder.name}
                          <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </h3>
                        <p className={`text-xs mt-0.5 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                          {folder.documentCount} document{folder.documentCount !== 1 ? "s" : ""}
                        </p>
                        <p className={`text-xs mt-1 ${isDark ? "text-cyan-400/70" : "text-blue-500"}`}>
                          Shared by {folder.grantedByUserName}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Community Folders Section - Public folders visible to all */}
          {!showArchived && !currentFolderId && communityFolders && communityFolders.length > 0 && (
            <div className="mb-6">
              <h2 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Community
                <span className={`text-xs font-normal ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                  (Public folders for all users)
                </span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {communityFolders.map((folder) => (
                  <div
                    key={folder._id}
                    onClick={() => handleOpenFolder(folder as NonNullable<typeof folders>[0])}
                    className={`border rounded-xl p-4 cursor-pointer transition-all hover:scale-[1.02] ${
                      isDark
                        ? "bg-slate-800/50 border-slate-700 hover:border-emerald-500/50"
                        : "bg-white border-gray-200 shadow-sm hover:border-green-500/50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`text-2xl p-2 rounded-lg ${isDark ? "bg-emerald-500/20" : "bg-green-100"}`}>
                        <svg className={`w-6 h-6 ${isDark ? "text-emerald-400" : "text-green-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-semibold truncate ${isDark ? "text-white" : "text-gray-900"}`}>
                          {folder.name}
                        </h3>
                        <p className={`text-xs mt-0.5 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                          {folder.documentCount} document{folder.documentCount !== 1 ? "s" : ""}
                        </p>
                        {folder.description && (
                          <p className={`text-sm mt-1 line-clamp-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                            {folder.description}
                          </p>
                        )}
                        <p className={`text-xs mt-1 ${isDark ? "text-emerald-400/70" : "text-green-600"}`}>
                          Created by {folder.createdByName}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Loading state for folder documents */}
          {loadingFolderDocs && (
            <div className="flex items-center justify-center py-12">
              <svg className="w-8 h-8 animate-spin text-cyan-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          )}

          {/* Category Filters */}
          {!loadingFolderDocs && (
            <div className="flex flex-wrap gap-2 mb-6">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  selectedCategory === null
                    ? isDark ? "bg-cyan-500 text-white" : "bg-blue-600 text-white"
                    : isDark ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                All ({sourceDocuments?.length || 0})
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
                  {cat.label} ({currentFolderId ? sourceDocuments?.filter(d => d.category === cat.value).length || 0 : categoryCounts?.[cat.value] || 0})
                </button>
              ))}
            </div>
          )}

          {/* Documents Grid */}
          {!loadingFolderDocs && (!filteredDocuments || filteredDocuments.length === 0) ? (
            <div className={`text-center py-12 border rounded-xl ${isDark ? "bg-slate-800/50 border-slate-700 text-slate-400" : "bg-white border-gray-200 text-gray-500"}`}>
              <div className="text-4xl mb-3">{showArchived ? "📦" : currentFolderId ? "📁" : "📄"}</div>
              <p>
                {showArchived
                  ? "No archived documents."
                  : currentFolderId
                    ? "This folder is empty. Upload a document to get started."
                    : "No documents yet. Upload your first document to get started."}
              </p>
            </div>
          ) : !loadingFolderDocs && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredDocuments?.map((doc) => {
                const category = CATEGORIES.find((c) => c.value === doc.category);
                const previewable = canPreview(doc.fileType);
                const isDragging = draggedDocId === doc._id;
                return (
                  <div
                    key={doc._id}
                    draggable={!currentFolderId && !showArchived}
                    onDragStart={(e) => handleDragStart(e, doc._id)}
                    onDragEnd={handleDragEnd}
                    className={`border rounded-xl p-4 transition-all ${
                      isDragging
                        ? "opacity-50 scale-95"
                        : ""
                    } ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm"} ${
                      previewable ? "cursor-pointer hover:border-cyan-500/50" : ""
                    } ${!currentFolderId && !showArchived ? "cursor-grab active:cursor-grabbing" : ""}`}
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

        {/* Password Modal for Protected Folders */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`border rounded-xl p-4 sm:p-6 w-full max-w-sm ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                  Enter Password
                </h2>
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordModalFolderId(null);
                    setFolderPassword("");
                    setPasswordError("");
                  }}
                  className={`p-2 rounded-lg transition-colors ${isDark ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-100 text-gray-500"}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className={`flex items-center gap-3 p-3 rounded-lg mb-4 ${isDark ? "bg-slate-700/50" : "bg-gray-50"}`}>
                <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <p className={`text-sm ${isDark ? "text-slate-300" : "text-gray-600"}`}>
                  This folder is password protected. Enter the password to view its contents.
                </p>
              </div>

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                    Password
                  </label>
                  <input
                    type="password"
                    value={folderPassword}
                    onChange={(e) => {
                      setFolderPassword(e.target.value);
                      setPasswordError("");
                    }}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none ${isDark ? "bg-slate-900/50 border-slate-600 text-white focus:border-cyan-500" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500"}`}
                    placeholder="Enter folder password"
                    autoFocus
                  />
                  {passwordError && (
                    <p className="text-red-400 text-sm mt-2">{passwordError}</p>
                  )}
                </div>

                <button
                  type="submit"
                  className={`w-full px-4 py-3 font-medium rounded-lg transition-colors ${isDark ? "bg-cyan-500 text-white hover:bg-cyan-600" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                >
                  Unlock Folder
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Folder Create/Edit Modal */}
        {showFolderModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`border rounded-xl p-4 sm:p-6 w-full max-w-md ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                  {editingFolderId ? "Edit Folder" : "Create Folder"}
                </h2>
                <button
                  onClick={() => {
                    setShowFolderModal(false);
                    setEditingFolderId(null);
                    setFolderFormData({ name: "", description: "", password: "", isProtected: false, visibility: "private" });
                  }}
                  className={`p-2 rounded-lg transition-colors ${isDark ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-100 text-gray-500"}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={editingFolderId ? handleUpdateFolder : handleCreateFolder} className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                    Folder Name *
                  </label>
                  <input
                    type="text"
                    value={folderFormData.name}
                    onChange={(e) => setFolderFormData({ ...folderFormData, name: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none ${isDark ? "bg-slate-900/50 border-slate-600 text-white focus:border-cyan-500" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500"}`}
                    required
                    placeholder="e.g., HR Documents"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                    Description
                  </label>
                  <textarea
                    value={folderFormData.description}
                    onChange={(e) => setFolderFormData({ ...folderFormData, description: e.target.value })}
                    rows={2}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none resize-none ${isDark ? "bg-slate-900/50 border-slate-600 text-white focus:border-cyan-500" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500"}`}
                    placeholder="Brief description of this folder..."
                  />
                </div>

                {/* Visibility selector - only admins can create community folders */}
                {isAdmin && (
                  <div className={`p-4 rounded-lg border ${isDark ? "bg-slate-700/30 border-slate-600" : "bg-gray-50 border-gray-200"}`}>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                      Folder Visibility
                    </label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setFolderFormData({ ...folderFormData, visibility: "private" })}
                        className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all flex items-center gap-2 ${
                          folderFormData.visibility === "private"
                            ? isDark ? "border-cyan-500 bg-cyan-500/10" : "border-blue-500 bg-blue-50"
                            : isDark ? "border-slate-600 hover:border-slate-500" : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <svg className={`w-5 h-5 ${folderFormData.visibility === "private" ? (isDark ? "text-cyan-400" : "text-blue-600") : (isDark ? "text-slate-400" : "text-gray-500")}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <div className="text-left">
                          <p className={`font-medium text-sm ${isDark ? "text-white" : "text-gray-900"}`}>Private</p>
                          <p className={`text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>Only you can see</p>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFolderFormData({ ...folderFormData, visibility: "community" })}
                        className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all flex items-center gap-2 ${
                          folderFormData.visibility === "community"
                            ? isDark ? "border-emerald-500 bg-emerald-500/10" : "border-green-500 bg-green-50"
                            : isDark ? "border-slate-600 hover:border-slate-500" : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <svg className={`w-5 h-5 ${folderFormData.visibility === "community" ? (isDark ? "text-emerald-400" : "text-green-600") : (isDark ? "text-slate-400" : "text-gray-500")}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <div className="text-left">
                          <p className={`font-medium text-sm ${isDark ? "text-white" : "text-gray-900"}`}>Community</p>
                          <p className={`text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>Visible to all users</p>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {/* Password protection toggle - only for new folders and only admins can create protected folders */}
                {!editingFolderId && isAdmin && (
                  <div className={`p-4 rounded-lg border ${isDark ? "bg-slate-700/30 border-slate-600" : "bg-gray-50 border-gray-200"}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>Password Protection</p>
                        <p className={`text-xs mt-0.5 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                          Require password to view documents
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFolderFormData({ ...folderFormData, isProtected: !folderFormData.isProtected, password: "" })}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          folderFormData.isProtected
                            ? isDark ? "bg-amber-500" : "bg-amber-600"
                            : isDark ? "bg-slate-600" : "bg-gray-300"
                        }`}
                      >
                        <span
                          className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                            folderFormData.isProtected ? "translate-x-7" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    {folderFormData.isProtected && (
                      <div className="mt-4">
                        <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                          Folder Password *
                        </label>
                        <input
                          type="password"
                          value={folderFormData.password}
                          onChange={(e) => setFolderFormData({ ...folderFormData, password: e.target.value })}
                          className={`w-full px-4 py-3 border rounded-lg focus:outline-none ${isDark ? "bg-slate-900/50 border-slate-600 text-white focus:border-cyan-500" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500"}`}
                          placeholder="Enter a secure password"
                          required={folderFormData.isProtected}
                        />
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowFolderModal(false);
                      setEditingFolderId(null);
                      setFolderFormData({ name: "", description: "", password: "", isProtected: false, visibility: "private" });
                    }}
                    className={`flex-1 px-4 py-3 font-medium rounded-lg transition-colors ${isDark ? "bg-slate-700 text-white hover:bg-slate-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!folderFormData.name || (folderFormData.isProtected && !folderFormData.password)}
                    className={`flex-1 px-4 py-3 font-medium rounded-lg transition-colors disabled:opacity-50 ${isDark ? "bg-cyan-500 text-white hover:bg-cyan-600" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                  >
                    {editingFolderId ? "Update Folder" : "Create Folder"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Folder Sharing Modal */}
        {showShareFolderModal && shareFolderId && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`border rounded-xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                  Share Protected Folder
                </h2>
                <button
                  onClick={() => {
                    setShowShareFolderModal(false);
                    setShareFolderId(null);
                    setSelectedUserToShare(null);
                  }}
                  className={`p-2 rounded-lg transition-colors ${isDark ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-100 text-gray-500"}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className={`flex items-center gap-3 p-3 rounded-lg mb-4 ${isDark ? "bg-slate-700/50" : "bg-gray-50"}`}>
                <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <div>
                  <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                    {folders?.find(f => f._id === shareFolderId)?.name || "Protected Folder"}
                  </p>
                  <p className={`text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    Grant users access without needing the password
                  </p>
                </div>
              </div>

              {/* Grant Access Section */}
              <div className="mb-6">
                <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                  Add User
                </label>
                <div className="space-y-2">
                  <select
                    value={selectedUserToShare || ""}
                    onChange={(e) => setSelectedUserToShare(e.target.value as Id<"users"> | null)}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none ${isDark ? "bg-slate-900/50 border-slate-600 text-white focus:border-cyan-500" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500"}`}
                  >
                    <option value="">Select a user...</option>
                    {usersForSharing
                      ?.filter(u => u._id !== user?._id && !folderAccessGrants?.some(g => g.grantedToUserId === u._id))
                      .map(u => (
                        <option key={u._id} value={u._id}>
                          {u.name} ({u.email})
                        </option>
                      ))
                    }
                  </select>
                  <button
                    onClick={async () => {
                      if (!selectedUserToShare || !user) return;
                      setSharingInProgress(true);
                      try {
                        const selectedUser = usersForSharing?.find(u => u._id === selectedUserToShare);
                        await grantFolderAccess({
                          folderId: shareFolderId,
                          grantedToUserId: selectedUserToShare,
                          grantedToUserName: selectedUser?.name || "User",
                          grantedByUserId: user._id,
                          grantedByUserName: user.name,
                        });
                        setSelectedUserToShare(null);
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "Failed to grant access");
                      } finally {
                        setSharingInProgress(false);
                      }
                    }}
                    disabled={!selectedUserToShare || sharingInProgress}
                    className={`w-full px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${isDark ? "bg-cyan-500 text-white hover:bg-cyan-600" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                  >
                    {sharingInProgress ? "Adding..." : "Add User"}
                  </button>
                </div>
              </div>

              {/* Current Access Grants */}
              <div>
                <h3 className={`text-sm font-medium mb-3 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                  Users with Access
                </h3>
                {folderAccessGrants && folderAccessGrants.length > 0 ? (
                  <div className="space-y-2">
                    {folderAccessGrants.map(grant => (
                      <div
                        key={grant._id}
                        className={`flex items-center justify-between p-3 rounded-lg ${isDark ? "bg-slate-700/50" : "bg-gray-50"}`}
                      >
                        <div>
                          <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                            {grant.grantedToUserName}
                          </p>
                          <p className={`text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                            Shared by {grant.grantedByUserName} · {new Date(grant.grantedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={async () => {
                            if (!user) return;
                            setSharingInProgress(true);
                            try {
                              await revokeFolderAccess({
                                grantId: grant._id,
                                revokedByUserId: user._id,
                              });
                            } catch (err) {
                              setError(err instanceof Error ? err.message : "Failed to revoke access");
                            } finally {
                              setSharingInProgress(false);
                            }
                          }}
                          disabled={sharingInProgress}
                          className="px-3 py-1.5 text-xs font-medium rounded transition-colors bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                        >
                          Revoke
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={`text-center py-6 border rounded-lg ${isDark ? "border-slate-700 text-slate-500" : "border-gray-200 text-gray-400"}`}>
                    <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <p className="text-sm">No users have been granted access</p>
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  setShowShareFolderModal(false);
                  setShareFolderId(null);
                  setSelectedUserToShare(null);
                }}
                className={`w-full mt-6 px-4 py-3 font-medium rounded-lg transition-colors ${isDark ? "bg-slate-700 text-white hover:bg-slate-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* How To Modal */}
        {showHowToModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`border rounded-xl p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-xl font-semibold flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                  <svg className="w-6 h-6 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  How to Use Doc Hub
                </h2>
                <button
                  onClick={() => setShowHowToModal(false)}
                  className={`p-2 rounded-lg transition-colors ${isDark ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-100 text-gray-500"}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* Folder Types Section */}
                <div>
                  <h3 className={`text-lg font-semibold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
                    Folder Types
                  </h3>
                  <div className="space-y-3">
                    <div className={`p-4 rounded-lg ${isDark ? "bg-slate-700/50" : "bg-gray-50"}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <svg className={`w-5 h-5 ${isDark ? "text-cyan-400" : "text-blue-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                        <span className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>My Folders</span>
                      </div>
                      <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                        Folders you create. Only you can see and access these folders unless you share them with others.
                      </p>
                    </div>
                    <div className={`p-4 rounded-lg ${isDark ? "bg-slate-700/50" : "bg-gray-50"}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-5 h-5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                        <span className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>Shared With Me</span>
                      </div>
                      <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                        Folders that others have shared with you. You can view the contents without needing a password.
                      </p>
                    </div>
                    <div className={`p-4 rounded-lg ${isDark ? "bg-slate-700/50" : "bg-gray-50"}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <svg className={`w-5 h-5 ${isDark ? "text-emerald-400" : "text-green-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <span className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>Community</span>
                      </div>
                      <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                        Public folders visible to everyone. Great for company policies, handbooks, and shared resources.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Password Protection Section */}
                <div>
                  <h3 className={`text-lg font-semibold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
                    Password Protection
                  </h3>
                  <div className={`p-4 rounded-lg ${isDark ? "bg-amber-500/10 border border-amber-500/30" : "bg-amber-50 border border-amber-200"}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <span className={`font-medium ${isDark ? "text-amber-300" : "text-amber-700"}`}>Protected Folders</span>
                    </div>
                    <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                      Folders marked with a lock icon require a password to access. Use these for sensitive or confidential documents. Once unlocked, you can access the folder until you close your browser session.
                    </p>
                  </div>
                </div>

                {/* Common Actions Section */}
                <div>
                  <h3 className={`text-lg font-semibold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
                    Common Actions
                  </h3>
                  <div className={`divide-y ${isDark ? "divide-slate-700" : "divide-gray-200"}`}>
                    <div className="py-3">
                      <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>Create a Folder</p>
                      <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                        Click the &quot;New Folder&quot; button in the header. Choose visibility (Private or Community) and optionally add password protection.
                      </p>
                    </div>
                    <div className="py-3">
                      <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>Upload Documents</p>
                      <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                        Click &quot;Upload Document&quot; to add files. If you&apos;re inside a folder, the document will be added to that folder.
                      </p>
                    </div>
                    <div className="py-3">
                      <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>Share a Folder</p>
                      <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                        Click the &quot;Share&quot; button on a protected folder to grant specific users access without needing the password.
                      </p>
                    </div>
                    <div className="py-3">
                      <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>Move Documents</p>
                      <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                        Drag and drop documents onto folders to move them. You can also drag folders into other folders to create nested structures.
                      </p>
                    </div>
                    <div className="py-3">
                      <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>Search & Filter</p>
                      <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                        Use the search bar to find documents by name. Use category filters to narrow down results.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tips Section */}
                <div className={`p-4 rounded-lg ${isDark ? "bg-cyan-500/10 border border-cyan-500/30" : "bg-blue-50 border border-blue-200"}`}>
                  <h4 className={`font-medium mb-2 ${isDark ? "text-cyan-300" : "text-blue-700"}`}>Tips</h4>
                  <ul className={`text-sm space-y-1 ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                    <li>• Use descriptive folder names for easy organization</li>
                    <li>• Password-protect folders containing sensitive information</li>
                    <li>• Community folders are great for company-wide resources</li>
                    <li>• Share protected folders with specific users for HIPAA compliance</li>
                  </ul>
                </div>
              </div>

              <button
                onClick={() => setShowHowToModal(false)}
                className={`w-full mt-6 px-4 py-3 font-medium rounded-lg transition-colors ${isDark ? "bg-cyan-500 text-white hover:bg-cyan-600" : "bg-blue-600 text-white hover:bg-blue-700"}`}
              >
                Got it!
              </button>
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
