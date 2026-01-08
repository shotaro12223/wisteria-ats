"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import type { Job } from "@/lib/types";
import { JobForm } from "@/components/JobForm";
import { JobSiteStatusBar } from "@/components/JobSiteStatusBar";
import JobApplicantsSummary from "@/components/JobApplicantsSummary";

type SaveStatus = "idle" | "saved";

function formatLocalDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

type CompanyGetRes =
  | {
      ok: true;
      company: { id: string; company_name: string; created_at: string; updated_at: string } | null;
    }
  | { ok: false; error: { message: string } };

type JobRow = {
  id: string;
  company_id: string | null;
  company_name: string | null;
  job_title: string | null;
  employment_type: string | null;
  site_status: any;
  created_at: string;
  updated_at: string;
};

type JobGetRes = { ok: true; job: JobRow | null } | { ok: false; error: { message: string } };
type JobPatchRes = { ok: true; job: JobRow } | { ok: false; error: { message: string } };

function rowToJob(r: JobRow, fallbackCompanyId: string, fallbackCompanyName: string): Job {
  return {
    id: r.id,
    companyId: r.company_id ?? fallbackCompanyId,
    companyName: r.company_name ?? fallbackCompanyName,
    jobTitle: r.job_title ?? "",
    employmentType: r.employment_type ?? "",
    siteStatus: r.site_status ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  } as any;
}

export default function CompanyJobDetailPage() {
  const params = useParams<{ companyId: string; jobId: string }>();
  const router = useRouter();

  const companyId = useMemo(() => String(params.companyId ?? ""), [params.companyId]);
  const jobId = useMemo(() => String(params.jobId ?? ""), [params.jobId]);

  const [companyName, setCompanyName] = useState("");
  const [job, setJob] = useState<Job | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const savedTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) window.clearTimeout(savedTimerRef.current);
    };
  }, []);

  function showSavedOnce() {
    setSaveStatus("saved");
    if (savedTimerRef.current) window.clearTimeout(savedTimerRef.current);
    savedTimerRef.current = window.setTimeout(() => {
      setSaveStatus("idle");
      savedTimerRef.current = null;
    }, 1800);
  }

  async function loadAll(cid: string, jid: string) {
    setNotFound(false);
    setJob(null);

    // 会社名（パンくず用）
    const cRes = await fetch(`/api/companies/${encodeURIComponent(cid)}`, { cache: "no-store" });
    const cJson = (await cRes.json()) as CompanyGetRes;
    const cname = cRes.ok && cJson.ok && cJson.company ? String(cJson.company.company_name ?? "") : "";
    setCompanyName(cname);

    // 求人（Supabase / 本番API）
    const jRes = await fetch(`/api/jobs/${encodeURIComponent(jid)}`, { cache: "no-store" });
    const jJson = (await jRes.json()) as JobGetRes;

    if (!jRes.ok || !jJson.ok || !jJson.job) {
      setNotFound(true);
      return;
    }

    // companyId違いは弾く（別会社の求人対策）
    const dbCid = String(jJson.job.company_id ?? "");
    if (dbCid && dbCid !== cid) {
      setNotFound(true);
      return;
    }

    setJob(rowToJob(jJson.job, cid, cname));
    setSaveStatus("idle");
  }

  useEffect(() => {
    if (!companyId || !jobId) return;
    void loadAll(companyId, jobId);
  }, [companyId, jobId]);

  async function handleSave() {
    if (!job) return;

    const title = String(job.jobTitle ?? "").trim();
    if (!title) {
      alert("職種を入力してください。");
      return;
    }

    const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        companyId,
        companyName: job.companyName || companyName || "",
        jobTitle: title,
        employmentType: (job as any).employmentType ?? "",
        siteStatus: (job as any).siteStatus ?? null,
      }),
    });

    const json = (await res.json()) as JobPatchRes;
    if (!res.ok || !json.ok) {
      alert(!json.ok ? json.error.message : `保存に失敗しました (status: ${res.status})`);
      return;
    }

    setJob(rowToJob(json.job, companyId, companyName || ""));
    showSavedOnce();
  }

  // 媒体ステータス更新（バーから即保存）
  async function handleSiteStatusUpdate(next: Job) {
    setJob(next);

    const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        companyId,
        companyName: next.companyName || companyName || "",
        jobTitle: next.jobTitle || "",
        employmentType: (next as any).employmentType ?? "",
        siteStatus: (next as any).siteStatus ?? null,
      }),
    });

    const json = (await res.json()) as JobPatchRes;
    if (!res.ok || !json.ok) return;

    setJob(rowToJob(json.job, companyId, companyName || ""));
    showSavedOnce();
  }

  if (notFound) {
    return (
      <main className="space-y-6">
        <div className="cv-panel p-8">
          <h1 className="text-lg font-semibold text-slate-900">求人が見つかりません</h1>
          <p className="mt-2 text-sm text-slate-600">URLが間違っているか、別会社の求人の可能性があります。</p>
          <div className="mt-5">
            <Link href={`/companies/${companyId}`} className="cv-btn-secondary">
              ← 会社マイページに戻る
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!job) {
    return (
      <main className="space-y-6">
        <div className="cv-panel p-6 text-sm text-slate-600">読み込み中...</div>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <div
        className="sticky top-0 z-30 rounded-2xl border bg-white/85 p-4 backdrop-blur"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm">
              <Link href="/companies" className="cv-link">
                会社一覧
              </Link>
              <span className="text-slate-300">/</span>
              <Link href={`/companies/${companyId}`} className="cv-link">
                {companyName || "会社"}
              </Link>
              <span className="text-slate-300">/</span>
              <span className="truncate font-semibold text-slate-900">{job.jobTitle || "求人詳細"}</span>
            </div>

            <div className="mt-1 text-xs text-slate-500">求人情報を編集して保存してください</div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
              {saveStatus === "saved" ? <span className="cv-badge">保存済み</span> : null}
              <span className="rounded-full border bg-white px-3 py-1" style={{ borderColor: "var(--border)" }}>
                更新: <span className="font-medium text-slate-700">{formatLocalDateTime(job.updatedAt)}</span>
              </span>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Link href={`/companies/${companyId}/jobs/${jobId}/outputs`} className="cv-btn-secondary">
              出力へ
            </Link>
            <Link href={`/companies/${companyId}/jobs/${jobId}/data`} className="cv-btn-secondary">
              データ
            </Link>
            <button type="button" className="cv-btn-primary" onClick={handleSave}>
              保存
            </button>
          </div>
        </div>

        <div className="mt-4">
          <JobSiteStatusBar job={job} onUpdate={handleSiteStatusUpdate} />
        </div>
      </div>

      <section className="cv-panel p-6">
        <div className="mb-4 text-sm font-semibold text-slate-900">応募サマリ</div>
        <JobApplicantsSummary companyId={companyId} jobId={jobId} />
      </section>

      <section className="cv-panel p-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900">求人情報</div>
            <div className="mt-1 text-xs text-slate-500">変更したら保存</div>
          </div>
          <button type="button" className="cv-btn-primary" onClick={handleSave}>
            保存
          </button>
        </div>

        <JobForm job={job} onChange={setJob} />
      </section>
    </main>
  );
}
