"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Protected from "../protected";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "../auth-context";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id, Doc } from "@/convex/_generated/dataModel";
import dynamic from "next/dynamic";
import { GiphyFetch } from "@giphy/js-fetch-api";
import { Grid } from "@giphy/react-components";
import { Theme } from "emoji-picker-react";

// Dynamic import for emoji picker to avoid SSR issues
const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

// GIPHY API setup (using public beta key - replace with your own for production)
const gf = new GiphyFetch("GlVGYHkr3WSBnllca54iNt0yFbjz7L65");

type User = Doc<"users">;

interface EnrichedConversation {
  _id: Id<"conversations">;
  type: string;
  projectId?: Id<"projects">;
  participants: (User | null)[];
  lastMessageAt: number;
  createdAt: number;
  lastMessage?: {
    content: string;
    senderId: Id<"users">;
    createdAt: number;
  } | null;
  project?: Doc<"projects"> | null;
  unreadCount: number;
}

interface EnrichedMessage {
  _id: Id<"messages">;
  conversationId: Id<"conversations">;
  senderId: Id<"users">;
  content: string;
  mentions: Id<"users">[];
  readBy: Id<"users">[];
  createdAt: number;
  sender: User | null;
}

function MessagesContent() {
  const { user } = useAuth();
  const [selectedConversation, setSelectedConversation] =
    useState<EnrichedConversation | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMobileChat, setShowMobileChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Emoji & GIF picker state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearchQuery, setGifSearchQuery] = useState("");
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const gifPickerRef = useRef<HTMLDivElement>(null);

  // Close pickers when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
      if (gifPickerRef.current && !gifPickerRef.current.contains(event.target as Node)) {
        setShowGifPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // GIPHY fetch function
  const fetchGifs = useCallback(
    (offset: number) => {
      if (gifSearchQuery.trim()) {
        return gf.search(gifSearchQuery, { offset, limit: 10 });
      }
      return gf.trending({ offset, limit: 10 });
    },
    [gifSearchQuery]
  );

  // Handle emoji selection
  const handleEmojiClick = (emojiData: { emoji: string }) => {
    setNewMessage((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  // Handle GIF selection
  const handleGifClick = async (gif: { images: { fixed_height: { url: string } }; title: string }) => {
    if (!selectedConversation || !user) return;

    // Send GIF as a special message format
    await sendMessage({
      conversationId: selectedConversation._id,
      senderId: user._id,
      content: `[GIF]${gif.images.fixed_height.url}`,
      mentions: [],
    });

    setShowGifPicker(false);
    setGifSearchQuery("");
  };

  // Check if message is a GIF
  const isGifMessage = (content: string) => content.startsWith("[GIF]");
  const getGifUrl = (content: string) => content.replace("[GIF]", "");

  const conversations = useQuery(
    api.messages.getConversations,
    user ? { userId: user._id } : "skip"
  ) as EnrichedConversation[] | undefined;

  const messages = useQuery(
    api.messages.getMessages,
    selectedConversation ? { conversationId: selectedConversation._id } : "skip"
  ) as EnrichedMessage[] | undefined;

  const allUsers = useQuery(api.messages.getAllUsers) as User[] | undefined;

  const sendMessage = useMutation(api.messages.sendMessage);
  const createConversation = useMutation(api.messages.createConversation);
  const markAsRead = useMutation(api.messages.markAsRead);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark messages as read when conversation is selected
  useEffect(() => {
    if (selectedConversation && user) {
      markAsRead({
        conversationId: selectedConversation._id,
        userId: user._id,
      });
    }
  }, [selectedConversation, user, markAsRead]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || !user) return;

    // Parse @mentions
    const mentionRegex = /@(\w+)/g;
    const mentions: Id<"users">[] = [];
    let match: RegExpExecArray | null;
    while ((match = mentionRegex.exec(newMessage)) !== null) {
      const mentionText = match[1];
      const mentionedUser = allUsers?.find(
        (u) => u.name.toLowerCase().includes(mentionText.toLowerCase())
      );
      if (mentionedUser) {
        mentions.push(mentionedUser._id);
      }
    }

    await sendMessage({
      conversationId: selectedConversation._id,
      senderId: user._id,
      content: newMessage,
      mentions,
    });

    setNewMessage("");
  };

  const handleStartConversation = async (targetUser: User) => {
    if (!user) return;

    const conversationId = await createConversation({
      type: "direct",
      participants: [user._id, targetUser._id],
    });

    // Find the conversation in the list
    const newConv = conversations?.find((c) => c._id === conversationId);
    if (newConv) {
      setSelectedConversation(newConv);
    }

    setShowNewConversation(false);
  };

  const getConversationName = (conv: EnrichedConversation): string => {
    if (conv.type === "project" && conv.project) {
      return conv.project.name;
    }
    // For direct messages, show the other person's name
    const otherParticipant = conv.participants.find((p) => p && p._id !== user?._id);
    return otherParticipant?.name || "Unknown";
  };

  const getConversationAvatar = (conv: EnrichedConversation): string => {
    if (conv.type === "project") {
      return "#";
    }
    const otherParticipant = conv.participants.find((p) => p && p._id !== user?._id);
    return otherParticipant?.name?.charAt(0).toUpperCase() || "?";
  };

  const formatMessageTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: "short" });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  const filteredUsers = allUsers?.filter(
    (u) =>
      u._id !== user?._id &&
      u.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-slate-900">
      <Sidebar />

      <main className="flex-1 flex overflow-hidden">
        {/* Conversations List */}
        <div className={`${showMobileChat ? "hidden md:flex" : "flex"} w-full md:w-80 border-r border-slate-700 flex-col`}>
          <div className="p-4 border-b border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-lg sm:text-xl font-bold text-white">Messages</h1>
              <button
                onClick={() => setShowNewConversation(true)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {conversations?.map((conv) => (
              <button
                key={conv._id}
                onClick={() => {
                  setSelectedConversation(conv);
                  setShowMobileChat(true);
                }}
                className={`w-full p-4 flex items-start gap-3 hover:bg-slate-800/50 transition-colors border-b border-slate-700/50 ${
                  selectedConversation?._id === conv._id ? "bg-slate-800/50" : ""
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-medium flex-shrink-0">
                  {getConversationAvatar(conv)}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between">
                    <p className="text-white font-medium truncate">
                      {getConversationName(conv)}
                    </p>
                    {conv.lastMessage && (
                      <span className="text-xs text-slate-500">
                        {formatMessageTime(conv.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-400 truncate">
                    {conv.lastMessage?.content || "No messages yet"}
                  </p>
                </div>
                {conv.unreadCount > 0 && (
                  <span className="w-5 h-5 bg-cyan-500 text-white text-xs font-medium rounded-full flex items-center justify-center">
                    {conv.unreadCount}
                  </span>
                )}
              </button>
            ))}

            {(!conversations || conversations.length === 0) && (
              <div className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-slate-800 rounded-full flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-slate-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <p className="text-slate-400">No conversations yet</p>
                <button
                  onClick={() => setShowNewConversation(true)}
                  className="mt-4 px-4 py-2 bg-cyan-500 text-white font-medium rounded-lg hover:bg-cyan-600 transition-colors"
                >
                  Start a conversation
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`${showMobileChat ? "flex" : "hidden md:flex"} flex-1 flex-col`}>
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-3 sm:p-4 border-b border-slate-700 flex items-center gap-3">
                {/* Back button for mobile */}
                <button
                  onClick={() => setShowMobileChat(false)}
                  className="md:hidden p-2 -ml-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-medium flex-shrink-0">
                  {getConversationAvatar(selectedConversation)}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-white font-medium truncate">
                    {getConversationName(selectedConversation)}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {selectedConversation.type === "project"
                      ? "Project Channel"
                      : "Direct Message"}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
                {messages?.map((msg) => {
                  const isOwn = msg.senderId === user?._id;
                  return (
                    <div
                      key={msg._id}
                      className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-[70%] ${
                          isOwn ? "order-2" : "order-1"
                        }`}
                      >
                        {!isOwn && (
                          <p className="text-xs text-slate-500 mb-1 ml-1">
                            {msg.sender?.name || "Unknown"}
                          </p>
                        )}
                        <div
                          className={`rounded-2xl overflow-hidden ${
                            isGifMessage(msg.content)
                              ? ""
                              : `px-3 sm:px-4 py-2 ${
                                  isOwn
                                    ? "bg-cyan-500 text-white"
                                    : "bg-slate-800 text-white"
                                }`
                          }`}
                        >
                          {isGifMessage(msg.content) ? (
                            <img
                              src={getGifUrl(msg.content)}
                              alt="GIF"
                              className="max-w-full rounded-2xl"
                              style={{ maxHeight: "200px" }}
                            />
                          ) : (
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {msg.content}
                            </p>
                          )}
                        </div>
                        <p
                          className={`text-[10px] sm:text-xs text-slate-500 mt-1 ${
                            isOwn ? "text-right mr-1" : "ml-1"
                          }`}
                        >
                          {formatMessageTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-3 sm:p-4 border-t border-slate-700 relative">
                {/* Emoji Picker */}
                {showEmojiPicker && (
                  <div
                    ref={emojiPickerRef}
                    className="absolute bottom-full left-0 mb-2 z-50"
                  >
                    <EmojiPicker
                      onEmojiClick={handleEmojiClick}
                      theme={Theme.DARK}
                      width={300}
                      height={400}
                    />
                  </div>
                )}

                {/* GIF Picker */}
                {showGifPicker && (
                  <div
                    ref={gifPickerRef}
                    className="absolute bottom-full left-0 mb-2 z-50 w-full max-w-md bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl"
                  >
                    <div className="p-3 border-b border-slate-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white font-medium text-sm">Search GIFs</span>
                        <button
                          onClick={() => setShowGifPicker(false)}
                          className="text-slate-400 hover:text-white p-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <input
                        type="text"
                        value={gifSearchQuery}
                        onChange={(e) => setGifSearchQuery(e.target.value)}
                        placeholder="Search GIPHY..."
                        className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div className="h-64 overflow-y-auto p-2">
                      <Grid
                        key={gifSearchQuery}
                        width={380}
                        columns={2}
                        fetchGifs={fetchGifs}
                        onGifClick={(gif, e) => {
                          e.preventDefault();
                          handleGifClick(gif);
                        }}
                        noLink={true}
                      />
                    </div>
                    <div className="p-2 border-t border-slate-700 text-center">
                      <span className="text-slate-500 text-xs">Powered by GIPHY</span>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSendMessage} className="flex gap-2 sm:gap-3 items-center">
                  {/* Emoji Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowEmojiPicker(!showEmojiPicker);
                      setShowGifPicker(false);
                    }}
                    className={`p-2.5 rounded-xl transition-colors flex-shrink-0 ${
                      showEmojiPicker
                        ? "bg-cyan-500 text-white"
                        : "text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                    title="Add emoji"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>

                  {/* GIF Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowGifPicker(!showGifPicker);
                      setShowEmojiPicker(false);
                    }}
                    className={`px-2.5 py-1.5 rounded-xl transition-colors flex-shrink-0 font-bold text-xs ${
                      showGifPicker
                        ? "bg-cyan-500 text-white"
                        : "text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-600"
                    }`}
                    title="Add GIF"
                  >
                    GIF
                  </button>

                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm sm:text-base placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="px-4 sm:px-6 py-2.5 sm:py-3 bg-cyan-500 text-white font-medium rounded-xl hover:bg-cyan-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 bg-slate-800 rounded-full flex items-center justify-center">
                  <svg
                    className="w-10 h-10 text-slate-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-medium text-white mb-2">
                  Select a conversation
                </h2>
                <p className="text-slate-400">
                  Choose from your existing conversations or start a new one
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* New Conversation Modal */}
      {showNewConversation && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-t-xl sm:rounded-xl p-4 sm:p-6 w-full max-w-md max-h-[80vh] sm:max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-white">
                New Conversation
              </h2>
              <button
                onClick={() => setShowNewConversation(false)}
                className="p-2 text-slate-400 hover:text-white transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm sm:text-base placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 -mx-4 px-4 sm:mx-0 sm:px-0">
              {filteredUsers?.map((u) => (
                <button
                  key={u._id}
                  onClick={() => handleStartConversation(u)}
                  className="w-full p-3 flex items-center gap-3 hover:bg-slate-700/50 rounded-lg transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-medium flex-shrink-0">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-white font-medium truncate">{u.name}</p>
                    <p className="text-sm text-slate-400 truncate">{u.email}</p>
                  </div>
                </button>
              ))}

              {filteredUsers?.length === 0 && (
                <p className="text-center text-slate-400 py-4">No users found</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Protected>
      <MessagesContent />
    </Protected>
  );
}
