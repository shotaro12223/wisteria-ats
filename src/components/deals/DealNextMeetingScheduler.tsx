// src/components/deals/DealNextMeetingScheduler.tsx
"use client";

import { useState } from "react";
import { todayJstYmd } from "@/lib/deal-utils";
import DatePicker from "@/components/DatePicker";

const UI = {
  CARD: "rounded-xl border-2 border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm",
  CARD_HDR: "border-b-2 border-slate-200/80 dark:border-slate-700 px-4 py-3",
  CARD_BODY: "px-4 py-3",
};

interface MeetingOption {
  id: string;
  date: string;
  time: string;
  note: string;
}

interface DealNextMeetingSchedulerProps {
  isPresentationMode?: boolean;
  onConfirm?: (option: MeetingOption) => void;
}

export function DealNextMeetingScheduler({
  isPresentationMode = false,
  onConfirm,
}: DealNextMeetingSchedulerProps) {
  const [options, setOptions] = useState<MeetingOption[]>([
    { id: "1", date: "", time: "14:00", note: "" },
    { id: "2", date: "", time: "15:00", note: "" },
    { id: "3", date: "", time: "16:00", note: "" },
  ]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const textSize = isPresentationMode ? "text-[16px]" : "text-[13px]";
  const titleSize = isPresentationMode ? "text-[18px]" : "text-[14px]";
  const labelSize = isPresentationMode ? "text-[14px]" : "text-[11px]";

  const updateOption = (id: string, field: keyof MeetingOption, value: string) => {
    setOptions((prev) =>
      prev.map((opt) => (opt.id === id ? { ...opt, [field]: value } : opt))
    );
  };

  const setQuickDate = (id: string, daysFromNow: number) => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    const ymd = jst.toISOString().slice(0, 10);
    updateOption(id, "date", ymd);
  };

  const handleConfirm = () => {
    const selected = options.find((opt) => opt.id === selectedId);
    if (selected && onConfirm) {
      onConfirm(selected);
    }
  };

  const hasValidOptions = options.some((opt) => opt.date);

  return (
    <div className={[UI.CARD, "relative overflow-hidden print:shadow-none"].join(" ")}>
      {/* 背景装飾 */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-50/40 via-white to-blue-50/35 dark:from-sky-950/20 dark:via-slate-800 dark:to-blue-950/15" />
        <div className="absolute -left-20 -top-24 h-[360px] w-[360px] rounded-full bg-sky-200/12 dark:bg-sky-900/10 blur-3xl" />
        <div className="absolute -right-28 -bottom-28 h-[420px] w-[420px] rounded-full bg-blue-200/10 dark:bg-blue-900/8 blur-3xl" />
      </div>

      <div className={UI.CARD_HDR + " relative"}>
        <div className={`${titleSize} font-extrabold text-slate-900 dark:text-slate-100`}>📅 次回MTG日程調整</div>
        <div className={`mt-0.5 ${labelSize} text-slate-600 dark:text-slate-400`}>
          候補日を3つまで提示して、その場で日程確定
        </div>
      </div>

      <div className={UI.CARD_BODY + " relative"}>
        {!isPresentationMode ? (
          /* 編集モード */
          <div className="space-y-3">
            {options.map((opt, index) => (
              <div key={opt.id} className="rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/50 p-3">
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-sky-100 dark:bg-sky-900/50 ${textSize} font-bold text-sky-700 dark:text-sky-300`}>
                    {index + 1}
                  </div>
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className={`block ${labelSize} font-semibold text-slate-700 dark:text-slate-300 mb-1`}>
                        日付
                      </label>
                      <DatePicker
                        className={`w-full rounded-md border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-[13px] font-semibold text-slate-900 dark:text-slate-100 outline-none focus:border-sky-300 dark:focus:border-sky-500 focus:ring-2 focus:ring-sky-200/40 dark:focus:ring-sky-500/40`}
                        value={opt.date}
                        onChange={(value) => updateOption(opt.id, "date", value)}
                      />
                      <div className="flex gap-1 mt-1">
                        <button
                          type="button"
                          className={`text-[10px] px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/70`}
                          onClick={() => setQuickDate(opt.id, 3)}
                        >
                          3日後
                        </button>
                        <button
                          type="button"
                          className={`text-[10px] px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/70`}
                          onClick={() => setQuickDate(opt.id, 7)}
                        >
                          1週間後
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className={`block ${labelSize} font-semibold text-slate-700 dark:text-slate-300 mb-1`}>
                        時刻
                      </label>
                      <input
                        type="time"
                        className={`w-full rounded-md border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-[13px] font-semibold text-slate-900 dark:text-slate-100 outline-none focus:border-sky-300 dark:focus:border-sky-500 focus:ring-2 focus:ring-sky-200/40 dark:focus:ring-sky-500/40`}
                        value={opt.time}
                        onChange={(e) => updateOption(opt.id, "time", e.target.value)}
                      />
                    </div>

                    <div>
                      <label className={`block ${labelSize} font-semibold text-slate-700 dark:text-slate-300 mb-1`}>
                        メモ
                      </label>
                      <input
                        type="text"
                        className={`w-full rounded-md border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-[13px] text-slate-900 dark:text-slate-100 outline-none focus:border-sky-300 dark:focus:border-sky-500 focus:ring-2 focus:ring-sky-200/40 dark:focus:ring-sky-500/40`}
                        value={opt.note}
                        onChange={(e) => updateOption(opt.id, "note", e.target.value)}
                        placeholder="例）オンライン"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/50 px-3 py-2 text-[12px] text-slate-600 dark:text-slate-400">
              💡 候補を提示してその場で確定することで「後日調整」での失注を防ぎます
            </div>
          </div>
        ) : (
          /* プレゼンモード */
          <div className="space-y-3">
            <div className={`${labelSize} text-slate-600 dark:text-slate-400 mb-3`}>
              以下の日程からご都合の良い時間をお選びください
            </div>

            {options
              .filter((opt) => opt.date)
              .map((opt, index) => {
                const isSelected = selectedId === opt.id;
                const date = new Date(opt.date + "T00:00:00");
                const weekday = ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];

                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={[
                      "w-full rounded-xl border-2 p-4 text-left transition-all",
                      isSelected
                        ? "border-sky-500 dark:border-sky-400 bg-sky-50 dark:bg-sky-950/40 shadow-md"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 hover:border-sky-300 dark:hover:border-sky-500 hover:bg-sky-50/50 dark:hover:bg-sky-950/20",
                    ].join(" ")}
                    onClick={() => setSelectedId(opt.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center justify-center w-10 h-10 rounded-full ${isSelected ? "bg-sky-500 text-white" : "bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300"} font-bold`}>
                          {index + 1}
                        </div>
                        <div>
                          <div className={`${isPresentationMode ? "text-[18px]" : "text-[16px]"} font-bold text-slate-900 dark:text-slate-100`}>
                            {opt.date} ({weekday}) {opt.time}
                          </div>
                          {opt.note ? (
                            <div className={`${labelSize} text-slate-600 dark:text-slate-400 mt-0.5`}>{opt.note}</div>
                          ) : null}
                        </div>
                      </div>
                      {isSelected ? (
                        <div className="text-sky-600 dark:text-sky-400">
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      ) : null}
                    </div>
                  </button>
                );
              })}

            {hasValidOptions && selectedId ? (
              <button
                type="button"
                className="w-full rounded-lg bg-gradient-to-r from-sky-600 to-blue-600 px-4 py-3 text-[14px] font-bold text-white shadow-md hover:from-sky-700 hover:to-blue-700 transition-all"
                onClick={handleConfirm}
              >
                ✓ この日程で確定する
              </button>
            ) : null}

            {!hasValidOptions ? (
              <div className="text-center text-slate-500 dark:text-slate-400 py-4">
                日程候補が設定されていません
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
