"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Send, Loader, ArrowLeft, Mic, MessageSquare } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import VoiceChat from "./voice-chat";

interface Candidate {
  resume_id: number;
  name: string | null;
  skills: string[];
  experience_years: number | null;
  summary: string | null;
  relevance_score: number;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  candidates?: Candidate[] | null;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm Revio, your recruitment assistant. Tell me about the role you're hiring for — what kind of skills, experience, or qualities are you looking for? I'll help you find the best candidates.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [mode, setMode] = useState<"text" | "voice">("text");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSessionId = useCallback((id: string) => {
    setSessionId(id);
  }, []);

  const handleVoiceDisconnect = useCallback(() => {
    setMode("text");
  }, []);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

    try {
      const res = await api.post("/chat", {
        session_id: sessionId,
        message: text,
      });
      const data = res.data;
      setSessionId(data.session_id);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.message, candidates: data.candidates },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-sm font-semibold text-zinc-900 dark:text-white">Revio</h1>
              <p className="text-xs text-zinc-500">AI Recruitment Assistant</p>
            </div>
          </div>

          {/* Mode toggle */}
          <div className="flex items-center gap-1 rounded-lg border border-zinc-200 p-0.5 dark:border-zinc-700">
            <button
              onClick={() => setMode("text")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                mode === "text"
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                  : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              <MessageSquare size={14} />
              Chat
            </button>
            <button
              onClick={() => setMode("voice")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                mode === "voice"
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                  : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              <Mic size={14} />
              Voice
            </button>
          </div>
        </div>
      </header>

      {/* Voice mode */}
      {mode === "voice" && (
        <div className="mx-auto w-full max-w-3xl px-4 py-6">
          <VoiceChat
            sessionId={sessionId}
            onSessionId={handleSessionId}
            onDisconnect={handleVoiceDisconnect}
          />
        </div>
      )}

      {/* Messages (always visible so context is maintained) */}
      <div className={`flex-1 overflow-auto ${mode === "voice" ? "opacity-50" : ""}`}>
        <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                  msg.role === "user"
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                    : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.candidates && msg.candidates.length > 0 && (
                  <div className="mt-3 space-y-2 border-t border-zinc-200 pt-3 dark:border-zinc-700">
                    <p className="text-xs font-semibold uppercase tracking-wide opacity-60">
                      Matching Candidates
                    </p>
                    {msg.candidates.map((c) => (
                      <div
                        key={c.resume_id}
                        className="rounded-lg bg-white/10 p-3 dark:bg-zinc-700/50"
                      >
                        <p className="font-medium">{c.name || "Unknown"}</p>
                        {c.experience_years && (
                          <p className="text-xs opacity-70">{c.experience_years} years experience</p>
                        )}
                        {c.skills.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {c.skills.slice(0, 5).map((s) => (
                              <span
                                key={s}
                                className="rounded bg-white/20 px-1.5 py-0.5 text-xs dark:bg-zinc-600"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                        <p className="mt-1 text-xs opacity-50">
                          Match: {(c.relevance_score * 100).toFixed(0)}%
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-zinc-100 px-4 py-3 dark:bg-zinc-800">
                <Loader size={16} className="animate-spin text-zinc-400" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input (text mode only) */}
      {mode === "text" && (
        <div className="border-t border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900">
          <form onSubmit={sendMessage} className="mx-auto flex max-w-3xl gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tell me about the role you're hiring for..."
              disabled={loading}
              className="flex-1 rounded-xl border border-zinc-300 px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-xl bg-zinc-900 px-4 py-2.5 text-white transition-colors hover:bg-zinc-800 disabled:opacity-30 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
