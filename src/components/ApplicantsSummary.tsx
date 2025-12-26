"use client";

import { useEffect, useMemo, useState } from "react";

type Applicant = {
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

function readApplicantsAll(): Applicant[] {
  try {
    const raw = window.localStorage.getItem(APPLICANTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as Applicant[];
  } catch {
    return [];
  }
}

type Props = {
  companyId: string;
  jobId: string;
};

export default function ApplicantsSummary(props: Props) {
  const [mounted, setMounted] = useState(false);
  const [apps, setApps] = useState<Applicant[]>([]);

  useEffect(() => {
    setMounted(true);
    setApps(readApplicantsAll());
  }, []);

  const summary = useMemo(() => {
    const byJob = apps.filter(
      (a) => a.companyId === props.companyId && a.jobId === props.jobId
    );

    const total = byJob.length;

    const bySite = new Map<string, number>();
    for (const a of byJob) {
      const key = String(a.siteKey || "").trim();
      if (!key) continue;
      bySite.set(key, (bySite.get(key) ?? 0) + 1);
    }

    const topSites = Array.from(bySite.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ja"))
      .slice(0, 3);

    const othersCount =
      Array.from(bySite.values()).reduce((s, n) => s + n, 0) -
      topSites.reduce((s, [, n]) => s + n, 0);

    return { total, topSites, othersCount };
  }, [apps, props.companyId, props.jobId]);

  // hydration安全：SSR時は何も描かない（DOM一致）
  if (!mounted) return null;

  if (summary.total === 0) {
    return (
      <div className="cv-panel p-4 text-sm text-slate-700">
        応募：0件（まだ応募者データがありません）
        <div className="mt-1 text-[11px] text-slate-500">
          ※「データ」から応募者を追加すると、ここに媒体別の内訳が出ます
        </div>
      </div>
    );
  }

  const parts = summary.topSites.map(([site, n]) => `${site} ${n}`);
  const tail = summary.othersCount > 0 ? ` / 他${summary.othersCount}` : "";
  const line = `応募：${summary.total}件（${parts.join(" / ")}${tail}）`;

  return (
    <div className="cv-panel p-4">
      <div className="text-xs text-slate-500">応募サマリ</div>
      <div className="mt-1 text-sm font-medium text-slate-900">{line}</div>
    </div>
  );
}
