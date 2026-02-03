"use client";

import { useEffect, useState } from "react";
import ClientPortalLayout from "@/components/client/ClientPortalLayout";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Job = {
  id: string;
  job_title: string;
  employment_type: string;
  site_status: any;
  created_at: string;
  updated_at: string;
};

export default function ClientJobsPage() {
  const pathname = usePathname();
  const adminCompanyId = pathname?.match(/^\/client\/companies\/([^/]+)/)?.[1] ?? null;
  const linkBase = adminCompanyId ? `/client/companies/${adminCompanyId}` : "/client";
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadJobs() {
      setLoading(true);
      const qs = adminCompanyId ? `?companyId=${adminCompanyId}` : "";
      const res = await fetch(`/api/client/jobs${qs}`, { cache: "no-store" });

      if (res.ok) {
        const data = await res.json();
        if (data.ok) {
          setJobs(data.data || []);
        }
      }

      setLoading(false);
    }

    loadJobs();
  }, [adminCompanyId]);

  if (loading) {
    return (
      <ClientPortalLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-slate-600 dark:text-slate-300">読み込み中...</div>
        </div>
      </ClientPortalLayout>
    );
  }

  return (
    <ClientPortalLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-sky-600 to-cyan-600 bg-clip-text text-transparent">
              求人一覧
            </h1>
            <p className="text-slate-600 dark:text-slate-300 mt-1">掲載中の求人情報（閲覧専用）</p>
          </div>
        </div>

        {jobs.length === 0 ? (
          <div className="rounded-2xl bg-gradient-to-r from-sky-50 to-cyan-50 border-2 border-sky-200/60 p-12 text-center shadow-lg">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-500 shadow-lg shadow-sky-500/30 mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <p className="text-slate-600 dark:text-slate-300">求人情報がありません</p>
            <p className="text-sm text-slate-500 mt-2">Wisteriaの担当者にお問い合わせください</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {jobs.map((job) => (
              <Link
                key={job.id}
                href={`${linkBase}/jobs/${job.id}`}
                className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700/60 p-6 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-sky-500/5 to-transparent rounded-full -mr-16 -mt-16"></div>

                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 group-hover:text-sky-600 transition-colors duration-200 mb-2">
                        {job.job_title || "無題"}
                      </h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-sky-100 to-cyan-100 text-sky-700 border border-sky-200">
                          {job.employment_type || "未設定"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 shadow-lg shadow-sky-500/30 group-hover:scale-110 transition-transform duration-200">
                      <svg
                        className="w-5 h-5 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <span>作成日: {new Date(job.created_at).toLocaleDateString("ja-JP")}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </ClientPortalLayout>
  );
}
