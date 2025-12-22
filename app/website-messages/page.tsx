"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useSearchParams } from "next/navigation";
import Protected from "../protected";
import Sidebar from "@/components/Sidebar";
import { useTheme } from "../theme-context";

type MessageType = "contact" | "dealer";

const CONTACT_STATUS_OPTIONS = [
  { value: "new", label: "New", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  { value: "read", label: "Read", color: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
  { value: "replied", label: "Replied", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  { value: "archived", label: "Archived", color: "bg-slate-600/20 text-slate-500 border-slate-600/30" },
];

const DEALER_STATUS_OPTIONS = [
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

function WebsiteMessagesContent() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<MessageType>("contact");
  const [selectedContact, setSelectedContact] = useState<ContactMessage | null>(null);
  const [selectedDealer, setSelectedDealer] = useState<DealerInquiry | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{type: MessageType; item: ContactMessage | DealerInquiry} | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [notes, setNotes] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [showDetail, setShowDetail] = useState(false);

  // Queries
  const contactMessages = useQuery(api.contactMessages.getAll);
  const contactStats = useQuery(api.contactMessages.getStats);
  const dealerInquiries = useQuery(api.dealerInquiries.getAll);
  const dealerStats = useQuery(api.dealerInquiries.getStats);
  const users = useQuery(api.auth.getAllUsers);

  // Mutations
  const updateContactStatus = useMutation(api.contactMessages.updateStatus);
  const deleteContact = useMutation(api.contactMessages.remove);
  const updateDealerStatus = useMutation(api.dealerInquiries.updateStatus);
  const assignDealer = useMutation(api.dealerInquiries.assign);
  const setDealerFollowUp = useMutation(api.dealerInquiries.setFollowUp);
  const deleteDealer = useMutation(api.dealerInquiries.remove);

  // Handle URL params for deep linking
  useEffect(() => {
    const type = searchParams.get("type") as MessageType;
    const id = searchParams.get("id");
    if (type && id) {
      setActiveTab(type);
      if (type === "contact" && contactMessages) {
        const msg = contactMessages.find(m => m._id === id);
        if (msg) {
          setSelectedContact(msg);
          setNotes(msg.notes || "");
          setShowDetail(true);
        }
      } else if (type === "dealer" && dealerInquiries) {
        const inq = dealerInquiries.find(i => i._id === id);
        if (inq) {
          setSelectedDealer(inq);
          setNotes(inq.notes || "");
          setFollowUpDate(inq.followUpDate || "");
          setShowDetail(true);
        }
      }
    }
  }, [searchParams, contactMessages, dealerInquiries]);

  const handleContactStatusChange = async (message: ContactMessage, newStatus: string) => {
    await updateContactStatus({
      messageId: message._id,
      status: newStatus,
    });
  };

  const handleDealerStatusChange = async (inquiry: DealerInquiry, newStatus: string) => {
    await updateDealerStatus({
      inquiryId: inquiry._id,
      status: newStatus,
    });
  };

  const handleSaveNotes = async () => {
    if (activeTab === "contact" && selectedContact) {
      await updateContactStatus({
        messageId: selectedContact._id,
        status: selectedContact.status,
        notes,
      });
    } else if (activeTab === "dealer" && selectedDealer) {
      await updateDealerStatus({
        inquiryId: selectedDealer._id,
        status: selectedDealer.status,
        notes,
      });
    }
  };

  const handleAssign = async (inquiry: DealerInquiry, userId: Id<"users"> | undefined) => {
    await assignDealer({
      inquiryId: inquiry._id,
      userId,
    });
  };

  const handleSetFollowUp = async () => {
    if (selectedDealer) {
      await setDealerFollowUp({
        inquiryId: selectedDealer._id,
        followUpDate: followUpDate || undefined,
      });
    }
  };

  const handleDelete = async () => {
    if (showDeleteConfirm) {
      if (showDeleteConfirm.type === "contact") {
        await deleteContact({ messageId: showDeleteConfirm.item._id as Id<"contactMessages"> });
        if (selectedContact?._id === showDeleteConfirm.item._id) {
          setSelectedContact(null);
          setShowDetail(false);
        }
      } else {
        await deleteDealer({ inquiryId: showDeleteConfirm.item._id as Id<"dealerInquiries"> });
        if (selectedDealer?._id === showDeleteConfirm.item._id) {
          setSelectedDealer(null);
          setShowDetail(false);
        }
      }
      setShowDeleteConfirm(null);
    }
  };

  const filteredContacts = contactMessages?.filter((msg) => {
    if (filterStatus !== "all" && msg.status !== filterStatus) return false;
    return true;
  });

  const filteredDealers = dealerInquiries?.filter((inquiry) => {
    if (filterStatus !== "all" && inquiry.status !== filterStatus) return false;
    return true;
  });

  const getStatusBadge = (status: string, type: MessageType) => {
    const options = type === "contact" ? CONTACT_STATUS_OPTIONS : DEALER_STATUS_OPTIONS;
    const statusOption = options.find((s) => s.value === status);
    if (!statusOption) {
      return <span className={`px-2 py-1 text-xs rounded-full ${isDark ? "bg-slate-500/20 text-slate-400" : "bg-gray-200 text-gray-600"}`}>{status}</span>;
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

  const totalNewCount = (contactStats?.new || 0) + (dealerStats?.new || 0);

  return (
    <div className={`flex h-screen ${isDark ? "bg-slate-900" : "bg-[#f2f2f7]"}`}>
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className={`sticky top-0 z-10 backdrop-blur-sm border-b px-4 sm:px-8 py-4 ${isDark ? "bg-slate-900/80 border-slate-700" : "bg-white/80 border-gray-200"}`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className={`text-xl sm:text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>Website Messages</h1>
              <p className={`text-sm mt-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                Messages from IE Tire website visitors
              </p>
            </div>
            {totalNewCount > 0 && (
              <span className={`self-start px-3 py-1 text-sm font-medium rounded-full ${isDark ? "bg-cyan-500/20 text-cyan-400" : "bg-blue-100 text-blue-600"}`}>
                {totalNewCount} new
              </span>
            )}
          </div>
        </header>

        <div className="p-4 sm:p-8 space-y-6">
          {/* Tabs */}
          <div className={`flex gap-2 p-1 rounded-lg ${isDark ? "bg-slate-800/50" : "bg-gray-100"}`}>
            <button
              onClick={() => {
                setActiveTab("contact");
                setSelectedContact(null);
                setSelectedDealer(null);
                setShowDetail(false);
                setFilterStatus("all");
              }}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-md font-medium text-sm transition-colors flex items-center justify-center gap-2 ${
                activeTab === "contact"
                  ? isDark ? "bg-slate-700 text-white" : "bg-white text-gray-900 shadow-sm"
                  : isDark ? "text-slate-400 hover:text-white" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>Contact</span>
              {(contactStats?.new || 0) > 0 && (
                <span className={`px-1.5 py-0.5 text-xs rounded-full ${isDark ? "bg-cyan-500/30 text-cyan-400" : "bg-blue-100 text-blue-600"}`}>
                  {contactStats?.new}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setActiveTab("dealer");
                setSelectedContact(null);
                setSelectedDealer(null);
                setShowDetail(false);
                setFilterStatus("all");
              }}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-md font-medium text-sm transition-colors flex items-center justify-center gap-2 ${
                activeTab === "dealer"
                  ? isDark ? "bg-slate-700 text-white" : "bg-white text-gray-900 shadow-sm"
                  : isDark ? "text-slate-400 hover:text-white" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span>Dealer</span>
              {(dealerStats?.new || 0) > 0 && (
                <span className={`px-1.5 py-0.5 text-xs rounded-full ${isDark ? "bg-purple-500/30 text-purple-400" : "bg-purple-100 text-purple-600"}`}>
                  {dealerStats?.new}
                </span>
              )}
            </button>
          </div>

          {/* Stats */}
          {activeTab === "contact" ? (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
              <div className={`p-3 sm:p-4 rounded-lg border ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm"}`}>
                <p className={`text-xs sm:text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>Total</p>
                <p className={`text-xl sm:text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{contactStats?.total || 0}</p>
              </div>
              <div className={`p-3 sm:p-4 rounded-lg border ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm"}`}>
                <p className={`text-xs sm:text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>New</p>
                <p className={`text-xl sm:text-2xl font-bold ${isDark ? "text-blue-400" : "text-blue-600"}`}>{contactStats?.new || 0}</p>
              </div>
              <div className={`p-3 sm:p-4 rounded-lg border ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm"}`}>
                <p className={`text-xs sm:text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>Read</p>
                <p className={`text-xl sm:text-2xl font-bold ${isDark ? "text-slate-400" : "text-gray-600"}`}>{contactStats?.read || 0}</p>
              </div>
              <div className={`p-3 sm:p-4 rounded-lg border ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm"}`}>
                <p className={`text-xs sm:text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>Replied</p>
                <p className="text-xl sm:text-2xl font-bold text-green-400">{contactStats?.replied || 0}</p>
              </div>
              <div className={`p-3 sm:p-4 rounded-lg border col-span-2 sm:col-span-1 ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm"}`}>
                <p className={`text-xs sm:text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>Archived</p>
                <p className={`text-xl sm:text-2xl font-bold ${isDark ? "text-slate-500" : "text-gray-400"}`}>{contactStats?.archived || 0}</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              <div className={`p-3 sm:p-4 rounded-lg border ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm"}`}>
                <p className={`text-xs sm:text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>Total</p>
                <p className={`text-xl sm:text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{dealerStats?.total || 0}</p>
              </div>
              <div className={`p-3 sm:p-4 rounded-lg border ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm"}`}>
                <p className={`text-xs sm:text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>New</p>
                <p className={`text-xl sm:text-2xl font-bold ${isDark ? "text-blue-400" : "text-blue-600"}`}>{dealerStats?.new || 0}</p>
              </div>
              <div className={`p-3 sm:p-4 rounded-lg border ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm"}`}>
                <p className={`text-xs sm:text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>Contacted</p>
                <p className="text-xl sm:text-2xl font-bold text-yellow-400">{dealerStats?.contacted || 0}</p>
              </div>
              <div className={`p-3 sm:p-4 rounded-lg border ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm"}`}>
                <p className={`text-xs sm:text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>Qualified</p>
                <p className="text-xl sm:text-2xl font-bold text-purple-400">{dealerStats?.qualified || 0}</p>
              </div>
              <div className={`p-3 sm:p-4 rounded-lg border ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm"}`}>
                <p className={`text-xs sm:text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>Approved</p>
                <p className="text-xl sm:text-2xl font-bold text-green-400">{dealerStats?.approved || 0}</p>
              </div>
              <div className={`p-3 sm:p-4 rounded-lg border ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm"}`}>
                <p className={`text-xs sm:text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>Rejected</p>
                <p className="text-xl sm:text-2xl font-bold text-red-400">{dealerStats?.rejected || 0}</p>
              </div>
            </div>
          )}

          {/* Filter */}
          <div className="flex flex-wrap gap-4">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={`px-4 py-2 rounded-lg focus:outline-none text-sm ${isDark ? "bg-slate-800 border border-slate-700 text-white focus:border-cyan-500" : "bg-white border border-gray-200 text-gray-900 focus:border-blue-500"}`}
            >
              <option value="all">All Statuses</option>
              {(activeTab === "contact" ? CONTACT_STATUS_OPTIONS : DEALER_STATUS_OPTIONS).map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          {/* Main Content */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Messages List */}
            <div className={`flex-1 ${showDetail ? "hidden lg:block" : ""}`}>
              <div className={`rounded-lg border overflow-hidden ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm"}`}>
                {activeTab === "contact" ? (
                  <>
                    {filteredContacts?.map((message) => (
                      <div
                        key={message._id}
                        onClick={() => {
                          setSelectedContact(message);
                          setNotes(message.notes || "");
                          setShowDetail(true);
                          if (message.status === "new") {
                            handleContactStatusChange(message, "read");
                          }
                        }}
                        className={`p-4 border-b cursor-pointer transition-colors ${
                          selectedContact?._id === message._id
                            ? isDark ? "bg-cyan-500/10 border-l-2 border-l-cyan-500" : "bg-blue-50 border-l-2 border-l-blue-500"
                            : isDark ? "border-slate-700 hover:bg-slate-800/50" : "border-gray-100 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <p className={`font-medium truncate ${isDark ? "text-white" : "text-gray-900"}`}>{message.name}</p>
                              {getStatusBadge(message.status, "contact")}
                            </div>
                            <p className={`text-sm truncate ${isDark ? "text-slate-400" : "text-gray-500"}`}>{message.subject}</p>
                            <p className={`text-xs mt-1 ${isDark ? "text-slate-500" : "text-gray-400"}`}>{message.email}</p>
                          </div>
                          <p className={`text-xs whitespace-nowrap ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                            {formatDate(message.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                    {filteredContacts?.length === 0 && (
                      <div className={`text-center py-12 ${isDark ? "text-slate-400" : "text-gray-400"}`}>
                        No messages found
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {filteredDealers?.map((inquiry) => (
                      <div
                        key={inquiry._id}
                        onClick={() => {
                          setSelectedDealer(inquiry);
                          setNotes(inquiry.notes || "");
                          setFollowUpDate(inquiry.followUpDate || "");
                          setShowDetail(true);
                          if (inquiry.status === "new") {
                            handleDealerStatusChange(inquiry, "contacted");
                          }
                        }}
                        className={`p-4 border-b cursor-pointer transition-colors ${
                          selectedDealer?._id === inquiry._id
                            ? isDark ? "bg-cyan-500/10 border-l-2 border-l-cyan-500" : "bg-blue-50 border-l-2 border-l-blue-500"
                            : isDark ? "border-slate-700 hover:bg-slate-800/50" : "border-gray-100 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <p className={`font-medium truncate ${isDark ? "text-white" : "text-gray-900"}`}>{inquiry.businessName}</p>
                              {getStatusBadge(inquiry.status, "dealer")}
                            </div>
                            <p className={`text-sm truncate ${isDark ? "text-slate-400" : "text-gray-500"}`}>{inquiry.contactName}</p>
                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                              <p className={`text-xs ${isDark ? "text-slate-500" : "text-gray-400"}`}>{inquiry.email}</p>
                              {inquiry.businessType && (
                                <span className={`text-xs px-2 py-0.5 rounded ${isDark ? "bg-slate-700/50 text-slate-400" : "bg-gray-100 text-gray-500"}`}>
                                  {getBusinessTypeLabel(inquiry.businessType)}
                                </span>
                              )}
                            </div>
                          </div>
                          <p className={`text-xs whitespace-nowrap ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                            {formatDate(inquiry.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                    {filteredDealers?.length === 0 && (
                      <div className={`text-center py-12 ${isDark ? "text-slate-400" : "text-gray-400"}`}>
                        No dealer inquiries found
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Detail Panel */}
            {showDetail && (
              <div className={`lg:w-[500px] rounded-lg border p-4 sm:p-6 ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm"}`}>
                {/* Back button for mobile */}
                <button
                  onClick={() => {
                    setShowDetail(false);
                    setSelectedContact(null);
                    setSelectedDealer(null);
                  }}
                  className={`lg:hidden flex items-center gap-2 mb-4 text-sm ${isDark ? "text-slate-400 hover:text-white" : "text-gray-500 hover:text-gray-900"}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to list
                </button>

                {activeTab === "contact" && selectedContact && (
                  <>
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <h2 className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{selectedContact.name}</h2>
                        <p className={isDark ? "text-slate-400" : "text-gray-500"}>{selectedContact.email}</p>
                        {selectedContact.phone && <p className={isDark ? "text-slate-400" : "text-gray-500"}>{selectedContact.phone}</p>}
                        {selectedContact.company && <p className={`text-sm ${isDark ? "text-slate-500" : "text-gray-400"}`}>{selectedContact.company}</p>}
                      </div>
                      <button
                        onClick={() => setShowDeleteConfirm({type: "contact", item: selectedContact})}
                        className={`p-2 transition-colors ${isDark ? "text-slate-400 hover:text-red-400" : "text-gray-400 hover:text-red-500"}`}
                        title="Delete message"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    <div className="mb-6">
                      <p className={`text-sm mb-2 ${isDark ? "text-slate-500" : "text-gray-400"}`}>Subject</p>
                      <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>{selectedContact.subject}</p>
                    </div>

                    <div className="mb-6">
                      <p className={`text-sm mb-2 ${isDark ? "text-slate-500" : "text-gray-400"}`}>Message</p>
                      <div className={`p-4 rounded-lg ${isDark ? "bg-slate-900/50" : "bg-gray-50"}`}>
                        <p className={`whitespace-pre-wrap ${isDark ? "text-white" : "text-gray-900"}`}>{selectedContact.message}</p>
                      </div>
                    </div>

                    <div className="mb-6">
                      <p className={`text-sm mb-2 ${isDark ? "text-slate-500" : "text-gray-400"}`}>Status</p>
                      <select
                        value={selectedContact.status}
                        onChange={(e) => handleContactStatusChange(selectedContact, e.target.value)}
                        className={`w-full px-4 py-2 rounded-lg focus:outline-none ${isDark ? "bg-slate-700 border border-slate-600 text-white focus:border-cyan-500" : "bg-white border border-gray-200 text-gray-900 focus:border-blue-500"}`}
                      >
                        {CONTACT_STATUS_OPTIONS.map((status) => (
                          <option key={status.value} value={status.value}>{status.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="mb-6">
                      <p className={`text-sm mb-2 ${isDark ? "text-slate-500" : "text-gray-400"}`}>Internal Notes</p>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        placeholder="Add notes about this message..."
                        className={`w-full px-4 py-2 rounded-lg focus:outline-none resize-none ${isDark ? "bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:border-cyan-500" : "bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-500"}`}
                      />
                      <button
                        onClick={handleSaveNotes}
                        className={`mt-2 px-4 py-2 rounded-lg transition-colors text-sm text-white ${isDark ? "bg-cyan-500 hover:bg-cyan-600" : "bg-blue-500 hover:bg-blue-600"}`}
                      >
                        Save Notes
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <a
                        href={`mailto:${selectedContact.email}?subject=Re: ${selectedContact.subject}`}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors text-white ${isDark ? "bg-cyan-500 hover:bg-cyan-600" : "bg-blue-500 hover:bg-blue-600"}`}
                        onClick={() => handleContactStatusChange(selectedContact, "replied")}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Reply via Email
                      </a>
                      {selectedContact.phone && (
                        <a
                          href={`tel:${selectedContact.phone}`}
                          className={`px-4 py-2 rounded-lg transition-colors flex items-center justify-center ${isDark ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-900"}`}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </a>
                      )}
                    </div>

                    <p className={`text-xs mt-4 text-center ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                      Received {formatDate(selectedContact.createdAt)}
                    </p>
                  </>
                )}

                {activeTab === "dealer" && selectedDealer && (
                  <>
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <h2 className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{selectedDealer.businessName}</h2>
                        <p className={isDark ? "text-slate-400" : "text-gray-500"}>{selectedDealer.contactName}</p>
                      </div>
                      <button
                        onClick={() => setShowDeleteConfirm({type: "dealer", item: selectedDealer})}
                        className={`p-2 transition-colors ${isDark ? "text-slate-400 hover:text-red-400" : "text-gray-400 hover:text-red-500"}`}
                        title="Delete inquiry"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    {/* Contact Info */}
                    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 p-4 rounded-lg ${isDark ? "bg-slate-900/50" : "bg-gray-50"}`}>
                      <div>
                        <p className={`text-xs mb-1 ${isDark ? "text-slate-500" : "text-gray-400"}`}>Email</p>
                        <p className={`text-sm ${isDark ? "text-white" : "text-gray-900"}`}>{selectedDealer.email}</p>
                      </div>
                      <div>
                        <p className={`text-xs mb-1 ${isDark ? "text-slate-500" : "text-gray-400"}`}>Phone</p>
                        <p className={`text-sm ${isDark ? "text-white" : "text-gray-900"}`}>{selectedDealer.phone}</p>
                      </div>
                      {formatAddress(selectedDealer) && (
                        <div className="col-span-1 sm:col-span-2">
                          <p className={`text-xs mb-1 ${isDark ? "text-slate-500" : "text-gray-400"}`}>Address</p>
                          <p className={`text-sm ${isDark ? "text-white" : "text-gray-900"}`}>{formatAddress(selectedDealer)}</p>
                        </div>
                      )}
                    </div>

                    {/* Business Info */}
                    <div className={`grid grid-cols-2 gap-4 mb-6 p-4 rounded-lg ${isDark ? "bg-slate-900/50" : "bg-gray-50"}`}>
                      <div>
                        <p className={`text-xs mb-1 ${isDark ? "text-slate-500" : "text-gray-400"}`}>Business Type</p>
                        <p className={`text-sm ${isDark ? "text-white" : "text-gray-900"}`}>{getBusinessTypeLabel(selectedDealer.businessType)}</p>
                      </div>
                      <div>
                        <p className={`text-xs mb-1 ${isDark ? "text-slate-500" : "text-gray-400"}`}>Years in Business</p>
                        <p className={`text-sm ${isDark ? "text-white" : "text-gray-900"}`}>{selectedDealer.yearsInBusiness || "Not specified"}</p>
                      </div>
                      <div>
                        <p className={`text-xs mb-1 ${isDark ? "text-slate-500" : "text-gray-400"}`}>Est. Monthly Volume</p>
                        <p className={`text-sm ${isDark ? "text-white" : "text-gray-900"}`}>{selectedDealer.estimatedMonthlyVolume || "Not specified"}</p>
                      </div>
                      <div>
                        <p className={`text-xs mb-1 ${isDark ? "text-slate-500" : "text-gray-400"}`}>Current Suppliers</p>
                        <p className={`text-sm ${isDark ? "text-white" : "text-gray-900"}`}>{selectedDealer.currentSuppliers || "Not specified"}</p>
                      </div>
                    </div>

                    {selectedDealer.message && (
                      <div className="mb-6">
                        <p className={`text-sm mb-2 ${isDark ? "text-slate-500" : "text-gray-400"}`}>Message</p>
                        <div className={`p-4 rounded-lg ${isDark ? "bg-slate-900/50" : "bg-gray-50"}`}>
                          <p className={`whitespace-pre-wrap text-sm ${isDark ? "text-white" : "text-gray-900"}`}>{selectedDealer.message}</p>
                        </div>
                      </div>
                    )}

                    <div className="mb-6">
                      <p className={`text-sm mb-2 ${isDark ? "text-slate-500" : "text-gray-400"}`}>Status</p>
                      <select
                        value={selectedDealer.status}
                        onChange={(e) => handleDealerStatusChange(selectedDealer, e.target.value)}
                        className={`w-full px-4 py-2 rounded-lg focus:outline-none ${isDark ? "bg-slate-700 border border-slate-600 text-white focus:border-cyan-500" : "bg-white border border-gray-200 text-gray-900 focus:border-blue-500"}`}
                      >
                        {DEALER_STATUS_OPTIONS.map((status) => (
                          <option key={status.value} value={status.value}>{status.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="mb-6">
                      <p className={`text-sm mb-2 ${isDark ? "text-slate-500" : "text-gray-400"}`}>Assigned To</p>
                      <select
                        value={selectedDealer.assignedTo || ""}
                        onChange={(e) => handleAssign(selectedDealer, e.target.value ? e.target.value as Id<"users"> : undefined)}
                        className={`w-full px-4 py-2 rounded-lg focus:outline-none ${isDark ? "bg-slate-700 border border-slate-600 text-white focus:border-cyan-500" : "bg-white border border-gray-200 text-gray-900 focus:border-blue-500"}`}
                      >
                        <option value="">Unassigned</option>
                        {users?.map((user) => (
                          <option key={user._id} value={user._id}>{user.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="mb-6">
                      <p className={`text-sm mb-2 ${isDark ? "text-slate-500" : "text-gray-400"}`}>Follow-up Date</p>
                      <div className="flex gap-2">
                        <input
                          type="date"
                          value={followUpDate}
                          onChange={(e) => setFollowUpDate(e.target.value)}
                          className={`flex-1 px-4 py-2 rounded-lg focus:outline-none ${isDark ? "bg-slate-700 border border-slate-600 text-white focus:border-cyan-500" : "bg-white border border-gray-200 text-gray-900 focus:border-blue-500"}`}
                        />
                        <button
                          onClick={handleSetFollowUp}
                          className={`px-4 py-2 rounded-lg transition-colors text-sm text-white ${isDark ? "bg-cyan-500 hover:bg-cyan-600" : "bg-blue-500 hover:bg-blue-600"}`}
                        >
                          Set
                        </button>
                      </div>
                    </div>

                    <div className="mb-6">
                      <p className={`text-sm mb-2 ${isDark ? "text-slate-500" : "text-gray-400"}`}>Internal Notes</p>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        placeholder="Add notes about this inquiry..."
                        className={`w-full px-4 py-2 rounded-lg focus:outline-none resize-none ${isDark ? "bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:border-cyan-500" : "bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-500"}`}
                      />
                      <button
                        onClick={handleSaveNotes}
                        className={`mt-2 px-4 py-2 rounded-lg transition-colors text-sm text-white ${isDark ? "bg-cyan-500 hover:bg-cyan-600" : "bg-blue-500 hover:bg-blue-600"}`}
                      >
                        Save Notes
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <a
                        href={`mailto:${selectedDealer.email}?subject=RE: IE Tire Dealer Application - ${selectedDealer.businessName}`}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors text-white ${isDark ? "bg-cyan-500 hover:bg-cyan-600" : "bg-blue-500 hover:bg-blue-600"}`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Email
                      </a>
                      <a
                        href={`tel:${selectedDealer.phone}`}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${isDark ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-900"}`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        Call
                      </a>
                    </div>

                    <p className={`text-xs mt-4 text-center ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                      Submitted {formatDate(selectedDealer.createdAt)}
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className={`rounded-lg p-6 w-full max-w-md ${isDark ? "bg-slate-800 border border-slate-700" : "bg-white shadow-xl"}`}>
              <h2 className={`text-xl font-bold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
                Delete {showDeleteConfirm.type === "contact" ? "Message" : "Inquiry"}
              </h2>
              <p className={`mb-6 ${isDark ? "text-slate-300" : "text-gray-600"}`}>
                Are you sure you want to delete {showDeleteConfirm.type === "contact"
                  ? `the message from ${(showDeleteConfirm.item as ContactMessage).name}`
                  : `the inquiry from ${(showDeleteConfirm.item as DealerInquiry).businessName}`
                }? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className={`px-4 py-2 rounded-lg transition-colors ${isDark ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-900"}`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function WebsiteMessagesPage() {
  return (
    <Protected>
      <WebsiteMessagesContent />
    </Protected>
  );
}
