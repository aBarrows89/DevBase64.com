"use client";

import { useDocHub } from "./DocHubContext";
import { formatFileSize, isOfficeDocument } from "./types";

export default function PreviewModal() {
  const { isDark, previewDocument, previewUrl, loadingPreview, closePreview, handleDownload } = useDocHub();

  if (!previewDocument) return null;

  const doc = previewDocument;
  const isImage = doc.fileType.includes("image");
  const isOffice = isOfficeDocument(doc.fileType);
  const officeViewerUrl = isOffice && previewUrl
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(previewUrl)}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={closePreview}>
      {/* Backdrop */}
      <div className={`absolute inset-0 ${isDark ? "bg-black/80" : "bg-black/60"} backdrop-blur-sm`} />

      {/* Modal */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-5xl h-[85vh] mx-4 rounded-2xl overflow-hidden flex flex-col ${
          isDark ? "bg-slate-900 border border-slate-700" : "bg-white border border-gray-200 shadow-2xl"
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? "border-slate-700" : "border-gray-200"}`}>
          <div className="flex-1 min-w-0">
            <h2 className={`text-lg font-semibold truncate ${isDark ? "text-white" : "text-gray-900"}`}>
              {doc.name}
            </h2>
            <p className={`text-xs mt-0.5 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
              {doc.fileName} &middot; {formatFileSize(doc.fileSize)}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={() => handleDownload(doc)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                isDark ? "bg-slate-700 text-slate-300 hover:bg-slate-600" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Download
            </button>
            <button
              onClick={closePreview}
              className={`p-2 rounded-lg transition-colors ${isDark ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-100 text-gray-500"}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto flex items-center justify-center p-4">
          {loadingPreview ? (
            <div className={`w-8 h-8 border-2 border-t-transparent rounded-full animate-spin ${isDark ? "border-cyan-500" : "border-blue-500"}`} />
          ) : previewUrl ? (
            isImage ? (
              <img
                src={previewUrl}
                alt={doc.name}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            ) : officeViewerUrl ? (
              <iframe
                src={officeViewerUrl}
                className="w-full h-full rounded-lg"
                title={doc.name}
              />
            ) : (
              <iframe
                src={previewUrl}
                className="w-full h-full rounded-lg"
                title={doc.name}
              />
            )
          ) : (
            <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>Unable to load preview</p>
          )}
        </div>
      </div>
    </div>
  );
}
