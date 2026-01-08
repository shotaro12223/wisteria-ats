"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";

import type { Company, Job } from "@/lib/types";
import { CompanyForm } from "@/components/CompanyForm";
import { JobsTable } from "@/components/JobsTable";

type SaveStatus = "idle" | "saved" | "saving" | "error";

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

function formatLocalDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

type CompanyRow = {
  id: string;
  company_name: string;
  created_at: string;
  updated_at: string;
};

type CompanyGetRes =
  | { ok: true; company: CompanyRow | null }
  | { ok: false; error: { message: string } };

type CompanyPatchRes =
  | { ok: true; company: CompanyRow }
  | { ok: false; error: { message: string } };

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

function rowToCompany(r: CompanyRow): Company {
  return {
    id: r.id,
    companyName: r.company_name,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  } as any;
}

export default function CompanyMyPage() {
  const params = useParams();

  const companyId = useMemo(() => {
    const raw = (params as any)?.companyId;
    if (raw === undefined || raw === null) return "";
    return String(raw);
  }, [params]);

  const [company, setCompany] = useState<Company | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [migratedCount] = useState(0); // Supabase運用なので常に0
  const [openCompanyForm, setOpenCompanyForm] = useState(false);

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const savedTimerRef = useRef<number | null>(null);

  const [jobs, setJobs] = useState<Job[]>([]);

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

  async function loadCompanyAndJobs(cid: string) {
    setErrorMessage("");

    // 会社
    const cRes = await fetch(`/api/companies/${encodeURIComponent(cid)}`, {
      cache: "no-store",
    });
    const cJson = (await cRes.json()) as CompanyGetRes;

    if (!cRes.ok || !cJson.ok) {
      setCompany(null);
      setNotFound(false);
      setErrorMessage(
        !cJson.ok
          ? cJson.error.message
          : `会社取得に失敗しました (status: ${cRes.status})`
      );
      return;
    }

    if (cJson.company === null) {
      setNotFound(true);
      setCompany(null);
      return;
    }

    setNotFound(false);
    setCompany(rowToCompany(cJson.company));
    setOpenCompanyForm(false);
    setSaveStatus("idle");

    // 求人
    const jRes = await fetch(
      `/api/jobs?companyId=${encodeURIComponent(cid)}`,
      { cache: "no-store" }
    );
    const jJson = (await jRes.json()) as JobsGetRes;

    if (!jRes.ok || !jJson.ok) {
      setJobs([]);
      return;
    }

    const nextJobs: Job[] = (jJson.jobs ?? []).map((r) => {
      return {
        id: r.id,
        companyId: r.company_id ?? cid,
        jobTitle: r.job_title ?? "",
        employmentType: r.employment_type ?? "",
        siteStatus: r.site_status ?? null,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      } as any;
    });

    setJobs(nextJobs);
  }

  // ✅ companyId が確定したら1回だけ読み込む（ループ防止）
  useEffect(() => {
    if (!companyId) return;
    void loadCompanyAndJobs(companyId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  async function handleSave(next: Company) {
    if (!companyId) return;

    setSaveStatus("saving");
    setErrorMessage("");

    try {
      const companyName = String((next as any).companyName ?? "").trim();
      if (!companyName) {
        throw new Error("会社名が未入力です");
      }

      const res = await fetch(`/api/companies/${encodeURIComponent(companyId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ companyName }),
      });

      const json = (await res.json()) as CompanyPatchRes;

      if (!res.ok || !json.ok) {
        const msg = !json.ok
          ? json.error.message
          : `保存に失敗しました (status: ${res.status})`;
        throw new Error(msg);
      }

      setCompany(rowToCompany(json.company));
      showSavedOnce();

      // ✅ 保存後に最新を再取得（jobsも含めて整合）
      void loadCompanyAndJobs(companyId);
    } catch (e) {
      setSaveStatus("error");
      setErrorMessage(e instanceof Error ? e.message : "保存に失敗しました");
    }
  }

  function handleJobsChanged() {
    if (!companyId) return;
    // ✅ 削除後などはここで再取得
    void loadCompanyAndJobs(companyId);
  }

  if (!companyId) {
    return (
      <main className="space-y-6">
        <div className="cv-panel p-6 text-sm text-slate-600">読み込み中...</div>
      </main>
    );
  }

  if (notFound) {
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

  if (!company) {
    return (
      <main className="space-y-6">
        <div className="cv-panel p-6 text-sm text-slate-600">
          読み込み中...
          {errorMessage ? (
            <div className="mt-2 text-xs text-red-600">{errorMessage}</div>
          ) : null}
        </div>
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
              <span className="truncate font-semibold text-slate-900">
                {(company as any).companyName || "会社マイページ"}
              </span>
            </div>
            <div className="mt-1 text-xs text-slate-500">
              求人を作成・編集・出力し、応募データを入れて分析します
            </div>

            {saveStatus === "error" ? (
              <div className="mt-2 text-xs text-red-600">保存エラー: {errorMessage}</div>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {saveStatus === "saved" ? <span className="cv-badge">保存済み</span> : null}
            {saveStatus === "saving" ? <span className="cv-badge">保存中…</span> : null}
            <Link href={`/companies/${companyId}/jobs/new`} className="cv-btn-primary">
              + 求人を追加
            </Link>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
          <span className="rounded-full border bg-white px-3 py-1" style={{ borderColor: "var(--border)" }}>
            CompanyID: <span className="font-medium text-slate-700">{companyId}</span>
          </span>
          <span className="rounded-full border bg-white px-3 py-1" style={{ borderColor: "var(--border)" }}>
            更新:{" "}
            <span className="font-medium text-slate-700">
              {formatLocalDateTime(String((company as any).updatedAt ?? ""))}
            </span>
          </span>
          <Link href="/" className="cv-link">
            Home
          </Link>
        </div>
      </div>

      {migratedCount > 0 ? (
        <div className="cv-panel p-5 text-sm text-slate-700">
          既存求人の自動移行を行いました：
          <span className="mx-1 font-semibold tabular-nums">{migratedCount}</span>
          件（会社名一致で紐付け）
        </div>
      ) : null}

      <section className="cv-panel overflow-hidden">
        <div className="border-b px-5 py-4" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900">会社概要</div>
              <div className="mt-1 text-[12px] text-slate-500">
                通常は閉じています。編集が必要なときだけ開いてください。
              </div>
            </div>

            <button
              type="button"
              className="cv-btn-secondary"
              onClick={() => setOpenCompanyForm((v) => !v)}
              aria-expanded={openCompanyForm}
            >
              {openCompanyForm ? (
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

        <div className="px-5 py-5">
          {openCompanyForm ? (
            <div className="cv-panel p-6">
              <CompanyForm initialValue={company} submitLabel="保存" onSubmit={handleSave} />
              <div className="mt-3 text-[11px] text-slate-500">
                ※ 現在のSupabase `companies` テーブルは `company_name` のみ保存します（他項目は後で拡張）。
              </div>
            </div>
          ) : (
            <div
              className="rounded-2xl border bg-[var(--surface-muted)] p-5 text-sm text-slate-700"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="text-[11px] font-semibold text-slate-600">メモ</div>
              <div className="mt-2">
                編集が必要なときだけ「開く」を押してください。普段はこのままでOKです。
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className="cv-btn-primary" onClick={() => setOpenCompanyForm(true)}>
                  今すぐ編集する
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="cv-panel overflow-hidden">
        <div className="border-b px-5 py-4" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900">求人一覧</div>
              <div className="mt-1 text-[12px] text-slate-500">
                「開く」で編集、「出力」で媒体別コピペ、「データ」で応募を追加できます。
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Link href={`/companies/${companyId}/jobs/new`} className="cv-btn-secondary">
                + 求人を追加
              </Link>
            </div>
          </div>
        </div>

        <div className="px-5 py-5">
          <JobsTable companyId={companyId} jobs={jobs} onDeleted={handleJobsChanged} />
        </div>
      </section>
    </main>
  );
}
