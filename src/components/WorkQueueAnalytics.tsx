"use client";

import { useMemo } from "react";

type MemberStat = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  total_assigned: number;
  completed: number;
  stale: number;
  avg_completion_time_hours: number | null;
};

type Bottleneck = {
  status: string;
  avg_days: number;
  max_days: number;
  count: number;
};

type SitePerformance = {
  site_key: string;
  total_jobs: number;
  applicants: number;
  approved: number;
  rejected: number;
  approval_rate: number;
  rejection_rate: number;
  applicants_per_job: number;
};

export function WorkQueueAnalytics({
  memberStats,
  bottlenecks,
  sitePerformance,
}: {
  memberStats: MemberStat[];
  bottlenecks: Bottleneck[];
  sitePerformance: SitePerformance[];
}) {
  return (
    <div className="space-y-6">
      {/* 担当者別統計 */}
      <div className="rounded-lg border-2 border-slate-200 bg-white overflow-hidden">
        <div className="px-6 py-4 border-b-2 border-slate-200 bg-slate-50">
          <h2 className="text-[15px] font-bold text-slate-900">👥 担当者別パフォーマンス</h2>
          <p className="mt-1 text-[11px] text-slate-600">チームメンバーごとのタスク進捗状況</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-600">担当者</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-600">割当数</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-600">完了数</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-600">完了率</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-600">停滞中</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-600">平均処理時間</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {memberStats.map((m) => {
                const completionRate = m.total_assigned > 0 ? Math.round((m.completed / m.total_assigned) * 100) : 0;
                return (
                  <tr key={m.user_id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {m.avatar_url ? (
                          <img src={m.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                            <span className="text-[11px] font-bold text-indigo-700">
                              {m.display_name.slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <span className="text-[13px] font-semibold text-slate-900">{m.display_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[13px] font-semibold text-slate-900">{m.total_assigned}</td>
                    <td className="px-4 py-3 text-[13px] font-semibold text-slate-900">{m.completed}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden max-w-[100px]">
                          <div
                            className="h-full bg-green-500"
                            style={{ width: `${completionRate}%` }}
                          />
                        </div>
                        <span className="text-[12px] font-semibold text-slate-700">{completionRate}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={[
                          "text-[13px] font-semibold",
                          m.stale > 0 ? "text-rose-700" : "text-slate-600",
                        ].join(" ")}
                      >
                        {m.stale}件
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-slate-700">
                      {m.avg_completion_time_hours !== null
                        ? `${m.avg_completion_time_hours}時間`
                        : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ボトルネック分析 */}
      <div className="rounded-lg border-2 border-slate-200 bg-white overflow-hidden">
        <div className="px-6 py-4 border-b-2 border-slate-200 bg-slate-50">
          <h2 className="text-[15px] font-bold text-slate-900">🔍 ボトルネック分析</h2>
          <p className="mt-1 text-[11px] text-slate-600">ステータス別の平均滞留時間</p>
        </div>

        <div className="p-6 space-y-3">
          {bottlenecks.map((b) => (
            <div key={b.status} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-[13px] font-bold text-slate-900">{b.status}</span>
                  <span className="text-[11px] text-slate-600">({b.count}件)</span>
                </div>
                <div className="text-right">
                  <div className="text-[16px] font-bold text-slate-900">平均 {b.avg_days}日</div>
                  <div className="text-[10px] text-slate-600">最大 {b.max_days}日</div>
                </div>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={[
                    "h-full",
                    b.avg_days >= 14 ? "bg-rose-500" : b.avg_days >= 7 ? "bg-amber-500" : "bg-green-500",
                  ].join(" ")}
                  style={{ width: `${Math.min(100, (b.avg_days / 30) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* サイト別パフォーマンス */}
      <div className="rounded-lg border-2 border-slate-200 bg-white overflow-hidden">
        <div className="px-6 py-4 border-b-2 border-slate-200 bg-slate-50">
          <h2 className="text-[15px] font-bold text-slate-900">📊 サイト別パフォーマンス</h2>
          <p className="mt-1 text-[11px] text-slate-600">媒体ごとの応募数と審査通過率</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-600">媒体</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-600">求人数</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-600">応募数</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-600">応募/求人</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-600">審査通過率</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-600">NG率</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sitePerformance.map((s) => (
                <tr key={s.site_key} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                      {s.site_key}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[13px] font-semibold text-slate-900">{s.total_jobs}</td>
                  <td className="px-4 py-3 text-[13px] font-semibold text-slate-900">{s.applicants}</td>
                  <td className="px-4 py-3 text-[13px] text-slate-700">{s.applicants_per_job}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden max-w-[80px]">
                        <div
                          className="h-full bg-green-500"
                          style={{ width: `${s.approval_rate}%` }}
                        />
                      </div>
                      <span className="text-[12px] font-semibold text-slate-700">{s.approval_rate}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={[
                        "text-[13px] font-semibold",
                        s.rejection_rate > 30 ? "text-rose-700" : "text-slate-600",
                      ].join(" ")}
                    >
                      {s.rejection_rate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
