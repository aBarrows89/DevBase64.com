"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Protected from "../protected";
import Sidebar from "@/components/Sidebar";

const STATUS_OPTIONS = [
  { value: "new", label: "New", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  { value: "read", label: "Read", color: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
  { value: "replied", label: "Replied", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  { value: "archived", label: "Archived", color: "bg-slate-600/20 text-slate-500 border-slate-600/30" },
];

interface ContactMessage {
  _id: Id<"contactMessages">;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  subject: string;
  message: string;
  status: string;
  notes?: string;
  repliedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export default function ContactMessagesPage() {
  const messages = useQuery(api.contactMessages.getAll);
  const stats = useQuery(api.contactMessages.getStats);
  const updateStatus = useMutation(api.contactMessages.updateStatus);
  const deleteMessage = useMutation(api.contactMessages.remove);

  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<ContactMessage | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [notes, setNotes] = useState("");

  const handleStatusChange = async (message: ContactMessage, newStatus: string) => {
    await updateStatus({
      messageId: message._id,
      status: newStatus,
    });
  };

  const handleSaveNotes = async () => {
    if (selectedMessage) {
      await updateStatus({
        messageId: selectedMessage._id,
        status: selectedMessage.status,
        notes,
      });
    }
  };

  const handleDelete = async () => {
    if (showDeleteConfirm) {
      await deleteMessage({ messageId: showDeleteConfirm._id });
      setShowDeleteConfirm(null);
      if (selectedMessage?._id === showDeleteConfirm._id) {
        setSelectedMessage(null);
      }
    }
  };

  const filteredMessages = messages?.filter((msg) => {
    if (filterStatus !== "all" && msg.status !== filterStatus) return false;
    return true;
  });

  const getStatusBadge = (status: string) => {
    const statusOption = STATUS_OPTIONS.find((s) => s.value === status);
    if (!statusOption) {
      return <span className="px-2 py-1 text-xs rounded-full bg-slate-500/20 text-slate-400">{status}</span>;
    }
    return (
      <span className={`px-2 py-1 text-xs rounded-full border ${statusOption.color}`}>
        {statusOption.label}
      </span>
    );
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Protected>
      <div className="min-h-screen bg-slate-900 text-white flex">
        <Sidebar />
        <main className="flex-1 p-8 overflow-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold">Contact Messages</h1>
              <p className="text-slate-400 mt-1">Messages from IE Tire website visitors</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-5 gap-4 mb-8">
            <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
              <p className="text-slate-400 text-sm">Total</p>
              <p className="text-2xl font-bold">{stats?.total || 0}</p>
            </div>
            <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
              <p className="text-slate-400 text-sm">New</p>
              <p className="text-2xl font-bold text-blue-400">{stats?.new || 0}</p>
            </div>
            <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
              <p className="text-slate-400 text-sm">Read</p>
              <p className="text-2xl font-bold text-slate-400">{stats?.read || 0}</p>
            </div>
            <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
              <p className="text-slate-400 text-sm">Replied</p>
              <p className="text-2xl font-bold text-green-400">{stats?.replied || 0}</p>
            </div>
            <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
              <p className="text-slate-400 text-sm">Archived</p>
              <p className="text-2xl font-bold text-slate-500">{stats?.archived || 0}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-cyan-500"
            >
              <option value="all">All Statuses</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-6">
            {/* Messages List */}
            <div className="flex-1">
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
                {filteredMessages?.map((message) => (
                  <div
                    key={message._id}
                    onClick={() => {
                      setSelectedMessage(message);
                      setNotes(message.notes || "");
                      if (message.status === "new") {
                        handleStatusChange(message, "read");
                      }
                    }}
                    className={`p-4 border-b border-slate-700 cursor-pointer transition-colors ${
                      selectedMessage?._id === message._id
                        ? "bg-cyan-500/10 border-l-2 border-l-cyan-500"
                        : "hover:bg-slate-800/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium truncate">{message.name}</p>
                          {getStatusBadge(message.status)}
                        </div>
                        <p className="text-sm text-slate-400 truncate">{message.subject}</p>
                        <p className="text-xs text-slate-500 mt-1">{message.email}</p>
                      </div>
                      <p className="text-xs text-slate-500 whitespace-nowrap">
                        {formatDate(message.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}

                {filteredMessages?.length === 0 && (
                  <div className="text-center py-12 text-slate-400">
                    No messages found
                  </div>
                )}
              </div>
            </div>

            {/* Message Detail */}
            {selectedMessage && (
              <div className="w-[500px] bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold">{selectedMessage.name}</h2>
                    <p className="text-slate-400">{selectedMessage.email}</p>
                    {selectedMessage.phone && (
                      <p className="text-slate-400">{selectedMessage.phone}</p>
                    )}
                    {selectedMessage.company && (
                      <p className="text-slate-500 text-sm">{selectedMessage.company}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setShowDeleteConfirm(selectedMessage)}
                    className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                    title="Delete message"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>

                <div className="mb-6">
                  <p className="text-sm text-slate-500 mb-2">Subject</p>
                  <p className="font-medium">{selectedMessage.subject}</p>
                </div>

                <div className="mb-6">
                  <p className="text-sm text-slate-500 mb-2">Message</p>
                  <div className="p-4 bg-slate-900/50 rounded-lg">
                    <p className="whitespace-pre-wrap">{selectedMessage.message}</p>
                  </div>
                </div>

                <div className="mb-6">
                  <p className="text-sm text-slate-500 mb-2">Status</p>
                  <select
                    value={selectedMessage.status}
                    onChange={(e) => handleStatusChange(selectedMessage, e.target.value)}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-cyan-500"
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-6">
                  <p className="text-sm text-slate-500 mb-2">Internal Notes</p>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Add notes about this message..."
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-cyan-500 resize-none"
                  />
                  <button
                    onClick={handleSaveNotes}
                    className="mt-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg transition-colors text-sm"
                  >
                    Save Notes
                  </button>
                </div>

                <div className="flex gap-3">
                  <a
                    href={`mailto:${selectedMessage.email}?subject=Re: ${selectedMessage.subject}`}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg transition-colors"
                    onClick={() => handleStatusChange(selectedMessage, "replied")}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Reply via Email
                  </a>
                  {selectedMessage.phone && (
                    <a
                      href={`tel:${selectedMessage.phone}`}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                      title="Call"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </a>
                  )}
                </div>

                <p className="text-xs text-slate-500 mt-4 text-center">
                  Received {formatDate(selectedMessage.createdAt)}
                </p>
              </div>
            )}
          </div>

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 w-full max-w-md">
                <h2 className="text-xl font-bold mb-4">Delete Message</h2>
                <p className="text-slate-300 mb-6">
                  Are you sure you want to delete the message from <strong>{showDeleteConfirm.name}</strong>? This action cannot be undone.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(null)}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </Protected>
  );
}
