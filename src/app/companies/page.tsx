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

function inputBase() {
  return [
    "w-full rounded-2xl border bg-white px-4 py-3 text-sm text-slate-900 shadow-sm",
    "placeholder:text-slate-400",
    "focus:outline-none focus:ring-4 focus:ring-[rgba(15,23,42,0.08)]",
    "transition",
  ].join(" ");
}

function chip(active: boolean) {
  return [
    "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
    active
      ? "bg-slate-900 text-white border-slate-900"
      : "bg-white text-slate-700 border-[var(--border)] hover:bg-[var(--surface-hover)]",
  ].join(" ");
}

function emptyState() {
  return (
    <div className="cv-panel p-8">
      <div className="text-sm font-semibold text-slate-900">会社がまだありません</div>
      <div className="mt-2 text-sm text-slate-600">
        最初の会社を登録すると、求人が迷子になりません。
      </div>
      <div className="mt-4">
        <Link href="/companies/new" className="cv-btn-primary">
          + 会社を追加
        </Link>
      </div>
    </div>
  );
}

// --- API Response Types (debug routes) ---
type CompaniesApiResponse =
  | { ok: true; companies: Array<{ id: string; company_name: string; created_at: string; updated_at: string }> }
  | { ok: false; error: { message: string; details?: string | null; hint?: string | null; code?: string | null } };

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

function toCompany(row: { id: string; company_name: string; created_at: string; updated_at: string }): Company {
  // DBは company_name だけなので、既存UIで参照される他の項目は空にします
  return {
    id: row.id,
    companyName: row.company_name,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
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
    jobTitle: row.job_title ?? "",
    employmentType: row.employment_type ?? "",
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  } as Job;
}

export default function CompaniesPage() {
  const [mounted, setMounted] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);

  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("updated_desc");

  const [view, setView] = useState<"cards" | "compact">("cards");

  useEffect(() => {
    setMounted(true);

    (async () => {
      setLoading(true);
      setLoadError(null);

      try {
        const [cRes, jRes] = await Promise.all([
          fetch("/api/debug/companies", { cache: "no-store" }),
          fetch("/api/debug/jobs", { cache: "no-store" }),
        ]);

        const cJson = (await cRes.json()) as CompaniesApiResponse;
        if (!cRes.ok || !("ok" in cJson) || cJson.ok === false) {
          const msg = "ok" in cJson && cJson.ok === false ? cJson.error.message : `companies fetch failed: ${cRes.status}`;
          throw new Error(msg);
        }

        const jJson = (await jRes.json()) as JobsApiResponse;
        if (!jRes.ok || !("ok" in jJson) || jJson.ok === false) {
          const msg = "ok" in jJson && jJson.ok === false ? jJson.error.message : `jobs fetch failed: ${jRes.status}`;
          throw new Error(msg);
        }

        setCompanies((cJson.companies ?? []).map(toCompany));
        setJobs((jJson.jobs ?? []).map(toJob));
      } catch (e) {
        setCompanies([]);
        setJobs([]);
        setLoadError(e instanceof Error ? e.message : "読み込みに失敗しました");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const jobsByCompany = useMemo(() => {
    const m = new Map<string, Job[]>();
    for (const j of jobs) {
      const cid = (j as any).companyId as string | undefined;
      if (!cid) continue;
      const arr = m.get(cid) ?? [];
      arr.push(j);
      m.set(cid, arr);
    }
    // sort each list by updated desc
    for (const [k, arr] of m.entries()) {
      arr.sort((a, b) => String((b as any).updatedAt || "").localeCompare(String((a as any).updatedAt || "")));
      m.set(k, arr);
    }
    return m;
  }, [jobs]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();

    const base = companies.filter((c) => {
      if (!query) return true;
      const name = String((c as any).companyName ?? "").toLowerCase();
      const trade = String((c as any).tradeName ?? "").toLowerCase();
      const phone = String((c as any).phone ?? "").toLowerCase();
      const mail = String((c as any).companyEmail ?? "").toLowerCase();
      const addr = String((c as any).hqAddress ?? "").toLowerCase();
      return (
        name.includes(query) ||
        trade.includes(query) ||
        phone.includes(query) ||
        mail.includes(query) ||
        addr.includes(query)
      );
    });

    const scored = base.map((c) => {
      const count = (jobsByCompany.get((c as any).id) ?? []).length;
      return { c, count };
    });

    scored.sort((a, b) => {
      if (sortKey === "updated_desc") {
        return String((b.c as any).updatedAt || "").localeCompare(String((a.c as any).updatedAt || ""));
      }
      if (sortKey === "name_asc") {
        return String((a.c as any).companyName || "").localeCompare(String((b.c as any).companyName || ""), "ja");
      }
      // jobs_desc
      if (b.count !== a.count) return b.count - a.count;
      return String((b.c as any).updatedAt || "").localeCompare(String((a.c as any).updatedAt || ""));
    });

    return scored;
  }, [companies, q, sortKey, jobsByCompany]);

  if (!mounted) return <div className="h-4" />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="cv-panel p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-slate-900">会社一覧</h1>
            <p className="mt-2 text-sm text-slate-600">
              会社概要と求人をまとめて管理します（会社→求人→出力→データ→分析）
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/" className="cv-btn-secondary">
                Home
              </Link>
              <Link href="/analytics" className="cv-btn-secondary">
                分析
              </Link>
              <Link href="/jobs" className="cv-btn-secondary">
                求人一覧
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

      {/* Status */}
      {loading ? (
        <div className="cv-panel p-6 text-sm text-slate-600">読み込み中…</div>
      ) : loadError ? (
        <div className="cv-panel p-6">
          <div className="text-sm font-semibold text-slate-900">読み込みに失敗しました</div>
          <div className="mt-2 text-sm text-red-600">{loadError}</div>
          <div className="mt-4 text-xs text-slate-500">
            ※ /api/debug/companies と /api/debug/jobs が 200 を返すか確認してください
          </div>
        </div>
      ) : null}

      {/* Controls */}
      <div className="cv-panel p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <div className="min-w-[280px] sm:min-w-[360px]">
              <input
                className={inputBase()}
                style={{ borderColor: "var(--border)" }}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="検索：会社名 / 屋号 / 電話 / メール / 住所"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">並び替え</span>
              <select
                className="rounded-2xl border bg-white px-3 py-2 text-sm shadow-sm"
                style={{ borderColor: "var(--border)" }}
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
              >
                <option value="updated_desc">更新が新しい順</option>
                <option value="name_asc">会社名（あいうえお）</option>
                <option value="jobs_desc">求人が多い順</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">表示</span>
            <button type="button" className={chip(view === "cards")} onClick={() => setView("cards")}>
              カード
            </button>
            <button type="button" className={chip(view === "compact")} onClick={() => setView("compact")}>
              コンパクト
            </button>

            <div className="ml-auto text-xs text-slate-500 lg:ml-4">
              {filtered.length} / {companies.length} 件
            </div>
          </div>
        </div>
      </div>

      {/* List */}
      {companies.length === 0 ? (
        emptyState()
      ) : filtered.length === 0 ? (
        <div className="cv-panel p-8">
          <div className="text-sm font-semibold text-slate-900">該当する会社がありません</div>
          <div className="mt-2 text-sm text-slate-600">検索条件を変えてみてください。</div>
          <div className="mt-4">
            <button type="button" className="cv-btn-secondary" onClick={() => setQ("")}>
              検索をクリア
            </button>
          </div>
        </div>
      ) : view === "compact" ? (
        <div className="cv-panel overflow-hidden">
          <div
            className="grid grid-cols-12 gap-4 border-b px-5 py-3 text-[11px] font-semibold text-slate-500"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="col-span-7">会社</div>
            <div className="col-span-3 text-right">求人</div>
            <div className="col-span-2 text-right">更新</div>
          </div>

          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {filtered.map(({ c, count }) => (
              <div key={(c as any).id} className="px-5 py-4 hover:bg-slate-50/70">
                <div className="grid grid-cols-12 items-center gap-4">
                  <div className="col-span-7 min-w-0">
                    <Link
                      href={`/companies/${(c as any).id}`}
                      className="truncate text-sm font-semibold text-slate-900 hover:text-slate-700"
                    >
                      {(c as any).companyName || "(会社名未設定)"}
                    </Link>
                    <div className="mt-1 truncate text-[12px] text-slate-500">
                      {(c as any).tradeName ? `屋号: ${(c as any).tradeName}` : "—"}{" "}
                      {(c as any).phone ? ` / TEL: ${(c as any).phone}` : ""}{" "}
                      {(c as any).companyEmail ? ` / ${(c as any).companyEmail}` : ""}
                    </div>
                  </div>

                  <div className="col-span-3 text-right">
                    <span
                      className="inline-flex items-center rounded-full border bg-white px-3 py-1 text-[12px] font-semibold text-slate-700"
                      style={{ borderColor: "var(--border)" }}
                    >
                      {count} 件
                    </span>
                  </div>

                  <div className="col-span-2 text-right text-[12px] text-slate-500">
                    {formatLocalDateTime(String((c as any).updatedAt ?? ""))}
                  </div>

                  <div className="col-span-12 flex justify-end gap-2 pt-2">
                    <Link href={`/companies/${(c as any).id}`} className="cv-btn-secondary">
                      開く
                    </Link>
                    <Link href={`/companies/${(c as any).id}/jobs/new`} className="cv-btn-secondary">
                      求人追加
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {filtered.map(({ c, count }) => {
            const recent = (jobsByCompany.get((c as any).id) ?? [])[0] ?? null;

            return (
              <div key={(c as any).id} className="cv-panel p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Link
                      href={`/companies/${(c as any).id}`}
                      className="block truncate text-lg font-semibold text-slate-900 hover:text-slate-700"
                      title="会社ページを開く"
                    >
                      {(c as any).companyName || "(会社名未設定)"}
                    </Link>

                    <div className="mt-2 flex flex-wrap gap-2 text-[12px] text-slate-600">
                      {(c as any).tradeName ? (
                        <span className="rounded-full border bg-white px-3 py-1" style={{ borderColor: "var(--border)" }}>
                          屋号: {(c as any).tradeName}
                        </span>
                      ) : null}

                      <span className="rounded-full border bg-white px-3 py-1" style={{ borderColor: "var(--border)" }}>
                        求人: <span className="tabular-nums font-semibold text-slate-900">{count}</span>
                      </span>

                      <span className="rounded-full border bg-white px-3 py-1" style={{ borderColor: "var(--border)" }}>
                        更新: <span className="tabular-nums">{formatLocalDateTime(String((c as any).updatedAt ?? ""))}</span>
                      </span>
                    </div>

                    <div className="mt-3 text-[12px] text-slate-500">
                      {(c as any).hqAddress ? `本社: ${(c as any).hqAddress}` : "本社住所が未入力です"}
                    </div>

                    <div
                      className="mt-3 rounded-2xl border bg-[var(--surface-muted)] p-4"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <div className="text-[11px] font-semibold text-slate-600">最近の求人</div>
                      {recent ? (
                        <div className="mt-2">
                          <div className="truncate text-sm font-semibold text-slate-900">
                            {(recent as any).jobTitle || "(職種未設定)"}
                          </div>
                          <div className="mt-1 text-[12px] text-slate-500">
                            {(recent as any).employmentType ? (recent as any).employmentType : "—"}{" "}
                            {(recent as any).nearestStation ? ` / 最寄り: ${(recent as any).nearestStation}` : ""}
                          </div>
                          <div className="mt-1 text-[11px] text-slate-400">
                            更新: {formatLocalDateTime(String((recent as any).updatedAt ?? ""))}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 text-sm text-slate-600">求人がまだありません</div>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col gap-2">
                    <Link href={`/companies/${(c as any).id}`} className="cv-btn-secondary">
                      開く
                    </Link>
                    <Link href={`/companies/${(c as any).id}/jobs/new`} className="cv-btn-primary">
                      + 求人追加
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
