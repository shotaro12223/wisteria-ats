// src/components/deals/DealOverviewForm.tsx
import type { DealMode } from "./types";
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
};

export function DealOverviewForm({
  mode,
  title,
  memo,
  amount,
  probability,
  onChangeTitle,
  onChangeMemo,
  onChangeAmount,
  onChangeProbability,
}: {
  mode: DealMode;
  title: string;
  memo: string;
  amount: string;
  probability: string;
  onChangeTitle: (v: string) => void;
  onChangeMemo: (v: string) => void;
  onChangeAmount: (v: string) => void;
  onChangeProbability: (v: string) => void;
}) {
  return (
    <section className={UI.PANEL}>
      <div className={UI.PANEL_HDR}>
        <div className="min-w-0">
          <div className={UI.PANEL_TITLE}>商談情報</div>
        </div>
      </div>

      <div className={UI.PANEL_BODY}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <div className={UI.LABEL}>商談名</div>
            <input className={UI.INPUT} value={title} onChange={(e) => onChangeTitle(e.target.value)} />
          </div>

          <div>
            <div className={UI.LABEL}>想定金額（月額）</div>
            <NumberInput
              className={UI.INPUT}
              value={amount}
              onChange={onChangeAmount}
              placeholder="例: 150000"
            />
          </div>

          <div>
            <div className={UI.LABEL}>受注確度（%）</div>
            <NumberInput
              min="0"
              max="100"
              className={UI.INPUT}
              value={probability}
              onChange={onChangeProbability}
              placeholder="例: 70"
            />
          </div>

          <div className="sm:col-span-2">
            <div className={UI.LABEL}>議事メモ</div>
            <textarea className={UI.TEXTAREA} value={memo} onChange={(e) => onChangeMemo(e.target.value)} />
          </div>
        </div>
      </div>
    </section>
  );
}
