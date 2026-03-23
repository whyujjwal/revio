"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";

interface HealthStatus {
  status: string;
  openai: boolean;
  livekit: boolean;
}

export default function Home() {
  const [health, setHealth] = useState<HealthStatus | null>(null);

  useEffect(() => {
    api
      .get("/health")
      .then((res) => setHealth(res.data))
      .catch(() => setHealth(null));
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <main className="flex flex-col items-center gap-8 px-6 text-center">
        <div className="space-y-3">
          <h1 className="text-5xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Revio
          </h1>
          <p className="max-w-md text-lg text-zinc-600 dark:text-zinc-400">
            AI-powered recruitment assistant. Find the perfect candidates through
            natural conversation.
          </p>
        </div>

        <div className="flex gap-4">
          <Link
            href="/chat"
            className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Start Conversation
          </Link>
          <Link
            href="/admin/login"
            className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Admin Panel
          </Link>
        </div>

        {/* API status */}
        <div className="flex items-center gap-3 text-xs text-zinc-400">
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                health ? "bg-green-500" : "bg-red-500"
              }`}
            />
            API {health ? "Online" : "Offline"}
          </div>
          {health && (
            <>
              <div className="flex items-center gap-1.5">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    health.openai ? "bg-green-500" : "bg-yellow-500"
                  }`}
                />
                OpenAI {health.openai ? "Ready" : "Not configured"}
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    health.livekit ? "bg-green-500" : "bg-yellow-500"
                  }`}
                />
                Voice {health.livekit ? "Ready" : "Not configured"}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
