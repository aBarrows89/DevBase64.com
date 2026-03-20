"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
  const uploadNewVersion = useMutation(api.documents.uploadNewVersion);
  const restoreVersionMutation = useMutation(api.documents.restoreVersion);
  const setExpiration = useMutation(api.documents.setExpiration);
  const removeExpirationMutation = useMutation(api.documents.removeExpiration);
  const expiringDocuments = useQuery(api.documents.getExpiring, { days: 90 });

  // Template APIs
  const templatesList = useQuery(api.documentTemplates.list, {});
  const createTemplate = useMutation(api.documentTemplates.create);
  const createTemplateFromUpload = useMutation(api.documentTemplates.createFromUpload);
  const useTemplateMutation = useMutation(api.documentTemplates.useTemplate);
  const archiveTemplate = useMutation(api.documentTemplates.archive);
  const generateTemplateUploadUrl = useMutation(api.documentTemplates.generateUploadUrl);

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

  // Folder ordering APIs
  const folderOrders = useQuery(
    api.documentFolders.getAllFolderOrders,
    user ? { userId: user._id } : "skip"
  );
  const saveFolderOrder = useMutation(api.documentFolders.saveFolderOrder);

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

  // Folder reordering state
  const [reorderingSection, setReorderingSection] = useState<string | null>(null);
  const [reorderDragIndex, setReorderDragIndex] = useState<number | null>(null);
  const [reorderDropIndex, setReorderDropIndex] = useState<number | null>(null);

  // Folder sharing state
  const [showShareFolderModal, setShowShareFolderModal] = useState(false);
  const [shareFolderId, setShareFolderId] = useState<Id<"documentFolders"> | null>(null);
  const [selectedUserToShare, setSelectedUserToShare] = useState<Id<"users"> | null>(null);
  const [sharingInProgress, setSharingInProgress] = useState(false);

  // How To modal state
  const [showHowToModal, setShowHowToModal] = useState(false);

  // Version History state
  const [versionHistoryDocId, setVersionHistoryDocId] = useState<Id<"documents"> | null>(null);
  const [showUploadVersionModal, setShowUploadVersionModal] = useState(false);
  const [versionFile, setVersionFile] = useState<File | null>(null);
  const [versionChangeNotes, setVersionChangeNotes] = useState("");
  const [uploadingVersion, setUploadingVersion] = useState(false);
  const [restoringVersion, setRestoringVersion] = useState(false);
  const versionFileInputRef = useRef<HTMLInputElement>(null);

  // Template state
  const [showTemplatesView, setShowTemplatesView] = useState(false);
  const [showTemplateUploadModal, setShowTemplateUploadModal] = useState(false);
  const [showUseTemplateModal, setShowUseTemplateModal] = useState(false);
  const [showSaveAsTemplateModal, setShowSaveAsTemplateModal] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<Id<"documentTemplates"> | null>(null);
  const [saveAsTemplateDocId, setSaveAsTemplateDocId] = useState<Id<"documents"> | null>(null);
  const [templateFormData, setTemplateFormData] = useState({
    name: "",
    description: "",
    category: "templates",
  });
  const [useTemplateName, setUseTemplateName] = useState("");
  const [useTemplateFolderId, setUseTemplateFolderId] = useState<Id<"documentFolders"> | null>(null);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [uploadingTemplate, setUploadingTemplate] = useState(false);
  const [usingTemplate, setUsingTemplate] = useState(false);
  const templateFileInputRef = useRef<HTMLInputElement>(null);
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState<string | null>(null);

  // Expiration state
  const [expirationDate, setExpirationDate] = useState("");
  const [expirationAlertDays, setExpirationAlertDays] = useState("30");
  const [showExpirationModal, setShowExpirationModal] = useState(false);
  const [expirationDocId, setExpirationDocId] = useState<Id<"documents"> | null>(null);

  // E-Signature state
  const [requiresSignature, setRequiresSignature] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);
  const [signDocumentId, setSignDocumentId] = useState<Id<"documents"> | null>(null);
  const [showViewSignaturesModal, setShowViewSignaturesModal] = useState(false);
  const [viewSignaturesDocId, setViewSignaturesDocId] = useState<Id<"documents"> | null>(null);
  const [signing, setSigning] = useState(false);
  const signCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  // E-Signature APIs
  const signDocumentMutation = useMutation(api.documentSignatures.sign);
  const unsignedDocuments = useQuery(
    api.documentSignatures.getUnsignedForUser,
    user ? { userId: user._id } : "skip"
  );
  const signModalSignatures = useQuery(
    api.documentSignatures.getByDocument,
    viewSignaturesDocId ? { documentId: viewSignaturesDocId } : "skip"
  );
  const hasCurrentUserSigned = useQuery(
    api.documentSignatures.hasUserSigned,
    signDocumentId && user ? { documentId: signDocumentId, userId: user._id } : "skip"
  );

  // Search APIs
  const searchResults = useQuery(
    api.documents.search,
    searchQuery.trim() ? { query: searchQuery, category: selectedCategory || undefined } : "skip"
  );
  const folderSearchResults = useQuery(
    api.documentFolders.search,
    searchQuery.trim() ? { query: searchQuery } : "skip"
  );

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

  // Version history query
  const documentVersions = useQuery(
    api.documents.getVersions,
    versionHistoryDocId ? { documentId: versionHistoryDocId } : "skip"
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

  // Helper to get correct MIME type for file
  const getFileMimeType = (file: File): string => {
    // If browser detected a MIME type, use it (unless it's empty or generic)
    if (file.type && file.type !== "application/octet-stream") {
      return file.type;
    }

    // Fallback: determine MIME type from extension
    const ext = file.name.split(".").pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      pdf: "application/pdf",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xls: "application/vnd.ms-excel",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      txt: "text/plain",
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      gif: "image/gif",
      csv: "text/csv",
    };

    return mimeTypes[ext || ""] || "application/octet-stream";
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

      // Get the correct MIME type (some browsers don't detect Excel properly)
      const mimeType = getFileMimeType(selectedFile);

      // Upload file to Convex storage
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": mimeType },
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
      const newDocId = await createDocument({
        name: formData.name,
        description: formData.description || undefined,
        category: formData.category,
        folderId: currentFolderId || undefined,
        fileId: storageId,
        fileName: selectedFile.name,
        fileType: mimeType,
        fileSize: selectedFile.size,
        uploadedBy: user._id,
        uploadedByName: user.name,
        requiresSignature: requiresSignature || undefined,
      });

      // Set expiration if date was provided
      if (expirationDate && newDocId) {
        await setExpiration({
          documentId: newDocId,
          expiresAt: new Date(expirationDate).getTime(),
          expirationAlertDays: parseInt(expirationAlertDays) || 30,
        });
      }

      // Reset form first so modal closes
      setShowUploadModal(false);
      setSelectedFile(null);
      setFormData({ name: "", description: "", category: "forms" });
      setExpirationDate("");
      setExpirationAlertDays("30");
      setRequiresSignature(false);
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
    if (!previewUrl || !previewDocument) return;

    // For images, create a printable window
    if (previewDocument.fileType.includes("image")) {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Print - ${previewDocument.name}</title>
            <style>
              body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
              img { max-width: 100%; max-height: 100vh; object-fit: contain; }
              @media print { body { margin: 0; } img { max-width: 100%; } }
            </style>
          </head>
          <body>
            <img src="${previewUrl}" onload="window.print(); window.close();" />
          </body>
          </html>
        `);
        printWindow.document.close();
      }
    } else if (isOfficeDocument(previewDocument.fileType)) {
      // For Office documents, download and let user print from their application
      // Can't print directly from Microsoft viewer (cross-origin)
      window.open(previewUrl, "_blank");
    } else {
      // For PDFs and other documents, open in new tab and print
      const printWindow = window.open(previewUrl, "_blank");
      if (printWindow) {
        printWindow.addEventListener("load", () => {
          printWindow.print();
        });
      }
    }
  };

  const closePreview = () => {
    setPreviewDocument(null);
    setPreviewUrl(null);
  };

  // Version History handlers
  const handleUploadNewVersion = async () => {
    if (!versionFile || !versionHistoryDocId || !user) return;
    setUploadingVersion(true);
    setError("");
    try {
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": versionFile.type || "application/octet-stream" },
        body: versionFile,
      });
      const { storageId } = await result.json();

      await uploadNewVersion({
        documentId: versionHistoryDocId,
        fileId: storageId,
        fileName: versionFile.name,
        fileType: versionFile.type || "application/octet-stream",
        fileSize: versionFile.size,
        changeNotes: versionChangeNotes || undefined,
        uploadedBy: user._id,
        uploadedByName: user.name,
      });

      setShowUploadVersionModal(false);
      setVersionFile(null);
      setVersionChangeNotes("");
    } catch (err) {
      console.error("Version upload error:", err);
      setError(err instanceof Error ? err.message : "Version upload failed");
    } finally {
      setUploadingVersion(false);
    }
  };

  const handleRestoreVersion = async (versionId: Id<"documentVersions">) => {
    if (!versionHistoryDocId || !user) return;
    if (!confirm("Restore this version? The current file will be archived as a new version.")) return;
    setRestoringVersion(true);
    try {
      await restoreVersionMutation({
        documentId: versionHistoryDocId,
        versionId,
        restoredBy: user._id,
        restoredByName: user.name,
      });
    } catch (err) {
      console.error("Restore version error:", err);
      setError(err instanceof Error ? err.message : "Restore failed");
    } finally {
      setRestoringVersion(false);
    }
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

  // Drag handlers for folders (nesting mode - triggered with Option/Alt+drag)
  const handleFolderDragStart = (e: React.DragEvent, folderId: Id<"documentFolders">) => {
    e.dataTransfer.setData("text/plain", `folder:${folderId}`);
    e.dataTransfer.effectAllowed = "move";
    setDraggedFolderId(folderId);
    // Clear reorder state to ensure we're in nesting mode, not reorder mode
    setReorderingSection(null);
    setReorderDragIndex(null);
    setReorderDropIndex(null);
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
      // Moving a folder (nesting)
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

  // Folder reordering handlers (normal drag without Shift)
  const handleReorderDragStart = (e: React.DragEvent, index: number, section: string) => {
    e.dataTransfer.setData("text/plain", `reorder:${index}:${section}`);
    e.dataTransfer.effectAllowed = "move";
    setReorderDragIndex(index);
    setReorderingSection(section);
    // Clear nesting state to ensure we're in reorder mode, not nesting mode
    setDraggedFolderId(null);
    setDropTargetFolderId(null);
    e.stopPropagation();
  };

  const handleReorderDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (reorderDragIndex !== null && reorderDragIndex !== index) {
      setReorderDropIndex(index);
    }
  };

  const handleReorderDragEnd = () => {
    setReorderDragIndex(null);
    setReorderDropIndex(null);
    setReorderingSection(null);
  };

  const handleReorderDrop = async (e: React.DragEvent, dropIndex: number, section: string, folders: { _id: Id<"documentFolders"> }[]) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user || reorderDragIndex === null || reorderDragIndex === dropIndex) {
      handleReorderDragEnd();
      return;
    }

    // Create new order by moving the dragged item
    const newOrder = [...folders.map(f => f._id)];
    const [movedItem] = newOrder.splice(reorderDragIndex, 1);
    newOrder.splice(dropIndex, 0, movedItem);

    // Save the new order
    try {
      await saveFolderOrder({
        userId: user._id,
        section,
        folderIds: newOrder,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save folder order");
    }

    handleReorderDragEnd();
  };

  // Sort folders by user's saved order
  const sortFoldersByUserOrder = <T extends { _id: Id<"documentFolders"> }>(
    folders: T[] | undefined,
    section: string
  ): T[] => {
    if (!folders || folders.length === 0) return [];

    const savedOrder = folderOrders?.[section] as string[] | undefined;
    if (!savedOrder || savedOrder.length === 0) return folders;

    // Sort folders based on saved order, putting unordered ones at the end
    return [...folders].sort((a, b) => {
      const indexA = savedOrder.indexOf(a._id as string);
      const indexB = savedOrder.indexOf(b._id as string);

      // If neither is in the saved order, keep original order
      if (indexA === -1 && indexB === -1) return 0;
      // If only A is not in order, put it at the end
      if (indexA === -1) return 1;
      // If only B is not in order, put it at the end
      if (indexB === -1) return -1;
      // Both are in order, sort by their positions
      return indexA - indexB;
    });
  };

  // Template handlers
  const handleUploadTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateFile || !user) return;

    setUploadingTemplate(true);
    setError("");

    try {
      const uploadUrl = await generateTemplateUploadUrl();
      if (!uploadUrl) throw new Error("Failed to generate upload URL");

      const mimeType = getFileMimeType(templateFile);
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": mimeType },
        body: templateFile,
      });

      if (!response.ok) throw new Error(`Upload failed: ${response.status}`);

      const result = await response.json();
      const storageId = result.storageId;
      if (!storageId) throw new Error("No storage ID returned");

      await createTemplateFromUpload({
        name: templateFormData.name,
        description: templateFormData.description || undefined,
        category: templateFormData.category,
        fileId: storageId,
        fileName: templateFile.name,
        fileType: mimeType,
        fileSize: templateFile.size,
        createdBy: user._id,
        createdByName: user.name,
      });

      setShowTemplateUploadModal(false);
      setTemplateFile(null);
      setTemplateFormData({ name: "", description: "", category: "templates" });
      if (templateFileInputRef.current) templateFileInputRef.current.value = "";
    } catch (err) {
      console.error("Template upload error:", err);
      setError(err instanceof Error ? err.message : "Template upload failed");
    } finally {
      setUploadingTemplate(false);
    }
  };

  const handleSaveAsTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveAsTemplateDocId || !user) return;

    setUploadingTemplate(true);
    setError("");

    try {
      await createTemplate({
        name: templateFormData.name,
        description: templateFormData.description || undefined,
        category: templateFormData.category,
        documentId: saveAsTemplateDocId,
        createdBy: user._id,
        createdByName: user.name,
      });

      setShowSaveAsTemplateModal(false);
      setSaveAsTemplateDocId(null);
      setTemplateFormData({ name: "", description: "", category: "templates" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save as template");
    } finally {
      setUploadingTemplate(false);
    }
  };

  const handleUseTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplateId || !user) return;

    setUsingTemplate(true);
    setError("");

    try {
      await useTemplateMutation({
        templateId: selectedTemplateId,
        name: useTemplateName,
        folderId: useTemplateFolderId || undefined,
        uploadedBy: user._id,
        uploadedByName: user.name,
      });

      setShowUseTemplateModal(false);
      setSelectedTemplateId(null);
      setUseTemplateName("");
      setUseTemplateFolderId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create document from template");
    } finally {
      setUsingTemplate(false);
    }
  };

  const handleArchiveTemplate = async (templateId: Id<"documentTemplates">) => {
    if (!confirm("Are you sure you want to archive this template?")) return;
    try {
      await archiveTemplate({ templateId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive template");
    }
  };

  // Expiration handlers
  const handleSetExpiration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expirationDocId || !expirationDate) return;

    try {
      const expiresAt = new Date(expirationDate).getTime();
      await setExpiration({
        documentId: expirationDocId,
        expiresAt,
        expirationAlertDays: parseInt(expirationAlertDays) || 30,
      });
      setShowExpirationModal(false);
      setExpirationDocId(null);
      setExpirationDate("");
      setExpirationAlertDays("30");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set expiration");
    }
  };

  const handleRemoveExpiration = async (docId: Id<"documents">) => {
    try {
      await removeExpirationMutation({ documentId: docId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove expiration");
    }
  };

  // ============ E-SIGNATURE HANDLERS ============

  const initSignCanvas = useCallback(() => {
    const canvas = signCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Set canvas size to match display size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    // Fill white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
  }, []);

  const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = signCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleSignCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = signCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setIsDrawing(true);
    setHasDrawn(true);
    const point = getCanvasPoint(e);
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  };

  const handleSignCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = signCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const point = getCanvasPoint(e);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  };

  const handleSignCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(false);
  };

  const clearSignCanvas = () => {
    const canvas = signCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    setHasDrawn(false);
  };

  const handleSignDocument = async () => {
    if (!signDocumentId || !user || !signCanvasRef.current) return;
    setSigning(true);
    try {
      const signatureData = signCanvasRef.current.toDataURL("image/png");
      await signDocumentMutation({
        documentId: signDocumentId,
        userId: user._id,
        signatureData,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      });
      setShowSignModal(false);
      setSignDocumentId(null);
      setHasDrawn(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign document");
    } finally {
      setSigning(false);
    }
  };

  const openSignModal = (docId: Id<"documents">) => {
    setSignDocumentId(docId);
    setShowSignModal(true);
    setHasDrawn(false);
    // Initialize canvas after modal renders
    setTimeout(() => initSignCanvas(), 100);
  };

  const getExpirationStatus = (doc: { expiresAt?: number; expirationAlertDays?: number }) => {
    if (!doc.expiresAt) return null;
    const now = Date.now();
    const alertDays = doc.expirationAlertDays ?? 30;
    const alertTime = doc.expiresAt - alertDays * 24 * 60 * 60 * 1000;

    if (now >= doc.expiresAt) return "expired";
    if (now >= alertTime) return "expiring_soon";
    return "active";
  };

  const filteredTemplates = templatesList?.filter((t) => {
    if (templateCategoryFilter && t.category !== templateCategoryFilter) return false;
    return true;
  });

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
              {!showArchived && !currentFolderId && (
                <button
                  onClick={() => setShowTemplatesView(!showTemplatesView)}
                  className={`px-3 sm:px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                    showTemplatesView
                      ? isDark ? "bg-purple-500 text-white hover:bg-purple-600" : "bg-purple-600 text-white hover:bg-purple-700"
                      : isDark ? "bg-slate-700 text-slate-300 hover:bg-slate-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                  <span className="hidden sm:inline">Templates</span>
                  {templatesList && templatesList.length > 0 && (
                    <span className={`px-1.5 py-0.5 text-xs rounded-full ${showTemplatesView ? "bg-white/20" : isDark ? "bg-purple-500/30 text-purple-300" : "bg-purple-100 text-purple-700"}`}>
                      {templatesList.length}
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
                    setExpirationDate("");
                    setExpirationAlertDays("30");
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

          {/* Search Results - shown when search query is active */}
          {searchQuery.trim() ? (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className={`text-sm font-semibold flex items-center gap-2 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Search Results
                  {searchResults && folderSearchResults && (
                    <span className={`text-xs font-normal ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                      ({(folderSearchResults?.length || 0) + (searchResults?.length || 0)} found)
                    </span>
                  )}
                </h2>
                <button
                  onClick={() => setSearchQuery("")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${isDark ? "bg-slate-700 text-slate-300 hover:bg-slate-600" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                >
                  Clear search
                </button>
              </div>
              {folderSearchResults && folderSearchResults.length > 0 && (
                <div className="mb-4">
                  <h3 className={`text-xs font-medium mb-2 uppercase tracking-wider ${isDark ? "text-slate-500" : "text-gray-400"}`}>Folders</h3>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {folderSearchResults.map((folder) => (
                      <div
                        key={folder._id}
                        onClick={() => { setSearchQuery(""); handleOpenFolder(folder as any); }}
                        className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${isDark ? "bg-slate-800/50 border-slate-700 hover:border-cyan-500/50" : "bg-white border-gray-200 shadow-sm hover:border-blue-400"}`}
                      >
                        <div className={`p-2 rounded-lg ${isDark ? "bg-slate-700" : "bg-gray-100"}`}>
                          <svg className={`w-5 h-5 ${isDark ? "text-cyan-400" : "text-blue-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <p className={`font-medium truncate ${isDark ? "text-white" : "text-gray-900"}`}>{folder.name}</p>
                          {folder.description && <p className={`text-xs truncate ${isDark ? "text-slate-400" : "text-gray-500"}`}>{folder.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {searchResults && searchResults.length > 0 && (
                <div>
                  <h3 className={`text-xs font-medium mb-2 uppercase tracking-wider ${isDark ? "text-slate-500" : "text-gray-400"}`}>Documents</h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {searchResults.map((doc) => {
                      const category = CATEGORIES.find((c) => c.value === doc.category);
                      const previewable = canPreview(doc.fileType);
                      return (
                        <div key={doc._id} className={`border rounded-xl p-4 transition-all ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm"} ${previewable ? "cursor-pointer hover:border-cyan-500/50" : ""}`} onClick={previewable ? () => handlePreview(doc) : undefined}>
                          <div className="flex items-start gap-3">
                            <div className={`text-2xl p-2 rounded-lg ${isDark ? "bg-slate-700" : "bg-gray-100"}`}>{category?.icon || "📄"}</div>
                            <div className="flex-1 min-w-0">
                              <h3 className={`font-semibold truncate ${isDark ? "text-white" : "text-gray-900"}`}>{doc.name}</h3>
                              <p className={`text-xs mt-0.5 ${isDark ? "text-slate-500" : "text-gray-400"}`}>{doc.fileName}</p>
                              {doc.description && <p className={`text-sm mt-1 line-clamp-2 ${isDark ? "text-slate-400" : "text-gray-500"}`}>{doc.description}</p>}
                            </div>
                          </div>
                          <div className={`flex items-center gap-3 mt-3 text-xs ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                            <span className={`px-2 py-0.5 rounded ${isDark ? "bg-slate-700" : "bg-gray-100"}`}>{category?.label}</span>
                            <span>{formatFileSize(doc.fileSize)}</span>
                            {doc.folderId && <span className={`px-2 py-0.5 rounded ${isDark ? "bg-cyan-500/10 text-cyan-400" : "bg-blue-50 text-blue-600"}`}>In folder</span>}
                          </div>
                          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-700/50" onClick={(e) => e.stopPropagation()}>
                            {previewable && <button onClick={() => handlePreview(doc)} className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center justify-center gap-1 ${isDark ? "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30" : "bg-purple-100 text-purple-600 hover:bg-purple-200"}`}>Preview</button>}
                            <button onClick={() => handleDownload(doc)} className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center justify-center gap-1 ${isDark ? "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30" : "bg-blue-100 text-blue-600 hover:bg-blue-200"}`}>Download</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {searchResults && folderSearchResults && searchResults.length === 0 && folderSearchResults.length === 0 && (
                <div className={`text-center py-12 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                  <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  <p className="font-medium">No results found</p>
                  <p className="text-sm mt-1">Try a different search term</p>
                </div>
              )}
              {(!searchResults || !folderSearchResults) && (
                <div className={`text-center py-8 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                  <svg className="w-6 h-6 animate-spin mx-auto mb-2" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  <p className="text-sm">Searching...</p>
                </div>
              )}
            </div>
          ) : (<>
          {/* Needs Your Signature Alert */}
          {!showArchived && !showTemplatesView && unsignedDocuments && unsignedDocuments.length > 0 && !currentFolderId && (
            <div className={`mb-6 border rounded-xl p-4 ${isDark ? "bg-blue-500/5 border-blue-500/30" : "bg-blue-50 border-blue-200"}`}>
              <h2 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${isDark ? "text-blue-400" : "text-blue-700"}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Needs Your Signature ({unsignedDocuments.length})
              </h2>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {unsignedDocuments.map((doc) => (
                  <div
                    key={doc._id}
                    className={`flex items-center gap-3 p-3 rounded-lg ${isDark ? "bg-slate-800/80" : "bg-white"}`}
                  >
                    <div className="px-2 py-1 text-xs font-medium rounded-full bg-blue-500/20 text-blue-400">
                      Sign
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isDark ? "text-white" : "text-gray-900"}`}>{doc.name}</p>
                      <p className={`text-xs ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                        {doc.signatureCount || 0} signed
                      </p>
                    </div>
                    <button
                      onClick={() => openSignModal(doc._id)}
                      className={`text-xs px-3 py-1.5 rounded font-medium ${isDark ? "bg-blue-500 text-white hover:bg-blue-600" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                    >
                      Sign Now
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expiring Documents Alert */}
          {!showArchived && !showTemplatesView && expiringDocuments && expiringDocuments.length > 0 && !currentFolderId && (
            <div className={`mb-6 border rounded-xl p-4 ${isDark ? "bg-amber-500/5 border-amber-500/30" : "bg-amber-50 border-amber-200"}`}>
              <h2 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${isDark ? "text-amber-400" : "text-amber-700"}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Expiring Documents ({expiringDocuments.length})
              </h2>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {expiringDocuments.map((doc) => {
                  const status = getExpirationStatus(doc);
                  const daysLeft = doc.expiresAt ? Math.ceil((doc.expiresAt - Date.now()) / (24 * 60 * 60 * 1000)) : 0;
                  return (
                    <div
                      key={doc._id}
                      className={`flex items-center gap-3 p-3 rounded-lg ${isDark ? "bg-slate-800/80" : "bg-white"}`}
                    >
                      <div className={`px-2 py-1 text-xs font-medium rounded-full ${
                        status === "expired"
                          ? "bg-red-500/20 text-red-400"
                          : "bg-amber-500/20 text-amber-400"
                      }`}>
                        {status === "expired" ? "Expired" : `${daysLeft}d left`}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isDark ? "text-white" : "text-gray-900"}`}>{doc.name}</p>
                        <p className={`text-xs ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                          {doc.expiresAt ? new Date(doc.expiresAt).toLocaleDateString() : ""}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setExpirationDocId(doc._id);
                          setExpirationDate(doc.expiresAt ? new Date(doc.expiresAt).toISOString().split("T")[0] : "");
                          setExpirationAlertDays(String(doc.expirationAlertDays ?? 30));
                          setShowExpirationModal(true);
                        }}
                        className={`text-xs px-2 py-1 rounded ${isDark ? "bg-slate-700 text-slate-300 hover:bg-slate-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                      >
                        Edit
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Templates View */}
          {showTemplatesView && !showArchived && !currentFolderId && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-lg font-semibold flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                  <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                  Document Templates
                </h2>
                <button
                  onClick={() => {
                    setShowTemplateUploadModal(true);
                    setTemplateFile(null);
                    setTemplateFormData({ name: "", description: "", category: "templates" });
                  }}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${isDark ? "bg-purple-500 text-white hover:bg-purple-600" : "bg-purple-600 text-white hover:bg-purple-700"}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Upload Template
                </button>
              </div>

              {/* Template Category Filters */}
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={() => setTemplateCategoryFilter(null)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    templateCategoryFilter === null
                      ? isDark ? "bg-purple-500 text-white" : "bg-purple-600 text-white"
                      : isDark ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  All ({templatesList?.length || 0})
                </button>
                {CATEGORIES.map((cat) => {
                  const count = templatesList?.filter((t) => t.category === cat.value).length || 0;
                  if (count === 0) return null;
                  return (
                    <button
                      key={cat.value}
                      onClick={() => setTemplateCategoryFilter(cat.value)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                        templateCategoryFilter === cat.value
                          ? isDark ? "bg-purple-500 text-white" : "bg-purple-600 text-white"
                          : isDark ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      <span>{cat.icon}</span>
                      {cat.label} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Templates Grid */}
              {!filteredTemplates || filteredTemplates.length === 0 ? (
                <div className={`text-center py-12 border rounded-xl ${isDark ? "bg-slate-800/50 border-slate-700 text-slate-400" : "bg-white border-gray-200 text-gray-500"}`}>
                  <div className="text-4xl mb-3">📄</div>
                  <p>No templates yet. Upload a template or save a document as a template.</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredTemplates.map((template) => {
                    const category = CATEGORIES.find((c) => c.value === template.category);
                    return (
                      <div
                        key={template._id}
                        className={`border rounded-xl p-4 ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm"}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`text-2xl p-2 rounded-lg ${isDark ? "bg-purple-500/20" : "bg-purple-100"}`}>
                            {category?.icon || "📄"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className={`font-semibold truncate ${isDark ? "text-white" : "text-gray-900"}`}>
                              {template.name}
                            </h3>
                            <p className={`text-xs mt-0.5 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                              {template.fileName}
                            </p>
                            {template.description && (
                              <p className={`text-sm mt-1 line-clamp-2 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                                {template.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className={`flex items-center gap-3 mt-3 text-xs ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                          <span className={`px-2 py-0.5 rounded ${isDark ? "bg-purple-500/20 text-purple-400" : "bg-purple-100 text-purple-600"}`}>
                            {category?.label}
                          </span>
                          <span>{formatFileSize(template.fileSize)}</span>
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            Used {template.usageCount}x
                          </span>
                        </div>

                        <div className="flex gap-2 mt-4 pt-3 border-t border-slate-700/50">
                          <button
                            onClick={() => {
                              setSelectedTemplateId(template._id);
                              setUseTemplateName(template.name);
                              setUseTemplateFolderId(null);
                              setShowUseTemplateModal(true);
                            }}
                            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center justify-center gap-1 ${isDark ? "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30" : "bg-purple-100 text-purple-600 hover:bg-purple-200"}`}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Use Template
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleArchiveTemplate(template._id)}
                              className="px-3 py-1.5 text-xs font-medium rounded transition-colors bg-red-500/10 text-red-400 hover:bg-red-500/20"
                            >
                              Archive
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* My Folders Section - User's own folders */}
          {!showArchived && !showTemplatesView && myFolders && myFolders.length > 0 && (() => {
            const sortedMyFolders = sortFoldersByUserOrder(myFolders, "myFolders");
            return (
            <div className="mb-6">
              <h2 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                My Folders
                <span className={`text-xs font-normal ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                  (drag to reorder)
                </span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {sortedMyFolders.map((folder, index) => {
                  const isDraggingThisFolder = draggedFolderId === folder._id;
                  const isReordering = reorderingSection === "myFolders" && reorderDragIndex === index;
                  const isReorderTarget = reorderingSection === "myFolders" && reorderDropIndex === index;
                  return (
                  <div
                    key={folder._id}
                    draggable
                    onDragStart={(e) => {
                      // Use altKey (Option on Mac) for nesting - more reliable than shiftKey for drag events
                      if (e.altKey) {
                        handleFolderDragStart(e, folder._id);
                      } else {
                        handleReorderDragStart(e, index, "myFolders");
                      }
                    }}
                    onDragEnd={() => {
                      handleDragEnd();
                      handleReorderDragEnd();
                    }}
                    onClick={() => handleOpenFolder(folder)}
                    onDragOver={(e) => {
                      e.preventDefault(); // Always allow drop
                      // If we're dragging a folder for nesting (draggedFolderId is set), show drop target
                      if (draggedFolderId && draggedFolderId !== folder._id) {
                        setDropTargetFolderId(folder._id);
                      } else if (reorderingSection === "myFolders") {
                        handleReorderDragOver(e, index);
                      } else {
                        handleFolderDragOver(e, folder._id);
                      }
                    }}
                    onDragLeave={handleFolderDragLeave}
                    onDrop={(e) => {
                      const data = e.dataTransfer.getData("text/plain");
                      // Check the actual drag data to determine operation type
                      if (data.startsWith("reorder:")) {
                        handleReorderDrop(e, index, "myFolders", sortedMyFolders);
                      } else {
                        // folder: or doc: data - handle as folder drop (nesting or document move)
                        handleFolderDrop(e, folder._id);
                      }
                    }}
                    className={`border rounded-xl p-4 cursor-pointer transition-all hover:scale-[1.02] ${
                      isReordering
                        ? "opacity-50 scale-95 ring-2 ring-cyan-500"
                        : isReorderTarget
                          ? isDark
                            ? "ring-2 ring-cyan-400 bg-cyan-500/10"
                            : "ring-2 ring-blue-400 bg-blue-50"
                          : isDraggingThisFolder
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
          )})()}

          {/* Shared With Me Section - show at root level only */}
          {!showArchived && !showTemplatesView && !currentFolderId && sharedFoldersWithMe && sharedFoldersWithMe.length > 0 && (() => {
            const filteredShared = sharedFoldersWithMe.filter((f): f is NonNullable<typeof f> => f !== null);
            const sortedShared = sortFoldersByUserOrder(filteredShared, "shared");
            return (
            <div className="mb-6">
              <h2 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Shared With Me
                <span className={`text-xs font-normal ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                  (drag to reorder)
                </span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {sortedShared.map((folder, index) => {
                  const isReordering = reorderingSection === "shared" && reorderDragIndex === index;
                  const isReorderTarget = reorderingSection === "shared" && reorderDropIndex === index;
                  return (
                  <div
                    key={folder._id}
                    draggable
                    onDragStart={(e) => handleReorderDragStart(e, index, "shared")}
                    onDragEnd={handleReorderDragEnd}
                    onDragOver={(e) => reorderingSection === "shared" && handleReorderDragOver(e, index)}
                    onDrop={(e) => reorderingSection === "shared" && handleReorderDrop(e, index, "shared", sortedShared)}
                    onClick={() => handleOpenFolder({ ...folder, subfolderCount: 0 } as NonNullable<typeof folders>[0], true)}
                    className={`border rounded-xl p-4 cursor-pointer transition-all hover:scale-[1.02] ${
                      isReordering
                        ? "opacity-50 scale-95 ring-2 ring-cyan-500"
                        : isReorderTarget
                          ? isDark
                            ? "ring-2 ring-cyan-400 bg-cyan-500/10"
                            : "ring-2 ring-blue-400 bg-blue-50"
                          : isDark
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
                )})}
              </div>
            </div>
          )})()}

          {/* Community Folders Section - Public folders visible to all */}
          {!showArchived && !showTemplatesView && !currentFolderId && communityFolders && communityFolders.length > 0 && (() => {
            const sortedCommunity = sortFoldersByUserOrder(communityFolders, "community");
            return (
            <div className="mb-6">
              <h2 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Community
                <span className={`text-xs font-normal ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                  (drag to reorder)
                </span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {sortedCommunity.map((folder, index) => {
                  const isReordering = reorderingSection === "community" && reorderDragIndex === index;
                  const isReorderTarget = reorderingSection === "community" && reorderDropIndex === index;
                  return (
                  <div
                    key={folder._id}
                    draggable
                    onDragStart={(e) => handleReorderDragStart(e, index, "community")}
                    onDragEnd={handleReorderDragEnd}
                    onDragOver={(e) => reorderingSection === "community" && handleReorderDragOver(e, index)}
                    onDrop={(e) => reorderingSection === "community" && handleReorderDrop(e, index, "community", sortedCommunity)}
                    onClick={() => handleOpenFolder(folder as NonNullable<typeof folders>[0])}
                    className={`border rounded-xl p-4 cursor-pointer transition-all hover:scale-[1.02] ${
                      isReordering
                        ? "opacity-50 scale-95 ring-2 ring-emerald-500"
                        : isReorderTarget
                          ? isDark
                            ? "ring-2 ring-emerald-400 bg-emerald-500/10"
                            : "ring-2 ring-green-400 bg-green-50"
                          : isDark
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
                )})}
              </div>
            </div>
          )})()}

          {/* Loading state for folder documents */}
          {!showTemplatesView && loadingFolderDocs && (
            <div className="flex items-center justify-center py-12">
              <svg className="w-8 h-8 animate-spin text-cyan-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          )}

          {/* Category Filters */}
          {!showTemplatesView && !loadingFolderDocs && (
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
          {!showTemplatesView && !loadingFolderDocs && (!filteredDocuments || filteredDocuments.length === 0) ? (
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
          ) : !showTemplatesView && !loadingFolderDocs && (
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
                      {(() => {
                        const expStatus = getExpirationStatus(doc);
                        if (expStatus === "expired") {
                          return (
                            <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-medium">
                              Expired
                            </span>
                          );
                        }
                        if (expStatus === "expiring_soon") {
                          const daysLeft = doc.expiresAt ? Math.ceil((doc.expiresAt - Date.now()) / (24 * 60 * 60 * 1000)) : 0;
                          return (
                            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-medium">
                              Expires in {daysLeft}d
                            </span>
                          );
                        }
                        if (doc.expiresAt) {
                          return (
                            <span className={`px-2 py-0.5 rounded ${isDark ? "bg-slate-700 text-slate-400" : "bg-gray-100 text-gray-500"}`}>
                              Exp: {new Date(doc.expiresAt).toLocaleDateString()}
                            </span>
                          );
                        }
                        return null;
                      })()}
                      {doc.requiresSignature && (
                        <span className={`px-2 py-0.5 rounded flex items-center gap-1 ${isDark ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-600"}`}>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                          {doc.signatureCount || 0} signed
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
                            onClick={() => {
                              setSaveAsTemplateDocId(doc._id);
                              setTemplateFormData({ name: doc.name, description: doc.description || "", category: doc.category });
                              setShowSaveAsTemplateModal(true);
                            }}
                            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1 ${isDark ? "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30" : "bg-purple-100 text-purple-600 hover:bg-purple-200"}`}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z" />
                            </svg>
                            Template
                          </button>
                          <button
                            onClick={() => {
                              setExpirationDocId(doc._id);
                              setExpirationDate(doc.expiresAt ? new Date(doc.expiresAt).toISOString().split("T")[0] : "");
                              setExpirationAlertDays(String(doc.expirationAlertDays ?? 30));
                              setShowExpirationModal(true);
                            }}
                            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1 ${
                              doc.expiresAt
                                ? isDark ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30" : "bg-amber-100 text-amber-600 hover:bg-amber-200"
                                : isDark ? "bg-slate-700 text-slate-300 hover:bg-slate-600" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {doc.expiresAt ? "Exp" : "Expire"}
                          </button>
                          <button
                            onClick={() => setVersionHistoryDocId(doc._id)}
                            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1 ${isDark ? "bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30" : "bg-indigo-100 text-indigo-600 hover:bg-indigo-200"}`}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Versions
                          </button>
                          {doc.requiresSignature && (
                            <button
                              onClick={() => openSignModal(doc._id)}
                              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1 ${isDark ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30" : "bg-blue-100 text-blue-600 hover:bg-blue-200"}`}
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                              Sign
                            </button>
                          )}
                          {doc.requiresSignature && (doc.signatureCount || 0) > 0 && (
                            <button
                              onClick={() => {
                                setViewSignaturesDocId(doc._id);
                                setShowViewSignaturesModal(true);
                              }}
                              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1 ${isDark ? "bg-green-500/20 text-green-400 hover:bg-green-500/30" : "bg-green-100 text-green-600 hover:bg-green-200"}`}
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {doc.signatureCount} Sig{(doc.signatureCount || 0) !== 1 ? "s" : ""}
                            </button>
                          )}
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
        </>)}
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
                  onClick={() => {
                    setVersionHistoryDocId(previewDocument._id);
                  }}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${isDark ? "bg-indigo-500 text-white hover:bg-indigo-600" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Versions
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
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain,image/png,image/jpeg"
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
                          <p className={`text-xs mt-1 ${isDark ? "text-slate-500" : "text-gray-400"}`}>PDF, DOC, XLS, XLSX, CSV, TXT, Images</p>
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

                {!editingDocument && (
                  <div className={`p-4 rounded-lg border ${isDark ? "bg-slate-700/30 border-slate-600" : "bg-gray-50 border-gray-200"}`}>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                      Expiration Date (optional)
                    </label>
                    <input
                      type="date"
                      value={expirationDate}
                      onChange={(e) => setExpirationDate(e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none ${isDark ? "bg-slate-900/50 border-slate-600 text-white focus:border-cyan-500" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500"}`}
                    />
                    {expirationDate && (
                      <div className="mt-2">
                        <label className={`block text-xs font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                          Alert days before
                        </label>
                        <select
                          value={expirationAlertDays}
                          onChange={(e) => setExpirationAlertDays(e.target.value)}
                          className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none ${isDark ? "bg-slate-900/50 border-slate-600 text-white focus:border-cyan-500" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500"}`}
                        >
                          <option value="7">7 days</option>
                          <option value="14">14 days</option>
                          <option value="30">30 days</option>
                          <option value="60">60 days</option>
                          <option value="90">90 days</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {!editingDocument && (
                  <div className={`p-4 rounded-lg border ${isDark ? "bg-slate-700/30 border-slate-600" : "bg-gray-50 border-gray-200"}`}>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={requiresSignature}
                        onChange={(e) => setRequiresSignature(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <span className={`text-sm font-medium ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                          Requires Signature
                        </span>
                        <p className={`text-xs mt-0.5 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                          Users will be prompted to e-sign this document
                        </p>
                      </div>
                    </label>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUploadModal(false);
                      setEditingDocument(null);
                      setSelectedFile(null);
                      setFormData({ name: "", description: "", category: "forms" });
                      setRequiresSignature(false);
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

        {/* Version History Modal */}
        {versionHistoryDocId && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`border rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
              <div className={`flex items-center justify-between p-4 border-b ${isDark ? "border-slate-700" : "border-gray-200"}`}>
                <h2 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                  Version History
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setShowUploadVersionModal(true);
                    }}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1 ${isDark ? "bg-cyan-500 text-white hover:bg-cyan-600" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Upload New Version
                  </button>
                  <button
                    onClick={() => setVersionHistoryDocId(null)}
                    className={`p-2 rounded-lg transition-colors ${isDark ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-100 text-gray-500"}`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {!documentVersions ? (
                  <div className={`text-center py-8 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    <svg className="w-6 h-6 animate-spin mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <p className="text-sm">Loading versions...</p>
                  </div>
                ) : documentVersions.length === 0 ? (
                  <div className={`text-center py-8 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="font-medium">No version history</p>
                    <p className="text-sm mt-1">Upload a new version to start tracking changes</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {documentVersions.map((version) => (
                      <div
                        key={version._id}
                        className={`border rounded-lg p-4 ${isDark ? "bg-slate-700/50 border-slate-600" : "bg-gray-50 border-gray-200"}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded ${isDark ? "bg-indigo-500/20 text-indigo-400" : "bg-indigo-100 text-indigo-700"}`}>
                                v{version.version}
                              </span>
                              <span className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                                {version.fileName}
                              </span>
                            </div>
                            <div className={`flex items-center gap-3 mt-1.5 text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                              <span>By {version.uploadedByName}</span>
                              <span>{new Date(version.createdAt).toLocaleDateString()} {new Date(version.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                              <span>{formatFileSize(version.fileSize)}</span>
                            </div>
                            {version.changeNotes && (
                              <p className={`text-sm mt-2 ${isDark ? "text-slate-300" : "text-gray-600"}`}>
                                {version.changeNotes}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => handleRestoreVersion(version._id)}
                            disabled={restoringVersion}
                            className={`ml-3 px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1 disabled:opacity-50 ${isDark ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30" : "bg-amber-100 text-amber-600 hover:bg-amber-200"}`}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Restore
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Upload New Version Modal */}
        {showUploadVersionModal && versionHistoryDocId && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className={`border rounded-xl p-6 w-full max-w-md ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
              <h2 className={`text-lg font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
                Upload New Version
              </h2>
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                    File
                  </label>
                  <input
                    ref={versionFileInputRef}
                    type="file"
                    onChange={(e) => setVersionFile(e.target.files?.[0] || null)}
                    className={`w-full text-sm border rounded-lg p-2 ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                  />
                  {versionFile && (
                    <p className={`text-xs mt-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                      {versionFile.name} ({formatFileSize(versionFile.size)})
                    </p>
                  )}
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                    Change Notes (optional)
                  </label>
                  <textarea
                    value={versionChangeNotes}
                    onChange={(e) => setVersionChangeNotes(e.target.value)}
                    placeholder="Describe what changed in this version..."
                    rows={3}
                    className={`w-full border rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 ${isDark ? "bg-slate-700 border-slate-600 text-white placeholder-slate-500 focus:ring-cyan-500/50" : "bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500/50"}`}
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowUploadVersionModal(false);
                    setVersionFile(null);
                    setVersionChangeNotes("");
                  }}
                  className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${isDark ? "bg-slate-700 text-slate-300 hover:bg-slate-600" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUploadNewVersion}
                  disabled={!versionFile || uploadingVersion}
                  className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${isDark ? "bg-cyan-500 text-white hover:bg-cyan-600" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                >
                  {uploadingVersion ? "Uploading..." : "Upload Version"}
                </button>
              </div>
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

                {/* Organizing Folders Section */}
                <div>
                  <h3 className={`text-lg font-semibold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
                    Organizing Folders
                  </h3>
                  <div className={`p-4 rounded-lg ${isDark ? "bg-purple-500/10 border border-purple-500/30" : "bg-purple-50 border border-purple-200"}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <svg className={`w-5 h-5 ${isDark ? "text-purple-400" : "text-purple-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                      </svg>
                      <span className={`font-medium ${isDark ? "text-purple-300" : "text-purple-700"}`}>Drag to Reorder</span>
                    </div>
                    <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                      Drag and drop folders within each section to arrange them in your preferred order. Your custom order is saved automatically and persists across sessions. Each user has their own personalized folder arrangement.
                    </p>
                    <div className={`mt-3 p-3 rounded ${isDark ? "bg-slate-700/50" : "bg-white"}`}>
                      <p className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-gray-700"}`}>Pro Tip: Nested Folders</p>
                      <p className={`text-xs mt-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                        In My Folders, hold <kbd className={`px-1.5 py-0.5 rounded ${isDark ? "bg-slate-600" : "bg-gray-200"}`}>Option</kbd> (Alt on Windows) while dragging to move a folder inside another folder instead of reordering.
                      </p>
                    </div>
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
                      <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>Move Documents to Folders</p>
                      <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                        Drag and drop documents onto a folder to move them into that folder.
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
                    <li>• Drag folders to reorder them - your order is saved per user</li>
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

        {/* Template Upload Modal */}
        {showTemplateUploadModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`border rounded-xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                  Upload Template
                </h2>
                <button
                  onClick={() => {
                    setShowTemplateUploadModal(false);
                    setTemplateFile(null);
                    setTemplateFormData({ name: "", description: "", category: "templates" });
                  }}
                  className={`p-2 rounded-lg transition-colors ${isDark ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-100 text-gray-500"}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleUploadTemplate} className="space-y-4">
                <div>
                  <span className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                    Template File *
                  </span>
                  <label
                    htmlFor="template-file-upload"
                    className={`block border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                      templateFile
                        ? isDark ? "border-purple-500 bg-purple-500/10" : "border-purple-500 bg-purple-50"
                        : isDark ? "border-slate-600 hover:border-slate-500" : "border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    <input
                      id="template-file-upload"
                      ref={templateFileInputRef}
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setTemplateFile(file);
                          if (!templateFormData.name) {
                            setTemplateFormData({ ...templateFormData, name: file.name.replace(/\.[^/.]+$/, "") });
                          }
                        }
                      }}
                      className="sr-only"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg"
                    />
                    {templateFile ? (
                      <div>
                        <div className="text-2xl mb-2">📄</div>
                        <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>{templateFile.name}</p>
                        <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>{formatFileSize(templateFile.size)}</p>
                      </div>
                    ) : (
                      <div>
                        <div className="text-2xl mb-2">📤</div>
                        <p className={isDark ? "text-slate-400" : "text-gray-500"}>Click to select a template file</p>
                      </div>
                    )}
                  </label>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                    Template Name *
                  </label>
                  <input
                    type="text"
                    value={templateFormData.name}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, name: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none ${isDark ? "bg-slate-900/50 border-slate-600 text-white focus:border-purple-500" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-purple-500"}`}
                    required
                    placeholder="e.g., New Hire Onboarding Checklist"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                    Category *
                  </label>
                  <select
                    value={templateFormData.category}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, category: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none ${isDark ? "bg-slate-900/50 border-slate-600 text-white focus:border-purple-500" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-purple-500"}`}
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
                    value={templateFormData.description}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, description: e.target.value })}
                    rows={3}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none resize-none ${isDark ? "bg-slate-900/50 border-slate-600 text-white focus:border-purple-500" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-purple-500"}`}
                    placeholder="Brief description of this template..."
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTemplateUploadModal(false);
                      setTemplateFile(null);
                      setTemplateFormData({ name: "", description: "", category: "templates" });
                    }}
                    className={`flex-1 px-4 py-3 font-medium rounded-lg transition-colors ${isDark ? "bg-slate-700 text-white hover:bg-slate-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploadingTemplate || !templateFile}
                    className={`flex-1 px-4 py-3 font-medium rounded-lg transition-colors disabled:opacity-50 ${isDark ? "bg-purple-500 text-white hover:bg-purple-600" : "bg-purple-600 text-white hover:bg-purple-700"}`}
                  >
                    {uploadingTemplate ? "Uploading..." : "Upload Template"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Save as Template Modal */}
        {showSaveAsTemplateModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`border rounded-xl p-4 sm:p-6 w-full max-w-md ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                  Save as Template
                </h2>
                <button
                  onClick={() => {
                    setShowSaveAsTemplateModal(false);
                    setSaveAsTemplateDocId(null);
                  }}
                  className={`p-2 rounded-lg transition-colors ${isDark ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-100 text-gray-500"}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleSaveAsTemplate} className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                    Template Name *
                  </label>
                  <input
                    type="text"
                    value={templateFormData.name}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, name: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none ${isDark ? "bg-slate-900/50 border-slate-600 text-white focus:border-purple-500" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-purple-500"}`}
                    required
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                    Category *
                  </label>
                  <select
                    value={templateFormData.category}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, category: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none ${isDark ? "bg-slate-900/50 border-slate-600 text-white focus:border-purple-500" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-purple-500"}`}
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
                    value={templateFormData.description}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, description: e.target.value })}
                    rows={3}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none resize-none ${isDark ? "bg-slate-900/50 border-slate-600 text-white focus:border-purple-500" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-purple-500"}`}
                    placeholder="Brief description..."
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSaveAsTemplateModal(false);
                      setSaveAsTemplateDocId(null);
                    }}
                    className={`flex-1 px-4 py-3 font-medium rounded-lg transition-colors ${isDark ? "bg-slate-700 text-white hover:bg-slate-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploadingTemplate || !templateFormData.name}
                    className={`flex-1 px-4 py-3 font-medium rounded-lg transition-colors disabled:opacity-50 ${isDark ? "bg-purple-500 text-white hover:bg-purple-600" : "bg-purple-600 text-white hover:bg-purple-700"}`}
                  >
                    {uploadingTemplate ? "Saving..." : "Save as Template"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Use Template Modal */}
        {showUseTemplateModal && selectedTemplateId && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`border rounded-xl p-4 sm:p-6 w-full max-w-md ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                  Create from Template
                </h2>
                <button
                  onClick={() => {
                    setShowUseTemplateModal(false);
                    setSelectedTemplateId(null);
                  }}
                  className={`p-2 rounded-lg transition-colors ${isDark ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-100 text-gray-500"}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleUseTemplate} className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                    Document Name *
                  </label>
                  <input
                    type="text"
                    value={useTemplateName}
                    onChange={(e) => setUseTemplateName(e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none ${isDark ? "bg-slate-900/50 border-slate-600 text-white focus:border-purple-500" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-purple-500"}`}
                    required
                    placeholder="Name for the new document"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                    Folder (optional)
                  </label>
                  <select
                    value={useTemplateFolderId || ""}
                    onChange={(e) => setUseTemplateFolderId(e.target.value ? e.target.value as Id<"documentFolders"> : null)}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none ${isDark ? "bg-slate-900/50 border-slate-600 text-white focus:border-purple-500" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-purple-500"}`}
                  >
                    <option value="">No folder (root)</option>
                    {folders?.map((folder) => (
                      <option key={folder._id} value={folder._id}>
                        {folder.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUseTemplateModal(false);
                      setSelectedTemplateId(null);
                    }}
                    className={`flex-1 px-4 py-3 font-medium rounded-lg transition-colors ${isDark ? "bg-slate-700 text-white hover:bg-slate-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={usingTemplate || !useTemplateName}
                    className={`flex-1 px-4 py-3 font-medium rounded-lg transition-colors disabled:opacity-50 ${isDark ? "bg-purple-500 text-white hover:bg-purple-600" : "bg-purple-600 text-white hover:bg-purple-700"}`}
                  >
                    {usingTemplate ? "Creating..." : "Create Document"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Expiration Modal */}
        {showExpirationModal && expirationDocId && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`border rounded-xl p-4 sm:p-6 w-full max-w-md ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                  Set Expiration
                </h2>
                <button
                  onClick={() => {
                    setShowExpirationModal(false);
                    setExpirationDocId(null);
                  }}
                  className={`p-2 rounded-lg transition-colors ${isDark ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-100 text-gray-500"}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleSetExpiration} className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                    Expiration Date *
                  </label>
                  <input
                    type="date"
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none ${isDark ? "bg-slate-900/50 border-slate-600 text-white focus:border-amber-500" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-amber-500"}`}
                    required
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                    Alert Days Before Expiration
                  </label>
                  <select
                    value={expirationAlertDays}
                    onChange={(e) => setExpirationAlertDays(e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none ${isDark ? "bg-slate-900/50 border-slate-600 text-white focus:border-amber-500" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-amber-500"}`}
                  >
                    <option value="7">7 days</option>
                    <option value="14">14 days</option>
                    <option value="30">30 days</option>
                    <option value="60">60 days</option>
                    <option value="90">90 days</option>
                  </select>
                  <p className={`text-xs mt-1 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                    Document will show a warning badge this many days before expiring.
                  </p>
                </div>
                <div className="flex gap-3 pt-4">
                  {expirationDate && (
                    <button
                      type="button"
                      onClick={() => {
                        handleRemoveExpiration(expirationDocId);
                        setShowExpirationModal(false);
                        setExpirationDocId(null);
                        setExpirationDate("");
                      }}
                      className="px-4 py-3 font-medium rounded-lg transition-colors bg-red-500/10 text-red-400 hover:bg-red-500/20"
                    >
                      Remove
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setShowExpirationModal(false);
                      setExpirationDocId(null);
                    }}
                    className={`flex-1 px-4 py-3 font-medium rounded-lg transition-colors ${isDark ? "bg-slate-700 text-white hover:bg-slate-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!expirationDate}
                    className={`flex-1 px-4 py-3 font-medium rounded-lg transition-colors disabled:opacity-50 ${isDark ? "bg-amber-500 text-white hover:bg-amber-600" : "bg-amber-600 text-white hover:bg-amber-700"}`}
                  >
                    Set Expiration
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Sign Document Modal */}
        {showSignModal && signDocumentId && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`border rounded-xl p-4 sm:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-xl font-semibold flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Sign Document
                </h2>
                <button
                  onClick={() => {
                    setShowSignModal(false);
                    setSignDocumentId(null);
                    setHasDrawn(false);
                  }}
                  className={`p-2 rounded-lg transition-colors ${isDark ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-100 text-gray-500"}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Document info */}
              {(() => {
                const doc = documents?.find(d => d._id === signDocumentId) ||
                           folderDocuments?.find(d => d._id === signDocumentId) ||
                           unsignedDocuments?.find(d => d._id === signDocumentId);
                return doc ? (
                  <div className={`p-3 rounded-lg mb-4 ${isDark ? "bg-slate-700/50" : "bg-gray-50"}`}>
                    <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>{doc.name}</p>
                    {doc.description && (
                      <p className={`text-sm mt-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>{doc.description}</p>
                    )}
                    <p className={`text-xs mt-1 ${isDark ? "text-slate-500" : "text-gray-400"}`}>{doc.fileName}</p>
                  </div>
                ) : null;
              })()}

              {hasCurrentUserSigned ? (
                <div className={`p-4 rounded-lg text-center ${isDark ? "bg-green-500/10 border border-green-500/30" : "bg-green-50 border border-green-200"}`}>
                  <svg className="w-8 h-8 mx-auto mb-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className={`font-medium ${isDark ? "text-green-400" : "text-green-700"}`}>You have already signed this document</p>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                      Draw your signature below
                    </label>
                    <div className={`border-2 rounded-lg overflow-hidden ${isDark ? "border-slate-600" : "border-gray-300"}`}>
                      <canvas
                        ref={signCanvasRef}
                        className="w-full bg-white cursor-crosshair touch-none"
                        style={{ height: "150px" }}
                        onMouseDown={handleSignCanvasMouseDown}
                        onMouseMove={handleSignCanvasMouseMove}
                        onMouseUp={handleSignCanvasMouseUp}
                        onMouseLeave={handleSignCanvasMouseUp}
                        onTouchStart={handleSignCanvasMouseDown}
                        onTouchMove={handleSignCanvasMouseMove}
                        onTouchEnd={handleSignCanvasMouseUp}
                      />
                    </div>
                    <div className="flex justify-end mt-2">
                      <button
                        type="button"
                        onClick={clearSignCanvas}
                        className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${isDark ? "bg-slate-700 text-slate-300 hover:bg-slate-600" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <p className={`text-xs mb-4 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                    By clicking &quot;Sign Document&quot; below, you acknowledge that you have read and agree to the contents of this document. Your signature will be recorded with a timestamp.
                  </p>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowSignModal(false);
                        setSignDocumentId(null);
                        setHasDrawn(false);
                      }}
                      className={`flex-1 px-4 py-3 font-medium rounded-lg transition-colors ${isDark ? "bg-slate-700 text-white hover:bg-slate-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSignDocument}
                      disabled={!hasDrawn || signing}
                      className={`flex-1 px-4 py-3 font-medium rounded-lg transition-colors disabled:opacity-50 ${isDark ? "bg-blue-500 text-white hover:bg-blue-600" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                    >
                      {signing ? "Signing..." : "Sign Document"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* View Signatures Modal */}
        {showViewSignaturesModal && viewSignaturesDocId && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`border rounded-xl p-4 sm:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-xl font-semibold flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Signatures
                </h2>
                <button
                  onClick={() => {
                    setShowViewSignaturesModal(false);
                    setViewSignaturesDocId(null);
                  }}
                  className={`p-2 rounded-lg transition-colors ${isDark ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-100 text-gray-500"}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Document info */}
              {(() => {
                const doc = documents?.find(d => d._id === viewSignaturesDocId) ||
                           folderDocuments?.find(d => d._id === viewSignaturesDocId);
                return doc ? (
                  <div className={`p-3 rounded-lg mb-4 ${isDark ? "bg-slate-700/50" : "bg-gray-50"}`}>
                    <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>{doc.name}</p>
                    <p className={`text-xs mt-1 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                      {doc.signatureCount || 0} signature{(doc.signatureCount || 0) !== 1 ? "s" : ""} collected
                    </p>
                  </div>
                ) : null;
              })()}

              {!signModalSignatures ? (
                <div className={`text-center py-8 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                  <svg className="w-6 h-6 animate-spin mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <p className="text-sm">Loading signatures...</p>
                </div>
              ) : signModalSignatures.length === 0 ? (
                <div className={`text-center py-8 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                  <p className="text-sm">No signatures yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {signModalSignatures.map((sig) => (
                    <div
                      key={sig._id}
                      className={`p-3 rounded-lg border ${isDark ? "bg-slate-700/30 border-slate-600" : "bg-gray-50 border-gray-200"}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`font-medium text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
                            {sig.signedByName}
                          </p>
                          {sig.signedByEmail && (
                            <p className={`text-xs ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                              {sig.signedByEmail}
                            </p>
                          )}
                        </div>
                        <p className={`text-xs ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                          {new Date(sig.signedAt).toLocaleString()}
                        </p>
                      </div>
                      {sig.signatureData && (
                        <div className="mt-2 p-2 bg-white rounded border border-gray-200">
                          <img
                            src={sig.signatureData}
                            alt={`Signature by ${sig.signedByName}`}
                            className="h-12 object-contain mx-auto"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-slate-700/50">
                <button
                  type="button"
                  onClick={() => {
                    setShowViewSignaturesModal(false);
                    setViewSignaturesDocId(null);
                  }}
                  className={`w-full px-4 py-3 font-medium rounded-lg transition-colors ${isDark ? "bg-slate-700 text-white hover:bg-slate-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                >
                  Close
                </button>
              </div>
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
