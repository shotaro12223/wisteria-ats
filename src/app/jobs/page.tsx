"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Job } from "@/lib/types";

type JobsApiResponse =
  | {
      ok: true;
      jobs: Array<{
        id: string;
        company_id: string | null;
        company_name: string | null;
        job_title: string | null;
        employment_type: string | null;
        created_at: string;
        updated_at: string;
      }>;
    }
  | { ok: false; error: { message: string; details?: string | null; hint?: string | null; code?: string | null } };

function toJob(row: {
  id: string;
  company_id: string | null;
  company_name: string | null;
  job_title: string | null;
  employment_type: string | null;
  created_at: string;
  updated_at: string;
}): Job {
  return {
    id: row.id,
    companyId: row.company_id ?? "",
    companyName: row.company_name ?? "",
    jobTitle: row.job_title ?? "",
    employmentType: row.employment_type ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } as Job;
}

export default function JobsPage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    setMounted(true);

    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await fetch("/api/jobs", { cache: "no-store" });
        const json = (await res.json()) as JobsApiResponse;

        if (!res.ok || !("ok" in json) || json.ok === false) {
          const msg = "ok" in json && json.ok === false ? json.error.message : `jobs fetch failed: ${res.status}`;
          throw new Error(msg);
        }

        setJobs((json.jobs ?? []).map(toJob));
      } catch (e) {
        setJobs([]);
        setLoadError(e instanceof Error ? e.message : "読み込みに失敗しました");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const sorted = useMemo(() => {
    const arr = [...jobs];
    arr.sort((a, b) => String((b as any).updatedAt || "").localeCompare(String((a as any).updatedAt || "")));
    return arr;
  }, [jobs]);

  if (!mounted) return <div className="h-4" />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="cv-panel p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-slate-900">求人一覧</h1>
            <p className="mt-2 text-sm text-slate-600">求人の詳細（データ/出力）を確認します。</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/" className="cv-btn-secondary">
                Home
              </Link>
              <Link href="/companies" className="cv-btn-secondary">
                会社一覧
              </Link>
              <Link href="/analytics" className="cv-btn-secondary">
                分析
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Status */}
      {loading ? (
        <div className="cv-panel p-6 text-sm text-slate-600">読み込み中…</div>
      ) : loadError ? (
        <div className="cv-panel p-6">
          <div className="text-sm font-semibold text-slate-900">読み込みに失敗しました</div>
          <div className="mt-2 text-sm text-red-600">{loadError}</div>
          <div className="mt-4 text-xs text-slate-500">※ /api/jobs が 200 を返すか確認してください</div>
        </div>
      ) : sorted.length === 0 ? (
        <div className="cv-panel p-8">
          <div className="text-sm font-semibold text-slate-900">求人がありません</div>
          <div className="mt-2 text-sm text-slate-600">会社ページから求人を追加してください。</div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/companies" className="cv-btn-primary">
              会社一覧へ
            </Link>
          </div>
        </div>
      ) : null}

      {/* List */}
      {loading || sorted.length === 0 ? null : (
        <div className="space-y-3">
          {sorted.map((j) => (
            <div key={j.id} className="cv-panel p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <Link
                    href={`/jobs/${j.id}`}
                    className="block truncate text-lg font-semibold text-slate-900 hover:text-slate-700"
                    title="求人を開く"
                  >
                    {j.jobTitle || "(職種未入力)"}
                  </Link>

                  <div className="mt-2 flex flex-wrap gap-2 text-[12px] text-slate-600">
                    <span className="rounded-full border bg-white px-3 py-1" style={{ borderColor: "var(--border)" }}>
                      会社: <span className="font-semibold text-slate-900">{j.companyName || "(未入力)"}</span>
                    </span>

                    {(j as any).employmentType ? (
                      <span className="rounded-full border bg-white px-3 py-1" style={{ borderColor: "var(--border)" }}>
                        雇用: <span className="tabular-nums">{String((j as any).employmentType)}</span>
                      </span>
                    ) : null}

                    {(j as any).updatedAt ? (
                      <span className="rounded-full border bg-white px-3 py-1" style={{ borderColor: "var(--border)" }}>
                        更新: <span className="tabular-nums">{new Date(String((j as any).updatedAt)).toLocaleString()}</span>
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3 text-[12px] text-slate-500">
                    {j.companyId ? "会社に紐づく求人です" : "会社が未紐付けです（必要なら会社ページから作成してください）"}
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col sm:items-end">
                  <Link href={`/jobs/${j.id}`} className="cv-btn-secondary">
                    開く
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
