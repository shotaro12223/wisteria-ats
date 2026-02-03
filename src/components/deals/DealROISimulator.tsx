// src/components/deals/DealROISimulator.tsx
"use client";

import { useState, useEffect } from "react";
import NumberInput from "@/components/NumberInput";

const UI = {
  CARD: "rounded-xl border-2 border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm",
  CARD_HDR: "border-b-2 border-slate-200/80 dark:border-slate-700 px-4 py-3",
  CARD_BODY: "px-4 py-3",
};

interface DealROISimulatorProps {
  initialMrr?: string;
  amount?: string;
  isPresentationMode?: boolean;
  proposalMode?: "competitor" | "current" | "new";
  onMonthlyFeeChange?: (value: string) => void;
  hiringsPerYear?: number;
  competitorCostPerHire?: number;
  onHiringsChange?: (value: number) => void;
  onCompetitorCostChange?: (value: number) => void;
}

export function DealROISimulator({
  initialMrr = "",
  amount = "",
  isPresentationMode = false,
  proposalMode = "competitor",
  onMonthlyFeeChange,
  hiringsPerYear: externalHirings,
  competitorCostPerHire: externalCompetitorCost,
  onHiringsChange,
  onCompetitorCostChange,
}: DealROISimulatorProps) {
  const [monthlyFee, setMonthlyFee] = useState<string>("");
  const [hiringsPerYear, setHiringsPerYear] = useState<number>(externalHirings ?? 5);
  const [competitorCostPerHire, setCompetitorCostPerHire] = useState<string>(String(externalCompetitorCost ?? 500000));

  // amountが変更されたら反映
  useEffect(() => {
    if (amount) {
      const numericValue = amount.replace(/[^0-9]/g, "");
      setMonthlyFee(numericValue);
    }
  }, [amount]);

  // 初期値としてMRRを使う（amountがない場合のみ）
  useEffect(() => {
    if (initialMrr && !monthlyFee && !amount) {
      const numericValue = initialMrr.replace(/[^0-9]/g, "");
      setMonthlyFee(numericValue);
    }
  }, [initialMrr, monthlyFee, amount]);

  const handleMonthlyFeeChange = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, "");
    setMonthlyFee(numericValue);
    if (onMonthlyFeeChange) {
      onMonthlyFeeChange(numericValue);
    }
  };

  const handleHiringsChange = (value: number) => {
    setHiringsPerYear(value);
    if (onHiringsChange) {
      onHiringsChange(value);
    }
  };

  const handleCompetitorCostChange = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, "");
    setCompetitorCostPerHire(numericValue);
    if (onCompetitorCostChange) {
      onCompetitorCostChange(parseInt(numericValue) || 0);
    }
  };

  const monthly = parseFloat(monthlyFee || "0");
  const yearlyTotal = monthly * 12;
  const competitorCost = parseFloat(competitorCostPerHire || "0");
  const competitorYearlyTotal = competitorCost * hiringsPerYear;
  const savings = competitorYearlyTotal - yearlyTotal;
  const savingsPercent = competitorYearlyTotal > 0 ? ((savings / competitorYearlyTotal) * 100).toFixed(1) : "0";
  const roiMonths = monthly > 0 ? Math.ceil((monthly * 12) / (savings > 0 ? savings / 12 : 1)) : 0;

  const textSize = isPresentationMode ? "text-[16px]" : "text-[13px]";
  const titleSize = isPresentationMode ? "text-[18px]" : "text-[14px]";
  const labelSize = isPresentationMode ? "text-[14px]" : "text-[11px]";
  const valueSize = isPresentationMode ? "text-[28px]" : "text-[22px]";

  // モードに応じたラベル
  const comparisonLabel =
    proposalMode === "competitor"
      ? "競合の採用単価（円/人）"
      : proposalMode === "current"
      ? "現在の採用単価（円/人）"
      : "想定採用単価（円/人）";
  const comparisonYearlyLabel =
    proposalMode === "competitor" ? "競合年間" : proposalMode === "current" ? "現在年間" : "想定年間";
  const comparisonShortLabel =
    proposalMode === "competitor" ? "競合他社" : proposalMode === "current" ? "現在の方法" : "従来の方法";
  const simulatorTitle =
    proposalMode === "competitor"
      ? "💰 ROI / コスト削減シミュレーター"
      : proposalMode === "current"
      ? "💰 導入効果シミュレーター"
      : "💰 投資対効果シミュレーター";
  const simulatorSubtitle =
    proposalMode === "competitor"
      ? "月額料金と採用人数から、年間コスト削減額を自動計算"
      : proposalMode === "current"
      ? "月額料金と採用人数から、年間の費用対効果を自動計算"
      : "月額料金と採用人数から、採用1名あたりの投資額を自動計算";
  const savingsLabel =
    proposalMode === "competitor" ? "年間削減額" : proposalMode === "current" ? "年間効果額" : "年間投資額";
  const showComparison = proposalMode !== "new";

  return (
    <div className={[UI.CARD, "relative overflow-hidden print:shadow-none"].join(" ")}>
      {/* 背景装飾 */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-50/40 via-white to-orange-50/35 dark:from-amber-950/20 dark:via-slate-800 dark:to-orange-950/15" />
        <div className="absolute -left-20 -top-24 h-[360px] w-[360px] rounded-full bg-amber-200/12 dark:bg-amber-900/10 blur-3xl" />
        <div className="absolute -right-28 -bottom-28 h-[420px] w-[420px] rounded-full bg-orange-200/10 dark:bg-orange-900/8 blur-3xl" />
      </div>

      <div className={UI.CARD_HDR + " relative"}>
        <div className={`${titleSize} font-extrabold text-slate-900 dark:text-slate-100`}>{simulatorTitle}</div>
        <div className={`mt-0.5 ${labelSize} text-slate-600 dark:text-slate-400`}>
          {simulatorSubtitle}
        </div>
      </div>

      <div className={UI.CARD_BODY + " relative"}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* 左：入力フォーム */}
          <div className="space-y-4">
            <div>
              <label className={`block ${labelSize} font-semibold tracking-wide text-slate-700 dark:text-slate-300 mb-2`}>
                月額料金（円）
              </label>
              <NumberInput
                className={`w-full rounded-md border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 ${textSize} font-semibold text-slate-900 dark:text-slate-100 outline-none focus:border-amber-300 dark:focus:border-amber-500 focus:ring-2 focus:ring-amber-200/40 dark:focus:ring-amber-500/40`}
                value={monthlyFee}
                onChange={handleMonthlyFeeChange}
                placeholder="150000"
                min="0"
              />
              <div className={`mt-1 ${labelSize} text-slate-500 dark:text-slate-400`}>
                年間: <span className="font-semibold text-slate-700 dark:text-slate-300">{yearlyTotal.toLocaleString()}円</span>
              </div>
            </div>

            <div>
              <label className={`block ${labelSize} font-semibold tracking-wide text-slate-700 dark:text-slate-300 mb-2`}>
                年間採用予定人数: <span className="text-amber-700 dark:text-amber-400 font-bold">{hiringsPerYear}人</span>
              </label>
              <input
                type="range"
                min="1"
                max="20"
                step="1"
                value={hiringsPerYear}
                onChange={(e) => handleHiringsChange(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-600 dark:accent-amber-500"
              />
              <div className="flex justify-between mt-1">
                <span className={`${labelSize} text-slate-500 dark:text-slate-400`}>1人</span>
                <span className={`${labelSize} text-slate-500 dark:text-slate-400`}>20人</span>
              </div>
            </div>

            {showComparison && (
              <div>
                <label className={`block ${labelSize} font-semibold tracking-wide text-slate-700 dark:text-slate-300 mb-2`}>
                  {comparisonLabel}
                </label>
                <NumberInput
                  className={`w-full rounded-md border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 ${textSize} font-semibold text-slate-900 dark:text-slate-100 outline-none focus:border-amber-300 dark:focus:border-amber-500 focus:ring-2 focus:ring-amber-200/40 dark:focus:ring-amber-500/40`}
                  value={competitorCostPerHire}
                  onChange={handleCompetitorCostChange}
                  placeholder="500000"
                  min="0"
                />
                <div className={`mt-1 ${labelSize} text-slate-500 dark:text-slate-400`}>
                  {comparisonYearlyLabel}: <span className="font-semibold text-slate-700 dark:text-slate-300">{competitorYearlyTotal.toLocaleString()}円</span>
                </div>
              </div>
            )}
          </div>

          {/* 右：結果表示 */}
          <div className="space-y-3">
            {proposalMode === "new" ? (
              <div className="rounded-xl border-2 border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/30 p-4">
                <div className={`${labelSize} font-semibold tracking-wide text-indigo-700 dark:text-indigo-300`}>採用1名あたりのコスト</div>
                <div className={`${valueSize} font-extrabold text-indigo-900 dark:text-indigo-200 mt-1 tabular-nums`}>
                  {hiringsPerYear > 0 && yearlyTotal > 0 ? "¥" : ""}
                  {hiringsPerYear > 0 && yearlyTotal > 0 ? Math.round(yearlyTotal / hiringsPerYear).toLocaleString() : "—"}
                </div>
                <div className={`${labelSize} text-indigo-700 dark:text-indigo-300 mt-1`}>
                  年間{hiringsPerYear}名採用の場合
                </div>
              </div>
            ) : (
              <div className="rounded-xl border-2 border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 p-4">
                <div className={`${labelSize} font-semibold tracking-wide text-emerald-700 dark:text-emerald-300`}>{savingsLabel}</div>
                <div className={`${valueSize} font-extrabold text-emerald-900 dark:text-emerald-200 mt-1 tabular-nums`}>
                  {savings > 0 ? "¥" : ""}
                  {savings > 0 ? savings.toLocaleString() : "—"}
                </div>
                {savings > 0 ? (
                  <div className={`${labelSize} text-emerald-700 dark:text-emerald-300 mt-1`}>
                    <span className="font-semibold">{savingsPercent}%</span> の{proposalMode === "competitor" ? "コスト削減" : "効率化"}
                  </div>
                ) : null}
              </div>
            )}

            {proposalMode === "new" ? (
              <div className="rounded-lg border border-indigo-200 dark:border-indigo-800 bg-white/80 dark:bg-slate-900/50 p-4">
                <div className={`${labelSize} font-semibold text-slate-600 dark:text-slate-400 mb-2`}>年間投資額</div>
                <div className={`${isPresentationMode ? "text-[20px]" : "text-[18px]"} font-bold text-indigo-700 dark:text-indigo-400 tabular-nums`}>
                  ¥{yearlyTotal.toLocaleString()}
                </div>
                <div className={`${labelSize} text-slate-500 dark:text-slate-400 mt-1`}>
                  採用{hiringsPerYear}名で 1名あたり¥{hiringsPerYear > 0 ? Math.round(yearlyTotal / hiringsPerYear).toLocaleString() : "—"}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/50 p-3">
                  <div className={`${labelSize} font-semibold text-slate-600 dark:text-slate-400`}>自社サービス</div>
                  <div className={`${isPresentationMode ? "text-[18px]" : "text-[16px]"} font-bold text-indigo-700 dark:text-indigo-400 mt-1 tabular-nums`}>
                    ¥{yearlyTotal.toLocaleString()}
                  </div>
                  <div className={`${labelSize} text-slate-500 dark:text-slate-400`}>年間</div>
                </div>

                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/50 p-3">
                  <div className={`${labelSize} font-semibold text-slate-600 dark:text-slate-400`}>{comparisonShortLabel}</div>
                  <div className={`${isPresentationMode ? "text-[18px]" : "text-[16px]"} font-bold text-rose-700 dark:text-rose-400 mt-1 tabular-nums`}>
                    ¥{competitorYearlyTotal.toLocaleString()}
                  </div>
                  <div className={`${labelSize} text-slate-500 dark:text-slate-400`}>年間</div>
                </div>
              </div>
            )}

            {showComparison && savings > 0 && roiMonths > 0 ? (
              <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/30 px-3 py-2">
                <div className={`${labelSize} text-amber-800 dark:text-amber-300`}>
                  <span className="font-bold">{roiMonths}ヶ月</span> で投資回収（ROI）
                </div>
              </div>
            ) : null}

            {!isPresentationMode && proposalMode !== "new" ? (
              <div className={`rounded-md border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/50 px-3 py-2 ${labelSize} text-slate-600 dark:text-slate-400 print:hidden`}>
                ※{proposalMode === "competitor" ? "競合の採用単価" : "現在の採用単価"}は業界平均または見積もり額を入力してください。
              </div>
            ) : null}
          </div>
        </div>

        {/* 視覚的な比較バー */}
        {showComparison && savings > 0 ? (
          <div className="mt-4 pt-4 border-t-2 border-slate-200/60 dark:border-slate-700/60">
            <div className={`${labelSize} font-semibold text-slate-700 dark:text-slate-300 mb-2`}>年間コスト比較</div>
            <div className="space-y-2">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className={`${labelSize} text-slate-600 dark:text-slate-400`}>自社サービス</span>
                  <span className={`${labelSize} font-semibold text-indigo-700 dark:text-indigo-400`}>¥{yearlyTotal.toLocaleString()}</span>
                </div>
                <div className="h-6 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${(yearlyTotal / competitorYearlyTotal) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className={`${labelSize} text-slate-600 dark:text-slate-400`}>{comparisonShortLabel}</span>
                  <span className={`${labelSize} font-semibold text-rose-700 dark:text-rose-400`}>¥{competitorYearlyTotal.toLocaleString()}</span>
                </div>
                <div className="h-6 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-rose-500 to-red-500 rounded-full w-full" />
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
