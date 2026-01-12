"use client";

import { useState, useEffect, useRef } from "react";
import Protected from "../protected";
import Sidebar from "@/components/Sidebar";
import { useTheme } from "../theme-context";
import JsBarcode from "jsbarcode";

interface LabelData {
  locationId: string;
  locationName: string;
}

export default function BinLabelsPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [labels, setLabels] = useState<LabelData[]>([{ locationId: "", locationName: "" }]);
  const [copies, setCopies] = useState(1);
  const barcodeRefs = useRef<(SVGSVGElement | null)[]>([]);

  // Generate barcodes when labels change
  useEffect(() => {
    labels.forEach((label, index) => {
      if (label.locationId && barcodeRefs.current[index]) {
        try {
          JsBarcode(barcodeRefs.current[index], label.locationId, {
            format: "CODE128",
            width: 2,
            height: 80,
            displayValue: true,
            fontSize: 14,
            font: "monospace",
            textMargin: 5,
            margin: 10,
          });
        } catch (e) {
          console.error("Barcode generation error:", e);
        }
      }
    });
  }, [labels]);

  const addLabel = () => {
    setLabels([...labels, { locationId: "", locationName: "" }]);
  };

  const removeLabel = (index: number) => {
    if (labels.length > 1) {
      const newLabels = labels.filter((_, i) => i !== index);
      setLabels(newLabels);
    }
  };

  const updateLabel = (index: number, field: keyof LabelData, value: string) => {
    const newLabels = [...labels];
    newLabels[index] = { ...newLabels[index], [field]: value };
    setLabels(newLabels);
  };

  const handlePrint = () => {
    window.print();
  };

  const clearAll = () => {
    setLabels([{ locationId: "", locationName: "" }]);
    setCopies(1);
  };

  // Generate labels with copies
  const labelsWithCopies = labels.flatMap((label) =>
    Array(copies).fill(label)
  );

  return (
    <Protected>
      <div className={`flex h-screen ${isDark ? "bg-slate-900" : "bg-[#f2f2f7]"}`}>
        <Sidebar />
        <main className="flex-1 overflow-auto print:overflow-visible">
          {/* Header - Hidden when printing */}
          <header className={`sticky top-0 z-10 p-6 border-b print:hidden ${isDark ? "bg-slate-900/95 backdrop-blur border-slate-700" : "bg-[#f2f2f7]/95 backdrop-blur border-gray-200"}`}>
            <div className="flex items-center justify-between">
              <div>
                <h1 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                  Bin Label Printer
                </h1>
                <p className={`text-sm mt-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                  Generate Code 128 barcode labels for warehouse bins (2" x 6" thermal labels)
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={clearAll}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${isDark ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}
                >
                  Clear All
                </button>
                <button
                  onClick={handlePrint}
                  disabled={!labels.some(l => l.locationId)}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                    labels.some(l => l.locationId)
                      ? isDark
                        ? "bg-cyan-500 hover:bg-cyan-400 text-white"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print Labels
                </button>
              </div>
            </div>
          </header>

          <div className="p-6 print:p-0">
            {/* Input Form - Hidden when printing */}
            <div className={`rounded-xl p-6 mb-6 print:hidden ${isDark ? "bg-slate-800 border border-slate-700" : "bg-white border border-gray-200 shadow-sm"}`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                  Label Details
                </h2>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className={`text-sm font-medium ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                      Copies per label:
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={copies}
                      onChange={(e) => setCopies(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                      className={`w-20 px-3 py-1.5 rounded-lg text-center ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-gray-50 border-gray-200 text-gray-900"} border focus:outline-none focus:ring-2 focus:ring-cyan-500`}
                    />
                  </div>
                  <button
                    onClick={addLabel}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${isDark ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Label
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {labels.map((label, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-4 p-4 rounded-lg ${isDark ? "bg-slate-700/50" : "bg-gray-50"}`}
                  >
                    <span className={`text-sm font-medium w-8 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                      #{index + 1}
                    </span>
                    <div className="flex-1 grid grid-cols-2 gap-4">
                      <div>
                        <label className={`block text-xs font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                          Location ID (Barcode Value)
                        </label>
                        <input
                          type="text"
                          value={label.locationId}
                          onChange={(e) => updateLabel(index, "locationId", e.target.value.toUpperCase())}
                          placeholder="e.g., A01-B02-C03"
                          className={`w-full px-4 py-2 rounded-lg font-mono ${isDark ? "bg-slate-800 border-slate-600 text-white placeholder-slate-500" : "bg-white border-gray-200 text-gray-900 placeholder-gray-400"} border focus:outline-none focus:ring-2 focus:ring-cyan-500`}
                        />
                      </div>
                      <div>
                        <label className={`block text-xs font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                          Location Name (Human Readable)
                        </label>
                        <input
                          type="text"
                          value={label.locationName}
                          onChange={(e) => updateLabel(index, "locationName", e.target.value)}
                          placeholder="e.g., Aisle 1, Bay 2, Shelf 3"
                          className={`w-full px-4 py-2 rounded-lg ${isDark ? "bg-slate-800 border-slate-600 text-white placeholder-slate-500" : "bg-white border-gray-200 text-gray-900 placeholder-gray-400"} border focus:outline-none focus:ring-2 focus:ring-cyan-500`}
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => removeLabel(index)}
                      disabled={labels.length === 1}
                      className={`p-2 rounded-lg transition-colors ${
                        labels.length === 1
                          ? "opacity-30 cursor-not-allowed"
                          : isDark
                            ? "hover:bg-slate-600 text-slate-400 hover:text-red-400"
                            : "hover:bg-gray-200 text-gray-400 hover:text-red-500"
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview Section - Hidden when printing */}
            <div className={`rounded-xl p-6 print:hidden ${isDark ? "bg-slate-800 border border-slate-700" : "bg-white border border-gray-200 shadow-sm"}`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                  Print Preview ({labelsWithCopies.filter(l => l.locationId).length} label{labelsWithCopies.filter(l => l.locationId).length !== 1 ? "s" : ""})
                </h2>
                <span className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                  Actual size: 2" × 6"
                </span>
              </div>

              {labels.some(l => l.locationId) ? (
                <div className={`p-8 rounded-lg ${isDark ? "bg-slate-900/50" : "bg-gray-100"}`}>
                  <div className="flex flex-wrap gap-8 justify-center">
                    {labels.map((label, index) => (
                      label.locationId && (
                        <div key={index} className="flex flex-col items-center">
                          {/* Label number indicator */}
                          <span className={`text-xs font-medium mb-2 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                            Label #{index + 1} {copies > 1 && `(×${copies})`}
                          </span>

                          {/* Thermal label mockup - scaled to fit screen */}
                          <div
                            className="relative bg-white shadow-xl rounded-sm"
                            style={{
                              width: "192px",  // 2 inches at 96dpi
                              height: "576px", // 6 inches at 96dpi
                              boxShadow: "0 4px 20px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)"
                            }}
                          >
                            {/* Label edge styling */}
                            <div
                              className="absolute inset-0 rounded-sm"
                              style={{
                                background: "linear-gradient(to bottom, #fafafa 0%, #ffffff 5%, #ffffff 95%, #f5f5f5 100%)",
                              }}
                            />

                            {/* Label content */}
                            <div className="relative h-full flex flex-col items-center justify-center p-4 text-black">
                              {/* Barcode */}
                              <svg
                                ref={(el) => { barcodeRefs.current[index] = el; }}
                                className="w-full"
                              />

                              {/* Location name */}
                              {label.locationName && (
                                <div className="text-center mt-4 px-2">
                                  <p className="text-xl font-bold leading-tight text-black">{label.locationName}</p>
                                </div>
                              )}
                            </div>

                            {/* Subtle perforation line indicators */}
                            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              ) : (
                <div className={`text-center py-16 rounded-lg ${isDark ? "bg-slate-900/50" : "bg-gray-100"}`}>
                  <svg className="w-20 h-20 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                  <p className={`text-lg font-medium ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    Enter a Location ID to preview label
                  </p>
                  <p className={`text-sm mt-1 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                    The barcode will be generated using Code 128 format
                  </p>
                </div>
              )}
            </div>

            {/* Print-Only Labels */}
            <div className="hidden print:block">
              {labelsWithCopies.map((label, index) => (
                label.locationId && (
                  <div
                    key={index}
                    className="print-label"
                    style={{
                      width: "2in",
                      height: "6in",
                      pageBreakAfter: "always",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0.25in",
                      boxSizing: "border-box",
                    }}
                  >
                    <PrintBarcode locationId={label.locationId} locationName={label.locationName} />
                  </div>
                )
              ))}
            </div>
          </div>
        </main>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: 2in 6in;
            margin: 0;
          }

          body {
            margin: 0;
            padding: 0;
          }

          .print-label {
            width: 2in !important;
            height: 6in !important;
            page-break-after: always;
            page-break-inside: avoid;
          }

          .print-label:last-child {
            page-break-after: auto;
          }
        }
      `}</style>
    </Protected>
  );
}

// Separate component for print barcodes
function PrintBarcode({ locationId, locationName }: { locationId: string; locationName: string }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && locationId) {
      JsBarcode(svgRef.current, locationId, {
        format: "CODE128",
        width: 2,
        height: 100,
        displayValue: true,
        fontSize: 16,
        font: "monospace",
        textMargin: 8,
        margin: 10,
      });
    }
  }, [locationId]);

  return (
    <div className="flex flex-col items-center justify-center h-full text-black">
      <svg ref={svgRef} className="max-w-full" />
      {locationName && (
        <div className="text-center mt-4 px-2">
          <p style={{ fontSize: "18px", fontWeight: "bold", lineHeight: 1.2 }}>{locationName}</p>
        </div>
      )}
    </div>
  );
}
