"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import ClientPortalLayout from "@/components/client/ClientPortalLayout";

type AnalyticsData = {
  totalApplicants: number;
  byStatus: Record<string, number>;
  bySource: Record<string, number>;
  byMonth: Array<{ month: string; count: number }>;
  feedback: {
    total: number;
    interviewResults: {
      pass: number;
      fail: number;
      pending: number;
      no_show: number;
    };
    failReasons: Record<string, number>;
    passStrengths: Record<string, number>;
    hireIntentions: Record<string, number>;
    ratingDistribution: Record<number, number>;
    interviewTypes: Record<string, { total: number; pass: number; fail: number }>;
    averageRating: number;
    interviewPassRate: number;
  };
  conversionRates: {
    applicationToScreening: number;
    screeningToInterview: number;
    interviewToOffer: number;
    overallConversion: number;
  };
  insights: Array<{
    type: "warning" | "info" | "success" | "tip";
    title: string;
    message: string;
  }>;
};

const FAIL_REASON_LABELS: Record<string, string> = {
  culture_mismatch: "社風に合わない",
  skill_shortage: "スキル不足",
  experience_lack: "経験不足",
  communication: "コミュニケーション面",
  motivation: "意欲・志望度が低い",
  salary_mismatch: "条件面（給与）",
  schedule_mismatch: "勤務条件が合わない",
  appearance: "身だしなみ・印象",
  overqualified: "オーバースペック",
  other: "その他",
};

const PASS_STRENGTH_LABELS: Record<string, string> = {
  experience: "経験・スキル",
  communication: "コミュニケーション力",
  motivation: "意欲・熱意",
  culture_fit: "社風との相性",
  personality: "人柄・誠実さ",
  flexibility: "柔軟性",
  leadership: "リーダーシップ",
  teamwork: "チームワーク",
};

const INTERVIEW_TYPE_LABELS: Record<string, string> = {
  first: "一次面接",
  second: "二次面接",
  final: "最終面接",
  casual: "カジュアル面談",
  trial: "体験入社",
};

const STATUS_LABELS: Record<string, string> = {
  NEW: "新規",
  DOC: "書類選考",
  INT: "面接",
  OFFER: "内定",
  内定: "内定",
  NG: "不採用",
};

export default function ClientAnalyticsPage() {
  const pathname = usePathname();
  const adminCompanyId = pathname?.match(/^\/client\/companies\/([^/]+)/)?.[1] ?? null;
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAnalytics() {
      setLoading(true);
      const qs = adminCompanyId ? `?companyId=${adminCompanyId}` : "";
      try {
        const res = await fetch(`/api/client/analytics${qs}`, { cache: "no-store" });
        const data = await res.json();
        if (data.ok) {
          setAnalytics(data.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, [adminCompanyId]);

  if (loading) {
    return (
      <ClientPortalLayout>
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-slate-200 dark:border-slate-700 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-sm text-slate-500 dark:text-slate-400">分析データを読み込み中...</p>
          </div>
        </div>
      </ClientPortalLayout>
    );
  }

  if (!analytics) {
    return (
      <ClientPortalLayout>
        <div className="text-center py-12">
          <p className="text-slate-600 dark:text-slate-300">分析データを取得できませんでした</p>
        </div>
      </ClientPortalLayout>
    );
  }

  const { feedback, conversionRates, insights } = analytics;

  return (
    <ClientPortalLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">採用分析</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            データに基づく採用活動の改善ポイントを把握
          </p>
        </div>

        {/* Insights Section */}
        {insights.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              改善のヒント
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {insights.map((insight, i) => (
                <div
                  key={i}
                  className={`rounded-xl p-4 border ${
                    insight.type === "warning"
                      ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                      : insight.type === "success"
                      ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
                      : insight.type === "tip"
                      ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                      : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                      insight.type === "warning"
                        ? "bg-amber-100 dark:bg-amber-900/40"
                        : insight.type === "success"
                        ? "bg-emerald-100 dark:bg-emerald-900/40"
                        : insight.type === "tip"
                        ? "bg-blue-100 dark:bg-blue-900/40"
                        : "bg-slate-100 dark:bg-slate-700"
                    }`}>
                      {insight.type === "warning" ? (
                        <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      ) : insight.type === "success" ? (
                        <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : insight.type === "tip" ? (
                        <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <h3 className={`text-sm font-semibold ${
                        insight.type === "warning"
                          ? "text-amber-800 dark:text-amber-200"
                          : insight.type === "success"
                          ? "text-emerald-800 dark:text-emerald-200"
                          : insight.type === "tip"
                          ? "text-blue-800 dark:text-blue-200"
                          : "text-slate-800 dark:text-slate-200"
                      }`}>
                        {insight.title}
                      </h3>
                      <p className={`text-xs mt-1 ${
                        insight.type === "warning"
                          ? "text-amber-700 dark:text-amber-300"
                          : insight.type === "success"
                          ? "text-emerald-700 dark:text-emerald-300"
                          : insight.type === "tip"
                          ? "text-blue-700 dark:text-blue-300"
                          : "text-slate-600 dark:text-slate-400"
                      }`}>
                        {insight.message}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30">
                <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">総応募数</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{analytics.totalApplicants}</p>
          </div>

          <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30">
                <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">面接通過率</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{feedback.interviewPassRate}%</p>
          </div>

          <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-900/30">
                <svg className="w-5 h-5 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">内定率</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{conversionRates.overallConversion}%</p>
          </div>

          <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30">
                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">平均評価</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              {feedback.averageRating > 0 ? feedback.averageRating.toFixed(1) : "-"}
            </p>
          </div>
        </div>

        {/* Conversion Funnel */}
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-5 flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            採用ファネル分析
          </h2>

          <div className="space-y-4">
            {[
              { label: "応募", count: analytics.totalApplicants, rate: 100, color: "bg-blue-500 dark:bg-blue-400" },
              { label: "書類選考", count: analytics.byStatus["DOC"] || 0, rate: conversionRates.applicationToScreening, color: "bg-violet-500 dark:bg-violet-400" },
              { label: "面接", count: analytics.byStatus["INT"] || 0, rate: conversionRates.screeningToInterview, color: "bg-amber-500 dark:bg-amber-400" },
              { label: "内定", count: (analytics.byStatus["OFFER"] || 0) + (analytics.byStatus["内定"] || 0), rate: conversionRates.interviewToOffer, color: "bg-emerald-500 dark:bg-emerald-400" },
            ].map((stage, i) => (
              <div key={stage.label}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className={`w-3 h-3 rounded-full ${stage.color}`}></span>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{stage.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{stage.count}名</span>
                    {i > 0 && (
                      <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                        (転換率 {stage.rate}%)
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${stage.color} rounded-full transition-all duration-700`}
                    style={{ width: `${Math.max(stage.rate, 2)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Fail Reasons */}
          <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">
              <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              不採用理由の分析
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              改善の機会を特定しましょう
            </p>

            {Object.keys(feedback.failReasons).length === 0 ? (
              <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">
                不採用のフィードバックデータがありません
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(feedback.failReasons)
                  .sort((a, b) => b[1] - a[1])
                  .map(([reason, count]) => {
                    const total = Object.values(feedback.failReasons).reduce((a, b) => a + b, 0);
                    const percentage = Math.round((count / total) * 100);
                    return (
                      <div key={reason}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm text-slate-700 dark:text-slate-200">
                            {FAIL_REASON_LABELS[reason] || reason}
                          </span>
                          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {count}件 <span className="text-slate-400 dark:text-slate-500 font-normal">({percentage}%)</span>
                          </span>
                        </div>
                        <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-red-400 dark:bg-red-500 rounded-full"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Pass Strengths */}
          <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              合格者の強み
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              採用成功のパターンを把握
            </p>

            {Object.keys(feedback.passStrengths).length === 0 ? (
              <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">
                合格者のフィードバックデータがありません
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(feedback.passStrengths)
                  .sort((a, b) => b[1] - a[1])
                  .map(([strength, count]) => {
                    const total = Object.values(feedback.passStrengths).reduce((a, b) => a + b, 0);
                    const percentage = Math.round((count / total) * 100);
                    return (
                      <div key={strength}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm text-slate-700 dark:text-slate-200">
                            {PASS_STRENGTH_LABELS[strength] || strength}
                          </span>
                          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {count}件 <span className="text-slate-400 dark:text-slate-500 font-normal">({percentage}%)</span>
                          </span>
                        </div>
                        <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-400 dark:bg-emerald-500 rounded-full"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Interview Results by Stage */}
          <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">
              <svg className="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              面接段階別の結果
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              どの段階で脱落が多いかを確認
            </p>

            {Object.keys(feedback.interviewTypes).length === 0 ? (
              <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">
                面接フィードバックデータがありません
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(feedback.interviewTypes).map(([type, data]) => {
                  const passRate = data.total > 0 ? Math.round((data.pass / data.total) * 100) : 0;
                  return (
                    <div key={type} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                          {INTERVIEW_TYPE_LABELS[type] || type}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {data.total}件実施
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden flex">
                          <div
                            className="h-full bg-emerald-500"
                            style={{ width: `${passRate}%` }}
                          ></div>
                          <div
                            className="h-full bg-red-400"
                            style={{ width: `${100 - passRate}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300 tabular-nums w-10 text-right">
                          {passRate}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-2 text-xs text-slate-500 dark:text-slate-400">
                        <span>合格 {data.pass}名</span>
                        <span>不合格 {data.fail}名</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Source Analysis */}
          <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              応募経路別分析
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              効果的な採用チャネルを特定
            </p>

            {Object.keys(analytics.bySource).length === 0 ? (
              <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">
                応募データがありません
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(analytics.bySource)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 6)
                  .map(([source, count]) => {
                    const percentage = Math.round((count / analytics.totalApplicants) * 100);
                    return (
                      <div key={source}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm text-slate-700 dark:text-slate-200">{source}</span>
                          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {count}名 <span className="text-slate-400 dark:text-slate-500 font-normal">({percentage}%)</span>
                          </span>
                        </div>
                        <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-400 dark:bg-blue-500 rounded-full"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>

        {/* Monthly Trend */}
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-5 flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            月別応募推移
          </h2>

          {analytics.byMonth.length === 0 ? (
            <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">
              データがありません
            </div>
          ) : (
            <div className="space-y-3">
              {analytics.byMonth.map(({ month, count }) => {
                const maxCount = Math.max(...analytics.byMonth.map(m => m.count));
                const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
                return (
                  <div key={month}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm text-slate-700 dark:text-slate-200">{month}</span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{count}件</span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-400 dark:bg-indigo-500 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Feedback Summary */}
        {feedback.total > 0 && (
          <div className="rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              面接フィードバック概要
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/10 rounded-lg p-4">
                <p className="text-xs text-slate-400 mb-1">総フィードバック数</p>
                <p className="text-2xl font-bold">{feedback.total}</p>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <p className="text-xs text-slate-400 mb-1">合格</p>
                <p className="text-2xl font-bold text-emerald-400">{feedback.interviewResults.pass}</p>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <p className="text-xs text-slate-400 mb-1">不合格</p>
                <p className="text-2xl font-bold text-red-400">{feedback.interviewResults.fail}</p>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <p className="text-xs text-slate-400 mb-1">無断欠席</p>
                <p className="text-2xl font-bold text-amber-400">{feedback.interviewResults.no_show}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </ClientPortalLayout>
  );
}
