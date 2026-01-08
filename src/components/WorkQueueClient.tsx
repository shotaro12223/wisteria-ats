"use client";

import { useEffect, useMemo, useState } from "react";

import type { Company, Job, JobSiteState } from "@/lib/types";
import {
  DEFAULT_FILTERS,
  applyFilters,
  buildWorkQueueRows,
  sortRows,
  type Filters,
  type WorkQueueRow,
  type WorkQueueStatus,
} from "@/lib/workQueue";

import { listCompanies, listJobs, upsertJob } from "@/lib/storage";
import { appendEvent } from "@/lib/events";

/* =========================
 * UI helpers
 * ========================= */

const STATUS_BADGE: Record<WorkQueueStatus, string> = {
  NG: "bg-red-100 text-red-800",
  資料待ち: "bg-orange-100 text-orange-800",
  媒体審査中: "bg-blue-100 text-blue-800",
  停止中: "bg-gray-100 text-gray-800",
};

const ALL_STATUSES: WorkQueueStatus[] = ["NG", "資料待ち", "媒体審査中", "停止中"];

function daysAgoLabel(iso?: string): string {
  if (!iso) return "-";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "-";
  const diff = Date.now() - t;
  const dayMs = 24 * 60 * 60 * 1000;
  const d = Math.max(0, Math.floor(diff / dayMs));
  return `${d}日前`;
}

function staleClass(staleDays: number | null): string {
  if (staleDays == null) return "text-gray-400";
  if (staleDays >= 7) return "text-red-700 font-semibold";
  if (staleDays >= 3) return "text-yellow-700 font-semibold";
  return "text-gray-900";
}

function rpoClass(rpoDays: number | null): string {
  if (rpoDays == null) return "text-gray-400";
  if (rpoDays >= 7) return "text-red-700 font-semibold";
  if (rpoDays >= 3) return "text-yellow-700 font-semibold";
  return "text-gray-900";
}

function chipClass(active: boolean): string {
  return [
    "rounded-full border px-3 py-1 text-xs",
    active ? "bg-gray-900 text-white" : "bg-white text-gray-800 hover:bg-gray-50",
  ].join(" ");
}

/* =========================
 * “この端末で触った行” (localStorage)
 * ========================= */

const MY_TOUCHES_KEY = "wisteria_ats_workqueue_my_touches_v1";
type MyTouches = Record<string, { touchedAt: string }>; // key = `${jobId}:${siteKey}`

function readMyTouches(): MyTouches {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(MY_TOUCHES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as MyTouches;
  } catch {
    return {};
  }
}

function writeMyTouches(next: MyTouches) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MY_TOUCHES_KEY, JSON.stringify(next));
}

function markTouched(jobId: string, siteKey: string, iso: string) {
  const key = `${jobId}:${siteKey}`;
  const cur = readMyTouches();
  writeMyTouches({ ...cur, [key]: { touchedAt: iso } });
}

/* =========================
 * 応募 (localStorage) ※当面ここで保持
 * ========================= */

type LocalApplicant = {
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

function readApplicantsAll(): LocalApplicant[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(APPLICANTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as LocalApplicant[];
  } catch {
    return [];
  }
}

function applicantBadgeClass(n: number): string {
  // 0件は赤で目立たせる運用
  if (n <= 0) return "bg-red-100 text-red-800";
  return "bg-emerald-100 text-emerald-800";
}

/* =========================
 * Component
 * ========================= */

export default function WorkQueueClient() {
  const [loading, setLoading] = useState(true);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [onlyMine, setOnlyMine] = useState(false);

  const [applicants, setApplicants] = useState<LocalApplicant[]>([]);

  // 初回ロード（localStorage）
  useEffect(() => {
    setLoading(true);
    try {
      setJobs(listJobs());
      setCompanies(listCompanies());
      setApplicants(readApplicantsAll());
    } finally {
      setLoading(false);
    }
  }, []);

  const allRows = useMemo<WorkQueueRow[]>(() => {
    return buildWorkQueueRows({ jobs, companies });
  }, [jobs, companies]);

  const siteOptions = useMemo<string[]>(() => {
    const set = new Set<string>();
    for (const r of allRows) set.add(r.siteKey);
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ja"));
  }, [allRows]);

  const baseFilteredRows = useMemo<WorkQueueRow[]>(() => {
    return applyFilters(allRows, filters);
  }, [allRows, filters]);

  const filteredRows = useMemo<WorkQueueRow[]>(() => {
    if (!onlyMine) return baseFilteredRows;
    const touches = readMyTouches();
    return baseFilteredRows.filter((r) => Boolean(touches[`${r.jobId}:${r.siteKey}`]));
  }, [baseFilteredRows, onlyMine]);

  // 応募数 index（jobId:siteKey -> count）
  const applicantCountByRow = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of applicants) {
      const key = `${a.jobId}:${a.siteKey}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [applicants]);

  function getApplicantCount(row: WorkQueueRow): number {
    return applicantCountByRow.get(`${row.jobId}:${row.siteKey}`) ?? 0;
  }

  const summary = useMemo(() => {
    const total = filteredRows.length;
    const ng = filteredRows.filter((r) => r.status === "NG").length;

    const stale7 = filteredRows.filter((r) => r.staleDays != null && r.staleDays >= 7).length;
    const rpo7 = filteredRows.filter((r) => r.rpoTouchedDays != null && r.rpoTouchedDays >= 7).length;

    const noApps = filteredRows.filter((r) => getApplicantCount(r) === 0).length;

    return { total, ng, stale7, rpo7, noApps };
  }, [filteredRows, applicantCountByRow]);

  function updateFilter<K extends keyof Filters>(k: K, v: Filters[K]) {
    setFilters((prev) => ({ ...prev, [k]: v }));
  }

  function resetFilters() {
    setFilters(DEFAULT_FILTERS);
    setOnlyMine(false);
  }

  function persistJob(updatedJob: Job) {
    upsertJob(updatedJob);
  }

  function saveNote(row: WorkQueueRow, note: string) {
    const nowISO = new Date().toISOString();

    setJobs((prev) => {
      const next = prev.map((j) => {
        if (j.id !== row.jobId) return j;

        const siteStatus = j.siteStatus ?? {};
        const cur = siteStatus[row.siteKey];

        const nextState: JobSiteState = {
          status: (cur?.status ?? row.status) as any,
          // 仕様：媒体更新日は「媒体ステータス変更時のみ更新」
          updatedAt: cur?.updatedAt ?? row.mediaUpdatedAtISO,
          note,
          // RPO更新はメモ保存で更新（表示/フィルタ用）
          rpoLastTouchedAt: nowISO,
        };

        const updatedJob: Job = {
          ...j,
          siteStatus: {
            ...siteStatus,
            [row.siteKey]: { ...cur, ...nextState },
          },
        };

        // touch記録（端末基準）
        markTouched(j.id, row.siteKey, nowISO);

        // イベントログ（運用の月次サマリ等）
        appendEvent({
          type: "NOTE_SAVE",
          at: nowISO,
          jobId: j.id,
          siteKey: row.siteKey,
          companyId: j.companyId,
        });

        persistJob(updatedJob);
        return updatedJob;
      });

      return next;
    });
  }

  const tableRows = useMemo(() => sortRows(filteredRows), [filteredRows]);

  // ===== Quick filters =====
  function setQuickStale(threshold: Filters["staleThreshold"]) {
    updateFilter("staleThreshold", threshold);
  }
  function setQuickStatusesAll() {
    updateFilter("statuses", ALL_STATUSES);
  }
  function clearSites() {
    updateFilter("sites", []);
  }
  function toggleRpo7Untouched() {
    updateFilter("rpoThreshold", filters.rpoThreshold === "7PLUS_UNTOUCHED" ? "ALL" : "7PLUS_UNTOUCHED");
  }

  const isAllStale = filters.staleThreshold === "ALL";
  const is3Plus = filters.staleThreshold === "3PLUS";
  const is7Plus = filters.staleThreshold === "7PLUS";

  const hasAllStatuses =
    ALL_STATUSES.every((s) => filters.statuses.includes(s)) &&
    filters.statuses.length === ALL_STATUSES.length;

  const hasNoSiteFilter = filters.sites.length === 0;
  const isRpo7Untouched = filters.rpoThreshold === "7PLUS_UNTOUCHED";

  return (
    <div className="space-y-4">
      {/* Quick Filters */}
      <div className="rounded-xl border bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-2 text-xs font-medium text-gray-700">クイック</div>

          <button type="button" className={chipClass(isAllStale)} onClick={() => setQuickStale("ALL")}>
            滞留: すべて
          </button>
          <button type="button" className={chipClass(is3Plus)} onClick={() => setQuickStale("3PLUS")}>
            滞留: 3日+
          </button>
          <button type="button" className={chipClass(is7Plus)} onClick={() => setQuickStale("7PLUS")}>
            滞留: 7日+
          </button>

          <div className="mx-2 h-4 w-px bg-gray-200" />

          <button type="button" className={chipClass(isRpo7Untouched)} onClick={toggleRpo7Untouched}>
            RPO: 7日触ってない
          </button>

          <div className="mx-2 h-4 w-px bg-gray-200" />

          <button type="button" className={chipClass(hasAllStatuses)} onClick={setQuickStatusesAll}>
            状態: 要対応ALL
          </button>

          <div className="mx-2 h-4 w-px bg-gray-200" />

          <button type="button" className={chipClass(hasNoSiteFilter)} onClick={clearSites}>
            媒体: 全て
          </button>

          <div className="mx-2 h-4 w-px bg-gray-200" />

          <button type="button" className={chipClass(onlyMine)} onClick={() => setOnlyMine((v) => !v)}>
            自分が触った
          </button>

          <div className="ml-auto">
            <button className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50" onClick={resetFilters} type="button">
              リセット
            </button>
          </div>
        </div>

        <div className="mt-2 text-[11px] text-gray-500">
          ※「自分が触った」は“このブラウザで触った履歴”で判定します（ログイン未導入のため）。
        </div>
      </div>

      {/* Filters (Detailed) */}
      <div className="rounded-xl border bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-600">会社名検索</label>
            <input
              className="w-56 rounded-md border px-3 py-2 text-sm"
              placeholder="会社名で検索"
              value={filters.qCompany}
              onChange={(e) => updateFilter("qCompany", e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-600">媒体</label>
            <select
              multiple
              className="h-24 w-48 rounded-md border px-2 py-1 text-sm"
              value={filters.sites}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
                updateFilter("sites", selected);
              }}
            >
              {siteOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-gray-500">複数選択可</p>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-600">状態</label>
            <div className="flex flex-wrap gap-2">
              {ALL_STATUSES.map((s) => {
                const on = filters.statuses.includes(s);
                return (
                  <button
                    key={s}
                    className={`rounded-full border px-3 py-1 text-xs ${on ? "bg-gray-900 text-white" : "bg-white text-gray-800"}`}
                    onClick={() => {
                      const next = on ? filters.statuses.filter((x) => x !== s) : [...filters.statuses, s];
                      updateFilter("statuses", next);
                    }}
                    type="button"
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-600">滞留</label>
            <select
              className="rounded-md border px-2 py-2 text-sm"
              value={filters.staleThreshold}
              onChange={(e) => updateFilter("staleThreshold", e.target.value as Filters["staleThreshold"])}
            >
              <option value="ALL">全て</option>
              <option value="3PLUS">3日以上</option>
              <option value="7PLUS">7日以上</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
        <div className="rounded-xl border bg-white p-3 shadow-sm">
          <div className="text-xs text-gray-600">要対応 件数</div>
          <div className="text-2xl font-semibold">{summary.total}</div>
        </div>
        <div className="rounded-xl border bg-white p-3 shadow-sm">
          <div className="text-xs text-gray-600">7日以上 滞留</div>
          <div className="text-2xl font-semibold">{summary.stale7}</div>
        </div>
        <div className="rounded-xl border bg-white p-3 shadow-sm">
          <div className="text-xs text-gray-600">RPO 7日未タッチ</div>
          <div className="text-2xl font-semibold">{summary.rpo7}</div>
        </div>
        <div className="rounded-xl border bg-white p-3 shadow-sm">
          <div className="text-xs text-gray-600">応募0件</div>
          <div className="text-2xl font-semibold">{summary.noApps}</div>
        </div>
        <div className="rounded-xl border bg-white p-3 shadow-sm">
          <div className="text-xs text-gray-600">NG 件数</div>
          <div className="text-2xl font-semibold">{summary.ng}</div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        {loading ? (
          <div className="p-6 text-sm text-gray-600">読み込み中…</div>
        ) : tableRows.length === 0 ? (
          <div className="p-6 text-sm text-gray-600">条件に合う要対応求人はありません</div>
        ) : (
          <table className="min-w-full border-separate border-spacing-0">
            <thead>
              <tr className="text-left text-xs text-gray-600">
                <th className="sticky top-0 border-b bg-white px-3 py-2">滞留</th>
                <th className="sticky top-0 border-b bg-white px-3 py-2">RPO最終</th>
                <th className="sticky top-0 border-b bg-white px-3 py-2">応募</th>
                <th className="sticky top-0 border-b bg-white px-3 py-2">状態</th>
                <th className="sticky top-0 border-b bg-white px-3 py-2">会社</th>
                <th className="sticky top-0 border-b bg-white px-3 py-2">求人</th>
                <th className="sticky top-0 border-b bg-white px-3 py-2">媒体</th>
                <th className="sticky top-0 border-b bg-white px-3 py-2">次アクション</th>
                <th className="sticky top-0 border-b bg-white px-3 py-2">最終更新</th>
                <th className="sticky top-0 border-b bg-white px-3 py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r) => {
                const appCount = getApplicantCount(r);
                return (
                  <tr key={`${r.jobId}:${r.siteKey}`} className="text-sm">
                    <td className="border-b px-3 py-2">
                      {r.staleDays == null ? <span className="text-gray-400">-</span> : <span className={staleClass(r.staleDays)}>{r.staleDays}日</span>}
                    </td>

                    <td className="border-b px-3 py-2">
                      {r.rpoTouchedDays == null ? <span className="text-gray-400">-</span> : <span className={rpoClass(r.rpoTouchedDays)}>{r.rpoTouchedDays}日</span>}
                    </td>

                    <td className="border-b px-3 py-2">
                      <span className={["inline-flex items-center rounded-full px-2 py-1 text-xs", applicantBadgeClass(appCount)].join(" ")}>
                        {appCount}
                      </span>
                    </td>

                    <td className="border-b px-3 py-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs ${STATUS_BADGE[r.status]}`}>
                        {r.status}
                      </span>
                    </td>

                    <td className="border-b px-3 py-2">
                      {r.companyId ? (
                        <a className="text-blue-700 hover:underline" href={`/companies/${r.companyId}`}>
                          {r.companyName}
                        </a>
                      ) : (
                        <span>{r.companyName}</span>
                      )}
                    </td>

                    <td className="border-b px-3 py-2">
                      {r.companyId ? (
                        <a className="text-blue-700 hover:underline" href={`/companies/${r.companyId}/jobs/${r.jobId}`}>
                          {r.jobTitle}
                        </a>
                      ) : (
                        <span>{r.jobTitle}</span>
                      )}
                    </td>

                    <td className="border-b px-3 py-2">{r.siteKey}</td>

                    <td className="border-b px-3 py-2">
                      <input
                        className="w-80 rounded-md border px-2 py-1 text-sm"
                        defaultValue={r.state.note ?? ""}
                        placeholder="例）12/26までに条件確認を送る"
                        onBlur={(e) => saveNote(r, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                        }}
                      />
                    </td>

                    <td className="border-b px-3 py-2 text-xs text-gray-700">
                      <div>媒体更新：{daysAgoLabel(r.mediaUpdatedAtISO)}</div>
                      {r.rpoLastTouchedAtISO ? <div>RPO更新：{daysAgoLabel(r.rpoLastTouchedAtISO)}</div> : <div className="text-gray-400">RPO更新：-</div>}
                    </td>

                    <td className="border-b px-3 py-2">
                      <div className="flex gap-2">
                        <a className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50" href={r.companyId ? `/companies/${r.companyId}/jobs/${r.jobId}` : `/jobs/${r.jobId}`}>
                          詳細
                        </a>
                        <a className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50" href={r.companyId ? `/companies/${r.companyId}/jobs/${r.jobId}/outputs` : `/jobs/${r.jobId}`}>
                          出力
                        </a>
                        <a className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50" href={r.companyId ? `/companies/${r.companyId}/jobs/${r.jobId}/data` : `/jobs/${r.jobId}`}>
                          データ
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
