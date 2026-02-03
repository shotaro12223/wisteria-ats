"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { Job, JobSiteState, SiteStatus } from "@/lib/types";
import { SITE_TEMPLATES } from "@/lib/templates";
import { upsertJob } from "@/lib/storage";
import { appendEvent } from "@/lib/events";

const STATUSES: SiteStatus[] = ["準備中", "掲載中", "資料待ち", "媒体審査中", "NG", "停止中"];

// ユーザー指定の「銘打つ順番」
const SITE_ORDER = [
  "採用係長",
  "AirWork",
  "Engage",
  "Indeed",
  "求人BOX",
  "はたらきんぐ",
  "求人Free",
  "ハローワーク",
  "げんきワーク",
  "ジモティー",
] as const;

// 表示名（銘打ち）
const SITE_LABEL: Record<string, string> = {
  採用係長: "採用係長",
  AirWork: "AirWork",
  Engage: "エンゲージ",
  Indeed: "indeed",
  求人BOX: "求人ボックス",
  はたらきんぐ: "はたらきんぐ",
  求人Free: "求人Free",
  ハローワーク: "ハローワーク",
  げんきワーク: "げんきワーク",
  ジモティー: "ジモティー",
};

const SITE_PICK_KEY_PREFIX = "wisteria_ats_site_status_bar_picks_v1:"; // + job.id

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

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function getTemplateSites(): string[] {
  const sites = uniq((SITE_TEMPLATES ?? []).map((t) => String(t.site)));
  return sites;
}

function orderSites(availableSites: string[]): string[] {
  const available = new Set(availableSites);
  const ordered = SITE_ORDER.filter((s) => available.has(s));
  const rest = availableSites.filter((s) => !SITE_ORDER.includes(s as any));
  return [...ordered, ...rest];
}

function formatLocalDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function statusPillClass(s: SiteStatus) {
  switch (s) {
    case "掲載中":
      return "bg-emerald-100 text-emerald-900 border-emerald-200";
    case "媒体審査中":
      return "bg-indigo-100 text-indigo-900 border-indigo-200";
    case "資料待ち":
      return "bg-amber-100 text-amber-900 border-amber-200";
    case "停止中":
      return "bg-slate-100 text-slate-700 border-slate-200";
    case "NG":
      return "bg-rose-100 text-rose-900 border-rose-200";
    case "準備中":
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
}

function subtleDotClass(s: SiteStatus) {
  switch (s) {
    case "掲載中":
      return "bg-emerald-500";
    case "媒体審査中":
      return "bg-indigo-500";
    case "資料待ち":
      return "bg-amber-500";
    case "停止中":
      return "bg-slate-400";
    case "NG":
      return "bg-rose-500";
    case "準備中":
    default:
      return "bg-slate-400";
  }
}

function inputBase() {
  return [
    "w-full rounded-xl border bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm",
    "focus:outline-none",
  ].join(" ");
}

/** ボタン + Portal ポップオーバー */
function SitePopoverButton({
  siteKey,
  st,
  isOpen,
  onToggle,
  onClose,
  children,
}: {
  siteKey: string;
  st: { status: SiteStatus; updatedAt?: string; rpoLastTouchedAt?: string; note?: string };
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const reposition = useCallback(() => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    let left = r.left;
    if (left + 360 > window.innerWidth) left = window.innerWidth - 370;
    if (left < 8) left = 8;
    setPos({ top: r.bottom + 10, left });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    reposition();
    const onScroll = () => reposition();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [isOpen, reposition]);

  // 外側クリックで閉じる
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        popRef.current &&
        !popRef.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, onClose]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={[
          "group inline-flex items-center gap-2 rounded-2xl border bg-white dark:bg-slate-700 px-3 py-2 shadow-sm",
          "hover:bg-slate-50 dark:hover:bg-slate-600",
        ].join(" ")}
        style={{ borderColor: "var(--border)" }}
        onClick={onToggle}
        title="クリックしてステータスを変更"
      >
        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
          {SITE_LABEL[siteKey] ?? siteKey}
        </span>
        <span
          className={[
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]",
            statusPillClass(st.status),
          ].join(" ")}
        >
          <span className={["h-1.5 w-1.5 rounded-full", subtleDotClass(st.status)].join(" ")} />
          {st.status}
        </span>
        {st.updatedAt ? (
          <span className="hidden text-[11px] text-slate-400 dark:text-slate-500 md:inline">
            更新: {formatLocalDateTime(st.updatedAt)}
          </span>
        ) : (
          <span className="hidden text-[11px] text-slate-400 dark:text-slate-500 md:inline">未更新</span>
        )}
      </button>

      {isOpen && pos
        ? createPortal(
            <div
              ref={popRef}
              className="fixed z-[9999] w-[360px] rounded-2xl border bg-white dark:bg-slate-800 p-4 shadow-xl"
              style={{ top: pos.top, left: pos.left, borderColor: "var(--border)" }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {SITE_LABEL[siteKey] ?? siteKey}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <span
                      className={[
                        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5",
                        statusPillClass(st.status),
                      ].join(" ")}
                    >
                      <span className={["h-1.5 w-1.5 rounded-full", subtleDotClass(st.status)].join(" ")} />
                      現在：{st.status}
                    </span>
                    {st.updatedAt ? (
                      <span>媒体更新: {formatLocalDateTime(st.updatedAt)}</span>
                    ) : (
                      <span>媒体更新: 未更新</span>
                    )}
                    {st.rpoLastTouchedAt ? (
                      <span>RPO更新: {formatLocalDateTime(st.rpoLastTouchedAt)}</span>
                    ) : null}
                  </div>
                </div>
                <button type="button" className="cv-btn-secondary !px-2 !py-1 text-xs" onClick={onClose}>
                  閉じる
                </button>
              </div>

              <div className="mt-4">
                {children}
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}

export function JobSiteStatusBar(props: { job: Job; onUpdate: (next: Job) => void }) {
  const { job, onUpdate } = props;

  const allSites = useMemo(() => {
    const available = getTemplateSites();
    return orderSites(available);
  }, []);

  const [openKey, setOpenKey] = useState<string | null>(null);

  // ✅ 媒体表示チェック（普段は隠す）
  const [showSitePicker, setShowSitePicker] = useState(false);
  const [pickedSites, setPickedSites] = useState<Set<string>>(new Set());

  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});

  // jobごとに保存（編集ページ/出力ページで共通になる）
  useEffect(() => {
    if (typeof window === "undefined") return;

    const key = `${SITE_PICK_KEY_PREFIX}${job.id}`;
    const raw = window.localStorage.getItem(key);

    if (!raw) {
      setPickedSites(new Set(allSites));
      return;
    }

    try {
      const parsed = JSON.parse(raw) as string[];
      const next = new Set(Array.isArray(parsed) ? parsed : []);
      const normalized = new Set(allSites.filter((s) => next.has(s)));
      setPickedSites(normalized.size ? normalized : new Set(allSites));
    } catch {
      setPickedSites(new Set(allSites));
    }
  }, [job.id, allSites]);

  function savePickedSites(next: Set<string>) {
    setPickedSites(next);
    if (typeof window === "undefined") return;
    const key = `${SITE_PICK_KEY_PREFIX}${job.id}`;
    window.localStorage.setItem(key, JSON.stringify(Array.from(next)));
  }

  const visibleSites = useMemo(() => {
    return allSites.filter((s) => pickedSites.has(s));
  }, [allSites, pickedSites]);

  function getState(siteKey: string): JobSiteState {
    const cur = job.siteStatus?.[siteKey];
    if (cur) return cur;
    return { status: "準備中", updatedAt: "" };
  }

  function persist(next: Job) {
    onUpdate(next);
    if (typeof window !== "undefined") upsertJob(next);
  }

  function updateStatus(siteKey: string, nextStatus: SiteStatus, note?: string) {
    const now = new Date().toISOString();
    const prev = getState(siteKey);

    const nextSiteState: JobSiteState = {
      status: nextStatus,
      updatedAt: now,
      note: (note ?? prev.note ?? "").trim() || undefined,
      rpoLastTouchedAt: now,
    };

    const next: Job = {
      ...job,
      siteStatus: {
        ...(job.siteStatus ?? {}),
        [siteKey]: nextSiteState,
      },
    };

    markTouched(job.id, siteKey, now);

    appendEvent({
      type: "STATUS_CHANGE",
      at: now,
      jobId: job.id,
      siteKey,
      companyId: job.companyId,
    });

    persist(next);
  }

  function updateNoteOnly(siteKey: string) {
    const now = new Date().toISOString();
    const prev = getState(siteKey);

    const draft = (noteDraft[siteKey] ?? prev.note ?? "").trim();
    const nextSiteState: JobSiteState = {
      status: prev.status,
      updatedAt: prev.updatedAt,
      note: draft || undefined,
      rpoLastTouchedAt: now,
    };

    const next: Job = {
      ...job,
      siteStatus: {
        ...(job.siteStatus ?? {}),
        [siteKey]: nextSiteState,
      },
    };

    markTouched(job.id, siteKey, now);

    appendEvent({
      type: "NOTE_SAVE",
      at: now,
      jobId: job.id,
      siteKey,
      companyId: job.companyId,
    });

    persist(next);
  }

  // "最新の状態"を小さく要約（上に出す）
  const summary = useMemo(() => {
    if (!visibleSites.length) return null;

    const priority: Record<SiteStatus, number> = {
      掲載中: 1,
      媒体審査中: 2,
      資料待ち: 3,
      準備中: 4,
      停止中: 5,
      NG: 6,
    };

    const rows = visibleSites.map((s) => ({ siteKey: s, st: getState(s) }));
    const top = rows.slice().sort((a, b) => (priority[a.st.status] ?? 99) - (priority[b.st.status] ?? 99))[0];
    return top ?? null;
  }, [visibleSites, job.siteStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!allSites.length) return null;

  return (
    <div
      className="rounded-2xl border bg-white/60 dark:bg-slate-800/60 p-4 backdrop-blur"
      style={{ borderColor: "var(--border)" }}
    >
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">媒体ステータス</div>
            {summary ? (
              <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                <span className="text-slate-400 dark:text-slate-500">/</span>
                <span className="truncate">
                  代表：{SITE_LABEL[summary.siteKey] ?? summary.siteKey}
                </span>
                <span
                  className={[
                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5",
                    statusPillClass(summary.st.status),
                  ].join(" ")}
                >
                  <span className={["h-1.5 w-1.5 rounded-full", subtleDotClass(summary.st.status)].join(" ")} />
                  {summary.st.status}
                </span>
              </div>
            ) : null}
          </div>
          <div className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
            クリックで状態を変更。必要ならメモを残します。
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="cv-btn-secondary !px-2 !py-1 text-[11px]"
            onClick={() => setShowSitePicker((v) => !v)}
            title="表示する媒体を選びます（求人ごとに保存）"
          >
            表示媒体
          </button>

          <button
            type="button"
            className="cv-btn-secondary !px-2 !py-1 text-[11px]"
            onClick={() => setOpenKey(null)}
            title="開いているポップアップを閉じます"
          >
            クリア
          </button>
        </div>
      </div>

      {/* Site picker */}
      {showSitePicker ? (
        <div
          className="mt-4 rounded-2xl border bg-[var(--surface-muted)] p-4"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              表示する媒体（チェックしたものだけ表示）
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="cv-btn-secondary !px-2 !py-1 text-[11px]"
                onClick={() => savePickedSites(new Set(allSites))}
              >
                全て選択
              </button>
              <button
                type="button"
                className="cv-btn-secondary !px-2 !py-1 text-[11px]"
                onClick={() => savePickedSites(new Set())}
              >
                全て解除
              </button>
              <button
                type="button"
                className="cv-btn-secondary !px-2 !py-1 text-[11px]"
                onClick={() => setShowSitePicker(false)}
              >
                閉じる
              </button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
            {allSites.map((site) => {
              const checked = pickedSites.has(site);
              return (
                <label
                  key={site}
                  className="flex items-start gap-2 rounded-xl border bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-slate-200"
                  style={{ borderColor: "var(--border)" }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const next = new Set(pickedSites);
                      if (e.target.checked) next.add(site);
                      else next.delete(site);
                      savePickedSites(next);
                    }}
                  />
                  <span className="min-w-0">
                    <span className="font-semibold">{SITE_LABEL[site] ?? site}</span>
                    <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">{site}</span>
                  </span>
                </label>
              );
            })}
          </div>

          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            ※ ここで選んだ媒体だけが下のステータスに表示されます（求人ごとに保存）
          </div>
        </div>
      ) : null}

      {/* Sites row */}
      {visibleSites.length === 0 ? (
        <div className="mt-4 text-xs text-slate-500 dark:text-slate-400">
          表示媒体が未選択です。「表示媒体」から1つ以上選んでください。
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          {visibleSites.map((siteKey) => {
            const st = getState(siteKey);
            const isOpen = openKey === siteKey;

            return (
              <SitePopoverButton
                key={siteKey}
                siteKey={siteKey}
                st={st}
                isOpen={isOpen}
                onToggle={() => setOpenKey((k) => (k === siteKey ? null : siteKey))}
                onClose={() => setOpenKey(null)}
              >
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">ステータス</div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={[
                        "rounded-xl border px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100",
                        "hover:bg-slate-50 dark:hover:bg-slate-700",
                      ].join(" ")}
                      style={{ borderColor: "var(--border)" }}
                      onClick={() => updateStatus(siteKey, s, noteDraft[siteKey])}
                    >
                      <span className="inline-flex items-center gap-2">
                        <span className={["h-2 w-2 rounded-full", subtleDotClass(s)].join(" ")} />
                        {s}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="mt-4">
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">メモ（任意）</div>
                  <textarea
                    className={[inputBase(), "mt-2 h-24 resize-none"].join(" ")}
                    style={{ borderColor: "var(--border)" }}
                    placeholder="例：担当者名 / 停止理由 / 差戻し理由 / 必要資料 など"
                    value={noteDraft[siteKey] ?? st.note ?? ""}
                    onChange={(e) =>
                      setNoteDraft((prev) => ({ ...prev, [siteKey]: e.target.value }))
                    }
                  />

                  <div className="mt-3 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      className="cv-btn-secondary"
                      onClick={() => updateNoteOnly(siteKey)}
                    >
                      メモ保存
                    </button>
                    <button type="button" className="cv-btn-primary" onClick={() => setOpenKey(null)}>
                      完了
                    </button>
                  </div>

                  <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                    ※ 「ステータス変更」は媒体更新として記録します。メモ保存は媒体更新にしません。
                  </div>
                </div>
              </SitePopoverButton>
            );
          })}
        </div>
      )}
    </div>
  );
}
