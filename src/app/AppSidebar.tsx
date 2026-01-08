"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  desc?: string;
  badge?: string;
};

const MAIN: NavItem[] = [
  { href: "/", label: "Home", desc: "ダッシュボード" },
  { href: "/companies", label: "会社", desc: "会社概要と求人を管理" },
  // { href: "/jobs", label: "求人", desc: "全求人を横断で見る" }, // ← 削除
  { href: "/work-queue", label: "Work Queue", desc: "今日やること" },
  { href: "/analytics", label: "分析", desc: "媒体別の応募状況" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

function itemClass(active: boolean) {
  return [
    "group flex w-full items-start gap-3 rounded-2xl border px-3 py-3",
    "transition",
    active
      ? "bg-[rgba(15,23,42,0.06)] border-[rgba(15,23,42,0.14)]"
      : "bg-white border-[var(--border)] hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)]",
  ].join(" ");
}

function dotClass(active: boolean) {
  return [
    "mt-1 h-2.5 w-2.5 rounded-full",
    active ? "bg-slate-900" : "bg-slate-200 group-hover:bg-slate-300",
  ].join(" ");
}

export default function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-30 h-screen w-[280px] border-r bg-white/80 backdrop-blur">
      <div className="flex h-full flex-col" style={{ borderColor: "var(--border)" }}>
        {/* Brand */}
        <div className="px-5 py-5">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900">wisteria-ats</div>
              <div className="mt-1 text-[11px] text-slate-500">PRJ-2025-9034</div>
            </div>
            <span className="rounded-full bg-slate-900 px-2 py-1 text-[11px] text-white">MVP</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-2 px-4">
          <div className="px-2 pb-1 text-[11px] font-semibold text-slate-500">MAIN</div>

          {MAIN.map((it) => {
            const active = isActive(pathname, it.href);
            return (
              <Link key={it.href} href={it.href} className={itemClass(active)}>
                <span className={dotClass(active)} />
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[13px] font-semibold text-slate-900">{it.label}</span>
                    {it.badge ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">
                        {it.badge}
                      </span>
                    ) : null}
                  </span>
                  {it.desc ? (
                    <span className="mt-0.5 block truncate text-[11px] text-slate-500">{it.desc}</span>
                  ) : null}
                </span>
              </Link>
            );
          })}

          <div className="mt-4 px-2 pb-1 text-[11px] font-semibold text-slate-500">SHORTCUT</div>

          <Link
            href="/companies/new"
            className="rounded-2xl border bg-white px-3 py-3 text-[13px] font-semibold text-slate-900 shadow-sm hover:bg-[var(--surface-hover)] transition"
            style={{ borderColor: "var(--border)" }}
          >
            + 会社を追加
            <div className="mt-0.5 text-[11px] font-normal text-slate-500">最初の登録から始める</div>
          </Link>
        </nav>

        {/* Footer */}
        <div className="p-4">
          <div
            className="rounded-2xl border bg-[rgba(15,23,42,0.02)] p-3 text-[11px] text-slate-600"
            style={{ borderColor: "var(--border)" }}
          >
            コツ：会社→求人→出力→データ→分析の順で回すと迷わない
          </div>
        </div>
      </div>
    </aside>
  );
}
