"use client";

import { useEffect, useRef } from "react";
import { useDocHub } from "./DocHubContext";
import { canPreview } from "./types";

export default function ContextMenu() {
  const {
    isDark, contextMenu, setContextMenu, isAdmin,
    handlePreview, handleDownload, handleArchive, handleDelete, handleShare,
    setVersionHistoryDocId, setSignDocumentId,
    handleArchiveFolder, setShareFolderId,
  } = useDocHub();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contextMenu) return;

    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setContextMenu(null); };

    // Delay adding listeners so the opening click/right-click doesn't immediately close
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClick);
      document.addEventListener("keydown", handleEsc);
    }, 10);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [contextMenu, setContextMenu]);

  if (!contextMenu) return null;

  // Position the menu
  const style: React.CSSProperties = {
    position: "fixed",
    left: contextMenu.x,
    top: contextMenu.y,
    zIndex: 50,
  };

  const itemClass = `w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
    isDark ? "text-slate-300 hover:bg-slate-700/80 hover:text-white" : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
  }`;

  const dangerClass = `w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
    isDark ? "text-red-400 hover:bg-red-500/10 hover:text-red-300" : "text-red-600 hover:bg-red-50 hover:text-red-700"
  }`;

  const divider = <div className={`my-1 border-t ${isDark ? "border-slate-700" : "border-gray-100"}`} />;

  // Document context menu
  if (contextMenu.doc) {
    const doc = contextMenu.doc;
    return (
      <div ref={ref} style={style} className={`min-w-52 rounded-xl border shadow-xl py-1 backdrop-blur-xl ${
        isDark ? "bg-slate-800/95 border-slate-700 shadow-black/50" : "bg-white/95 border-gray-200 shadow-gray-300/50"
      }`}>
        {canPreview(doc.fileType) && (
          <button className={itemClass} onClick={() => handlePreview(doc)}>
            <svg className="w-4 h-4 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Preview
          </button>
        )}
        <button className={itemClass} onClick={() => handleDownload(doc)}>
          <svg className="w-4 h-4 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download
        </button>
        <button className={itemClass} onClick={() => handleShare(doc._id)}>
          <svg className="w-4 h-4 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          Share
        </button>
        {divider}
        <button className={itemClass} onClick={() => setVersionHistoryDocId(doc._id)}>
          <svg className="w-4 h-4 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Version History
        </button>
        {doc.requiresSignature && (
          <button className={itemClass} onClick={() => setSignDocumentId(doc._id)}>
            <svg className="w-4 h-4 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Sign Document
          </button>
        )}
        {isAdmin && (
          <>
            {divider}
            <button className={dangerClass} onClick={() => handleArchive(doc._id)}>
              <svg className="w-4 h-4 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              Archive
            </button>
            <button className={dangerClass} onClick={() => { if (confirm("Permanently delete this document?")) handleDelete(doc._id); }}>
              <svg className="w-4 h-4 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </>
        )}
      </div>
    );
  }

  // Folder context menu
  if (contextMenu.folder) {
    const folder = contextMenu.folder;
    return (
      <div ref={ref} style={style} className={`min-w-48 rounded-xl border shadow-xl py-1 backdrop-blur-xl ${
        isDark ? "bg-slate-800/95 border-slate-700 shadow-black/50" : "bg-white/95 border-gray-200 shadow-gray-300/50"
      }`}>
        <button className={itemClass} onClick={() => setShareFolderId(folder._id)}>
          <svg className="w-4 h-4 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Manage Access
        </button>
        {isAdmin && (
          <>
            {divider}
            <button className={dangerClass} onClick={() => { if (confirm("Archive this folder?")) handleArchiveFolder(folder._id); }}>
              <svg className="w-4 h-4 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              Archive Folder
            </button>
          </>
        )}
      </div>
    );
  }

  return null;
}
