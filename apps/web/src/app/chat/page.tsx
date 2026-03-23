"use client";

import { useRef, useState, useEffect } from "react";
import { Send, Loader, ArrowLeft } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Link href="/" className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-sm font-semibold text-zinc-900 dark:text-white">Revio</h1>
            <p className="text-xs text-zinc-500">AI Recruitment Assistant</p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4">
              <div className="rounded-full bg-zinc-100 p-4 dark:bg-zinc-800">
                <Send size={24} className="text-zinc-400" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                  Hi! I&apos;m your recruitment assistant.
                </h2>
                <p className="max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
                  Tell me about the role you&apos;re hiring for, and I&apos;ll help you find the best candidates.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {[
                  "I need a React developer",
                  "Looking for a data scientist",
                  "Hiring a project manager",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

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

      {/* Input */}
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
    </div>
  );
}
