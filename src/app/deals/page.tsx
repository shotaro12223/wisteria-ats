"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";

/* ─────────── Premium hooks ─────────── */
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
  const [displayText, setDisplayText] = useState("");
  useEffect(() => {
    setDisplayText("");
    let i = 0;
    const iv = setInterval(() => {
      if (i < text.length) {
        setDisplayText(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(iv);
      }
    }, speed);
    return () => clearInterval(iv);
  }, [text, speed]);
  return displayText;
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return { greeting: "おはようございます", icon: "☀️" };
  if (h >= 12 && h < 17) return { greeting: "お疲れさまです", icon: "🌤" };
  if (h >= 17 && h < 21) return { greeting: "お疲れさまです", icon: "🌅" };
  return { greeting: "夜遅くまでお疲れさまです", icon: "🌙" };
}

function formatRelativeTime(iso: string) {
  try {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "たった今";
    if (diffMins < 60) return `${diffMins}分前`;
    if (diffHours < 24) return `${diffHours}時間前`;
    if (diffDays < 7) return `${diffDays}日前`;
    return new Date(iso).toLocaleDateString("ja-JP");
  } catch {
    return iso;
  }
}

function s(v: any) {
  return String(v ?? "");
}



type DealListItem = {
  id: string;
  companyId: string;
  companyName: string;
  kind: "new" | "existing";
  title: string;
  stage: string;
  updatedAt: string;
  createdAt: string;
};

type DealsListRes =
  | { ok: true; items: DealListItem[] }
  | { ok: false; error: { message: string } };




function getStageBadgeStyle(stage: string) {
  const s = stage.toLowerCase();
  if (s.includes("受注") || s.includes("完了")) {
    return "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700";
  }
  if (s.includes("失注") || s.includes("中止") || s.includes("ng")) {
    return "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-700";
  }
  if (s.includes("提案") || s.includes("見積")) {
    return "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700";
  }
  if (s.includes("打ち合わせ") || s.includes("ヒアリング")) {
    return "bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700";
  }
  return "bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600";
}





export default function DealsIndexPage() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [items, setItems] = useState<DealListItem[]>([]);

  // フィルター & 検索（新規商談専用なのでkindフィルター不要）
  const [filterStage, setFilterStage] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"updated" | "created">("updated");

  // Mouse tracking for gradient
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePos({ x, y });
  }, []);

  // Float animation
  useEffect(() => {
    const styleId = "deals-float-anim";
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @keyframes floatSlow { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
      @keyframes floatMedium { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
    `;
    document.head.appendChild(style);
  }, []);

  async function loadDeals() {
    setLoading(true);
    setErr("");

    try {
      // 新規商談のみ取得
      const res = await fetch(`/api/deals?limit=50&kind=new`, { cache: "no-store" });
      const json = (await res.json()) as DealsListRes;

      if (!res.ok || !json || (json as any).ok !== true) {
        const msg = (json as any)?.error?.message ?? "deals load failed";
        setErr(String(msg));
        setItems([]);
        return;
      }

      const arr = Array.isArray((json as any).items) ? (json as any).items : [];
      setItems(arr);
    } catch (e: any) {
      setErr(String(e?.message ?? e ?? "load failed"));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDeals();
  }, []);

  // フィルター & ソート処理（新規商談専用）
  const filteredItems = useMemo(() => {
    let result = [...items];

    // ステージフィルター
    if (filterStage !== "all") {
      result = result.filter((x) => x.stage === filterStage);
    }

    // 検索
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (x) =>
          x.companyName.toLowerCase().includes(q) ||
          x.title.toLowerCase().includes(q)
      );
    }

    // ソート
    result.sort((a, b) => {
      const dateA = new Date(sortBy === "updated" ? a.updatedAt : a.createdAt);
      const dateB = new Date(sortBy === "updated" ? b.updatedAt : b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });

    return result;
  }, [items, filterStage, searchQuery, sortBy]);

  // ステージ一覧抽出
  const stageOptions = useMemo(() => {
    const stages = new Set<string>();
    items.forEach((x) => {
      if (x.stage) stages.add(x.stage);
    });
    return Array.from(stages).sort();
  }, [items]);

  const kpi = useMemo(() => {
    const inProgress = items.filter(x => !x.stage.includes("受注") && !x.stage.includes("失注") && !x.stage.includes("完了")).length;
    const won = items.filter(x => x.stage.includes("受注") || x.stage.includes("完了")).length;
    return { total: items.length, inProgress, won };
  }, [items]);

  // Premium hooks
  const tod = getTimeOfDay();
  const totalAnim = useCountUp(kpi.total);
  const inProgressAnim = useCountUp(kpi.inProgress);
  const wonAnim = useCountUp(kpi.won);
  const summaryText = useMemo(() => {
    if (loading) return "データを読み込み中...";
    if (kpi.total === 0) return "新規商談はまだありません。右上のボタンから作成してください。";
    return `現在${kpi.inProgress}件の商談が進行中です。${kpi.won > 0 ? `${kpi.won}件が受注済みです。` : ""}`;
  }, [loading, kpi]);
  const typedSummary = useTypingEffect(summaryText, 25);

  return (
    <div ref={containerRef} onMouseMove={handleMouseMove} className="relative space-y-4">
      {/* Premium background with floating blobs */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div
          className="absolute inset-0 transition-all duration-500"
          style={{
            background: `radial-gradient(ellipse 800px 600px at ${mousePos.x}% ${mousePos.y}%, rgba(99,102,241,0.08) 0%, transparent 50%)`,
          }}
        />
        <div className="absolute inset-0 bg-slate-50 dark:bg-slate-900" />
        <div
          className="absolute -left-32 top-24 h-64 w-64 rounded-full bg-blue-400/10 dark:bg-blue-600/10 blur-3xl"
          style={{ animation: "floatSlow 8s ease-in-out infinite" }}
        />
        <div
          className="absolute right-12 top-48 h-48 w-48 rounded-full bg-purple-400/10 dark:bg-purple-600/10 blur-3xl"
          style={{ animation: "floatMedium 6s ease-in-out infinite 1s" }}
        />
        <div
          className="absolute left-1/3 bottom-24 h-56 w-56 rounded-full bg-indigo-400/10 dark:bg-indigo-600/10 blur-3xl"
          style={{ animation: "floatSlow 7s ease-in-out infinite 2s" }}
        />
      </div>

      {/* Premium Header with integrated filters */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 shadow-2xl shadow-indigo-200/40 dark:shadow-black/40 ring-1 ring-indigo-100 dark:ring-white/5">
        {/* マウス追従グラデーション */}
        <div
          className="pointer-events-none absolute h-[600px] w-[600px] rounded-full bg-gradient-to-br from-blue-400/20 via-indigo-400/15 to-purple-400/10 blur-3xl transition-all duration-500"
          style={{ left: `calc(${mousePos.x}% - 300px)`, top: `calc(${mousePos.y}% - 300px)` }}
        />
        {/* フローティングブロブ */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-40 -top-40 h-[400px] w-[400px] rounded-full bg-blue-200/30 dark:bg-blue-500/10 blur-3xl" style={{ animation: "floatSlow 20s ease-in-out infinite" }} />
          <div className="absolute -right-32 top-1/3 h-[300px] w-[300px] rounded-full bg-purple-200/25 dark:bg-purple-500/10 blur-3xl" style={{ animation: "floatMedium 25s ease-in-out infinite reverse" }} />
        </div>

        <div className="relative z-10 px-6 pt-6 pb-5 lg:px-10">
          {/* Row 1: Title & KPI */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5 mb-5">
            {/* Left: Title & Summary */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{tod.icon}</span>
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight">Deals</h1>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{typedSummary}<span className="animate-pulse">|</span></p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/deals/new"
                  className="rounded-xl bg-indigo-600 dark:bg-white px-5 py-2.5 text-sm font-semibold text-white dark:text-indigo-700 shadow-lg shadow-indigo-500/25 hover:shadow-xl transition-all"
                >
                  + 新規商談
                </Link>
                <Link
                  href="/companies"
                  className="rounded-xl bg-white/80 dark:bg-white/10 backdrop-blur-sm px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 ring-1 ring-indigo-200/40 dark:ring-white/10 shadow-md hover:shadow-xl transition-all"
                >
                  既存企業
                </Link>
              </div>
            </div>

            {/* Right: KPI Panels */}
            <div className="flex flex-wrap gap-3 lg:flex-nowrap">
              {/* Total */}
              <div className="flex items-center gap-3 rounded-xl bg-white/60 dark:bg-white/5 backdrop-blur-md px-4 py-3 ring-1 ring-indigo-200/40 dark:ring-white/10 shadow-lg">
                <div className="h-10 w-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Total</div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums leading-none">{totalAnim}</div>
                </div>
              </div>

              {/* 進行中 */}
              <div className="flex items-center gap-3 rounded-xl bg-blue-50/80 dark:bg-blue-900/30 backdrop-blur-md px-4 py-3 ring-1 ring-blue-200/60 dark:ring-blue-700/40 shadow-lg">
                <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase">進行中</div>
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-300 tabular-nums leading-none">{inProgressAnim}</div>
                </div>
              </div>

              {/* 受注 */}
              <div className="flex items-center gap-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-900/30 backdrop-blur-md px-4 py-3 ring-1 ring-emerald-200/60 dark:ring-emerald-700/40 shadow-lg">
                <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase">受注</div>
                  <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 tabular-nums leading-none">{wonAnim}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Filters */}
          <div className="space-y-3 pt-4 border-t border-slate-200/50 dark:border-white/10">
            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
              {/* 検索 */}
              <div className="flex-1 max-w-md">
                <input
                  className="w-full rounded-xl border border-slate-200/60 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur-sm px-4 py-2.5 text-[13px] text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-400/40 transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="会社名・タイトルで検索..."
                />
              </div>

              {/* ステージフィルター */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">ステージ</span>
                <button
                  type="button"
                  onClick={() => setFilterStage("all")}
                  className={[
                    "rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all",
                    filterStage === "all"
                      ? "bg-white dark:bg-white/20 text-slate-900 dark:text-white shadow-md ring-1 ring-indigo-300/50"
                      : "bg-white/40 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-white/80 dark:hover:bg-white/10",
                  ].join(" ")}
                >
                  すべて
                </button>
                {stageOptions.map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setFilterStage(st)}
                    className={[
                      "rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all",
                      filterStage === st
                        ? "bg-white dark:bg-white/20 text-slate-900 dark:text-white shadow-md ring-1 ring-indigo-300/50"
                        : "bg-white/40 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-white/80 dark:hover:bg-white/10",
                    ].join(" ")}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {/* ソート */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">並び</span>
                <select
                  className="rounded-lg border border-slate-200/60 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur-sm px-3 py-1.5 text-[12px] font-semibold text-slate-700 dark:text-slate-300 outline-none"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                >
                  <option value="updated" className="dark:bg-slate-800">更新日</option>
                  <option value="created" className="dark:bg-slate-800">作成日</option>
                </select>
              </div>

              {/* 表示件数 & クリア */}
              <div className="flex items-center gap-2 ml-auto">
                {(filterStage !== "all" || searchQuery) && (
                  <button
                    type="button"
                    onClick={() => { setFilterStage("all"); setSearchQuery(""); }}
                    className="rounded-lg px-3 py-1.5 text-[12px] font-semibold bg-rose-100/80 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-200/80 dark:hover:bg-rose-900/50 transition-all"
                  >
                    解除
                  </button>
                )}
                <span className="text-[11px] text-slate-500 dark:text-slate-400">表示</span>
                <span className="rounded-full bg-white/80 dark:bg-white/10 px-2.5 py-1 text-[12px] font-bold text-slate-700 dark:text-slate-300 tabular-nums shadow-sm">
                  {filteredItems.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Deals Table */}
      {loading ? (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-10 text-center shadow-sm">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-200 dark:border-slate-700 border-t-blue-600"></div>
          <p className="mt-3 text-[13px] text-slate-600 dark:text-slate-400">読み込み中...</p>
        </div>
      ) : err ? (
        <div className="rounded-lg border border-rose-200 dark:border-rose-700 bg-rose-50 dark:bg-rose-900/30 px-5 py-4 shadow-sm">
          <p className="text-[13px] text-rose-700 dark:text-rose-300">{err}</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-10 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700">
            <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <p className="mt-3 text-[14px] font-semibold text-slate-900 dark:text-slate-100">
            {items.length === 0 ? "商談がありません" : "条件に一致する商談がありません"}
          </p>
          <p className="mt-1 text-[13px] text-slate-600 dark:text-slate-400">
            {items.length === 0 ? (
              <>
                <Link href="/deals/new" className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                  新規商談を作成
                </Link>
                するか、上のクイック打ち合わせから既存企業との商談を開始してください。
              </>
            ) : (
              "フィルター条件を変更してください"
            )}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
          {/* Table Header */}
          <div className="hidden lg:grid lg:grid-cols-[minmax(200px,1fr)_140px_100px_160px] lg:gap-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-2 text-[11px] font-bold text-slate-600 dark:text-slate-400">
            <div>会社 / タイトル</div>
            <div>ステージ</div>
            <div>更新</div>
            <div className="text-right">アクション</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {filteredItems.map((d) => (
              <div key={d.id} className="px-4 py-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50">
                {/* Desktop */}
                <div className="hidden lg:grid lg:grid-cols-[minmax(200px,1fr)_140px_100px_160px] lg:items-center lg:gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-bold text-slate-900 dark:text-slate-100">
                      {d.companyName || "(会社名未設定)"}
                    </div>
                    <div className="truncate text-[12px] text-slate-600 dark:text-slate-400">{d.title || "-"}</div>
                  </div>
                  <div>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold ${getStageBadgeStyle(
                        d.stage
                      )}`}
                    >
                      {d.stage || "-"}
                    </span>
                  </div>
                  <div className="text-[12px] text-slate-600 dark:text-slate-400">{formatRelativeTime(d.updatedAt)}</div>
                  <div className="flex justify-end gap-1.5">
                    <Link
                      href={`/deals/${encodeURIComponent(d.id)}`}
                      className="rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1 text-[12px] font-bold text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      詳細
                    </Link>
                    <Link
                      href={`/deals/${encodeURIComponent(d.id)}?view=meeting`}
                      className="rounded bg-blue-600 px-3 py-1 text-[12px] font-bold text-white transition-colors hover:bg-blue-700"
                    >
                      商談中
                    </Link>
                  </div>
                </div>

                {/* Mobile */}
                <div className="lg:hidden">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="mt-1 truncate text-[13px] font-bold text-slate-900 dark:text-slate-100">
                        {d.companyName || "(会社名未設定)"}
                      </div>
                      <div className="truncate text-[12px] text-slate-600 dark:text-slate-400">{d.title || "-"}</div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${getStageBadgeStyle(
                        d.stage
                      )}`}
                    >
                      {d.stage || "-"}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">{formatRelativeTime(d.updatedAt)}</span>
                  </div>
                  <div className="mt-2 flex gap-1.5">
                    <Link
                      href={`/deals/${encodeURIComponent(d.id)}`}
                      className="flex-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-center text-[12px] font-bold text-slate-700 dark:text-slate-300"
                    >
                      詳細
                    </Link>
                    <Link
                      href={`/deals/${encodeURIComponent(d.id)}?view=meeting`}
                      className="flex-1 rounded bg-blue-600 px-3 py-1.5 text-center text-[12px] font-bold text-white"
                    >
                      商談中
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
