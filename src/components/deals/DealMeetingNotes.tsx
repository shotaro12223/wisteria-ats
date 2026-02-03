// src/components/deals/DealMeetingNotes.tsx

import { VoiceInputButton } from "./VoiceInputButton";

const UI = {
  PANEL: "rounded-md border-2 border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm",
  PANEL_HDR: "flex items-start justify-between gap-3 border-b-2 border-slate-200/80 dark:border-slate-700 px-4 py-3",
  PANEL_TITLE: "text-[13px] font-semibold text-slate-900 dark:text-slate-100",
  PANEL_SUB: "mt-0.5 text-[12px] text-slate-700/90 dark:text-slate-300 font-medium",
  PANEL_BODY: "px-4 py-3",
  LABEL: "text-[11px] font-semibold tracking-wide text-slate-600 dark:text-slate-400",
  TEXTAREA: [
    "w-full rounded-md border-2 border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2",
    "text-[13px] text-slate-900 dark:text-slate-100",
    "outline-none",
    "focus:border-indigo-300 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200/40 dark:focus:ring-indigo-500/40",
    "min-h-[120px] resize-y",
  ].join(" "),
};

export function DealMeetingNotes({
  meetingGoal,
  meetingRisks,
  meetingNext,
  memo,
  onChangeGoal,
  onChangeRisks,
  onChangeNext,
  onChangeMemo,
}: {
  meetingGoal: string;
  meetingRisks: string;
  meetingNext: string;
  memo: string;
  onChangeGoal: (v: string) => void;
  onChangeRisks: (v: string) => void;
  onChangeNext: (v: string) => void;
  onChangeMemo: (v: string) => void;
}) {
  return (
    <section className={UI.PANEL}>
      <div className={UI.PANEL_HDR}>
        <div className="min-w-0">
          <div className={UI.PANEL_TITLE}>社内メモ（商談中）</div>
          <div className={UI.PANEL_SUB}>相手に見せない前提。話す順番と次アクションを固定します。</div>
        </div>
      </div>

      <div className={UI.PANEL_BODY}>
        <div className="grid grid-cols-1 gap-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className={UI.LABEL}>今日のゴール</div>
              <VoiceInputButton
                onTranscript={(text) => onChangeGoal(meetingGoal ? `${meetingGoal}\n${text}` : text)}
              />
            </div>
            <textarea
              className={UI.TEXTAREA}
              value={meetingGoal}
              onChange={(e) => onChangeGoal(e.target.value)}
              placeholder="例）採用人数/職種/勤務地を確定、決裁フローを把握、次回日程合意"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className={UI.LABEL}>懸念 / ブロッカー</div>
              <VoiceInputButton
                onTranscript={(text) => onChangeRisks(meetingRisks ? `${meetingRisks}\n${text}` : text)}
              />
            </div>
            <textarea
              className={UI.TEXTAREA}
              value={meetingRisks}
              onChange={(e) => onChangeRisks(e.target.value)}
              placeholder="例）予算、媒体切替タイミング、稟議、競合…"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className={UI.LABEL}>次アクション（ToDo）</div>
              <VoiceInputButton
                onTranscript={(text) => onChangeNext(meetingNext ? `${meetingNext}\n${text}` : text)}
              />
            </div>
            <textarea
              className={UI.TEXTAREA}
              value={meetingNext}
              onChange={(e) => onChangeNext(e.target.value)}
              placeholder="例）提案書送付、求人票叩き台、次回MTG、決裁者同席…"
            />
            <div className="mt-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/50 px-3 py-2 text-[12px] text-slate-700 dark:text-slate-300">
              ※このメモは現状DB保存しません（V1）。
            </div>
          </div>

          <div className="pt-1">
            <div className="flex items-center justify-between mb-2">
              <div className={UI.LABEL}>商談固有メモ（DB保存）</div>
              <VoiceInputButton
                onTranscript={(text) => onChangeMemo(memo ? `${memo}\n${text}` : text)}
              />
            </div>
            <textarea className={UI.TEXTAREA} value={memo} onChange={(e) => onChangeMemo(e.target.value)} />
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">こちらは既存どおり deals.memo に保存されます。</div>
          </div>
        </div>
      </div>
    </section>
  );
}
