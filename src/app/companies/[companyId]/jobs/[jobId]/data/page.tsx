"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { SITE_TEMPLATES } from "@/lib/templates";
import { listCompanies, listJobs } from "@/lib/storage";
import type { Company, Job } from "@/lib/types";
import EmptyState from "@/components/EmptyState";
import DatePicker from "@/components/DatePicker";

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

function nowIso() {
  return new Date().toISOString();
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function getTemplateSites(): string[] {
  const sites = uniq((SITE_TEMPLATES ?? []).map((t) => String((t as any)?.site ?? ""))).filter(Boolean);
  return sites.sort((a, b) => a.localeCompare(b, "ja"));
}

function safeLocalDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function randomId() {
  // ブラウザの randomUUID があればそれを使う（依存無しで安全）
  try {
    // @ts-ignore
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {}
  return `app_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
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

function writeApplicantsAll(next: Applicant[]) {
  window.localStorage.setItem(APPLICANTS_KEY, JSON.stringify(next));
}

function inputBase() {
  return [
    "w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm",
    "focus:outline-none",
  ].join(" ");
}

function labelBase() {
  return "text-xs font-semibold text-slate-700";
}

function helpBase() {
  return "mt-1 text-[11px] text-slate-500";
}

function statusLabel(s: Applicant["status"]) {
  switch (s) {
    case "NEW":
      return "新規";
    case "DOC":
      return "書類";
    case "INT":
      return "面接";
    case "OFFER":
      return "内定";
    case "NG":
      return "NG";
  }
}

function statusTone(s: Applicant["status"]) {
  // Stripeっぽく淡い色（強すぎない）
  switch (s) {
    case "OFFER":
      return "bg-[rgba(16,185,129,0.14)] border-[rgba(16,185,129,0.24)] text-[rgba(6,95,70,0.95)]";
    case "INT":
      return "bg-[rgba(59,130,246,0.10)] border-[rgba(59,130,246,0.20)] text-[rgba(30,64,175,0.95)]";
    case "DOC":
      return "bg-[rgba(234,179,8,0.12)] border-[rgba(234,179,8,0.22)] text-[rgba(113,63,18,0.95)]";
    case "NG":
      return "bg-[rgba(239,68,68,0.10)] border-[rgba(239,68,68,0.20)] text-[rgba(153,27,27,0.95)]";
    default:
      return "bg-[rgba(15,23,42,0.06)] border-[rgba(15,23,42,0.10)] text-[rgba(15,23,42,0.82)]";
  }
}

function statusPillClass(s: Applicant["status"]) {
  return [
    "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
    statusTone(s),
  ].join(" ");
}

export default function JobApplicantsDataPage() {
  const params = useParams<{ companyId: string; jobId: string }>();
  const companyId = String(params.companyId || "");
  const jobId = String(params.jobId || "");

  const [mounted, setMounted] = useState(false);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [appsAll, setAppsAll] = useState<Applicant[]>([]);

  // UI state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<Applicant["status"] | "ALL">("ALL");

  // form state
  const sites = useMemo(() => getTemplateSites(), []);
  const [appliedAt, setAppliedAt] = useState<string>("");
  const [siteKey, setSiteKey] = useState<string>(sites[0] ?? "");
  const [name, setName] = useState<string>("");
  const [status, setStatus] = useState<Applicant["status"]>("NEW");
  const [note, setNote] = useState<string>("");

  useEffect(() => {
    setMounted(true);
    setCompanies(listCompanies());
    setJobs(listJobs());

    const all = readApplicantsAll();
    setAppsAll(all);

    // default appliedAt = today
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    setAppliedAt(`${y}-${m}-${dd}`);

    // default siteKey
    setSiteKey((prev) => prev || sites[0] || "");
  }, [sites]);

  const company = useMemo(
    () => companies.find((c) => c.id === companyId) ?? null,
    [companies, companyId]
  );

  const job = useMemo(() => jobs.find((j) => j.id === jobId) ?? null, [jobs, jobId]);

  const appsForJob = useMemo(() => {
    const base = appsAll.filter((a) => a.companyId === companyId && a.jobId === jobId);
    const filtered = filterStatus === "ALL" ? base : base.filter((a) => a.status === filterStatus);
    return filtered.slice().sort((a, b) => (b.appliedAt || "").localeCompare(a.appliedAt || "") || b.updatedAt.localeCompare(a.updatedAt));
  }, [appsAll, companyId, jobId, filterStatus]);

  const totals = useMemo(() => {
    const base = appsAll.filter((a) => a.companyId === companyId && a.jobId === jobId);
    const by: Record<Applicant["status"], number> = { NEW: 0, DOC: 0, INT: 0, OFFER: 0, NG: 0 };
    for (const a of base) by[a.status] += 1;
    return {
      total: base.length,
      by,
    };
  }, [appsAll, companyId, jobId]);

  function resetForm() {
    setEditingId(null);
    setName("");
    setStatus("NEW");
    setNote("");
    setSiteKey(sites[0] ?? "");
    // appliedAt は残す（連続入力が楽）
  }

  function startEdit(a: Applicant) {
    setEditingId(a.id);
    setAppliedAt(a.appliedAt || "");
    setSiteKey(a.siteKey || "");
    setName(a.name || "");
    setStatus(a.status);
    setNote(a.note || "");
  }

  function saveAll(next: Applicant[]) {
    setAppsAll(next);
    writeApplicantsAll(next);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const cleanedName = name.trim();
    const cleanedSite = siteKey.trim();

    if (!appliedAt) {
      alert("応募日（YYYY-MM-DD）を入力してください。");
      return;
    }
    if (!cleanedName) {
      alert("氏名（または識別名）を入力してください。");
      return;
    }
    if (!cleanedSite) {
      alert("媒体を選択してください。");
      return;
    }

    const now = nowIso();

    if (editingId) {
      const next = appsAll.map((a) => {
        if (a.id !== editingId) return a;
        return {
          ...a,
          appliedAt,
          siteKey: cleanedSite,
          name: cleanedName,
          status,
          note: note.trim() || undefined,
          updatedAt: now,
        };
      });
      saveAll(next);
      resetForm();
      return;
    }

    const newItem: Applicant = {
      id: randomId(),
      companyId,
      jobId,
      appliedAt,
      siteKey: cleanedSite,
      name: cleanedName,
      status,
      note: note.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };

    saveAll([newItem, ...appsAll]);
    resetForm();
  }

  function handleDelete(id: string) {
    const ok = confirm("この応募データを削除しますか？（元に戻せません）");
    if (!ok) return;
    const next = appsAll.filter((a) => a.id !== id);
    saveAll(next);
    if (editingId === id) resetForm();
  }

  if (!mounted) return <main className="cv-container py-8" />;

  const companyName = company?.companyName || job?.companyName || "(会社名未設定)";
  const jobTitle = job?.jobTitle || "(職種名未設定)";

  return (
    <main className="cv-container py-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="text-sm text-slate-500">
            <Link href="/companies" className="cv-link">会社一覧</Link>
            <span className="mx-2 text-slate-300">/</span>
            <Link href={`/companies/${companyId}`} className="cv-link">
              {companyName}
            </Link>
            <span className="mx-2 text-slate-300">/</span>
            <Link href={`/companies/${companyId}/jobs/${jobId}`} className="cv-link">
              {jobTitle}
            </Link>
          </div>

          <h1 className="cv-page-title mt-2">応募者データ</h1>
          <p className="cv-page-subtitle">
            ここで入力したデータが「分析（媒体別応募状況）」に反映されます（localStorage: {APPLICANTS_KEY}）。
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="cv-badge">合計: <span className="tabular-nums">{totals.total}</span></span>
            <span className="cv-badge">新規: <span className="tabular-nums">{totals.by.NEW}</span></span>
            <span className="cv-badge">書類: <span className="tabular-nums">{totals.by.DOC}</span></span>
            <span className="cv-badge">面接: <span className="tabular-nums">{totals.by.INT}</span></span>
            <span className="cv-badge">内定: <span className="tabular-nums">{totals.by.OFFER}</span></span>
            <span className="cv-badge">NG: <span className="tabular-nums">{totals.by.NG}</span></span>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Link href={`/companies/${companyId}/jobs/${jobId}`} className="cv-btn cv-btn-secondary">
            求人に戻る
          </Link>
          <Link href={`/companies/${companyId}/jobs/${jobId}/outputs`} className="cv-btn cv-btn-secondary">
            出力
          </Link>
          <Link href="/analytics" className="cv-btn cv-btn-secondary">
            分析
          </Link>
        </div>
      </div>

      {/* Form */}
      <section className="mt-6 cv-panel p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900">
              {editingId ? "応募データを編集" : "応募データを追加"}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              最小入力：応募日 / 媒体 / 氏名（または識別名） / ステータス
            </div>
          </div>

          <div className="flex shrink-0 gap-2">
            {editingId ? (
              <button type="button" className="cv-btn cv-btn-secondary" onClick={resetForm}>
                編集をやめる
              </button>
            ) : null}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <div className={labelBase()}>応募日</div>
            <DatePicker
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={appliedAt}
              onChange={setAppliedAt}
            />
            <div className={helpBase()}>分析では YYYY-MM で集計します。</div>
          </div>

          <div>
            <div className={labelBase()}>媒体</div>
            {sites.length > 0 ? (
              <select
                className={inputBase()}
                style={{ borderColor: "var(--border)" }}
                value={siteKey}
                onChange={(e) => setSiteKey(e.target.value)}
              >
                {sites.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className={inputBase()}
                style={{ borderColor: "var(--border)" }}
                value={siteKey}
                onChange={(e) => setSiteKey(e.target.value)}
                placeholder="例）Indeed"
              />
            )}
            <div className={helpBase()}>
              テンプレの媒体が無い場合は手入力でOK（分析に反映されます）。
            </div>
          </div>

          <div>
            <div className={labelBase()}>氏名（または識別名）</div>
            <input
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例）山田 太郎"
            />
          </div>

          <div>
            <div className={labelBase()}>ステータス</div>
            <select
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={status}
              onChange={(e) => setStatus(e.target.value as Applicant["status"])}
            >
              <option value="NEW">新規</option>
              <option value="DOC">書類</option>
              <option value="INT">面接</option>
              <option value="OFFER">内定</option>
              <option value="NG">NG</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <div className={labelBase()}>メモ（任意）</div>
            <textarea
              className={[inputBase(), "min-h-[90px] resize-y"].join(" ")}
              style={{ borderColor: "var(--border)" }}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="例）面接日程調整中 / 連絡済み など"
            />
          </div>

          <div className="sm:col-span-2 flex items-center justify-end gap-2">
            <button type="submit" className="cv-btn cv-btn-primary">
              {editingId ? "更新" : "追加"}
            </button>
            {editingId ? (
              <button type="button" className="cv-btn cv-btn-secondary" onClick={resetForm}>
                キャンセル
              </button>
            ) : null}
          </div>
        </form>
      </section>

      {/* List */}
      <section className="mt-6 cv-panel overflow-hidden">
        <div className="border-b px-5 py-4" style={{ borderColor: "var(--border)" }}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900">応募一覧</div>
              <div className="mt-1 text-xs text-slate-500">
                この求人に紐づくデータ（編集/削除可）
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="text-xs text-slate-600">フィルタ</div>
              <select
                className="rounded-full border bg-white px-3 py-2 text-xs font-semibold text-slate-900 shadow-sm focus:outline-none"
                style={{ borderColor: "var(--border)" }}
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
              >
                <option value="ALL">すべて</option>
                <option value="NEW">新規</option>
                <option value="DOC">書類</option>
                <option value="INT">面接</option>
                <option value="OFFER">内定</option>
                <option value="NG">NG</option>
              </select>

              <button
                type="button"
                className="cv-btn cv-btn-secondary"
                onClick={() => {
                  // データ再読込（他タブで変更した場合など）
                  setAppsAll(readApplicantsAll());
                }}
              >
                再読込
              </button>
            </div>
          </div>
        </div>

        {appsForJob.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="この条件の応募データがありません"
              description="上のフォームから応募を追加すると、分析にも反映されます。"
              actions={[
                { label: "分析を見る", href: "/analytics", variant: "secondary" },
              ]}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="cv-table">
              <thead>
                <tr>
                  <th>応募日</th>
                  <th>媒体</th>
                  <th>氏名</th>
                  <th>ステータス</th>
                  <th>更新</th>
                  <th className="text-right">操作</th>
                </tr>
              </thead>

              <tbody>
                {appsForJob.map((a) => (
                  <tr key={a.id}>
                    <td className="text-slate-700 tabular-nums">{a.appliedAt || "-"}</td>
                    <td className="text-slate-700">{a.siteKey || "-"}</td>
                    <td>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900">{a.name}</div>
                        {a.note ? (
                          <div className="mt-1 line-clamp-2 text-xs text-slate-500">{a.note}</div>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <span className={statusPillClass(a.status)} title={statusLabel(a.status)}>
                        {statusLabel(a.status)}
                      </span>
                    </td>
                    <td className="text-slate-700">{safeLocalDateTime(a.updatedAt)}</td>
                    <td className="text-right">
                      <div className="inline-flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          className="cv-btn cv-btn-secondary"
                          onClick={() => startEdit(a)}
                        >
                          編集
                        </button>
                        <button
                          type="button"
                          className="cv-btn cv-btn-ghost"
                          onClick={() => handleDelete(a.id)}
                        >
                          削除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="px-5 py-3 text-[11px] text-slate-500">
              ※ 入力は localStorage に保存されます。ブラウザを変えるとデータは引き継がれません（必要なら後でエクスポート機能を追加できます）。
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
