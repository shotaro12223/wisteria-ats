"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import type { Job } from "@/lib/types";
import { newJobSkeleton, upsertJob } from "@/lib/storage";
import { getCompany } from "@/lib/companyStorage";
import { JobForm } from "@/components/JobForm";

export default function NewJobUnderCompanyPage() {
  const params = useParams<{ companyId: string }>();
  const router = useRouter();

  const companyId = useMemo(() => String(params.companyId), [params.companyId]);
  const company = useMemo(() => getCompany(companyId), [companyId]);

  const [job, setJob] = useState<Job | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved">("idle");

  useEffect(() => {
    if (!company) return;

    const j = newJobSkeleton();
    j.companyId = companyId;
    j.companyName = company.companyName;

    setJob(j);
  }, [companyId, company]);

  function handleSave() {
    if (!job || !company) return;

    if (String(job.jobTitle || "").trim().length === 0) {
      alert("職種を入力してください。");
      return;
    }

    const now = new Date().toISOString();

    const toSave: Job = {
      ...job,
      companyId,
      companyName: job.companyName || company.companyName,
      createdAt: job.createdAt || now,
      updatedAt: now,
    };

    upsertJob(toSave);
    setSaveStatus("saved");
    router.push(`/companies/${companyId}/jobs/${toSave.id}`);
  }

  if (!company) {
    return (
      <main className="space-y-6">
        <div className="cv-panel p-8">
          <h1 className="text-lg font-semibold text-slate-900">会社が見つかりません</h1>
          <p className="mt-2 text-sm text-slate-600">会社一覧から選び直してください。</p>

          <div className="mt-5">
            <Link href="/companies" className="cv-btn-secondary">
              ← 会社一覧に戻る
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
      {/* Unified sticky header */}
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
                {company.companyName || "会社"}
              </Link>
              <span className="text-slate-300">/</span>
              <span className="truncate font-semibold text-slate-900">求人を追加</span>
            </div>

            <div className="mt-1 text-xs text-slate-500">
              必須：職種（未入力だと作成できません）
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
              {saveStatus === "saved" ? <span className="cv-badge">保存済み</span> : null}

              <span
                className="rounded-full border bg-white px-3 py-1"
                style={{ borderColor: "var(--border)" }}
              >
                CompanyID: <span className="font-medium text-slate-700">{companyId}</span>
              </span>

              <Link href="/" className="cv-link">
                Home
              </Link>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button type="button" className="cv-btn-secondary" onClick={() => router.back()}>
              戻る
            </button>
            <button type="button" className="cv-btn-primary" onClick={handleSave}>
              保存して作成
            </button>
          </div>
        </div>
      </div>

      {/* Breadcrumb back */}
      <div className="cv-panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href={`/companies/${companyId}`} className="cv-link text-sm">
            ← 会社マイページに戻る
          </Link>

          <div className="text-[11px] text-slate-500">
            迷ったら：会社 → 求人 → 出力 → データ → 分析
          </div>
        </div>
      </div>

      {/* Form card */}
      <div className="cv-panel p-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900">求人情報</div>
            <div className="mt-1 text-xs text-slate-500">
              入力して保存すると、求人詳細ページへ移動します
            </div>
          </div>

          <button type="button" className="cv-btn-primary" onClick={handleSave}>
            保存して作成
          </button>
        </div>

        {/* NOTE: JobForm API = job / onChange */}
        <JobForm job={job} onChange={setJob} />
      </div>

      {/* Bottom action bar */}
      <div
        className="sticky bottom-0 z-20 rounded-2xl border bg-white/85 p-4 backdrop-blur"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="text-xs text-slate-500">
            職種が未入力の場合は作成できません（必須）
          </div>

          <div className="flex items-center gap-2">
            <button type="button" className="cv-btn-secondary" onClick={() => router.back()}>
              戻る
            </button>
            <button type="button" className="cv-btn-primary" onClick={handleSave}>
              保存して作成
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
