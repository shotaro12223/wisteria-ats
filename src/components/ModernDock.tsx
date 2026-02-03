"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LOGO_SRC = "/wisteria-logo.avif";

const DOCK_ITEMS = [
  { href: "/", icon: "home", label: "ホーム", shortcut: "1" },
  { href: "/companies", icon: "building", label: "会社", shortcut: "2" },
  { href: "/deals", icon: "handshake", label: "商談", shortcut: "3" },
  { href: "/applicants", icon: "inbox", label: "応募", shortcut: "4" },
  { href: "/work-queue", icon: "clipboard", label: "タスク", shortcut: "5" },
  { href: "/analytics", icon: "chart", label: "分析", shortcut: "6" },
  { href: "/chat", icon: "chat", label: "チャット", shortcut: "7" },
];

const ICONS: Record<string, React.ReactNode> = {
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1V9.5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  building: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2m-2 0v-2M5 21H3m2 0v-2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 7h1m4 0h1M9 11h1m4 0h1M9 15h1m4 0h1" strokeLinecap="round" />
    </svg>
  ),
  handshake: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <path d="M12 8V4m0 4L8 4m4 4l4-4M5 12h14M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2M5 12V9a2 2 0 012-2h10a2 2 0 012 2v3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  inbox: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <path d="M22 12h-6l-2 3h-4l-2-3H2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  clipboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="9" y="3" width="6" height="4" rx="1" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 12h6m-6 4h6" strokeLinecap="round" />
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <path d="M18 20V10M12 20V4M6 20v-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  chat: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  ),
  file: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 2v6h6M16 13H8m8 4H8m2-8H8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
    </svg>
  ),
  briefcase: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <path d="M12 5v14m-7-7h14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  list: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

function parseContext(pathname: string): { companyId: string | null; jobId: string | null } {
  const m = pathname.match(/^\/companies\/([^\/]+)(?:\/jobs\/([^\/]+))?/);
  const companyId = m?.[1] ? decodeURIComponent(m[1]) : null;
  const jobSeg = m?.[2] ? decodeURIComponent(m[2]) : null;
  if (!companyId) return { companyId: null, jobId: null };
  if (!jobSeg || jobSeg === "new") return { companyId, jobId: null };
  return { companyId, jobId: jobSeg };
}

type DockProps = {
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
};

export default function ModernDock({ expanded, onExpandedChange }: DockProps) {
  const pathname = usePathname();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [companyName, setCompanyName] = useState("");

  const { companyId, jobId } = useMemo(() => parseContext(pathname), [pathname]);
  const hasContext = !!companyId;
  const workQueueAdminPaths = ["/admin/meeting-requests", "/admin/support"];
  const isWorkQueue = pathname.startsWith("/work-queue") || workQueueAdminPaths.some((p) => pathname.startsWith(p));
  const isAdmin = pathname.startsWith("/admin") && !isWorkQueue;

  // Fetch company name
  useEffect(() => {
    if (!companyId) {
      setCompanyName("");
      return;
    }
    let alive = true;
    fetch(`/api/companies/${encodeURIComponent(companyId)}`)
      .then(r => r.json())
      .then(j => {
        if (!alive) return;
        setCompanyName(j?.company?.company_name || j?.company_name || j?.name || "");
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [companyId]);

  const contextItems = useMemo(() => {
    if (!companyId) return [];
    const cid = encodeURIComponent(companyId);
    const items = [
      { href: `/companies/${cid}`, icon: "building", label: "会社トップ" },
      { href: `/companies/${cid}/deal`, icon: "calendar", label: "打ち合わせ" },
      { href: `/companies/${cid}/jobs`, icon: "list", label: "求人一覧" },
      { href: `/companies/${cid}/jobs/new`, icon: "plus", label: "求人追加" },
      { href: `/companies/${cid}/analytics`, icon: "chart", label: "分析" },
      { href: `/companies/${cid}/record`, icon: "file", label: "台帳" },
    ];
    if (jobId) {
      const jid = encodeURIComponent(jobId);
      items.push(
        { href: `/companies/${cid}/jobs/${jid}`, icon: "briefcase", label: "求人詳細" },
        { href: `/companies/${cid}/jobs/${jid}/outputs`, icon: "file", label: "出力" },
      );
    }
    return items;
  }, [companyId, jobId]);

  const adminItems = useMemo(() => {
    if (!isAdmin) return [];
    return [
      { href: "/admin/users", icon: "settings", label: "ユーザー管理" },
      { href: "/admin/client-users", icon: "building", label: "会社アカウント" },
    ];
  }, [isAdmin]);

  // Badge counts for work queue sidebar
  const [badges, setBadges] = useState<{ support: number; meetings: number }>({ support: 0, meetings: 0 });

  const loadBadges = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/badges", { cache: "no-store" });
      const data = await res.json();
      if (data.ok) setBadges(data.data);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    if (!isWorkQueue) return;
    loadBadges();
    const interval = setInterval(loadBadges, 10000);
    return () => clearInterval(interval);
  }, [isWorkQueue, loadBadges]);

  const workQueueItems = useMemo(() => {
    if (!isWorkQueue) return [];
    return [
      { href: "/admin/meeting-requests", icon: "calendar", label: "打ち合わせ希望", badge: badges.meetings },
      { href: "/admin/support", icon: "chat", label: "問い合わせ", badge: badges.support },
    ];
  }, [isWorkQueue, badges]);

  return (
    <div
      className="fixed left-0 top-0 bottom-0 z-40 flex"
      onMouseEnter={() => onExpandedChange(true)}
      onMouseLeave={() => onExpandedChange(false)}
    >
      {/* Main Dock */}
      <nav className={[
        "flex flex-col h-full py-3 px-2 transition-all duration-200 ease-out",
        "bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl",
        "border-r border-slate-200/50 dark:border-slate-800/50",
        expanded ? "w-52" : "w-14",
      ].join(" ")}>
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 px-2 py-2 mb-2 group">
          <div className="relative h-8 w-8 rounded-xl overflow-hidden shrink-0 ring-2 ring-indigo-100 dark:ring-indigo-900/50 shadow-sm">
            <Image src={LOGO_SRC} alt="Wisteria" fill sizes="32px" className="object-contain" priority unoptimized />
          </div>
          <span className={[
            "text-base font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent whitespace-nowrap transition-all duration-200",
            expanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden",
          ].join(" ")}>
            Wisteria
          </span>
        </Link>

        <div className="mx-2 mb-2 h-px bg-gradient-to-r from-slate-200 dark:from-slate-700 to-transparent" />

        {/* Main nav items */}
        <div className="flex flex-col gap-1">
          {DOCK_ITEMS.map((item, index) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={[
                  "relative flex items-center gap-3 px-2.5 py-2 rounded-xl transition-all duration-150",
                  active
                    ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white",
                ].join(" ")}
              >
                <span className="shrink-0 w-5 h-5 flex items-center justify-center">
                  {ICONS[item.icon]}
                </span>
                <span className={[
                  "text-sm font-medium whitespace-nowrap transition-all duration-200",
                  expanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden",
                ].join(" ")}>
                  {item.label}
                </span>
                {!expanded && hoveredIndex === index && (
                  <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium whitespace-nowrap shadow-xl z-50">
                    {item.label}
                    <span className="ml-2 opacity-50">⌘{item.shortcut}</span>
                  </div>
                )}
              </Link>
            );
          })}
        </div>

        {/* Context navigation */}
        {hasContext && (
          <>
            <div className="my-3 mx-2 h-px bg-gradient-to-r from-slate-200 dark:from-slate-700 to-transparent" />

            {/* Company name header */}
            {expanded && companyName && (
              <div className="px-3 py-1.5 mb-1">
                <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">会社</div>
                <div className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{companyName}</div>
              </div>
            )}

            <div className="flex flex-col gap-0.5">
              {contextItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      "flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg transition-all duration-150",
                      active
                        ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                        : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-300",
                    ].join(" ")}
                  >
                    <span className="shrink-0 w-4 h-4 flex items-center justify-center opacity-70">
                      {ICONS[item.icon]}
                    </span>
                    <span className={[
                      "text-xs font-medium whitespace-nowrap transition-all duration-200",
                      expanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden",
                    ].join(" ")}>
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </>
        )}

        {/* Work Queue context navigation */}
        {isWorkQueue && workQueueItems.length > 0 && (
          <>
            <div className="my-3 mx-2 h-px bg-gradient-to-r from-slate-200 dark:from-slate-700 to-transparent" />

            {expanded && (
              <div className="px-3 py-1.5 mb-1">
                <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">クライアント</div>
              </div>
            )}

            <div className="flex flex-col gap-0.5">
              {workQueueItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      "relative flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg transition-all duration-150 overflow-hidden",
                      active
                        ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                        : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-300",
                    ].join(" ")}
                  >
                    <span className="shrink-0 w-4 h-4 flex items-center justify-center opacity-70">
                      {ICONS[item.icon]}
                    </span>
                    <span className={[
                      "text-xs font-medium whitespace-nowrap transition-all duration-200",
                      expanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden",
                    ].join(" ")}>
                      {item.label}
                    </span>
                    {item.badge > 0 && (
                      <span className={[
                        "flex-shrink-0 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold leading-none",
                        expanded ? "ml-auto" : "absolute top-0 right-0",
                      ].join(" ")}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </>
        )}

        {/* Admin context navigation */}
        {isAdmin && adminItems.length > 0 && (
          <>
            <div className="my-3 mx-2 h-px bg-gradient-to-r from-slate-200 dark:from-slate-700 to-transparent" />

            {expanded && (
              <div className="px-3 py-1.5 mb-1">
                <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">管理</div>
              </div>
            )}

            <div className="flex flex-col gap-0.5">
              {adminItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      "flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg transition-all duration-150",
                      active
                        ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                        : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-300",
                    ].join(" ")}
                  >
                    <span className="shrink-0 w-4 h-4 flex items-center justify-center opacity-70">
                      {ICONS[item.icon]}
                    </span>
                    <span className={[
                      "text-xs font-medium whitespace-nowrap transition-all duration-200",
                      expanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden",
                    ].join(" ")}>
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom items */}
        <div className="flex flex-col gap-1 mt-2">
          <div className="mx-2 h-px bg-gradient-to-r from-slate-200 dark:from-slate-700 to-transparent" />
          <Link
            href="/me"
            className={[
              "flex items-center gap-3 px-2.5 py-2 rounded-xl transition-all duration-150",
              isActive(pathname, "/me")
                ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
                : "text-slate-500 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-300",
            ].join(" ")}
          >
            <span className="shrink-0 w-5 h-5 flex items-center justify-center">
              {ICONS.settings}
            </span>
            <span className={[
              "text-sm font-medium whitespace-nowrap transition-all duration-200",
              expanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden",
            ].join(" ")}>
              設定
            </span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
