// src/components/deals/DealProfileEditor.tsx
"use client";

import { SavePill } from "./SavePill";
import type { SaveStatus } from "./types";
import NumberInput from "@/components/NumberInput";

const UI = {
  PANEL: "rounded-md border-2 border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm",
  PANEL_HDR: "flex items-start justify-between gap-3 border-b-2 border-slate-200/80 dark:border-slate-700 px-4 py-3",
  PANEL_TITLE: "text-[13px] font-semibold text-slate-900 dark:text-slate-100",
  PANEL_SUB: "mt-0.5 text-[12px] text-slate-700/90 dark:text-slate-300 font-medium",
  PANEL_BODY: "px-4 py-3",
  LABEL: "text-[11px] font-semibold tracking-wide text-slate-600 dark:text-slate-400",
  INPUT: [
    "w-full rounded-md border-2 border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2",
    "text-[13px] text-slate-900 dark:text-slate-100",
    "outline-none",
    "focus:border-indigo-300 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200/40 dark:focus:ring-indigo-500/40",
  ].join(" "),
  TEXTAREA: [
    "w-full rounded-md border-2 border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2",
    "text-[13px] text-slate-900 dark:text-slate-100",
    "outline-none",
    "focus:border-indigo-300 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200/40 dark:focus:ring-indigo-500/40",
    "min-h-[120px] resize-y",
  ].join(" "),
  CTA_GHOST: [
    "inline-flex items-center justify-center rounded-md",
    "px-3 py-2",
    "text-[13px] font-semibold",
    "border-2 border-slate-200/80 dark:border-slate-700",
    "bg-white dark:bg-slate-900/50",
    "text-slate-800 dark:text-slate-200",
    "hover:bg-slate-50 dark:hover:bg-slate-700",
  ].join(" "),
};

const HIRING_DIFFICULTY = [
  { value: "", label: "未設定" },
  { value: "低", label: "低" },
  { value: "中", label: "中" },
  { value: "高", label: "高" },
];

const COMM_PREF = [
  { value: "", label: "未設定" },
  { value: "電話", label: "電話" },
  { value: "メール", label: "メール" },
  { value: "LINE", label: "LINE" },
  { value: "チャット", label: "チャット" },
];

interface ProfileFields {
  contractPlan: string;
  campaignApplied: string;
  mrr: string;
  billingCycle: string;
  paymentMethod: string;
  locationCity: string;
  hiringDifficulty: string;
  decisionMakerName: string;
  primaryContactTitle: string;
  primaryContactName: string;
  contactEmail: string;
  contactPhone: string;
  communicationPreference: string;
  contactHours: string;
  acquisitionSourceType: string;
  acquisitionSourceDetail: string;
  ngNotes: string;
  notesInternal: string;
}

interface DealProfileEditorProps {
  isOpen: boolean;
  saveStatus: SaveStatus;
  saveError: string;
  fields: ProfileFields;
  onToggle: () => void;
  onSave: () => void;
  onChange: (field: keyof ProfileFields, value: string) => void;
}

export function DealProfileEditor({
  isOpen,
  saveStatus,
  saveError,
  fields,
  onToggle,
  onSave,
  onChange,
}: DealProfileEditorProps) {
  return (
    <section className={UI.PANEL}>
      <div className={UI.PANEL_HDR}>
        <div className="min-w-0">
          <div className={UI.PANEL_TITLE}>企業情報補完（編集）</div>
          <div className={UI.PANEL_SUB}>
            商談中に必要な情報を追記。company_records.profile に保存されます。
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <SavePill status={saveStatus} />
          <button
            type="button"
            className={UI.CTA_GHOST}
            onClick={onToggle}
            aria-expanded={isOpen}
          >
            {isOpen ? "閉じる" : "開く"}
          </button>
        </div>
      </div>

      {isOpen ? (
        <div className={UI.PANEL_BODY}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* 提案条件 */}
            <div className="sm:col-span-2">
              <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">提案条件</div>
            </div>

            <div>
              <div className={UI.LABEL}>契約プラン</div>
              <input
                className={UI.INPUT}
                value={fields.contractPlan}
                onChange={(e) => onChange("contractPlan", e.target.value)}
                placeholder="例）Standard / Pro"
              />
            </div>

            <div>
              <div className={UI.LABEL}>キャンペーン</div>
              <input
                className={UI.INPUT}
                value={fields.campaignApplied}
                onChange={(e) => onChange("campaignApplied", e.target.value)}
                placeholder="例）初月無料"
              />
            </div>

            <div>
              <div className={UI.LABEL}>MRR</div>
              <NumberInput
                className={UI.INPUT}
                value={fields.mrr}
                onChange={(v) => onChange("mrr", v)}
                placeholder="例）150000"
                min="0"
              />
            </div>

            <div>
              <div className={UI.LABEL}>請求サイクル</div>
              <input
                className={UI.INPUT}
                value={fields.billingCycle}
                onChange={(e) => onChange("billingCycle", e.target.value)}
                placeholder="例）月払い / 年払い"
              />
            </div>

            <div>
              <div className={UI.LABEL}>支払方法</div>
              <input
                className={UI.INPUT}
                value={fields.paymentMethod}
                onChange={(e) => onChange("paymentMethod", e.target.value)}
                placeholder="例）請求書 / カード"
              />
            </div>

            {/* 採用要件詳細 */}
            <div className="sm:col-span-2 pt-2">
              <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">採用要件詳細</div>
            </div>

            <div>
              <div className={UI.LABEL}>勤務地（市区）</div>
              <input
                className={UI.INPUT}
                value={fields.locationCity}
                onChange={(e) => onChange("locationCity", e.target.value)}
                placeholder="例）大阪市住之江区"
              />
            </div>

            <div>
              <div className={UI.LABEL}>採用難易度</div>
              <select className={UI.INPUT} value={fields.hiringDifficulty} onChange={(e) => onChange("hiringDifficulty", e.target.value)}>
                {HIRING_DIFFICULTY.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* 連絡先 */}
            <div className="sm:col-span-2 pt-2">
              <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">連絡先詳細</div>
            </div>

            <div>
              <div className={UI.LABEL}>決裁者 氏名</div>
              <input
                className={UI.INPUT}
                value={fields.decisionMakerName}
                onChange={(e) => onChange("decisionMakerName", e.target.value)}
                placeholder="例）山田 太郎"
              />
            </div>

            <div>
              <div className={UI.LABEL}>運用窓口 役職</div>
              <input
                className={UI.INPUT}
                value={fields.primaryContactTitle}
                onChange={(e) => onChange("primaryContactTitle", e.target.value)}
                placeholder="例）採用担当"
              />
            </div>

            <div>
              <div className={UI.LABEL}>運用窓口 氏名</div>
              <input
                className={UI.INPUT}
                value={fields.primaryContactName}
                onChange={(e) => onChange("primaryContactName", e.target.value)}
                placeholder="例）鈴木 花子"
              />
            </div>

            <div>
              <div className={UI.LABEL}>連絡メール</div>
              <input
                className={UI.INPUT}
                value={fields.contactEmail}
                onChange={(e) => onChange("contactEmail", e.target.value)}
                placeholder="example@company.com"
              />
            </div>

            <div>
              <div className={UI.LABEL}>連絡電話</div>
              <input
                className={UI.INPUT}
                value={fields.contactPhone}
                onChange={(e) => onChange("contactPhone", e.target.value)}
                placeholder="03-xxxx-xxxx"
              />
            </div>

            <div>
              <div className={UI.LABEL}>連絡手段の優先</div>
              <select className={UI.INPUT} value={fields.communicationPreference} onChange={(e) => onChange("communicationPreference", e.target.value)}>
                {COMM_PREF.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <div className={UI.LABEL}>連絡可能時間帯</div>
              <input
                className={UI.INPUT}
                value={fields.contactHours}
                onChange={(e) => onChange("contactHours", e.target.value)}
                placeholder="例）平日 10:00-17:00"
              />
            </div>

            {/* 社内専用 */}
            <div className="sm:col-span-2 pt-2">
              <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">社内専用</div>
            </div>

            <div>
              <div className={UI.LABEL}>獲得元種別</div>
              <input
                className={UI.INPUT}
                value={fields.acquisitionSourceType}
                onChange={(e) => onChange("acquisitionSourceType", e.target.value)}
                placeholder="例）紹介 / テレアポ"
              />
            </div>

            <div>
              <div className={UI.LABEL}>獲得元詳細</div>
              <input
                className={UI.INPUT}
                value={fields.acquisitionSourceDetail}
                onChange={(e) => onChange("acquisitionSourceDetail", e.target.value)}
                placeholder="例）〇〇社 山田さん紹介"
              />
            </div>

            <div className="sm:col-span-2">
              <div className={UI.LABEL}>NG事項</div>
              <textarea
                className={UI.TEXTAREA}
                value={fields.ngNotes}
                onChange={(e) => onChange("ngNotes", e.target.value)}
                placeholder="例）電話NG、土日NG…"
              />
            </div>

            <div className="sm:col-span-2">
              <div className={UI.LABEL}>内部メモ</div>
              <textarea
                className={UI.TEXTAREA}
                value={fields.notesInternal}
                onChange={(e) => onChange("notesInternal", e.target.value)}
                placeholder="例）温度感、競合状況…"
              />
            </div>

            <div className="sm:col-span-2 pt-2">
              <button
                type="button"
                className="cv-btn-primary whitespace-nowrap"
                onClick={onSave}
                disabled={saveStatus === "saving"}
              >
                企業情報を保存
              </button>
              {saveStatus === "error" ? (
                <div className="mt-2 text-[12px] text-rose-700 dark:text-rose-400">保存エラー: {saveError}</div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
