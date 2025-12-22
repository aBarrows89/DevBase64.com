"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "../auth-context";
import Protected from "../protected";
import { Id } from "../../convex/_generated/dataModel";

type TabType = "inbox" | "sent";

export default function SuggestionsPage() {
  return (
    <Protected>
      <SuggestionsContent />
    </Protected>
  );
}

function SuggestionsContent() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("inbox");
  const [showNewSuggestion, setShowNewSuggestion] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<any>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showDenyModal, setShowDenyModal] = useState(false);

  // Form state for new suggestion
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState("medium");
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  // Form state for approve/deny
  const [estimatedTimeline, setEstimatedTimeline] = useState("");
  const [denialReason, setDenialReason] = useState("");

  // Queries
  const allUsers = useQuery(api.auth.getAllUsers) || [];
  const inboxSuggestions = useQuery(
    api.projectSuggestions.getInbox,
    user?._id ? { userId: user._id as Id<"users"> } : "skip"
  );
  const outboxSuggestions = useQuery(
    api.projectSuggestions.getOutbox,
    user?._id ? { userId: user._id as Id<"users"> } : "skip"
  );

  // Mutations
  const createSuggestion = useMutation(api.projectSuggestions.createWithUser);
  const approveSuggestion = useMutation(api.projectSuggestions.approve);
  const denySuggestion = useMutation(api.projectSuggestions.deny);
  const removeSuggestion = useMutation(api.projectSuggestions.remove);

  const suggestions = activeTab === "inbox" ? inboxSuggestions : outboxSuggestions;
  const pendingInboxCount = inboxSuggestions?.filter((s) => s.status === "pending").length || 0;

  const handleCreateSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?._id || !selectedUserId || !newTitle.trim() || !newDescription.trim()) return;

    try {
      await createSuggestion({
        suggestedBy: user._id as Id<"users">,
        suggestedTo: selectedUserId as Id<"users">,
        title: newTitle.trim(),
        description: newDescription.trim(),
        priority: newPriority,
      });
      setShowNewSuggestion(false);
      setNewTitle("");
      setNewDescription("");
      setNewPriority("medium");
      setSelectedUserId("");
    } catch (error) {
      console.error("Failed to create suggestion:", error);
    }
  };

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?._id || !selectedSuggestion || !estimatedTimeline.trim()) return;

    try {
      await approveSuggestion({
        suggestionId: selectedSuggestion._id,
        reviewedBy: user._id as Id<"users">,
        estimatedTimeline: estimatedTimeline.trim(),
      });
      setShowApproveModal(false);
      setSelectedSuggestion(null);
      setEstimatedTimeline("");
    } catch (error) {
      console.error("Failed to approve suggestion:", error);
    }
  };

  const handleDeny = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?._id || !selectedSuggestion || !denialReason.trim()) return;

    try {
      await denySuggestion({
        suggestionId: selectedSuggestion._id,
        reviewedBy: user._id as Id<"users">,
        denialReason: denialReason.trim(),
      });
      setShowDenyModal(false);
      setSelectedSuggestion(null);
      setDenialReason("");
    } catch (error) {
      console.error("Failed to deny suggestion:", error);
    }
  };

  const handleDelete = async (suggestionId: Id<"projectSuggestions">) => {
    if (!user?._id) return;
    if (!confirm("Are you sure you want to delete this suggestion?")) return;

    try {
      await removeSuggestion({
        suggestionId,
        userId: user._id as Id<"users">,
      });
    } catch (error) {
      console.error("Failed to delete suggestion:", error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "text-red-400 bg-red-500/10";
      case "high":
        return "text-orange-400 bg-orange-500/10";
      case "medium":
        return "text-yellow-400 bg-yellow-500/10";
      case "low":
        return "text-green-400 bg-green-500/10";
      default:
        return "text-slate-400 bg-slate-500/10";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "text-yellow-400 bg-yellow-500/10";
      case "approved":
        return "text-green-400 bg-green-500/10";
      case "denied":
        return "text-red-400 bg-red-500/10";
      default:
        return "text-slate-400 bg-slate-500/10";
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Project Suggestions</h1>
            <p className="text-slate-400 mt-1">Suggest projects to team members</p>
          </div>
          <button
            onClick={() => setShowNewSuggestion(true)}
            className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
          >
            + New Suggestion
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab("inbox")}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === "inbox"
                ? "bg-cyan-600 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            Inbox
            {pendingInboxCount > 0 && (
              <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {pendingInboxCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("sent")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === "sent"
                ? "bg-cyan-600 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            Sent
          </button>
        </div>

        {/* Suggestions List */}
        <div className="space-y-4">
          {!suggestions || suggestions.length === 0 ? (
            <div className="bg-slate-800 rounded-lg p-8 text-center">
              <p className="text-slate-400">
                {activeTab === "inbox"
                  ? "No suggestions in your inbox"
                  : "You haven't sent any suggestions yet"}
              </p>
            </div>
          ) : (
            suggestions.map((suggestion) => (
              <div
                key={suggestion._id}
                className="bg-slate-800 rounded-lg p-6 border border-slate-700"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">{suggestion.title}</h3>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(
                          suggestion.priority || "medium"
                        )}`}
                      >
                        {suggestion.priority || "medium"}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(
                          suggestion.status
                        )}`}
                      >
                        {suggestion.status}
                      </span>
                    </div>
                    <p className="text-slate-300 mb-3">{suggestion.description}</p>
                    <div className="text-sm text-slate-400">
                      {activeTab === "inbox" ? (
                        <span>
                          From: {(suggestion as any).suggestedByUser?.name || "Unknown"}
                        </span>
                      ) : (
                        <span>
                          To: {(suggestion as any).suggestedToUser?.name || "Unknown"}
                        </span>
                      )}
                      <span className="mx-2">|</span>
                      <span>
                        {new Date(suggestion.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Show approval details */}
                    {suggestion.status === "approved" && suggestion.estimatedTimeline && (
                      <div className="mt-3 p-3 bg-green-500/10 rounded border border-green-500/20">
                        <p className="text-green-400 text-sm">
                          <strong>Estimated Timeline:</strong> {suggestion.estimatedTimeline}
                        </p>
                        {suggestion.reviewedByUser && (
                          <p className="text-green-400/70 text-xs mt-1">
                            Approved by {suggestion.reviewedByUser.name} on{" "}
                            {new Date(suggestion.reviewedAt!).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Show denial reason */}
                    {suggestion.status === "denied" && suggestion.denialReason && (
                      <div className="mt-3 p-3 bg-red-500/10 rounded border border-red-500/20">
                        <p className="text-red-400 text-sm">
                          <strong>Reason:</strong> {suggestion.denialReason}
                        </p>
                        {suggestion.reviewedByUser && (
                          <p className="text-red-400/70 text-xs mt-1">
                            Denied by {suggestion.reviewedByUser.name} on{" "}
                            {new Date(suggestion.reviewedAt!).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 ml-4">
                    {activeTab === "inbox" && suggestion.status === "pending" && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedSuggestion(suggestion);
                            setShowApproveModal(true);
                          }}
                          className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            setSelectedSuggestion(suggestion);
                            setShowDenyModal(true);
                          }}
                          className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                        >
                          Deny
                        </button>
                      </>
                    )}
                    {activeTab === "sent" && suggestion.status === "pending" && (
                      <button
                        onClick={() => handleDelete(suggestion._id)}
                        className="px-3 py-1.5 bg-slate-700 text-slate-300 text-sm rounded hover:bg-slate-600 transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* New Suggestion Modal */}
      {showNewSuggestion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-lg mx-4 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">New Project Suggestion</h2>
            <form onSubmit={handleCreateSuggestion} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Suggest To
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-cyan-500 focus:outline-none"
                  required
                >
                  <option value="">Select a person...</option>
                  {allUsers
                    .filter((u) => u._id !== user?._id)
                    .map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-cyan-500 focus:outline-none"
                  placeholder="Project title..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-cyan-500 focus:outline-none resize-none"
                  placeholder="Describe the project idea..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Priority
                </label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-cyan-500 focus:outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewSuggestion(false)}
                  className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
                >
                  Send Suggestion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && selectedSuggestion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-lg mx-4 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Approve Suggestion</h2>
            <p className="text-slate-300 mb-4">
              Approving: <strong>{selectedSuggestion.title}</strong>
            </p>
            <form onSubmit={handleApprove} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Estimated Timeline
                </label>
                <input
                  type="text"
                  value={estimatedTimeline}
                  onChange={(e) => setEstimatedTimeline(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-cyan-500 focus:outline-none"
                  placeholder="e.g., 2 weeks, 1 month, Q2 2025..."
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowApproveModal(false);
                    setSelectedSuggestion(null);
                    setEstimatedTimeline("");
                  }}
                  className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Approve & Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deny Modal */}
      {showDenyModal && selectedSuggestion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-lg mx-4 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Deny Suggestion</h2>
            <p className="text-slate-300 mb-4">
              Denying: <strong>{selectedSuggestion.title}</strong>
            </p>
            <form onSubmit={handleDeny} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Reason for Denial
                </label>
                <textarea
                  value={denialReason}
                  onChange={(e) => setDenialReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-cyan-500 focus:outline-none resize-none"
                  placeholder="Explain why this suggestion is being denied..."
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDenyModal(false);
                    setSelectedSuggestion(null);
                    setDenialReason("");
                  }}
                  className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Deny Suggestion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
