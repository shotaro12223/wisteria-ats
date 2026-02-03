// src/components/deals/DealAnalysisDashboard.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type DealHistoryItem = {
  id: string;
  title: string;
  stage: string;
  start_date: string | null;
  due_date: string | null;
  amount: number | null;
  probability: number | null;
  created_at: string;
  updated_at: string;
};

interface DealAnalysisDashboardProps {
  dealId: string;
  companyId?: string;
  companyName: string;
  title: string;
  stage: string;
  startDate: string | null;
  dueDate: string | null;
  amount: number | null;
  probability: number | null;
  memo: string;
  meetingGoal: string;
  meetingRisks: string;
  meetingNext: string;
}

export function DealAnalysisDashboard({
  dealId,
  companyId,
  companyName,
  title,
  stage,
  startDate,
  dueDate,
  amount,
  probability,
  memo,
  meetingGoal,
  meetingRisks,
  meetingNext,
}: DealAnalysisDashboardProps) {
  const [dealHistory, setDealHistory] = useState<DealHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // 過去商談履歴取得
  useEffect(() => {
    if (!companyId) return;

    let alive = true;
    (async () => {
      setLoadingHistory(true);
      try {
        const res = await fetch(`/api/companies/${companyId}/deals`, { cache: "no-store" });
        if (!res.ok) throw new Error(`API error: ${res.status}`);

        const json = await res.json();
        if (!alive) return;

        if (json.ok && Array.isArray(json.deals)) {
          // 現在の商談を除外
          const filtered = json.deals.filter((d: DealHistoryItem) => d.id !== dealId);
          setDealHistory(filtered);
        }
      } catch (err) {
        console.error("過去商談履歴取得エラー:", err);
        if (!alive) return;
        setDealHistory([]);
      } finally {
        if (!alive) return;
        setLoadingHistory(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [companyId, dealId]);

  // 経過日数・残り日数計算
  const today = new Date();
  const start = startDate ? new Date(startDate) : null;
  const due = dueDate ? new Date(dueDate) : null;

  let elapsedDays = 0;
  let remainingDays = 0;
  let progressPercent = 0;

  if (start) {
    elapsedDays = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }

  if (due) {
    remainingDays = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  if (start && due) {
    const totalDays = Math.floor((due.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (totalDays > 0) {
      progressPercent = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
    }
  }

  // ヘルスチェック
  const isOverdue = remainingDays < 0;
  const isUrgent = remainingDays >= 0 && remainingDays <= 7;
  const hasRisks = meetingRisks.trim().length > 0;
  const hasNextAction = meetingNext.trim().length > 0;

  const healthScore = (() => {
    let score = 100;
    if (isOverdue) score -= 40;
    else if (isUrgent) score -= 20;
    if (hasRisks) score -= 15;
    if (!hasNextAction) score -= 15;
    if (!probability || probability < 50) score -= 10;
    return Math.max(0, score);
  })();

  const healthColor =
    healthScore >= 80
      ? "from-emerald-500 to-green-500"
      : healthScore >= 60
        ? "from-amber-500 to-yellow-500"
        : "from-rose-500 to-red-500";

  const healthLabel = healthScore >= 80 ? "健全" : healthScore >= 60 ? "注意" : "リスク";

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="rounded-xl border-2 border-slate-200/80 dark:border-slate-700 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950/30 dark:via-purple-950/30 dark:to-pink-950/30 shadow-sm overflow-hidden">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-[18px] font-bold text-slate-900 dark:text-slate-100">📊 商談分析サマリー</h2>
              <p className="mt-1 text-[13px] text-slate-700 dark:text-slate-300 font-medium">
                この商談の進捗状況と健全性を一目で把握
              </p>
            </div>
            <Link
              href={`/deals/${dealId}?edit=1`}
              className="inline-flex items-center gap-2 rounded-lg border-2 border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 px-4 py-2 text-[13px] font-bold text-indigo-700 dark:text-indigo-300 shadow-sm transition-all hover:bg-indigo-50 dark:hover:bg-indigo-900/50 hover:shadow-md"
            >
              ✏️ 編集モード
            </Link>
          </div>
        </div>
      </div>

      {/* ヘルススコア */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border-2 border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
          <div className="px-5 py-4">
            <div className="text-[12px] font-semibold text-slate-600 dark:text-slate-400 mb-2">商談ヘルススコア</div>
            <div className="flex items-end gap-3">
              <div className={`text-[36px] font-bold bg-gradient-to-r ${healthColor} bg-clip-text text-transparent`}>
                {healthScore}
              </div>
              <div className="mb-2">
                <span
                  className={`inline-block rounded-full px-3 py-1 text-[11px] font-bold text-white bg-gradient-to-r ${healthColor}`}
                >
                  {healthLabel}
                </span>
              </div>
            </div>
            <div className="mt-3 h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${healthColor} transition-all duration-500`}
                style={{ width: `${healthScore}%` }}
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border-2 border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
          <div className="px-5 py-4">
            <div className="text-[12px] font-semibold text-slate-600 dark:text-slate-400 mb-2">進捗率</div>
            <div className="flex items-end gap-3">
              <div className="text-[36px] font-bold text-indigo-700 dark:text-indigo-400">{progressPercent.toFixed(0)}%</div>
              <div className="mb-2 text-[13px] font-semibold text-slate-700 dark:text-slate-300">
                {elapsedDays}日経過 / 残り{remainingDays}日
              </div>
            </div>
            <div className="mt-3 h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 dark:from-indigo-600 dark:to-purple-600 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border-2 border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
          <div className="px-5 py-4">
            <div className="text-[12px] font-semibold text-slate-600 dark:text-slate-400 mb-2">受注確度</div>
            <div className="flex items-end gap-3">
              <div className="text-[36px] font-bold text-emerald-700 dark:text-emerald-400">{probability || 0}%</div>
              <div className="mb-2 text-[13px] font-semibold text-slate-700 dark:text-slate-300">
                {amount ? `¥${amount.toLocaleString()}` : "金額未設定"}
              </div>
            </div>
            <div className="mt-3 h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-500 dark:from-emerald-600 dark:to-green-600 transition-all duration-500"
                style={{ width: `${probability || 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* タイムライン */}
      <div className="rounded-xl border-2 border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
        <div className="border-b-2 border-slate-200/80 dark:border-slate-700 px-6 py-3.5">
          <div className="text-[14px] font-bold text-slate-900 dark:text-slate-100">📅 商談タイムライン</div>
        </div>
        <div className="px-6 py-5">
          <div className="relative">
            {/* 横線 */}
            <div className="absolute top-6 left-0 right-0 h-1 bg-gradient-to-r from-sky-200 via-indigo-200 to-purple-200" />

            <div className="relative grid grid-cols-3 gap-4">
              {/* 開始日 */}
              <div className="text-center">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-blue-500 text-white shadow-lg mb-3">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div className="text-[12px] font-bold text-slate-900 dark:text-slate-100">開始日</div>
                <div className="text-[13px] text-slate-700 dark:text-slate-300 mt-1">{startDate || "未設定"}</div>
              </div>

              {/* 現在 */}
              <div className="text-center">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg mb-3 animate-pulse">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="text-[12px] font-bold text-slate-900 dark:text-slate-100">現在</div>
                <div className="text-[13px] text-slate-700 dark:text-slate-300 mt-1">{stage}</div>
              </div>

              {/* 完了予定 */}
              <div className="text-center">
                <div
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-full ${
                    isOverdue
                      ? "bg-gradient-to-br from-rose-500 to-red-500"
                      : isUrgent
                        ? "bg-gradient-to-br from-amber-500 to-yellow-500"
                        : "bg-gradient-to-br from-emerald-500 to-green-500"
                  } text-white shadow-lg mb-3`}
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="text-[12px] font-bold text-slate-900 dark:text-slate-100">完了予定</div>
                <div className="text-[13px] text-slate-700 dark:text-slate-300 mt-1">{dueDate || "未設定"}</div>
                {isOverdue && (
                  <div className="mt-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">期限超過</div>
                )}
                {isUrgent && (
                  <div className="mt-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">あと{remainingDays}日</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* アラート・次のアクション */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* リスク・課題 */}
        <div className="rounded-xl border-2 border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
          <div className="border-b-2 border-slate-200/80 dark:border-slate-700 px-5 py-3.5 bg-amber-50/50 dark:bg-amber-950/30">
            <div className="text-[14px] font-bold text-amber-900 dark:text-amber-200">⚠️ リスク・課題</div>
          </div>
          <div className="px-5 py-4">
            {hasRisks ? (
              <div className="text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{meetingRisks}</div>
            ) : (
              <div className="text-[13px] text-slate-500 dark:text-slate-400 italic">特になし</div>
            )}
          </div>
        </div>

        {/* 次のアクション */}
        <div className="rounded-xl border-2 border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
          <div className="border-b-2 border-slate-200/80 dark:border-slate-700 px-5 py-3.5 bg-indigo-50/50 dark:bg-indigo-950/30">
            <div className="text-[14px] font-bold text-indigo-900 dark:text-indigo-200">🎯 次のアクション</div>
          </div>
          <div className="px-5 py-4">
            {hasNextAction ? (
              <div className="text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{meetingNext}</div>
            ) : (
              <div className="text-[13px] text-slate-500 dark:text-slate-400 italic">未設定</div>
            )}
          </div>
        </div>
      </div>

      {/* 商談メモ */}
      {memo && (
        <div className="rounded-xl border-2 border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
          <div className="border-b-2 border-slate-200/80 dark:border-slate-700 px-6 py-3.5">
            <div className="text-[14px] font-bold text-slate-900 dark:text-slate-100">📝 商談メモ</div>
          </div>
          <div className="px-6 py-4">
            <div className="text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{memo}</div>
          </div>
        </div>
      )}

      {/* 過去商談履歴 */}
      {companyId && (
        <div className="rounded-xl border-2 border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
          <div className="border-b-2 border-slate-200/80 dark:border-slate-700 px-6 py-3.5">
            <div className="text-[14px] font-bold text-slate-900 dark:text-slate-100">📚 過去の商談履歴</div>
            <div className="mt-0.5 text-[12px] text-slate-600 dark:text-slate-400">この企業との過去の商談・打ち合わせ記録</div>
          </div>
          <div className="px-6 py-4">
            {loadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent" />
              </div>
            ) : dealHistory.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-[13px]">過去の商談履歴はありません</div>
            ) : (
              <div className="space-y-3">
                {dealHistory.map((deal) => (
                  <Link
                    key={deal.id}
                    href={`/deals/${deal.id}`}
                    className="block rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 px-4 py-3 transition-all hover:bg-white dark:hover:bg-slate-800 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-bold text-slate-900 dark:text-slate-100">{deal.title}</div>
                        <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                          <span className="inline-flex items-center gap-1">
                            <span>ステージ:</span>
                            <span
                              className={`font-semibold ${
                                deal.stage === "受注" || deal.stage === "完了"
                                  ? "text-emerald-700 dark:text-emerald-400"
                                  : deal.stage === "失注" || deal.stage === "中止"
                                    ? "text-rose-700 dark:text-rose-400"
                                    : "text-slate-700 dark:text-slate-300"
                              }`}
                            >
                              {deal.stage}
                            </span>
                          </span>
                          {deal.amount && (
                            <span className="inline-flex items-center gap-1">
                              <span>金額:</span>
                              <span className="font-semibold">¥{deal.amount.toLocaleString()}</span>
                            </span>
                          )}
                          {deal.probability != null && (
                            <span className="inline-flex items-center gap-1">
                              <span>確度:</span>
                              <span className="font-semibold">{deal.probability}%</span>
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                          作成日: {new Date(deal.created_at).toLocaleDateString("ja-JP")}
                        </div>
                      </div>
                      <div className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-400 whitespace-nowrap">詳細 →</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* クイックアクション */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link
          href={`/deals/${dealId}?edit=1`}
          className="rounded-lg border-2 border-indigo-200 dark:border-indigo-700 bg-white dark:bg-slate-900 px-4 py-3 text-center text-[13px] font-bold text-indigo-700 dark:text-indigo-300 shadow-sm transition-all hover:bg-indigo-50 dark:hover:bg-indigo-900/50 hover:shadow-md"
        >
          ✏️ 商談情報を編集
        </Link>
        <Link
          href={`/deals/${dealId}?view=meeting&share=1`}
          className="rounded-lg border-2 border-purple-200 dark:border-purple-700 bg-white dark:bg-slate-900 px-4 py-3 text-center text-[13px] font-bold text-purple-700 dark:text-purple-300 shadow-sm transition-all hover:bg-purple-50 dark:hover:bg-purple-900/50 hover:shadow-md"
        >
          📊 プレゼンモード
        </Link>
        {companyId ? (
          <Link
            href={`/companies/${companyId}`}
            className="rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-center text-[13px] font-bold text-slate-700 dark:text-slate-300 shadow-sm transition-all hover:bg-slate-50 dark:hover:bg-slate-700 hover:shadow-md"
          >
            🏢 会社詳細を見る
          </Link>
        ) : (
          <div className="rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 px-4 py-3 text-center text-[13px] font-bold text-slate-400 dark:text-slate-500 shadow-sm cursor-not-allowed">
            🏢 会社詳細を見る
          </div>
        )}
      </div>
    </div>
  );
}
