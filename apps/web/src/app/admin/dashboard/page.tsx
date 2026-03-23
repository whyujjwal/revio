"use client";

import { useEffect, useState } from "react";
import { FileText, CheckCircle, XCircle, Loader } from "lucide-react";
import api from "@/lib/api";

interface Stats {
  total_resumes: number;
  completed_resumes: number;
  failed_resumes: number;
  processing_resumes: number;
  skills_breakdown: Record<string, number>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/resumes/stats")
      .then((res) => setStats(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="animate-spin text-zinc-400" size={24} />
      </div>
    );
  }

  if (!stats) return <p className="text-zinc-500">Failed to load stats.</p>;

  const cards = [
    { label: "Total Resumes", value: stats.total_resumes, icon: FileText, color: "text-blue-600" },
    { label: "Completed", value: stats.completed_resumes, icon: CheckCircle, color: "text-green-600" },
    { label: "Failed", value: stats.failed_resumes, icon: XCircle, color: "text-red-600" },
    { label: "Processing", value: stats.processing_resumes, icon: Loader, color: "text-yellow-600" },
  ];

  const topSkills = Object.entries(stats.skills_breakdown).slice(0, 15);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{card.label}</p>
                <Icon size={18} className={card.color} />
              </div>
              <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">{card.value}</p>
            </div>
          );
        })}
      </div>

      {topSkills.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">Top Skills</h2>
          <div className="space-y-2">
            {topSkills.map(([skill, count]) => {
              const maxCount = topSkills[0]?.[1] || 1;
              const pct = (count / (maxCount as number)) * 100;
              return (
                <div key={skill} className="flex items-center gap-3">
                  <span className="w-32 text-sm text-zinc-600 dark:text-zinc-400 truncate">{skill}</span>
                  <div className="flex-1 h-5 bg-zinc-100 rounded dark:bg-zinc-800">
                    <div
                      className="h-full bg-zinc-900 rounded dark:bg-white transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 w-8 text-right">
                    {count as number}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
