"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import type { Job } from "@/lib/types";
import { getJob, upsertJob, deleteJob } from "@/lib/storage";
import { getCompany } from "@/lib/companyStorage";

import { JobForm } from "@/components/JobForm";
import { makeId } from "@/lib/id";
import { JobSiteStatusBar } from "@/components/JobSiteStatusBar";

import ApplicantsSummary from "@/components/ApplicantsSummary";

type SaveStatus = "idle" | "saved";

function formatLocalDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function iconChevron(open: boolean) {
  return (
    <span
      className={[
        "inline-block transition-transform duration-200",
        open ? "rotate-180" : "rotate-0",
      ].join(" ")}
      aria-hidden
    >
      ▼
    </span>
  );
}

export default function CompanyJobDetailPage() {
  const params = useParams<{ companyId: string; jobId: string }>();
  const router = useRouter();

  const companyId = useMemo(() => String(params.companyId), [params.companyId]);
  const jobId = useMemo(() => String(params.jobId), [params.jobId]);

  const company = useMemo(() => getCompany(companyId), [companyId]);

  const [job, setJob] = useState<Job | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const savedTimerRef = useRef<number | null>(null);

  const [openMeta, setOpenMeta] = useState(true);

  useEffect(() => {
    const j = getJob(jobId);

    if (!j) {
      setNotFound(true);
      setJob(null);
      return;
    }

    if (j.companyId && j.companyId !== companyId) {
      setNotFound(true);
      setJob(null);
      return;
    }

    const normalized: Job = {
      ...j,
      companyId: j.companyId ?? companyId,
      companyName: j.companyName || company?.companyName || "",
    };

    setNotFound(false);
    setJob(normalized);
    setSaveStatus("idle");
  }, [jobId, companyId, company]);

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

  function handleSave() {
    if (!job) return;

    if (String(job.jobTitle || "").trim().length === 0) {
      alert("職種を入力してください。");
      return;
    }

    const now = new Date().toISOString();

    const toSave: Job = {
      ...job,
      companyId,
      companyName: job.companyName || company?.companyName || "",
      createdAt: job.createdAt || now,
      updatedAt: now,
    };

    upsertJob(toSave);
    setJob(toSave);
    showSavedOnce();
  }

  function handleDelete() {
    if (!job) return;

    const ok = confirm("この求人を削除しますか？（元に戻せません）");
    if (!ok) return;

    deleteJob(job.id);
    router.push(`/companies/${companyId}`);
  }

  function handleClone() {
    if (!job) return;

    const defaultTitle = job.jobTitle ? `${job.jobTitle}（複製）` : "（複製）";
    const nextTitle = window.prompt("複製後の職種名（任意で変更）", defaultTitle);
    if (nextTitle === null) return;

    const now = new Date().toISOString();
    const newJobId = makeId();

    const cloned: Job = {
      ...job,
      id: newJobId,
      jobTitle: nextTitle.trim() ? nextTitle.trim() : defaultTitle,
      companyId,
      companyName: job.companyName || company?.companyName || "",
      createdAt: now,
      updatedAt: now,
    };

    upsertJob(cloned);
    router.push(`/companies/${companyId}/jobs/${newJobId}`);
  }

  function handleJobChange(next: Job) {
    setJob(next);
    if (saveStatus === "saved") setSaveStatus("idle");
  }

  // 媒体ステータス更新（上部バーから即保存）
  function handleSiteStatusUpdate(next: Job) {
    if (!job) return;

    const now = new Date().toISOString();

    const toSave: Job = {
      ...next,
      companyId,
      companyName: next.companyName || company?.companyName || "",
      createdAt: next.createdAt || now,
      updatedAt: now,
    };

    upsertJob(toSave);
    setJob(toSave);
    showSavedOnce();
  }

  if (!company) {
    return (
      <main className="space-y-6">
        <div className="cv-panel p-8">
          <h1 className="text-lg font-semibold text-slate-900">会社が見つかりません</h1>

          <div className="mt-5">
            <Link href="/companies" className="cv-btn-secondary">
              ← 会社一覧に戻る
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="space-y-6">
        <div className="cv-panel p-8">
          <h1 className="text-lg font-semibold text-slate-900">求人が見つかりません</h1>
          <p className="mt-2 text-sm text-slate-600">
            URLが間違っているか、別会社の求人の可能性があります。
          </p>

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
              <span className="truncate font-semibold text-slate-900">
                {job.jobTitle || "求人詳細"}
              </span>
            </div>
            <div className="mt-1 text-xs text-slate-500">
              編集して保存、または出力・データへ進みます
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
              {saveStatus === "saved" ? <span className="cv-badge">保存済み</span> : null}

              <span
                className="rounded-full border bg-white px-3 py-1"
                style={{ borderColor: "var(--border)" }}
              >
                JobID: <span className="font-medium text-slate-700">{jobId}</span>
              </span>

              <span
                className="rounded-full border bg-white px-3 py-1"
                style={{ borderColor: "var(--border)" }}
              >
                更新:{" "}
                <span className="font-medium text-slate-700">
                  {formatLocalDateTime(job.updatedAt)}
                </span>
              </span>

              <Link href="/" className="cv-link">
                Home
              </Link>

              <Link href="/analytics" className="cv-link">
                分析
              </Link>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Link
              href={`/companies/${companyId}/jobs/${jobId}/outputs`}
              className="cv-btn-secondary"
              title="媒体別の出力ページを開きます"
            >
              出力へ
            </Link>

            <Link
              href={`/companies/${companyId}/jobs/${jobId}/data`}
              className="cv-btn-secondary"
              title="応募者データ入力ページを開きます"
            >
              データ
            </Link>

            <button
              type="button"
              className="cv-btn-secondary"
              onClick={handleClone}
              title="この求人を複製して新規作成します"
            >
              複製
            </button>

            <button type="button" className="cv-btn-secondary" onClick={handleDelete}>
              削除
            </button>

            <button type="button" className="cv-btn-primary" onClick={handleSave}>
              保存
            </button>
          </div>
        </div>

        {/* Status bar */}
        <div className="mt-4">
          <JobSiteStatusBar job={job} onUpdate={handleSiteStatusUpdate} />
        </div>
      </div>

      {/* Breadcrumb back */}
      <div className="cv-panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href={`/companies/${companyId}`} className="cv-link text-sm">
            ← 会社マイページに戻る
          </Link>

          <div className="text-[11px] text-slate-500">
            迷ったら：入力 → 出力 → データ → 分析
          </div>
        </div>
      </div>

      {/* Meta / summary card */}
      <section className="cv-panel overflow-hidden">
        <div className="border-b px-5 py-4" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900">概要</div>
              <div className="mt-1 text-[12px] text-slate-500">
                いまの状況（応募・導線）をここで確認できます
              </div>
            </div>

            <button
              type="button"
              className="cv-btn-secondary"
              onClick={() => setOpenMeta((v) => !v)}
              aria-expanded={openMeta}
            >
              {openMeta ? (
                <>
                  {iconChevron(true)} 閉じる
                </>
              ) : (
                <>
                  {iconChevron(false)} 開く
                </>
              )}
            </button>
          </div>
        </div>

        {openMeta ? (
          <div className="px-5 py-5 space-y-4">
            {/* applicants summary (existing component) */}
            <div className="cv-panel p-5">
              <ApplicantsSummary companyId={companyId} jobId={jobId} />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border bg-white p-4" style={{ borderColor: "var(--border)" }}>
                <div className="text-xs text-slate-600">会社</div>
                <div className="mt-1 truncate text-sm font-semibold text-slate-900">
                  {company.companyName || "(会社名未設定)"}
                </div>
              </div>

              <div className="rounded-2xl border bg-white p-4" style={{ borderColor: "var(--border)" }}>
                <div className="text-xs text-slate-600">職種</div>
                <div className="mt-1 truncate text-sm font-semibold text-slate-900">
                  {job.jobTitle || "(職種未設定)"}
                </div>
              </div>

              <div className="rounded-2xl border bg-white p-4" style={{ borderColor: "var(--border)" }}>
                <div className="text-xs text-slate-600">次にやること</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  出力 or データ
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  応募を入れると分析が育ちます
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/companies/${companyId}/jobs/${jobId}/outputs`}
                className="cv-btn-secondary"
              >
                出力へ
              </Link>
              <Link
                href={`/companies/${companyId}/jobs/${jobId}/data`}
                className="cv-btn-secondary"
              >
                データ
              </Link>
              <Link href={`/companies/${companyId}`} className="cv-btn-secondary">
                会社へ
              </Link>
            </div>
          </div>
        ) : (
          <div
            className="px-5 py-5 text-sm text-slate-700"
            style={{ background: "var(--surface-muted)" }}
          >
            概要は閉じています。必要なときだけ開いてください。
          </div>
        )}
      </section>

      {/* Form card */}
      <section className="cv-panel p-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900">求人情報</div>
            <div className="mt-1 text-xs text-slate-500">
              変更したら保存。媒体ステータスは上のバーで即反映。
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button type="button" className="cv-btn-secondary" onClick={handleClone}>
              複製
            </button>
            <button type="button" className="cv-btn-primary" onClick={handleSave}>
              保存
            </button>
          </div>
        </div>

        <JobForm job={job} onChange={handleJobChange} />
      </section>

      {/* Bottom action bar */}
      <div
        className="sticky bottom-0 z-20 rounded-2xl border bg-white/85 p-4 backdrop-blur"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="text-xs text-slate-500">職種が未入力の場合は保存できません（必須）</div>

          <div className="flex items-center gap-2">
            <Link href={`/companies/${companyId}/jobs/${jobId}/outputs`} className="cv-btn-secondary">
              出力へ
            </Link>

            <Link href={`/companies/${companyId}/jobs/${jobId}/data`} className="cv-btn-secondary">
              データ
            </Link>

            <button type="button" className="cv-btn-secondary" onClick={handleClone}>
              複製
            </button>

            <button type="button" className="cv-btn-primary" onClick={handleSave}>
              保存
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
