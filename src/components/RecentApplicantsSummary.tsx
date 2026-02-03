"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Applicant } from "@/lib/applicantsStorage";

export default function RecentApplicantsSummary({ limit = 5 }: { limit?: number }) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Applicant[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/applicants/recent?limit=${limit}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = (await res.json()) as { items: Applicant[] };
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

  return (
    <div className="cv-panel p-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-sm text-slate-500">新着応募</div>
          <div className="mt-1 text-lg font-semibold text-slate-900">最新 {limit} 件</div>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" className="cv-btn-secondary" onClick={load}>
            更新
          </button>
          <Link href="/applicants" className="cv-btn-secondary">
            応募一覧へ
          </Link>
        </div>
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="text-sm text-slate-600">読み込み中...</div>
        ) : error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-slate-600">新着応募はありません。</div>
        ) : (
          <div className="space-y-2">
            {items.map((a) => (
              <div
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="min-w-0">
                  <div className="truncate font-medium text-slate-900">{a.name}</div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {a.companyId ? `会社: ${a.companyId}` : "会社: 未設定"} / 求人: {a.jobId} / 媒体: {a.siteKey}
                  </div>
                </div>

                <div className="text-xs text-slate-500">{new Date(a.createdAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
