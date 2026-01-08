"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { Company, Job } from "@/lib/types";

type SortKey = "updated_desc" | "name_asc" | "jobs_desc";

function formatLocalDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

/* =========================
 * API Response Types
 * ========================= */
type CompaniesApiResponse =
  | {
      ok: true;
      companies: Array<{
        id: string;
        company_name: string;
        created_at: string;
        updated_at: string;
      }>;
    }
  | {
      ok: false;
      error: { message: string };
    };

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
  | {
      ok: false;
      error: { message: string };
    };

function toCompany(row: {
  id: string;
  company_name: string;
  created_at: string;
  updated_at: string;
}): Company {
  return {
    id: row.id,
    companyName: row.company_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } as Company;
}

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

export default function CompaniesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);

  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("updated_desc");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const [cRes, jRes] = await Promise.all([
          fetch("/api/companies", { cache: "no-store" }),
          fetch("/api/jobs", { cache: "no-store" }),
        ]);

        const cJson = (await cRes.json()) as CompaniesApiResponse;
        if (!cRes.ok) {
          throw new Error(`companies HTTP ${cRes.status}`);
        }
        if (cJson.ok === false) {
          throw new Error(`companies: ${cJson.error.message}`);
        }

        const jJson = (await jRes.json()) as JobsApiResponse;
        if (!jRes.ok) {
          throw new Error(`jobs HTTP ${jRes.status}`);
        }
        if (jJson.ok === false) {
          throw new Error(`jobs: ${jJson.error.message}`);
        }

        if (cancelled) return;
        setCompanies((cJson.companies ?? []).map(toCompany));
        setJobs((jJson.jobs ?? []).map(toJob));
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "読み込み失敗");
        setCompanies([]);
        setJobs([]);
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const jobsByCompany = useMemo(() => {
    const m = new Map<string, Job[]>();
    for (const j of jobs) {
      if (!j.companyId) continue;
      const arr = m.get(j.companyId) ?? [];
      arr.push(j);
      m.set(j.companyId, arr);
    }
    return m;
  }, [jobs]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();

    const base = companies.filter((c) =>
      !query ? true : c.companyName.toLowerCase().includes(query)
    );

    return base.sort((a, b) => {
      if (sortKey === "name_asc") {
        return a.companyName.localeCompare(b.companyName, "ja");
      }
      if (sortKey === "jobs_desc") {
        return (jobsByCompany.get(b.id)?.length ?? 0) - (jobsByCompany.get(a.id)?.length ?? 0);
      }
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  }, [companies, q, sortKey, jobsByCompany]);

  if (loading) {
    return <div className="cv-panel p-6 text-sm">読み込み中…</div>;
  }

  if (error) {
    return (
      <div className="cv-panel p-6">
        <div className="text-sm font-semibold">エラー</div>
        <div className="mt-1 text-sm text-red-600">{error}</div>
        <div className="mt-4">
          <Link href="/companies/new" className="cv-btn-primary">
            + 会社を追加
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="cv-panel p-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold">会社一覧</h1>
          <Link href="/companies/new" className="cv-btn-primary">
            + 会社を追加
          </Link>
        </div>

        <div className="mt-4 flex gap-3">
          <input
            className="rounded-xl border px-3 py-2 text-sm"
            placeholder="会社名で検索"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <select
            className="rounded-xl border px-3 py-2 text-sm"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
          >
            <option value="updated_desc">更新が新しい順</option>
            <option value="name_asc">会社名順</option>
            <option value="jobs_desc">求人が多い順</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {filtered.map((c) => (
          <div key={c.id} className="cv-panel p-5">
            <Link href={`/companies/${c.id}`} className="text-lg font-semibold">
              {c.companyName}
            </Link>
            <div className="mt-2 text-sm text-slate-500">
              求人 {jobsByCompany.get(c.id)?.length ?? 0} 件
            </div>
            <div className="mt-1 text-xs text-slate-400">
              更新: {formatLocalDateTime(c.updatedAt)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
