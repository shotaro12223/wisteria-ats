"use client";

import Link from "next/link";
import type { Job, JobSiteState, SiteStatus } from "@/lib/types";
import { SITE_TEMPLATES } from "@/lib/templates";

type Props = {
  companyId: string;
  jobs: Job[];
  onDeleted?: () => void;
};

function formatLocalDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

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

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function getTemplateSites(): string[] {
  const sites = uniq((SITE_TEMPLATES ?? []).map((t) => String(t.site)));
  const set = new Set(sites);

  const ordered = SITE_ORDER.filter((s) => set.has(s));
  const rest = sites.filter((s) => !SITE_ORDER.includes(s as any));

  return [...ordered, ...rest];
}

function getSiteState(job: Job, siteKey: string): JobSiteState {
  const cur = job.siteStatus?.[siteKey];
  if (cur) return cur;
  return { status: "準備中", updatedAt: "" };
}

function badgeClass(s: SiteStatus) {
  // 状態別に “品よく” 色を分ける（派手すぎない）
  switch (s) {
    case "掲載中":
      return "inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100";
    case "媒体審査中":
      return "inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium bg-sky-50 text-sky-700 border border-sky-100";
    case "資料待ち":
      return "inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-100";
    case "停止中":
      return "inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200";
    case "NG":
      return "inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-100";
    case "準備中":
    default:
      return "inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium bg-slate-50 text-slate-600 border border-slate-200";
  }
}

function actionLinkClass() {
  // “操作”を静かに。ボタンよりリンク寄せ。
  return [
    "inline-flex items-center rounded-xl px-3 py-2 text-xs font-medium",
    "border border-[var(--border)] bg-white shadow-sm",
    "hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)]",
    "transition",
  ].join(" ");
}

function actionDangerClass() {
  return [
    "inline-flex items-center rounded-xl px-3 py-2 text-xs font-medium",
    "border border-[rgba(244,63,94,0.25)] bg-white text-rose-700 shadow-sm",
    "hover:bg-rose-50 hover:border-[rgba(244,63,94,0.35)]",
    "transition",
  ].join(" ");
}

export function JobsTable({ companyId, jobs, onDeleted }: Props) {
  const sites = getTemplateSites();

  async function handleDelete(job: Job) {
    const ok = confirm("この求人を削除しますか？（元に戻せません）");
    if (!ok) return;

    try {
      const res = await fetch(`/api/jobs/${encodeURIComponent(job.id)}`, {
        method: "DELETE",
        cache: "no-store",
      });

      const json = (await res.json()) as any;

      if (!res.ok || !json?.ok) {
        const msg = json?.error?.message || `削除に失敗しました (status: ${res.status})`;
        throw new Error(msg);
      }

      onDeleted?.();
    } catch (e) {
      alert(e instanceof Error ? e.message : "削除に失敗しました");
    }
  }

  if (jobs.length === 0) {
    return (
      <div className="cv-panel p-6 text-sm text-slate-700">
        この会社の求人はまだありません。「+ 求人を追加」から作成してください。
      </div>
    );
  }

  return (
    <div className="cv-panel overflow-hidden">
      {/* Header */}
      <div
        className="grid grid-cols-12 gap-4 border-b px-5 py-3 text-[11px] font-semibold text-slate-500"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="col-span-12 sm:col-span-5">職種</div>
        <div className="col-span-6 sm:col-span-2">雇用形態</div>
        <div className="hidden sm:col-span-3 sm:block">媒体ステータス</div>
        <div className="col-span-6 sm:col-span-2 text-right">更新</div>
      </div>

      {/* Rows */}
      <div className="divide-y" style={{ borderColor: "var(--border)" }}>
        {jobs.map((j) => {
          const siteStates = sites.map((s) => ({ site: s, st: getSiteState(j, s) }));

          const priority: Record<SiteStatus, number> = {
            掲載中: 1,
            媒体審査中: 2,
            資料待ち: 3,
            準備中: 4,
            停止中: 5,
            NG: 6,
          };

          const summary =
            siteStates
              .slice()
              .sort((a, b) => (priority[a.st.status] ?? 99) - (priority[b.st.status] ?? 99))[0] ?? null;

          const title = j.jobTitle || "(職種名未設定)";
          const sub = [
            j.catchCopy ? `「${j.catchCopy}」` : null,
            j.jobCategory ? j.jobCategory : null,
            j.nearestStation ? `最寄り: ${j.nearestStation}` : null,
          ].filter(Boolean);

          return (
            <div key={j.id} className="group px-5 py-4 hover:bg-slate-50/70">
              <div className="grid grid-cols-12 items-center gap-4">
                {/* Title */}
                <div className="col-span-12 sm:col-span-5 min-w-0">
                  <Link
                    href={`/companies/${companyId}/jobs/${j.id}`}
                    className="block truncate text-sm font-semibold text-slate-900 hover:text-slate-700"
                    title="求人詳細を開く"
                  >
                    {title}
                  </Link>

                  {sub.length > 0 ? (
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-slate-500">
                      {sub.map((s, idx) => (
                        <span key={idx} className="truncate">
                          {s}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-1 text-[12px] text-slate-400">
                      キャッチコピー・カテゴリなどが未入力です
                    </div>
                  )}

                  {/* Mobile: meta */}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 sm:hidden">
                    <span>更新: {formatLocalDateTime(j.updatedAt)}</span>
                    {summary ? (
                      <>
                        <span className="text-slate-300">|</span>
                        <span className="text-slate-600">
                          {SITE_LABEL[summary.site] ?? summary.site}
                        </span>
                        <span className={badgeClass(summary.st.status)}>{summary.st.status}</span>
                      </>
                    ) : null}
                  </div>
                </div>

                {/* Employment type */}
                <div className="col-span-6 sm:col-span-2">
                  {j.employmentType ? (
                    <span className="text-sm text-slate-700">{j.employmentType}</span>
                  ) : (
                    <span className="text-sm text-slate-400">—</span>
                  )}
                </div>

                {/* Site status (PC) */}
                <div className="relative hidden sm:col-span-3 sm:block">
                  {sites.length === 0 ? (
                    <span className="text-sm text-slate-400">—</span>
                  ) : (
                    <div className="group/status inline-flex items-center gap-2">
                      {summary ? (
                        <>
                          <span className="text-[12px] font-medium text-slate-700">
                            {SITE_LABEL[summary.site] ?? summary.site}
                          </span>
                          <span className={badgeClass(summary.st.status)}>{summary.st.status}</span>
                        </>
                      ) : (
                        <span className="text-sm text-slate-400">—</span>
                      )}

                      {/* Hover popup */}
                      <div
                        className="pointer-events-none absolute left-0 top-[calc(100%+10px)] z-20 hidden w-[360px] rounded-2xl border p-3 shadow-xl group-hover/status:block"
                        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-[11px] font-semibold text-slate-700">
                            媒体ごとのステータス
                          </div>
                          <div className="text-[11px] text-slate-400">hoverで表示</div>
                        </div>

                        <div className="mt-2 grid grid-cols-1 gap-2">
                          {siteStates.map(({ site, st }) => (
                            <div
                              key={site}
                              className="flex items-start justify-between gap-2 rounded-xl border px-3 py-2"
                              style={{
                                borderColor: "var(--border)",
                                background: "var(--surface-muted)",
                              }}
                            >
                              <div className="min-w-0">
                                <div className="truncate text-[12px] font-semibold text-slate-800">
                                  {SITE_LABEL[site] ?? site}
                                </div>

                                <div className="mt-0.5 text-[11px] text-slate-500">
                                  {st.updatedAt ? `更新: ${formatLocalDateTime(st.updatedAt)}` : "未更新"}
                                </div>

                                {st.note ? (
                                  <div className="mt-1 line-clamp-2 text-[11px] text-slate-600">
                                    メモ: {st.note}
                                  </div>
                                ) : null}
                              </div>

                              <div className="shrink-0 pt-0.5">
                                <span className={badgeClass(st.status)}>{st.status}</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="mt-2 text-[11px] text-slate-500">
                          ※ 変更は「開く」→ 上部の媒体ステータスバーから
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Updated */}
                <div className="col-span-6 sm:col-span-2 text-right">
                  <span className="hidden text-sm text-slate-700 sm:inline">
                    {formatLocalDateTime(j.updatedAt)}
                  </span>
                </div>

                {/* Actions */}
                <div className="col-span-12 flex flex-wrap justify-end gap-2 pt-3 sm:pt-0">
                  <Link href={`/companies/${companyId}/jobs/${j.id}`} className={actionLinkClass()}>
                    開く
                  </Link>

                  <Link href={`/companies/${companyId}/jobs/${j.id}/outputs`} className={actionLinkClass()}>
                    出力
                  </Link>

                  <Link href={`/companies/${companyId}/jobs/${j.id}/data`} className={actionLinkClass()}>
                    データ
                  </Link>

                  {/* 危険操作だけ色を変える */}
                  <button type="button" className={actionDangerClass()} onClick={() => handleDelete(j)}>
                    削除
                  </button>
                </div>

                {/* PCだけ：行の右上に“薄いガイド” */}
                <div className="col-span-12 hidden sm:block">
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                    <div className="truncate">
                      {j.grossPay ? `給与: ${j.grossPay}` : null}
                      {j.workHours ? (j.grossPay ? " / " : "") + `勤務: ${j.workHours}` : null}
                    </div>
                    <div className="opacity-0 transition group-hover:opacity-100">
                      クリックで編集 / 出力 / 応募データ
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
