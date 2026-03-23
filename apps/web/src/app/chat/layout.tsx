export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-zinc-950">
      {children}
    </div>
  );
}
