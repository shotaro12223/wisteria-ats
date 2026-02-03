"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";



type KPI = {
  applicationsThisMonth: number;
  applicationsLastMonth: number;
  activeJobs: number;
  avgAppPerJob: number;
  offers: number;
  conversionRate: number;
};

type SitePerformance = {
  siteKey: string;
  posted: number;
  applications: number;
  rate: number | null;
};

type JobPerformance = {
  jobId: string;
  jobTitle: string;
  postedSites: number;
  applications: number;
  topSite: string | null;
  lastUpdate: string;
  daysSinceUpdate: number | null;
  hasAlert: boolean;
};

type ApplicantFlow = Record<string, { count: number; avgDays: number }>;

type StalledApplicant = {
  id: string;
  name: string;
  status: string;
  daysSinceUpdate: number;
};

type TimeSeries = {
  months: string[];
  data: Array<{ ym: string; total: number; bySite: Record<string, number> }>;
};

type AnalyticsData = {
  company: { id: string; name: string };
  kpi: KPI;
  sitePerformance: SitePerformance[];
  jobPerformance: JobPerformance[];
  applicantFlow: ApplicantFlow;
  stalledApplicants: StalledApplicant[];
  timeSeries: TimeSeries;
};



const UI = {
  PAGE_BG: "relative",
  PAGE_PAD: "py-8",

  RADIUS: "rounded-2xl",
  SHADOW: "shadow-[0_8px_28px_rgba(15,23,42,0.08)] dark:shadow-[0_8px_28px_rgba(0,0,0,0.3)]",
  SHADOW_SOFT: "shadow-[0_6px_24px_rgba(15,23,42,0.06)] dark:shadow-[0_6px_24px_rgba(0,0,0,0.2)]",

  H1: "text-[26px] sm:text-[28px] font-semibold tracking-tight text-slate-900 dark:text-slate-100",
  SUB: "mt-1 text-[12.5px] text-slate-700/90 dark:text-slate-400 font-medium",

  SECTION_TITLE: "text-[13px] font-semibold text-slate-900 dark:text-slate-100",
  SECTION_SUB: "mt-0.5 text-[12px] text-slate-700/90 dark:text-slate-400 font-medium",

  KPI_CARD: ["rounded-2xl", "border", "bg-white/72 dark:bg-slate-800/72", "backdrop-blur", "px-5 py-4", "shadow-sm"].join(" "),
  KPI_LABEL: "text-[11px] font-semibold tracking-wide text-slate-500 dark:text-slate-400",
  KPI_VALUE: "mt-2 text-[28px] font-semibold leading-none text-slate-900 dark:text-slate-100 tabular-nums",
  KPI_SUB: "mt-2 text-[11px] text-slate-500 dark:text-slate-400",

  TABLE_WRAP: ["overflow-hidden", "rounded-2xl", "border", "bg-white dark:bg-slate-800"].join(" "),
  TABLE_HEAD:
    "hidden lg:grid lg:items-center lg:gap-3 lg:border-b lg:px-5 lg:py-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400",
  ROW: "group px-4 py-3 lg:px-5 lg:py-3 transition hover:bg-slate-50/70 dark:hover:bg-slate-700/50",
  ROW_DIVIDER: "divide-y",

  CARD_SOFT: ["rounded-2xl", "border", "bg-white/70 dark:bg-slate-800/70", "backdrop-blur", "shadow-sm"].join(" "),
} as const;

const SITE_LABEL: Record<string, string> = {
  採用係長: "採用係長",
  AirWork: "AirWork",
  Engage: "エンゲージ",
  Indeed: "indeed",
  求人BOX: "求人ボックス",
  はたらきんぐ: "はたらきんぐ",
  げんきワーク: "げんきワーク",
  ハローワーク: "ハローワーク",
  ジモティー: "ジモティー",
  Direct: "Direct",
};

const SITE_ICON_SRC: Record<string, string> = {
  Indeed: "/site_indeed.png",
  求人BOX: "/site_kyujinbox.png",
  AirWork: "/site_airwork.png",
  Engage: "/site_engage.png",
  採用係長: "/site_saiyokakaricho.png",
  はたらきんぐ: "/site_hataraking.png",
  げんきワーク: "/site_genkiwork.png",
  ハローワーク: "/site_hellowork.png",
  ジモティー: "/site_jmty.png",
  Direct: "/site_direct.png",
};



function cls(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function ymFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function currentYm(): string {
  return ymFromDate(new Date());
}

function prevYm(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return ymFromDate(d);
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function compactNumber(n: number): string {
  if (!Number.isFinite(n)) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}



function chipClass(active: boolean) {
  return cls(
    "inline-flex items-center justify-center rounded-full px-3 py-2 text-xs font-semibold",
    "border shadow-sm transition",
    active
      ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100"
      : "bg-white/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600"
  );
}

function SiteBadge({ siteKey, emphasize }: { siteKey: string; emphasize?: boolean }) {
  const label = SITE_LABEL[siteKey] ?? siteKey;
  const src = SITE_ICON_SRC[siteKey] ?? "";

  const [imgOk, setImgOk] = useState(true);

  useEffect(() => {
    setImgOk(true);
  }, [src, siteKey]);

  return (
    <span
      className={cls(
        "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[12px] font-semibold",
        "bg-white/72 dark:bg-slate-800/72 backdrop-blur",
        emphasize ? "border-slate-900/15 dark:border-slate-100/15 text-slate-900 dark:text-slate-100" : "border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
      )}
      title={label}
    >
      {src && imgOk ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={label}
          className="h-[16px] w-[16px] object-contain"
          onError={() => setImgOk(false)}
        />
      ) : (
        <span className="inline-flex h-[16px] w-[16px] items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-[10px] font-semibold text-slate-700 dark:text-slate-300">
          {label.slice(0, 1)}
        </span>
      )}
      <span className="leading-none">{label}</span>
    </span>
  );
}

function TimeSeriesChart({ months, data }: { months: string[]; data: Array<{ ym: string; total: number }> }) {
  const max = Math.max(1, ...data.map((d) => d.total));
  const w = 800;
  const h = 180;
  const padding = { top: 20, right: 40, bottom: 30, left: 50 };
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;

  const points = data.map((d, i) => {
    const x = padding.left + (i / Math.max(1, data.length - 1)) * chartW;
    const y = padding.top + chartH - (d.total / max) * chartH;
    return { x, y, value: d.total, label: d.ym };
  });

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

  const areaD = `${pathD} L ${points[points.length - 1].x} ${padding.top + chartH} L ${padding.left} ${padding.top + chartH} Z`;

  return (
    <div className="w-full overflow-x-auto">
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block">
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(99,102,241,0.20)" />
            <stop offset="100%" stopColor="rgba(99,102,241,0.02)" />
          </linearGradient>
          <linearGradient id="areaGradDark" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(129,140,248,0.25)" />
            <stop offset="100%" stopColor="rgba(129,140,248,0.03)" />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = padding.top + chartH * (1 - ratio);
          const val = Math.round(max * ratio);
          return (
            <g key={ratio}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + chartW}
                y2={y}
                stroke="rgba(15,23,42,0.08)"
                className="dark:stroke-slate-700"
                strokeWidth="1"
                strokeDasharray={ratio === 0 ? "0" : "4 4"}
              />
              <text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize="11" fill="rgba(15,23,42,0.5)" className="dark:fill-slate-400">
                {val}
              </text>
            </g>
          );
        })}

        <path d={areaD} fill="url(#areaGrad)" className="dark:fill-[url(#areaGradDark)]" />

        <path d={pathD} fill="none" stroke="rgba(99,102,241,0.75)" className="dark:stroke-indigo-400" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill="white" className="dark:fill-slate-900 dark:stroke-indigo-400" stroke="rgba(99,102,241,0.85)" strokeWidth="2" />
            <text x={p.x} y={h - 8} textAnchor="middle" fontSize="10" fill="rgba(15,23,42,0.6)" className="dark:fill-slate-400">
              {p.label.slice(5)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function HeroGradient({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const heroRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const pxRef = useRef(0);
  const pyRef = useRef(0);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      el.style.setProperty("--px", "0px");
      el.style.setProperty("--py", "0px");
      return;
    }

    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      const dx = (e.clientX - cx) / Math.max(1, rect.width / 2);
      const dy = (e.clientY - cy) / Math.max(1, rect.height / 2);

      const tx = clamp(dx, -1, 1) * 8;
      const ty = clamp(dy, -1, 1) * 6;

      pxRef.current = tx;
      pyRef.current = ty;

      if (rafRef.current == null) {
        rafRef.current = window.requestAnimationFrame(() => {
          rafRef.current = null;
          el.style.setProperty("--px", `${pxRef.current.toFixed(2)}px`);
          el.style.setProperty("--py", `${pyRef.current.toFixed(2)}px`);
        });
      }
    };

    const onLeave = () => {
      pxRef.current = 0;
      pyRef.current = 0;
      el.style.setProperty("--px", "0px");
      el.style.setProperty("--py", "0px");
    };

    el.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerleave", onLeave, { passive: true });

    return () => {
      el.removeEventListener("pointermove", onMove as any);
      el.removeEventListener("pointerleave", onLeave as any);
      if (rafRef.current != null) window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, []);

  return (
    <div ref={heroRef} className={cls(UI.RADIUS, "relative overflow-hidden border bg-white dark:bg-slate-800", UI.SHADOW)} style={{ borderColor: "var(--border)" }}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/60 via-white to-purple-50/60 dark:from-blue-950/30 dark:via-slate-800 dark:to-purple-950/30" />
        <div className="hero-parallax absolute -inset-28">
          <div className="absolute -left-48 -top-52 h-[660px] w-[660px] rounded-full bg-blue-200/18 dark:bg-blue-500/10 blur-3xl" />
          <div className="absolute -right-56 -bottom-64 h-[720px] w-[720px] rounded-full bg-purple-200/16 dark:bg-purple-500/10 blur-3xl" />
          <div className="absolute left-1/2 top-[-240px] h-[560px] w-[960px] -translate-x-1/2 rounded-full bg-indigo-200/14 dark:bg-indigo-500/10 blur-3xl" />
          <div
            className="absolute inset-24 opacity-[0.085] dark:opacity-[0.05]"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(15,23,42,0.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.22) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
              maskImage:
                "radial-gradient(ellipse at 35% 10%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0) 80%)",
              WebkitMaskImage:
                "radial-gradient(ellipse at 35% 10%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0) 80%)",
            }}
          />
        </div>
      </div>

      <div className="relative px-6 py-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className={UI.H1}>{title}</div>
            {subtitle ? <div className={UI.SUB}>{subtitle}</div> : null}
          </div>
          {right ? <div className="shrink-0">{right}</div> : null}
        </div>

        {children ? <div className="mt-5">{children}</div> : null}
      </div>

      <style jsx>{`
        .hero-parallax {
          transform: translate3d(var(--px, 0px), var(--py, 0px), 0);
          transition: transform 140ms ease-out;
          will-change: transform;
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-parallax {
            transition: none !important;
            transform: translate3d(0, 0, 0) !important;
          }
        }
      `}</style>
    </div>
  );
}



export default function CompanyAnalyticsPage() {
  const params = useParams();
  const companyId = params?.companyId as string;

  const [mounted, setMounted] = useState(false);
  const [ym, setYm] = useState<string>(currentYm());
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!companyId) return;

    async function loadData() {
      setLoading(true);
      setError("");

      try {
        const res = await fetch(`/api/companies/${companyId}/analytics?ym=${ym}`, { cache: "no-store" });
        const json = await res.json();

        if (!res.ok || !json.ok) {
          setError(json.error?.message ?? "Failed to load data");
          return;
        }

        setData(json.data);
      } catch (err: any) {
        setError(err.message ?? "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, [companyId, ym]);

  const timeSeriesData = useMemo(() => {
    if (!data) return [];
    return data.timeSeries.data.map(d => ({ ym: d.ym, total: d.total }));
  }, [data]);

  if (!mounted) return <main className="cv-container py-8" />;

  return (
    <main className={cls("px-4 sm:px-6 lg:px-8", UI.PAGE_PAD, UI.PAGE_BG)}>
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900" />
        <div className="absolute -left-52 -top-72 h-[760px] w-[760px] rounded-full bg-blue-200/14 dark:bg-blue-500/8 blur-3xl" />
        <div className="absolute -right-64 -top-64 h-[820px] w-[820px] rounded-full bg-purple-200/12 dark:bg-purple-500/8 blur-3xl" />
        <div className="absolute left-1/2 top-24 h-64 w-[860px] -translate-x-1/2 rounded-full bg-indigo-200/10 dark:bg-indigo-500/8 blur-3xl" />
      </div>

      <HeroGradient
        title={data?.company.name ?? "企業分析"}
        subtitle="この企業の詳細パフォーマンス分析"
        right={
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link href={`/companies/${companyId}`} className="cv-btn cv-btn-secondary">
              企業詳細
            </Link>
            <Link href="/analytics" className="cv-btn cv-btn-secondary">
              全体分析
            </Link>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div
            className={cls(UI.RADIUS, "border bg-white/65 dark:bg-slate-800/65 backdrop-blur px-4 py-3", "shadow-[0_6px_18px_rgba(15,23,42,0.06)] dark:shadow-[0_6px_18px_rgba(0,0,0,0.2)]")}
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">期間</div>

              <div className="flex items-center gap-2">
                <button type="button" className={chipClass(ym === currentYm())} onClick={() => setYm(currentYm())}>
                  今月
                </button>
                <button type="button" className={chipClass(ym === prevYm())} onClick={() => setYm(prevYm())}>
                  先月
                </button>
              </div>
            </div>

            {error ? (
              <div className="mt-2 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 px-3 py-2 text-[12px] text-rose-800 dark:text-rose-300">{error}</div>
            ) : null}
          </div>
        </div>
      </HeroGradient>

      {loading ? (
        <div className="mt-4 space-y-4">
          <div className="animate-pulse grid grid-cols-1 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 rounded-2xl bg-slate-200/60 dark:bg-slate-700/60" />
            ))}
          </div>
        </div>
      ) : data ? (
        <>
          {/* KPI Cards */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className={UI.KPI_CARD} style={{ borderColor: "var(--border)" }}>
              <div className={UI.KPI_LABEL}>今月の応募数</div>
              <div className={UI.KPI_VALUE}>{data.kpi.applicationsThisMonth}</div>
              <div className={UI.KPI_SUB}>
                前月: {data.kpi.applicationsLastMonth}
                {data.kpi.applicationsLastMonth > 0 && (
                  <span
                    className={cls(
                      "ml-2 font-semibold",
                      data.kpi.applicationsThisMonth >= data.kpi.applicationsLastMonth ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"
                    )}
                  >
                    {data.kpi.applicationsThisMonth >= data.kpi.applicationsLastMonth ? "↑" : "↓"}
                    {Math.abs(((data.kpi.applicationsThisMonth - data.kpi.applicationsLastMonth) / data.kpi.applicationsLastMonth) * 100).toFixed(1)}%
                  </span>
                )}
              </div>
            </div>

            <div className={UI.KPI_CARD} style={{ borderColor: "var(--border)" }}>
              <div className={UI.KPI_LABEL}>アクティブ求人</div>
              <div className={UI.KPI_VALUE}>{data.kpi.activeJobs}</div>
              <div className={UI.KPI_SUB}>掲載中</div>
            </div>

            <div className={UI.KPI_CARD} style={{ borderColor: "var(--border)" }}>
              <div className={UI.KPI_LABEL}>応募/求人</div>
              <div className={UI.KPI_VALUE}>{data.kpi.avgAppPerJob.toFixed(1)}</div>
              <div className={UI.KPI_SUB}>平均パフォーマンス</div>
            </div>

            <div className={UI.KPI_CARD} style={{ borderColor: "var(--border)" }}>
              <div className={UI.KPI_LABEL}>成約数</div>
              <div className={UI.KPI_VALUE}>{data.kpi.offers}</div>
              <div className={UI.KPI_SUB}>成約率: {data.kpi.conversionRate.toFixed(1)}%</div>
            </div>
          </div>

          {/* Main grid */}
          <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-[1fr_1fr]">
            {/* Site Performance */}
            <section className={UI.TABLE_WRAP} style={{ borderColor: "var(--border)" }}>
              <div className="border-b px-5 py-4" style={{ borderColor: "var(--border)" }}>
                <div className={UI.SECTION_TITLE}>媒体別パフォーマンス</div>
                <div className={UI.SECTION_SUB}>掲載・応募・効率</div>
              </div>

              {data.sitePerformance.length === 0 ? (
                <div className="p-6 text-sm text-slate-600 dark:text-slate-400">データがありません。</div>
              ) : (
                <>
                  <div className={cls(UI.TABLE_HEAD, "lg:grid-cols-[200px_120px_120px_140px]")} style={{ borderColor: "var(--border)" }}>
                    <div>媒体</div>
                    <div className="text-right">掲載</div>
                    <div className="text-right">応募</div>
                    <div className="text-right">応募/掲載</div>
                  </div>

                  <div className={UI.ROW_DIVIDER} style={{ borderColor: "var(--border)" }}>
                    {data.sitePerformance.map((r) => (
                      <div key={r.siteKey} className={UI.ROW}>
                        <div className="grid grid-cols-1 gap-2 lg:grid-cols-[200px_120px_120px_140px] lg:items-center lg:gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <SiteBadge siteKey={r.siteKey} />
                          </div>

                          <div className="text-right text-[13px] text-slate-700 dark:text-slate-300 tabular-nums">{r.posted}</div>
                          <div className="text-right text-[13px] font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{r.applications}</div>

                          <div className="text-right">
                            {r.rate !== null ? (
                              <span className="inline-flex items-center rounded-full px-2 py-1 text-xs bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                                {r.rate.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>

            {/* Applicant Flow */}
            <section className={UI.CARD_SOFT} style={{ borderColor: "var(--border)" }}>
              <div className="px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
                <div className={UI.SECTION_TITLE}>応募者フロー</div>
                <div className={UI.SECTION_SUB}>ステータス別の件数と平均滞在日数</div>
              </div>

              <div className="px-5 py-4">
                <div className="grid grid-cols-5 gap-2">
                  {["NEW", "DOC", "INT", "OFFER", "NG"].map((status) => {
                    const flow = data.applicantFlow[status];
                    const color =
                      status === "NEW"
                        ? "bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-300"
                        : status === "DOC"
                        ? "bg-yellow-50 dark:bg-yellow-950/50 border-yellow-200 dark:border-yellow-800 text-yellow-900 dark:text-yellow-300"
                        : status === "INT"
                        ? "bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-300"
                        : status === "OFFER"
                        ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300"
                        : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-300";

                    return (
                      <div key={status} className={cls("rounded-lg border p-3", color)}>
                        <div className="text-[10px] font-semibold uppercase tracking-wide">{status}</div>
                        <div className="mt-2 text-[24px] font-bold tabular-nums">{flow?.count ?? 0}</div>
                        {flow && flow.avgDays > 0 ? (
                          <div className="mt-1 text-[10px]">平均 {flow.avgDays}日</div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                {data.stalledApplicants.length > 0 && (
                  <div className="mt-4">
                    <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-2">⚠️ 停滞中（10日以上）</div>
                    <div className="space-y-2">
                      {data.stalledApplicants.slice(0, 5).map((a) => (
                        <div key={a.id} className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/50 px-3 py-2">
                          <div className="min-w-0">
                            <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100 truncate">{a.name}</div>
                            <div className="text-[11px] text-slate-600 dark:text-slate-400">{a.status}</div>
                          </div>
                          <div className="text-[12px] font-bold text-amber-800 dark:text-amber-400 tabular-nums">{a.daysSinceUpdate}日</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Job Performance */}
          <section className={cls("mt-4", UI.TABLE_WRAP)} style={{ borderColor: "var(--border)" }}>
            <div className="border-b px-5 py-4" style={{ borderColor: "var(--border)" }}>
              <div className={UI.SECTION_TITLE}>求人別パフォーマンス</div>
              <div className={UI.SECTION_SUB}>全求人の応募状況</div>
            </div>

            {data.jobPerformance.length === 0 ? (
              <div className="p-6 text-sm text-slate-600 dark:text-slate-400">データがありません。</div>
            ) : (
              <>
                <div className={cls(UI.TABLE_HEAD, "lg:grid-cols-[1fr_120px_120px_140px_140px_100px]")} style={{ borderColor: "var(--border)" }}>
                  <div>求人名</div>
                  <div className="text-right">掲載媒体</div>
                  <div className="text-right">応募数</div>
                  <div>トップ媒体</div>
                  <div className="text-right">最終更新</div>
                  <div></div>
                </div>

                <div className={UI.ROW_DIVIDER} style={{ borderColor: "var(--border)" }}>
                  {data.jobPerformance.map((r) => (
                    <div key={r.jobId} className={UI.ROW}>
                      <div className="grid grid-cols-1 gap-2 lg:grid-cols-[1fr_120px_120px_140px_140px_100px] lg:items-center lg:gap-3">
                        <div className="min-w-0">
                          <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 truncate">{r.jobTitle}</div>
                          {r.hasAlert && (
                            <div className="mt-1 text-[11px] text-rose-700 dark:text-rose-400">⚠️ 応募なし（{r.daysSinceUpdate}日以上）</div>
                          )}
                        </div>

                        <div className="text-right text-[13px] text-slate-700 dark:text-slate-300 tabular-nums">{r.postedSites}媒体</div>
                        <div className="text-right text-[13px] font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{r.applications}</div>

                        <div>{r.topSite ? <SiteBadge siteKey={r.topSite} /> : <span className="text-slate-400 text-[12px]">-</span>}</div>

                        <div className="text-right text-[12px] text-slate-600 dark:text-slate-400 tabular-nums">
                          {r.daysSinceUpdate !== null ? `${r.daysSinceUpdate}日前` : "-"}
                        </div>

                        <div className="text-right">
                          <Link
                            href={`/companies/${companyId}/jobs/${r.jobId}`}
                            className="text-[12px] text-indigo-700 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 hover:underline font-semibold"
                          >
                            詳細
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>

          {/* Time Series */}
          {timeSeriesData.length > 0 && (
            <div className="mt-4">
              <div className={cls(UI.CARD_SOFT, "px-5 py-4")} style={{ borderColor: "var(--border)" }}>
                <div className="mb-4">
                  <div className={UI.SECTION_TITLE}>応募数推移（過去6ヶ月）</div>
                  <div className={UI.SECTION_SUB}>月別の応募トレンド</div>
                </div>
                <TimeSeriesChart months={data.timeSeries.months} data={timeSeriesData} />
              </div>
            </div>
          )}
        </>
      ) : null}
    </main>
  );
}
