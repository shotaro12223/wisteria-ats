// src/app/deals/new/page.tsx
"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";



function s(v: any) {
  return String(v ?? "");
}

/** yyyy-mm-dd を厳密に扱う（空なら空） */
function normDate(v: any) {
  const x = String(v ?? "").trim();
  if (!x) return "";
  return x;
}

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}



const UI = {
  PANEL: ["rounded-md", "border-2", "border-slate-200/80", "dark:border-slate-700", "bg-white", "dark:bg-slate-800", "shadow-sm"].join(" "),
  PANEL_HDR: [
    "flex items-start justify-between gap-3",
    "border-b-2",
    "border-slate-200/80",
    "dark:border-slate-700",
    "px-4 py-3",
  ].join(" "),
  PANEL_TITLE: "text-[13px] font-semibold text-slate-900 dark:text-slate-100",
  PANEL_SUB: "mt-0.5 text-[12px] text-slate-700/90 dark:text-slate-400 font-medium",
  PANEL_BODY: "px-4 py-3",

  LINK: "text-[12px] font-semibold text-indigo-700/95 dark:text-indigo-400 whitespace-nowrap hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline",

  INPUT: [
    "w-full rounded-md border-2 border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2",
    "text-[13px] text-slate-900 dark:text-slate-100",
    "placeholder:text-slate-400 dark:placeholder:text-slate-500",
    "outline-none",
    "focus:border-indigo-300 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200/40 dark:focus:ring-indigo-500/20",
  ].join(" "),
  TEXTAREA: [
    "w-full rounded-md border-2 border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2",
    "text-[13px] text-slate-900 dark:text-slate-100",
    "placeholder:text-slate-400 dark:placeholder:text-slate-500",
    "outline-none",
    "focus:border-indigo-300 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200/40 dark:focus:ring-indigo-500/20",
    "min-h-[120px] resize-y",
  ].join(" "),
  LABEL: "text-[11px] font-semibold tracking-wide text-slate-600 dark:text-slate-400",

  BADGE:
    "inline-flex items-center rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300",

  PAGE_BG: "relative",

  // CTA
  CTA: [
    "inline-flex items-center justify-center rounded-md",
    "px-4 py-2",
    "text-[13px] font-semibold",
    "border-2 border-indigo-600 dark:border-indigo-500",
    "bg-indigo-600 dark:bg-indigo-500 text-white",
    "shadow-sm",
    "hover:bg-indigo-700 dark:hover:bg-indigo-600 hover:border-indigo-700 dark:hover:border-indigo-600",
    "disabled:opacity-60 disabled:cursor-not-allowed",
  ].join(" "),
  CTA_SUB: "text-[11px] text-slate-600 dark:text-slate-400 font-medium",
} as const;



// 商談ステージ（最小）
const DEAL_STAGES = ["ヒアリング", "提案", "見積", "受注", "失注"] as const;
type DealStage = (typeof DEAL_STAGES)[number];



type CreateDealRes = { ok: true; dealId: string } | { ok: false; error: { message: string } };

type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

function saveTone(sx: SaveStatus) {
  if (sx === "saving") return "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800";
  if (sx === "saved") return "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
  if (sx === "error") return "bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800";
  if (sx === "dirty") return "bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 border-amber-200 dark:border-amber-800";
  return "bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";
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



type StartSnapshot = {
  companyName: string;
  mainJobCategory: string;
  locationPrefecture: string;
  hiringGoal: string;
  decisionMakerTitle: string;
};

function buildStartSnapshot(input: StartSnapshot) {
  const companyName = s(input.companyName).trim();
  const mainJobCategory = s(input.mainJobCategory).trim();
  const locationPrefecture = s(input.locationPrefecture).trim();
  const hiringGoal = s(input.hiringGoal).trim();
  const decisionMakerTitle = s(input.decisionMakerTitle).trim();

  const issues: string[] = [];
  if (!companyName) issues.push("会社名が未入力");
  if (!mainJobCategory) issues.push("採用職種が未入力");
  if (!locationPrefecture) issues.push("勤務地（都道府県）が未入力");
  if (!hiringGoal) issues.push("採用人数（目標）が未入力");
  if (!decisionMakerTitle) issues.push("決裁者（役職）が未入力");

  return {
    companyName,
    mainJobCategory,
    locationPrefecture,
    hiringGoal,
    decisionMakerTitle,
    issues,
  };
}

function estimateDifficulty(mainJobCategory: string, hiringGoal: string, pref: string) {
  const g = s(hiringGoal);
  const goalNum = (() => {
    const digits = g.match(/\d+/g);
    if (!digits || digits.length === 0) return NaN;
    const nums = digits.map((d) => Number(d)).filter((x) => Number.isFinite(x));
    if (nums.length === 0) return NaN;
    return Math.max(...nums);
  })();

  const job = s(mainJobCategory).toLowerCase();

  let base = 0;
  if (job.includes("保育") || job.includes("介護") || job.includes("看護") || job.includes("施工")) base += 2;
  if (job.includes("営業") || job.includes("コール") || job.includes("販売")) base += 1;
  if (job.includes("エンジニア") || job.includes("データ") || job.includes("ai")) base += 2;

  if (Number.isFinite(goalNum)) {
    if (goalNum >= 10) base += 2;
    else if (goalNum >= 5) base += 1;
  }

  const p = s(pref);
  if (p.includes("東京") || p.includes("大阪") || p.includes("神奈川") || p.includes("愛知") || p.includes("福岡")) {
    base += 0;
  } else if (p) {
    base += 1;
  }

  if (base >= 4) return "高";
  if (base >= 2) return "中";
  return "低";
}

function buildAgendaSuggestions(difficulty: "低" | "中" | "高", job: string) {
  const base = [
    "採用の背景（欠員/増員/新規）",
    "入職希望時期（いつまでに何名）",
    "給与レンジ・手当・残業",
    "勤務シフト・休日・夜勤有無",
    "必須/歓迎要件（経験・資格）",
    "現状の募集媒体/紹介/競合",
    "決裁フロー（同席者・次回日程）",
  ];

  const extras: string[] = [];
  const j = s(job).toLowerCase();
  if (j.includes("保育") || j.includes("介護") || j.includes("看護")) {
    extras.push("配置基準・加算・運営形態（法人/園/施設）");
    extras.push("資格要件（必須/条件緩和の余地）");
  }
  if (j.includes("施工") || j.includes("現場")) {
    extras.push("現場エリア/移動手段/直行直帰");
    extras.push("資格（施工管理/電気工事士 等）");
  }
  if (difficulty === "高") {
    extras.push("採用できない理由の仮説（給与/勤務地/要件/媒体/訴求）");
    extras.push("勝ち筋の設計（母集団→面接率→内定率）");
  }

  return uniq([...base, ...extras]);
}

function buildWowSummary(params: {
  companyName: string;
  mainJobCategory: string;
  locationPrefecture: string;
  hiringGoal: string;
  decisionMakerTitle: string;
}) {
  const difficulty = estimateDifficulty(params.mainJobCategory, params.hiringGoal, params.locationPrefecture);
  const agenda = buildAgendaSuggestions(difficulty as any, params.mainJobCategory);

  const nextActions = (() => {
    if (difficulty === "高") {
      return [
        "次回：決裁者同席で条件（給与/要件）とKPI（応募→面接→内定）を合意",
        "当日中：求人票の訴求案（3パターン）を作る",
        "48時間以内：競合/相場の簡易レポートを提示",
      ];
    }
    if (difficulty === "中") {
      return [
        "次回：採用条件（給与/シフト）と媒体方針を合意",
        "当日中：求人票の訴求案（2パターン）を作る",
        "48時間以内：面接導線の改善案を提示",
      ];
    }
    return [
      "次回：条件確認と運用フロー（面接日程/連絡手段）を合意",
      "当日中：求人票の整形（要件/訴求）",
      "48時間以内：初速最大化の配信プランを提示",
    ];
  })();

  const pitchLine =
    difficulty === "高"
      ? "難易度が高い前提で「勝ち筋」を先に合意し、短期で結果に繋げます。"
      : difficulty === "中"
        ? "条件の最適化と運用設計で、面接率と内定率を引き上げます。"
        : "初速を最大化し、運用負荷を抑えつつ安定して採用できる形にします。";

  return {
    difficulty: difficulty as "低" | "中" | "高",
    pitchLine,
    agenda,
    nextActions,
  };
}



const TOPBAR_H = 44;

export default function DealNewPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const mode = useMemo(() => (sp?.get("mode") ?? "").trim(), [sp]);
  const isShareMode = mode === "share";

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // ---- Start-first（商談開始に必要な最小）----
  const [companyName, setCompanyName] = useState("");
  const [mainJobCategory, setMainJobCategory] = useState("");
  const [locationPrefecture, setLocationPrefecture] = useState("");
  const [hiringGoal, setHiringGoal] = useState("");
  const [decisionMakerTitle, setDecisionMakerTitle] = useState("");

  // ---- Deal core（作成に必要な最低限）----
  const [dealTitle, setDealTitle] = useState("初回ヒアリング");
  const [dealStage, setDealStage] = useState<DealStage>("ヒアリング");
  const [dealStartDate, setDealStartDate] = useState("");
  const [dealDueDate, setDealDueDate] = useState("");
  const [dealMemo, setDealMemo] = useState("");

  // dirty 管理（最小）
  const baselineRef = useRef<string>("");
  const suppressDirtyRef = useRef(false);
  const savedTimerRef = useRef<number | null>(null);

  const startSnapshot = useMemo(() => {
    return buildStartSnapshot({
      companyName,
      mainJobCategory,
      locationPrefecture,
      hiringGoal,
      decisionMakerTitle,
    });
  }, [companyName, mainJobCategory, locationPrefecture, hiringGoal, decisionMakerTitle]);

  const wow = useMemo(() => {
    if (!startSnapshot.companyName) return null;
    return buildWowSummary({
      companyName: startSnapshot.companyName,
      mainJobCategory: startSnapshot.mainJobCategory,
      locationPrefecture: startSnapshot.locationPrefecture,
      hiringGoal: startSnapshot.hiringGoal,
      decisionMakerTitle: startSnapshot.decisionMakerTitle,
    });
  }, [
    startSnapshot.companyName,
    startSnapshot.mainJobCategory,
    startSnapshot.locationPrefecture,
    startSnapshot.hiringGoal,
    startSnapshot.decisionMakerTitle,
  ]);

  const startReady = startSnapshot.issues.length === 0;

  useEffect(() => {
    baselineRef.current = snapshotKey();
    return () => {
      if (savedTimerRef.current) window.clearTimeout(savedTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function snapshotKey() {
    try {
      return JSON.stringify(buildPayload());
    } catch {
      return String(Date.now());
    }
  }

  function markDirtyIfNeeded() {
    if (suppressDirtyRef.current) return;
    const base = baselineRef.current;
    if (!base) return;
    const nowKey = snapshotKey();
    if (nowKey !== base) {
      setSaveStatus((p) => (p === "saving" ? "saving" : "dirty"));
    } else {
      setSaveStatus((p) => (p === "saving" ? "saving" : "idle"));
    }
  }

  useEffect(() => {
    markDirtyIfNeeded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    companyName,
    mainJobCategory,
    locationPrefecture,
    hiringGoal,
    decisionMakerTitle,
    dealTitle,
    dealStage,
    dealStartDate,
    dealDueDate,
    dealMemo,
  ]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMac = typeof navigator !== "undefined" && /Mac/i.test(navigator.platform);
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (!mod) return;
      if (e.key.toLowerCase() !== "s") return;
      e.preventDefault();
      void handleStart();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    companyName,
    mainJobCategory,
    locationPrefecture,
    hiringGoal,
    decisionMakerTitle,
    dealTitle,
    dealStage,
    dealStartDate,
    dealDueDate,
    dealMemo,
  ]);

  function showSavedOnce() {
    setSaveStatus("saved");
    if (savedTimerRef.current) window.clearTimeout(savedTimerRef.current);
    savedTimerRef.current = window.setTimeout(() => {
      setSaveStatus("idle");
      savedTimerRef.current = null;
    }, 1400);
  }

  function buildPayload() {
    const profileBase: any = {
      lifecycle: "prospect",
      main_job_category: s(mainJobCategory),
      location_prefecture: s(locationPrefecture),
      hiring_goal: s(hiringGoal),
      decision_maker_title: s(decisionMakerTitle),
    };

    return {
      kind: "new",
      companyName: s(companyName).trim(),
      record: {
        status: "active",
        tags: [] as string[],
        memo: "",
        profile: profileBase,
      },
      deal: {
        title: s(dealTitle).trim(),
        stage: dealStage,
        startDate: normDate(dealStartDate) || null,
        dueDate: normDate(dealDueDate) || null,
        amount: null as number | null,
        probability: null as number | null,
        memo: s(dealMemo),
      },
    };
  }

  async function handleStart() {
    if (!startReady) {
      setSaveStatus("error");
      setErrorMessage(`未入力があります: ${startSnapshot.issues.join(" / ")}`);
      return;
    }

    setSaveStatus("saving");
    setErrorMessage("");

    try {
      const payload = buildPayload();

      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(payload),
      });

      const json = (await res.json()) as CreateDealRes;

      if (!res.ok || !json.ok) {
        const msg = !json.ok ? json.error.message : `save failed (status: ${res.status})`;
        throw new Error(msg);
      }

      suppressDirtyRef.current = true;
      baselineRef.current = snapshotKey();
      suppressDirtyRef.current = false;

      showSavedOnce();

      router.push(`/deals/${encodeURIComponent(json.dealId)}`);
    } catch (e: any) {
      setSaveStatus("error");
      setErrorMessage(String(e?.message ?? e ?? "save failed"));
    }
  }

  const shareModeBadge = isShareMode ? (
    <span className={[UI.BADGE, "border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-300"].join(" ")}>共有モード</span>
  ) : (
    <span className={UI.BADGE}>社内モード</span>
  );

  return (
    <div className={[UI.PAGE_BG, "space-y-3"].join(" ")}>
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900" />
        <div className="absolute -left-44 -top-52 h-[560px] w-[560px] rounded-full bg-blue-200/12 dark:bg-blue-500/5 blur-3xl" />
        <div className="absolute -right-48 -top-44 h-[620px] w-[620px] rounded-full bg-purple-200/10 dark:bg-purple-500/5 blur-3xl" />
        <div className="absolute left-1/2 top-24 h-56 w-[720px] -translate-x-1/2 rounded-full bg-indigo-200/08 dark:bg-indigo-500/5 blur-3xl" />
      </div>

      {/* Header */}
      <div className="sticky z-40" style={{ top: `${TOPBAR_H}px` }}>
        <div className={[UI.PANEL, "bg-white/82 dark:bg-slate-800/82 backdrop-blur"].join(" ")}>
          <div className={UI.PANEL_HDR}>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[12px] text-slate-600 dark:text-slate-400">
                <Link href="/" className={UI.LINK}>
                  Home
                </Link>
                <span className="text-slate-300 dark:text-slate-600">/</span>
                <Link href="/deals" className={UI.LINK}>
                  商談
                </Link>
                <span className="text-slate-300 dark:text-slate-600">/</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">商談スタート</span>

                <SavePill status={saveStatus} />
                {shareModeBadge}

                <span className={UI.BADGE}>
                  Cmd/Ctrl + S: <span className="ml-1">開始</span>
                </span>
              </div>

              <div className="mt-1 text-[12px] text-slate-700/90 dark:text-slate-400 font-medium">
                最低限だけ入力して開始 → 商談詳細画面で必要な情報を追記できます。
              </div>

              {saveStatus === "error" ? (
                <div className="mt-2 text-[12px] text-rose-700 dark:text-rose-400">開始できません: {errorMessage}</div>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Link
                href={isShareMode ? "/deals/new" : "/deals/new?mode=share"}
                className="cv-btn-secondary !px-3 !py-1.5 text-[12px] whitespace-nowrap"
                title="表示モード切替"
              >
                {isShareMode ? "社内モードへ" : "共有モードへ"}
              </Link>

              <button type="button" className={UI.CTA} onClick={handleStart} disabled={saveStatus === "saving"}>
                商談スタート
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main - 3 column layout: ~lg:1col, lg~2xl:2col, 2xl~:3col */}
      <main className="space-y-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6 2xl:grid-cols-[1fr_1fr_320px] 2xl:gap-8">
          {/* Left: Start Card */}
          <section className={UI.PANEL}>
            <div className={UI.PANEL_HDR}>
              <div className="min-w-0">
                <div className={UI.PANEL_TITLE}>30秒で開始（最低限ヒアリング）</div>
                <div className={UI.PANEL_SUB}>
                  ここだけ埋めれば開始。詳細は商談開始後に追記できます。
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {!startReady ? (
                  <span className={[UI.BADGE, "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300"].join(" ")}>
                    未入力 {startSnapshot.issues.length}件
                  </span>
                ) : (
                  <span className={[UI.BADGE, "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300"].join(" ")}>
                    開始OK
                  </span>
                )}
              </div>
            </div>

            <div className={UI.PANEL_BODY}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <div className={UI.LABEL}>会社名（必須）</div>
                  <input
                    className={UI.INPUT}
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="例）株式会社〇〇"
                  />
                </div>

                <div>
                  <div className={UI.LABEL}>採用職種（主カテゴリ）</div>
                  <input
                    className={UI.INPUT}
                    value={mainJobCategory}
                    onChange={(e) => setMainJobCategory(e.target.value)}
                    placeholder="例）保育士 / 介護 / 営業 / 施工管理"
                  />
                </div>

                <div>
                  <div className={UI.LABEL}>勤務地（都道府県）</div>
                  <input
                    className={UI.INPUT}
                    value={locationPrefecture}
                    onChange={(e) => setLocationPrefecture(e.target.value)}
                    placeholder="例）大阪府"
                  />
                </div>

                <div>
                  <div className={UI.LABEL}>採用人数（目標）</div>
                  <input
                    className={UI.INPUT}
                    value={hiringGoal}
                    onChange={(e) => setHiringGoal(e.target.value)}
                    placeholder="例）3〜5名 / 10名"
                  />
                </div>

                <div>
                  <div className={UI.LABEL}>決裁者（役職）</div>
                  <input
                    className={UI.INPUT}
                    value={decisionMakerTitle}
                    onChange={(e) => setDecisionMakerTitle(e.target.value)}
                    placeholder="例）理事長 / 代表 / 部長"
                  />
                </div>

                <div className="sm:col-span-2 pt-1">
                  <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 px-3 py-2 text-[12px] text-slate-700 dark:text-slate-300">
                    目的：管理ではなく、商談の場で意思決定を前に進めること。
                    <span className="ml-2 text-slate-500 dark:text-slate-400">
                      （詳細は商談開始後に追記）
                    </span>
                  </div>
                </div>

                <div className="sm:col-span-2 flex flex-col gap-2 pt-2">
                  <button type="button" className={UI.CTA} onClick={handleStart} disabled={saveStatus === "saving"}>
                    商談スタート
                  </button>
                  <div className={UI.CTA_SUB}>
                    ※ 「商談スタート」は deal を作成して詳細画面へ移動します
                  </div>

                  {!startReady ? (
                    <div className="rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 px-3 py-2 text-[12px] text-amber-900 dark:text-amber-300">
                      未入力：{startSnapshot.issues.join(" / ")}
                    </div>
                  ) : null}

                  {saveStatus === "error" ? (
                    <div className="rounded-md border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 px-3 py-2 text-[12px] text-rose-800 dark:text-rose-300">
                      エラー：{errorMessage}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          {/* Center: Wow Summary */}
          <section className={UI.PANEL}>
            <div className={UI.PANEL_HDR}>
              <div className="min-w-0">
                <div className={UI.PANEL_TITLE}>商談サマリー（相手に見せられる）</div>
                <div className={UI.PANEL_SUB}>入力した内容が"提案の骨子"として整形されます。</div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {wow ? (
                  <span
                    className={[
                      UI.BADGE,
                      wow.difficulty === "高"
                        ? "border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300"
                        : wow.difficulty === "中"
                          ? "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300"
                          : "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300",
                    ].join(" ")}
                    title="仮の推定です。商談の中で一緒に調整します。"
                  >
                    難易度: {wow.difficulty}
                  </span>
                ) : (
                  <span className={UI.BADGE}>—</span>
                )}
              </div>
            </div>

            <div className={UI.PANEL_BODY}>
              {!wow ? (
                <div className="text-[12px] text-slate-700 dark:text-slate-300">
                  会社名を入れると、サマリーが自動生成されます。
                  <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                    共有モードでそのまま画面共有しても違和感がない体裁にしています。
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2">
                    <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">理解した内容（暫定）</div>
                    <div className="mt-1 text-[13px] font-semibold text-slate-900 dark:text-slate-100">{startSnapshot.companyName}</div>
                    <div className="mt-1 text-[12px] text-slate-700 dark:text-slate-300">
                      採用職種：<span className="font-semibold">{startSnapshot.mainJobCategory || "—"}</span>
                      <span className="mx-2 text-slate-300 dark:text-slate-600">/</span>
                      勤務地：<span className="font-semibold">{startSnapshot.locationPrefecture || "—"}</span>
                    </div>
                    <div className="mt-1 text-[12px] text-slate-700 dark:text-slate-300">
                      採用人数：<span className="font-semibold">{startSnapshot.hiringGoal || "—"}</span>
                      <span className="mx-2 text-slate-300 dark:text-slate-600">/</span>
                      決裁：<span className="font-semibold">{startSnapshot.decisionMakerTitle || "—"}</span>
                    </div>
                  </div>

                  <div className="rounded-md border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/50 px-3 py-2">
                    <div className="text-[11px] font-semibold text-indigo-800 dark:text-indigo-300">この場での提案スタンス</div>
                    <div className="mt-1 text-[12px] text-indigo-900 dark:text-indigo-200 font-semibold">{wow.pitchLine}</div>
                    <div className="mt-1 text-[11px] text-indigo-800/90 dark:text-indigo-300/90">
                      （次回：決裁同席と条件合意 → 「勝ち筋」を固定して前に進めます）
                    </div>
                  </div>

                  <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2">
                    <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">次回アジェンダ（おすすめ）</div>
                    <ul className="mt-2 list-disc pl-5 space-y-1 text-[12px] text-slate-800 dark:text-slate-200">
                      {wow.agenda.slice(0, 7).map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                    {wow.agenda.length > 7 ? (
                      <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">+ 他 {wow.agenda.length - 7} 件</div>
                    ) : null}
                  </div>

                  <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2">
                    <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">次アクション（こちら側）</div>
                    <ol className="mt-2 list-decimal pl-5 space-y-1 text-[12px] text-slate-800 dark:text-slate-200">
                      {wow.nextActions.map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ol>
                  </div>

                  {!startReady ? (
                    <div className="rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 px-3 py-2 text-[12px] text-amber-900 dark:text-amber-300">
                      開始には最低限の入力が必要です：{startSnapshot.issues.join(" / ")}
                    </div>
                  ) : (
                    <div className="rounded-md border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-2 text-[12px] text-emerald-800 dark:text-emerald-300">
                      準備OK。商談スタートで詳細画面に移動し、会話の流れで追記できます。
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Right: Sticky aside (2xl+) - actions + usage guide */}
          <aside className="hidden 2xl:block">
            <div className="sticky space-y-4" style={{ top: `${TOPBAR_H + 80}px` }}>
              {/* Action Panel */}
              <div className={UI.PANEL}>
                <div className={UI.PANEL_HDR}>
                  <div className="min-w-0">
                    <div className={UI.PANEL_TITLE}>操作</div>
                  </div>
                  <SavePill status={saveStatus} />
                </div>
                <div className={UI.PANEL_BODY}>
                  <div className="space-y-3">
                    <button type="button" className={[UI.CTA, "w-full"].join(" ")} onClick={handleStart} disabled={saveStatus === "saving"}>
                      商談スタート
                    </button>

                    <Link
                      href={isShareMode ? "/deals/new" : "/deals/new?mode=share"}
                      className="cv-btn-secondary block w-full text-center !py-2 text-[12px]"
                    >
                      {isShareMode ? "社内モードへ" : "共有モードへ"}
                    </Link>

                    {!startReady ? (
                      <div className="rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 px-3 py-2 text-[12px] text-amber-900 dark:text-amber-300">
                        未入力：{startSnapshot.issues.join(" / ")}
                      </div>
                    ) : (
                      <div className="rounded-md border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-2 text-[12px] text-emerald-800 dark:text-emerald-300">
                        開始OK
                      </div>
                    )}

                    {saveStatus === "error" ? (
                      <div className="rounded-md border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 px-3 py-2 text-[12px] text-rose-800 dark:text-rose-300">
                        エラー：{errorMessage}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Usage Guide */}
              <div className={UI.PANEL}>
                <div className={UI.PANEL_HDR}>
                  <div className="min-w-0">
                    <div className={UI.PANEL_TITLE}>使い方（営業向け）</div>
                    <div className={UI.PANEL_SUB}>「相手が感嘆する」ための見せ方。</div>
                  </div>
                </div>
                <div className={UI.PANEL_BODY}>
                  <ol className="list-decimal pl-5 space-y-2 text-[12px] text-slate-700 dark:text-slate-300">
                    <li>共有モードに切り替えて画面共有</li>
                    <li>5項目だけ聞きながら入力</li>
                    <li>サマリーを読み上げて"理解の一致"を取る</li>
                    <li>「商談スタート」→ 詳細画面へ</li>
                  </ol>

                  <div className="mt-4 rounded-md border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 px-3 py-2 text-[12px] text-slate-700 dark:text-slate-300">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">商談開始後にできること</div>
                    <ul className="mt-2 list-disc pl-5 space-y-1">
                      <li>提案条件（プラン/MRR/支払方法）</li>
                      <li>採用要件の詳細（市区/難易度）</li>
                      <li>連絡先・決裁者情報</li>
                      <li>社内メモ・NG事項</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* Usage Guide (shows on lg, hidden on 2xl) */}
        <section className={[UI.PANEL, "block 2xl:hidden"].join(" ")}>
          <div className={UI.PANEL_HDR}>
            <div className="min-w-0">
              <div className={UI.PANEL_TITLE}>使い方（営業向け）</div>
              <div className={UI.PANEL_SUB}>「相手が感嘆する」ための見せ方。</div>
            </div>
          </div>
          <div className={UI.PANEL_BODY}>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ol className="list-decimal pl-5 space-y-2 text-[12px] text-slate-700 dark:text-slate-300">
                <li>共有モードに切り替えて画面共有（社内情報が出ません）</li>
                <li>5項目だけ聞きながら入力（30秒）</li>
                <li>右のサマリーを読み上げて"理解の一致"を取る</li>
                <li>「商談スタート」→ 詳細画面で追記しながら商談を進める</li>
              </ol>

              <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 px-3 py-2 text-[12px] text-slate-700 dark:text-slate-300">
                <div className="font-semibold text-slate-900 dark:text-slate-100">商談開始後にできること</div>
                <ul className="mt-2 list-disc pl-5 space-y-1">
                  <li>提案条件（プラン/MRR/支払方法）の入力</li>
                  <li>採用要件の詳細（市区/難易度）の補完</li>
                  <li>連絡先・決裁者情報の追記</li>
                  <li>社内メモ・NG事項の記録</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
