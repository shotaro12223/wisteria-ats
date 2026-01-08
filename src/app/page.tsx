"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import ApplicantsSummary from "@/components/ApplicantsSummary";
import { listCompanies } from "@/lib/storage";
import type { Company, Job } from "@/lib/types";

import {
  buildWorkQueueRows,
  sortRows,
  type WorkQueueRow,
  type WorkQueueStatus,
} from "@/lib/workQueue";

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

function formatLocalDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function cmpUpdatedDesc(a: { updatedAt: string }, b: { updatedAt: string }) {
  return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
}

function daysAgoLabel(iso?: string): string {
  if (!iso) return "-";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "-";
  const diff = Date.now() - t;
  const dayMs = 24 * 60 * 60 * 1000;
  const d = Math.max(0, Math.floor(diff / dayMs));
  return `${d}日前`;
}

function staleClass(staleDays: number | null): string {
  if (staleDays == null) return "text-slate-400";
  if (staleDays >= 7) return "text-rose-700 font-semibold";
  if (staleDays >= 3) return "text-amber-700 font-semibold";
  return "text-slate-900";
}

function rpoClass(rpoDays: number | null): string {
  if (rpoDays == null) return "text-slate-400";
  if (rpoDays >= 7) return "text-rose-700 font-semibold";
  if (rpoDays >= 3) return "text-amber-700 font-semibold";
  return "text-slate-900";
}

const STATUS_BADGE: Record<WorkQueueStatus, { cls: string; dot: string }> = {
  NG: { cls: "bg-rose-100 text-rose-900 border-rose-200", dot: "bg-rose-500" },
  資料待ち: { cls: "bg-amber-100 text-amber-900 border-amber-200", dot: "bg-amber-500" },
  媒体審査中: { cls: "bg-indigo-100 text-indigo-900 border-indigo-200", dot: "bg-indigo-500" },
  停止中: { cls: "bg-slate-100 text-slate-700 border-slate-200", dot: "bg-slate-400" },
};

function pill(status: WorkQueueStatus) {
  const meta = STATUS_BADGE[status];
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px]",
        meta.cls,
      ].join(" ")}
    >
      <span className={["h-1.5 w-1.5 rounded-full", meta.dot].join(" ")} />
      {status}
    </span>
  );
}

function kpiCard(title: string, value: string | number, sub?: string) {
  return (
    <div className="cv-panel p-5">
      <div className="text-[11px] font-semibold text-slate-500">{title}</div>
      <div className="mt-2 text-3xl font-semibold text-slate-900 tabular-nums">{value}</div>
      {sub ? <div className="mt-1 text-[12px] text-slate-500">{sub}</div> : null}
    </div>
  );
}

function quickCard(title: string, desc: string, href: string, cta: string, subtle?: string) {
  return (
    <div className="cv-panel p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <div className="mt-1 text-[12px] text-slate-500">{desc}</div>
          {subtle ? <div className="mt-2 text-[11px] text-slate-400">{subtle}</div> : null}
        </div>
        <Link href={href} className="cv-btn-primary">
          {cta}
        </Link>
      </div>
    </div>
  );
}

/** Supabase jobs（/api/debug/jobs）レスポンス型 */
type JobsGetRes =
  | {
      ok: true;
      jobs: Array<{
        id: string;
        company_id: string | null;
        company_name: string | null;
        job_title: string | null;
        employment_type: string | null;
        site_status: any;
        created_at: string;
        updated_at: string;
      }>;
    }
  | { ok: false; error: { message: string } };

type JobRecent = {
  id: string;
  companyId: string;
  companyName: string;
  jobTitle: string;
  employmentType: string;
  updatedAt: string;
};

function rowToJobLike(r: JobsGetRes extends { ok: true; jobs: infer T } ? any : any): Job {
  // lib/workQueue が読む最低限の形に合わせる
  return {
    id: String(r.id ?? ""),
    companyId: String(r.company_id ?? ""),
    companyName: String(r.company_name ?? ""),
    jobTitle: String(r.job_title ?? ""),
    employmentType: String(r.employment_type ?? ""),
    siteStatus: r.site_status ?? null,
    createdAt: String(r.created_at ?? ""),
    updatedAt: String(r.updated_at ?? ""),
  } as any;
}

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [jobs, setJobs] = useState<JobRecent[]>([]);
  const [jobsForQueue, setJobsForQueue] = useState<Job[]>([]);
  const [apps, setApps] = useState<Applicant[]>([]);

  useEffect(() => {
    setMounted(true);
    setCompanies(listCompanies());
    setApps(readApplicantsAll());

    (async () => {
      // ✅ Supabaseから求人を取得（localStorageは使わない）
      const res = await fetch("/api/debug/jobs", { cache: "no-store" });
      const json = (await res.json()) as JobsGetRes;

      if (!res.ok || !json.ok) {
        setJobs([]);
        setJobsForQueue([]);
        return;
      }

      const nextRecent: JobRecent[] = (json.jobs ?? []).map((r) => ({
        id: String(r.id ?? ""),
        companyId: String(r.company_id ?? ""),
        companyName: String(r.company_name ?? ""),
        jobTitle: String(r.job_title ?? ""),
        employmentType: String(r.employment_type ?? ""),
        updatedAt: String(r.updated_at ?? ""),
      }));

      const nextQueue: Job[] = (json.jobs ?? []).map((r) => rowToJobLike(r));

      setJobs(nextRecent);
      setJobsForQueue(nextQueue);
    })();
  }, []);

  const jobsRecent = useMemo(() => {
    return jobs.slice().sort(cmpUpdatedDesc).slice(0, 6);
  }, [jobs]);

  const companiesRecent = useMemo(() => {
    return companies.slice().sort(cmpUpdatedDesc).slice(0, 6);
  }, [companies]);

  const appsThisMonth = useMemo(() => {
    const ym = new Date();
    const y = ym.getFullYear();
    const m = String(ym.getMonth() + 1).padStart(2, "0");
    const prefix = `${y}-${m}-`;
    return apps.filter((a) => typeof a.appliedAt === "string" && a.appliedAt.startsWith(prefix));
  }, [apps]);

  const apps7d = useMemo(() => {
    const now = Date.now();
    const from = now - 7 * 24 * 60 * 60 * 1000;
    return apps.filter((a) => {
      const t = Date.parse(a.appliedAt);
      return Number.isFinite(t) && t >= from && t <= now;
    });
  }, [apps]);

  // ===== Home Agenda (RPO司令塔) =====
  const allRows = useMemo<WorkQueueRow[]>(() => {
    // companies は補助（会社名など）。jobs側に companyName が入っていれば最低限動く
    return buildWorkQueueRows({ jobs: jobsForQueue, companies });
  }, [jobsForQueue, companies]);

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
    <div className="space-y-6">
      {/* Hero */}
      <div className="cv-panel p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-slate-900">ホーム</h1>
            <p className="mt-2 text-sm text-slate-600">
              朝ここだけ見れば「今日やるべきこと」が分かる。会社 → 求人 → 出力 → 応募データ → 分析 を最短で回す
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/companies" className="cv-btn-secondary">
                会社一覧
              </Link>
              <Link href="/analytics" className="cv-btn-secondary">
                分析
              </Link>
              <Link href="/work-queue" className="cv-btn-secondary">
                Work Queue
              </Link>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <Link href="/companies/new" className="cv-btn-primary">
              + 会社を追加
            </Link>
          </div>
        </div>
      </div>

      {/* ===== RPO Agenda (Home) ===== */}
      <div className="cv-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900">今日のRPOアジェンダ</div>
            <div className="mt-1 text-xs text-slate-500">
              危険度が高い順に、トップ5から着手（滞留 / RPO未タッチ / NG を優先）。
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <Link href="/work-queue" className="cv-btn-primary">
              今日の優先でWork Queue →
            </Link>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div
            className="rounded-2xl border bg-white p-5 shadow-sm"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="text-[11px] font-semibold text-slate-500">今すぐ着手（危険）</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900 tabular-nums">
              {agenda.urgentCount}
            </div>
            <div className="mt-1 text-[12px] text-slate-500">7日+滞留 / 7日未タッチ / NG を含む</div>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
              <span
                className="rounded-full border bg-white px-2 py-1"
                style={{ borderColor: "var(--border)" }}
              >
                滞留7日+:{" "}
                <span className="font-medium text-slate-700 tabular-nums">{agenda.stale7}</span>
              </span>
              <span
                className="rounded-full border bg-white px-2 py-1"
                style={{ borderColor: "var(--border)" }}
              >
                RPO7日未:{" "}
                <span className="font-medium text-slate-700 tabular-nums">{agenda.rpo7}</span>
              </span>
              <span
                className="rounded-full border bg-white px-2 py-1"
                style={{ borderColor: "var(--border)" }}
              >
                NG: <span className="font-medium text-slate-700 tabular-nums">{agenda.ng}</span>
              </span>
            </div>
          </div>

          <div
            className="rounded-2xl border bg-white p-5 shadow-sm"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="text-[11px] font-semibold text-slate-500">今週中に処理（注意）</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900 tabular-nums">
              {agenda.soonCount}
            </div>
            <div className="mt-1 text-[12px] text-slate-500">3日以上の滞留 / 未タッチを含む</div>
            <div className="mt-2 text-[11px] text-slate-500">
              “危険”を潰したらここを消していくと、全体が安定します。
            </div>
          </div>

          <div
            className="rounded-2xl border bg-white p-5 shadow-sm"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="text-[11px] font-semibold text-slate-500">優先トップ5</div>
            {agenda.top.length === 0 ? (
              <div className="mt-3 text-sm text-slate-600">いまは要対応がありません 🎉</div>
            ) : (
              <div className="mt-3 space-y-2">
                {agenda.top.map((r) => (
                  <div
                    key={`${r.jobId}:${r.siteKey}`}
                    className="rounded-xl border bg-white p-3"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          {pill(r.status)}
                          <span className="text-[11px] text-slate-500">
                            滞留:{" "}
                            <span className={staleClass(r.staleDays ?? null)}>{r.staleDays ?? "-"}</span>{" "}
                            / RPO:{" "}
                            <span className={rpoClass(r.rpoTouchedDays ?? null)}>{r.rpoTouchedDays ?? "-"}</span>
                          </span>
                        </div>

                        <div className="mt-2 truncate text-sm font-semibold text-slate-900">
                          {r.companyName} / {r.jobTitle}
                        </div>
                        <div className="mt-1 text-[12px] text-slate-600">
                          媒体: <span className="font-medium">{r.siteKey}</span>
                        </div>
                        <div className="mt-1 text-[11px] text-slate-400">
                          最終更新：媒体 {daysAgoLabel(r.mediaUpdatedAtISO)} / RPO {daysAgoLabel(r.rpoLastTouchedAtISO)}
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col gap-2">
                        {r.companyId ? (
                          <>
                            <Link className="cv-btn-secondary" href={`/companies/${r.companyId}/jobs/${r.jobId}`}>
                              詳細
                            </Link>
                            <Link className="cv-btn-secondary" href={`/companies/${r.companyId}/jobs/${r.jobId}/outputs`}>
                              出力
                            </Link>
                          </>
                        ) : (
                          <span className="text-[11px] text-slate-400">会社未紐付け</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCard("会社数", companies.length, "登録済みの会社（localStorage）")}
        {kpiCard("求人件数", jobs.length, "全社合計（Supabase）")}
        {kpiCard("応募数（今月）", appsThisMonth.length, "手入力データ")}
        {kpiCard("応募数（直近7日）", apps7d.length, "週次の変化を見る")}
      </div>

      {/* ✅ 新着応募（ダッシュボード 5件） */}
      <ApplicantsSummary limit={5} />

      {/* Quick actions */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {quickCard(
          "会社を登録する",
          "まず会社概要を作ると、求人が迷子になりません。",
          "/companies/new",
          "会社を追加",
          "おすすめ：最初の1社を固める"
        )}
        {quickCard(
          "Work Queueで処理する",
          "滞留・未タッチ・NGを優先順に潰していく。",
          "/work-queue",
          "Work Queueへ",
          "朝のトップ5 → そのまま処理"
        )}
        {quickCard(
          "応募データを入れる",
          "求人の「データ」から応募を追加すると分析が育ちます。",
          "/analytics",
          "分析へ",
          "“応募/掲載”が見える化される"
        )}
      </div>

      {/* Recent */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Recent jobs */}
        <div className="cv-panel overflow-hidden">
          <div className="border-b px-5 py-4" style={{ borderColor: "var(--border)" }}>
            <div className="text-sm font-semibold text-slate-900">最近更新した求人</div>
            <div className="mt-1 text-[12px] text-slate-500">直近の編集から続きを始める</div>
          </div>

          {jobsRecent.length === 0 ? (
            <div className="p-6 text-sm text-slate-600">まだ求人がありません。</div>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {jobsRecent.map((j) => (
                <div key={j.id} className="px-5 py-4 hover:bg-slate-50/70">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900">
                        {j.jobTitle || "(職種名未設定)"}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-slate-500">
                        <span className="truncate">{j.companyName || "(会社名未設定)"}</span>
                        {j.employmentType ? <span>{j.employmentType}</span> : null}
                      </div>
                      <div className="mt-1 text-[11px] text-slate-400">更新: {formatLocalDateTime(j.updatedAt)}</div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <Link href={`/companies/${j.companyId}/jobs/${j.id}`} className="cv-btn-secondary">
                        開く
                      </Link>
                      <Link href={`/companies/${j.companyId}/jobs/${j.id}/data`} className="cv-btn-secondary">
                        データ
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="border-t px-5 py-4" style={{ borderColor: "var(--border)" }}>
            <Link href="/work-queue" className="cv-link text-sm">
              Work Queueへ →
            </Link>
          </div>
        </div>

        {/* Recent companies */}
        <div className="cv-panel overflow-hidden">
          <div className="border-b px-5 py-4" style={{ borderColor: "var(--border)" }}>
            <div className="text-sm font-semibold text-slate-900">最近更新した会社</div>
            <div className="mt-1 text-[12px] text-slate-500">会社ページから求人を追加するのが最短</div>
          </div>

          {companiesRecent.length === 0 ? (
            <div className="p-6 text-sm text-slate-600">まだ会社がありません。</div>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {companiesRecent.map((c) => (
                <div key={c.id} className="px-5 py-4 hover:bg-slate-50/70">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900">
                        {c.companyName || "(会社名未設定)"}
                      </div>
                      <div className="mt-1 text-[11px] text-slate-400">更新: {formatLocalDateTime(c.updatedAt)}</div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <Link href={`/companies/${c.id}`} className="cv-btn-secondary">
                        開く
                      </Link>
                      <Link href={`/companies/${c.id}/jobs/new`} className="cv-btn-secondary">
                        求人追加
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="border-t px-5 py-4" style={{ borderColor: "var(--border)" }}>
            <Link href="/companies" className="cv-link text-sm">
              会社一覧へ →
            </Link>
          </div>
        </div>
      </div>

      {/* Tip */}
      <div className="cv-panel p-5">
        <div className="text-sm font-semibold text-slate-900">おすすめの運用</div>
        <div className="mt-2 text-sm text-slate-600">
          ① 朝：ホームのトップ5 → ② Work Queueで処理 → ③ 出力でコピペ → ④ 「データ」で応募を入れる → ⑤ 「分析」で媒体判断
        </div>
      </div>
    </div>
  );
}
