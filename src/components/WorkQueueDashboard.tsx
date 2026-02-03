"use client";

import { useMemo } from "react";
import type { WorkQueueRow } from "@/lib/workQueue";

export function WorkQueueDashboard({ rows, allRows }: { rows: WorkQueueRow[]; allRows: WorkQueueRow[] }) {
  const stats = useMemo(() => {
    const total = rows.length;
    const urgent = rows.filter(
      (r) => (r.staleDays !== null && r.staleDays >= 7) || (r.rpoTouchedDays !== null && r.rpoTouchedDays >= 7) || r.status === "NG"
    ).length;

    const completed = rows.filter(
      (r) => r.rpoLastTouchedAtISO && isToday(r.rpoLastTouchedAtISO)
    ).length;

    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    // 応募数統計
    const totalApplicants = rows.reduce((sum, r) => sum + (r.applicantCount ?? 0), 0);
    const avgApplicantsPerJob = total > 0 ? totalApplicants / total : 0;

    // 新着応募（最近3日以内）
    const recentApplicants = rows.filter((r) => r.lastApplicantDays != null && r.lastApplicantDays <= 3).length;

    return {
      total,
      urgent,
      completed,
      completionRate,
      totalApplicants,
      avgApplicantsPerJob,
      recentApplicants,
    };
  }, [rows]);

  return (
    <div className="rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-indigo-50 via-white to-purple-50 shadow-lg overflow-hidden">
      <div className="px-6 py-4 border-b-2 border-slate-200">
        <h2 className="text-[14px] font-bold text-slate-900">📊 今日のWork Queue統計</h2>
        <p className="mt-0.5 text-[11px] text-slate-600">リアルタイムの進捗とパフォーマンス</p>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="今日やること"
            value={stats.urgent}
            total={stats.total}
            icon="🎯"
            tone="danger"
          />

          <StatCard
            title="今日の進捗"
            value={stats.completed}
            total={stats.total}
            icon="✅"
            tone="success"
            showProgress
            progress={stats.completionRate}
          />

          <StatCard
            title="総応募数"
            value={stats.totalApplicants}
            subtitle={`平均 ${stats.avgApplicantsPerJob.toFixed(1)}件/行`}
            icon="👥"
            tone="info"
          />

          <StatCard
            title="新着応募"
            value={stats.recentApplicants}
            subtitle="最近3日以内"
            icon="✨"
            tone={stats.recentApplicants > 0 ? "success" : "muted"}
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <UrgencyBreakdown rows={rows} />
          <StatusBreakdown rows={rows} />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  total,
  subtitle,
  icon,
  tone,
  showProgress,
  progress,
}: {
  title: string;
  value: number;
  total?: number;
  subtitle?: string;
  icon: string;
  tone: "danger" | "success" | "info" | "muted";
  showProgress?: boolean;
  progress?: number;
}) {
  const toneClasses = {
    danger: "from-rose-50 to-rose-100 border-rose-200",
    success: "from-emerald-50 to-emerald-100 border-emerald-200",
    info: "from-blue-50 to-blue-100 border-blue-200",
    muted: "from-slate-50 to-slate-100 border-slate-200",
  };

  const textClasses = {
    danger: "text-rose-900",
    success: "text-emerald-900",
    info: "text-blue-900",
    muted: "text-slate-700",
  };

  return (
    <div
      className={[
        "rounded-xl border-2 p-4 bg-gradient-to-br shadow-sm",
        toneClasses[tone],
      ].join(" ")}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-[11px] font-semibold text-slate-600">{title}</span>
      </div>

      <div className={["text-[28px] font-bold leading-none tabular-nums", textClasses[tone]].join(" ")}>
        {value}
        {total !== undefined && (
          <span className="text-[16px] text-slate-500 ml-1">/ {total}</span>
        )}
      </div>

      {showProgress && progress !== undefined && (
        <div className="mt-3">
          <div className="h-2 rounded-full bg-white/50 overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
          <div className="mt-1 text-[10px] font-semibold text-slate-600">
            {progress.toFixed(0)}% 完了
          </div>
        </div>
      )}

      {subtitle && (
        <div className="mt-2 text-[11px] text-slate-600">{subtitle}</div>
      )}
    </div>
  );
}

function UrgencyBreakdown({ rows }: { rows: WorkQueueRow[] }) {
  const urgent = rows.filter(
    (r) => (r.staleDays !== null && r.staleDays >= 7) || (r.rpoTouchedDays !== null && r.rpoTouchedDays >= 7) || r.status === "NG"
  ).length;
  const warning = rows.filter(
    (r) =>
      !((r.staleDays !== null && r.staleDays >= 7) || (r.rpoTouchedDays !== null && r.rpoTouchedDays >= 7) || r.status === "NG") &&
      ((r.staleDays !== null && r.staleDays >= 3) || (r.rpoTouchedDays !== null && r.rpoTouchedDays >= 3))
  ).length;
  const normal = rows.length - urgent - warning;

  const total = rows.length;

  return (
    <div className="rounded-xl border-2 border-slate-200 bg-white p-4">
      <h3 className="text-[12px] font-bold text-slate-900 mb-3">緊急度内訳</h3>
      <div className="space-y-2">
        <BreakdownBar label="要注意（7日+）" value={urgent} total={total} color="rose" />
        <BreakdownBar label="注意（3日+）" value={warning} total={total} color="amber" />
        <BreakdownBar label="正常" value={normal} total={total} color="emerald" />
      </div>
    </div>
  );
}

function StatusBreakdown({ rows }: { rows: WorkQueueRow[] }) {
  const statuses = {
    資料待ち: rows.filter((r) => r.status === "資料待ち").length,
    媒体審査中: rows.filter((r) => r.status === "媒体審査中").length,
    NG: rows.filter((r) => r.status === "NG").length,
    停止中: rows.filter((r) => r.status === "停止中").length,
  };

  const total = rows.length;

  return (
    <div className="rounded-xl border-2 border-slate-200 bg-white p-4">
      <h3 className="text-[12px] font-bold text-slate-900 mb-3">ステータス内訳</h3>
      <div className="space-y-2">
        <BreakdownBar label="資料待ち" value={statuses.資料待ち} total={total} color="amber" />
        <BreakdownBar label="媒体審査中" value={statuses.媒体審査中} total={total} color="indigo" />
        <BreakdownBar label="NG" value={statuses.NG} total={total} color="rose" />
        <BreakdownBar label="停止中" value={statuses.停止中} total={total} color="slate" />
      </div>
    </div>
  );
}

function BreakdownBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: "rose" | "amber" | "emerald" | "indigo" | "slate";
}) {
  const percentage = total > 0 ? (value / total) * 100 : 0;

  const colorClasses = {
    rose: "bg-rose-500",
    amber: "bg-amber-500",
    emerald: "bg-emerald-500",
    indigo: "bg-indigo-500",
    slate: "bg-slate-400",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-semibold text-slate-700">{label}</span>
        <span className="text-[11px] font-bold text-slate-900 tabular-nums">
          {value} <span className="text-slate-500">({percentage.toFixed(0)}%)</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={["h-full transition-all duration-300", colorClasses[color]].join(" ")}
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>
    </div>
  );
}

function isToday(isoString: string): boolean {
  const today = new Date();
  const date = new Date(isoString);

  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}
