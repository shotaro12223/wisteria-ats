"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useRef, useState } from "react";

import type { Company, Job } from "@/lib/types";

import {
  buildWorkQueueRows,
  sortRows,
  type WorkQueueRow,
  type WorkQueueStatus,
} from "@/lib/workQueue";

function formatLocalDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function staleClass(staleDays: number | null): string {
  if (staleDays == null) return "text-slate-400 dark:text-slate-500";
  if (staleDays >= 7) return "text-rose-700 dark:text-rose-400 font-semibold";
  if (staleDays >= 3) return "text-amber-700 dark:text-amber-400 font-semibold";
  return "text-slate-900 dark:text-slate-100";
}

function rpoClass(rpoDays: number | null): string {
  if (rpoDays == null) return "text-slate-400 dark:text-slate-500";
  if (rpoDays >= 7) return "text-rose-700 dark:text-rose-400 font-semibold";
  if (rpoDays >= 3) return "text-amber-700 dark:text-amber-400 font-semibold";
  return "text-slate-900 dark:text-slate-100";
}

const UI = {
  BORDER: "border-slate-200/80 dark:border-slate-700",
  DIVIDER: "divide-slate-200/70 dark:divide-slate-700",

  PANEL: ["rounded-md", "border-2", "border-slate-200/80 dark:border-slate-700", "bg-white dark:bg-slate-800", "shadow-sm"].join(" "),
  PANEL_HDR: [
    "flex items-start justify-between gap-3",
    "border-b-2",
    "border-slate-200/80 dark:border-slate-700",
    "px-4 py-3",
  ].join(" "),
  PANEL_TITLE: "text-[13px] font-semibold text-slate-900 dark:text-slate-100",
  PANEL_SUB: "mt-0.5 text-[12px] text-slate-700/90 dark:text-slate-400 font-medium",
  PANEL_BODY: "px-4 py-3",

  TABLE_WRAP: ["overflow-hidden", "rounded-md", "border-2", "border-slate-200/80 dark:border-slate-700", "bg-white dark:bg-slate-800"].join(
    " "
  ),
  TABLE_HEAD_ROW:
    "hidden sm:grid sm:items-center sm:gap-3 sm:border-b-2 sm:border-slate-200/80 dark:border-slate-700 sm:px-4 sm:py-2 text-[11px] text-slate-600 dark:text-slate-400",
  ROW: "group px-3 py-2 sm:px-4 sm:py-2 transition hover:bg-slate-50/70 dark:hover:bg-slate-700/50",
  ROW_DIVIDER: "divide-y-2 divide-slate-200/60 dark:divide-slate-700",

  LINK: "text-sm font-semibold text-indigo-700/95 dark:text-indigo-400 whitespace-nowrap hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline",
  LINK_XS:
    "text-[12px] font-semibold text-indigo-700/95 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline whitespace-nowrap",

  KPI_GRID: "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4",
  KPI_CARD: [
    "rounded-md",
    "border-2",
    "border-slate-200/80 dark:border-slate-700",
    "bg-white dark:bg-slate-800",
    "px-4 py-3",
    "shadow-sm",
  ].join(" "),
  KPI_LABEL: "text-[11px] font-semibold tracking-wide text-slate-500 dark:text-slate-400",
  KPI_VALUE: "mt-2 text-[26px] font-semibold leading-none text-slate-900 dark:text-slate-100 tabular-nums",
  KPI_SUB: "mt-2 text-[11px] text-slate-500 dark:text-slate-400",

  PAGE_BG: "relative",
} as const;

const STATUS_BADGE: Record<WorkQueueStatus, { cls: string; dot: string }> = {
  NG: { cls: "bg-rose-100 dark:bg-rose-900/30 text-rose-900 dark:text-rose-300 border-rose-200 dark:border-rose-700", dot: "bg-rose-500" },
  資料待ち: {
    cls: "bg-amber-100 dark:bg-amber-900/30 text-amber-900 dark:text-amber-300 border-amber-200 dark:border-amber-700",
    dot: "bg-amber-500",
  },
  媒体審査中: {
    cls: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700",
    dot: "bg-indigo-500",
  },
  停止中: {
    cls: "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600",
    dot: "bg-slate-400",
  },
};

function pill(status: WorkQueueStatus) {
  const meta = STATUS_BADGE[status];
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold",
        meta.cls,
      ].join(" ")}
    >
      <span className={["h-1.5 w-1.5 rounded-full", meta.dot].join(" ")} />
      {status}
    </span>
  );
}

function urgencyAccentClass(r: WorkQueueRow) {
  const stale = r.staleDays ?? null;
  const rpo = r.rpoTouchedDays ?? null;

  if (r.status === "NG") return "bg-rose-500";
  if ((stale != null && stale >= 7) || (rpo != null && rpo >= 7)) return "bg-rose-500";
  if ((stale != null && stale >= 3) || (rpo != null && rpo >= 3)) return "bg-amber-500";
  if (r.status === "媒体審査中") return "bg-indigo-500";
  if (r.status === "資料待ち") return "bg-amber-500";
  if (r.status === "停止中") return "bg-slate-400";
  return "bg-slate-300";
}

type HomeMetricsRes =
  | {
      ok: true;
      kpi: {
        companiesThisMonth: number;
        jobsThisMonth: number;
        applicantsThisMonth: number;
        applicants7d: number;
      };
      recent: {
        jobs: Array<{
          id: string;
          companyId: string;
          companyName: string;
          jobTitle: string;
          employmentType: string;
          updatedAt: string;
        }>;
        companies: Array<{
          id: string;
          companyName: string;
          updatedAt: string;
        }>;
      };
      debug?: any;
    }
  | { ok: false; error: { message: string } };

function rowToJobLike(r: any): Job {
  return {
    id: String(r.id ?? ""),
    companyId: String(r.companyId ?? ""),
    companyName: String(r.companyName ?? ""),
    jobTitle: String(r.jobTitle ?? ""),
    employmentType: String(r.employmentType ?? ""),
    siteStatus: null,
    createdAt: "",
    updatedAt: String(r.updatedAt ?? ""),
  } as any;
}

function useCountUp(target: number, duration = 2800) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    // 0は一瞬、すぐに10%からスタートして残り90%をアニメ
    setValue(Math.max(1, Math.round(target * 0.1)));
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // 初動速め、後半ゆっくり (expo ease-out)
      const eased = 1 - Math.pow(1 - progress, 5);
      const current = Math.round(target * 0.1 + eased * target * 0.9);
      setValue(Math.min(current, target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return value;
}

function useTypingEffect(text: string, speed = 80) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) { clearInterval(timer); setDone(true); }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);
  return { displayed, done };
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return { greeting: "おはようございます", period: "morning", icon: "☀️" };
  if (h >= 12 && h < 17) return { greeting: "お疲れさまです", period: "afternoon", icon: "🌤" };
  if (h >= 17 && h < 21) return { greeting: "お疲れさまです", period: "evening", icon: "🌅" };
  return { greeting: "夜遅くまでお疲れさまです", period: "night", icon: "🌙" };
}

function HeroSection({
  kpi,
  urgentCount,
  topRows
}: {
  kpi: { companiesThisMonth: number; jobsThisMonth: number; applicantsThisMonth: number; applicants7d: number };
  urgentCount: number;
  topRows: WorkQueueRow[];
}) {
  const heroRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });

  const timeInfo = useMemo(() => getTimeOfDay(), []);

  const summaryText = useMemo(() => {
    if (urgentCount > 0) {
      return `本日、${urgentCount}件の対応が必要です。Work Queueを確認しましょう。`;
    }
    return "現在、緊急の対応はありません。順調です！";
  }, [urgentCount]);

  const { displayed, done } = useTypingEffect(summaryText, 75);

  const companies = useCountUp(kpi.companiesThisMonth);
  const jobs = useCountUp(kpi.jobsThisMonth);
  const applicantsMonth = useCountUp(kpi.applicantsThisMonth);
  const applicants7d = useCountUp(kpi.applicants7d);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      setMousePos({ x, y });
    };

    const onLeave = () => setMousePos({ x: 0.5, y: 0.5 });

    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  const gradientStyle = {
    background: `radial-gradient(800px circle at ${mousePos.x * 100}% ${mousePos.y * 100}%, rgba(139,92,246,0.12), transparent 50%)`,
  };

  return (
    <div
      ref={heroRef}
      className="relative min-h-[calc(100vh-6rem)] flex flex-col overflow-hidden rounded-3xl bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 shadow-2xl shadow-violet-200/40 dark:shadow-black/40 ring-1 ring-violet-100 dark:ring-white/5"
    >
      <div className="pointer-events-none absolute inset-0 transition-all duration-500" style={gradientStyle} />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-violet-200/30 dark:bg-violet-500/10 blur-3xl animate-[float_20s_ease-in-out_infinite]" />
        <div className="absolute -right-32 top-1/3 h-[400px] w-[400px] rounded-full bg-fuchsia-200/25 dark:bg-fuchsia-500/10 blur-3xl animate-[float_25s_ease-in-out_infinite_reverse]" />
        <div className="absolute left-1/3 -bottom-32 h-[350px] w-[600px] rounded-full bg-purple-100/40 dark:bg-purple-500/10 blur-3xl animate-[float_18s_ease-in-out_infinite_2s]" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col lg:flex-row">
        <div className="flex-1 flex flex-col justify-center px-8 py-12 sm:px-16 lg:px-20 lg:py-16">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-4xl">{timeInfo.icon}</span>
            <span className="text-slate-600 dark:text-white/70 text-xl font-medium">{timeInfo.greeting}</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-slate-800 dark:text-white tracking-tight leading-none">
            Wisteria
            <span className="block text-3xl sm:text-4xl lg:text-5xl text-violet-500 dark:text-violet-400 font-light mt-2">RPO Platform</span>
          </h1>

          <div className="mt-8 max-w-lg">
            <div className="rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-md px-6 py-4 ring-1 ring-violet-200/40 dark:ring-white/10 shadow-lg shadow-violet-100/50 dark:shadow-black/20">
              <div className="flex items-start gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-violet-500 dark:bg-violet-400 animate-pulse" />
                <p className="text-base text-slate-700 dark:text-white/90 leading-relaxed">
                  {displayed}
                  {!done && <span className="inline-block w-0.5 h-5 bg-violet-500 dark:bg-violet-400 ml-1 animate-pulse" />}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/work-queue"
              className="group inline-flex items-center gap-3 rounded-xl bg-violet-600 dark:bg-white px-8 py-4 text-base font-semibold text-white dark:text-violet-700 shadow-xl shadow-violet-600/25 dark:shadow-black/10 transition-all duration-300 hover:bg-violet-700 dark:hover:bg-violet-50 hover:shadow-2xl hover:shadow-violet-600/30 hover:-translate-y-1 active:translate-y-0"
            >
              Work Queue
              <svg className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              href="/companies"
              className="inline-flex items-center gap-2 rounded-xl bg-white/80 dark:bg-white/10 backdrop-blur-sm border border-violet-200/60 dark:border-white/10 px-6 py-4 text-base font-semibold text-violet-700 dark:text-white shadow-lg shadow-violet-100/50 dark:shadow-black/10 transition-all duration-300 hover:bg-white dark:hover:bg-white/20 hover:shadow-xl hover:-translate-y-1 active:translate-y-0"
            >
              会社一覧
            </Link>
            <Link
              href="/applicants"
              className="inline-flex items-center gap-2 rounded-xl bg-white/80 dark:bg-white/10 backdrop-blur-sm border border-violet-200/60 dark:border-white/10 px-6 py-4 text-base font-semibold text-violet-700 dark:text-white shadow-lg shadow-violet-100/50 dark:shadow-black/10 transition-all duration-300 hover:bg-white dark:hover:bg-white/20 hover:shadow-xl hover:-translate-y-1 active:translate-y-0"
            >
              応募者
            </Link>
          </div>
        </div>

        <div className="lg:w-[420px] flex flex-col justify-center px-8 py-8 sm:px-12 lg:px-10 lg:py-16 lg:border-l border-violet-100/50 dark:border-white/5">
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "会社", value: companies, color: "from-violet-500 to-purple-500" },
              { label: "求人", value: jobs, color: "from-purple-500 to-fuchsia-500" },
              { label: "応募(月)", value: applicantsMonth, color: "from-fuchsia-500 to-pink-500" },
              { label: "応募(7日)", value: applicants7d, color: "from-pink-500 to-rose-500" },
            ].map((item) => (
              <div
                key={item.label}
                className="group relative overflow-hidden rounded-2xl bg-white/70 dark:bg-white/5 backdrop-blur-md p-5 ring-1 ring-violet-100/50 dark:ring-white/10 shadow-lg shadow-violet-100/30 dark:shadow-black/20 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-5 dark:group-hover:opacity-10 transition-opacity duration-300`} />
                <div className="relative">
                  <div className="text-xs font-semibold text-slate-500 dark:text-white/50 uppercase tracking-wider">{item.label}</div>
                  <div className="mt-2 text-3xl font-bold text-slate-800 dark:text-white tabular-nums">{item.value}</div>
                </div>
              </div>
            ))}
          </div>

          {topRows.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-600 dark:text-white/70 uppercase tracking-wider">要対応</h2>
                <Link href="/work-queue" className="text-xs font-medium text-violet-600 dark:text-violet-400 hover:underline">
                  すべて →
                </Link>
              </div>
              <div className="space-y-3">
                {topRows.slice(0, 3).map((r) => (
                  <Link
                    key={`${r.jobId}:${r.siteKey}`}
                    href={r.companyId ? `/companies/${r.companyId}/jobs/${r.jobId}` : "/work-queue"}
                    className="group flex items-center gap-3 rounded-xl bg-white/60 dark:bg-white/5 backdrop-blur-sm p-4 ring-1 ring-violet-100/40 dark:ring-white/10 shadow-md shadow-violet-100/20 dark:shadow-black/10 transition-all duration-300 hover:bg-white/80 dark:hover:bg-white/10 hover:shadow-lg hover:-translate-y-0.5"
                  >
                    <div className={["h-10 w-1.5 shrink-0 rounded-full transition-all duration-300 group-hover:h-12", urgencyAccentClass(r)].join(" ")} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {pill(r.status)}
                        <span className="truncate text-sm font-medium text-slate-700 dark:text-white/90">
                          {r.companyName}
                        </span>
                      </div>
                      <div className="mt-1 truncate text-xs text-slate-500 dark:text-white/50">
                        {r.jobTitle} • {r.siteKey}
                      </div>
                    </div>
                    {r.staleDays != null && (
                      <div className={["text-xs font-medium tabular-nums", staleClass(r.staleDays)].join(" ")}>
                        {r.staleDays}日
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px) scale(1); }
          33% { transform: translateY(-20px) translateX(10px) scale(1.02); }
          66% { transform: translateY(10px) translateX(-10px) scale(0.98); }
        }
      `}</style>
    </div>
  );
}


export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  const [kpi, setKpi] = useState<{
    companiesThisMonth: number;
    jobsThisMonth: number;
    applicantsThisMonth: number;
    applicants7d: number;
  }>({
    companiesThisMonth: 0,
    jobsThisMonth: 0,
    applicantsThisMonth: 0,
    applicants7d: 0,
  });

  const [jobsForQueue, setJobsForQueue] = useState<Job[]>([]);
  const [companiesForQueue, setCompaniesForQueue] = useState<Company[]>([]);

  const [error, setError] = useState<string>("");

  useEffect(() => {
    setMounted(true);

    (async () => {
      try {
        setError("");
        const res = await fetch("/api/home/metrics", { cache: "no-store" });
        const json = (await res.json()) as HomeMetricsRes;

        if (!res.ok || !json.ok) {
          setError((json as any)?.error?.message ?? "metrics load failed");
          setKpi({
            companiesThisMonth: 0,
            jobsThisMonth: 0,
            applicantsThisMonth: 0,
            applicants7d: 0,
          });
          setJobsForQueue([]);
          setCompaniesForQueue([]);
          return;
        }

        setKpi(json.kpi);

        setJobsForQueue((json.recent.jobs ?? []).map(rowToJobLike));

        setCompaniesForQueue(
          (json.recent.companies ?? []).map((c) => ({
            id: String(c.id ?? ""),
            companyName: String(c.companyName ?? ""),
            createdAt: "",
            updatedAt: String(c.updatedAt ?? ""),
          })) as any
        );
      } catch (e: any) {
        setError(String(e?.message ?? e));
      }
    })();
  }, []);

  const allRows = useMemo<WorkQueueRow[]>(() => {
    return buildWorkQueueRows({ jobs: jobsForQueue, companies: companiesForQueue });
  }, [jobsForQueue, companiesForQueue]);

  const sortedRows = useMemo<WorkQueueRow[]>(() => sortRows(allRows), [allRows]);

  const agenda = useMemo(() => {
    const urgentRows = sortedRows.filter(
      (r) =>
        (r.staleDays != null && r.staleDays >= 7) ||
        (r.rpoTouchedDays != null && r.rpoTouchedDays >= 7) ||
        r.status === "NG"
    );

    const soonRows = sortedRows.filter(
      (r) =>
        (r.staleDays != null && r.staleDays >= 3) ||
        (r.rpoTouchedDays != null && r.rpoTouchedDays >= 3)
    );

    const ng = sortedRows.filter((r) => r.status === "NG").length;
    const stale7 = sortedRows.filter((r) => r.staleDays != null && r.staleDays >= 7).length;
    const rpo7 = sortedRows.filter((r) => r.rpoTouchedDays != null && r.rpoTouchedDays >= 7).length;

    return {
      urgentCount: urgentRows.length,
      soonCount: soonRows.length,
      ng,
      stale7,
      rpo7,
      top: sortedRows.slice(0, 5),
    };
  }, [sortedRows]);

  if (!mounted) return <div className="h-4" />;

  return (
    <div className="min-h-[calc(100vh-6rem)]">
      {error ? (
        <div
          className="mb-4 rounded-xl border border-rose-200 dark:border-rose-700 bg-rose-50 dark:bg-rose-900/30 p-4 text-sm text-rose-800 dark:text-rose-300"
          role="alert"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-rose-500" />
            <div className="min-w-0">
              <div className="font-semibold">データ取得に失敗しました</div>
              <div className="mt-1 break-words text-[12px] text-rose-800/80 dark:text-rose-300/80">{error}</div>
            </div>
          </div>
        </div>
      ) : null}

      <HeroSection kpi={kpi} urgentCount={agenda.urgentCount} topRows={agenda.top} />
    </div>
  );
}
