"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { SITE_TEMPLATES } from "@/lib/templates";
import { listJobs, listCompanies } from "@/lib/storage";
import type { Job, Company } from "@/lib/types";

type Applicant = {
  id: string;
  companyId: string;
  jobId: string;
  appliedAt: string; // YYYY-MM-DD
  siteKey: string;
  name: string;
  status: "NEW" | "DOC" | "INT" | "OFFER" | "NG";
  note?: string;
  createdAt: string;
  updatedAt: string;
};

const APPLICANTS_KEY = "wisteria_ats_applicants_v1";

// ===== helpers =====
function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
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

function isInYm(ymd: string, ym: string): boolean {
  return typeof ymd === "string" && ymd.startsWith(ym + "-");
}

function readApplicantsAll(): Applicant[] {
  try {
    const raw = window.localStorage.getItem(APPLICANTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as Applicant[];
  } catch {
    return [];
  }
}

function getTemplateSites(): string[] {
  const sites = uniq((SITE_TEMPLATES ?? []).map((t) => String(t.site)));
  return sites.sort((a, b) => a.localeCompare(b, "ja"));
}

function isPostedToSite(job: Job, siteKey: string): boolean {
  return Boolean(job.siteStatus && job.siteStatus[siteKey]);
}

function numCellClass(extra?: string) {
  return ["tabular-nums", "text-right", extra ?? ""].join(" ").trim();
}

function chipClass(active: boolean) {
  // Stripeっぽいピル：activeは濃い、inactiveは面 + 薄い枠
  return [
    "cv-btn",
    active ? "cv-btn-primary" : "cv-btn-secondary",
    "px-3 py-2",
    "rounded-full",
    "text-xs",
  ].join(" ");
}

// 応募率表示（B）
function ratePill(applications: number, postedJobs: number): { label: string; cls: string; title: string } {
  if (postedJobs <= 0) {
    if (applications > 0) {
      return {
        label: "要確認",
        cls: "bg-[rgba(124,58,237,0.10)] text-[rgba(91,33,182,0.95)] border border-[rgba(124,58,237,0.20)]",
        title: "掲載カウントが0なのに応募があります（媒体キー/掲載カウント定義を確認）",
      };
    }
    return { label: "-", cls: "text-slate-400", title: "掲載0・応募0" };
  }

  const rate = applications / postedJobs;
  const label = rate.toFixed(2);

  if (rate >= 1.0) {
    return {
      label,
      cls: "bg-[rgba(16,185,129,0.14)] text-[rgba(6,95,70,0.95)] border border-[rgba(16,185,129,0.24)] font-semibold",
      title: "応募/掲載が非常に高い",
    };
  }
  if (rate >= 0.5) {
    return {
      label,
      cls: "bg-[rgba(16,185,129,0.10)] text-[rgba(6,95,70,0.90)] border border-[rgba(16,185,129,0.20)]",
      title: "応募/掲載が高い",
    };
  }
  if (rate >= 0.2) {
    return {
      label,
      cls: "bg-[rgba(234,179,8,0.12)] text-[rgba(113,63,18,0.95)] border border-[rgba(234,179,8,0.22)]",
      title: "応募/掲載は平均〜注意",
    };
  }
  return {
    label,
    cls: "bg-[rgba(15,23,42,0.06)] text-[rgba(15,23,42,0.82)] border border-[rgba(15,23,42,0.10)]",
    title: "応募/掲載が低い",
  };
}

type SiteRow = {
  siteKey: string;
  postedJobs: number;
  applications: number;
  appRate: number | null;
};

type JobRow = {
  jobId: string;
  jobTitle: string;
  companyName: string;
  applications: number;
  topSiteKey: string | null;
};

export default function AnalyticsPage() {
  const [mounted, setMounted] = useState(false);

  const [ym, setYm] = useState<string>("");
  const [companyId, setCompanyId] = useState<string>("ALL");

  const [jobs, setJobs] = useState<Job[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [apps, setApps] = useState<Applicant[]>([]);

  useEffect(() => {
    setMounted(true);
    setYm(currentYm());
    setCompanyId("ALL");
    setJobs(listJobs());
    setCompanies(listCompanies());
    setApps(readApplicantsAll());
  }, []);

  const sites = useMemo(() => getTemplateSites(), []);

  const companyOptions = useMemo(() => {
    const usedCompanyIds = new Set<string>();
    for (const j of jobs) if (j.companyId) usedCompanyIds.add(j.companyId);

    return companies
      .filter((c) => usedCompanyIds.has(c.id))
      .map((c) => ({ id: c.id, name: c.companyName || "(会社名未設定)" }))
      .sort((a, b) => a.name.localeCompare(b.name, "ja"));
  }, [companies, jobs]);

  const filteredJobs = useMemo(() => {
    if (companyId === "ALL") return jobs;
    return jobs.filter((j) => j.companyId === companyId);
  }, [jobs, companyId]);

  const filteredApps = useMemo(() => {
    if (!ym) return [];
    const inPeriod = apps.filter((a) => isInYm(a.appliedAt, ym));
    if (companyId === "ALL") return inPeriod;
    return inPeriod.filter((a) => a.companyId === companyId);
  }, [apps, ym, companyId]);

  const siteRows = useMemo<SiteRow[]>(() => {
    if (!ym) return [];

    const appsBySite = new Map<string, number>();
    for (const a of filteredApps) {
      const key = String(a.siteKey || "").trim();
      if (!key) continue;
      appsBySite.set(key, (appsBySite.get(key) ?? 0) + 1);
    }

    const postedBySite = new Map<string, number>();
    for (const s of sites) {
      const count = filteredJobs.filter((j) => isPostedToSite(j, s)).length;
      postedBySite.set(s, count);
    }

    const allKeys = new Set<string>([...sites, ...Array.from(appsBySite.keys())]);

    const out: SiteRow[] = Array.from(allKeys).map((siteKey) => {
      const postedJobs = postedBySite.get(siteKey) ?? 0;
      const applications = appsBySite.get(siteKey) ?? 0;
      const appRate = postedJobs > 0 ? applications / postedJobs : null;
      return { siteKey, postedJobs, applications, appRate };
    });

    out.sort((a, b) => {
      if (a.applications !== b.applications) return b.applications - a.applications;
      const ar = a.appRate ?? -1;
      const br = b.appRate ?? -1;
      if (ar !== br) return br - ar;
      return a.siteKey.localeCompare(b.siteKey, "ja");
    });

    return out;
  }, [ym, filteredApps, filteredJobs, sites]);

  const jobRows = useMemo<JobRow[]>(() => {
    const countByJob = new Map<string, number>();
    const siteCountByJob = new Map<string, Map<string, number>>();

    for (const a of filteredApps) {
      countByJob.set(a.jobId, (countByJob.get(a.jobId) ?? 0) + 1);

      const m = siteCountByJob.get(a.jobId) ?? new Map<string, number>();
      const k = String(a.siteKey || "").trim() || "(未設定)";
      m.set(k, (m.get(k) ?? 0) + 1);
      siteCountByJob.set(a.jobId, m);
    }

    const jobById = new Map<string, Job>(filteredJobs.map((j) => [j.id, j]));
    const companyById = new Map<string, Company>(companies.map((c) => [c.id, c]));

    const out: JobRow[] = Array.from(countByJob.entries()).map(([jobId, applications]) => {
      const job = jobById.get(jobId);
      const title = job?.jobTitle || "(求人名未設定)";
      const cName =
        (job?.companyId ? companyById.get(job.companyId)?.companyName : undefined) ||
        job?.companyName ||
        "(会社名未設定)";

      const siteMap = siteCountByJob.get(jobId) ?? new Map<string, number>();
      const topSite =
        Array.from(siteMap.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ja"))[0]
          ?.[0] ?? null;

      return { jobId, jobTitle: title, companyName: cName, applications, topSiteKey: topSite };
    });

    out.sort((a, b) => b.applications - a.applications || a.jobTitle.localeCompare(b.jobTitle, "ja"));
    return out;
  }, [filteredApps, filteredJobs, companies]);

  const totals = useMemo(() => {
    return { postedJobs: filteredJobs.length, applications: filteredApps.length };
  }, [filteredJobs, filteredApps]);

  const topSites = useMemo(() => siteRows.slice(0, 3).map((r) => r.siteKey), [siteRows]);

  // bar用（最大応募数）
  const maxApps = useMemo(() => Math.max(0, ...siteRows.map((r) => r.applications)), [siteRows]);

  const headerCompanyLabel =
    companyId === "ALL"
      ? "全社"
      : companyOptions.find((c) => c.id === companyId)?.name ?? "（会社）";

  if (!mounted) return <main className="cv-container py-8" />;

  return (
    <main className="cv-container py-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="cv-page-title">分析</h1>
          <p className="cv-page-subtitle">媒体別の応募状況（手入力データ）を見える化します</p>

          <div className="mt-3 inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs text-slate-600 shadow-sm">
            <span className="text-slate-500">表示</span>
            <span className="font-semibold text-slate-900">{ym}</span>
            <span className="text-slate-300">/</span>
            <span className="font-semibold text-slate-900">{headerCompanyLabel}</span>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Link href="/companies" className="cv-btn cv-btn-secondary">
            会社一覧
          </Link>
          <Link href="/jobs" className="cv-btn cv-btn-secondary">
            求人一覧
          </Link>
          <Link href="/work-queue" className="cv-btn cv-btn-secondary">
            Work Queue
          </Link>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-6 cv-panel p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-xs font-semibold text-slate-700">フィルタ</div>

          <div className="flex items-center gap-2">
            <button type="button" className={chipClass(ym === currentYm())} onClick={() => setYm(currentYm())}>
              今月
            </button>
            <button type="button" className={chipClass(ym === prevYm())} onClick={() => setYm(prevYm())}>
              先月
            </button>
          </div>

          <div className="hidden h-5 w-px bg-slate-200 sm:block" />

          <div className="flex items-center gap-2">
            <div className="text-xs text-slate-600">会社</div>
            <select
              className="min-w-[16rem] rounded-xl border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none"
              style={{ borderColor: "var(--border)" }}
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
            >
              <option value="ALL">全社</option>
              {companyOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="ml-auto">
            <button
              type="button"
              className="cv-btn cv-btn-secondary"
              onClick={() => {
                setYm(currentYm());
                setCompanyId("ALL");
              }}
            >
              リセット
            </button>
          </div>
        </div>
      </div>

      {/* KPI */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="cv-panel p-5">
          <div className="text-xs text-slate-600">求人件数</div>
          <div className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
            {totals.postedJobs}
          </div>
        </div>
        <div className="cv-panel p-5">
          <div className="text-xs text-slate-600">応募数（{ym}）</div>
          <div className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
            {totals.applications}
          </div>
        </div>
        <div className="cv-panel p-5">
          <div className="text-xs text-slate-600">媒体数</div>
          <div className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
            {siteRows.length}
          </div>
        </div>
      </div>

      {/* Site table (A+B) */}
      <section className="mt-6 cv-panel overflow-hidden">
        <div className="border-b px-5 py-4" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900">媒体別 応募状況</div>
              <div className="mt-1 text-xs text-slate-500">
                応募数はバー、応募/掲載は色で強調（上位3媒体はTOP）
              </div>
            </div>

            <div className="shrink-0 text-xs text-slate-500">
              データ追加は各求人の <span className="font-semibold text-slate-900">「データ」</span> から
            </div>
          </div>
        </div>

        {siteRows.length === 0 ? (
          <div className="p-6 text-sm text-slate-600">
            まだデータがありません。求人の「データ」から応募者を追加してください。
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="cv-table">
              <thead>
                <tr>
                  <th>媒体</th>
                  <th className={numCellClass()}>掲載求人</th>
                  <th>応募（バー）</th>
                  <th className={numCellClass()}>応募/掲載</th>
                </tr>
              </thead>

              <tbody>
                {siteRows.map((r) => {
                  const isTop = topSites.includes(r.siteKey);
                  const pct = maxApps <= 0 ? 0 : Math.round((r.applications / maxApps) * 100);
                  const pill = ratePill(r.applications, r.postedJobs);

                  return (
                    <tr key={r.siteKey} className={isTop ? "bg-slate-50" : undefined}>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">{r.siteKey}</span>
                          {isTop ? (
                            <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-semibold text-white">
                              TOP
                            </span>
                          ) : null}
                        </div>
                      </td>

                      <td>
                        <div className={numCellClass("text-slate-700")}>{r.postedJobs}</div>
                      </td>

                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-48 max-w-[44vw]">
                            <div className="h-2 rounded-full bg-slate-100">
                              <div
                                className="h-2 rounded-full bg-slate-900"
                                style={{ width: `${pct}%` }}
                                aria-label={`応募数 ${r.applications}`}
                              />
                            </div>
                          </div>
                          <div className="w-10 text-right text-sm font-semibold text-slate-900 tabular-nums">
                            {r.applications}
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className={numCellClass()}>
                          {pill.label === "-" ? (
                            <span className={pill.cls} title={pill.title}>
                              -
                            </span>
                          ) : (
                            <span
                              className={["inline-flex items-center rounded-full px-2 py-1 text-xs", pill.cls].join(
                                " "
                              )}
                              title={pill.title}
                            >
                              {pill.label}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="px-5 py-3 text-[11px] text-slate-500">
              ※ バーは「この表の最大応募数」を100%として相対表示です。応募/掲載は目安（掲載=0で応募ありは「要確認」）。
            </div>
          </div>
        )}
      </section>

      {/* Job ranking */}
      <section className="mt-6 cv-panel overflow-hidden">
        <div className="border-b px-5 py-4" style={{ borderColor: "var(--border)" }}>
          <div className="text-sm font-semibold text-slate-900">求人別 応募ランキング</div>
          <div className="mt-1 text-xs text-slate-500">上位20件を表示します</div>
        </div>

        {jobRows.length === 0 ? (
          <div className="p-6 text-sm text-slate-600">この条件では応募データがありません。</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="cv-table">
              <thead>
                <tr>
                  <th>会社</th>
                  <th>求人</th>
                  <th className={numCellClass()}>応募数</th>
                  <th>最多媒体</th>
                  <th>操作</th>
                </tr>
              </thead>

              <tbody>
                {jobRows.slice(0, 20).map((r) => (
                  <tr key={r.jobId}>
                    <td className="text-slate-700">{r.companyName}</td>
                    <td>
                      <span className="font-semibold text-slate-900">{r.jobTitle}</span>
                    </td>
                    <td>
                      <div className={numCellClass("font-semibold text-slate-900")}>{r.applications}</div>
                    </td>
                    <td className="text-slate-700">{r.topSiteKey ?? "-"}</td>
                    <td>
                      {companyId !== "ALL" ? (
                        <div className="flex flex-wrap gap-2">
                          <Link className="cv-btn cv-btn-secondary" href={`/companies/${companyId}/jobs/${r.jobId}`}>
                            求人
                          </Link>
                          <Link
                            className="cv-btn cv-btn-secondary"
                            href={`/companies/${companyId}/jobs/${r.jobId}/data`}
                          >
                            データ
                          </Link>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500">※ 全社表示ではリンクは出しません</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="px-5 py-3 text-[11px] text-slate-500">
              ※ 会社フィルタを選ぶと「求人/データ」に直接飛べます。
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
