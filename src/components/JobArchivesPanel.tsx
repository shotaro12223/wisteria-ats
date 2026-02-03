"use client";

import { useEffect, useMemo, useState } from "react";

type ArchiveItem = {
  id: string;
  companyId: string | null;
  jobId: string;
  archivedAt: string;
  archiveTitle: string | null;
  cycleDays: number;
  cycleApplicantsCount: number;
  snapshot: any;
};

type ArchiveDetail = ArchiveItem & {
  snapshot: any;
};

function formatLocal(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function safeTitle(s: string | null) {
  const t = String(s ?? "").trim();
  return t ? t : "（無題アーカイブ）";
}

async function fetchJsonSafe(input: RequestInfo) {
  const res = await fetch(input, { cache: "no-store" });
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { ok: res.ok, status: res.status, json, text };
}

function ArchiveDetailModal({ archiveId, onClose }: { archiveId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<ArchiveDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDetail() {
      setLoading(true);
      setError("");

      const r = await fetchJsonSafe(`/api/job-archives/${encodeURIComponent(archiveId)}`);

      if (!r.ok || !r.json?.ok) {
        setError(String(r.json?.error?.message ?? r.json?.error ?? `読み込みに失敗しました (HTTP ${r.status})`));
        setLoading(false);
        return;
      }

      const data = r.json.data;
      const mapped: ArchiveDetail = {
        id: String(data.id ?? ""),
        companyId: data.companyId ? String(data.companyId) : null,
        jobId: String(data.jobId ?? ""),
        archivedAt: String(data.archivedAt ?? ""),
        archiveTitle: data.archiveTitle != null ? String(data.archiveTitle) : null,
        cycleDays: Number(data.cycleDays ?? 0) | 0,
        cycleApplicantsCount: Number(data.cycleApplicantsCount ?? 0) | 0,
        snapshot: data.snapshot ?? {},
      };

      setDetail(mapped);
      setLoading(false);
    }

    void loadDetail();
  }, [archiveId]);

  const snapshot = detail?.snapshot ?? {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-4xl max-h-[90vh] overflow-auto bg-white dark:bg-slate-800 rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {detail ? safeTitle(detail.archiveTitle) : "アーカイブ詳細"}
            </h2>
            {detail && (
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                作成日: {formatLocal(detail.archivedAt)} | 掲載期間: {detail.cycleDays}日 | 応募数: {detail.cycleApplicantsCount}件
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            aria-label="閉じる"
          >
            <svg className="w-6 h-6 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {loading && <div className="text-center py-8 text-slate-600 dark:text-slate-400">読み込み中...</div>}

          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {detail && !loading && (
            <pre className="p-4 bg-slate-100 dark:bg-slate-900 rounded-lg text-xs overflow-auto">
              {JSON.stringify(snapshot, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

export default function JobArchivesPanel(props: { jobId: string }) {
  const jobId = String(props.jobId ?? "").trim();

  const [items, setItems] = useState<ArchiveItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedArchiveId, setSelectedArchiveId] = useState<string | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [copyMsg, setCopyMsg] = useState("");

  async function load() {
    if (!jobId) return;

    setLoading(true);
    setError("");

    const r = await fetchJsonSafe(
      `/api/jobs/${encodeURIComponent(jobId)}/job-archives?limit=200`
    );

    if (!r.ok || !r.json?.ok) {
      setError(
        String(r.json?.error?.message ?? r.json?.error ?? `読み込みに失敗しました (HTTP ${r.status})`)
      );
      setItems([]);
      setLoading(false);
      return;
    }

    const arr = Array.isArray(r.json.items) ? r.json.items : [];
    const mapped: ArchiveItem[] = arr.map((x: any) => ({
      id: String(x.id ?? ""),
      companyId: x.companyId ? String(x.companyId) : null,
      jobId: String(x.jobId ?? ""),
      archivedAt: String(x.archivedAt ?? ""),
      archiveTitle: x.archiveTitle != null ? String(x.archiveTitle) : null,
      cycleDays: Number(x.cycleDays ?? 0) | 0,
      cycleApplicantsCount: Number(x.cycleApplicantsCount ?? 0) | 0,
      snapshot: x.snapshot ?? null,
    }));

    setItems(mapped);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  const headerRight = useMemo(() => {
    if (loading) return "読み込み中...";
    if (items.length > 0) return `${items.length} 件`;
    return "";
  }, [loading, items.length]);

  function toggleCheck(id: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (checkedIds.size === items.length) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(items.map((i) => i.id)));
    }
  }

  async function copyChecked() {
    const selected = items.filter((i) => checkedIds.has(i.id));
    if (selected.length === 0) return;

    const parts = selected.map((r) => {
      const lines: string[] = [];
      lines.push(`【${safeTitle(r.archiveTitle)}】`);
      lines.push(`掲載期間: ${Math.max(0, r.cycleDays)} 日`);
      lines.push(`応募数: ${Math.max(0, r.cycleApplicantsCount)} 件`);
      lines.push(`スナップショット生データ:`);
      lines.push(JSON.stringify(r.snapshot ?? {}, null, 2));
      return lines.join("\n");
    });

    const text = parts.join("\n\n---\n\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopyMsg("コピーしました");
      setTimeout(() => setCopyMsg(""), 2000);
    } catch {
      setCopyMsg("コピーに失敗しました");
      setTimeout(() => setCopyMsg(""), 2000);
    }
  }

  return (
    <>
      <section className="cv-panel p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="font-semibold text-slate-900 dark:text-slate-100">アーカイブ</div>
          <div className="ml-auto flex items-center gap-2">
            {copyMsg ? <div className="text-xs text-emerald-600 dark:text-emerald-400">{copyMsg}</div> : null}
            {checkedIds.size > 0 && (
              <button
                type="button"
                className="cv-btn-secondary"
                onClick={() => void copyChecked()}
              >
                選択中({checkedIds.size}件)をコピー
              </button>
            )}
            {headerRight ? <div className="text-xs text-slate-500 dark:text-slate-400">{headerRight}</div> : null}
            <button
              type="button"
              className="cv-btn-secondary"
              onClick={() => void load()}
              disabled={loading || !jobId}
            >
              更新
            </button>
          </div>
        </div>

        {error ? <div className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</div> : null}

        <div className="mt-3">
          {loading ? (
            <div className="text-sm text-slate-600 dark:text-slate-400">読み込み中...</div>
          ) : items.length === 0 ? (
            <div className="text-sm text-slate-600 dark:text-slate-400">まだアーカイブはありません。</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0">
                <thead>
                  <tr className="text-left text-xs text-slate-500 dark:text-slate-400">
                    <th className="border-b border-slate-200 dark:border-slate-700 px-2 py-2 w-8">
                      <input
                        type="checkbox"
                        checked={checkedIds.size === items.length && items.length > 0}
                        onChange={toggleAll}
                        className="accent-indigo-600"
                      />
                    </th>
                    <th className="border-b border-slate-200 dark:border-slate-700 px-3 py-2">アーカイブ名</th>
                    <th className="border-b border-slate-200 dark:border-slate-700 px-3 py-2">掲載期間</th>
                    <th className="border-b border-slate-200 dark:border-slate-700 px-3 py-2">応募数</th>
                    <th className="border-b border-slate-200 dark:border-slate-700 px-3 py-2">作成日</th>
                    <th className="border-b border-slate-200 dark:border-slate-700 px-3 py-2"></th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((r) => (
                    <tr key={r.id} className="text-sm hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="border-b border-slate-200 dark:border-slate-700 px-2 py-2 w-8">
                        <input
                          type="checkbox"
                          checked={checkedIds.has(r.id)}
                          onChange={() => toggleCheck(r.id)}
                          className="accent-indigo-600"
                        />
                      </td>
                      <td className="border-b border-slate-200 dark:border-slate-700 px-3 py-2">
                        <div className="font-medium text-slate-900 dark:text-slate-100">{safeTitle(r.archiveTitle)}</div>
                        <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 break-all">
                          job_id: {r.jobId}
                        </div>
                      </td>

                      <td className="border-b border-slate-200 dark:border-slate-700 px-3 py-2 whitespace-nowrap">
                        {Math.max(0, r.cycleDays)} 日
                      </td>

                      <td className="border-b border-slate-200 dark:border-slate-700 px-3 py-2 whitespace-nowrap">
                        {Math.max(0, r.cycleApplicantsCount)} 件
                      </td>

                      <td className="border-b border-slate-200 dark:border-slate-700 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {r.archivedAt ? formatLocal(r.archivedAt) : <span className="text-slate-400">-</span>}
                      </td>

                      <td className="border-b border-slate-200 dark:border-slate-700 px-3 py-2">
                        <button
                          type="button"
                          onClick={() => setSelectedArchiveId(r.id)}
                          className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline"
                        >
                          詳細を見る
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {selectedArchiveId && (
        <ArchiveDetailModal
          archiveId={selectedArchiveId}
          onClose={() => setSelectedArchiveId(null)}
        />
      )}
    </>
  );
}
