"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import ClientPortalLayout from "@/components/client/ClientPortalLayout";
import Link from "next/link";

type SiteStatusItem = {
  status: string;
  updatedAt: string;
  note?: string;
};

type Job = {
  id: string;
  job_title: string;
  company_name: string;
  employment_type: string;
  catch_copy?: string;
  job_category?: string;
  hiring_count?: string;

  // Location
  postal_code?: string;
  prefecture_city_town?: string;
  address_line?: string;
  building_floor?: string;
  nearest_station?: string;

  // Work
  work_hours?: string;
  break_time?: string;
  work_style?: string;
  overtime_hours?: string;

  // Pay
  pay_type?: string;
  pay_min?: number;
  pay_max?: number;
  gross_pay?: string;
  bonus?: string;
  raise?: string;
  annual_income_example?: string;

  // Time off
  holidays?: string;
  annual_holidays?: string;
  leave?: string;
  childcare_leave?: string;

  // Job details
  job_description?: string;
  qualifications?: string;
  education_experience?: string;
  appeal_points?: string;

  // Benefits
  benefits?: string;
  social_insurance?: string;
  passive_smoking?: string;

  // Probation
  probation?: string;
  probation_period?: string;
  probation_condition?: string;

  // Contact
  contact_email?: string;
  contact_phone?: string;

  // Site status
  site_status?: Record<string, SiteStatusItem>;

  created_at: string;
  updated_at: string;
};

const SITE_STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  "掲載中": { bg: "bg-emerald-50 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" },
  "準備中": { bg: "bg-amber-50 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300", dot: "bg-amber-500" },
  "媒体審査中": { bg: "bg-blue-50 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300", dot: "bg-blue-500" },
  "資料待ち": { bg: "bg-orange-50 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-300", dot: "bg-orange-500" },
  "停止中": { bg: "bg-slate-50 dark:bg-slate-700/50", text: "text-slate-600 dark:text-slate-400", dot: "bg-slate-400" },
  "NG": { bg: "bg-red-50 dark:bg-red-900/30", text: "text-red-700 dark:text-red-300", dot: "bg-red-500" },
};

function formatDate(isoString: string) {
  return new Date(isoString).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
        {icon}
        {title}
      </h2>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="py-3 border-b border-slate-100 dark:border-slate-700 last:border-b-0">
      <dt className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{label}</dt>
      <dd className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{value}</dd>
    </div>
  );
}

export default function ClientJobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const adminCompanyId = pathname?.match(/^\/client\/companies\/([^/]+)/)?.[1] ?? null;
  const linkBase = adminCompanyId ? `/client/companies/${adminCompanyId}` : "/client";
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadJob() {
      const id = params.id as string;
      setLoading(true);

      const res = await fetch(`/api/client/jobs/${id}`, { cache: "no-store" });

      if (res.ok) {
        const data = await res.json();
        if (data.ok) {
          setJob(data.data);
        } else {
          router.replace(`${linkBase}/jobs`);
        }
      } else {
        router.replace(`${linkBase}/jobs`);
      }

      setLoading(false);
    }

    if (params.id) {
      loadJob();
    }
  }, [params.id, router]);

  if (loading) {
    return (
      <ClientPortalLayout>
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-slate-200 dark:border-slate-700 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-sm text-slate-500 dark:text-slate-400">読み込み中...</p>
          </div>
        </div>
      </ClientPortalLayout>
    );
  }

  if (!job) {
    return (
      <ClientPortalLayout>
        <div className="text-center py-12">
          <p className="text-slate-600 dark:text-slate-300">求人が見つかりません</p>
        </div>
      </ClientPortalLayout>
    );
  }

  const siteStatusEntries = job.site_status ? Object.entries(job.site_status) : [];
  const activeSites = siteStatusEntries.filter(([, s]) => s.status === "掲載中");
  const otherSites = siteStatusEntries.filter(([, s]) => s.status !== "掲載中");

  const address = [job.prefecture_city_town, job.address_line, job.building_floor].filter(Boolean).join(" ");

  return (
    <ClientPortalLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Link href={`${linkBase}/jobs`} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            求人一覧
          </Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-slate-700 dark:text-slate-200 font-medium truncate">{job.job_title || "無題"}</span>
        </div>

        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 rounded-2xl p-6 md:p-8 text-white shadow-xl">
          {job.catch_copy && (
            <p className="text-indigo-200 text-sm mb-2">{job.catch_copy}</p>
          )}
          <h1 className="text-2xl md:text-3xl font-bold mb-4">{job.job_title || "無題"}</h1>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            {job.employment_type && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/20 backdrop-blur-sm">
                {job.employment_type}
              </span>
            )}
            {job.job_category && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/20 backdrop-blur-sm">
                {job.job_category}
              </span>
            )}
            {job.hiring_count && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/20 backdrop-blur-sm">
                募集: {job.hiring_count}
              </span>
            )}
          </div>

          {job.gross_pay && (
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-lg font-semibold">{job.pay_type} {job.gross_pay}</span>
            </div>
          )}
        </div>

        {/* Site Status */}
        {siteStatusEntries.length > 0 && (
          <Section
            title="掲載媒体ステータス"
            icon={
              <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
              </svg>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[...activeSites, ...otherSites].map(([siteName, siteStatus]) => {
                const colors = SITE_STATUS_COLORS[siteStatus.status] || SITE_STATUS_COLORS["停止中"];
                return (
                  <div
                    key={siteName}
                    className={`rounded-lg p-4 ${colors.bg} border border-slate-200/50 dark:border-slate-700/50`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{siteName}</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${colors.dot}`}></span>
                        <span className={`text-xs font-medium ${colors.text}`}>{siteStatus.status}</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      更新: {formatDate(siteStatus.updatedAt)}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="flex flex-wrap gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-slate-600 dark:text-slate-400">掲載中: {activeSites.length}媒体</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span className="text-slate-600 dark:text-slate-400">準備中/審査中: {siteStatusEntries.filter(([, s]) => s.status === "準備中" || s.status === "媒体審査中").length}媒体</span>
                </div>
              </div>
            </div>
          </Section>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* No Content Notice */}
            {!job.job_description && !job.qualifications && !job.appeal_points && (
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
                <svg className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">求人詳細コンテンツ準備中</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  求人原稿の詳細内容はまもなく公開されます。<br />
                  現在は掲載媒体ステータスをご確認いただけます。
                </p>
              </div>
            )}

            {/* Job Description */}
            {job.job_description && (
              <Section
                title="仕事内容"
                icon={
                  <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
                  </svg>
                }
              >
                <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {job.job_description}
                </div>
              </Section>
            )}

            {/* Qualifications */}
            {job.qualifications && (
              <Section
                title="応募資格"
                icon={
                  <svg className="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                  </svg>
                }
              >
                <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {job.qualifications}
                </div>
                {job.education_experience && (
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">学歴: </span>
                    <span className="text-sm text-slate-700 dark:text-slate-300">{job.education_experience}</span>
                  </div>
                )}
              </Section>
            )}

            {/* Appeal Points */}
            {job.appeal_points && (
              <Section
                title="この求人の魅力"
                icon={
                  <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                  </svg>
                }
              >
                <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {job.appeal_points}
                </div>
              </Section>
            )}
          </div>

          {/* Right Column - Details */}
          <div className="space-y-6">
            {/* Working Conditions */}
            <Section
              title="勤務条件"
              icon={
                <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            >
              <dl className="divide-y divide-slate-100 dark:divide-slate-700">
                <InfoRow label="勤務地" value={address} />
                <InfoRow label="最寄り駅" value={job.nearest_station} />
                <InfoRow label="勤務時間" value={job.work_hours} />
                <InfoRow label="休憩時間" value={job.break_time} />
                <InfoRow label="勤務形態" value={job.work_style} />
                <InfoRow label="残業" value={job.overtime_hours} />
              </dl>
            </Section>

            {/* Salary */}
            <Section
              title="給与・待遇"
              icon={
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            >
              <dl className="divide-y divide-slate-100 dark:divide-slate-700">
                <InfoRow label="給与" value={job.gross_pay ? `${job.pay_type || ""} ${job.gross_pay}` : undefined} />
                <InfoRow label="賞与" value={job.bonus} />
                <InfoRow label="昇給" value={job.raise} />
                <InfoRow label="年収例" value={job.annual_income_example} />
              </dl>
            </Section>

            {/* Time Off */}
            <Section
              title="休日・休暇"
              icon={
                <svg className="w-4 h-4 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
              }
            >
              <dl className="divide-y divide-slate-100 dark:divide-slate-700">
                <InfoRow label="休日" value={job.holidays} />
                <InfoRow label="年間休日" value={job.annual_holidays} />
                <InfoRow label="休暇" value={job.leave} />
                <InfoRow label="育児休暇" value={job.childcare_leave} />
              </dl>
            </Section>

            {/* Benefits */}
            {(job.benefits || job.social_insurance) && (
              <Section
                title="福利厚生"
                icon={
                  <svg className="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                  </svg>
                }
              >
                <dl className="divide-y divide-slate-100 dark:divide-slate-700">
                  <InfoRow label="福利厚生" value={job.benefits} />
                  <InfoRow label="社会保険" value={job.social_insurance} />
                  <InfoRow label="受動喫煙対策" value={job.passive_smoking} />
                </dl>
              </Section>
            )}

            {/* Probation */}
            {job.probation === "あり" && (
              <Section
                title="試用期間"
                icon={
                  <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                }
              >
                <dl className="divide-y divide-slate-100 dark:divide-slate-700">
                  <InfoRow label="試用期間" value={job.probation_period} />
                  <InfoRow label="試用期間中の条件" value={job.probation_condition} />
                </dl>
              </Section>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                この求人についてのご質問は、Wisteriaの担当者までお問い合わせください。
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                最終更新: {formatDate(job.updated_at)}
              </p>
            </div>
            <Link
              href={`${linkBase}/applicants`}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
              応募者を見る
            </Link>
          </div>
        </div>
      </div>
    </ClientPortalLayout>
  );
}
