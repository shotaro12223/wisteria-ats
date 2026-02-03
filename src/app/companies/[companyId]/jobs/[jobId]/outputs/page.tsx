"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import type { Job, JobSite } from "@/lib/types";
import { SITE_TEMPLATES, JOB_SITES } from "@/lib/templates";
import { getTemplateFieldValue } from "@/lib/render";
import { TemplateSelector } from "@/components/TemplateSelector";

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

function rowToJob(r: JobRow, companyId: string): Job {
  return {
    id: r.id,
    companyId: r.company_id ?? companyId,
    companyName: r.company_name ?? "",
    jobTitle: r.job_title ?? "",
    employmentType: r.employment_type ?? "",
    siteStatus: r.site_status ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  } as any;
}

function panel() {
  return "cv-panel p-6";
}

export default function JobOutputsPage() {
  const params = useParams<{ companyId: string; jobId: string }>();
  const companyId = String(params.companyId ?? "");
  const jobId = String(params.jobId ?? "");

  const [job, setJob] = useState<Job | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [site, setSite] = useState<JobSite>("採用係長");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setNotFound(false);
      setJob(null);

      const res = await fetch(`/api/debug/jobs/${encodeURIComponent(jobId)}`, { cache: "no-store" });
      const json = (await res.json()) as JobGetRes;

      if (!res.ok || !json.ok || !json.job) {
        setNotFound(true);
        return;
      }

      const dbCid = String(json.job.company_id ?? "");
      if (dbCid && dbCid !== companyId) {
        setNotFound(true);
        return;
      }

      setJob(rowToJob(json.job, companyId));
    }

    if (!companyId || !jobId) return;
    void load();
  }, [companyId, jobId]);

  const template = useMemo(() => SITE_TEMPLATES.find((t) => t.site === site)!, [site]);

  const outputs = useMemo(() => {
    if (!job) return [];
    return template.fields
      .map((f) => {
        const v = getTemplateFieldValue(job, f);
        if (!v || v.trim().length === 0) return null;
        return { label: f.label, value: v };
      })
      .filter(Boolean) as Array<{ label: string; value: string }>;
  }, [job, template]);

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 1200);
  }

  if (notFound) {
    return (
      <main className="space-y-6">
        <div className="cv-panel p-8">
          <h1 className="text-lg font-semibold text-slate-900">求人が見つかりません</h1>
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
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-sm text-slate-500">
            <Link href={`/companies/${companyId}`} className="cv-link">会社</Link>
            <span className="text-slate-300"> / </span>
            <Link href={`/companies/${companyId}/jobs/${jobId}`} className="cv-link">求人</Link>
            <span className="text-slate-300"> / </span>
            <span className="font-semibold text-slate-900">出力</span>
          </div>
          <div className="mt-1 truncate text-lg font-semibold text-slate-900">{job.jobTitle || "（職種未設定）"}</div>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/companies/${companyId}/jobs/${jobId}`} className="cv-btn-secondary">← 入力へ</Link>
          <Link href={`/companies/${companyId}/jobs/${jobId}/data`} className="cv-btn-secondary">データ</Link>
        </div>
      </div>

      <section className={panel()}>
        <div className="mb-2 text-xs font-semibold text-slate-600">求人媒体</div>
        <TemplateSelector value={site} options={JOB_SITES} onChange={setSite} />

        <div className="mt-5 space-y-3">
          {outputs.length === 0 ? (
            <div className="rounded-2xl border bg-[var(--surface-muted)] p-4 text-sm text-slate-600" style={{ borderColor: "var(--border)" }}>
              入力すると、ここにコピー用テキストが表示されます
            </div>
          ) : (
            outputs.map((o) => {
              const key = `${site}-${o.label}`;
              const copied = copiedKey === key;
              return (
                <div key={key} className="rounded-2xl border bg-white p-4 text-sm" style={{ borderColor: copied ? "#34d399" : "var(--border)" }}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="text-xs font-semibold text-slate-600">{o.label}</div>
                    <button className="text-xs font-semibold text-slate-700 hover:underline" onClick={() => copy(o.value, key)}>
                      {copied ? "コピー済み" : "コピー"}
                    </button>
                  </div>
                  <div className="whitespace-pre-wrap break-words text-slate-900">{o.value}</div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}
