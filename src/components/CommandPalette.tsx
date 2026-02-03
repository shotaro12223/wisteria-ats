"use client";

import { useEffect, useRef, useState, useMemo } from "react";

type CommandItem = {
  id: string;
  type: "page" | "company" | "action";
  label: string;
  description?: string;
  href?: string;
  icon?: string;
  shortcut?: string;
};

const PAGES: CommandItem[] = [
  { id: "home", type: "page", label: "ホーム", href: "/", icon: "home" },
  { id: "companies", type: "page", label: "会社一覧", href: "/companies", icon: "building" },
  { id: "companies-new", type: "page", label: "会社を追加", href: "/companies/new", icon: "plus" },
  { id: "deals", type: "page", label: "商談", href: "/deals", icon: "handshake" },
  { id: "deals-new", type: "page", label: "商談を追加", href: "/deals/new", icon: "plus" },
  { id: "applicants", type: "page", label: "応募一覧", href: "/applicants", icon: "inbox" },
  { id: "work-queue", type: "page", label: "Work Queue", href: "/work-queue", icon: "clipboard" },
  { id: "analytics", type: "page", label: "分析", href: "/analytics", icon: "chart" },
  { id: "chat", type: "page", label: "チャット", href: "/chat", icon: "chat" },
  { id: "calendar", type: "page", label: "カレンダー", href: "/calendar", icon: "calendar" },
  { id: "me", type: "page", label: "マイページ", href: "/me", icon: "user" },
  { id: "admin-users", type: "page", label: "ユーザー管理", href: "/admin/users", icon: "users" },
];

const ICONS: Record<string, React.ReactNode> = {
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1V9.5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  building: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 7h1m4 0h1M9 11h1m4 0h1M9 15h1m4 0h1" strokeLinecap="round" />
    </svg>
  ),
  handshake: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <path d="M12 8V4m0 4L8 4m4 4l4-4M5 12h14M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  inbox: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <path d="M22 12h-6l-2 3h-4l-2-3H2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  clipboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <path d="M18 20V10M12 20V4M6 20v-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  chat: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
    </svg>
  ),
  user: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <path d="M12 5v14m-7-7h14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
    </svg>
  ),
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (item: { type: string; href?: string }) => void;
};

export default function CommandPalette({ open, onClose, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [companies, setCompanies] = useState<CommandItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Fetch companies for search
  useEffect(() => {
    if (!open) return;
    let alive = true;
    fetch("/api/companies?limit=100")
      .then(r => r.json())
      .then(j => {
        if (!alive) return;
        const items = (j?.items || j?.companies || []).map((c: any) => ({
          id: `company-${c.id}`,
          type: "company" as const,
          label: c.company_name || c.name || "Unknown",
          description: "会社",
          href: `/companies/${encodeURIComponent(c.id)}`,
          icon: "building",
        }));
        setCompanies(items);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [open]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Filter results
  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    const allItems = [...PAGES, ...companies];

    if (!q) {
      return PAGES.slice(0, 8);
    }

    return allItems.filter(item => {
      const label = item.label.toLowerCase();
      const desc = (item.description || "").toLowerCase();
      return label.includes(q) || desc.includes(q);
    }).slice(0, 10);
  }, [query, companies]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const item = results[selectedIndex];
        if (item) {
          onSelect({ type: item.type, href: item.href });
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, results, selectedIndex, onClose, onSelect]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const selected = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
    if (selected) {
      selected.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 dark:bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="absolute left-1/2 top-[15%] -translate-x-1/2 w-full max-w-xl px-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl shadow-slate-900/20 dark:shadow-black/40 border border-slate-200/50 dark:border-slate-700/50 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200/50 dark:border-slate-700/50">
            <span className="text-slate-400 dark:text-slate-500">
              {ICONS.search}
            </span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="検索、ページ移動、コマンド..."
              className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none"
            />
            <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-medium text-slate-500 dark:text-slate-400">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-80 overflow-y-auto p-2">
            {results.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                結果が見つかりません
              </div>
            ) : (
              <div className="space-y-0.5">
                {results.map((item, index) => (
                  <button
                    key={item.id}
                    data-index={index}
                    onClick={() => onSelect({ type: item.type, href: item.href })}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={[
                      "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left transition-colors",
                      selectedIndex === index
                        ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-100"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800",
                    ].join(" ")}
                  >
                    <span className={[
                      "shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
                      selectedIndex === index
                        ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400",
                    ].join(" ")}>
                      {item.icon && ICONS[item.icon]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{item.label}</div>
                      {item.description && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{item.description}</div>
                      )}
                    </div>
                    {item.type === "company" && (
                      <span className="shrink-0 text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase">
                        会社
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-slate-200/50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50">
            <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px]">↑</kbd>
                <kbd className="px-1 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px]">↓</kbd>
                移動
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px]">↵</kbd>
                決定
              </span>
            </div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500">
              {results.length} 件
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
