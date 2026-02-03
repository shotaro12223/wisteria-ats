"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ClientPortalLayout from "@/components/client/ClientPortalLayout";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function CompanyClientAnalyticsPage() {
  const params = useParams();
  const companyId = params?.companyId as string;
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCompanyInfo() {
      if (!companyId) return;

      try {
        const supabase = supabaseBrowser();
        const { data: companyData } = await supabase
          .from("companies")
          .select("company_name")
          .eq("id", companyId)
          .single();

        if (companyData) {
          setCompanyName(companyData.company_name);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    loadCompanyInfo();
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
            <span>プレビューモード - {companyName} - 分析レポート</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-sky-600 to-cyan-600 bg-clip-text text-transparent">
              分析レポート
            </h1>
            <p className="text-slate-600 dark:text-slate-300 mt-1">採用活動の分析データ（閲覧専用）</p>
          </div>
        </div>

        <div className="rounded-2xl bg-gradient-to-r from-sky-50 to-cyan-50 border-2 border-sky-200/60 p-12 text-center shadow-lg">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-500 shadow-lg shadow-sky-500/30 mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <p className="text-slate-600 dark:text-slate-300 font-medium">分析レポート機能</p>
          <p className="text-sm text-slate-500 mt-2">プレビューモードでは表示されません</p>
        </div>
      </div>
    </ClientPortalLayout>
  );
}
