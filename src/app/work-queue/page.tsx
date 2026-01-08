"use client";

import Link from "next/link";
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

const STATUS_BADGE: Record<WorkQueueStatus, { cls: string; dot: string }> = {
  NG: { cls: "bg-rose-100 text-rose-900 border-rose-200", dot: "bg-rose-500" },
  資料待ち: { cls: "bg-amber-100 text-amber-900 border-amber-200", dot: "bg-amber-500" },
  媒体審査中: { cls: "bg-indigo-100 text-indigo-900 border-indigo-200", dot: "bg-indigo-500" },
  停止中: { cls: "bg-slate-100 text-slate-700 border-slate-200", dot: "bg-slate-400" },
};

const ALL_STATUSES: WorkQueueStatus[] = ["NG", "資料待ち", "媒体審査中", "停止中"];

// ★「この端末で触った行」記録
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
  const next: MyTouches = { ...cur, [key]: { touchedAt: iso } };
  writeMyTouches(next);
}

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
  if (staleDays == null) return "text-slate-400";
  if (staleDays >= 7) return "text-rose-700 font-semibold";
  if (staleDays >= 3) return "text-amber-700 font-semibold";
  return "text-slate-900";
}

function rpoClass(rpoDays: number | null): string {
  if (rpoDays == null) return "text-slate-400";
  if (rpoDays >= 7) return "text-rose-700 font-semibold";
  if (rpoDays >= 3) return "text-amber-700 font-semibold";
  return "text-slate-900";
}

function chipClass(active: boolean): string {
  return [
    "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs",
    "transition-colors",
    active
      ? "bg-slate-900 text-white border-slate-900"
      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
  ].join(" ");
}

function inputBase() {
  return [
    "w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm",
    "border-slate-200",
    "focus:outline-none focus:ring-2 focus:ring-slate-200",
  ].join(" ");
}

function selectBase() {
  return [
    "rounded-xl border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm",
    "border-slate-200",
    "focus:outline-none focus:ring-2 focus:ring-slate-200",
  ].join(" ");
}

function kpiCard() {
  return "rounded-2xl border bg-white p-4 shadow-sm";
}

function pill(status: WorkQueueStatus) {
  const meta = STATUS_BADGE[status];
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px]",
        meta.cls,
      ].join(" ")}
    >
      <span className={["h-1.5 w-1.5 rounded-full", meta.dot].join(" ")} />
      {status}
    </span>
  );
}

function panel() {
  return "cv-panel p-4";
}

function dangerBox() {
  return "rounded-2xl border bg-white p-5 shadow-sm";
}

export default function WorkQueueClient() {
  const [loading, setLoading] = useState<boolean>(true);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  // ★「自分が触った行だけ」トグル（この端末 기준）
  const [onlyMine, setOnlyMine] = useState<boolean>(false);

  // 初回ロード（localStorage）
  useEffect(() => {
    setLoading(true);
    try {
      const js = listJobs();
      const cs = listCompanies();
      setJobs(js);
      setCompanies(cs);
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

  // ★「自分が触った」絞り込み（クライアント側で追加）
  const filteredRows = useMemo<WorkQueueRow[]>(() => {
    if (!onlyMine) return baseFilteredRows;

    const touches = readMyTouches();
    return baseFilteredRows.filter((r) => {
      const key = `${r.jobId}:${r.siteKey}`;
      return Boolean(touches[key]);
    });
  }, [baseFilteredRows, onlyMine]);

  const tableRows = useMemo<WorkQueueRow[]>(() => {
    return sortRows(filteredRows);
  }, [filteredRows]);

  const summary = useMemo(() => {
    const total = filteredRows.length;
    const ng = filteredRows.filter((r) => r.status === "NG").length;

    const stale7 = filteredRows.filter((r) => r.staleDays != null && r.staleDays >= 7).length;
    const stale3 = filteredRows.filter((r) => r.staleDays != null && r.staleDays >= 3).length;

    const rpo7 = filteredRows.filter((r) => r.rpoTouchedDays != null && r.rpoTouchedDays >= 7).length;
    const rpo3 = filteredRows.filter((r) => r.rpoTouchedDays != null && r.rpoTouchedDays >= 3).length;

    // 「今日やるべき」：強い基準（7日以上 or NG）
    const todayMust =
      filteredRows.filter((r) => (r.staleDays != null && r.staleDays >= 7) || (r.rpoTouchedDays != null && r.rpoTouchedDays >= 7)).length +
      ng;

    return { total, ng, stale7, stale3, rpo7, rpo3, todayMust };
  }, [filteredRows]);

  const agenda = useMemo(() => {
    // 優先順の先頭から「今すぐ着手」候補を作る
    const top = tableRows.slice(0, 5);

    const urgent = tableRows.filter(
      (r) =>
        (r.staleDays != null && r.staleDays >= 7) ||
        (r.rpoTouchedDays != null && r.rpoTouchedDays >= 7) ||
        r.status === "NG"
    ).length;

    const soon = tableRows.filter(
      (r) =>
        (r.staleDays != null && r.staleDays >= 3) ||
        (r.rpoTouchedDays != null && r.rpoTouchedDays >= 3)
    ).length;

    return { urgent, soon, top };
  }, [tableRows]);

  function updateFilter<K extends keyof Filters>(k: K, v: Filters[K]) {
    setFilters((prev: Filters) => ({ ...prev, [k]: v }));
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

    setJobs((prev: Job[]) => {
      const next = prev.map((j: Job) => {
        if (j.id !== row.jobId) return j;

        const siteStatus = j.siteStatus ?? {};
        const cur = siteStatus[row.siteKey];

        const nextState: JobSiteState = {
          status: (cur?.status ?? row.status) as any,

          // ★ 仕様：媒体更新日（updatedAt）は「媒体ステータス変更時のみ更新」
          updatedAt: cur?.updatedAt ?? row.mediaUpdatedAtISO,

          note,

          // RPO更新はメモ保存で更新（表示/フィルタ用）
          rpoLastTouchedAt: nowISO,
        };

        const updatedJob: Job = {
          ...j,
          siteStatus: {
            ...siteStatus,
            [row.siteKey]: {
              ...cur,
              ...nextState,
            },
          },
        };

        // ★ touch記録
        markTouched(j.id, row.siteKey, nowISO);

        // ★ イベントログ（7: 月次サマリ用）
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
    updateFilter(
      "rpoThreshold",
      filters.rpoThreshold === "7PLUS_UNTOUCHED" ? "ALL" : "7PLUS_UNTOUCHED"
    );
  }

  function focusToday() {
    // 「今日やる」：7日以上の滞留 or 7日未タッチ を強制表示
    updateFilter("staleThreshold", "7PLUS");
    updateFilter("rpoThreshold", "7PLUS_UNTOUCHED");
    updateFilter("statuses", ALL_STATUSES);
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
    <div className="space-y-5">
      {/* Header */}
      <div
        className="rounded-2xl border bg-white/85 p-4 shadow-sm backdrop-blur"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm">
              <Link href="/" className="cv-link">
                ホーム
              </Link>
              <span className="text-slate-300">/</span>
              <span className="truncate font-semibold text-slate-900">Work Queue</span>
            </div>

            <div className="mt-1 text-xs text-slate-500">
              RPOの「今日やるべきこと」を、媒体行単位で優先順に並べます（滞留 / RPO未タッチ / 状態）。
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
              <Link href="/companies" className="cv-link">
                会社一覧
              </Link>
              <span className="text-slate-300">/</span>
              <Link href="/analytics" className="cv-link">
                分析
              </Link>
              <span className="text-slate-300">/</span>
              <span className="rounded-full border bg-white px-2 py-0.5" style={{ borderColor: "var(--border)" }}>
                表示: <span className="font-medium text-slate-700 tabular-nums">{tableRows.length}</span> 行
              </span>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              className="cv-btn-primary"
              onClick={focusToday}
              title="今日の優先（7日以上滞留＆7日未タッチ）に絞ります"
            >
              今日の優先に絞る
            </button>

            <button
              type="button"
              className="cv-btn-secondary"
              onClick={() => {
                setLoading(true);
                try {
                  setJobs(listJobs());
                  setCompanies(listCompanies());
                } finally {
                  setLoading(false);
                }
              }}
              title="localStorageから再読み込み"
            >
              再読み込み
            </button>

            <button type="button" className="cv-btn-secondary" onClick={resetFilters}>
              リセット
            </button>
          </div>
        </div>
      </div>

      {/* ====== Agenda (IPO見えの核) ====== */}
      <div className={panel()}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900">今日のRPOアジェンダ</div>
            <div className="mt-1 text-xs text-slate-500">
              先に「危険度が高い順」に潰すと、全体が安定します。
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={chipClass(onlyMine)}
              onClick={() => setOnlyMine((v) => !v)}
              title="この端末で最後に触った行だけに絞り込みます（ログイン未導入のため端末基準）"
            >
              自分が触った
            </button>

            <button
              type="button"
              className={chipClass(isRpo7Untouched)}
              onClick={toggleRpo7Untouched}
              title="RPO更新が7日以上ない行だけに絞り込みます"
            >
              RPO: 7日触ってない
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
          <div className={dangerBox()}>
            <div className="text-xs font-semibold text-slate-700">今すぐ着手（危険）</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900 tabular-nums">{agenda.urgent}</div>
            <div className="mt-2 text-[11px] text-slate-500">
              7日以上滞留 / 7日未タッチ / NG を含む
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="cv-btn-secondary" onClick={() => setQuickStale("7PLUS")}>
                滞留: 7日+
              </button>
              <button type="button" className="cv-btn-secondary" onClick={toggleRpo7Untouched}>
                RPO: 7日未タッチ
              </button>
            </div>
          </div>

          <div className={dangerBox()}>
            <div className="text-xs font-semibold text-slate-700">今週中に処理（注意）</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900 tabular-nums">{agenda.soon}</div>
            <div className="mt-2 text-[11px] text-slate-500">3日以上の滞留/未タッチを含む</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="cv-btn-secondary" onClick={() => setQuickStale("3PLUS")}>
                滞留: 3日+
              </button>
              <button
                type="button"
                className="cv-btn-secondary"
                onClick={() => updateFilter("rpoThreshold", "3PLUS_UNTOUCHED" as any)}
              >
                RPO: 3日未タッチ
              </button>
            </div>
          </div>

          <div className={dangerBox()}>
            <div className="text-xs font-semibold text-slate-700">優先トップ5</div>
            <div className="mt-2 space-y-2">
              {loading ? (
                <div className="text-sm text-slate-600">読み込み中…</div>
              ) : agenda.top.length === 0 ? (
                <div className="text-sm text-slate-600">いまは要対応がありません 🎉</div>
              ) : (
                agenda.top.map((r) => (
                  <div key={`${r.jobId}:${r.siteKey}`} className="rounded-xl border bg-white p-3" style={{ borderColor: "var(--border)" }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          {pill(r.status)}
                          <span className="text-[11px] text-slate-500">
                            滞留: <span className={staleClass(r.staleDays ?? null)}>{r.staleDays ?? "-"}</span> /{" "}
                            RPO: <span className={rpoClass(r.rpoTouchedDays ?? null)}>{r.rpoTouchedDays ?? "-"}</span>
                          </span>
                        </div>

                        <div className="mt-2 truncate text-sm font-semibold text-slate-900">
                          {r.companyName} / {r.jobTitle}
                        </div>
                        <div className="mt-1 text-[12px] text-slate-600">
                          媒体: <span className="font-medium">{r.siteKey}</span>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col gap-2">
                        {r.companyId ? (
                          <>
                            <Link className="cv-btn-secondary" href={`/companies/${r.companyId}/jobs/${r.jobId}`}>
                              詳細
                            </Link>
                            <Link className="cv-btn-secondary" href={`/companies/${r.companyId}/jobs/${r.jobId}/outputs`}>
                              出力
                            </Link>
                          </>
                        ) : (
                          <span className="text-[11px] text-slate-400">会社未紐付け</span>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 text-[11px] text-slate-500">
                      最終更新：媒体 {daysAgoLabel(r.mediaUpdatedAtISO)} / RPO {daysAgoLabel(r.rpoLastTouchedAtISO)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="mt-3 text-[11px] text-slate-500">
          ※「自分が触った」は“このブラウザで触った履歴”で判定します（ログイン未導入のため）。担当者ごとに端末が分かれていれば運用できます。
        </div>
      </div>

      {/* Quick Filters */}
      <div className="cv-panel p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-2 text-xs font-semibold text-slate-800">クイック</div>

          <button
            type="button"
            className={chipClass(isAllStale)}
            onClick={() => setQuickStale("ALL")}
            title="滞留条件を外します（まず全件見える）"
          >
            滞留: すべて
          </button>

          <button
            type="button"
            className={chipClass(is3Plus)}
            onClick={() => setQuickStale("3PLUS")}
            title="3日以上の滞留だけ"
          >
            滞留: 3日+
          </button>

          <button
            type="button"
            className={chipClass(is7Plus)}
            onClick={() => setQuickStale("7PLUS")}
            title="7日以上の滞留だけ"
          >
            滞留: 7日+
          </button>

          <div className="mx-2 h-4 w-px bg-slate-200" />

          <button
            type="button"
            className={chipClass(isRpo7Untouched)}
            onClick={toggleRpo7Untouched}
            title="RPO更新が7日以上ない行だけに絞り込みます"
          >
            RPO: 7日触ってない
          </button>

          <div className="mx-2 h-4 w-px bg-slate-200" />

          <button
            type="button"
            className={chipClass(hasAllStatuses)}
            onClick={setQuickStatusesAll}
            title="要対応ステータス（NG/資料待ち/媒体審査中/停止中）を全部ON"
          >
            状態: 要対応ALL
          </button>

          <div className="mx-2 h-4 w-px bg-slate-200" />

          <button
            type="button"
            className={chipClass(hasNoSiteFilter)}
            onClick={clearSites}
            title="媒体フィルタを解除（全媒体）"
          >
            媒体: 全て
          </button>
        </div>
      </div>

      {/* Filters (Detailed) */}
      <div className="cv-panel p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">会社名検索</label>
            <input
              className={inputBase()}
              style={{ width: 280 }}
              placeholder="例）◯◯株式会社"
              value={filters.qCompany}
              onChange={(e) => updateFilter("qCompany", e.target.value)}
            />
            <p className="text-[11px] text-slate-500">会社名に部分一致</p>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">媒体（複数選択）</label>
            <select
              multiple
              className="h-28 w-56 rounded-xl border bg-white px-2 py-2 text-sm shadow-sm"
              style={{ borderColor: "var(--border)" }}
              value={filters.sites}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
                updateFilter("sites", selected);
              }}
            >
              {siteOptions.map((s: string) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500">Ctrl / Cmd で複数選択</p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-slate-600">状態</label>
            <div className="flex flex-wrap gap-2">
              {(ALL_STATUSES as WorkQueueStatus[]).map((s: WorkQueueStatus) => {
                const on = filters.statuses.includes(s);
                return (
                  <button
                    key={s}
                    className={chipClass(on)}
                    onClick={() => {
                      const next = on
                        ? filters.statuses.filter((x: WorkQueueStatus) => x !== s)
                        : [...filters.statuses, s];
                      updateFilter("statuses", next);
                    }}
                    type="button"
                  >
                    {s}
                  </button>
                );
              })}
            </div>
            <div className="text-[11px] text-slate-500">クリックでON/OFF</div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">滞留</label>
            <select
              className={selectBase()}
              value={filters.staleThreshold}
              onChange={(e) => updateFilter("staleThreshold", e.target.value as Filters["staleThreshold"])}
            >
              <option value="ALL">全て</option>
              <option value="3PLUS">3日以上</option>
              <option value="7PLUS">7日以上</option>
            </select>
            <p className="text-[11px] text-slate-500">媒体更新日基準</p>
          </div>
        </div>
      </div>

      {/* KPI Summary（意味が伝わる文言に変更） */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className={kpiCard()}>
          <div className="text-xs text-slate-600">対象（いま見えている要対応）</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900 tabular-nums">{summary.total}</div>
          <div className="mt-2 text-[11px] text-slate-500">フィルタ後の媒体行数</div>
        </div>

        <div className={kpiCard()}>
          <div className="text-xs text-slate-600">放置リスク（滞留7日+）</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900 tabular-nums">{summary.stale7}</div>
          <div className="mt-2 text-[11px] text-slate-500">媒体更新が止まっている</div>
        </div>

        <div className={kpiCard()}>
          <div className="text-xs text-slate-600">RPO未対応（7日未タッチ）</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900 tabular-nums">{summary.rpo7}</div>
          <div className="mt-2 text-[11px] text-slate-500">あなた側の更新が滞留</div>
        </div>

        <div className={kpiCard()}>
          <div className="text-xs text-slate-600">修正が必要（NG）</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900 tabular-nums">{summary.ng}</div>
          <div className="mt-2 text-[11px] text-slate-500">修正→再申請の対象</div>
        </div>
      </div>

      {/* Table（既存の強みは残す） */}
      <div className="cv-panel overflow-hidden">
        <div className="border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900">詳細（全行）</div>
              <div className="mt-0.5 text-xs text-slate-500">
                クリックで詳細へ。メモは Enter / フォーカスアウトで保存（RPO更新日が進みます）。
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
              <span className="rounded-full border bg-white px-3 py-1" style={{ borderColor: "var(--border)" }}>
                状態: {pill("媒体審査中")} {pill("資料待ち")} {pill("停止中")} {pill("NG")}
              </span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-slate-600">読み込み中…</div>
        ) : tableRows.length === 0 ? (
          <div className="p-6 text-sm text-slate-600">
            条件に合う要対応求人はありません。<span className="text-slate-400">（リセットすると全件確認できます）</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr className="text-left text-xs text-slate-500">
                  <th className="sticky top-0 z-10 border-b bg-white px-4 py-3" style={{ borderColor: "var(--border)" }}>
                    滞留
                  </th>
                  <th className="sticky top-0 z-10 border-b bg-white px-4 py-3" style={{ borderColor: "var(--border)" }}>
                    RPO最終
                  </th>
                  <th className="sticky top-0 z-10 border-b bg-white px-4 py-3" style={{ borderColor: "var(--border)" }}>
                    状態
                  </th>
                  <th className="sticky top-0 z-10 border-b bg-white px-4 py-3" style={{ borderColor: "var(--border)" }}>
                    会社
                  </th>
                  <th className="sticky top-0 z-10 border-b bg-white px-4 py-3" style={{ borderColor: "var(--border)" }}>
                    求人
                  </th>
                  <th className="sticky top-0 z-10 border-b bg-white px-4 py-3" style={{ borderColor: "var(--border)" }}>
                    媒体
                  </th>
                  <th className="sticky top-0 z-10 border-b bg-white px-4 py-3" style={{ borderColor: "var(--border)" }}>
                    次アクション（メモ）
                  </th>
                  <th className="sticky top-0 z-10 border-b bg-white px-4 py-3" style={{ borderColor: "var(--border)" }}>
                    最終更新
                  </th>
                  <th className="sticky top-0 z-10 border-b bg-white px-4 py-3" style={{ borderColor: "var(--border)" }}>
                    操作
                  </th>
                </tr>
              </thead>

              <tbody>
                {tableRows.map((r: WorkQueueRow) => {
                  const badge = STATUS_BADGE[r.status];

                  return (
                    <tr key={`${r.jobId}:${r.siteKey}`} className="text-sm hover:bg-slate-50">
                      <td className="border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
                        {r.staleDays == null ? (
                          <span className="text-slate-400">-</span>
                        ) : (
                          <span className={staleClass(r.staleDays) + " tabular-nums"}>{r.staleDays}日</span>
                        )}
                      </td>

                      <td className="border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
                        {r.rpoTouchedDays == null ? (
                          <span className="text-slate-400">-</span>
                        ) : (
                          <span className={rpoClass(r.rpoTouchedDays) + " tabular-nums"}>{r.rpoTouchedDays}日</span>
                        )}
                      </td>

                      <td className="border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
                        <span
                          className={[
                            "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px]",
                            badge.cls,
                          ].join(" ")}
                        >
                          <span className={["h-1.5 w-1.5 rounded-full", badge.dot].join(" ")} />
                          {r.status}
                        </span>
                      </td>

                      <td className="border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
                        {r.companyId ? (
                          <Link className="font-medium text-slate-800 hover:text-slate-900 hover:underline" href={`/companies/${r.companyId}`}>
                            {r.companyName}
                          </Link>
                        ) : (
                          <span className="text-slate-700">{r.companyName}</span>
                        )}
                      </td>

                      <td className="border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
                        {r.companyId ? (
                          <Link className="font-medium text-slate-900 hover:text-slate-700 hover:underline" href={`/companies/${r.companyId}/jobs/${r.jobId}`}>
                            {r.jobTitle}
                          </Link>
                        ) : (
                          <span className="font-medium text-slate-900">{r.jobTitle}</span>
                        )}
                      </td>

                      <td className="border-b px-4 py-3 text-slate-700" style={{ borderColor: "var(--border)" }}>
                        {r.siteKey}
                      </td>

                      <td className="border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
                        <input
                          className={[
                            "w-[420px] max-w-[70vw]",
                            "rounded-xl border bg-white px-3 py-2 text-sm shadow-sm",
                            "border-slate-200",
                            "focus:outline-none focus:ring-2 focus:ring-slate-200",
                          ].join(" ")}
                          defaultValue={r.state.note ?? ""}
                          placeholder="例）12/26までに条件確認を送る"
                          onBlur={(e) => saveNote(r, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                          }}
                        />
                        <div className="mt-1 text-[11px] text-slate-500">Enterで保存 / フォーカスアウトで保存</div>
                      </td>

                      <td className="border-b px-4 py-3 text-xs text-slate-700" style={{ borderColor: "var(--border)" }}>
                        <div>媒体更新：{daysAgoLabel(r.mediaUpdatedAtISO)}</div>
                        {r.rpoLastTouchedAtISO ? (
                          <div>RPO更新：{daysAgoLabel(r.rpoLastTouchedAtISO)}</div>
                        ) : (
                          <div className="text-slate-400">RPO更新：-</div>
                        )}
                      </td>

                      <td className="border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
                        <div className="flex flex-wrap gap-2">
                          {r.companyId ? (
                            <>
                              <Link className="cv-btn-secondary" href={`/companies/${r.companyId}/jobs/${r.jobId}`}>
                                詳細
                              </Link>
                              <Link className="cv-btn-secondary" href={`/companies/${r.companyId}/jobs/${r.jobId}/outputs`}>
                                出力
                              </Link>
                            </>
                          ) : (
                            <span className="text-[11px] text-slate-400">会社未紐付け</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="px-4 py-3 text-[11px] text-slate-500">
              ※ メモ保存は「媒体更新日」ではなく「RPO更新日」を進めます（媒体更新はステータス変更時のみ更新）。
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
