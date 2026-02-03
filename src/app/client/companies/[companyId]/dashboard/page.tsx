"use client";

import { useParams, redirect } from "next/navigation";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import ClientPortalLayout from "@/components/client/ClientPortalLayout";
import Link from "next/link";

type Applicant = {
  id: string;
  name: string;
  status: string;
  applied_at: string;
  site_key: string;
  job_id: string;
  created_at: string;
};

type Job = {
  id: string;
  job_title: string;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  NEW: { label: "新規", color: "text-blue-700", bg: "bg-blue-50 dark:bg-blue-900/30" },
  DOC: { label: "書類選考", color: "text-violet-700", bg: "bg-violet-50 dark:bg-violet-900/30" },
  資料待ち: { label: "資料待ち", color: "text-amber-700", bg: "bg-amber-50 dark:bg-amber-900/30" },
  INT: { label: "面接", color: "text-indigo-700", bg: "bg-indigo-50 dark:bg-indigo-900/30" },
  媒体審査中: { label: "媒体審査中", color: "text-orange-700", bg: "bg-orange-50 dark:bg-orange-900/30" },
  OFFER: { label: "内定", color: "text-emerald-700", bg: "bg-emerald-50 dark:bg-emerald-900/30" },
  内定: { label: "内定", color: "text-emerald-700", bg: "bg-emerald-50 dark:bg-emerald-900/30" },
  NG: { label: "不採用", color: "text-slate-600 dark:text-slate-300", bg: "bg-slate-100 dark:bg-slate-700" },
};

export default function CompanyClientDashboardPage() {
  const params = useParams();
  const companyId = params?.companyId as string;

  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function loadData() {
      if (!companyId) return;

      setLoading(true);
      try {
        // Load company info
        const supabase = supabaseBrowser();
        const { data: companyData } = await supabase
          .from("companies")
          .select("company_name")
          .eq("id", companyId)
          .single();

        if (companyData) {
          setCompanyName(companyData.company_name);
        }

        // Load applicants and jobs for this company
        const [applicantsRes, jobsRes] = await Promise.all([
          fetch(`/api/client/applicants?companyId=${companyId}`, { cache: "no-store" }),
          fetch(`/api/client/jobs?companyId=${companyId}`, { cache: "no-store" }),
        ]);

        let applicantsData: Applicant[] = [];
        let jobsData: Job[] = [];

        if (applicantsRes.ok) {
          const data = await applicantsRes.json();
          if (data.ok && data.data) applicantsData = data.data;
        }

        if (jobsRes.ok) {
          const data = await jobsRes.json();
          if (data.ok && data.data) jobsData = data.data;
        }

        setApplicants(applicantsData);
        setJobs(jobsData);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [companyId]);

  // Calculate stats from applicants
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  const thisMonthApplicants = applicants.filter(
    (a) => new Date(a.applied_at) >= thisMonthStart
  );
  const lastMonthApplicants = applicants.filter(
    (a) => new Date(a.applied_at) >= lastMonthStart && new Date(a.applied_at) <= lastMonthEnd
  );

  const monthChange =
    lastMonthApplicants.length > 0
      ? Math.round(
          ((thisMonthApplicants.length - lastMonthApplicants.length) /
            lastMonthApplicants.length) *
            100
        )
      : 0;

  const inProgress = applicants.filter(
    (a) => a.status !== "NG" && a.status !== "OFFER" && a.status !== "内定"
  ).length;

  const offers = applicants.filter((a) => a.status === "OFFER" || a.status === "内定").length;
  const offerRate = applicants.length > 0 ? Math.round((offers / applicants.length) * 100) : 0;

  const newApplicants = applicants.filter((a) => a.status === "NEW").length;
  const interviews = applicants.filter((a) => a.status === "INT").length;

  // Calculate average days to hire
  const hiredApplicants = applicants.filter((a) => a.status === "OFFER" || a.status === "内定");
  const avgDaysToHire =
    hiredApplicants.length > 0
      ? Math.round(
          hiredApplicants.reduce((sum, a) => {
            const days = Math.floor(
              (new Date().getTime() - new Date(a.applied_at).getTime()) / (1000 * 60 * 60 * 24)
            );
            return sum + days;
          }, 0) / hiredApplicants.length
        )
      : 0;

  // Group by source
  const bySource: Record<string, number> = {};
  applicants.forEach((a) => {
    const source = a.site_key || "不明";
    bySource[source] = (bySource[source] || 0) + 1;
  });

  // Recent applicants (last 5)
  const recentApplicants = [...applicants]
    .sort((a, b) => new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime())
    .slice(0, 5);

  // Weekly trend (last 7 days)
  const weeklyTrend = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(now);
    date.setDate(date.getDate() - (6 - i));
    date.setHours(0, 0, 0, 0);
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    return applicants.filter((a) => {
      const appliedDate = new Date(a.applied_at);
      return appliedDate >= date && appliedDate < nextDate;
    }).length;
  });

  // Recruitment funnel
  const funnel = {
    applied: applicants.length,
    screening: applicants.filter((a) => a.status === "DOC" || a.status === "資料待ち").length,
    interview: applicants.filter((a) => a.status === "INT" || a.status === "媒体審査中").length,
    offer: offers,
  };

  const greeting = currentTime.getHours() < 12 ? "おはようございます" : currentTime.getHours() < 18 ? "こんにちは" : "お疲れ様です";
  const maxWeekly = Math.max(...weeklyTrend, 1);
  const weekDays = ["日", "月", "火", "水", "木", "金", "土"];

  if (loading) {
    return (
      <ClientPortalLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 rounded-full border-2 border-slate-200"></div>
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-indigo-600 animate-spin"></div>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">読み込み中</p>
          </div>
        </div>
      </ClientPortalLayout>
    );
  }

  return (
    <ClientPortalLayout>
      <div className="space-y-6">
        {/* Preview Banner */}
        <div className="bg-amber-500 text-white py-3 px-4 rounded-lg text-center font-semibold shadow-lg">
          <div className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span>プレビューモード - {companyName}</span>
          </div>
        </div>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 mb-1">{greeting}</p>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
              採用状況サマリー
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-slate-400 dark:text-slate-500 tabular-nums">
              {currentTime.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" })}
            </span>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Monthly Applications */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200/60 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                <svg className="w-[18px] h-[18px] text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              </div>
              {monthChange !== 0 && (
                <div className={`flex items-center gap-0.5 text-[11px] font-medium ${monthChange >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  <svg className={`w-3 h-3 ${monthChange < 0 ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
                  </svg>
                  {Math.abs(monthChange)}%
                </div>
              )}
            </div>
            <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{thisMonthApplicants.length}</p>
            <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-1">今月の応募</p>
          </div>

          {/* In Progress */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200/60 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
                <svg className="w-[18px] h-[18px] text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{inProgress}</p>
            <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-1">選考中</p>
          </div>

          {/* Offers */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200/60 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                <svg className="w-[18px] h-[18px] text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{offers}</p>
            <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-1">内定</p>
          </div>

          {/* Conversion Rate */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200/60 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center">
                <svg className="w-[18px] h-[18px] text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{offerRate}<span className="text-base text-slate-400 dark:text-slate-500 ml-0.5">%</span></p>
            <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-1">内定率</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="xl:col-span-2 space-y-6">
            {/* Weekly Trend */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200/60 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">週間応募推移</h2>
                  <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">過去7日間</p>
                </div>
                <div className="flex items-center gap-2 text-[12px]">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 dark:bg-indigo-400"></span>
                  <span className="text-slate-500 dark:text-slate-400">応募数</span>
                </div>
              </div>

              <div className="flex items-end justify-between h-36 gap-3">
                {weeklyTrend.map((count, i) => {
                  const height = maxWeekly > 0 ? (count / maxWeekly) * 100 : 0;
                  const date = new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000);
                  const isToday = i === 6;
                  const dayName = weekDays[date.getDay()];

                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                      <div className="w-full flex flex-col items-center justify-end h-28">
                        {count > 0 && (
                          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1.5 opacity-0 group-hover:opacity-100 transition-opacity">{count}</span>
                        )}
                        <div
                          className={`w-full max-w-[36px] rounded-md transition-all duration-300 ${
                            isToday ? "bg-indigo-500 dark:bg-indigo-400" : "bg-slate-200 dark:bg-slate-600 group-hover:bg-slate-300"
                          }`}
                          style={{ height: `${Math.max(height, 8)}%`, minHeight: "4px" }}
                        />
                      </div>
                      <div className="flex flex-col items-center">
                        <span className={`text-[11px] ${isToday ? "text-indigo-600 font-semibold" : "text-slate-400 dark:text-slate-500"}`}>
                          {dayName}
                        </span>
                        <span className={`text-[10px] ${isToday ? "text-indigo-500" : "text-slate-300"}`}>
                          {date.getDate()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recruitment Funnel */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200/60 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">採用ファネル</h2>
                  <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">選考プロセス別の応募者数</p>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { label: "応募", value: funnel.applied, color: "bg-blue-500 dark:bg-blue-400" },
                  { label: "書類選考", value: funnel.screening, color: "bg-violet-500 dark:bg-violet-400" },
                  { label: "面接", value: funnel.interview, color: "bg-amber-500 dark:bg-amber-400" },
                  { label: "内定", value: funnel.offer, color: "bg-emerald-500 dark:bg-emerald-400" },
                ].map((stage, i) => {
                  const width = funnel.applied > 0 ? (stage.value / funnel.applied) * 100 : 0;
                  const rate = i > 0 && funnel.applied > 0 ? Math.round(width) : null;

                  return (
                    <div key={stage.label}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-medium text-slate-700 dark:text-slate-200">{stage.label}</span>
                          {rate !== null && (
                            <span className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">({rate}%)</span>
                          )}
                        </div>
                        <span className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{stage.value}</span>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${stage.color} rounded-full transition-all duration-500`}
                          style={{ width: `${i === 0 ? 100 : Math.max(width, 0)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Applicants */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between p-6 pb-4">
                <div>
                  <h2 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">最近の応募者</h2>
                  <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">直近の応募</p>
                </div>
              </div>

              {recentApplicants.length === 0 ? (
                <div className="px-6 pb-6">
                  <div className="text-center py-10 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-3">
                      <svg className="w-5 h-5 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                      </svg>
                    </div>
                    <p className="text-[13px] text-slate-500 dark:text-slate-400">応募者がいません</p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {recentApplicants.map((applicant) => {
                    const statusConfig = STATUS_CONFIG[applicant.status] || { label: applicant.status, color: "text-slate-600 dark:text-slate-300", bg: "bg-slate-100 dark:bg-slate-700" };
                    const job = jobs.find((j) => j.id === applicant.job_id);
                    const initial = applicant.name.charAt(0);

                    return (
                      <div
                        key={applicant.id}
                        className="flex items-center justify-between px-6 py-4"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                            <span className="text-[13px] font-semibold text-slate-600 dark:text-slate-300">{initial}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-medium text-slate-900 dark:text-slate-100 truncate">
                              {applicant.name}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              {job?.job_title || "求人未設定"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className={`px-2 py-1 text-[11px] font-medium rounded-md ${statusConfig.bg} ${statusConfig.color}`}>
                            {statusConfig.label}
                          </span>
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
                            {new Date(applicant.applied_at).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200/60 dark:border-slate-700 shadow-sm">
              <h3 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100 mb-4">概要</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2">
                  <span className="text-[13px] text-slate-600 dark:text-slate-300">累計応募者数</span>
                  <span className="text-[15px] font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{applicants.length}</span>
                </div>
                <div className="border-t border-slate-100 dark:border-slate-700"></div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-[13px] text-slate-600 dark:text-slate-300">新規応募</span>
                  <span className="text-[15px] font-semibold text-blue-600 tabular-nums">{newApplicants}</span>
                </div>
                <div className="border-t border-slate-100 dark:border-slate-700"></div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-[13px] text-slate-600 dark:text-slate-300">面接予定</span>
                  <span className="text-[15px] font-semibold text-amber-600 tabular-nums">{interviews}</span>
                </div>
                <div className="border-t border-slate-100 dark:border-slate-700"></div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-[13px] text-slate-600 dark:text-slate-300">平均採用日数</span>
                  <span className="text-[15px] font-semibold text-violet-600 tabular-nums">
                    {avgDaysToHire > 0 ? `${avgDaysToHire}日` : "-"}
                  </span>
                </div>
              </div>
            </div>

            {/* Source Breakdown */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200/60 dark:border-slate-700 shadow-sm">
              <h3 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100 mb-4">応募経路</h3>
              {Object.keys(bySource).length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-[13px] text-slate-500 dark:text-slate-400">データがありません</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(bySource)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 6)
                    .map(([source, count]) => {
                      const percentage = applicants.length > 0 ? Math.round((count / applicants.length) * 100) : 0;
                      return (
                        <div key={source}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[12px] text-slate-600 dark:text-slate-300 truncate">{source}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[12px] text-slate-400 dark:text-slate-500 tabular-nums">{percentage}%</span>
                              <span className="text-[12px] font-semibold text-slate-900 dark:text-slate-100 tabular-nums w-6 text-right">{count}</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 dark:bg-indigo-400 rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ClientPortalLayout>
  );
}
