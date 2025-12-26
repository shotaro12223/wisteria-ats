"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { listCompanies, listJobs } from "@/lib/storage";
import type { Company, Job } from "@/lib/types";

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

function kpiCard(title: string, value: string | number, sub?: string) {
  return (
    <div className="cv-panel p-5">
      <div className="text-[11px] font-semibold text-slate-500">{title}</div>
      <div className="mt-2 text-3xl font-semibold text-slate-900 tabular-nums">{value}</div>
      {sub ? <div className="mt-1 text-[12px] text-slate-500">{sub}</div> : null}
    </div>
  );
}

function quickCard(
  title: string,
  desc: string,
  href: string,
  cta: string,
  subtle?: string
) {
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

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [apps, setApps] = useState<Applicant[]>([]);

  useEffect(() => {
    setMounted(true);
    setCompanies(listCompanies());
    setJobs(listJobs());
    setApps(readApplicantsAll());
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

  if (!mounted) return <div className="h-4" />;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="cv-panel p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-slate-900">ダッシュボード</h1>
            <p className="mt-2 text-sm text-slate-600">
              会社 → 求人 → 出力 → 応募データ → 分析 を最短で回す
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/companies" className="cv-btn-secondary">
                会社一覧
              </Link>
              <Link href="/jobs" className="cv-btn-secondary">
                求人一覧
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
            <Link href="/jobs/new" className="cv-btn-secondary">
              + 求人を追加
            </Link>
          </div>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCard("会社数", companies.length, "登録済みの会社")}
        {kpiCard("求人件数", jobs.length, "全社合計")}
        {kpiCard("応募数（今月）", appsThisMonth.length, "手入力データ")}
        {kpiCard("応募数（直近7日）", apps7d.length, "週次の変化を見る")}
      </div>

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
          "求人を作る",
          "入力 → 媒体ステータス → 出力 まで一直線。",
          "/jobs/new",
          "求人を追加",
          "会社配下で作るなら会社ページからもOK"
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
            <div className="p-6 text-sm text-slate-600">
              まだ求人がありません。右上の「+ 求人を追加」から作成してください。
            </div>
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
                        {j.nearestStation ? <span>最寄り: {j.nearestStation}</span> : null}
                      </div>
                      <div className="mt-1 text-[11px] text-slate-400">更新: {formatLocalDateTime(j.updatedAt)}</div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <Link href={`/companies/${j.companyId ?? ""}/jobs/${j.id}`} className="cv-btn-secondary">
                        開く
                      </Link>
                      <Link href={`/companies/${j.companyId ?? ""}/jobs/${j.id}/data`} className="cv-btn-secondary">
                        データ
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="border-t px-5 py-4" style={{ borderColor: "var(--border)" }}>
            <Link href="/jobs" className="cv-link text-sm">
              求人一覧へ →
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
            <div className="p-6 text-sm text-slate-600">
              まだ会社がありません。右上の「+ 会社を追加」から登録してください。
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {companiesRecent.map((c) => (
                <div key={c.id} className="px-5 py-4 hover:bg-slate-50/70">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900">
                        {c.companyName || "(会社名未設定)"}
                      </div>
                      <div className="mt-1 text-[12px] text-slate-500">
                        {c.phone ? `TEL: ${c.phone}` : "—"} {c.website ? ` / ${c.website}` : ""}
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
          ① 会社ページで求人を追加 → ② 媒体ステータスを更新 → ③ 出力でコピペ → ④ 「データ」で応募を入れる →
          ⑤ 「分析」で媒体判断
        </div>
      </div>
    </div>
  );
}
