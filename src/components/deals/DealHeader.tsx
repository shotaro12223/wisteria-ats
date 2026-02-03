// src/components/deals/DealHeader.tsx
"use client";

import Link from "next/link";
import { SavePill } from "./SavePill";
import type { SaveStatus } from "./types";

type DealRow = {
  id: string;
  company_id: string | null;
  kind: "new" | "existing";
  title: string;
  stage: string;
  start_date: string | null;
  due_date: string | null;
  amount: number | null;
  probability: number | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
};

type CompanyRow = {
  id: string;
  company_name: string;
  created_at: string;
  updated_at: string;
};

const UI = {
  PANEL: "rounded-md border-2 border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm",
  PANEL_HDR: "flex items-start justify-between gap-3 border-b-2 border-slate-200/80 dark:border-slate-700 px-4 py-3",
  LINK: "text-[12px] font-semibold text-indigo-700/95 dark:text-indigo-400 whitespace-nowrap hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline",
  BADGE: "inline-flex items-center rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300",
};

interface DealHeaderProps {
  deal: DealRow | null;
  company: CompanyRow | null;
  title: string;
  saveStatus: SaveStatus;
  saveError: string;
  isMeetingView: boolean;
  isShare: boolean;
  onSave: () => void;
}

function formatLocalDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function DealHeader({
  deal,
  company,
  title,
  saveStatus,
  saveError,
  isMeetingView,
  isShare,
  onSave,
}: DealHeaderProps) {
  const companyName = company?.company_name || "(会社名未設定)";

  // 共有モードでは最小限のヘッダー
  if (isShare) {
    return null;
  }

  return (
    <div className={[UI.PANEL, "bg-white/82 dark:bg-slate-800/82 backdrop-blur"].join(" ")}>
      <div className={UI.PANEL_HDR}>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[12px] text-slate-600 dark:text-slate-400">
            <Link href="/deals" className={UI.LINK}>
              商談
            </Link>
            <span className="text-slate-300 dark:text-slate-600">/</span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">{isMeetingView ? "商談中" : "詳細"}</span>
            <SavePill status={saveStatus} />

            {deal?.updated_at ? (
              <span className={UI.BADGE}>
                更新: <span className="ml-1 tabular-nums">{formatLocalDateTime(String(deal.updated_at))}</span>
              </span>
            ) : null}

            {isMeetingView ? (
              <span className={[UI.BADGE, "border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-200"].join(" ")}>
                view=meeting {isShare ? "(share)" : ""}
              </span>
            ) : null}
          </div>

          <div className="mt-1 text-[13px] font-semibold text-slate-900 dark:text-slate-100">
            {companyName}
            <span className="text-slate-400 dark:text-slate-500"> / </span>
            {title || "(商談名未設定)"}
          </div>

          {saveStatus === "error" ? (
            <div className="mt-2 text-[12px] text-rose-700 dark:text-rose-400">保存エラー: {saveError}</div>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {deal?.id ? (
            <>
              <Link
                href={`/deals/${encodeURIComponent(deal.id)}`}
                className="cv-btn-secondary !px-3 !py-1.5 text-[12px] whitespace-nowrap"
                title="通常表示"
              >
                通常
              </Link>
              <Link
                href={`/deals/${encodeURIComponent(deal.id)}?view=meeting`}
                className="cv-btn-secondary !px-3 !py-1.5 text-[12px] whitespace-nowrap"
                title="商談中表示"
              >
                商談中
              </Link>
              <Link
                href={`/deals/${encodeURIComponent(deal.id)}?view=meeting&share=1`}
                className="cv-btn-secondary !px-3 !py-1.5 text-[12px] whitespace-nowrap"
                title="共有向け（見せる画面）"
              >
                共有
              </Link>
            </>
          ) : null}

          {company?.id ? (
            <>
              <Link
                href={`/companies/${encodeURIComponent(company.id)}`}
                className="cv-btn-secondary !px-3 !py-1.5 text-[12px] whitespace-nowrap"
                title="会社サマリー"
              >
                会社へ
              </Link>
              <Link
                href={`/companies/${encodeURIComponent(company.id)}/record`}
                className="cv-btn-secondary !px-3 !py-1.5 text-[12px] whitespace-nowrap"
                title="台帳（company_records）"
              >
                台帳へ
              </Link>
            </>
          ) : null}

          <button
            type="button"
            className="cv-btn-primary whitespace-nowrap"
            onClick={onSave}
            disabled={saveStatus === "saving"}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
