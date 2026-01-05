"use client";

import { useRef, useEffect, useState, useCallback } from "react";

interface SignaturePadProps {
  onSignatureChange?: (signatureData: string | null) => void;
  onSave?: (signatureData: string) => void;
  savedSignature?: string;
  label?: string;
  width?: number;
  height?: number;
  className?: string;
  isDark?: boolean;
  disabled?: boolean;
  showControls?: boolean;
}

export default function SignaturePad({
  onSignatureChange,
  onSave,
  savedSignature,
  label,
  width = 400,
  height = 120,
  className = "",
  isDark = true,
  disabled = false,
  showControls = true,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set up canvas
    ctx.strokeStyle = isDark ? "#ffffff" : "#000000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Fill with background
    ctx.fillStyle = isDark ? "#1e293b" : "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw signature line
    ctx.strokeStyle = isDark ? "#475569" : "#d1d5db";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, canvas.height - 30);
    ctx.lineTo(canvas.width - 20, canvas.height - 30);
    ctx.stroke();

    // Reset stroke style for drawing
    ctx.strokeStyle = isDark ? "#ffffff" : "#000000";
    ctx.lineWidth = 2;
  }, [isDark]);

  useEffect(() => {
    initCanvas();

    // If there's a saved signature, draw it
    if (savedSignature) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!ctx || !canvas) return;

      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        setHasSignature(true);
      };
      img.src = savedSignature;
    }
  }, [initCanvas, savedSignature]);

  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ("touches" in e) {
      const touch = e.touches[0];
      if (!touch) return null;
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    } else {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    }
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (disabled || savedSignature) return;
    e.preventDefault();
    const coords = getCoordinates(e);
    if (!coords) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = isDark ? "#ffffff" : "#000000";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing || disabled || savedSignature) return;
    e.preventDefault();

    const coords = getCoordinates(e);
    if (!coords) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    if (isDrawing && hasSignature) {
      const canvas = canvasRef.current;
      if (canvas) {
        const signatureData = canvas.toDataURL("image/png");
        onSignatureChange?.(signatureData);
      }
    }
    setIsDrawing(false);
  };

  const clearSignature = () => {
    initCanvas();
    setHasSignature(false);
    onSignatureChange?.(null);
  };

  const saveSignature = () => {
    if (!hasSignature) return;
    const canvas = canvasRef.current;
    if (canvas) {
      const signatureData = canvas.toDataURL("image/png");
      onSave?.(signatureData);
    }
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && (
        <p className={`text-sm font-medium ${isDark ? "text-slate-300" : "text-gray-700"}`}>
          {label}
        </p>
      )}
      <div className={`relative rounded-lg overflow-hidden border-2 ${
        savedSignature
          ? "border-green-500/50"
          : disabled
            ? isDark ? "border-slate-600" : "border-gray-300"
            : isDark ? "border-cyan-500/50" : "border-cyan-400"
      }`}>
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className={`touch-none w-full ${
            disabled || savedSignature ? "cursor-not-allowed" : "cursor-crosshair"
          }`}
          style={{ maxWidth: `${width}px` }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {!hasSignature && !savedSignature && (
          <div className={`absolute inset-0 flex items-center justify-center pointer-events-none text-sm ${
            isDark ? "text-slate-500" : "text-gray-400"
          }`}>
            {disabled ? "Awaiting signature" : "Sign here"}
          </div>
        )}
        {savedSignature && (
          <div className="absolute top-2 right-2">
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
              Signed
            </span>
          </div>
        )}
      </div>
      {showControls && !savedSignature && !disabled && (
        <div className="flex justify-between items-center">
          <span className={`text-xs ${isDark ? "text-slate-500" : "text-gray-500"}`}>
            {hasSignature ? "Signature captured" : "Draw your signature above"}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={clearSignature}
              className={`text-xs px-2 py-1 rounded ${
                isDark
                  ? "text-slate-400 hover:text-slate-300 hover:bg-slate-700"
                  : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
              }`}
            >
              Clear
            </button>
            {onSave && (
              <button
                type="button"
                onClick={saveSignature}
                disabled={!hasSignature}
                className={`text-xs px-3 py-1 rounded font-medium ${
                  isDark
                    ? "bg-cyan-500 text-white hover:bg-cyan-400"
                    : "bg-cyan-600 text-white hover:bg-cyan-700"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Save
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
