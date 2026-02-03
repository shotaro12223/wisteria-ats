// src/components/deals/DealStageGauge.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { ClockIcon, ThumbUpIcon, ThumbDownIcon, ChevronDownIcon } from "./icons";
import { normalizeStageForMode, clampStageFromList, stageIndexFromList, toneForStage, todayJstYmd } from "@/lib/deal-utils";
import type { DealMode } from "./types";

const UI = {
  PANEL: "rounded-md border-2 border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm",
};

const STAGES_SALES = ["ヒアリング", "提案", "見積", "受注", "失注"] as const;
const STAGES_CONTRACT = ["準備", "実施", "フォロー", "完了", "中止"] as const;

interface DealStageGaugeProps {
  currentStage: string;
  onPickStage: (st: string) => void;
  mode: DealMode;
  startDate: string;
  dueDate: string;
  onChangeStart: (v: string) => void;
  onChangeDue: (v: string) => void;
  onQuickGood: () => void;
  onQuickBad: () => void;
}

export function DealStageGauge({
  currentStage,
  onPickStage,
  mode,
  startDate,
  dueDate,
  onChangeStart,
  onChangeDue,
  onQuickGood,
  onQuickBad,
}: DealStageGaugeProps) {
  const list =
    mode === "contract"
      ? (STAGES_CONTRACT as unknown as readonly string[])
      : (STAGES_SALES as unknown as readonly string[]);

  const normalized = normalizeStageForMode(currentStage, mode);
  const cur = clampStageFromList(normalized, list);
  const idx = stageIndexFromList(cur, list);

  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node | null;
      if (!t) return;
      if (btnRef.current && btnRef.current.contains(t)) return;
      if (popRef.current && popRef.current.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onDown, { passive: true });
    document.addEventListener("touchstart", onDown, { passive: true });
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown as any);
      document.removeEventListener("touchstart", onDown as any);
      document.removeEventListener("keydown", onKey as any);
    };
  }, [open]);

  const chip = (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold",
        toneForStage(cur, mode),
      ].join(" ")}
    >
      {cur}
    </span>
  );

  const rightGoodLabel = mode === "sales" ? "受注" : "完了";
  const rightBadLabel = mode === "sales" ? "失注" : "中止";

  return (
    <div className={[UI.PANEL, "relative overflow-hidden"].join(" ")}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/45 via-white to-purple-50/40 dark:from-blue-950/20 dark:via-slate-800 dark:to-purple-950/15" />
        <div className="absolute -left-36 -top-36 h-[520px] w-[520px] rounded-full bg-blue-200/12 dark:bg-blue-900/10 blur-3xl" />
        <div className="absolute -right-40 -bottom-40 h-[560px] w-[560px] rounded-full bg-purple-200/10 dark:bg-purple-900/8 blur-3xl" />
      </div>

      <div className="relative px-4 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Left */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border-2 border-slate-200/80 dark:border-slate-700 bg-white/70 dark:bg-slate-700/70 text-slate-700 dark:text-slate-300 shadow-sm hover:bg-white dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40"
              onClick={() => onChangeStart(todayJstYmd())}
              title="開始日を今日(JST)で自動入力"
            >
              <ClockIcon className="h-4 w-4" />
            </button>
            <div>
              <div className="text-[11px] font-semibold tracking-wide text-slate-600 dark:text-slate-400">開始</div>
              <input
                className={[
                  "mt-1 w-[160px] rounded-md border-2 border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5",
                  "text-[13px] font-semibold text-slate-900 dark:text-slate-100 tabular-nums",
                  "outline-none focus:border-indigo-300 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200/40 dark:focus:ring-indigo-500/40",
                ].join(" ")}
                value={startDate}
                onChange={(e) => onChangeStart(e.target.value)}
                placeholder="YYYY-MM-DD"
              />
            </div>
          </div>

          {/* Center */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">
                {mode === "sales" ? "商談進行" : "打ち合わせ進行"}
              </div>

              <div className="flex items-center gap-2">
                {chip}
                <div className="relative">
                  <button
                    ref={btnRef}
                    type="button"
                    className={[
                      "inline-flex items-center gap-1 rounded-md border-2 border-slate-200/80 dark:border-slate-700 bg-white/80 dark:bg-slate-700/80 px-2.5 py-1.5",
                      "text-[12px] font-semibold text-slate-800 dark:text-slate-200 shadow-sm hover:bg-white dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40",
                    ].join(" ")}
                    onClick={() => setOpen((v) => !v)}
                    aria-haspopup="menu"
                    aria-expanded={open}
                  >
                    ステージ変更
                    <ChevronDownIcon className="h-4 w-4" />
                  </button>

                  {open ? (
                    <div
                      ref={popRef}
                      className="absolute right-0 top-[calc(100%+8px)] z-50 w-52 overflow-hidden rounded-xl border-2 border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg"
                      role="menu"
                    >
                      {list.map((st) => {
                        const active = st === cur;
                        const cls = active ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900" : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700";
                        return (
                          <button
                            key={st}
                            type="button"
                            className={[
                              "flex w-full items-center justify-between px-3 py-2 text-left text-[12px] font-semibold transition",
                              cls,
                            ].join(" ")}
                            onClick={() => {
                              onPickStage(st);
                              setOpen(false);
                            }}
                            role="menuitem"
                          >
                            <span>{st}</span>
                            {active ? <span className="text-[11px] font-semibold opacity-90">現在</span> : null}
                          </button>
                        );
                      })}
                      <div className="h-px bg-slate-200/70 dark:bg-slate-700" />
                      <div className="px-3 py-2 text-[11px] text-slate-600 dark:text-slate-400">
                        {mode === "sales"
                          ? "受注/失注は右のボタンでも確定できます。"
                          : "完了/中止は右のボタンでも確定できます。"}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Arrow segments */}
            <div className="mt-2">
              <div className="flex w-full items-stretch overflow-x-auto">
                {list.map((st, i) => {
                  const done = i < idx;
                  const active = i === idx;

                  // 受注/完了 と 失注/中止 の判定
                  const isSuccess = st === "受注" || st === "完了";
                  const isFailure = st === "失注" || st === "中止";

                  const base =
                    "relative shrink-0 flex items-center justify-center px-4 h-10 text-[12px] font-semibold whitespace-nowrap select-none transition-all duration-200";

                  // 特別な状態（受注/失注）は目立つ色、それ以外は控えめに
                  let bg: string;
                  let border: string;

                  if (active && isSuccess) {
                    bg = "bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-lg";
                    border = "border-y-2 border-emerald-400/70";
                  } else if (active && isFailure) {
                    bg = "bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-lg";
                    border = "border-y-2 border-rose-400/70";
                  } else if (active) {
                    bg = "bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md";
                    border = "border-y-2 border-indigo-400/60";
                  } else if (done && isSuccess) {
                    bg = "bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-lg";
                    border = "border-y-2 border-emerald-400/70";
                  } else if (done && isFailure) {
                    bg = "bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-lg";
                    border = "border-y-2 border-rose-400/70";
                  } else if (done) {
                    bg = "bg-gradient-to-r from-blue-400 to-indigo-400 text-white";
                    border = "border-y-2 border-blue-300/60";
                  } else {
                    bg = "bg-white/80 dark:bg-slate-700/60 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700";
                    border = "border-y-2 border-slate-200/80 dark:border-slate-700";
                  }

                  const leftEdge = i === 0 ? `border-l-2 ${border.includes("emerald") ? "border-emerald-400/70" : border.includes("rose") ? "border-rose-400/70" : border.includes("indigo") ? "border-indigo-400/60" : border.includes("blue-300") ? "border-blue-300/60" : "border-slate-200/80"} rounded-l-md` : "";
                  const rightEdge = i === list.length - 1 ? `border-r-2 ${border.includes("emerald") ? "border-emerald-400/70" : border.includes("rose") ? "border-rose-400/70" : border.includes("indigo") ? "border-indigo-400/60" : border.includes("blue-300") ? "border-blue-300/60" : "border-slate-200/80"} rounded-r-md` : "";

                  return (
                    <button
                      key={st}
                      type="button"
                      className={[base, bg, border, leftEdge, rightEdge].join(" ")}
                      onClick={() => onPickStage(st)}
                      title="クリックでステージ変更"
                      style={{
                        clipPath:
                          i === list.length - 1
                            ? "none"
                            : "polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%, 14px 50%)",
                        marginLeft: i === 0 ? 0 : -14,
                      }}
                    >
                      <span className="relative z-10">{st}</span>
                      {active || (done && (isSuccess || isFailure)) ? (
                        <>
                          <span
                            className="pointer-events-none absolute inset-0 opacity-30"
                            style={{
                              background:
                                "linear-gradient(90deg, rgba(255,255,255,0.2), rgba(255,255,255,0), rgba(255,255,255,0.15))",
                            }}
                          />
                          {/* パルスアニメーション（受注/失注時は常に光る） */}
                          {(isSuccess || isFailure) ? (
                            <span className="absolute inset-0 animate-pulse opacity-20 bg-white rounded" />
                          ) : active ? (
                            <span className="absolute inset-0 animate-pulse opacity-20 bg-white rounded" />
                          ) : null}
                        </>
                      ) : done ? (
                        <span
                          className="pointer-events-none absolute inset-0 opacity-20"
                          style={{
                            background:
                              "linear-gradient(90deg, rgba(255,255,255,0.15), rgba(255,255,255,0), rgba(255,255,255,0.1))",
                          }}
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center justify-between gap-3 lg:flex-col lg:items-end">
            <div className="text-right">
              <div className="text-[11px] font-semibold tracking-wide text-slate-600 dark:text-slate-400">完了予定</div>
              <div className="mt-1 flex items-center justify-end gap-2">
                <input
                  className={[
                    "w-[160px] rounded-md border-2 border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5",
                    "text-[13px] font-semibold text-slate-900 dark:text-slate-100 tabular-nums",
                    "outline-none focus:border-indigo-300 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200/40 dark:focus:ring-indigo-500/40",
                  ].join(" ")}
                  value={dueDate}
                  onChange={(e) => onChangeDue(e.target.value)}
                  placeholder="YYYY-MM-DD"
                />
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border-2 border-slate-200/80 dark:border-slate-700 bg-white/70 dark:bg-slate-700/70 text-slate-700 dark:text-slate-300 shadow-sm hover:bg-white dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40"
                  onClick={() => onChangeDue(todayJstYmd())}
                  title="完了予定を今日(JST)で自動入力"
                >
                  <ClockIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className={[
                  "inline-flex items-center gap-2 rounded-md border-2 px-3 py-2 text-[12px] font-semibold shadow-sm transition",
                  "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/50",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/35",
                ].join(" ")}
                onClick={onQuickGood}
                title={`${rightGoodLabel}として確定`}
              >
                <ThumbUpIcon className="h-4 w-4" />
                {rightGoodLabel}
              </button>

              <button
                type="button"
                className={[
                  "inline-flex items-center gap-2 rounded-md border-2 px-3 py-2 text-[12px] font-semibold shadow-sm transition",
                  "border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/30 text-rose-900 dark:text-rose-200 hover:bg-rose-100 dark:hover:bg-rose-900/50",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/35",
                ].join(" ")}
                onClick={onQuickBad}
                title={`${rightBadLabel}として確定`}
              >
                <ThumbDownIcon className="h-4 w-4" />
                {rightBadLabel}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/50 px-3 py-2 text-[12px] text-slate-700 dark:text-slate-300">
          {mode === "sales"
            ? "未契約（2回目以降の打ち合わせ含む）は商談進行で管理します。"
            : "既存企業との打ち合わせは打ち合わせ進行で管理します（受注/失注は出しません）。"}
        </div>
      </div>
    </div>
  );
}
