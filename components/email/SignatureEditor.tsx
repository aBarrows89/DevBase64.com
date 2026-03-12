"use client";

import { useState, useCallback, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { useTheme } from "@/app/theme-context";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { GiphyFetch } from "@giphy/js-fetch-api";
import { Grid } from "@giphy/react-components";

interface SignatureEditorProps {
  initialContent: string;
  onSave: (html: string) => Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
}

// Initialize Giphy with a default key (should be moved to env in production)
const gf = new GiphyFetch("GlVGYHkr3WSBnllca54iNt0yFbjz7L65");

export default function SignatureEditor({
  initialContent,
  onSave,
  onCancel,
  isSaving = false,
}: SignatureEditorProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [showGiphyPicker, setShowGiphyPicker] = useState(false);
  const [giphySearch, setGiphySearch] = useState("");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const generateUploadUrl = useMutation(api.email.accounts.generateSignatureImageUploadUrl);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "signature-image",
        },
      }),
      TextAlign.configure({
        types: ["paragraph"],
      }),
      TextStyle,
      Color,
    ],
    content: initialContent || "",
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none focus:outline-none min-h-[120px] p-3 ${
          isDark ? "prose-invert" : ""
        }`,
      },
    },
  });

  const handleSave = async () => {
    if (editor) {
      await onSave(editor.getHTML());
    }
  };

  // Handle image upload
  const handleImageUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    setIsUploadingImage(true);
    try {
      const uploadUrl = await generateUploadUrl();

      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!result.ok) {
        throw new Error("Upload failed");
      }

      const { storageId } = await result.json();

      // Get the URL for the uploaded image
      // For now, we'll construct a URL pattern - in production this should use a query
      const imageUrl = `${window.location.origin}/api/storage/${storageId}`;

      // Actually, let's use a data URL for simplicity with signatures
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result && editor) {
          editor.chain().focus().setImage({ src: e.target.result as string }).run();
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Failed to upload image:", error);
      alert("Failed to upload image");
    } finally {
      setIsUploadingImage(false);
    }
  }, [editor, generateUploadUrl]);

  // Handle Giphy selection
  const handleGiphySelect = (gif: any, e: React.SyntheticEvent) => {
    e.preventDefault();
    if (editor) {
      const gifUrl = gif.images.fixed_height.url;
      editor.chain().focus().setImage({ src: gifUrl }).run();
      setShowGiphyPicker(false);
      setGiphySearch("");
    }
  };

  // Fetch trending or search results from Giphy
  const fetchGifs = (offset: number) => {
    if (giphySearch.trim()) {
      return gf.search(giphySearch, { offset, limit: 10 });
    }
    return gf.trending({ offset, limit: 10 });
  };

  // Set link
  const handleSetLink = () => {
    if (editor) {
      if (linkUrl) {
        const url = linkUrl.startsWith("http") ? linkUrl : `https://${linkUrl}`;
        editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
      } else {
        editor.chain().focus().unsetLink().run();
      }
      setShowLinkModal(false);
      setLinkUrl("");
    }
  };

  // Color presets
  const colorPresets = [
    "#000000", "#374151", "#6B7280", "#9CA3AF",
    "#EF4444", "#F97316", "#F59E0B", "#EAB308",
    "#22C55E", "#10B981", "#14B8A6", "#06B6D4",
    "#3B82F6", "#6366F1", "#8B5CF6", "#A855F7",
    "#EC4899", "#F43F5E",
  ];

  if (!editor) return null;

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className={`flex flex-wrap gap-1 p-2 rounded-lg border ${
        isDark ? "bg-slate-700 border-slate-600" : "bg-gray-100 border-gray-200"
      }`}>
        {/* Text formatting */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded ${
            editor.isActive("bold")
              ? "bg-blue-500 text-white"
              : isDark ? "hover:bg-slate-600 text-slate-300" : "hover:bg-gray-200 text-gray-700"
          }`}
          title="Bold"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
            <path d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
            <path d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded ${
            editor.isActive("italic")
              ? "bg-blue-500 text-white"
              : isDark ? "hover:bg-slate-600 text-slate-300" : "hover:bg-gray-200 text-gray-700"
          }`}
          title="Italic"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <line x1="19" y1="4" x2="10" y2="4" />
            <line x1="14" y1="20" x2="5" y2="20" />
            <line x1="15" y1="4" x2="9" y2="20" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-2 rounded ${
            editor.isActive("underline")
              ? "bg-blue-500 text-white"
              : isDark ? "hover:bg-slate-600 text-slate-300" : "hover:bg-gray-200 text-gray-700"
          }`}
          title="Underline"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M6 3v7a6 6 0 006 6 6 6 0 006-6V3" />
            <line x1="4" y1="21" x2="20" y2="21" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`p-2 rounded ${
            editor.isActive("strike")
              ? "bg-blue-500 text-white"
              : isDark ? "hover:bg-slate-600 text-slate-300" : "hover:bg-gray-200 text-gray-700"
          }`}
          title="Strikethrough"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <line x1="5" y1="12" x2="19" y2="12" />
            <path d="M16 6c-.5-1.5-2-2.5-4-2.5-3 0-4.5 2-4.5 4 0 1.5.5 2.5 2 3" />
            <path d="M8 18c.5 1.5 2 2.5 4 2.5 3 0 4.5-2 4.5-4 0-1.5-.5-2.5-2-3" />
          </svg>
        </button>

        <div className={`w-px h-6 self-center ${isDark ? "bg-slate-600" : "bg-gray-300"}`} />

        {/* Text alignment */}
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          className={`p-2 rounded ${
            editor.isActive({ textAlign: "left" })
              ? "bg-blue-500 text-white"
              : isDark ? "hover:bg-slate-600 text-slate-300" : "hover:bg-gray-200 text-gray-700"
          }`}
          title="Align Left"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="15" y2="12" />
            <line x1="3" y1="18" x2="18" y2="18" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          className={`p-2 rounded ${
            editor.isActive({ textAlign: "center" })
              ? "bg-blue-500 text-white"
              : isDark ? "hover:bg-slate-600 text-slate-300" : "hover:bg-gray-200 text-gray-700"
          }`}
          title="Align Center"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="6" y1="12" x2="18" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          className={`p-2 rounded ${
            editor.isActive({ textAlign: "right" })
              ? "bg-blue-500 text-white"
              : isDark ? "hover:bg-slate-600 text-slate-300" : "hover:bg-gray-200 text-gray-700"
          }`}
          title="Align Right"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="9" y1="12" x2="21" y2="12" />
            <line x1="6" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <div className={`w-px h-6 self-center ${isDark ? "bg-slate-600" : "bg-gray-300"}`} />

        {/* Color picker */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowColorPicker(!showColorPicker)}
            className={`p-2 rounded ${
              isDark ? "hover:bg-slate-600 text-slate-300" : "hover:bg-gray-200 text-gray-700"
            }`}
            title="Text Color"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11 2L5.5 16h2.25l1.12-3h6.25l1.12 3h2.25L13 2h-2zm-1.38 9L12 4.67 14.38 11H9.62z" />
              <rect x="3" y="18" width="18" height="4" rx="1" fill="currentColor" />
            </svg>
          </button>

          {showColorPicker && (
            <div className={`absolute top-full left-0 mt-1 p-2 rounded-lg shadow-xl z-50 ${
              isDark ? "bg-slate-800 border border-slate-700" : "bg-white border border-gray-200"
            }`}>
              <div className="grid grid-cols-6 gap-1 w-36">
                {colorPresets.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => {
                      editor.chain().focus().setColor(color).run();
                      setShowColorPicker(false);
                    }}
                    className="w-5 h-5 rounded border border-gray-300 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().unsetColor().run();
                  setShowColorPicker(false);
                }}
                className={`w-full mt-2 px-2 py-1 text-xs rounded ${
                  isDark ? "bg-slate-700 hover:bg-slate-600 text-slate-300" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                }`}
              >
                Reset Color
              </button>
            </div>
          )}
        </div>

        <div className={`w-px h-6 self-center ${isDark ? "bg-slate-600" : "bg-gray-300"}`} />

        {/* Link */}
        <button
          type="button"
          onClick={() => {
            const previousUrl = editor.getAttributes("link").href || "";
            setLinkUrl(previousUrl);
            setShowLinkModal(true);
          }}
          className={`p-2 rounded ${
            editor.isActive("link")
              ? "bg-blue-500 text-white"
              : isDark ? "hover:bg-slate-600 text-slate-300" : "hover:bg-gray-200 text-gray-700"
          }`}
          title="Add Link"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        </button>

        {/* Image upload */}
        <label className={`p-2 rounded cursor-pointer ${
          isDark ? "hover:bg-slate-600 text-slate-300" : "hover:bg-gray-200 text-gray-700"
        } ${isUploadingImage ? "opacity-50 cursor-wait" : ""}`}>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={isUploadingImage}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageUpload(file);
              e.target.value = "";
            }}
          />
          {isUploadingImage ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          )}
        </label>

        {/* GIF picker */}
        <button
          type="button"
          onClick={() => setShowGiphyPicker(!showGiphyPicker)}
          className={`p-2 rounded text-xs font-bold ${
            showGiphyPicker
              ? "bg-blue-500 text-white"
              : isDark ? "hover:bg-slate-600 text-slate-300" : "hover:bg-gray-200 text-gray-700"
          }`}
          title="Add GIF"
        >
          GIF
        </button>
      </div>

      {/* Editor */}
      <div className={`rounded-lg border overflow-hidden ${
        isDark ? "bg-slate-700 border-slate-600" : "bg-white border-gray-300"
      }`}>
        <EditorContent
          editor={editor}
          className={`${isDark ? "text-white" : "text-gray-900"}`}
        />
      </div>

      {/* Giphy Picker */}
      {showGiphyPicker && (
        <div className={`p-3 rounded-lg border ${
          isDark ? "bg-slate-700 border-slate-600" : "bg-gray-100 border-gray-200"
        }`}>
          <div className="mb-3">
            <input
              type="text"
              value={giphySearch}
              onChange={(e) => setGiphySearch(e.target.value)}
              placeholder="Search GIFs..."
              className={`w-full px-3 py-2 rounded-lg border ${
                isDark
                  ? "bg-slate-800 border-slate-600 text-white placeholder-slate-400"
                  : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
              } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            />
          </div>
          <div className="h-48 overflow-y-auto">
            <Grid
              key={giphySearch}
              width={400}
              columns={3}
              fetchGifs={fetchGifs}
              onGifClick={handleGiphySelect}
              noLink
            />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className={`text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>
              Powered by GIPHY
            </span>
            <button
              type="button"
              onClick={() => {
                setShowGiphyPicker(false);
                setGiphySearch("");
              }}
              className={`text-xs px-2 py-1 rounded ${
                isDark ? "bg-slate-600 hover:bg-slate-500 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-700"
              }`}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className={`w-full max-w-sm mx-4 rounded-xl shadow-2xl ${isDark ? "bg-slate-800" : "bg-white"}`}>
            <div className={`px-6 py-4 border-b ${isDark ? "border-slate-700" : "border-gray-200"}`}>
              <h3 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                Add Link
              </h3>
            </div>
            <div className="p-6">
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                autoFocus
                className={`w-full px-3 py-2 rounded-lg border ${
                  isDark
                    ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                onKeyDown={(e) => e.key === "Enter" && handleSetLink()}
              />
            </div>
            <div className={`px-6 py-4 border-t ${isDark ? "border-slate-700" : "border-gray-200"} flex justify-end gap-3`}>
              <button
                type="button"
                onClick={() => {
                  setShowLinkModal(false);
                  setLinkUrl("");
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  isDark ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSetLink}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
              >
                {editor.isActive("link") ? "Update Link" : "Add Link"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview */}
      <div className={`p-3 rounded-lg border ${isDark ? "bg-slate-800 border-slate-700" : "bg-gray-50 border-gray-200"}`}>
        <div className={`text-xs font-medium mb-2 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
          Preview
        </div>
        <div
          className={`prose prose-sm max-w-none ${isDark ? "prose-invert" : ""}`}
          dangerouslySetInnerHTML={{ __html: editor.getHTML() }}
        />
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium flex items-center gap-2"
        >
          {isSaving && (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {isSaving ? "Saving..." : "Save Signature"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            isDark ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
          }`}
        >
          Cancel
        </button>
      </div>

      <style jsx global>{`
        .signature-image {
          max-width: 200px;
          max-height: 100px;
          display: inline-block;
        }
        .ProseMirror {
          min-height: 120px;
        }
        .ProseMirror p {
          margin: 0.5em 0;
        }
        .ProseMirror:focus {
          outline: none;
        }
        .ProseMirror img {
          max-width: 200px;
          max-height: 100px;
        }
      `}</style>
    </div>
  );
}
