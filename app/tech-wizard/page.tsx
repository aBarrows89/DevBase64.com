"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Protected from "../protected";
import Sidebar from "@/components/Sidebar";
import { useTheme } from "../theme-context";
import { useAuth } from "../auth-context";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// Allowed users for Tech Wizard access
const ALLOWED_EMAILS = [
  "andy@ietires.com",
  "nick@ietires.com",
  "abarrows@ietires.com",
  "nquinn@ietires.com",
];

export default function TechWizardPage() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const isDark = theme === "dark";

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Check access
  const hasAccess =
    user?.role === "super_admin" ||
    ALLOWED_EMAILS.includes(user?.email?.toLowerCase() || "");

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  // Redirect if no access
  if (!hasAccess) {
    return (
      <Protected>
        <div className={`flex h-screen ${isDark ? "bg-slate-900" : "bg-[#f2f2f7]"}`}>
          <Sidebar />
          <main className="flex-1 flex items-center justify-center">
            <div className={`text-center p-8 rounded-xl ${isDark ? "bg-slate-800" : "bg-white shadow-sm"}`}>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H9m3-10V7a4 4 0 00-8 0v4h16V7a4 4 0 00-8 0z" />
                </svg>
              </div>
              <h2 className={`text-xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                Access Restricted
              </h2>
              <p className={`${isDark ? "text-slate-400" : "text-gray-500"}`}>
                Tech Wizard is only available to the Technology department.
              </p>
            </div>
          </main>
        </div>
      </Protected>
    );
  }

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      // Prepare messages for API (exclude timestamps and ids)
      const apiMessages = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch("/api/tech-wizard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          userEmail: user?.email,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get response");
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.message,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  // Simple markdown rendering for code blocks and formatting
  const renderMessage = (content: string) => {
    // Split by code blocks
    const parts = content.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith("```")) {
        // Code block
        const match = part.match(/```(\w+)?\n?([\s\S]*?)```/);
        if (match) {
          const language = match[1] || "";
          const code = match[2];
          return (
            <div key={index} className="my-3">
              {language && (
                <div className={`text-xs px-3 py-1 rounded-t ${isDark ? "bg-slate-600 text-slate-300" : "bg-gray-200 text-gray-600"}`}>
                  {language}
                </div>
              )}
              <pre className={`p-3 rounded ${language ? "rounded-t-none" : ""} overflow-x-auto text-sm ${isDark ? "bg-slate-800 text-slate-200" : "bg-gray-100 text-gray-800"}`}>
                <code>{code}</code>
              </pre>
            </div>
          );
        }
      }

      // Regular text - handle inline formatting
      return (
        <span key={index} className="whitespace-pre-wrap">
          {part.split(/(`[^`]+`)/g).map((segment, i) => {
            if (segment.startsWith("`") && segment.endsWith("`")) {
              return (
                <code
                  key={i}
                  className={`px-1.5 py-0.5 rounded text-sm ${isDark ? "bg-slate-700 text-cyan-300" : "bg-gray-100 text-blue-600"}`}
                >
                  {segment.slice(1, -1)}
                </code>
              );
            }
            // Handle bold
            return segment.split(/(\*\*[^*]+\*\*)/g).map((s, j) => {
              if (s.startsWith("**") && s.endsWith("**")) {
                return <strong key={`${i}-${j}`}>{s.slice(2, -2)}</strong>;
              }
              return s;
            });
          })}
        </span>
      );
    });
  };

  return (
    <Protected>
      <div className={`flex h-screen ${isDark ? "bg-slate-900" : "bg-[#f2f2f7]"}`}>
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className={`shrink-0 p-4 border-b ${isDark ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? "bg-gradient-to-br from-purple-500 to-indigo-600" : "bg-gradient-to-br from-purple-500 to-indigo-600"}`}>
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <h1 className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                    Tech Wizard
                  </h1>
                  <p className={`text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    IT & Networking Assistant • Technology Department Only
                  </p>
                </div>
              </div>
              <button
                onClick={clearChat}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isDark ? "bg-slate-700 hover:bg-slate-600 text-slate-300" : "bg-gray-100 hover:bg-gray-200 text-gray-600"}`}
              >
                Clear Chat
              </button>
            </div>
          </header>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center">
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-4 ${isDark ? "bg-gradient-to-br from-purple-500/20 to-indigo-600/20" : "bg-gradient-to-br from-purple-100 to-indigo-100"}`}>
                  <svg className={`w-10 h-10 ${isDark ? "text-purple-400" : "text-purple-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h2 className={`text-xl font-semibold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                  How can I help you today?
                </h2>
                <p className={`text-center max-w-md mb-6 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                  I'm your IT and networking expert. Ask me about network issues, server administration, security, or any tech problems.
                </p>

                {/* Quick prompts */}
                <div className="flex flex-wrap gap-2 justify-center max-w-2xl">
                  {[
                    "How do I set up a new VLAN?",
                    "Troubleshoot slow network speeds",
                    "Best practices for Active Directory",
                    "Set up VPN for remote access",
                  ].map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => setInput(prompt)}
                      className={`px-3 py-2 rounded-lg text-sm transition-colors ${isDark ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700" : "bg-white hover:bg-gray-50 text-gray-600 border border-gray-200"}`}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                        message.role === "user"
                          ? isDark
                            ? "bg-cyan-600 text-white"
                            : "bg-blue-600 text-white"
                          : isDark
                            ? "bg-slate-800 text-slate-200"
                            : "bg-white text-gray-800 shadow-sm border border-gray-100"
                      }`}
                    >
                      {message.role === "assistant" ? (
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                          {renderMessage(message.content)}
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      )}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className={`rounded-2xl px-4 py-3 ${isDark ? "bg-slate-800" : "bg-white shadow-sm border border-gray-100"}`}>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <span className={`w-2 h-2 rounded-full animate-bounce ${isDark ? "bg-purple-400" : "bg-purple-500"}`} style={{ animationDelay: "0ms" }} />
                          <span className={`w-2 h-2 rounded-full animate-bounce ${isDark ? "bg-purple-400" : "bg-purple-500"}`} style={{ animationDelay: "150ms" }} />
                          <span className={`w-2 h-2 rounded-full animate-bounce ${isDark ? "bg-purple-400" : "bg-purple-500"}`} style={{ animationDelay: "300ms" }} />
                        </div>
                        <span className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                          Tech Wizard is thinking...
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="flex justify-center">
                    <div className="bg-red-500/10 text-red-500 rounded-lg px-4 py-2 text-sm">
                      {error}
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className={`shrink-0 p-4 border-t ${isDark ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200"}`}>
            <div className="max-w-4xl mx-auto">
              <div className={`flex items-end gap-3 p-2 rounded-xl ${isDark ? "bg-slate-800" : "bg-gray-100"}`}>
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Tech Wizard anything about IT, networking, or security..."
                  rows={1}
                  className={`flex-1 px-3 py-2 rounded-lg resize-none focus:outline-none ${isDark ? "bg-transparent text-white placeholder-slate-500" : "bg-transparent text-gray-900 placeholder-gray-400"}`}
                  style={{ maxHeight: "200px" }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  className={`p-2 rounded-lg transition-colors ${
                    input.trim() && !isLoading
                      ? isDark
                        ? "bg-purple-600 hover:bg-purple-500 text-white"
                        : "bg-purple-600 hover:bg-purple-700 text-white"
                      : isDark
                        ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
              <p className={`text-xs mt-2 text-center ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                Powered by Tire Dust • Press Enter to send, Shift+Enter for new line
              </p>
            </div>
          </div>
        </main>
      </div>
    </Protected>
  );
}
