"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Search, Trash2, Loader, ChevronLeft, ChevronRight } from "lucide-react";
import api from "@/lib/api";

interface ResumeItem {
  id: number;
  original_filename: string;
  candidate_name: string | null;
  email: string | null;
  skills: string[] | null;
  status: string;
  created_at: string;
}

interface ListResponse {
  resumes: ResumeItem[];
  total: number;
  page: number;
  page_size: number;
}

export default function ResumesPage() {
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const fetchResumes = async (p: number, q: string) => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page: p, page_size: 20 };
      if (q) params.search = q;
      const res = await api.get("/resumes", { params });
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResumes(page, search);
  }, [page, search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this resume?")) return;
    try {
      await api.delete(`/resumes/${id}`);
      fetchResumes(page, search);
    } catch (err) {
      console.error(err);
    }
  };

  const totalPages = data ? Math.ceil(data.total / data.page_size) : 0;

  const statusBadge = (s: string) => {
    const colors: Record<string, string> = {
      completed: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
      failed: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
      processing: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
      pending: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[s] || colors.pending}`}>
        {s}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Resumes</h1>
        <span className="text-sm text-zinc-500">{data?.total || 0} total</span>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, email, or summary..."
            className="w-full rounded-lg border border-zinc-300 py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Search
        </button>
      </form>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader className="animate-spin text-zinc-400" size={24} />
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-900">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Skills</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-zinc-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-900/50">
                {data?.resumes.map((r) => (
                  <tr key={r.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/resumes/${r.id}`}
                        className="font-medium text-zinc-900 hover:underline dark:text-white"
                      >
                        {r.candidate_name || r.original_filename}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{r.email || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(r.skills || []).slice(0, 3).map((s) => (
                          <span
                            key={s}
                            className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                          >
                            {s}
                          </span>
                        ))}
                        {(r.skills?.length || 0) > 3 && (
                          <span className="text-xs text-zinc-400">+{r.skills!.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">{statusBadge(r.status)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="text-zinc-400 hover:text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {data?.resumes.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                      No resumes found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
