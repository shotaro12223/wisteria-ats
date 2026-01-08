"use client";

import { useEffect, useState } from "react";

type Applicant = {
  id: string;
  name?: string;
  status?: string;
  created_at?: string;
};

type Props = {
  companyId: string;
  jobId: string;
};

export default function JobApplicantsSummary({ companyId, jobId }: Props) {
  const [apps, setApps] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    // ★ jobId が無いページでは何もしない（最重要）
    if (!companyId || !jobId) {
      setApps([]);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError("");

      try {
        const qs = new URLSearchParams({
          companyId: String(companyId),
          jobId: String(jobId),
        }).toString();

        const res = await fetch(`/api/applicants/by-job?${qs}`, {
          cache: "no-store",
        });

        // ★ 400/500でも throw しない（画面を殺さない）
        if (!res.ok) {
          setApps([]);
          setError(`応募の取得に失敗しました (HTTP ${res.status})`);
          return;
        }

        const json = await res.json();
        if (!cancelled) {
          setApps(Array.isArray(json.items) ? json.items : []);
        }
      } catch (e) {
        if (!cancelled) {
          setError("応募の取得中にエラーが発生しました");
          setApps([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [companyId, jobId]);

  // ----------------------------
  // 表示
  // ----------------------------
  if (!companyId || !jobId) {
    return (
      <div className="text-sm text-slate-500">
        ※ 求人作成後に応募データが表示されます
      </div>
    );
  }

  if (loading) {
    return <div className="text-sm text-slate-500">読み込み中…</div>;
  }

  if (error) {
    return <div className="text-sm text-slate-500">{error}</div>;
  }

  if (apps.length === 0) {
    return <div className="text-sm text-slate-500">応募はまだありません</div>;
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold text-slate-900">
        応募数：{apps.length}件
      </div>

      <ul className="space-y-1 text-sm text-slate-700">
        {apps.map((a) => (
          <li key={a.id} className="rounded-lg border px-3 py-2">
            <div className="font-medium">{a.name || "応募者"}</div>
            {a.status ? (
              <div className="text-xs text-slate-500">{a.status}</div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
