"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";
import PresenceDropdown from "@/components/PresenceDropdown";
import MembersPresenceModal from "@/components/MembersPresenceModal";
import ThemeToggle from "@/components/ThemeToggle";


export const SIDEBAR_W = 248;
export const TOPBAR_H = 44;
const BRAND_TEXT = "Wisteria";
const LOGO_SRC = "/wisteria-logo.avif";


function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

function initials(name: string) {
  const t = String(name ?? "").trim();
  if (!t) return "U";
  const p = t.split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[p.length - 1]?.[0] ?? "")).toUpperCase();
}


const UI = {
  BAR: "bg-white dark:bg-slate-800 border-b border-slate-200/60 dark:border-slate-700 shadow-sm",
  TAB:
    "inline-flex items-center justify-center h-9 px-3 text-[12px] font-semibold rounded-lg transition-all duration-200 whitespace-nowrap",
  TAB_ACTIVE: "text-slate-950 dark:text-slate-100 relative bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30",
  TAB_INACTIVE: "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700",
  TAB_UNDERLINE: "absolute left-2 right-2 -bottom-[6px] h-[3px] rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 dark:from-indigo-400 dark:to-purple-500 shadow-sm",

  ICON_BTN:
    "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/60 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 shadow-sm hover:bg-gradient-to-br hover:from-slate-50 hover:to-slate-100 dark:hover:from-slate-700 dark:hover:to-slate-600 hover:text-slate-900 dark:hover:text-slate-100 hover:shadow-md hover:scale-105 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40",

  MENU:
    "absolute right-0 top-[calc(100%+8px)] z-50 w-60 rounded-xl border border-slate-200/60 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl overflow-hidden",
  MENU_ITEM:
    "flex w-full flex-col px-3 py-2 text-left text-[12px] font-semibold text-slate-800 dark:text-slate-200 hover:bg-gradient-to-r hover:from-slate-50 hover:to-slate-100 dark:hover:from-slate-700 dark:hover:to-slate-600 transition-all duration-150",
  MENU_SUB: "text-[11px] font-medium text-slate-500 dark:text-slate-400",
  MENU_DANGER:
    "flex w-full flex-col px-3 py-2 text-left text-[12px] font-semibold text-rose-800 dark:text-rose-400 hover:bg-gradient-to-r hover:from-rose-50 hover:to-rose-100 dark:hover:from-rose-900/30 dark:hover:to-rose-800/30 transition-all duration-150",
  MENU_SUB_DANGER: "text-[11px] font-medium text-rose-700/80 dark:text-rose-500/80",
  DIV: "h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent",
};

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="gear-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
      </defs>
      <path
        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
        stroke="url(#gear-gradient)"
        strokeWidth="2"
      />
      <path
        d="M19.4 15a8.3 8.3 0 0 0 .1-2l2-1.2-2-3.4-2.3.7a7.9 7.9 0 0 0-1.7-1l-.3-2.4H10.8l-.3 2.4c-.6.2-1.2.6-1.7 1l-2.3-.7-2 3.4 2 1.2a8.3 8.3 0 0 0 .1 2l-2 1.2 2 3.4 2.3-.7c.5.4 1.1.7 1.7 1l.3 2.4h4.1l.3-2.4c.6-.2 1.2-.6 1.7-1l2.3.7 2-3.4-2-1.2Z"
        stroke="url(#gear-gradient)"
        strokeWidth="2"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="calendar-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <path d="M7 3v3M17 3v3M4 8h16" stroke="url(#calendar-gradient)" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M6 5h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
        stroke="url(#calendar-gradient)"
        strokeWidth="2"
      />
      <path
        d="M8 12h3M8 16h3M13 12h3M13 16h3"
        stroke="url(#calendar-gradient)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="bell-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#ef4444" />
        </linearGradient>
      </defs>
      <path
        d="M18 8A6 6 0 1 0 6 8c0 7-3 9-3 9h18s-3-2-3-9ZM13.73 21a2 2 0 0 1-3.46 0"
        stroke="url(#bell-gradient)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}


function useOutsideClose<T extends Element>(
  open: boolean,
  onClose: () => void,
  refs: Array<React.RefObject<T>>
) {
  useEffect(() => {
    if (!open) return;

    const onDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;

      for (const r of refs) {
        const el = r.current;
        if (el && el.contains(target)) return;
      }
      onClose();
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", onDown, { passive: true });
    document.addEventListener("touchstart", onDown, { passive: true });
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("mousedown", onDown as any);
      document.removeEventListener("touchstart", onDown as any);
      document.removeEventListener("keydown", onKey as any);
    };
  }, [open, onClose, refs]);
}


export default function MobileTopBar() {
  const pathname = usePathname();
  const router = useRouter();

  const [openMembers, setOpenMembers] = useState(false);
  const [openMenu, setOpenMenu] = useState(false);

  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [logoutErr, setLogoutErr] = useState("");
  const [unacknowledgedCount, setUnacknowledgedCount] = useState(0);

  useOutsideClose(openMenu, () => setOpenMenu(false), [
    menuBtnRef as unknown as React.RefObject<Element>,
    menuRef as unknown as React.RefObject<Element>,
  ]);

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
    return () => {
      alive = false;
    };
  }, []);

  // 未確認タスク数を取得
  useEffect(() => {
    let alive = true;

    const loadUnacknowledgedCount = async () => {
      try {
        const res = await fetch("/api/work-queue/unacknowledged-count", { cache: "no-store" });
        const json = await res.json();
        if (!alive) return;
        if (json.ok) {
          setUnacknowledgedCount(json.count || 0);
        }
      } catch (err) {
        console.error("Failed to load unacknowledged count:", err);
      }
    };

    loadUnacknowledgedCount();

    // 30秒ごとに更新
    const interval = setInterval(loadUnacknowledgedCount, 30000);

    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, []);

  const tabs = useMemo(
    () => [
      { href: "/", label: "ホーム" },
      { href: "/companies", label: "会社" },
      { href: "/deals", label: "商談" }, // ✅ 追加
      // ✅ /jobs はトップバーに不要なので削除
      { href: "/applicants", label: "応募" },
      { href: "/work-queue", label: "Work Queue" },
      { href: "/analytics", label: "分析" },
      { href: "/chat", label: "チャット" },
    ],
    []
  );

  async function handleLogout() {
    if (logoutBusy) return;

    setLogoutBusy(true);
    setLogoutErr("");

    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        setLogoutErr(t || `logout failed (${res.status})`);
        return;
      }

      setOpenMenu(false);
      router.push("/login");
      router.refresh();
    } catch (e: any) {
      setLogoutErr(String(e?.message ?? e));
    } finally {
      setLogoutBusy(false);
    }
  }

  return (
    <div className={`sticky top-0 z-40 ${UI.BAR}`} style={{ height: TOPBAR_H }}>
      <div className="grid h-full items-center" style={{ gridTemplateColumns: `${SIDEBAR_W}px 1fr auto` }}>
        {/* Left */}
        <div className="px-4 flex items-center gap-2.5">
          <Link href="/" className="flex items-center gap-2.5 min-w-0">
            <div className="relative h-7 w-7 shrink-0">
              <Image src={LOGO_SRC} alt="Wisteria" fill sizes="28px" className="object-contain" priority unoptimized />
            </div>
            <span className="truncate text-[17px] font-bold tracking-wide bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-500 bg-clip-text text-transparent">
              {BRAND_TEXT}
            </span>
          </Link>
        </div>

        {/* Center */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar px-2">
          {tabs.map((t) => {
            const active = isActive(pathname, t.href);
            return (
              <Link key={t.href} href={t.href} className={`${UI.TAB} ${active ? UI.TAB_ACTIVE : UI.TAB_INACTIVE}`}>
                <span className="relative">
                  {t.label}
                  {active ? <span className={UI.TAB_UNDERLINE} /> : null}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Right */}
        <div className="px-3 flex items-center gap-2">
          <ThemeToggle />

          <Link href="/calendar" className={UI.ICON_BTN} aria-label="カレンダー" title="カレンダー">
            <CalendarIcon />
          </Link>

          <Link href="/work-queue" className={`${UI.ICON_BTN} relative`} aria-label="Work Queue" title="Work Queue">
            <BellIcon />
            {unacknowledgedCount > 0 && (
              <>
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 text-white text-[10px] font-bold flex items-center justify-center shadow-lg animate-pulse">
                  {unacknowledgedCount > 99 ? "99+" : unacknowledgedCount}
                </span>
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-rose-400 animate-ping opacity-75"></span>
              </>
            )}
          </Link>

          <PresenceDropdown />

          <button
            type="button"
            className="cv-btn-secondary !px-2 !py-1 text-[12px] whitespace-nowrap"
            onClick={() => setOpenMembers(true)}
          >
            メンバー
          </button>

          <Link
            href="/me"
            className="relative h-8 w-8 rounded-full border-2 border-slate-200/80 dark:border-slate-700 bg-slate-900 dark:bg-slate-700 text-white flex items-center justify-center text-[11px] font-semibold shadow-sm hover:shadow-md transition overflow-hidden"
            aria-label="マイページ"
            title="マイページ"
          >
            {avatarUrl ? (
              <Image src={avatarUrl} alt={displayName || "User"} fill sizes="32px" className="object-cover" />
            ) : (
              <span>{initials(displayName || "User")}</span>
            )}
          </Link>

          <div className="relative">
            <button
              ref={menuBtnRef}
              type="button"
              className={UI.ICON_BTN}
              onClick={() => setOpenMenu((v) => !v)}
              aria-label="設定"
              aria-haspopup="menu"
              aria-expanded={openMenu}
            >
              <GearIcon />
            </button>

            {openMenu ? (
              <div ref={menuRef} className={UI.MENU} role="menu" aria-label="設定メニュー">
                <Link href="/me" className={UI.MENU_ITEM} role="menuitem" onClick={() => setOpenMenu(false)}>
                  <span>マイページ</span>
                  <span className={UI.MENU_SUB}>表示名 / ステータス</span>
                </Link>

                <div className={UI.DIV} />

                <Link href="/admin/users" className={UI.MENU_ITEM} role="menuitem" onClick={() => setOpenMenu(false)}>
                  <span>ユーザー管理</span>
                  <span className={UI.MENU_SUB}>招待 / 権限 / パスワード</span>
                </Link>

                <div className={UI.DIV} />

                <Link href="/calendar" className={UI.MENU_ITEM} role="menuitem" onClick={() => setOpenMenu(false)}>
                  <span>カレンダー</span>
                  <span className={UI.MENU_SUB}>1ヶ月の動き</span>
                </Link>

                <div className={UI.DIV} />

                <button
                  type="button"
                  className={UI.MENU_DANGER}
                  role="menuitem"
                  onClick={handleLogout}
                  disabled={logoutBusy}
                >
                  <span>{logoutBusy ? "ログアウト中..." : "ログアウト"}</span>
                  <span className={UI.MENU_SUB_DANGER}>{logoutErr ? logoutErr : "サインアウトしてログイン画面へ"}</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <MembersPresenceModal open={openMembers} onClose={() => setOpenMembers(false)} />
    </div>
  );
}
