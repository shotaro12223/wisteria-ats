// src/components/deals/DealCompetitorComparison.tsx
"use client";

interface CompetitorData {
  name: string;
  price: string;
  supportedPlatforms: string[];
  supportQuality: string;
  responseTime: string;
  advantages: string[];
  disadvantages: string[];
}

interface DealCompetitorComparisonProps {
  isPresentationMode?: boolean;
}

export function DealCompetitorComparison({ isPresentationMode = false }: DealCompetitorComparisonProps) {
  // Wisteria vs 他社人材紹介会社
  const competitors: CompetitorData[] = [
    {
      name: "Wisteria（自社）",
      price: "月額固定制",
      supportedPlatforms: [
        "Indeed",
        "採用係長",
        "Engage",
        "求人BOX",
        "はたらきんぐ",
        "ハローワーク",
        "げんきワーク",
        "ジモティー",
        "AirWork",
      ],
      supportQuality: "専任担当制",
      responseTime: "平均1時間以内",
      advantages: [
        "月額固定で採用人数の上限なし",
        "9つの求人媒体を一元管理",
        "専用ATSで応募者管理が簡単",
        "RPO担当が投稿代行・更新代行",
      ],
      disadvantages: ["初期セットアップに1-2週間必要"],
    },
    {
      name: "A社（従来型人材紹介）",
      price: "成功報酬型（年収の30-35%）",
      supportedPlatforms: ["自社DB", "提携媒体"],
      supportQuality: "担当者制",
      responseTime: "平均1営業日",
      advantages: ["初期費用ゼロ", "採用成功まで無料"],
      disadvantages: [
        "採用1名あたり数十万〜数百万円",
        "複数名採用でコストが膨大",
        "求人媒体への直接投稿は不可",
      ],
    },
    {
      name: "B社（RPO型）",
      price: "月額20-50万円 + 成功報酬",
      supportedPlatforms: ["主要求人媒体（個別契約）"],
      supportQuality: "チーム制",
      responseTime: "平均3-6時間",
      advantages: ["採用業務の一部アウトソース可", "媒体運用代行"],
      disadvantages: [
        "月額費用が高額",
        "成功報酬も別途必要",
        "契約媒体が限定的",
      ],
    },
    {
      name: "C社（媒体特化型）",
      price: "媒体利用料 + 手数料",
      supportedPlatforms: ["特定媒体のみ"],
      supportQuality: "サポート窓口",
      responseTime: "平均1-2営業日",
      advantages: ["特定媒体の運用ノウハウ", "媒体費用のみで利用可"],
      disadvantages: [
        "媒体ごとに別契約が必要",
        "複数媒体管理が煩雑",
        "応募者管理システムなし",
      ],
    },
  ];

  const headerSize = isPresentationMode ? "text-[16px]" : "text-[14px]";
  const cellSize = isPresentationMode ? "text-[14px]" : "text-[12px]";
  const badgeSize = isPresentationMode ? "text-[11px]" : "text-[9px]";

  return (
    <div className="rounded-xl border-2 border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
      {/* ヘッダー */}
      <div className="border-b-2 border-slate-200/80 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-900 dark:to-slate-800/50 px-5 py-3.5">
        <div className={`font-bold text-slate-900 dark:text-slate-100 ${headerSize}`}>
          🏢 競合他社比較表（人材紹介業界）
        </div>
        <div className={`mt-1 font-medium text-slate-700 dark:text-slate-300 ${isPresentationMode ? "text-[13px]" : "text-[11px]"}`}>
          Wisteria vs 従来型人材紹介・RPO・媒体特化型
        </div>
      </div>

      {/* テーブル */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900">
              <th className={`border-b-2 border-r border-slate-200 dark:border-slate-700 px-3 py-2.5 text-left font-bold text-slate-900 dark:text-slate-100 ${cellSize}`}>
                項目
              </th>
              {competitors.map((comp) => (
                <th
                  key={comp.name}
                  className={`border-b-2 border-r last:border-r-0 border-slate-200 dark:border-slate-700 px-3 py-2.5 text-left font-bold ${
                    comp.name.includes("Wisteria")
                      ? "bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-950/50 dark:to-purple-950/40 text-indigo-900 dark:text-indigo-200"
                      : "text-slate-900 dark:text-slate-100"
                  } ${cellSize}`}
                >
                  {comp.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* 料金体系 */}
            <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
              <td className={`border-b border-r border-slate-200 dark:border-slate-700 px-3 py-3 font-semibold text-slate-700 dark:text-slate-300 ${cellSize}`}>
                料金体系
              </td>
              {competitors.map((comp) => (
                <td
                  key={comp.name}
                  className={`border-b border-r last:border-r-0 border-slate-200 dark:border-slate-700 px-3 py-3 ${
                    comp.name.includes("Wisteria") ? "bg-indigo-50/30 dark:bg-indigo-950/20" : ""
                  } ${cellSize}`}
                >
                  <span
                    className={`inline-block rounded-md px-2 py-1 font-bold ${
                      comp.name.includes("Wisteria")
                        ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                    } ${badgeSize}`}
                  >
                    {comp.price}
                  </span>
                </td>
              ))}
            </tr>

            {/* 対応媒体 */}
            <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
              <td className={`border-b border-r border-slate-200 dark:border-slate-700 px-3 py-3 font-semibold text-slate-700 dark:text-slate-300 ${cellSize}`}>
                対応求人媒体
              </td>
              {competitors.map((comp) => (
                <td
                  key={comp.name}
                  className={`border-b border-r last:border-r-0 border-slate-200 dark:border-slate-700 px-3 py-3 ${
                    comp.name.includes("Wisteria") ? "bg-indigo-50/30 dark:bg-indigo-950/20" : ""
                  }`}
                >
                  <div className="flex flex-wrap gap-1">
                    {comp.supportedPlatforms.slice(0, isPresentationMode ? 9 : 4).map((platform) => (
                      <span
                        key={platform}
                        className={`inline-block rounded px-1.5 py-0.5 font-semibold ${
                          comp.name.includes("Wisteria")
                            ? "bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200"
                            : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                        } ${badgeSize}`}
                      >
                        {platform}
                      </span>
                    ))}
                    {!isPresentationMode && comp.supportedPlatforms.length > 4 && (
                      <span className={`inline-block rounded px-1.5 py-0.5 font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 ${badgeSize}`}>
                        +{comp.supportedPlatforms.length - 4}
                      </span>
                    )}
                  </div>
                </td>
              ))}
            </tr>

            {/* サポート体制 */}
            <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
              <td className={`border-b border-r border-slate-200 dark:border-slate-700 px-3 py-3 font-semibold text-slate-700 dark:text-slate-300 ${cellSize}`}>
                サポート体制
              </td>
              {competitors.map((comp) => (
                <td
                  key={comp.name}
                  className={`border-b border-r last:border-r-0 border-slate-200 dark:border-slate-700 px-3 py-3 ${
                    comp.name.includes("Wisteria") ? "bg-indigo-50/30 dark:bg-indigo-950/20 font-semibold text-indigo-900 dark:text-indigo-200" : "text-slate-700 dark:text-slate-300"
                  } ${cellSize}`}
                >
                  {comp.supportQuality}
                </td>
              ))}
            </tr>

            {/* 平均対応時間 */}
            <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
              <td className={`border-b border-r border-slate-200 dark:border-slate-700 px-3 py-3 font-semibold text-slate-700 dark:text-slate-300 ${cellSize}`}>
                平均対応時間
              </td>
              {competitors.map((comp) => (
                <td
                  key={comp.name}
                  className={`border-b border-r last:border-r-0 border-slate-200 dark:border-slate-700 px-3 py-3 ${
                    comp.name.includes("Wisteria") ? "bg-indigo-50/30 dark:bg-indigo-950/20 font-semibold text-indigo-900 dark:text-indigo-200" : "text-slate-700 dark:text-slate-300"
                  } ${cellSize}`}
                >
                  {comp.responseTime}
                </td>
              ))}
            </tr>

            {/* メリット */}
            <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
              <td className={`border-b border-r border-slate-200 dark:border-slate-700 px-3 py-3 font-semibold text-slate-700 dark:text-slate-300 ${cellSize}`}>
                主なメリット
              </td>
              {competitors.map((comp) => (
                <td
                  key={comp.name}
                  className={`border-b border-r last:border-r-0 border-slate-200 dark:border-slate-700 px-3 py-3 ${
                    comp.name.includes("Wisteria") ? "bg-indigo-50/30 dark:bg-indigo-950/20" : ""
                  }`}
                >
                  <ul className="space-y-1">
                    {comp.advantages.map((adv, i) => (
                      <li key={i} className={`flex items-start gap-1.5 ${cellSize}`}>
                        <span
                          className={`mt-0.5 inline-block ${
                            comp.name.includes("Wisteria") ? "text-indigo-600 dark:text-indigo-400" : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          ✓
                        </span>
                        <span className={comp.name.includes("Wisteria") ? "font-semibold text-slate-900 dark:text-slate-100" : "text-slate-700 dark:text-slate-300"}>
                          {adv}
                        </span>
                      </li>
                    ))}
                  </ul>
                </td>
              ))}
            </tr>

            {/* デメリット */}
            <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
              <td className={`border-r border-slate-200 dark:border-slate-700 px-3 py-3 font-semibold text-slate-700 dark:text-slate-300 ${cellSize}`}>
                主なデメリット
              </td>
              {competitors.map((comp) => (
                <td
                  key={comp.name}
                  className={`border-r last:border-r-0 border-slate-200 dark:border-slate-700 px-3 py-3 ${
                    comp.name.includes("Wisteria") ? "bg-indigo-50/30 dark:bg-indigo-950/20" : ""
                  }`}
                >
                  <ul className="space-y-1">
                    {comp.disadvantages.map((dis, i) => (
                      <li key={i} className={`flex items-start gap-1.5 ${cellSize}`}>
                        <span className="mt-0.5 inline-block text-amber-600 dark:text-amber-400">▲</span>
                        <span className="text-slate-600 dark:text-slate-400">{dis}</span>
                      </li>
                    ))}
                  </ul>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* フッター注釈 */}
      {!isPresentationMode && (
        <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 px-5 py-3">
          <p className="text-[11px] text-slate-600 dark:text-slate-400">
            ※ 料金・サービス内容は一般的な相場です。実際の条件は各社にお問い合わせください。
          </p>
        </div>
      )}
    </div>
  );
}
