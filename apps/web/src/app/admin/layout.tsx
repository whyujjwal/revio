"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { BarChart3, FileText, LogOut, Upload } from "lucide-react";
import { AuthProvider, useAuth } from "@/lib/auth-context";

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isAuthenticated && !pathname.includes("/login")) {
      router.push("/admin/login");
    }
  }, [isAuthenticated, pathname, router]);

  if (!isAuthenticated && !pathname.includes("/login")) {
    return null;
  }

  if (pathname.includes("/login")) {
    return <>{children}</>;
  }

  const navItems = [
    { href: "/admin/dashboard", label: "Dashboard", icon: BarChart3 },
    { href: "/admin/resumes", label: "Resumes", icon: FileText },
    { href: "/admin/upload", label: "Upload", icon: Upload },
  ];

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950">
      <aside className="w-64 border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 flex flex-col">
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
          <Link href="/admin/dashboard" className="text-xl font-bold text-zinc-900 dark:text-white">
            Revio Admin
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => { logout(); router.push("/admin/login"); }}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white w-full"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-8">
        {children}
      </main>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AdminGuard>{children}</AdminGuard>
    </AuthProvider>
  );
}
