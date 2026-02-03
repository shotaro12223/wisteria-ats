// src/components/deals/DealProposalSummary.tsx
"use client";

interface DealProposalSummaryProps {
  monthlyCost?: number;
  yearlySavings?: number;
  minimumContractMonths?: string;
  proposalMode?: "competitor" | "current" | "new";
}

export function DealProposalSummary({
  monthlyCost = 0,
  yearlySavings = 0,
  minimumContractMonths = "3",
  proposalMode = "competitor"
}: DealProposalSummaryProps) {
  const hasSavings = yearlySavings > 0;
  const savingsText = hasSavings
    ? `年間${(yearlySavings / 10000).toFixed(0)}万円以上のコスト削減が可能`
    : "成功報酬型と比較して年間数百万円のコスト削減が可能";
  return (
    <div className="rounded-xl border-2 border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
      <div className="px-8 py-6 space-y-6">
        {/* 提案のポイント */}
        <div>
          <h3 className="text-[18px] font-bold text-slate-900 dark:text-slate-100 mb-4">🎯 本日のご提案のポイント</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {proposalMode === "competitor" ? (
              <div className="rounded-lg bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-950/40 dark:to-blue-950/30 border border-sky-200 dark:border-sky-800 px-4 py-4">
                <div className="text-[14px] font-bold text-sky-900 dark:text-sky-200 mb-2">💰 コスト削減</div>
                <div className="text-[13px] text-sky-800 dark:text-sky-300">
                  {savingsText}
                </div>
              </div>
            ) : proposalMode === "current" ? (
              <div className="rounded-lg bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-950/40 dark:to-blue-950/30 border border-sky-200 dark:border-sky-800 px-4 py-4">
                <div className="text-[14px] font-bold text-sky-900 dark:text-sky-200 mb-2">📈 採用効率化</div>
                <div className="text-[13px] text-sky-800 dark:text-sky-300">
                  9媒体への同時掲載で応募数を最大化、採用にかかる時間と工数を大幅削減
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-950/40 dark:to-blue-950/30 border border-sky-200 dark:border-sky-800 px-4 py-4">
                <div className="text-[14px] font-bold text-sky-900 dark:text-sky-200 mb-2">🎯 応募数増加</div>
                <div className="text-[13px] text-sky-800 dark:text-sky-300">
                  Indeed、求人BOX、ハローワークなど9媒体に同時掲載で応募者数を大幅に増加
                </div>
              </div>
            )}
            <div className="rounded-lg bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/40 dark:to-green-950/30 border border-emerald-200 dark:border-emerald-800 px-4 py-4">
              <div className="text-[14px] font-bold text-emerald-900 dark:text-emerald-200 mb-2">⚡ スピード採用</div>
              <div className="text-[13px] text-emerald-800 dark:text-emerald-300">
                9媒体への同時掲載で応募数を最大化、採用までの期間を短縮
              </div>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/30 border border-purple-200 dark:border-purple-800 px-4 py-4">
              <div className="text-[14px] font-bold text-purple-900 dark:text-purple-200 mb-2">🤝 専任サポート</div>
              <div className="text-[13px] text-purple-800 dark:text-purple-300">
                RPO担当が投稿代行・更新代行・応募者管理を全面サポート
              </div>
            </div>
          </div>
        </div>

        {/* 導入ステップ */}
        <div>
          <h3 className="text-[18px] font-bold text-slate-900 dark:text-slate-100 mb-4">📋 導入までの流れ</h3>
          <div className="relative">
            {/* 横線 */}
            <div className="absolute left-0 right-0 top-6 h-0.5 bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 dark:from-indigo-600 dark:via-purple-600 dark:to-pink-600 hidden md:block" />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { step: "1", title: "ご契約", desc: "契約書締結（最短即日）", days: "初日" },
                { step: "2", title: "ヒアリング", desc: "求人内容・採用要件の詳細確認", days: "1-2日目" },
                { step: "3", title: "求人作成", desc: "9媒体分の求人原稿を作成", days: "3-5日目" },
                { step: "4", title: "掲載開始", desc: "全媒体へ一斉掲載・応募受付開始", days: "1週間後" },
              ].map((item, i) => (
                <div key={i} className="relative flex flex-col items-center text-center">
                  <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-bold text-[16px] shadow-lg">
                    {item.step}
                  </div>
                  <div className="mt-3">
                    <div className="text-[15px] font-bold text-slate-900 dark:text-slate-100">{item.title}</div>
                    <div className="text-[13px] text-slate-700 dark:text-slate-300 mt-1">{item.desc}</div>
                    <div className="text-[12px] text-indigo-600 dark:text-indigo-400 font-semibold mt-1">{item.days}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 今だけの特典 */}
        <div className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 border-2 border-amber-300 dark:border-amber-800 px-6 py-5">
          <div className="flex items-start gap-4">
            <div className="text-[40px]">🎁</div>
            <div className="flex-1">
              <h3 className="text-[18px] font-bold text-amber-900 dark:text-amber-200 mb-2">初月キャンペーン実施中</h3>
              <div className="space-y-2 text-[14px] text-amber-900 dark:text-amber-200">
                <div className="flex items-center gap-2">
                  <span className="text-amber-600 dark:text-amber-400">✓</span>
                  <span className="font-semibold">初月費用50%OFF</span>
                  <span className="text-[12px] text-amber-700 dark:text-amber-300">（本日ご契約の場合）</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-600 dark:text-amber-400 mt-0.5">✓</span>
                  <div>
                    <div className="font-semibold">求人原稿作成費用 無料</div>
                    <div className="text-[12px] text-amber-700 dark:text-amber-300 mt-0.5">（通常都度3万円）</div>
                    <div className="text-[13px] text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">
                      毎月ABテストを実施し、応募率の高い原稿パターンを検証。定期的に原稿をブラッシュアップすることで、応募数を最大化します。
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-600 dark:text-amber-400 mt-0.5">✓</span>
                  <div>
                    <div className="font-semibold">最低契約期間 {minimumContractMonths}ヶ月</div>
                    <div className="text-[12px] text-amber-700 dark:text-amber-300 mt-0.5">（{minimumContractMonths}ヶ月利用後は解約手数料無料）</div>
                  </div>
                </div>
              </div>
              <div className="mt-3 text-[12px] text-amber-800 dark:text-amber-300 bg-white/50 dark:bg-slate-900/50 rounded-lg px-3 py-2">
                ※ キャンペーン適用期限: {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString("ja-JP")} まで
              </div>
            </div>
          </div>
        </div>

        {/* クロージングメッセージ */}
        <div className="rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 dark:from-indigo-600 dark:to-purple-600 px-8 py-6 text-center">
          <h3 className="text-[20px] font-bold text-white mb-2">採用のお悩み、今すぐ解決しませんか？</h3>
          <p className="text-[14px] text-indigo-100 dark:text-indigo-200">
            ご不明な点やご質問がございましたら、お気軽にお申し付けください
          </p>
        </div>
      </div>
    </div>
  );
}
