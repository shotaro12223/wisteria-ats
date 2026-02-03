"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import DatePicker from "@/components/DatePicker";

/* ─────────────── プレミアムHooks ─────────────── */
function useCountUp(end: number, duration = 1200) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (end === 0) { setVal(0); return; }
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(ease * end));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [end, duration]);
  return val;
}

function useTypingEffect(text: string, speed = 30) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    if (!text) { setDisplayed(""); return; }
    let i = 0;
    setDisplayed("");
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return displayed;
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return { greeting: "おはようございます", icon: "☀️" };
  if (h >= 12 && h < 17) return { greeting: "お疲れさまです", icon: "🌤" };
  if (h >= 17 && h < 21) return { greeting: "お疲れさまです", icon: "🌅" };
  return { greeting: "夜遅くまでお疲れさまです", icon: "🌙" };
}

type CompanyRow = {
  id: string;
  company_name: string;
  company_profile?: any;
  created_at: string;
  updated_at: string;

  // /api/companies が返す想定（record由来）
  record_status?: "active" | "risk" | "paused" | "inactive" | string | null;
  deal_stage?: string | null; // 例: 契約前 / 提案中 / 稟議中 / 契約中 / 休眠 / 解約 / NG
};

type CompaniesGetRes =
  | { ok: true; companies: CompanyRow[] }
  | { ok: false; error: { message: string } };

type LoadState = "loading" | "ready" | "error";

type ViewMode = "list" | "card";
type SortField = "name" | "updated" | "status" | "stage";
type SortDirection = "asc" | "desc";



function formatLocalDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function s(v: any) {
  return String(v ?? "").trim();
}

function lower(v: any) {
  return s(v).toLowerCase();
}



const UI = {
  // モダンパネル - シャドウ中心、軽いボーダー
  PANEL: [
    "rounded-2xl",
    "border border-slate-200/60 dark:border-slate-700/50",
    "bg-white/80 dark:bg-slate-800/80",
    "backdrop-blur-xl",
    "shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50",
  ].join(" "),
  PANEL_HDR: [
    "flex items-start justify-between gap-4",
    "border-b border-slate-100 dark:border-slate-700/50",
    "px-5 py-4",
  ].join(" "),
  PANEL_TITLE: "text-[14px] font-bold text-slate-800 dark:text-slate-100 tracking-tight",
  PANEL_SUB: "mt-1 text-[12px] text-slate-500 dark:text-slate-400",

  LINK: "text-sm font-semibold text-indigo-600 dark:text-indigo-400 whitespace-nowrap hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors",
  LINK_XS:
    "text-[13px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors whitespace-nowrap",

  INPUT: [
    "w-full rounded-xl border border-slate-200 dark:border-slate-600",
    "bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm",
    "px-4 py-2.5",
    "text-[13px] text-slate-800 dark:text-slate-200",
    "placeholder:text-slate-400 dark:placeholder:text-slate-500",
    "outline-none",
    "focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/30",
    "transition-all duration-200",
  ].join(" "),

  CHIP: [
    "inline-flex items-center justify-center",
    "rounded-full",
    "px-3 py-1.5",
    "text-[12px] font-medium whitespace-nowrap",
    "backdrop-blur-sm",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40",
    "transition-all duration-300 ease-out",
  ].join(" "),

  PAGE_BG: "relative min-h-screen",

  LIST_HEAD: [
    "hidden sm:grid sm:items-center sm:gap-4",
    "sm:border-b sm:border-slate-100 dark:sm:border-slate-700/50",
    "sm:px-5 sm:py-3",
    "text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500",
  ].join(" "),
  LIST_ROW: [
    "group",
    "px-4 py-3 sm:px-5 sm:py-3",
    "transition-all duration-300 ease-out",
    "hover:bg-gradient-to-r hover:from-slate-50/80 hover:to-transparent dark:hover:from-slate-700/30 dark:hover:to-transparent",
  ].join(" "),
  LIST_DIV: "divide-y divide-slate-100 dark:divide-slate-700/50",
} as const;



type StatusFilter = "all" | "active" | "risk" | "paused" | "inactive";

const STATUS_FILTERS: Array<{ key: StatusFilter; label: string }> = [
  { key: "all", label: "全部" },
  { key: "active", label: "稼働" },
  { key: "risk", label: "要注意" },
  { key: "paused", label: "停止" },
  { key: "inactive", label: "非稼働" },
];

function statusTone(status: string) {
  const x = lower(status);
  if (x === "inactive") return "bg-slate-100/80 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400";
  if (x === "paused") return "bg-amber-100/80 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400";
  if (x === "risk") return "bg-rose-100/80 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400";
  if (x === "active") return "bg-emerald-100/80 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400";
  return "bg-blue-100/80 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400";
}

function statusLabel(status: string) {
  const x = lower(status);
  if (x === "active") return "稼働";
  if (x === "risk") return "要注意";
  if (x === "paused") return "停止";
  if (x === "inactive") return "非稼働";
  return status || "—";
}

function StatusPill({ status }: { status: string }) {
  const t = statusTone(status);
  const x = lower(status);
  const dotColor = x === "active" ? "bg-emerald-500" : x === "risk" ? "bg-rose-500" : x === "paused" ? "bg-amber-500" : "bg-slate-400";

  return (
    <span
      className={["inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm", t].join(" ")}
      title={status}
    >
      <span className={["w-1.5 h-1.5 rounded-full animate-pulse", dotColor].join(" ")} />
      {statusLabel(status)}
    </span>
  );
}


type StageKey =
  | "all"
  | "契約前"
  | "提案中"
  | "稟議中"
  | "契約中"
  | "休眠"
  | "解約"
  | "NG"
  | "その他";

const STAGE_FILTERS: Array<{ key: StageKey; label: string }> = [
  { key: "all", label: "全部" },
  { key: "契約前", label: "契約前" },
  { key: "提案中", label: "提案中" },
  { key: "稟議中", label: "稟議中" },
  { key: "契約中", label: "契約中" },
  { key: "休眠", label: "休眠" },
  { key: "解約", label: "解約" },
  { key: "NG", label: "NG" },
  { key: "その他", label: "その他" },
];

function normalizeStage(v: any): string {
  return s(v);
}

function matchStageFilter(stage: string, filter: StageKey): boolean {
  if (filter === "all") return true;

  const st = normalizeStage(stage);
  if (!st) return filter === "その他";

  if (filter === "その他") {
    const known = new Set(
      STAGE_FILTERS.filter((x) => x.key !== "all" && x.key !== "その他").map((x) => String(x.key))
    );
    return !known.has(st);
  }

  return st === filter;
}



function CompanyIcon({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initial = (name || "?").charAt(0).toUpperCase();

  const sizeClasses = {
    sm: "w-9 h-9 text-sm",
    md: "w-11 h-11 text-base",
    lg: "w-14 h-14 text-lg",
  };

  // ハッシュ値を使って一貫した色を生成
  const hashCode = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
  };

  const colorIndex = hashCode(name) % 6;
  const gradients = [
    "from-indigo-500 via-purple-500 to-pink-500",
    "from-blue-500 via-cyan-500 to-teal-500",
    "from-purple-500 via-pink-500 to-rose-500",
    "from-cyan-500 via-blue-500 to-indigo-500",
    "from-violet-500 via-purple-500 to-fuchsia-500",
    "from-emerald-500 via-teal-500 to-cyan-500",
  ];

  return (
    <div
      className={[
        "relative inline-flex items-center justify-center rounded-2xl font-bold text-white",
        "bg-gradient-to-br",
        "shadow-lg",
        "ring-2 ring-white/20",
        "transition-transform duration-300 ease-out",
        "group-hover:scale-110 group-hover:shadow-xl",
        sizeClasses[size],
        gradients[colorIndex],
      ].join(" ")}
    >
      <span className="drop-shadow-sm">{initial}</span>
      <div className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    </div>
  );
}



function CompaniesHero({
  total,
  hits,
  active,
  risk,
  paused,
  inactive,
  onReload,
  loading,
  // Filter props
  q,
  setQ,
  statusFilter,
  setStatusFilter,
  stageFilter,
  setStageFilter,
  anyFilterOn,
  clearFilters,
  // Stats
  companies,
  errorMessage,
}: {
  total: number;
  hits: number;
  active: number;
  risk: number;
  paused: number;
  inactive: number;
  onReload: () => void;
  loading?: boolean;
  // Filter props
  q: string;
  setQ: (v: string) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (v: StatusFilter) => void;
  stageFilter: StageKey;
  setStageFilter: (v: StageKey) => void;
  anyFilterOn: boolean;
  clearFilters: () => void;
  // Stats
  companies: CompanyRow[];
  errorMessage: string;
}) {
  const heroRef = useRef<HTMLDivElement | null>(null);
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    setMouse({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    });
  }, []);

  // Float animation
  useEffect(() => {
    const styleId = "companies-float-anim";
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-20px)}}`;
    document.head.appendChild(style);
  }, []);

  const timeInfo = getTimeOfDay();
  const summaryText = loading
    ? "データを読み込み中..."
    : total === 0
      ? "登録されている会社がありません。"
      : `${total}社中${active}社が稼働中です。${risk > 0 ? `${risk}社が要注意です。` : ""}`;
  const typedSummary = useTypingEffect(summaryText, 25);

  // useCountUp for KPIs
  const totalAnim = useCountUp(total);
  const activeAnim = useCountUp(active);
  const riskAnim = useCountUp(risk);
  const pausedAnim = useCountUp(paused);

  // 営業ステージ別カウント
  const stageStats = useMemo(() => {
    const stats: Record<string, number> = {};
    companies.forEach((c) => {
      const stage = s(c.deal_stage) || "その他";
      stats[stage] = (stats[stage] || 0) + 1;
    });
    return stats;
  }, [companies]);

  const stageEntries = Object.entries(stageStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div
      ref={heroRef}
      onMouseMove={onMouseMove}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 shadow-2xl shadow-indigo-200/40 dark:shadow-black/40 ring-1 ring-indigo-100 dark:ring-white/5"
    >
      {/* マウス追従グラデーション */}
      <div
        className="pointer-events-none absolute h-[600px] w-[600px] rounded-full bg-gradient-to-br from-indigo-400/20 via-purple-400/15 to-pink-400/10 blur-3xl transition-all duration-500"
        style={{ left: `calc(${mouse.x * 100}% - 300px)`, top: `calc(${mouse.y * 100}% - 300px)` }}
      />
      {/* フローティングブロブ */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[400px] w-[400px] rounded-full bg-indigo-200/30 dark:bg-indigo-500/10 blur-3xl animate-[float_20s_ease-in-out_infinite]" />
        <div className="absolute -right-32 top-1/3 h-[300px] w-[300px] rounded-full bg-purple-200/25 dark:bg-purple-500/10 blur-3xl animate-[float_25s_ease-in-out_infinite_reverse]" />
        <div className="absolute left-1/3 -bottom-20 h-[250px] w-[400px] rounded-full bg-violet-100/40 dark:bg-violet-500/10 blur-3xl animate-[float_18s_ease-in-out_infinite_2s]" />
      </div>

      {/* メインコンテンツ */}
      <div className="relative z-10 px-6 pt-6 pb-5 lg:px-10">
        {/* Row 1: タイトル + KPI */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5 mb-5">
          {/* 左: タイトル・サマリー・ボタン */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{timeInfo.icon}</span>
              <h1 className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight">
                Companies
              </h1>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{typedSummary}<span className="animate-pulse">|</span></p>

            {/* アクションボタン */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onReload}
                disabled={loading}
                className="rounded-xl bg-indigo-600 dark:bg-white px-5 py-2.5 text-sm font-semibold text-white dark:text-indigo-700 shadow-lg shadow-indigo-500/25 hover:shadow-xl transition-all disabled:opacity-50"
              >
                {loading ? "読込中..." : "更新"}
              </button>
              <Link
                href="/companies/new"
                className="rounded-xl bg-white/80 dark:bg-white/10 backdrop-blur-sm px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 ring-1 ring-indigo-200/40 dark:ring-white/10 shadow-md hover:shadow-xl transition-all"
              >
                + 会社追加
              </Link>
            </div>
          </div>

          {/* 右: ステータスパネル（横並び） */}
          <div className="flex flex-wrap gap-3 lg:flex-nowrap">
            {/* 総数 */}
            <div className="flex items-center gap-3 rounded-xl bg-white/60 dark:bg-white/5 backdrop-blur-md px-4 py-3 ring-1 ring-indigo-200/40 dark:ring-white/10 shadow-lg">
              <div className="h-10 w-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">総数</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums leading-none">{totalAnim}</div>
              </div>
            </div>

            {/* 稼働 */}
            <div className="flex items-center gap-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-900/30 backdrop-blur-md px-4 py-3 ring-1 ring-emerald-200/60 dark:ring-emerald-700/40 shadow-lg">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase">稼働</div>
                <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 tabular-nums leading-none">{activeAnim}</div>
              </div>
            </div>

            {/* 要注意 */}
            {risk > 0 && (
              <div className="flex items-center gap-3 rounded-xl bg-rose-50/80 dark:bg-rose-900/30 backdrop-blur-md px-4 py-3 ring-1 ring-rose-200/60 dark:ring-rose-700/40 shadow-lg">
                <div className="h-10 w-10 rounded-xl bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-rose-600 dark:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 uppercase">要注意</div>
                  <div className="text-2xl font-bold text-rose-700 dark:text-rose-300 tabular-nums leading-none">{riskAnim}</div>
                </div>
              </div>
            )}

            {/* 停止 */}
            {paused > 0 && (
              <div className="flex items-center gap-3 rounded-xl bg-amber-50/80 dark:bg-amber-900/30 backdrop-blur-md px-4 py-3 ring-1 ring-amber-200/60 dark:ring-amber-700/40 shadow-lg">
                <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase">停止</div>
                  <div className="text-2xl font-bold text-amber-700 dark:text-amber-300 tabular-nums leading-none">{pausedAnim}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Row 2: 検索 + フィルター */}
        <div className="space-y-3 pt-4 border-t border-slate-200/50 dark:border-white/10">
          {/* 検索 + 稼働ステータス */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="flex-1 max-w-md">
              <input
                className="w-full rounded-xl border border-slate-200/60 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur-sm px-4 py-2.5 text-[13px] text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-400/40 transition-all"
                placeholder="会社名で検索…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">稼働</span>
              {STATUS_FILTERS.map((f) => {
                const isActive = statusFilter === f.key;
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setStatusFilter(f.key)}
                    className={[
                      "rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all",
                      isActive
                        ? "bg-white dark:bg-white/20 text-slate-900 dark:text-white shadow-md ring-1 ring-indigo-300/50"
                        : "bg-white/40 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-white/80 dark:hover:bg-white/10",
                    ].join(" ")}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 営業ステージ */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">ステージ</span>
            {STAGE_FILTERS.map((f) => {
              const isActive = stageFilter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setStageFilter(f.key)}
                  className={[
                    "rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all",
                    isActive
                      ? "bg-white dark:bg-white/20 text-slate-900 dark:text-white shadow-md ring-1 ring-indigo-300/50"
                      : "bg-white/40 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-white/80 dark:hover:bg-white/10",
                  ].join(" ")}
                >
                  {f.label}
                </button>
              );
            })}

            {anyFilterOn && (
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-lg px-3 py-1.5 text-[12px] font-semibold bg-rose-100/80 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-200/80 dark:hover:bg-rose-900/50 transition-all"
              >
                解除
              </button>
            )}

            <div className="ml-auto flex items-center gap-2">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">表示</span>
              <span className="rounded-full bg-white/80 dark:bg-white/10 px-2.5 py-1 text-[12px] font-bold text-slate-700 dark:text-slate-300 tabular-nums shadow-sm">
                {hits}
              </span>
            </div>
          </div>

          {/* 営業ステージ分布（コンパクト） */}
          {companies.length > 0 && (
            <div className="flex items-center gap-2 pt-2 overflow-x-auto">
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase shrink-0">分布</span>
              {stageEntries.map(([stage, count]) => (
                <div
                  key={stage}
                  className="flex items-center gap-1.5 rounded-lg bg-white/50 dark:bg-white/5 px-2.5 py-1 text-[11px] shrink-0"
                >
                  <span className="font-medium text-slate-600 dark:text-slate-400">{stage}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums">{count}</span>
                </div>
              ))}
            </div>
          )}

          {/* エラー表示 */}
          {errorMessage && (
            <div className="rounded-xl bg-rose-100/80 dark:bg-rose-900/30 px-4 py-2 text-sm text-rose-700 dark:text-rose-300">
              {errorMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



function CompanyCard({
  company,
  onQueueClick,
}: {
  company: CompanyRow;
  onQueueClick: (c: CompanyRow) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const summaryHref = `/companies/${encodeURIComponent(company.id)}`;
  const recordHref = `/companies/${encodeURIComponent(company.id)}/record`;
  const jobsHref = `/companies/${encodeURIComponent(company.id)}/jobs`;

  const name = s(company.company_name) || "(会社名なし)";
  const st = s(company.record_status) || "—";
  const stage = s(company.deal_stage) || "—";
  const updated = s(company.updated_at);

  return (
    <div
      className={[
        "group relative overflow-hidden rounded-2xl p-5",
        "bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl",
        "border border-slate-200/50 dark:border-slate-700/50",
        "shadow-lg shadow-slate-200/30 dark:shadow-slate-900/30",
        "hover:shadow-xl hover:shadow-slate-300/40 dark:hover:shadow-slate-900/40",
        "transition-all duration-500 ease-out",
        "hover:-translate-y-2",
      ].join(" ")}
    >
      {/* Gradient overlay on hover */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      {/* Header: Icon + Name + Status */}
      <div className="relative mb-4 flex items-start gap-4">
        <CompanyIcon name={name} size="lg" />
        <div className="min-w-0 flex-1">
          <Link
            href={summaryHref}
            className="block truncate text-[15px] font-bold text-slate-800 dark:text-slate-100 transition-colors hover:text-indigo-600 dark:hover:text-indigo-400"
            title={name}
          >
            {name}
          </Link>
          <div className="mt-2">
            <StatusPill status={st} />
          </div>
        </div>
      </div>

      {/* Stage */}
      <div className="relative mb-4 rounded-xl bg-slate-50/80 dark:bg-slate-700/30 px-3 py-2">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">営業ステージ</div>
        <div className="mt-1 truncate text-[13px] font-semibold text-slate-700 dark:text-slate-200" title={stage}>
          {stage}
        </div>
      </div>

      {/* Updated */}
      <div className="relative mb-4 text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
        更新: {updated ? formatLocalDateTime(updated) : "-"}
      </div>

      {/* Quick Actions */}
      <div className="relative flex flex-col gap-3">
        {/* 打ち合わせボタン（目立つ位置） */}
        <Link
          href={`/companies/${encodeURIComponent(company.id)}/deal`}
          className={[
            "inline-flex items-center justify-center gap-2",
            "rounded-xl",
            "bg-gradient-to-r from-emerald-500 to-teal-500",
            "px-4 py-2.5",
            "text-[13px] font-bold text-white",
            "shadow-lg shadow-emerald-500/25",
            "hover:shadow-xl hover:shadow-emerald-500/30",
            "transition-all duration-300 ease-out",
            "hover:scale-105",
          ].join(" ")}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          打ち合わせ
        </Link>

        <div className="flex items-center gap-2">
          {/* 広い画面: 全ボタン表示 */}
          <div className="hidden xl:flex flex-wrap items-center gap-2">
            <Link
              href={summaryHref}
              className="rounded-lg bg-slate-100/80 dark:bg-slate-700/50 px-3 py-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 transition-all duration-200 hover:bg-slate-200 dark:hover:bg-slate-600 hover:scale-105"
            >
              企業概要
            </Link>
            <Link
              href={`/companies/${encodeURIComponent(company.id)}/analytics`}
              className="rounded-lg bg-slate-100/80 dark:bg-slate-700/50 px-3 py-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 transition-all duration-200 hover:bg-slate-200 dark:hover:bg-slate-600 hover:scale-105"
            >
              分析
            </Link>
            <Link
              href={jobsHref}
              className="rounded-lg bg-slate-100/80 dark:bg-slate-700/50 px-3 py-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 transition-all duration-200 hover:bg-slate-200 dark:hover:bg-slate-600 hover:scale-105"
            >
              求人一覧
            </Link>
            <Link
              href={recordHref}
              className="rounded-lg bg-slate-100/80 dark:bg-slate-700/50 px-3 py-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 transition-all duration-200 hover:bg-slate-200 dark:hover:bg-slate-600 hover:scale-105"
            >
              企業詳細
            </Link>
            <button
              type="button"
              onClick={() => onQueueClick(company)}
              className="rounded-lg bg-slate-100/80 dark:bg-slate-700/50 px-3 py-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 transition-all duration-200 hover:bg-slate-200 dark:hover:bg-slate-600 hover:scale-105"
            >
              Queue
            </button>
          </div>

        {/* 狭い画面: ドロップダウンメニュー */}
        <div className="xl:hidden relative" ref={menuRef}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 px-3 py-1.5 text-[13px] font-semibold text-slate-700 dark:text-slate-300 transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-600 hover:shadow-sm"
          >
            ⋯
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-40 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl z-20">
              <Link
                href={summaryHref}
                className="block px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-t-lg transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                企業概要
              </Link>
              <Link
                href={`/companies/${encodeURIComponent(company.id)}/analytics`}
                className="block px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                分析
              </Link>
              <Link
                href={jobsHref}
                className="block px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                求人一覧
              </Link>
              <Link
                href={recordHref}
                className="block px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                企業詳細
              </Link>
              <button
                type="button"
                onClick={() => {
                  onQueueClick(company);
                  setMenuOpen(false);
                }}
                className="block w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-b-lg transition-colors"
              >
                Queue
              </button>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}



export default function CompaniesIndexPage() {
  const [state, setState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [companies, setCompanies] = useState<CompanyRow[]>([]);

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [stageFilter, setStageFilter] = useState<StageKey>("all");

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const [showWorkQueueDialog, setShowWorkQueueDialog] = useState(false);
  const [selectedCompanyForQueue, setSelectedCompanyForQueue] = useState<CompanyRow | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // メニューの外側をクリックしたときに閉じる
  useEffect(() => {
    if (!openMenuId) return;

    const handleClick = () => setOpenMenuId(null);
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [openMenuId]);

  async function loadCompanies() {
    setState("loading");
    setErrorMessage("");

    try {
      const res = await fetch("/api/companies", { cache: "no-store" });
      const json = (await res.json()) as CompaniesGetRes;

      if (!res.ok || !json.ok) {
        const msg = !json.ok ? json.error.message : `会社一覧の取得に失敗しました (status: ${res.status})`;
        throw new Error(msg);
      }

      setCompanies(Array.isArray(json.companies) ? json.companies : []);
      setState("ready");
    } catch (e) {
      setState("error");
      setErrorMessage(e instanceof Error ? e.message : "会社一覧の取得に失敗しました");
      setCompanies([]);
    }
  }

  useEffect(() => {
    void loadCompanies();
  }, []);

  const counts = useMemo(() => {
    const base = companies ?? [];
    let active = 0;
    let risk = 0;
    let paused = 0;
    let inactive = 0;

    for (const c of base) {
      const st = lower(c.record_status);
      if (st === "active") active += 1;
      else if (st === "risk") risk += 1;
      else if (st === "paused") paused += 1;
      else if (st === "inactive") inactive += 1;
    }

    return { active, risk, paused, inactive };
  }, [companies]);

  const filtered = useMemo(() => {
    const base = companies ?? [];
    const needle = q.trim().toLowerCase();

    return base.filter((c) => {
      if (needle) {
        const name = String(c.company_name ?? "").toLowerCase();
        if (!name.includes(needle)) return false;
      }

      if (statusFilter !== "all") {
        const st = lower(c.record_status);
        if (st !== statusFilter) return false;
      }

      const stage = s(c.deal_stage);
      if (!matchStageFilter(stage, stageFilter)) return false;

      return true;
    });
  }, [companies, q, statusFilter, stageFilter]);

  const sorted = useMemo(() => {
    const result = [...filtered];
    result.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortField) {
        case "name":
          aVal = s(a.company_name).toLowerCase();
          bVal = s(b.company_name).toLowerCase();
          break;
        case "updated":
          aVal = new Date(a.updated_at || 0).getTime();
          bVal = new Date(b.updated_at || 0).getTime();
          break;
        case "status":
          aVal = s(a.record_status).toLowerCase();
          bVal = s(b.record_status).toLowerCase();
          break;
        case "stage":
          aVal = s(a.deal_stage).toLowerCase();
          bVal = s(b.deal_stage).toLowerCase();
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return result;
  }, [filtered, sortField, sortDirection]);

  const anyFilterOn = statusFilter !== "all" || stageFilter !== "all" || Boolean(q.trim());

  function clearFilters() {
    setQ("");
    setStatusFilter("all");
    setStageFilter("all");
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="text-slate-400">↕</span>;
    return sortDirection === "asc" ? <span className="text-indigo-600">↑</span> : <span className="text-indigo-600">↓</span>;
  };

  const ACTIONS_WRAP = "flex-wrap items-center justify-end gap-2 max-w-full";
  const ACTION_BTN = "rounded-lg bg-slate-100/80 dark:bg-slate-700/50 px-3 py-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 transition-all duration-200 hover:bg-slate-200 dark:hover:bg-slate-600 hover:scale-105 whitespace-nowrap";

  return (
    <div className={[UI.PAGE_BG, "space-y-3"].join(" ")}>
      {/* Page background - モダンメッシュグラデーション */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />
        <div className="absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-gradient-to-br from-indigo-200/30 to-purple-200/20 dark:from-indigo-500/10 dark:to-purple-500/10 blur-3xl animate-pulse" style={{ animationDuration: "8s" }} />
        <div className="absolute -right-40 top-1/4 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-cyan-200/25 to-blue-200/20 dark:from-cyan-500/10 dark:to-blue-500/10 blur-3xl animate-pulse" style={{ animationDuration: "10s", animationDelay: "2s" }} />
        <div className="absolute bottom-0 left-1/3 h-[400px] w-[600px] rounded-full bg-gradient-to-br from-emerald-200/20 to-teal-200/15 dark:from-emerald-500/10 dark:to-teal-500/10 blur-3xl animate-pulse" style={{ animationDuration: "12s", animationDelay: "4s" }} />
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      <CompaniesHero
        total={companies.length}
        hits={sorted.length}
        active={counts.active}
        risk={counts.risk}
        paused={counts.paused}
        inactive={counts.inactive}
        onReload={() => void loadCompanies()}
        loading={state === "loading"}
        q={q}
        setQ={setQ}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        stageFilter={stageFilter}
        setStageFilter={setStageFilter}
        anyFilterOn={anyFilterOn}
        clearFilters={clearFilters}
        companies={companies}
        errorMessage={errorMessage}
      />

      {/* List / Card Toggle */}
      <section className={UI.PANEL}>
        <div className={UI.PANEL_HDR}>
          <div className="min-w-0">
            <div className={UI.PANEL_TITLE}>List</div>
            <div className={UI.PANEL_SUB}></div>
          </div>
          <div className="flex items-center gap-1 rounded-xl bg-slate-100/80 dark:bg-slate-700/50 p-1">
            <button
              type="button"
              onClick={() => setViewMode("card")}
              className={[
                "inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all duration-300",
                viewMode === "card"
                  ? "bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-md"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200",
              ].join(" ")}
              title="カード表示"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={[
                "inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all duration-300",
                viewMode === "list"
                  ? "bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-md"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200",
              ].join(" ")}
              title="リスト表示"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-0">
          {viewMode === "list" ? (
            <>
              {/* List Header with Sort */}
              <div
                className={[
                  UI.LIST_HEAD,
                  "sm:grid-cols-[minmax(160px,0.8fr)_90px_140px_130px_minmax(260px,1.2fr)]",
                ].join(" ")}
              >
                <button
                  type="button"
                  onClick={() => handleSort("name")}
                  className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-100 transition-all duration-200"
                >
                  会社名 <SortIcon field="name" />
                </button>
                <button
                  type="button"
                  onClick={() => handleSort("status")}
                  className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-100 transition-all duration-200"
                >
                  稼働 <SortIcon field="status" />
                </button>
                <button
                  type="button"
                  onClick={() => handleSort("stage")}
                  className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-100 transition-all duration-200"
                >
                  営業ステージ <SortIcon field="stage" />
                </button>
                <button
                  type="button"
                  onClick={() => handleSort("updated")}
                  className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-100 transition-all duration-200"
                >
                  更新 <SortIcon field="updated" />
                </button>
                <div className="text-right">操作</div>
              </div>

              {state !== "loading" && sorted.length === 0 ? (
                <div className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">該当なし</div>
              ) : null}

              <div className={UI.LIST_DIV}>
                {sorted.map((c) => {
                  const summaryHref = `/companies/${encodeURIComponent(c.id)}`;
                  const recordHref = `/companies/${encodeURIComponent(c.id)}/record`;
                  const jobsHref = `/companies/${encodeURIComponent(c.id)}/jobs`;

                  const name = s(c.company_name) || "(会社名なし)";
                  const st = s(c.record_status) || "—";
                  const stage = s(c.deal_stage) || "—";
                  const updated = s(c.updated_at);

                  return (
                    <div key={c.id} className={UI.LIST_ROW}>
                      {/* Desktop */}
                      <div className="hidden sm:grid sm:grid-cols-[minmax(160px,0.8fr)_90px_140px_130px_minmax(260px,1.2fr)] sm:items-center sm:gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <CompanyIcon name={name} size="sm" />
                          <Link href={summaryHref} className={[UI.LINK_XS, "block truncate"].join(" ")} title={name}>
                            {name}
                          </Link>
                        </div>

                        <div>
                          <StatusPill status={st} />
                        </div>

                        <div className="min-w-0">
                          <div className="truncate text-[12px] font-semibold text-slate-800" title={stage}>
                            {stage}
                          </div>
                        </div>

                        <div className="text-[12px] text-slate-700 tabular-nums">
                          {updated ? formatLocalDateTime(updated) : "-"}
                        </div>

                        <div className="min-w-0 text-right">
                          {/* 打ち合わせボタン（常に表示） */}
                          <Link
                            href={`/companies/${encodeURIComponent(c.id)}/deal`}
                            className={[
                              "inline-flex items-center gap-1.5",
                              "rounded-xl",
                              "bg-gradient-to-r from-emerald-500 to-teal-500",
                              "px-4 py-1.5",
                              "text-[12px] font-bold text-white",
                              "shadow-md shadow-emerald-500/20",
                              "hover:shadow-lg hover:shadow-emerald-500/25",
                              "transition-all duration-300 ease-out",
                              "hover:scale-105",
                              "mr-3",
                            ].join(" ")}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            打ち合わせ
                          </Link>

                          {/* 大きい画面: 全ボタン表示 */}
                          <div className={[ACTIONS_WRAP, "hidden 2xl:inline-flex"].join(" ")}>
                            <Link href={summaryHref} className={ACTION_BTN}>
                              企業概要
                            </Link>

                            <Link href={`/companies/${encodeURIComponent(c.id)}/analytics`} className={ACTION_BTN}>
                              分析
                            </Link>

                            <Link href={jobsHref} className={ACTION_BTN}>
                              求人一覧
                            </Link>

                            <Link href={recordHref} className={ACTION_BTN}>
                              企業詳細
                            </Link>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCompanyForQueue(c);
                                setShowWorkQueueDialog(true);
                              }}
                              className={ACTION_BTN}
                            >
                              Queue
                            </button>
                          </div>

                          {/* 小さい画面: ドロップダウンメニュー */}
                          <div className="2xl:hidden relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(openMenuId === c.id ? null : c.id);
                              }}
                              className="cv-btn-secondary !px-3 !py-2 text-sm"
                            >
                              ⋯
                            </button>
                            {openMenuId === c.id && (
                              <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg z-10">
                                <Link
                                  href={summaryHref}
                                  className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-t-lg"
                                  onClick={() => setOpenMenuId(null)}
                                >
                                  企業概要
                                </Link>
                                <Link
                                  href={`/companies/${encodeURIComponent(c.id)}/analytics`}
                                  className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                                  onClick={() => setOpenMenuId(null)}
                                >
                                  分析
                                </Link>
                                <Link
                                  href={jobsHref}
                                  className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                                  onClick={() => setOpenMenuId(null)}
                                >
                                  求人一覧
                                </Link>
                                <Link
                                  href={recordHref}
                                  className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                                  onClick={() => setOpenMenuId(null)}
                                >
                                  企業詳細
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedCompanyForQueue(c);
                                    setShowWorkQueueDialog(true);
                                    setOpenMenuId(null);
                                  }}
                                  className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-b-lg"
                                >
                                  Queue
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Mobile */}
                      <div className="sm:hidden">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex items-center gap-2">
                              <CompanyIcon name={name} size="sm" />
                              <Link
                                href={summaryHref}
                                className="block truncate text-[13px] font-semibold text-indigo-700/95 hover:text-indigo-800 hover:underline"
                                title={name}
                              >
                                {name}
                              </Link>
                            </div>

                            <div className="mt-0.5 flex items-center gap-2">
                              <StatusPill status={st} />
                              <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-slate-700 dark:text-slate-300" title={stage}>
                                {stage}
                              </span>
                            </div>

                            <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                              更新: {updated ? formatLocalDateTime(updated) : "-"}
                            </div>

                            <div className="mt-3 flex items-center gap-2">
                              <Link
                                href={`/companies/${encodeURIComponent(c.id)}/deal`}
                                className={[
                                  "inline-flex items-center gap-1.5",
                                  "rounded-xl",
                                  "bg-gradient-to-r from-emerald-500 to-teal-500",
                                  "px-4 py-2",
                                  "text-[12px] font-bold text-white",
                                  "shadow-md shadow-emerald-500/20",
                                ].join(" ")}
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                打ち合わせ
                              </Link>
                            </div>

                            <div className="mt-2 relative">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(openMenuId === c.id ? null : c.id);
                                }}
                                className="cv-btn-secondary !px-3 !py-1.5 text-[13px] font-semibold"
                              >
                                ⋯ メニュー
                              </button>
                              {openMenuId === c.id && (
                                <div className="absolute left-0 top-full mt-1 w-40 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl z-20">
                                  <Link
                                    href={summaryHref}
                                    className="block px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-t-lg transition-colors"
                                    onClick={() => setOpenMenuId(null)}
                                  >
                                    企業概要
                                  </Link>
                                  <Link
                                    href={`/companies/${encodeURIComponent(c.id)}/analytics`}
                                    className="block px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                    onClick={() => setOpenMenuId(null)}
                                  >
                                    分析
                                  </Link>
                                  <Link
                                    href={jobsHref}
                                    className="block px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                    onClick={() => setOpenMenuId(null)}
                                  >
                                    求人一覧
                                  </Link>
                                  <Link
                                    href={recordHref}
                                    className="block px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                    onClick={() => setOpenMenuId(null)}
                                  >
                                    企業詳細
                                  </Link>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedCompanyForQueue(c);
                                      setShowWorkQueueDialog(true);
                                      setOpenMenuId(null);
                                    }}
                                    className="block w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-b-lg transition-colors"
                                  >
                                    Queue
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            /* Card View */
            <div className="p-4">
              {state !== "loading" && sorted.length === 0 ? (
                <div className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">該当なし</div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {sorted.map((c) => (
                    <CompanyCard
                      key={c.id}
                      company={c}
                      onQueueClick={(company) => {
                        setSelectedCompanyForQueue(company);
                        setShowWorkQueueDialog(true);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Work Queue追加ダイアログ */}
      {showWorkQueueDialog && selectedCompanyForQueue && (
        <WorkQueueAddDialog
          companyId={selectedCompanyForQueue.id}
          companyName={selectedCompanyForQueue.company_name}
          onClose={() => {
            setShowWorkQueueDialog(false);
            setSelectedCompanyForQueue(null);
          }}
          onSuccess={() => {
            setShowWorkQueueDialog(false);
            setSelectedCompanyForQueue(null);
          }}
        />
      )}
    </div>
  );
}



const TASK_TYPES = [
  { value: "meeting", label: "打ち合わせ", icon: "🤝", defaultTitle: "打ち合わせ日程調整" },
  { value: "proposal", label: "提案・商談", icon: "💼", defaultTitle: "提案資料作成" },
  { value: "job_posting", label: "求人原稿作成", icon: "📝", defaultTitle: "求人原稿作成" },
  { value: "update", label: "情報更新", icon: "🔄", defaultTitle: "情報更新" },
  { value: "follow_up", label: "フォローアップ", icon: "📞", defaultTitle: "フォローアップ連絡" },
  { value: "document", label: "資料作成", icon: "📄", defaultTitle: "資料作成" },
  { value: "other", label: "その他", icon: "📋", defaultTitle: "" },
];

function WorkQueueAddDialog({
  companyId,
  companyName,
  onClose,
  onSuccess,
}: {
  companyId: string;
  companyName: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [taskType, setTaskType] = useState("");
  const [title, setTitle] = useState("");
  const [assigneeUserId, setAssigneeUserId] = useState("");
  const [deadline, setDeadline] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    loadMembers();
  }, []);

  async function loadMembers() {
    try {
      const res = await fetch("/api/work-queue/members", { cache: "no-store" });
      const json = await res.json();
      if (json.ok) {
        setMembers(json.data);
      }
    } catch (err) {
      console.error("Failed to load members:", err);
    }
  }

  async function handleSubmit() {
    if (!taskType || !title.trim()) {
      alert("タスクタイプとタイトルは必須です");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/work-queue/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_type: taskType,
          title: title.trim(),
          company_id: companyId,
          assignee_user_id: assigneeUserId || null,
          deadline: deadline || null,
          note: note || null,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        alert("Work Queueに追加しました");
        onSuccess();
      } else {
        alert("追加に失敗しました: " + json.error.message);
      }
    } catch (err) {
      console.error("Failed to add to work queue:", err);
      alert("追加に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white dark:bg-slate-800 p-6 shadow-xl">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
          Work Queueに追加
        </h2>

        <div className="mb-3 text-sm text-slate-600 dark:text-slate-400">{companyName}</div>

        {/* タスクタイプ */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            タスクタイプ <span className="text-rose-600 dark:text-rose-400">*</span>
          </label>
          <select
            value={taskType}
            onChange={(e) => {
              const selectedType = e.target.value;
              setTaskType(selectedType);
              const taskTypeObj = TASK_TYPES.find((t) => t.value === selectedType);
              if (taskTypeObj && taskTypeObj.defaultTitle) {
                setTitle(taskTypeObj.defaultTitle);
              }
            }}
            className="w-full rounded-md border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
          >
            <option value="">選択してください</option>
            {TASK_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.icon} {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* タイトル */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            タイトル <span className="text-rose-600 dark:text-rose-400">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="タスクのタイトル"
            className="w-full rounded-md border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
          />
        </div>

        {/* 担当者 */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            担当者
          </label>
          <select
            value={assigneeUserId}
            onChange={(e) => setAssigneeUserId(e.target.value)}
            className="w-full rounded-md border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
          >
            <option value="">未割当</option>
            {(members || []).map((m: any) => (
              <option key={m.user_id} value={m.user_id}>
                {m.display_name || m.user_id}
              </option>
            ))}
          </select>
        </div>

        {/* 期限 */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            期限
          </label>
          <DatePicker
            value={deadline}
            onChange={setDeadline}
            className="w-full rounded-md border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
          />
        </div>

        {/* メモ */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            メモ
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
          />
        </div>

        {/* ボタン */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !taskType || !title.trim()}
            className="rounded-md bg-indigo-600 dark:bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50"
          >
            {submitting ? "追加中..." : "追加"}
          </button>
        </div>
      </div>
    </div>
  );
}
