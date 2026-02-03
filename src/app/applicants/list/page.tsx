"use client";

import Link from "next/link";
import { useEffect, useState, useRef, useCallback, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

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

type ApplicantStatus = "NEW" | "DOC" | "INT" | "OFFER" | "NG";

type Applicant = {
  id: string;
  companyId: string;
  jobId: string;
  name: string | null;
  appliedAt: string | null;
  siteKey: string | null;
  status: string | null;
  note: string;
  createdAt: string;
  updatedAt: string;
  companyName?: string;
  jobTitle?: string;
};

type Company = {
  id: string;
  companyName: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  NEW: "新着",
  DOC: "書類",
  INT: "面接",
  OFFER: "内定",
  NG: "NG",
};

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-500",
  DOC: "bg-purple-500",
  INT: "bg-amber-500",
  OFFER: "bg-emerald-500",
  NG: "bg-slate-400",
};

function formatDate(iso: string | null) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("ja-JP");
  } catch {
    return iso;
  }
}

function ApplicantListContent() {
  // Float animation
  useEffect(() => {
    const styleId = "applicant-list-float-animation";
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @keyframes float {
        0%, 100% { transform: translateY(0) rotate(0deg); }
        33% { transform: translateY(-20px) rotate(2deg); }
        66% { transform: translateY(10px) rotate(-1deg); }
      }
    `;
    document.head.appendChild(style);
    return () => { document.getElementById(styleId)?.remove(); };
  }, []);

  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ totalNew: 0 });

  const [companyFilter, setCompanyFilter] = useState(() => searchParams.get("companyId") || "");
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get("status") || "");

  const heroRef = useRef<HTMLDivElement>(null);
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    setMouse({ x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height });
  }, []);

  const timeInfo = getTimeOfDay();
  const summaryText = total > 0
    ? `${total}件の応募者が登録されています。${stats.totalNew > 0 ? `新着${stats.totalNew}件。` : ""}`
    : "登録済みの応募者はありません。";
  const typedSummary = useTypingEffect(summaryText, 25);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      // Load companies
      const compRes = await fetch("/api/companies", { cache: "no-store" });
      const compJson = await compRes.json();
      if (compJson.ok || compJson.items || compJson.companies) {
        const arr = compJson.items || compJson.companies || compJson.data || [];
        setCompanies(arr.map((c: any) => ({
          id: String(c.id || c.companyId || c.company_id || ""),
          companyName: String(c.companyName || c.company_name || c.name || ""),
        })));
      }

      // Load applicants
      const params = new URLSearchParams();
      params.set("limit", "100");
      if (companyFilter) params.set("companyId", companyFilter);

      const res = await fetch(`/api/applicants?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();

      if (!json.ok) {
        throw new Error(json.error || "Failed to load applicants");
      }

      let items: Applicant[] = json.items || [];

      // Enrich with company/job names
      const companyMap = new Map<string, string>();
      (compJson.items || compJson.companies || compJson.data || []).forEach((c: any) => {
        companyMap.set(String(c.id || c.companyId || ""), String(c.companyName || c.company_name || c.name || ""));
      });

      // Load jobs for job titles
      const jobsRes = await fetch("/api/jobs", { cache: "no-store" });
      const jobsJson = await jobsRes.json();
      const jobMap = new Map<string, string>();
      (jobsJson.items || jobsJson.jobs || jobsJson.data || []).forEach((j: any) => {
        jobMap.set(String(j.id || ""), String(j.jobTitle || j.job_title || ""));
      });

      items = items.map((a) => ({
        ...a,
        companyName: companyMap.get(a.companyId) || undefined,
        jobTitle: jobMap.get(a.jobId) || undefined,
      }));

      // Filter by status if specified
      if (statusFilter) {
        items = items.filter((a) => (a.status || "NEW").toUpperCase() === statusFilter.toUpperCase());
      }

      setApplicants(items);
      setTotal(json.total || items.length);
      setStats(json.stats || { totalNew: 0 });
    } catch (e: any) {
      setError(e.message || "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyFilter, statusFilter]);

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.replace(`/applicants/list?${params.toString()}`, { scroll: false });

    if (key === "companyId") setCompanyFilter(value);
    if (key === "status") setStatusFilter(value);
  };

  const kpis = useMemo(() => {
    const byStatus: Record<string, number> = { NEW: 0, DOC: 0, INT: 0, OFFER: 0, NG: 0 };
    for (const a of applicants) {
      const s = (a.status || "NEW").toUpperCase();
      if (byStatus[s] !== undefined) byStatus[s]++;
    }
    return byStatus;
  }, [applicants]);

  // 重複検出: company_id + job_id + applied_at が同じものが複数あるか
  const duplicateKeys = useMemo(() => {
    const keyCount = new Map<string, number>();
    for (const a of applicants) {
      if (a.companyId && a.jobId && a.appliedAt) {
        const key = `${a.companyId}_${a.jobId}_${a.appliedAt}`;
        keyCount.set(key, (keyCount.get(key) || 0) + 1);
      }
    }
    // 2回以上出現するキーをSetに
    const duplicates = new Set<string>();
    for (const [key, count] of keyCount) {
      if (count >= 2) duplicates.add(key);
    }
    return duplicates;
  }, [applicants]);

  const duplicateCount = duplicateKeys.size > 0
    ? applicants.filter((a) => {
        if (!a.companyId || !a.jobId || !a.appliedAt) return false;
        return duplicateKeys.has(`${a.companyId}_${a.jobId}_${a.appliedAt}`);
      }).length
    : 0;

  const companyOptions = useMemo(() => {
    return companies
      .filter((c) => c.id && c.companyName)
      .sort((a, b) => (a.companyName || "").localeCompare(b.companyName || "", "ja"));
  }, [companies]);

  return (
    <div className="space-y-4">
      {/* Premium Hero */}
      <div
        ref={heroRef}
        onMouseMove={onMouseMove}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 shadow-2xl shadow-emerald-200/40 dark:shadow-black/40 ring-1 ring-emerald-100 dark:ring-white/5"
      >
        {/* マウス追従グラデーション */}
        <div
          className="pointer-events-none absolute h-[600px] w-[600px] rounded-full bg-gradient-to-br from-emerald-400/20 via-teal-400/15 to-cyan-400/10 blur-3xl transition-all duration-500"
          style={{ left: `calc(${mouse.x * 100}% - 300px)`, top: `calc(${mouse.y * 100}% - 300px)` }}
        />
        {/* フローティングブロブ */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-40 -top-40 h-[400px] w-[400px] rounded-full bg-emerald-200/30 dark:bg-emerald-500/10 blur-3xl animate-[float_20s_ease-in-out_infinite]" />
          <div className="absolute -right-32 top-1/3 h-[300px] w-[300px] rounded-full bg-teal-200/25 dark:bg-teal-500/10 blur-3xl animate-[float_25s_ease-in-out_infinite_reverse]" />
        </div>

        {/* ヘッダーコンテンツ */}
        <div className="relative z-10 px-6 pt-6 pb-5 lg:px-10">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
            {/* 左: タイトル・サマリー */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{timeInfo.icon}</span>
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight">
                  登録済み応募者
                </h1>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                {typedSummary}<span className="animate-pulse">|</span>
              </p>

              {/* アクションボタン */}
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/applicants"
                  className="rounded-xl bg-white/80 dark:bg-white/10 backdrop-blur-sm px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 ring-1 ring-slate-200/60 dark:ring-white/10 shadow-md hover:bg-slate-50 dark:hover:bg-white/20 transition-all"
                >
                  ← 受信一覧へ
                </Link>
                <select
                  className="rounded-xl bg-white/80 dark:bg-white/10 backdrop-blur-sm px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 ring-1 ring-emerald-200/40 dark:ring-white/10 shadow-md disabled:opacity-50"
                  value={companyFilter}
                  onChange={(e) => updateFilter("companyId", e.target.value)}
                  disabled={loading}
                >
                  <option value="" className="dark:bg-slate-800">会社（すべて）</option>
                  {companyOptions.map((c) => (
                    <option key={c.id} value={c.id} className="dark:bg-slate-800">
                      {c.companyName}
                    </option>
                  ))}
                </select>
                <select
                  className="rounded-xl bg-white/80 dark:bg-white/10 backdrop-blur-sm px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 ring-1 ring-emerald-200/40 dark:ring-white/10 shadow-md disabled:opacity-50"
                  value={statusFilter}
                  onChange={(e) => updateFilter("status", e.target.value)}
                  disabled={loading}
                >
                  <option value="" className="dark:bg-slate-800">ステータス（すべて）</option>
                  {Object.entries(STATUS_LABEL).map(([k, label]) => (
                    <option key={k} value={k} className="dark:bg-slate-800">
                      {label}
                    </option>
                  ))}
                </select>
                {(companyFilter || statusFilter) && (
                  <button
                    type="button"
                    onClick={() => { updateFilter("companyId", ""); updateFilter("status", ""); }}
                    className="rounded-xl bg-white/80 dark:bg-white/10 px-3 py-2.5 text-sm text-slate-500 dark:text-slate-400 ring-1 ring-slate-200/40 dark:ring-white/10 shadow-md hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    ✕ クリア
                  </button>
                )}
              </div>
            </div>

            {/* 右: KPIカード */}
            <div className="flex flex-wrap gap-3 lg:flex-nowrap">
              <div className="flex items-center gap-3 rounded-xl bg-white/60 dark:bg-white/5 backdrop-blur-md px-4 py-3 ring-1 ring-emerald-200/40 dark:ring-white/10 shadow-lg">
                <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">総数</div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums leading-none">{applicants.length}</div>
                </div>
              </div>

              {stats.totalNew > 0 && (
                <div className="flex items-center gap-3 rounded-xl bg-blue-50/80 dark:bg-blue-900/30 backdrop-blur-md px-4 py-3 ring-1 ring-blue-200/60 dark:ring-blue-700/40 shadow-lg">
                  <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500" />
                    </span>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase">新着</div>
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-300 tabular-nums leading-none">{stats.totalNew}</div>
                  </div>
                </div>
              )}

              {duplicateCount > 0 && (
                <div className="flex items-center gap-3 rounded-xl bg-amber-50/80 dark:bg-amber-900/30 backdrop-blur-md px-4 py-3 ring-1 ring-amber-200/60 dark:ring-amber-700/40 shadow-lg">
                  <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase">重複</div>
                    <div className="text-2xl font-bold text-amber-700 dark:text-amber-300 tabular-nums leading-none">{duplicateCount}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* KPIセクション */}
        <div className="relative z-10 border-t border-slate-200/60 dark:border-slate-700/60 px-6 py-4 lg:px-10">
          <div className="flex flex-wrap gap-4 sm:gap-6">
            {Object.entries(STATUS_LABEL).map(([key, label]) => (
              <div key={key} className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${STATUS_COLORS[key]}`} />
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">{label}</span>
                <span className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">{kpis[key] || 0}</span>
              </div>
            ))}
          </div>

          {error && (
            <div className="mt-3 rounded-xl border border-rose-200/80 dark:border-rose-700/50 bg-rose-50/90 dark:bg-rose-900/30 backdrop-blur-sm px-4 py-3 text-[12px] text-rose-800 dark:text-rose-300 shadow-sm">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* テーブル */}
      <div className="overflow-hidden rounded-xl border-2 border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg">
        {/* ヘッダー */}
        <div className="hidden sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_100px_100px_100px_80px] sm:items-center sm:gap-2 sm:border-b-2 sm:border-slate-200/80 dark:border-slate-700 sm:px-4 sm:py-3 text-[11px] text-slate-600 dark:text-slate-400 font-semibold uppercase">
          <div>氏名</div>
          <div>会社</div>
          <div>求人</div>
          <div>媒体</div>
          <div>応募日</div>
          <div>ステータス</div>
          <div className="text-right">操作</div>
        </div>

        {loading ? (
          <div className="px-4 py-8 text-center">
            <div className="inline-flex items-center gap-3">
              <div className="h-6 w-6 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
              <span className="text-sm text-slate-600 dark:text-slate-400">読み込み中...</span>
            </div>
          </div>
        ) : applicants.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
            該当する応募者がいません
          </div>
        ) : (
          <div className="divide-y-2 divide-slate-200/60 dark:divide-slate-700">
            {applicants.map((a) => {
              const statusKey = (a.status || "NEW").toUpperCase();
              const isDuplicate = a.companyId && a.jobId && a.appliedAt
                ? duplicateKeys.has(`${a.companyId}_${a.jobId}_${a.appliedAt}`)
                : false;
              return (
                <div key={a.id} className="group px-4 py-3 transition hover:bg-slate-50/70 dark:hover:bg-slate-700/50">
                  {/* Desktop */}
                  <div className="hidden sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_100px_100px_100px_80px] sm:items-center sm:gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="truncate text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                        {a.name || "(名前なし)"}
                      </span>
                      {isDuplicate && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[9px] font-semibold whitespace-nowrap shrink-0">
                          重複
                        </span>
                      )}
                    </div>
                    <div className="truncate text-[12px] text-slate-700 dark:text-slate-300">
                      {a.companyName || "-"}
                    </div>
                    <div className="truncate text-[12px] text-slate-600 dark:text-slate-400">
                      {a.jobTitle || "-"}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {a.siteKey || "-"}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                      {formatDate(a.appliedAt)}
                    </div>
                    <div>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold text-white ${STATUS_COLORS[statusKey] || "bg-slate-400"}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
                        {STATUS_LABEL[statusKey] || statusKey}
                      </span>
                    </div>
                    <div className="text-right">
                      <Link
                        href={`/applicants/${encodeURIComponent(a.id)}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow hover:bg-emerald-700 transition-all"
                      >
                        詳細
                      </Link>
                    </div>
                  </div>

                  {/* Mobile */}
                  <div className="sm:hidden">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {a.name || "(名前なし)"}
                          </span>
                          {isDuplicate && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[9px] font-semibold whitespace-nowrap shrink-0">
                              重複
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {a.companyName || "-"} / {a.jobTitle || "-"}
                        </div>
                      </div>
                      <Link
                        href={`/applicants/${encodeURIComponent(a.id)}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow hover:bg-emerald-700 transition-all shrink-0"
                      >
                        詳細
                      </Link>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white ${STATUS_COLORS[statusKey] || "bg-slate-400"}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
                        {STATUS_LABEL[statusKey] || statusKey}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">{a.siteKey || "-"}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">{formatDate(a.appliedAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ApplicantListPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <ApplicantListContent />
    </Suspense>
  );
}
