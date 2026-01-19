"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

function PublicDocumentContent({ slug }: { slug: string }) {
  const document = useQuery(api.documents.getPublicBySlug, { slug });
  const fileUrl = useQuery(api.documents.getPublicFileUrl, { slug });

  if (document === undefined || fileUrl === undefined) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <svg className="w-8 h-8 animate-spin text-cyan-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-slate-400">Loading document...</p>
        </div>
      </div>
    );
  }

  if (!document || !fileUrl) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center p-8 bg-slate-800 rounded-xl border border-slate-700 max-w-md">
          <div className="text-4xl mb-4">📄</div>
          <h1 className="text-xl font-bold text-white mb-2">Document Not Found</h1>
          <p className="text-slate-400">
            This document may have been removed or is no longer publicly available.
          </p>
        </div>
      </div>
    );
  }

  const isImage = document.fileType.includes("image");
  const isPdf = document.fileType.includes("pdf");
  const isOffice = document.fileType.includes("word") ||
    document.fileType.includes("document") ||
    document.fileType.includes("msword") ||
    document.fileType.includes("spreadsheet") ||
    document.fileType.includes("excel") ||
    document.fileType.includes("presentation") ||
    document.fileType.includes("powerpoint");

  const getOfficeViewerUrl = (url: string) => {
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Print styles */}
      <style jsx global>{`
        @media print {
          @page {
            margin: 0;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-full {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
          }
        }
      `}</style>

      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3 no-print">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.gif" alt="IE Tires" className="h-8 w-auto" />
            <div>
              <h1 className="font-semibold text-white">{document.name}</h1>
              <p className="text-xs text-slate-400">{document.fileName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print
            </button>
            <a
              href={fileUrl}
              download={document.fileName}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 text-sm font-medium rounded-lg bg-cyan-500 text-white hover:bg-cyan-600 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </a>
          </div>
        </div>
      </header>

      {/* Document viewer */}
      <main className="flex-1 p-4">
        <div className="max-w-6xl mx-auto h-full">
          {isImage ? (
            <div className="flex items-center justify-center h-full print-full">
              <img
                src={fileUrl}
                alt={document.name}
                className="max-w-full max-h-[calc(100vh-120px)] object-contain rounded-lg shadow-lg"
              />
            </div>
          ) : isPdf ? (
            <iframe
              src={fileUrl}
              className="w-full h-[calc(100vh-120px)] rounded-lg bg-white print-full"
              title={document.name}
            />
          ) : isOffice ? (
            <iframe
              src={getOfficeViewerUrl(fileUrl)}
              className="w-full h-[calc(100vh-120px)] rounded-lg bg-white print-full"
              title={document.name}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-8 bg-slate-800 rounded-xl border border-slate-700">
                <div className="text-4xl mb-4">📄</div>
                <h2 className="text-lg font-semibold text-white mb-2">{document.name}</h2>
                <p className="text-slate-400 mb-4">
                  This file type cannot be previewed in the browser.
                </p>
                <a
                  href={fileUrl}
                  download={document.fileName}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download File
                </a>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-800 border-t border-slate-700 px-4 py-3 text-center no-print">
        <p className="text-xs text-slate-500">
          Import Export Tire Co. - Internal Document
        </p>
      </footer>
    </div>
  );
}

export default function PublicDocumentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return <PublicDocumentContent slug={slug} />;
}
