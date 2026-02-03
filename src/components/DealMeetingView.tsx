// src/components/deals/DealMeetingView.tsx
"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useRef, useState } from "react";



function s(v: any) {
  return String(v ?? "");
}

function safeJsonParse<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

function normalizeLines(v: string) {
  return s(v)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
}

type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

function saveTone(sx: SaveStatus) {
  if (sx === "saving") return "bg-indigo-50 text-indigo-800 border-indigo-200";
  if (sx === "saved") return "bg-emerald-50 text-emerald-800 border-emerald-200";
  if (sx === "error") return "bg-rose-50 text-rose-800 border-rose-200";
  if (sx === "dirty") return "bg-amber-50 text-amber-900 border-amber-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

function SavePill({ status }: { status: SaveStatus }) {
  const label =
    status === "saving"
      ? "保存中…"
      : status === "saved"
        ? "保存済み"
        : status === "error"
          ? "保存エラー"
          : status === "dirty"
            ? "未保存"
            : "—";
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold",
        saveTone(status),
      ].join(" ")}
      title={status === "dirty" ? "変更があります。保存してください。" : undefined}
    >
      {label}
    </span>
  );
}



const UI = {
  PANEL: ["rounded-md", "border-2", "border-slate-200/80", "bg-white", "shadow-sm"].join(" "),
  PANEL_HDR: [
    "flex items-start justify-between gap-3",
    "border-b-2",
    "border-slate-200/80",
    "px-4 py-3",
  ].join(" "),
  PANEL_TITLE: "text-[13px] font-semibold text-slate-900",
  PANEL_SUB: "mt-0.5 text-[12px] text-slate-700/90 font-medium",
  PANEL_BODY: "px-4 py-3",

  LINK: "text-[12px] font-semibold text-indigo-700/95 whitespace-nowrap hover:text-indigo-800 hover:underline",

  INPUT: [
    "w-full rounded-md border-2 border-slate-200/80 bg-white px-3 py-2",
    "text-[13px] text-slate-900",
    "outline-none",
    "focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200/40",
  ].join(" "),
  TEXTAREA: [
    "w-full rounded-md border-2 border-slate-200/80 bg-white px-3 py-2",
    "text-[13px] text-slate-900",
    "outline-none",
    "focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200/40",
    "min-h-[120px] resize-y",
  ].join(" "),
  LABEL: "text-[11px] font-semibold tracking-wide text-slate-600",

  BADGE:
    "inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700",
} as const;



/**
 * deal.memo に meeting 用の構造データを埋め込む（DB改修なしV1）
 * - 人に見える自由メモ部分は通常通り（議事メモ）
 * - 構造データはコメントブロックにJSONで格納
 *
 * 形式:
 *   <自由メモ...>
 *
 *   <!--MEETING:{"objective":"...","agenda":"...","decisions":"...","nextDate":"YYYY-MM-DD","actions":"- ...\n- ..."}-->
 */
const MEETING_TAG_PREFIX = "<!--MEETING:";
const MEETING_TAG_SUFFIX = "-->";

type MeetingState = {
  objective: string;
  agenda: string;
  decisions: string;
  nextDate: string;
  decisionFlow: string;
  actions: string; // "- xxx\n- yyy" 形式推奨
};

function defaultMeeting(): MeetingState {
  return {
    objective: "",
    agenda: "",
    decisions: "",
    nextDate: "",
    decisionFlow: "",
    actions: "",
  };
}

function splitMemo(rawMemo: string): { freeMemo: string; meeting: MeetingState } {
  const memo = normalizeLines(s(rawMemo));
  const idx = memo.lastIndexOf(MEETING_TAG_PREFIX);
  if (idx < 0) {
    return { freeMemo: memo.trim(), meeting: defaultMeeting() };
  }

  const after = memo.slice(idx);
  const endIdx = after.indexOf(MEETING_TAG_SUFFIX);
  if (endIdx < 0) {
    // 壊れたタグは無視
    return { freeMemo: memo.trim(), meeting: defaultMeeting() };
  }

  const jsonText = after.slice(MEETING_TAG_PREFIX.length, endIdx);
  const meeting = safeJsonParse<MeetingState>(jsonText, defaultMeeting());

  const freeMemo = memo.slice(0, idx).trim();
  return { freeMemo, meeting: { ...defaultMeeting(), ...meeting } };
}

function buildMemoWithMeeting(freeMemo: string, meeting: MeetingState) {
  const payload = {
    objective: s(meeting.objective),
    agenda: s(meeting.agenda),
    decisions: s(meeting.decisions),
    nextDate: s(meeting.nextDate),
    decisionFlow: s(meeting.decisionFlow),
    actions: s(meeting.actions),
  };
  const tag = `${MEETING_TAG_PREFIX}${JSON.stringify(payload)}${MEETING_TAG_SUFFIX}`;
  const a = s(freeMemo).trim();
  return a ? `${a}\n\n${tag}` : `${tag}`;
}



function kv(label: string, value: React.ReactNode) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="text-[11px] font-semibold tracking-wide text-slate-600">{label}</div>
      <div className="text-right text-[12px] font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function SummaryCard({
  companyName,
  dealTitle,
  stage,
  profile,
  meeting,
}: {
  companyName: string;
  dealTitle: string;
  stage: string;
  profile: any;
  meeting: MeetingState;
}) {
  const loc = [s(profile?.location_prefecture), s(profile?.location_city)].filter(Boolean).join(" ");

  return (
    <div className={[UI.PANEL, "relative overflow-hidden"].join(" ")}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/45 via-white to-purple-50/40" />
        <div className="absolute -left-36 -top-36 h-[520px] w-[520px] rounded-full bg-blue-200/12 blur-3xl" />
        <div className="absolute -right-40 -bottom-40 h-[560px] w-[560px] rounded-full bg-purple-200/10 blur-3xl" />
      </div>

      <div className="relative px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[12px] font-semibold text-slate-600">提案サマリ</div>
            <div className="mt-1 text-[16px] font-semibold text-slate-900 truncate">{companyName}</div>
            <div className="mt-1 text-[12px] font-semibold text-slate-700 truncate">
              {dealTitle || "(商談名未設定)"}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700">
                ステージ: <span className="ml-1">{stage || "-"}</span>
              </span>
              {meeting.nextDate ? (
                <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-800">
                  次回: <span className="ml-1 tabular-nums">{meeting.nextDate}</span>
                </span>
              ) : null}
            </div>
          </div>

          <div className="shrink-0">
            <div className="rounded-md border border-slate-200 bg-white/70 px-3 py-2 text-[11px] text-slate-700">
              「話した内容が即座に整理される」<br />
              ＝商談の推進力
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="rounded-md border-2 border-slate-200/80 bg-white px-3 py-3">
            <div className="text-[12px] font-semibold text-slate-900">要件</div>
            <div className="mt-2 space-y-2">
              {kv("採用目標", s(profile?.hiring_goal) || "-")}
              {kv("職種", s(profile?.main_job_category) || "-")}
              {kv("勤務地", loc || "-")}
              {kv("難易度", s(profile?.hiring_difficulty) || "-")}
            </div>
          </div>

          <div className="rounded-md border-2 border-slate-200/80 bg-white px-3 py-3">
            <div className="text-[12px] font-semibold text-slate-900">提案条件</div>
            <div className="mt-2 space-y-2">
              {kv("プラン", s(profile?.contract_plan) || "-")}
              {kv("キャンペーン", s(profile?.campaign_applied) || "-")}
              {kv("MRR", s(profile?.mrr) || "-")}
              {kv("請求", s(profile?.billing_cycle) || "-")}
              {kv("支払", s(profile?.payment_method) || "-")}
            </div>
          </div>

          <div className="rounded-md border-2 border-slate-200/80 bg-white px-3 py-3 lg:col-span-2">
            <div className="flex items-start justify-between gap-3">
              <div className="text-[12px] font-semibold text-slate-900">合意事項</div>
              {meeting.decisionFlow ? (
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700">
                  決裁: <span className="ml-1">{meeting.decisionFlow}</span>
                </span>
              ) : null}
            </div>

            <div className="mt-2 grid grid-cols-1 gap-3 lg:grid-cols-2">
              <div className="rounded-md border border-slate-200 bg-white/70 px-3 py-2">
                <div className="text-[11px] font-semibold tracking-wide text-slate-600">目的</div>
                <div className="mt-1 text-[12px] font-semibold text-slate-900 whitespace-pre-wrap">
                  {meeting.objective || "—"}
                </div>
              </div>

              <div className="rounded-md border border-slate-200 bg-white/70 px-3 py-2">
                <div className="text-[11px] font-semibold tracking-wide text-slate-600">決定事項</div>
                <div className="mt-1 text-[12px] font-semibold text-slate-900 whitespace-pre-wrap">
                  {meeting.decisions || "—"}
                </div>
              </div>

              <div className="rounded-md border border-slate-200 bg-white/70 px-3 py-2 lg:col-span-2">
                <div className="text-[11px] font-semibold tracking-wide text-slate-600">次アクション</div>
                <div className="mt-1 text-[12px] font-semibold text-slate-900 whitespace-pre-wrap">
                  {meeting.actions?.trim() ? meeting.actions.trim() : "—"}
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-[12px] font-semibold text-indigo-900">
              ここまでが「相手に見せる」情報です（フォームは見せない）。
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



export function DealMeetingView({
  dealId,
  companyName,
  dealTitle,
  stage,
  profile,
  memoRaw,
  saveStatus,
  saveError,
  onSaveMemo,
  onGoNormal,
  share,
}: {
  dealId: string;
  companyName: string;
  dealTitle: string;
  stage: string;
  profile: any;
  memoRaw: string;
  saveStatus: SaveStatus;
  saveError: string;
  onSaveMemo: (memoToSave: string) => Promise<void>;
  onGoNormal: () => void;
  share: boolean;
}) {
  const init = useMemo(() => splitMemo(memoRaw), [memoRaw]);
  const [freeMemo, setFreeMemo] = useState(init.freeMemo);
  const [meeting, setMeeting] = useState<MeetingState>(init.meeting);

  // dirty 判定（このコンポーネント内：UI用）
  const baseRef = useRef<string>("");
  const suppressRef = useRef(false);

  useEffect(() => {
    // 初回ベースライン
    suppressRef.current = true;
    setFreeMemo(init.freeMemo);
    setMeeting(init.meeting);
    baseRef.current = JSON.stringify({ freeMemo: init.freeMemo, meeting: init.meeting });
    suppressRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId]);

  const currentKey = useMemo(() => {
    try {
      return JSON.stringify({ freeMemo, meeting });
    } catch {
      return String(Date.now());
    }
  }, [freeMemo, meeting]);

  const isDirtyLocal = useMemo(() => {
    if (!baseRef.current) return false;
    return currentKey !== baseRef.current;
  }, [currentKey]);

  // Ctrl/Cmd + S
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMac = typeof navigator !== "undefined" && /Mac/i.test(navigator.platform);
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (!mod) return;
      if (e.key.toLowerCase() !== "s") return;
      e.preventDefault();
      void handleSave();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freeMemo, meeting]);

  // 自動保存（share=false のときのみ。V1）
  const debounceRef = useRef<number | null>(null);
  useEffect(() => {
    if (share) return;
    if (!isDirtyLocal) return;
    if (saveStatus === "saving") return;

    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      void handleSave();
      debounceRef.current = null;
    }, 1400);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirtyLocal, freeMemo, meeting, share]);

  async function handleSave() {
    if (suppressRef.current) return;
    const memoToSave = buildMemoWithMeeting(freeMemo, meeting);
    await onSaveMemo(memoToSave);

    // 保存成功した前提でベース更新（失敗は親がsaveStatus=errorにする）
    baseRef.current = JSON.stringify({ freeMemo, meeting });
  }

  const header = (
    <div className={[UI.PANEL, "bg-white/82 backdrop-blur"].join(" ")}>
      <div className={UI.PANEL_HDR}>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[12px] text-slate-600">
            <Link href="/deals" className={UI.LINK}>
              商談
            </Link>
            <span className="text-slate-300">/</span>
            <span className="font-semibold text-slate-900">商談モード</span>

            <SavePill status={saveStatus} />
            {share ? (
              <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-800">
                共有モード
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700">
                社内モード
              </span>
            )}

            {isDirtyLocal && saveStatus !== "saving" ? (
              <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-900">
                入力中（自動保存）
              </span>
            ) : null}

            <span className={UI.BADGE}>
              Cmd/Ctrl + S: <span className="ml-1">保存</span>
            </span>
          </div>

          <div className="mt-1 text-[13px] font-semibold text-slate-900">
            {companyName}
            <span className="text-slate-400"> / </span>
            {dealTitle || "(商談名未設定)"}
          </div>

          <div className="mt-1 text-[12px] text-slate-700/90 font-medium">
            相手に見せるのは右の「提案サマリ」。左は社内の進行用です。
          </div>

          {saveStatus === "error" ? (
            <div className="mt-2 text-[12px] text-rose-700">保存エラー: {saveError}</div>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={`/deals/${encodeURIComponent(dealId)}?view=meeting${share ? "" : "&share=1"}`}
            className="cv-btn-secondary !px-3 !py-1.5 text-[12px] whitespace-nowrap"
            title="共有モード切替"
          >
            {share ? "社内モードへ" : "共有モードへ"}
          </Link>

          <button
            type="button"
            className="cv-btn-secondary !px-3 !py-1.5 text-[12px] whitespace-nowrap"
            onClick={onGoNormal}
            title="通常ビューへ戻る"
          >
            通常ビューへ
          </button>

          <button
            type="button"
            className="cv-btn-primary whitespace-nowrap"
            onClick={() => void handleSave()}
            disabled={saveStatus === "saving"}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );

  // share=1：カード中心（入力は出さない）
  if (share) {
    return (
      <div className="space-y-3">
        {header}
        <SummaryCard companyName={companyName} dealTitle={dealTitle} stage={stage} profile={profile} meeting={meeting} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {header}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Left: internal */}
        <section className={UI.PANEL}>
          <div className={UI.PANEL_HDR}>
            <div className="min-w-0">
              <div className={UI.PANEL_TITLE}>社内：進行（入力）</div>
              <div className={UI.PANEL_SUB}>その場で合意形成に寄せるためのスロットです。</div>
            </div>
          </div>

          <div className={UI.PANEL_BODY}>
            <div className="space-y-3">
              <div>
                <div className={UI.LABEL}>本日の目的（相手にも共有しやすい一文）</div>
                <input
                  className={UI.INPUT}
                  value={meeting.objective}
                  onChange={(e) => setMeeting((p) => ({ ...p, objective: e.target.value }))}
                  placeholder="例）採用人数と開始時期を確定し、次回までの宿題を合意する"
                />
              </div>

              <div>
                <div className={UI.LABEL}>アジェンダ（箇条書きOK）</div>
                <textarea
                  className={UI.TEXTAREA}
                  value={meeting.agenda}
                  onChange={(e) => setMeeting((p) => ({ ...p, agenda: e.target.value }))}
                  placeholder={"例）\n- 現状の採用状況\n- 要件と時期\n- 提案の方向性\n- 次回と宿題"}
                />
              </div>

              <div>
                <div className={UI.LABEL}>決定事項（この場で確定したこと）</div>
                <textarea
                  className={UI.TEXTAREA}
                  value={meeting.decisions}
                  onChange={(e) => setMeeting((p) => ({ ...p, decisions: e.target.value }))}
                  placeholder={"例）\n- 採用人数：5名\n- 開始時期：4月\n- まずは保育士に集中"}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <div>
                  <div className={UI.LABEL}>次回（YYYY-MM-DD）</div>
                  <input
                    className={UI.INPUT}
                    value={meeting.nextDate}
                    onChange={(e) => setMeeting((p) => ({ ...p, nextDate: e.target.value }))}
                    placeholder="YYYY-MM-DD"
                  />
                </div>
                <div>
                  <div className={UI.LABEL}>決裁フロー（簡易）</div>
                  <input
                    className={UI.INPUT}
                    value={meeting.decisionFlow}
                    onChange={(e) => setMeeting((p) => ({ ...p, decisionFlow: e.target.value }))}
                    placeholder="例）当日OK / 稟議 / 理事会"
                  />
                </div>
              </div>

              <div>
                <div className={UI.LABEL}>次アクション（相手と自分の宿題をここに）</div>
                <textarea
                  className={UI.TEXTAREA}
                  value={meeting.actions}
                  onChange={(e) => setMeeting((p) => ({ ...p, actions: e.target.value }))}
                  placeholder={"例）\n- 先方：求人票の現状を共有（職種別）\n- 当方：提案プランと概算を提示\n- 次回：媒体の優先順位を決める"}
                />
                <div className="mt-1 text-[11px] text-slate-500">
                  共有モードでは右のカードにそのまま整形されて表示されます。
                </div>
              </div>

              <div className="pt-2">
                <div className="rounded-md border border-slate-200 bg-white/70 px-3 py-2 text-[12px] text-slate-700">
                  V1はDB改修なしで、ここで入力した内容を <span className="font-semibold">deal.memo</span> に構造化して保存します。
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Right: share card */}
        <SummaryCard companyName={companyName} dealTitle={dealTitle} stage={stage} profile={profile} meeting={meeting} />
      </div>

      {/* Free memo (optional) */}
      <section className={UI.PANEL}>
        <div className={UI.PANEL_HDR}>
          <div className="min-w-0">
            <div className={UI.PANEL_TITLE}>議事メモ（自由記述）</div>
            <div className={UI.PANEL_SUB}>雑多なメモ。構造化は上のスロットで行います。</div>
          </div>
        </div>
        <div className={UI.PANEL_BODY}>
          <textarea
            className={UI.TEXTAREA}
            value={freeMemo}
            onChange={(e) => setFreeMemo(e.target.value)}
            placeholder="ここは自由にメモしてください。"
          />
        </div>
      </section>
    </div>
  );
}
