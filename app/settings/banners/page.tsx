"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Protected from "../../protected";
import Sidebar, { MobileHeader } from "@/components/Sidebar";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useTheme } from "../../theme-context";
import { useAuth } from "../../auth-context";

const BANNER_TYPES = [
  { value: "info", label: "Info", color: "bg-blue-500" },
  { value: "warning", label: "Warning", color: "bg-amber-500" },
  { value: "error", label: "Error", color: "bg-red-500" },
  { value: "success", label: "Success", color: "bg-green-500" },
];

function BannersContent() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const router = useRouter();
  const { user } = useAuth();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<string | null>(null);

  // Form state
  const [message, setMessage] = useState("");
  const [bannerType, setBannerType] = useState("info");
  const [showOnMobile, setShowOnMobile] = useState(true);
  const [showOnDesktop, setShowOnDesktop] = useState(true);
  const [dismissible, setDismissible] = useState(true);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [expiresIn, setExpiresIn] = useState<string>(""); // hours

  const banners = useQuery(api.systemBanners.getAll);
  const createBanner = useMutation(api.systemBanners.create);
  const updateBanner = useMutation(api.systemBanners.update);
  const toggleBanner = useMutation(api.systemBanners.toggle);
  const removeBanner = useMutation(api.systemBanners.remove);

  // Check if user is super_admin
  if (user?.role !== "super_admin" && user?.role !== "admin") {
    return (
      <div className={`flex h-screen ${isDark ? "bg-slate-900" : "bg-[#f2f2f7]"}`}>
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
              Access Denied
            </h1>
            <p className={`mt-2 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
              Only super admins can manage system banners.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const resetForm = () => {
    setMessage("");
    setBannerType("info");
    setShowOnMobile(true);
    setShowOnDesktop(true);
    setDismissible(true);
    setLinkUrl("");
    setLinkText("");
    setExpiresIn("");
    setEditingBanner(null);
  };

  const handleCreate = async () => {
    if (!user || !message.trim()) return;

    try {
      const expiresAt = expiresIn
        ? Date.now() + parseInt(expiresIn) * 60 * 60 * 1000
        : undefined;

      await createBanner({
        message: message.trim(),
        type: bannerType,
        showOnMobile,
        showOnDesktop,
        dismissible,
        linkUrl: linkUrl.trim() || undefined,
        linkText: linkText.trim() || undefined,
        expiresAt,
        userId: user._id as Id<"users">,
      });

      resetForm();
      setShowCreateModal(false);
    } catch (error) {
      console.error("Failed to create banner:", error);
      alert("Failed to create banner");
    }
  };

  const handleUpdate = async () => {
    if (!editingBanner || !message.trim()) return;

    try {
      const expiresAt = expiresIn
        ? Date.now() + parseInt(expiresIn) * 60 * 60 * 1000
        : undefined;

      await updateBanner({
        bannerId: editingBanner as Id<"systemBanners">,
        message: message.trim(),
        type: bannerType,
        showOnMobile,
        showOnDesktop,
        dismissible,
        linkUrl: linkUrl.trim() || undefined,
        linkText: linkText.trim() || undefined,
        expiresAt,
      });

      resetForm();
      setShowCreateModal(false);
    } catch (error) {
      console.error("Failed to update banner:", error);
      alert("Failed to update banner");
    }
  };

  const handleEdit = (banner: NonNullable<typeof banners>[0]) => {
    setEditingBanner(banner._id);
    setMessage(banner.message);
    setBannerType(banner.type);
    setShowOnMobile(banner.showOnMobile);
    setShowOnDesktop(banner.showOnDesktop);
    setDismissible(banner.dismissible);
    setLinkUrl(banner.linkUrl || "");
    setLinkText(banner.linkText || "");
    setExpiresIn("");
    setShowCreateModal(true);
  };

  const handleToggle = async (bannerId: string) => {
    try {
      await toggleBanner({ bannerId: bannerId as Id<"systemBanners"> });
    } catch (error) {
      console.error("Failed to toggle banner:", error);
    }
  };

  const handleDelete = async (bannerId: string) => {
    if (!confirm("Are you sure you want to delete this banner?")) return;
    try {
      await removeBanner({ bannerId: bannerId as Id<"systemBanners"> });
    } catch (error) {
      console.error("Failed to delete banner:", error);
    }
  };

  const getTypeColor = (type: string) => {
    return BANNER_TYPES.find((t) => t.value === type)?.color || "bg-blue-500";
  };

  return (
    <div className={`flex h-screen ${isDark ? "bg-slate-900" : "bg-[#f2f2f7]"}`}>
      <Sidebar />

      <main className="flex-1 overflow-auto">
        <MobileHeader />
        {/* Header */}
        <header className={`sticky top-0 z-10 border-b px-4 sm:px-8 py-4 ${isDark ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/settings"
                className={`p-2 -ml-2 rounded-lg transition-colors ${isDark ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-100 text-gray-500"}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                  System Banners
                </h1>
                <p className={`text-sm mt-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                  Create notification banners visible across all pages
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                resetForm();
                setShowCreateModal(true);
              }}
              className={`px-4 py-2 rounded-lg font-medium text-white ${isDark ? "bg-cyan-500 hover:bg-cyan-600" : "bg-blue-600 hover:bg-blue-700"}`}
            >
              Create Banner
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="p-4 sm:p-8">
          {banners && banners.length > 0 ? (
            <div className="space-y-4">
              {banners.map((banner) => (
                <div
                  key={banner._id}
                  className={`rounded-xl p-4 ${isDark ? "bg-slate-800 border border-slate-700" : "bg-white border border-gray-200"}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`w-3 h-3 rounded-full ${getTypeColor(banner.type)}`} />
                        <span className={`text-xs font-medium uppercase ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                          {banner.type}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${banner.isActive ? "bg-green-500/20 text-green-400" : "bg-slate-500/20 text-slate-400"}`}>
                          {banner.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                        {banner.message}
                      </p>
                      <div className={`flex flex-wrap gap-3 mt-2 text-xs ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                        <span>{banner.showOnMobile ? "Mobile" : ""}{banner.showOnMobile && banner.showOnDesktop ? " + " : ""}{banner.showOnDesktop ? "Desktop" : ""}</span>
                        <span>{banner.dismissible ? "Dismissible" : "Persistent"}</span>
                        {banner.expiresAt && (
                          <span>Expires: {new Date(banner.expiresAt).toLocaleString()}</span>
                        )}
                        <span>Created by {banner.createdByName}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggle(banner._id)}
                        className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                          banner.isActive
                            ? isDark ? "bg-slate-700 text-slate-300 hover:bg-slate-600" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            : isDark ? "bg-green-500/20 text-green-400 hover:bg-green-500/30" : "bg-green-100 text-green-700 hover:bg-green-200"
                        }`}
                      >
                        {banner.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => handleEdit(banner)}
                        className={`p-2 rounded-lg transition-colors ${isDark ? "text-slate-400 hover:bg-slate-700 hover:text-white" : "text-gray-400 hover:bg-gray-100 hover:text-gray-700"}`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(banner._id)}
                        className={`p-2 rounded-lg transition-colors ${isDark ? "text-red-400 hover:bg-red-500/20" : "text-red-500 hover:bg-red-50"}`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={`rounded-xl p-12 text-center ${isDark ? "bg-slate-800 border border-slate-700" : "bg-white border border-gray-200"}`}>
              <svg className={`w-16 h-16 mx-auto mb-4 ${isDark ? "text-slate-600" : "text-gray-300"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
              <h2 className={`text-xl font-semibold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                No Banners
              </h2>
              <p className={`mb-6 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                Create a banner to display important messages to all users.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className={`px-4 py-2 rounded-lg font-medium text-white ${isDark ? "bg-cyan-500 hover:bg-cyan-600" : "bg-blue-600 hover:bg-blue-700"}`}
              >
                Create Your First Banner
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={`w-full max-w-lg rounded-2xl ${isDark ? "bg-slate-800" : "bg-white"}`}>
            <div className={`p-6 border-b ${isDark ? "border-slate-700" : "border-gray-200"}`}>
              <h2 className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                {editingBanner ? "Edit Banner" : "Create Banner"}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              {/* Message */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                  Message *
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={2}
                  className={`w-full px-4 py-3 rounded-lg border ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                  placeholder="Enter your banner message..."
                />
              </div>

              {/* Type */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                  Type
                </label>
                <div className="flex gap-2">
                  {BANNER_TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setBannerType(type.value)}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                        bannerType === type.value
                          ? `${type.color} text-white`
                          : isDark
                            ? "bg-slate-700 text-slate-300 hover:bg-slate-600"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Display Options */}
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showOnMobile}
                    onChange={(e) => setShowOnMobile(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span className={`text-sm ${isDark ? "text-slate-300" : "text-gray-700"}`}>Show on Mobile</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showOnDesktop}
                    onChange={(e) => setShowOnDesktop(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span className={`text-sm ${isDark ? "text-slate-300" : "text-gray-700"}`}>Show on Desktop</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={dismissible}
                    onChange={(e) => setDismissible(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span className={`text-sm ${isDark ? "text-slate-300" : "text-gray-700"}`}>Dismissible</span>
                </label>
              </div>

              {/* Link */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                    Link URL (optional)
                  </label>
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    className={`w-full px-4 py-2 rounded-lg border ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                    Link Text
                  </label>
                  <input
                    type="text"
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                    className={`w-full px-4 py-2 rounded-lg border ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                    placeholder="Learn more"
                  />
                </div>
              </div>

              {/* Expiry */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                  Auto-expire in (hours, optional)
                </label>
                <input
                  type="number"
                  value={expiresIn}
                  onChange={(e) => setExpiresIn(e.target.value)}
                  min="1"
                  className={`w-full px-4 py-2 rounded-lg border ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                  placeholder="24"
                />
              </div>
            </div>
            <div className={`p-6 border-t flex gap-3 ${isDark ? "border-slate-700" : "border-gray-200"}`}>
              <button
                onClick={() => {
                  resetForm();
                  setShowCreateModal(false);
                }}
                className={`flex-1 py-3 rounded-lg font-medium ${isDark ? "bg-slate-700 text-white hover:bg-slate-600" : "bg-gray-100 text-gray-900 hover:bg-gray-200"}`}
              >
                Cancel
              </button>
              <button
                onClick={editingBanner ? handleUpdate : handleCreate}
                disabled={!message.trim()}
                className={`flex-1 py-3 rounded-lg font-medium text-white disabled:opacity-50 ${isDark ? "bg-cyan-500 hover:bg-cyan-600" : "bg-blue-600 hover:bg-blue-700"}`}
              >
                {editingBanner ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BannersPage() {
  return (
    <Protected>
      <BannersContent />
    </Protected>
  );
}
