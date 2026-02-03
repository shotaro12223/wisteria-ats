"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import CommandPalette from "@/components/CommandPalette";

function initials(name: string) {
  const t = String(name ?? "").trim();
  if (!t) return "U";
  const p = t.split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[p.length - 1]?.[0] ?? "")).toUpperCase();
}

type TopBarProps = {
  dockExpanded: boolean;
};

export default function ModernTopBar({ dockExpanded }: TopBarProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [unacknowledgedCount, setUnacknowledgedCount] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut for command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowCommandPalette(true);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    let alive = true;
    fetch("/api/me/profile")
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        setDisplayName(String(j?.profile?.display_name ?? ""));
        setAvatarUrl(String(j?.profile?.avatar_url ?? ""));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/work-queue/unacknowledged-count", { cache: "no-store" });
        const json = await res.json();
        if (!alive) return;
        if (json.ok) setUnacknowledgedCount(json.count || 0);
      } catch {}
    };
    load();
    const interval = setInterval(load, 30000);
    return () => { alive = false; clearInterval(interval); };
  }, []);

  useEffect(() => {
    if (!showMenu) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [showMenu]);

  async function handleLogout() {
    if (logoutBusy) return;
    setLogoutBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setShowMenu(false);
      router.push("/login");
      router.refresh();
    } catch {}
    setLogoutBusy(false);
  }

  const handleCommandSelect = useCallback((command: { type: string; href?: string }) => {
    setShowCommandPalette(false);
    if (command.href) {
      router.push(command.href);
    }
  }, [router]);

  return (
    <>
      <header className={[
        "fixed top-0 right-0 z-50 px-4 pt-3 transition-all duration-200 ease-out",
        dockExpanded ? "left-52" : "left-14",
      ].join(" ")}>
        <div className="flex items-center h-12 px-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg shadow-slate-900/5 dark:shadow-black/20">
            {/* Center - Command Bar Trigger */}
            <div className="flex-1 flex justify-center">
              <button
                onClick={() => setShowCommandPalette(true)}
                className="flex items-center gap-3 w-full max-w-md px-4 py-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 text-slate-500 dark:text-slate-400 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 hover:text-slate-600 dark:hover:text-slate-300 transition-all group"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 shrink-0">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
                </svg>
                <span className="text-sm truncate">検索、ページ移動、コマンド...</span>
                <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-[10px] font-semibold text-slate-500 dark:text-slate-400 shadow-sm">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </button>
            </div>

            {/* Right - Controls */}
            <div className="flex items-center gap-1 shrink-0">
              {/* Calendar */}
              <Link
                href="/calendar"
                className="flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-all"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-[18px] h-[18px]">
                  <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>

              {/* Notification bell */}
              <Link
                href="/work-queue"
                className="relative flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-all"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-[18px] h-[18px]">
                  <path d="M18 8A6 6 0 106 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {unacknowledgedCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {unacknowledgedCount > 99 ? "99+" : unacknowledgedCount}
                  </span>
                )}
              </Link>

              {/* Theme toggle */}
              <ThemeToggle />

              {/* User menu */}
              <div className="relative ml-1" ref={menuRef}>
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all group"
                >
                  <div className="relative h-7 w-7 rounded-full overflow-hidden ring-2 ring-white dark:ring-slate-800 shadow-sm">
                    {avatarUrl ? (
                      <Image src={avatarUrl} alt={displayName || "User"} fill sizes="28px" className="object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-semibold">
                        {initials(displayName || "User")}
                      </div>
                    )}
                  </div>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-slate-400">
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {/* Dropdown menu */}
                {showMenu && (
                  <div className="absolute right-0 top-full mt-2 w-52 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 shadow-2xl shadow-slate-900/10 dark:shadow-black/30 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700">
                      <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{displayName || "User"}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">管理者</div>
                    </div>
                    <div className="p-1.5">
                      <Link
                        href="/me"
                        onClick={() => setShowMenu(false)}
                        className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 opacity-60">
                          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                        マイページ
                      </Link>
                      <Link
                        href="/admin/users"
                        onClick={() => setShowMenu(false)}
                        className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 opacity-60">
                          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        ユーザー管理
                      </Link>
                    </div>
                    <div className="h-px bg-slate-100 dark:bg-slate-700" />
                    <div className="p-1.5">
                      <button
                        onClick={handleLogout}
                        disabled={logoutBusy}
                        className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 opacity-60">
                          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {logoutBusy ? "ログアウト中..." : "ログアウト"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
      </header>

      {/* Command Palette */}
      <CommandPalette
        open={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onSelect={handleCommandSelect}
      />
    </>
  );
}
