"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Protected from "../protected";
import Sidebar from "@/components/Sidebar";

const STATUS_OPTIONS = [
  { value: "new", label: "New", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  { value: "contacted", label: "Contacted", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  { value: "qualified", label: "Qualified", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  { value: "approved", label: "Approved", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  { value: "rejected", label: "Rejected", color: "bg-red-500/20 text-red-400 border-red-500/30" },
];

const BUSINESS_TYPES = [
  { value: "tire_shop", label: "Tire Shop" },
  { value: "auto_dealer", label: "Auto Dealer" },
  { value: "fleet", label: "Fleet Services" },
  { value: "other", label: "Other" },
];

interface DealerInquiry {
  _id: Id<"dealerInquiries">;
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  businessType?: string;
  yearsInBusiness?: number;
  estimatedMonthlyVolume?: string;
  currentSuppliers?: string;
  message?: string;
  status: string;
  notes?: string;
  assignedTo?: Id<"users">;
  followUpDate?: string;
  createdAt: number;
  updatedAt: number;
}

export default function DealerInquiriesPage() {
  const inquiries = useQuery(api.dealerInquiries.getAll);
  const stats = useQuery(api.dealerInquiries.getStats);
  const users = useQuery(api.auth.getAllUsers);
  const updateStatus = useMutation(api.dealerInquiries.updateStatus);
  const assignInquiry = useMutation(api.dealerInquiries.assign);
  const setFollowUp = useMutation(api.dealerInquiries.setFollowUp);
  const deleteInquiry = useMutation(api.dealerInquiries.remove);

  const [selectedInquiry, setSelectedInquiry] = useState<DealerInquiry | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<DealerInquiry | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [notes, setNotes] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");

  const handleStatusChange = async (inquiry: DealerInquiry, newStatus: string) => {
    await updateStatus({
      inquiryId: inquiry._id,
      status: newStatus,
    });
  };

  const handleSaveNotes = async () => {
    if (selectedInquiry) {
      await updateStatus({
        inquiryId: selectedInquiry._id,
        status: selectedInquiry.status,
        notes,
      });
    }
  };

  const handleAssign = async (inquiry: DealerInquiry, userId: Id<"users"> | undefined) => {
    await assignInquiry({
      inquiryId: inquiry._id,
      userId,
    });
  };

  const handleSetFollowUp = async () => {
    if (selectedInquiry) {
      await setFollowUp({
        inquiryId: selectedInquiry._id,
        followUpDate: followUpDate || undefined,
      });
    }
  };

  const handleDelete = async () => {
    if (showDeleteConfirm) {
      await deleteInquiry({ inquiryId: showDeleteConfirm._id });
      setShowDeleteConfirm(null);
      if (selectedInquiry?._id === showDeleteConfirm._id) {
        setSelectedInquiry(null);
      }
    }
  };

  const filteredInquiries = inquiries?.filter((inquiry) => {
    if (filterStatus !== "all" && inquiry.status !== filterStatus) return false;
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

  const getBusinessTypeLabel = (type?: string) => {
    if (!type) return "Not specified";
    const businessType = BUSINESS_TYPES.find((b) => b.value === type);
    return businessType?.label || type;
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

  const formatAddress = (inquiry: DealerInquiry) => {
    const parts = [inquiry.address, inquiry.city, inquiry.state, inquiry.zipCode].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  };

  return (
    <Protected>
      <div className="min-h-screen bg-slate-900 text-white flex">
        <Sidebar />
        <main className="flex-1 p-8 overflow-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold">Dealer Inquiries</h1>
              <p className="text-slate-400 mt-1">Potential dealer applications from IE Tire website</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-6 gap-4 mb-8">
            <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
              <p className="text-slate-400 text-sm">Total</p>
              <p className="text-2xl font-bold">{stats?.total || 0}</p>
            </div>
            <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
              <p className="text-slate-400 text-sm">New</p>
              <p className="text-2xl font-bold text-blue-400">{stats?.new || 0}</p>
            </div>
            <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
              <p className="text-slate-400 text-sm">Contacted</p>
              <p className="text-2xl font-bold text-yellow-400">{stats?.contacted || 0}</p>
            </div>
            <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
              <p className="text-slate-400 text-sm">Qualified</p>
              <p className="text-2xl font-bold text-purple-400">{stats?.qualified || 0}</p>
            </div>
            <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
              <p className="text-slate-400 text-sm">Approved</p>
              <p className="text-2xl font-bold text-green-400">{stats?.approved || 0}</p>
            </div>
            <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
              <p className="text-slate-400 text-sm">Rejected</p>
              <p className="text-2xl font-bold text-red-400">{stats?.rejected || 0}</p>
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
            {/* Inquiries List */}
            <div className="flex-1">
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
                {filteredInquiries?.map((inquiry) => (
                  <div
                    key={inquiry._id}
                    onClick={() => {
                      setSelectedInquiry(inquiry);
                      setNotes(inquiry.notes || "");
                      setFollowUpDate(inquiry.followUpDate || "");
                      if (inquiry.status === "new") {
                        handleStatusChange(inquiry, "contacted");
                      }
                    }}
                    className={`p-4 border-b border-slate-700 cursor-pointer transition-colors ${
                      selectedInquiry?._id === inquiry._id
                        ? "bg-cyan-500/10 border-l-2 border-l-cyan-500"
                        : "hover:bg-slate-800/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium truncate">{inquiry.businessName}</p>
                          {getStatusBadge(inquiry.status)}
                        </div>
                        <p className="text-sm text-slate-400 truncate">{inquiry.contactName}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <p className="text-xs text-slate-500">{inquiry.email}</p>
                          {inquiry.businessType && (
                            <span className="text-xs text-slate-500 px-2 py-0.5 bg-slate-700/50 rounded">
                              {getBusinessTypeLabel(inquiry.businessType)}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 whitespace-nowrap">
                        {formatDate(inquiry.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}

                {filteredInquiries?.length === 0 && (
                  <div className="text-center py-12 text-slate-400">
                    No dealer inquiries found
                  </div>
                )}
              </div>
            </div>

            {/* Inquiry Detail */}
            {selectedInquiry && (
              <div className="w-[550px] bg-slate-800/50 border border-slate-700 rounded-lg p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold">{selectedInquiry.businessName}</h2>
                    <p className="text-slate-400">{selectedInquiry.contactName}</p>
                  </div>
                  <button
                    onClick={() => setShowDeleteConfirm(selectedInquiry)}
                    className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                    title="Delete inquiry"
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

                {/* Contact Info */}
                <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-slate-900/50 rounded-lg">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Email</p>
                    <p className="text-sm">{selectedInquiry.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Phone</p>
                    <p className="text-sm">{selectedInquiry.phone}</p>
                  </div>
                  {formatAddress(selectedInquiry) && (
                    <div className="col-span-2">
                      <p className="text-xs text-slate-500 mb-1">Address</p>
                      <p className="text-sm">{formatAddress(selectedInquiry)}</p>
                    </div>
                  )}
                </div>

                {/* Business Info */}
                <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-slate-900/50 rounded-lg">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Business Type</p>
                    <p className="text-sm">{getBusinessTypeLabel(selectedInquiry.businessType)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Years in Business</p>
                    <p className="text-sm">{selectedInquiry.yearsInBusiness || "Not specified"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Est. Monthly Volume</p>
                    <p className="text-sm">{selectedInquiry.estimatedMonthlyVolume || "Not specified"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Current Suppliers</p>
                    <p className="text-sm">{selectedInquiry.currentSuppliers || "Not specified"}</p>
                  </div>
                </div>

                {/* Message */}
                {selectedInquiry.message && (
                  <div className="mb-6">
                    <p className="text-sm text-slate-500 mb-2">Message</p>
                    <div className="p-4 bg-slate-900/50 rounded-lg">
                      <p className="whitespace-pre-wrap text-sm">{selectedInquiry.message}</p>
                    </div>
                  </div>
                )}

                {/* Status */}
                <div className="mb-6">
                  <p className="text-sm text-slate-500 mb-2">Status</p>
                  <select
                    value={selectedInquiry.status}
                    onChange={(e) => handleStatusChange(selectedInquiry, e.target.value)}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-cyan-500"
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Assigned To */}
                <div className="mb-6">
                  <p className="text-sm text-slate-500 mb-2">Assigned To</p>
                  <select
                    value={selectedInquiry.assignedTo || ""}
                    onChange={(e) => handleAssign(selectedInquiry, e.target.value ? e.target.value as Id<"users"> : undefined)}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">Unassigned</option>
                    {users?.map((user) => (
                      <option key={user._id} value={user._id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Follow Up Date */}
                <div className="mb-6">
                  <p className="text-sm text-slate-500 mb-2">Follow-up Date</p>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      onClick={handleSetFollowUp}
                      className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg transition-colors text-sm"
                    >
                      Set
                    </button>
                  </div>
                </div>

                {/* Notes */}
                <div className="mb-6">
                  <p className="text-sm text-slate-500 mb-2">Internal Notes</p>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Add notes about this inquiry..."
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-cyan-500 resize-none"
                  />
                  <button
                    onClick={handleSaveNotes}
                    className="mt-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg transition-colors text-sm"
                  >
                    Save Notes
                  </button>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-3">
                  <a
                    href={`mailto:${selectedInquiry.email}?subject=RE: IE Tire Dealer Application - ${selectedInquiry.businessName}`}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Email
                  </a>
                  <a
                    href={`tel:${selectedInquiry.phone}`}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Call
                  </a>
                </div>

                <p className="text-xs text-slate-500 mt-4 text-center">
                  Submitted {formatDate(selectedInquiry.createdAt)}
                </p>
              </div>
            )}
          </div>

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 w-full max-w-md">
                <h2 className="text-xl font-bold mb-4">Delete Inquiry</h2>
                <p className="text-slate-300 mb-6">
                  Are you sure you want to delete the inquiry from <strong>{showDeleteConfirm.businessName}</strong>? This action cannot be undone.
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
