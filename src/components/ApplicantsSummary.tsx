"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Applicant, ApplicantStatus } from "@/lib/applicantsStorage";

type ApplicantWithNames = Applicant & {
  companyName?: string;
  jobTitle?: string;
};

const STATUS_LABEL: Record<ApplicantStatus, string> = {
  NEW: "新着",
  DOC: "書類",
  INT: "面接",
  OFFER: "内定",
  NG: "NG",
};

function badgeClass(status: ApplicantStatus): string {
  switch (status) {
    case "NEW":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "DOC":
      return "border-slate-200 bg-slate-50 text-slate-700";
    case "INT":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "OFFER":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "NG":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

export default function ApplicantsSummary({ limit = 5 }: { limit?: number }) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ApplicantWithNames[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 上段の「未対応のみ（新着）」を維持
  const [onlyNew, setOnlyNew] = useState<boolean>(true);

  // 下段の「その他（薄く表示）」の表示件数（デフォルト3）
  const otherLimit = 3;

  async function load() {
    setLoading(true);
    setError(null);

    try {
      /**
       * ✅ API呼び出しを増やさないために、
       * 1回だけ「最新を多めに」取得してクライアントで分ける。
       *
       * NEWだけ表示でも limit 件確保しやすいように多めに取る
       * + その他枠もあるので少し上乗せ
       */
      const fetchLimit = Math.min(Math.max(limit * 4 + otherLimit * 2, limit + otherLimit), 30);

      // ★ここが肝：onlyNew=0 で「NEW以外も含めて」最新を取る（APIは1回）
      const res = await fetch(`/api/applicants/recent?limit=${fetchLimit}&onlyNew=0`, {
        cache: "no-store",
      });

      const json = (await res.json()) as
        | { ok: true; items: ApplicantWithNames[] }
        | { ok: false; error: { message: string } };

      if (!res.ok || !json.ok) {
        const msg = !json.ok ? json.error.message : `HTTP ${res.status}`;
        throw new Error(msg);
      }

      setItems(Array.isArray(json.items) ? json.items : []);
    } catch (e) {
      console.error(e);
      setError("新着応募の取得に失敗しました。");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  const countByStatus = useMemo(() => {
    const init: Record<ApplicantStatus, number> = { NEW: 0, DOC: 0, INT: 0, OFFER: 0, NG: 0 };
    for (const a of items) {
      const s = a.status as ApplicantStatus;
      if (init[s] !== undefined) init[s]++;
    }
    return init;
  }, [items]);

  const newRows = useMemo(() => {
    // NEWだけに絞った上で limit 件
    const arr = items.filter((a) => a.status === "NEW");
    return arr.slice(0, limit);
  }, [items, limit]);

  const otherRows = useMemo(() => {
    // NEW以外を最新順（itemsが最新順の想定）で otherLimit 件
    const arr = items.filter((a) => a.status !== "NEW");
    return arr.slice(0, otherLimit);
  }, [items]);

  return (
    <div className="cv-panel p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm text-slate-500">新着応募</div>
          <div className="mt-1 text-lg font-semibold text-slate-900">最新 {limit} 件</div>

          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-600">
            <span className="rounded-full border bg-white px-2 py-0.5" style={{ borderColor: "var(--border)" }}>
              新着 {countByStatus.NEW}
            </span>
            <span className="rounded-full border bg-white px-2 py-0.5" style={{ borderColor: "var(--border)" }}>
              書類 {countByStatus.DOC}
            </span>
            <span className="rounded-full border bg-white px-2 py-0.5" style={{ borderColor: "var(--border)" }}>
              面接 {countByStatus.INT}
            </span>
            <span className="rounded-full border bg-white px-2 py-0.5" style={{ borderColor: "var(--border)" }}>
              内定 {countByStatus.OFFER}
            </span>
            <span className="rounded-full border bg-white px-2 py-0.5" style={{ borderColor: "var(--border)" }}>
              NG {countByStatus.NG}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <button type="button" className="cv-btn-secondary" onClick={load}>
              更新
            </button>
            <Link href="/applicants" className="cv-btn-secondary">
              応募一覧へ
            </Link>
          </div>

          {/* 未対応のみ（新着） */}
          <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600 select-none">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={onlyNew}
              onChange={(e) => setOnlyNew(e.target.checked)}
            />
            未対応のみ（新着）
          </label>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {loading ? (
          <div className="text-sm text-slate-600">読み込み中...</div>
        ) : error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : (
          <>
            {/* ===== 上段：NEW（または全件） ===== */}
            <div>
              <div className="mb-2 text-xs font-semibold text-slate-600">
                {onlyNew ? "未対応（新着）" : "最新（全ステータス）"}
              </div>

              {(() => {
                const top = onlyNew ? newRows : items.slice(0, limit);

                if (top.length === 0) {
                  return (
                    <div className="text-sm text-slate-600">
                      {onlyNew ? "未対応（新着）の応募がありません。" : "応募がありません。"}
                    </div>
                  );
                }

                return (
                  <div className="space-y-2">
                    {top.map((a) => {
                      const st = a.status as ApplicantStatus;
                      const label = STATUS_LABEL[st] ?? String(a.status ?? "");
                      const companyLabel = a.companyName ?? a.companyId ?? "会社未設定";
                      const jobLabel = a.jobTitle ?? a.jobId ?? "求人未設定";

                      return (
                        <Link
                          key={a.id}
                          href={`/applicants/${a.id}`}
                          className="block rounded-md border px-3 py-2 text-sm hover:bg-slate-50"
                          style={{ borderColor: "var(--border)" }}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="truncate font-medium text-slate-900">{a.name}</span>
                                <span
                                  className={[
                                    "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
                                    badgeClass(st),
                                  ].join(" ")}
                                >
                                  {label}
                                </span>
                              </div>

                              <div className="mt-0.5 truncate text-xs text-slate-500">
                                {companyLabel} / {jobLabel} / {a.siteKey} / 応募日 {a.appliedAt}
                              </div>
                            </div>

                            <div className="shrink-0 text-xs text-slate-500">
                              {new Date(a.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* ===== 下段：その他（薄く表示） ===== */}
            {otherRows.length > 0 ? (
              <div className="border-t pt-4" style={{ borderColor: "var(--border)" }}>
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-500">
                    参考（その他の最近の動き）
                  </div>
                  <div className="text-[11px] text-slate-400">
                    NEW以外を {otherLimit} 件だけ薄く表示
                  </div>
                </div>

                <div className="space-y-2">
                  {otherRows.map((a) => {
                    const st = a.status as ApplicantStatus;
                    const label = STATUS_LABEL[st] ?? String(a.status ?? "");
                    const companyLabel = a.companyName ?? a.companyId ?? "会社未設定";
                    const jobLabel = a.jobTitle ?? a.jobId ?? "求人未設定";

                    return (
                      <Link
                        key={a.id}
                        href={`/applicants/${a.id}`}
                        className="block rounded-md border px-3 py-2 text-sm hover:bg-slate-50"
                        style={{ borderColor: "var(--border)" }}
                      >
                        <div className="flex items-center justify-between gap-3 opacity-70">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="truncate font-medium text-slate-700">{a.name}</span>
                              <span
                                className={[
                                  "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
                                  badgeClass(st),
                                ].join(" ")}
                              >
                                {label}
                              </span>
                            </div>

                            <div className="mt-0.5 truncate text-xs text-slate-500">
                              {companyLabel} / {jobLabel} / {a.siteKey} / 応募日 {a.appliedAt}
                            </div>
                          </div>

                          <div className="shrink-0 text-xs text-slate-500">
                            {new Date(a.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
