// src/components/deals/DealProfileDisplay.tsx
import Link from "next/link";
import { s } from "@/lib/deal-utils";

const UI = {
  PANEL: "rounded-md border-2 border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm",
  PANEL_HDR: "flex items-start justify-between gap-3 border-b-2 border-slate-200/80 dark:border-slate-700 px-4 py-3",
  PANEL_TITLE: "text-[13px] font-semibold text-slate-900 dark:text-slate-100",
  PANEL_SUB: "mt-0.5 text-[12px] text-slate-700/90 dark:text-slate-300 font-medium",
  PANEL_BODY: "px-4 py-3",
};

export function DealProfileDisplay({ profile, companyId }: { profile: any; companyId?: string | null }) {
  return (
    <section className={UI.PANEL}>
      <div className={UI.PANEL_HDR}>
        <div className="min-w-0">
          <div className={UI.PANEL_TITLE}>企業情報</div>
        </div>
      </div>

      <div className={UI.PANEL_BODY}>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {/* 提案条件 */}
          <div className="rounded-md border-2 border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900/50 px-3 py-3">
            <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">提案条件</div>
            <div className="mt-2 grid grid-cols-1 gap-2 text-[12px]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-600 dark:text-slate-400">プラン</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{s(profile.contract_plan) || "-"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-600 dark:text-slate-400">キャンペーン</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{s(profile.campaign_applied) || "-"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-600 dark:text-slate-400">MRR</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{s(profile.mrr) || "-"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-600 dark:text-slate-400">請求</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{s(profile.billing_cycle) || "-"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-600 dark:text-slate-400">支払</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{s(profile.payment_method) || "-"}</span>
              </div>
            </div>
          </div>

          {/* 採用要件 */}
          <div className="rounded-md border-2 border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900/50 px-3 py-3">
            <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">採用要件</div>
            <div className="mt-2 grid grid-cols-1 gap-2 text-[12px]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-600 dark:text-slate-400">目標</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{s(profile.hiring_goal) || "-"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-600 dark:text-slate-400">職種</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{s(profile.main_job_category) || "-"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-600 dark:text-slate-400">勤務地</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {s(profile.location_prefecture) || "-"} {s(profile.location_city) || ""}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-600 dark:text-slate-400">難易度</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{s(profile.hiring_difficulty) || "-"}</span>
              </div>
            </div>
          </div>

          {/* 連絡先 */}
          <div className="rounded-md border-2 border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900/50 px-3 py-3 lg:col-span-2">
            <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">決裁・連絡先</div>
            <div className="mt-2 grid grid-cols-1 gap-2 text-[12px] lg:grid-cols-2">
              <div>
                <div className="text-[11px] font-semibold tracking-wide text-slate-600 dark:text-slate-400">決裁者</div>
                <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                  {s(profile.decision_maker_title) || "-"} {s(profile.decision_maker_name) || ""}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold tracking-wide text-slate-600 dark:text-slate-400">運用窓口</div>
                <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                  {s(profile.primary_contact_title) || "-"} {s(profile.primary_contact_name) || ""}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold tracking-wide text-slate-600 dark:text-slate-400">メール</div>
                <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{s(profile.contact_email) || "-"}</div>
              </div>
              <div>
                <div className="text-[11px] font-semibold tracking-wide text-slate-600 dark:text-slate-400">電話</div>
                <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{s(profile.contact_phone) || "-"}</div>
              </div>
              <div>
                <div className="text-[11px] font-semibold tracking-wide text-slate-600 dark:text-slate-400">優先連絡</div>
                <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{s(profile.communication_preference) || "-"}</div>
              </div>
              <div>
                <div className="text-[11px] font-semibold tracking-wide text-slate-600 dark:text-slate-400">連絡可能</div>
                <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{s(profile.contact_hours) || "-"}</div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-end">
              {companyId ? (
                <Link
                  href={`/companies/${encodeURIComponent(companyId)}/record`}
                  className="cv-btn-secondary !px-3 !py-1.5 text-[12px] whitespace-nowrap"
                >
                  台帳で編集 →
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
