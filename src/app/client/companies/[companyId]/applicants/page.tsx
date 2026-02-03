"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ClientPortalLayout from "@/components/client/ClientPortalLayout";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type Applicant = {
  id: string;
  company_id: string;
  job_id: string;
  name: string;
  status: string;
  applied_at: string;
  site_key: string;
  created_at: string;
  updated_at: string;
  shared_with_client: boolean;
  shared_at: string | null;
  client_comment: string | null;
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  NEW: { label: "新規", color: "bg-blue-100 text-blue-700 border-blue-200" },
  DOC: { label: "書類選考", color: "bg-purple-100 text-purple-700 border-purple-200" },
  資料待ち: { label: "資料待ち", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  INT: { label: "面接", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  媒体審査中: { label: "媒体審査中", color: "bg-orange-100 text-orange-700 border-orange-200" },
  OFFER: { label: "内定", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  内定: { label: "内定", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  NG: { label: "不採用", color: "bg-slate-100 dark:bg-slate-700 text-slate-700 border-slate-200 dark:border-slate-700" },
};

export default function CompanyClientApplicantsPage() {
  const params = useParams();
  const companyId = params?.companyId as string;

  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState("");

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

        // Load applicants for this company
        const res = await fetch(`/api/client/applicants?companyId=${companyId}`, { cache: "no-store" });

        if (res.ok) {
          const data = await res.json();
          if (data.ok) {
            setApplicants(data.data || []);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [companyId]);

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
        {/* Preview Banner */}
        <div className="bg-amber-500 text-white py-3 px-4 rounded-lg text-center font-semibold shadow-lg">
          <div className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span>プレビューモード - {companyName} - 応募者一覧</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-sky-600 to-cyan-600 bg-clip-text text-transparent">
              応募者一覧
            </h1>
            <p className="text-slate-600 dark:text-slate-300 mt-1">応募者情報（閲覧専用）</p>
          </div>
        </div>

        {applicants.length === 0 ? (
          <div className="rounded-2xl bg-gradient-to-r from-sky-50 to-cyan-50 border-2 border-sky-200/60 p-12 text-center shadow-lg">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-500 shadow-lg shadow-sky-500/30 mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <p className="text-slate-600 dark:text-slate-300">応募者がいません</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      氏名
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      ステータス
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      応募日
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      応募元
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {applicants.map((applicant) => {
                    const statusInfo = STATUS_LABELS[applicant.status] || {
                      label: applicant.status,
                      color: "bg-slate-100 text-slate-700 border-slate-200",
                    };

                    return (
                      <tr
                        key={applicant.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            href={`/client/applicants/${applicant.id}`}
                            className="text-sm font-medium text-sky-600 hover:text-sky-700 hover:underline"
                          >
                            {applicant.name || "無名"}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusInfo.color}`}
                          >
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                          {new Date(applicant.applied_at).toLocaleDateString("ja-JP")}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                          {applicant.site_key || "未設定"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </ClientPortalLayout>
  );
}
