"use client";

import { useEffect, useMemo, useState } from "react";

type ArchiveItem = {
  id: string;
  companyId: string | null;
  jobId: string;

  // ✅ APIが返す（職種名）
  jobTitle: string | null;

  archivedAt: string;
  archiveTitle: string | null;
  cycleDays: number;
  cycleApplicantsCount: number;
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

function safeJobTitle(s: string | null) {
  const t = String(s ?? "").trim();
  return t ? t : "（職種名なし）";
}

async function fetchJsonSafe(
  input: RequestInfo,
  init?: RequestInit
): Promise<{
  ok: boolean;
  status: number;
  contentType: string;
  json: any | null;
  text: string;
}> {
  const res = await fetch(input, init);
  const contentType = res.headers.get("content-type") ?? "";
  const text = await res.text();

  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }

  return { ok: res.ok, status: res.status, contentType, json, text };
}

function safePreview(s: string, max = 240) {
  const t = String(s ?? "");
  if (t.length <= max) return t;
  return t.slice(0, max) + "...";
}

export default function CompanyJobArchivesPanel(props: { companyId: string }) {
  const companyId = String(props.companyId ?? "").trim();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [items, setItems] = useState<ArchiveItem[]>([]);

  // ✅ 職種名フィルタ（jobTitle）
  const [selectedJobTitle, setSelectedJobTitle] = useState<string>("");

  async function load() {
    if (!companyId) return;

    setLoading(true);
    setError("");

    try {
      const r = await fetchJsonSafe(
        `/api/companies/${encodeURIComponent(companyId)}/job-archives?limit=200`,
        { cache: "no-store" }
      );

      if (!r.ok) {
        const msg =
          r.json?.error?.message ??
          r.json?.error ??
          `archives load failed: HTTP ${r.status} (${r.contentType}) ${safePreview(r.text)}`;
        setError(String(msg));
        setItems([]);
        return;
      }

      if (!r.json?.ok) {
        setError(String(r.json?.error?.message ?? r.json?.error ?? "archives load failed"));
        setItems([]);
        return;
      }

      const arr = Array.isArray(r.json.items) ? r.json.items : [];
      const mapped: ArchiveItem[] = arr.map((x: any) => ({
        id: String(x.id ?? ""),
        companyId: x.companyId ? String(x.companyId) : null,
        jobId: String(x.jobId ?? ""),
        jobTitle: x.jobTitle != null ? String(x.jobTitle) : null,
        archivedAt: String(x.archivedAt ?? ""),
        archiveTitle: x.archiveTitle != null ? String(x.archiveTitle) : null,
        cycleDays: Number(x.cycleDays ?? 0) | 0,
        cycleApplicantsCount: Number(x.cycleApplicantsCount ?? 0) | 0,
      }));

      setItems(mapped);

      // ✅ 選択中の職種名が消えていたらリセット
      if (selectedJobTitle) {
        const exists = mapped.some((m) => safeJobTitle(m.jobTitle) === selectedJobTitle);
        if (!exists) setSelectedJobTitle("");
      }
    } catch (e: any) {
      setError(String(e?.message ?? e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const jobTitleOptions = useMemo(() => {
    const set = new Set<string>();
    for (const it of items) set.add(safeJobTitle(it.jobTitle));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ja"));
  }, [items]);

  const filteredItems = useMemo(() => {
    if (!selectedJobTitle) return items;
    return items.filter((it) => safeJobTitle(it.jobTitle) === selectedJobTitle);
  }, [items, selectedJobTitle]);

  const headerRight = useMemo(() => {
    if (loading) return "読み込み中...";
    if (filteredItems.length > 0) return `${filteredItems.length} 件`;
    return "";
  }, [loading, filteredItems.length]);

  return (
    <section className="cv-panel p-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="font-semibold text-slate-900">アーカイブ</div>

        <div className="ml-auto flex items-center gap-2">
          {/* ✅ 職種名（求人名）で絞る */}
          <select
            className="cv-input w-[260px] min-h-[36px] py-1 leading-6"
            value={selectedJobTitle}
            onChange={(e) => setSelectedJobTitle(e.target.value)}
            disabled={loading || items.length === 0}
            title="職種名で絞り込み"
          >
            <option value="">求人：すべて</option>
            {jobTitleOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {headerRight ? <div className="text-xs text-slate-500">{headerRight}</div> : null}

          <button
            type="button"
            className="cv-btn-secondary"
            onClick={() => void load()}
            disabled={loading || !companyId}
          >
            更新
          </button>
        </div>
      </div>

      {error ? <div className="mt-2 text-sm text-red-600">{error}</div> : null}

      <div className="mt-3">
        {loading ? (
          <div className="text-sm text-slate-600">読み込み中...</div>
        ) : filteredItems.length === 0 ? (
          <div className="text-sm text-slate-600">まだアーカイブはありません。</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr className="text-left text-xs text-slate-500">
                  <th className="border-b px-3 py-2">求人（職種名）</th>
                  <th className="border-b px-3 py-2">アーカイブ名</th>
                  <th className="border-b px-3 py-2">掲載期間</th>
                  <th className="border-b px-3 py-2">応募数</th>
                  <th className="border-b px-3 py-2">作成日</th>
                </tr>
              </thead>

              <tbody>
                {filteredItems.map((r) => (
                  <tr key={r.id} className="text-sm">
                    <td className="border-b px-3 py-2">
                      <div className="font-medium text-slate-900">
                        {safeJobTitle(r.jobTitle)}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-500 break-all">
                        job_id: {r.jobId}
                      </div>
                    </td>

                    <td className="border-b px-3 py-2">
                      <div className="font-medium text-slate-900">{safeTitle(r.archiveTitle)}</div>
                    </td>

                    <td className="border-b px-3 py-2 whitespace-nowrap">
                      {Math.max(0, r.cycleDays)} 日
                    </td>

                    <td className="border-b px-3 py-2 whitespace-nowrap">
                      {Math.max(0, r.cycleApplicantsCount)} 件
                    </td>

                    <td className="border-b px-3 py-2 text-xs text-slate-700 whitespace-nowrap">
                      {r.archivedAt ? (
                        formatLocal(r.archivedAt)
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-2 text-xs text-slate-500">
              ※ プルダウンで「職種名（求人名）」ごとに絞り込めます。
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
