"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";

/* ─────────────── プレミアムHooks ─────────────── */
function useCountUp(end: number, duration = 1200) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (end === 0) { setVal(0); return; }
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(ease * end));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [end, duration]);
  return val;
}

function useTypingEffect(text: string, speed = 30) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    if (!text) { setDisplayed(""); return; }
    let i = 0;
    setDisplayed("");
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return displayed;
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return { greeting: "おはようございます", icon: "☀️" };
  if (h >= 12 && h < 17) return { greeting: "お疲れさまです", icon: "🌤" };
  if (h >= 17 && h < 21) return { greeting: "お疲れさまです", icon: "🌅" };
  return { greeting: "夜遅くまでお疲れさまです", icon: "🌙" };
}

type MailTypeValue = "application" | "non_application";

type InboxItem = {
  id: string;
  gmailMessageId: string;
  threadId: string | null;

  fromEmail: string;
  toEmail: string | null;

  companyId: string | null;
  companyName: string | null;

  jobId: string | null;

  subject: string;
  snippet: string;
  receivedAt: string;

  siteKey: string;
  status: string;

  // ✅ 追加：応募/非応募（DB: mail_type）
  mailType: MailTypeValue;

  createdAt: string;
  updatedAt: string;
};

type Job = {
  id: string;
  companyId: string | null;
  companyName: string | null;
  jobTitle: string | null;
};

type Company = {
  id: string;
  companyName: string | null;
};

type PageInfo = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
};

type InboxStatusValue = "new" | "registered" | "ng" | "interview" | "offer";

const STATUS_OPTIONS: { value: InboxStatusValue; label: string }[] = [
  { value: "new", label: "New" },
  { value: "registered", label: "連携済" },
  { value: "ng", label: "NG" },
  { value: "interview", label: "面接" },
  { value: "offer", label: "内定" },
];

const MAILTYPE_OPTIONS: { value: MailTypeValue; label: string }[] = [
  { value: "application", label: "応募" },
  { value: "non_application", label: "除外" },
];

function safePreview(s: string, max = 240) {
  const t = String(s ?? "");
  if (t.length <= max) return t;
  return t.slice(0, max) + "...";
}

function normalizeStatus(raw: string): InboxStatusValue {
  const s = String(raw ?? "").trim().toLowerCase();
  if (s === "registered") return "registered";
  if (s === "ng") return "ng";
  if (s === "interview") return "interview";
  if (s === "offer") return "offer";
  return "new";
}

function normalizeMailType(raw: any): MailTypeValue {
  const s = String(raw ?? "").trim().toLowerCase();
  if (s === "non_application" || s === "non-application" || s === "nonapplication") return "non_application";
  return "application";
}

function formatLocal(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

async function fetchJsonSafe(
  input: RequestInfo,
  init?: RequestInit
): Promise<{
  ok: boolean;
  status: number;
  contentType: string;
  json: any | null;
  text: string;
}> {
  const res = await fetch(input, init);
  const contentType = res.headers.get("content-type") ?? "";
  const text = await res.text();

  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }

  return { ok: res.ok, status: res.status, contentType, json, text };
}

function safeKey(v: any): string {
  return String(v ?? "").trim();
}

/**
 * ✅ 会社名の「表記ゆれ」吸収（強め）
 * - 全角/半角スペース → 除去
 * - 余分な空白 → 除去
 * - ハイフン類統一
 * - 括弧除去
 */
function normalizeCompanyName(name: any): string {
  let s = String(name ?? "").trim();
  s = s.replace(/\u3000/g, " ").replace(/\s+/g, "");
  s = s.replace(/[‐-‒–—―]/g, "-");
  s = s.replace(/[（）()]/g, "");
  return s;
}

/**
 * ✅ 「応募メールとして扱うか」の判定
 */
function isReplyLikeSubject(subject: any): boolean {
  const s = String(subject ?? "").trim();
  const stripped = s.replace(/^\s*(\[[^\]]+\]\s*)+/g, "");
  return /(^|\s)(re|fw|fwd)\s*[:：]/i.test(stripped) || /(^|\s)(返信|転送)\s*[:：]/.test(stripped);
}

function isApplicationMail(it: { subject: any }) {
  return !isReplyLikeSubject(it.subject);
}

function buildPageButtons(page: number, totalPages: number): Array<number | "dots"> {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

  const buttons: Array<number | "dots"> = [];
  const add = (x: number | "dots") => buttons.push(x);

  add(1);

  const left = Math.max(2, page - 1);
  const right = Math.min(totalPages - 1, page + 1);

  if (left > 2) add("dots");
  for (let p = left; p <= right; p++) add(p);
  if (right < totalPages - 1) add("dots");

  add(totalPages);
  return buttons;
}



type MailClassKey = "応募" | "受付" | "選考" | "面接" | "内定" | "他";

function classifyMail(subject: any, snippet: any): MailClassKey {
  const s = `${String(subject ?? "")}\n${String(snippet ?? "")}`.toLowerCase();

  if (/(内定|オファー|offer|採用決定|採用通知)/i.test(s)) return "内定";
  if (/(面接|面談|interview|日程|候補日|スケジュール|予約|zoom|google meet)/i.test(s)) return "面接";
  if (/(書類|選考|結果|合否|不採用|見送り|通過|一次|二次|三次|審査)/i.test(s)) return "選考";
  if (/(受付|受け付け|応募ありがとう|ご応募ありがとうございます|自動返信|auto|received)/i.test(s)) return "受付";
  if (/(応募|エントリー|apply|application|応募完了|ご応募)/i.test(s)) return "応募";
  return "他";
}

function hoursSince(iso: string): number | null {
  try {
    const t = new Date(iso).getTime();
    if (!Number.isFinite(t)) return null;
    const now = Date.now();
    return (now - t) / (1000 * 60 * 60);
  } catch {
    return null;
  }
}

type AttentionLevel = "none" | "24h" | "48h";

function attentionLevel(receivedAt: string, status: string): AttentionLevel {
  const st = normalizeStatus(status);
  if (st !== "new") return "none";
  const h = hoursSince(receivedAt);
  if (h == null) return "none";
  if (h >= 48) return "48h";
  if (h >= 24) return "24h";
  return "none";
}



function canonSiteKey(raw: any): string {
  const s = String(raw ?? "").trim();
  if (!s) return "Direct";
  const low = s.toLowerCase();

  if (/(en-gage|engage|エンゲージ)/i.test(s)) return "エンゲージ";
  if (/(jmty|jimoty|ジモティ)/i.test(s)) return "ジモティー";
  if (/indeed/i.test(low)) return "Indeed";
  if (/(airwork|air-work)/i.test(low)) return "AirWork";
  if (/(wantedly|ウォンテッドリー)/i.test(s)) return "Wantedly";
  if (/(green|グリーン)/i.test(s)) return "Green";
  if (/(rikunabi|リクナビ)/i.test(s)) return "リクナビ";
  if (/(mynavi|マイナビ)/i.test(s)) return "マイナビ";
  if (/(saiyo.*kakaricho|saiyokakaricho|採用係長)/i.test(s)) return "採用係長";
  if (/(kyujin.*box|kyujinbox|求人ボックス)/i.test(s)) return "求人ボックス";
  if (/(en\s*転職|エン転職|entenshoku)/i.test(s)) return "エン転職";
  if (/\bdoda\b/i.test(low)) return "doda";
  if (/bizreach/i.test(low)) return "ビズリーチ";

  if (/direct/i.test(low)) return "Direct";
  if (/unknown|undefined|null/i.test(low)) return "Direct";

  return s;
}

function inferSourceFromContent(r: InboxItem): string | null {
  const s = `${String(r.subject ?? "")}\n${String(r.snippet ?? "")}\n${String(r.fromEmail ?? "")}`.toLowerCase();

  if (/(en-gage\.net|en-gage|engage|エンゲージ)/i.test(s)) return "エンゲージ";
  if (/(jmty|jimoty|ジモティ)/i.test(s)) return "ジモティー";
  if (/(airwork|air-work|joboplite)/i.test(s)) return "AirWork";
  if (/wantedly|ウォンテッドリー/i.test(s)) return "Wantedly";
  if (/indeed/i.test(s)) return "Indeed";
  if (/green|グリーン/i.test(s)) return "Green";
  if (/rikunabi|リクナビ/i.test(s)) return "リクナビ";
  if (/mynavi|マイナビ/i.test(s)) return "マイナビ";
  if (/(saiyo.*kakaricho|saiyokakaricho|採用係長)/i.test(s)) return "採用係長";
  if (/(kyujin.*box|kyujinbox|求人ボックス)/i.test(s)) return "求人ボックス";
  if (/en\s*転職|エン転職|entenshoku/i.test(s)) return "エン転職";
  if (/\bdoda\b/i.test(s)) return "doda";
  if (/bizreach/i.test(s)) return "ビズリーチ";

  return null;
}

/**
 * ✅ ロゴ対応（2つ目のページと同じ public ファイル名を優先）
 * - 無い場合は label のみ（従来ピル）にフォールバック
 *
 * 必要に応じてここに追加してください。
 */
const SITE_ICON_SRC: Record<string, string> = {
  Indeed: "/site_indeed.png",
  AirWork: "/site_airwork.png",
  エンゲージ: "/site_engage.png",
  ジモティー: "/site_jmty.png",
  採用係長: "/site_saiyokakaricho.png",
  求人ボックス: "/site_kyujinbox.png",

  Wantedly: "/site_wantedly.png",
  Green: "/site_green.png",
  リクナビ: "/site_rikunabi.png",
  マイナビ: "/site_mynavi.png",
  エン転職: "/site_entenshoku.png",
  doda: "/site_doda.png",
  ビズリーチ: "/site_bizreach.png",
};

type SourceMeta = {
  label: string;
  inferredLabel: string | null;
  isWarn: boolean;
  title: string;
  iconSrc: string | null;
  inferredIconSrc: string | null;
};

function sourceMeta(r: InboxItem): SourceMeta {
  const canon = canonSiteKey(r.siteKey);
  const inferred = canon === "Direct" ? inferSourceFromContent(r) : null;

  const isWarn = canon === "Direct";
  const title = isWarn ? "siteKeyがDirect/不明のため、本文/送信元から推定（サブ表示）" : "siteKey（保存値）";

  const iconSrc = SITE_ICON_SRC[canon] ?? null;
  const inferredIconSrc = inferred ? SITE_ICON_SRC[inferred] ?? null : null;

  return { label: canon || "Direct", inferredLabel: inferred, isWarn, title, iconSrc, inferredIconSrc };
}

function SourceChip({ r }: { r: InboxItem }) {
  const m = sourceMeta(r);

  // ロゴが無い場合は従来の「ドット＋ラベル」ピル表示（フォールバック）
  const fallback = () => (
    <div className="min-w-0">
      <span
        className={[
          "inline-flex items-center gap-1 rounded-full border px-2 py-1",
          "text-[10px] font-semibold whitespace-nowrap",
          m.isWarn ? "bg-amber-50 dark:bg-amber-900/30 text-amber-900 dark:text-amber-300 border-amber-200 dark:border-amber-700" : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700",
        ].join(" ")}
        title={m.title}
      >
        <span className={["h-1.5 w-1.5 rounded-full", m.isWarn ? "bg-amber-500" : "bg-slate-400 dark:bg-slate-500"].join(" ")} />
        {m.label}
      </span>

      {m.inferredLabel ? (
        <div className="mt-0.5 truncate text-[10px] text-amber-700 dark:text-amber-400" title={`推定: ${m.inferredLabel}`}>
          推定: {m.inferredLabel}
        </div>
      ) : null}
    </div>
  );

  // ロゴがある場合：ロゴ＋ラベル（Directの推定もロゴ化）
  if (!m.iconSrc) return fallback();

  return (
    <div className="min-w-0" title={m.title}>
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={[
            "inline-flex h-[22px] w-[22px] items-center justify-center rounded-full border",
            "bg-white dark:bg-slate-800 shadow-[0_1px_0_rgba(15,23,42,0.04)]",
            m.isWarn ? "border-amber-200 dark:border-amber-700" : "border-slate-200 dark:border-slate-700",
          ].join(" ")}
          aria-hidden="true"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={m.iconSrc} alt="" className="h-[14px] w-[14px] object-contain" />
        </span>

        <span
          className={[
            "truncate text-[11px] font-semibold",
            m.isWarn ? "text-amber-900 dark:text-amber-300" : "text-slate-800 dark:text-slate-200",
          ].join(" ")}
        >
          {m.label}
        </span>

        {m.isWarn ? <span className="ml-1 text-[10px] font-semibold text-amber-700 dark:text-amber-400">(Direct)</span> : null}
      </div>

      {m.inferredLabel ? (
        <div className="mt-0.5 flex items-center gap-2 min-w-0">
          {m.inferredIconSrc ? (
            <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.inferredIconSrc} alt="" className="h-[12px] w-[12px] object-contain" />
            </span>
          ) : (
            <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            </span>
          )}

          <div className="truncate text-[10px] text-amber-700 dark:text-amber-400" title={`推定: ${m.inferredLabel}`}>
            推定: {m.inferredLabel}
          </div>
        </div>
      ) : null}
    </div>
  );
}



const UI = {
  PANEL: ["rounded-md", "border-2", "border-slate-200/80 dark:border-slate-700", "bg-white dark:bg-slate-800", "shadow-sm"].join(" "),
  PANEL_HDR: ["flex items-start justify-between gap-3", "border-b-2", "border-slate-200/80 dark:border-slate-700", "px-4 py-3"].join(" "),
  PANEL_TITLE: "text-[13px] font-semibold text-slate-900 dark:text-slate-100",
  PANEL_SUB: "mt-0.5 text-[12px] text-slate-700/90 dark:text-slate-400 font-medium",

  KPI_GRID: "grid grid-cols-2 gap-2 sm:grid-cols-4",
  KPI_CARD: ["rounded-md", "border-2", "border-slate-200/80 dark:border-slate-700", "bg-white dark:bg-slate-800", "px-4 py-3", "shadow-sm"].join(" "),
  KPI_LABEL: "text-[11px] font-semibold tracking-wide text-slate-500 dark:text-slate-400",
  KPI_VALUE: "mt-2 text-[26px] font-semibold leading-none text-slate-900 dark:text-slate-100 tabular-nums",
  KPI_SUB: "mt-2 text-[11px] text-slate-500 dark:text-slate-400",

  TABLE_WRAP: ["overflow-hidden", "rounded-md", "border-2", "border-slate-200/80 dark:border-slate-700", "bg-white dark:bg-slate-800"].join(" "),
  TABLE_HEAD_ROW:
    "hidden sm:grid sm:items-center sm:gap-2 sm:border-b-2 sm:border-slate-200/80 dark:border-slate-700 sm:px-3 sm:py-2 text-[11px] text-slate-600 dark:text-slate-400",
  ROW: "group px-3 py-2 sm:px-3 sm:py-2 transition hover:bg-slate-50/70 dark:hover:bg-slate-700/50",
  ROW_DIVIDER: "divide-y-2 divide-slate-200/60 dark:divide-slate-700",
} as const;



const SELECT = [
  "appearance-none",
  "rounded-md",
  "border-2",
  "border-slate-200/80 dark:border-slate-700",
  "bg-white/90 dark:bg-slate-900/90",
  "px-2",
  "pr-7",
  "py-1",
  "text-[11px]",
  "font-semibold",
  "text-slate-900 dark:text-slate-100",
  "shadow-sm",
  "hover:bg-slate-50/70 dark:hover:bg-slate-700/50",
  "focus:outline-none",
  "focus-visible:ring-2",
  "focus-visible:ring-indigo-400/40",
  "disabled:opacity-60",
  "disabled:cursor-not-allowed",
  "leading-tight",
].join(" ");

function SelectWrap({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={["relative", className].join(" ")}>
      {children}
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
        <svg width="12" height="12" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M5 7.5l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </div>
  );
}

function statusDotClass(status: string) {
  const s = String(status ?? "").trim().toLowerCase();
  if (s === "ng") return "bg-rose-500";
  if (s === "registered") return "bg-emerald-500";
  if (s === "interview") return "bg-amber-500";
  if (s === "offer") return "bg-violet-500";
  return "bg-blue-500";
}

function mailTypeTone(t: MailTypeValue) {
  if (t === "non_application") {
    return { cls: "bg-slate-50 text-slate-700 border-slate-200", dot: "bg-slate-400" };
  }
  return { cls: "bg-blue-50 text-blue-800 border-blue-200", dot: "bg-blue-500" };
}

function MailTypePill({ t }: { t: MailTypeValue }) {
  const m = mailTypeTone(t);
  const label = t === "non_application" ? "除外" : "応募";
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full border px-2 py-1",
        "text-[10px] font-semibold whitespace-nowrap",
        m.cls,
      ].join(" ")}
    >
      <span className={["h-1.5 w-1.5 rounded-full", m.dot].join(" ")} />
      {label}
    </span>
  );
}

function mailClassTone(k: MailClassKey) {
  if (k === "内定") return { cls: "bg-violet-50 text-violet-800 border-violet-200", dot: "bg-violet-500" };
  if (k === "面接") return { cls: "bg-amber-50 text-amber-800 border-amber-200", dot: "bg-amber-500" };
  if (k === "選考") return { cls: "bg-indigo-50 text-indigo-800 border-indigo-200", dot: "bg-indigo-500" };
  if (k === "受付") return { cls: "bg-emerald-50 text-emerald-800 border-emerald-200", dot: "bg-emerald-500" };
  if (k === "応募") return { cls: "bg-blue-50 text-blue-800 border-blue-200", dot: "bg-blue-500" };
  return { cls: "bg-slate-50 text-slate-700 border-slate-200", dot: "bg-slate-400" };
}

function ClassPill({ k }: { k: MailClassKey }) {
  const m = mailClassTone(k);
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full border px-2 py-1",
        "text-[10px] font-semibold whitespace-nowrap",
        m.cls,
      ].join(" ")}
    >
      <span className={["h-1.5 w-1.5 rounded-full", m.dot].join(" ")} />
      {k}
    </span>
  );
}

function AttentionPill({ level }: { level: AttentionLevel }) {
  if (level === "none") return null;

  const meta =
    level === "48h"
      ? { cls: "bg-rose-50 text-rose-800 border-rose-200", dot: "bg-rose-500", label: "48h+" }
      : { cls: "bg-amber-50 text-amber-800 border-amber-200", dot: "bg-amber-500", label: "24h+" };

  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full border px-2 py-1",
        "text-[10px] font-semibold whitespace-nowrap",
        meta.cls,
      ].join(" ")}
    >
      <span className={["h-1.5 w-1.5 rounded-full", meta.dot].join(" ")} />
      {meta.label}
    </span>
  );
}

function KpiCard({ title, value, sub, accent }: { title: string; value: number; sub?: string; accent?: string }) {
  const animatedValue = useCountUp(value);
  const accentColor = accent || "indigo";
  const dotClass = {
    indigo: "bg-indigo-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
    slate: "bg-slate-400",
  }[accentColor] || "bg-indigo-500";

  return (
    <div className="group relative">
      <div className="flex items-center gap-2 mb-1">
        <span className={`h-2 w-2 rounded-full ${dotClass}`} />
        <span className="text-[11px] font-semibold tracking-wide text-slate-500 dark:text-slate-400 uppercase">{title}</span>
      </div>
      <div className="text-[32px] font-bold leading-none text-slate-900 dark:text-slate-100 tabular-nums tracking-tight">{animatedValue}</div>
      {sub ? <div className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{sub}</div> : null}
    </div>
  );
}

function companyTextClass(name: string) {
  const n = String(name ?? "");
  if (n.length >= 26) return "text-[11px] font-semibold";
  if (n.length >= 18) return "text-[12px] font-semibold";
  return "text-[13px] font-semibold";
}

export default function GmailInboxPanel() {
  /* ─────────────── フローティングアニメーション ─────────────── */
  useEffect(() => {
    const styleId = "gmail-panel-float-animation";
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @keyframes float {
        0%, 100% { transform: translateY(0) rotate(0deg); }
        33% { transform: translateY(-20px) rotate(2deg); }
        66% { transform: translateY(10px) rotate(-1deg); }
      }
    `;
    document.head.appendChild(style);
    return () => { document.getElementById(styleId)?.remove(); };
  }, []);

  const LIMIT = 50;
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string>("");
  const [items, setItems] = useState<InboxItem[]>([]);
  const [lastResult, setLastResult] = useState<string>("");

  const [savingId, setSavingId] = useState<string>("");

  const [pageInfo, setPageInfo] = useState<PageInfo>({
    page: 1,
    limit: LIMIT,
    total: 0,
    totalPages: 1,
    hasPrev: false,
    hasNext: false,
  });

  // 全体集計（APIから取得）
  const [globalStats, setGlobalStats] = useState({
    totalNew: 0,
    totalAttention: 0,
    totalUnlinked: 0,
    totalDirect: 0,
    totalNoJob: 0,
    totalLinkedButNew: 0,
  });

  const [jobs, setJobs] = useState<Job[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [mastersError, setMastersError] = useState<string>("");

  // URLから会社フィルターを復元
  const [companyFilterId, setCompanyFilterId] = useState<string>(() => {
    return searchParams.get("companyId") || "";
  });

  const [selectedJobByInboxId, setSelectedJobByInboxId] = useState<Record<string, string>>({});

  // 会社フィルターをURLに反映
  const updateCompanyFilter = (newCompanyId: string) => {
    setCompanyFilterId(newCompanyId);
    const params = new URLSearchParams(searchParams.toString());
    if (newCompanyId) {
      params.set("companyId", newCompanyId);
    } else {
      params.delete("companyId");
    }
    router.replace(`/applicants?${params.toString()}`, { scroll: false });
  };

  // 現在のフィルター状態をクエリ文字列として取得
  const getCurrentQueryString = () => {
    if (companyFilterId) {
      return `?companyId=${encodeURIComponent(companyFilterId)}`;
    }
    return "";
  };

  useEffect(() => {
    (async () => {
      setMastersError("");

      // companies
      {
        const r = await fetchJsonSafe("/api/companies", { cache: "no-store" });

        if (!r.ok || !r.json) {
          const msg = r.json?.error ?? `companies load failed: HTTP ${r.status} (${r.contentType}) ${safePreview(r.text)}`;
          setMastersError((x) => x || msg);
        } else {
          const raw = r.json;

          const arr: any[] = Array.isArray(raw?.items)
            ? raw.items
            : Array.isArray(raw?.companies)
              ? raw.companies
              : Array.isArray(raw?.data)
                ? raw.data
                : Array.isArray(raw?.rows)
                  ? raw.rows
                  : Array.isArray(raw)
                    ? raw
                    : [];

          const mapped: Company[] = arr
            .map((x: any) => ({
              id: safeKey(x?.id ?? x?.companyId ?? x?.company_id),
              companyName: safeKey(x?.companyName ?? x?.company_name ?? x?.company ?? x?.name ?? x?.title) || null,
            }))
            .filter((c: Company) => Boolean(c.id));

          setCompanies(mapped);
        }
      }

      // jobs
      {
        const r = await fetchJsonSafe("/api/jobs", { cache: "no-store" });
        if (!r.ok || !r.json) {
          const msg = r.json?.error ?? `jobs load failed: HTTP ${r.status} (${r.contentType}) ${safePreview(r.text)}`;
          setMastersError((x) => x || msg);
        } else {
          const raw = r.json;

          const arr: any[] = Array.isArray(raw?.items)
            ? raw.items
            : Array.isArray(raw?.jobs)
              ? raw.jobs
              : Array.isArray(raw?.data)
                ? raw.data
                : Array.isArray(raw?.rows)
                  ? raw.rows
                  : Array.isArray(raw)
                    ? raw
                    : [];

          const mapped: Job[] = arr
            .map((x: any) => ({
              id: safeKey(x?.id),
              companyId: x?.companyId ? safeKey(x.companyId) : x?.company_id ? safeKey(x.company_id) : null,
              companyName:
                x?.companyName != null
                  ? safeKey(x.companyName)
                  : x?.company_name != null
                    ? safeKey(x.company_name)
                    : null,
              jobTitle: x?.jobTitle != null ? safeKey(x.jobTitle) : x?.job_title != null ? safeKey(x.job_title) : null,
            }))
            .filter((j: Job) => Boolean(j.id));

          setJobs(mapped);
        }
      }
    })();
  }, []);

  const companyIdByNameKey = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of companies) {
      const k = normalizeCompanyName(c.companyName);
      if (!k) continue;
      if (!m.has(k)) m.set(k, c.id);
    }
    return m;
  }, [companies]);

  const jobsByCompanyNameKey = useMemo(() => {
    const m = new Map<string, Job[]>();
    for (const j of jobs) {
      const k = normalizeCompanyName(j.companyName);
      if (!k) continue;
      m.set(k, [...(m.get(k) ?? []), j]);
    }
    for (const [k, arr] of m) {
      arr.sort((a, b) => safeKey(a.jobTitle).localeCompare(safeKey(b.jobTitle), "ja"));
      m.set(k, arr);
    }
    return m;
  }, [jobs]);

  // ✅ 除外ロジック：
  // 1) Re/Fw系は応募として扱わない（従来通り）
  // 2) mailType === non_application は応募として扱わない（今回追加）
  const baseItems = useMemo(() => {
    return items.filter((it) => {
      if (!isApplicationMail(it)) return false;
      if (normalizeMailType(it.mailType) === "non_application") return false;
      return true;
    });
  }, [items]);

  const visibleItems = useMemo(() => {
    const want = safeKey(companyFilterId);
    if (!want) return baseItems;

    return baseItems.filter((r) => {
      const cid = safeKey(r.companyId);
      if (cid) return cid === want;

      const key = normalizeCompanyName(r.companyName);
      const inferred = key ? companyIdByNameKey.get(key) ?? "" : "";
      return inferred === want;
    });
  }, [baseItems, companyFilterId, companyIdByNameKey]);

  const kpis = useMemo(() => {
    const newCount = visibleItems.filter((x) => normalizeStatus(x.status) === "new").length;
    const unlinkedCount = visibleItems.filter((x) => !safeKey(x.jobId)).length;

    const att24 = visibleItems.filter((x) => attentionLevel(x.receivedAt, x.status) === "24h").length;
    const att48 = visibleItems.filter((x) => attentionLevel(x.receivedAt, x.status) === "48h").length;

    const directCount = visibleItems.filter((x) => canonSiteKey(x.siteKey) === "Direct").length;

    // アラート: 求人原稿が未設定（応募が来ているのにjobIdがない）
    const noJobItems = visibleItems.filter((x) => !safeKey(x.jobId) && normalizeStatus(x.status) === "new");
    // アラート: 連携済みなのに登録が終わっていない（jobIdはあるがstatusがnew）
    const linkedButNewItems = visibleItems.filter((x) => safeKey(x.jobId) && normalizeStatus(x.status) === "new");

    return {
      newCount,
      unlinkedCount,
      attentionCount: att24 + att48,
      directCount,
      noJobCount: noJobItems.length,
      linkedButNewCount: linkedButNewItems.length,
    };
  }, [visibleItems]);

  async function load(nextPage?: number, filterCompanyId?: string) {
    const p = nextPage ?? pageInfo.page;
    const targetCompanyId = filterCompanyId !== undefined ? filterCompanyId : companyFilterId;

    setLoading(true);
    setError("");

    try {
      // 会社フィルタが選択されている場合は全データをロード
      const loadLimit = targetCompanyId ? 10000 : LIMIT;
      const loadPage = targetCompanyId ? 1 : p;
      const r = await fetchJsonSafe(`/api/gmail/inbox?limit=${loadLimit}&page=${loadPage}`, { cache: "no-store" });

      if (!r.ok) {
        const msg = r.json?.error ?? `inbox load failed: HTTP ${r.status} (${r.contentType}) ${safePreview(r.text)}`;
        setError(msg);
        setItems([]);
        return;
      }

      if (!r.json?.ok) {
        setError(r.json?.error ?? "inbox load failed");
        setItems([]);
        return;
      }

      const arr = Array.isArray(r.json.items) ? r.json.items : [];
      const mapped: InboxItem[] = arr.map((x: any) => {
        const mailTypeRaw = x?.mailType ?? x?.mail_type ?? x?.mailTypeValue ?? x?.mail_type_value;
        return {
          id: safeKey(x.id),
          gmailMessageId: safeKey(x.gmailMessageId ?? x.gmail_message_id),
          threadId: x.threadId ? safeKey(x.threadId) : x.thread_id ? safeKey(x.thread_id) : null,

          fromEmail: safeKey(x.fromEmail ?? x.from_email),
          toEmail: x.toEmail ? safeKey(x.toEmail) : x.to_email ? safeKey(x.to_email) : null,

          companyId: x.companyId ? safeKey(x.companyId) : x.company_id ? safeKey(x.company_id) : null,
          companyName: x.companyName ? safeKey(x.companyName) : x.company_name ? safeKey(x.company_name) : null,

          jobId: x.jobId ? safeKey(x.jobId) : x.job_id ? safeKey(x.job_id) : null,

          subject: safeKey(x.subject),
          snippet: safeKey(x.snippet),
          receivedAt: safeKey(x.receivedAt ?? x.received_at),

          siteKey: safeKey(x.siteKey ?? x.site_key),
          status: safeKey(x.status),

          mailType: normalizeMailType(mailTypeRaw),

          createdAt: safeKey(x.createdAt ?? x.created_at),
          updatedAt: safeKey(x.updatedAt ?? x.updated_at),
        };
      });

      mapped.sort((a, b) => String(b.receivedAt).localeCompare(String(a.receivedAt)));
      setItems(mapped);

      setSelectedJobByInboxId((prev) => {
        const next = { ...prev };
        for (const it of mapped) {
          if (it.jobId) next[it.id] = it.jobId;
        }
        return next;
      });

      const page = r.json.page ?? {};
      setPageInfo({
        page: Number(page.page ?? p),
        limit: Number(page.limit ?? LIMIT),
        total: Number(page.total ?? 0),
        totalPages: Number(page.totalPages ?? 1),
        hasPrev: Boolean(page.hasPrev),
        hasNext: Boolean(page.hasNext),
      });

      // 全体集計を取得
      const stats = r.json.stats ?? {};
      setGlobalStats({
        totalNew: Number(stats.totalNew ?? 0),
        totalAttention: Number(stats.totalAttention ?? 0),
        totalUnlinked: Number(stats.totalUnlinked ?? 0),
        totalDirect: Number(stats.totalDirect ?? 0),
        totalNoJob: Number(stats.totalNoJob ?? 0),
        totalLinkedButNew: Number(stats.totalLinkedButNew ?? 0),
      });
    } catch (e: any) {
      setError(String(e?.message ?? e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function sync() {
    setSyncing(true);
    setError("");
    setLastResult("");

    try {
      const r = await fetchJsonSafe("/api/gmail/sync?label=ATS/%E5%BF%9C%E5%8B%9F&pageSize=200&maxTotal=200", {
        method: "POST",
        cache: "no-store",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: "{}",
      });

      if (!r.ok || !r.json) {
        const msg = r.json?.error ?? `sync failed: HTTP ${r.status} (${r.contentType}) ${safePreview(r.text)}`;
        setError(msg);
        return;
      }

      if (!r.json.ok) {
        setError(r.json?.error ?? "sync failed");
        return;
      }

      setLastResult(`同期OK: inserted=${r.json.inserted ?? 0}, fetched=${r.json.totalFetched ?? 0} (label=${r.json.label?.name ?? ""})`);

      await load(1);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setSyncing(false);
    }
  }

  async function updateStatus(inboxId: string, next: InboxStatusValue) {
    const prevItems = items;
    setError("");
    setSavingId(inboxId);

    setItems((xs) => xs.map((x) => (x.id === inboxId ? { ...x, status: next } : x)));

    try {
      const r = await fetchJsonSafe(`/api/gmail/inbox/${encodeURIComponent(inboxId)}`, {
        method: "PATCH",
        cache: "no-store",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ status: next }),
      });

      if (!r.ok) {
        const msg = r.json?.error ?? `status update failed: HTTP ${r.status} (${r.contentType}) ${safePreview(r.text)}`;
        setError(msg);
        setItems(prevItems);
        return;
      }

      if (!r.json?.ok) {
        setError(r.json?.error ?? "status update failed");
        setItems(prevItems);
        return;
      }

      const serverStatus = String(r.json?.item?.status ?? next);
      setItems((xs) => xs.map((x) => (x.id === inboxId ? { ...x, status: serverStatus } : x)));
    } catch (e: any) {
      setError(String(e?.message ?? e));
      setItems(prevItems);
    } finally {
      setSavingId("");
    }
  }

  // ✅ 追加：応募/除外（mail_type）更新
  async function updateMailType(inboxId: string, next: MailTypeValue) {
    const prevItems = items;
    setError("");
    setSavingId(inboxId);

    // optimistic
    setItems((xs) => xs.map((x) => (x.id === inboxId ? { ...x, mailType: next } : x)));

    try {
      const r = await fetchJsonSafe(`/api/gmail/inbox/${encodeURIComponent(inboxId)}`, {
        method: "PATCH",
        cache: "no-store",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ mailType: next }),
      });

      if (!r.ok) {
        const msg = r.json?.error ?? `mailType update failed: HTTP ${r.status} (${r.contentType}) ${safePreview(r.text)}`;
        setError(msg);
        setItems(prevItems);
        return;
      }

      if (!r.json?.ok) {
        setError(r.json?.error ?? "mailType update failed");
        setItems(prevItems);
        return;
      }

      const serverRaw = r.json?.item?.mailType ?? r.json?.item?.mail_type ?? next;
      const serverMailType = normalizeMailType(serverRaw);

      setItems((xs) => xs.map((x) => (x.id === inboxId ? { ...x, mailType: serverMailType } : x)));
    } catch (e: any) {
      setError(String(e?.message ?? e));
      setItems(prevItems);
    } finally {
      setSavingId("");
    }
  }

  async function saveJobSelection(inboxId: string, companyId: string, jobId: string) {
    setError("");
    setSavingId(inboxId);

    try {
      const r = await fetchJsonSafe(`/api/gmail/inbox/${encodeURIComponent(inboxId)}`, {
        method: "PATCH",
        cache: "no-store",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ companyId, jobId }),
      });

      if (!r.ok || !r.json) {
        const msg = r.json?.error ?? `save job failed: HTTP ${r.status} (${r.contentType}) ${safePreview(r.text)}`;
        setError(msg);
        return;
      }

      if (!r.json.ok) {
        setError(r.json?.error ?? "save job failed");
        return;
      }

      const serverJobId = r.json?.item?.jobId
        ? String(r.json.item.jobId)
        : r.json?.item?.job_id
          ? String(r.json.item.job_id)
          : null;
      const serverCompanyId = r.json?.item?.companyId
        ? String(r.json.item.companyId)
        : r.json?.item?.company_id
          ? String(r.json.item.company_id)
          : null;

      setItems((xs) => xs.map((x) => (x.id === inboxId ? { ...x, jobId: serverJobId, companyId: serverCompanyId ?? x.companyId } : x)));
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setSavingId("");
    }
  }

  function gotoPage(p: number) {
    if (p < 1) return;
    if (p > pageInfo.totalPages) return;
    void load(p);
  }

  useEffect(() => {
    // 初回ロード時にURLから取得したcompanyFilterIdを使用
    void load(1, companyFilterId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const disabled = loading || syncing;

  const pageButtons = useMemo(() => buildPageButtons(pageInfo.page, pageInfo.totalPages), [pageInfo.page, pageInfo.totalPages]);

  const companyOptions = useMemo(() => {
    return companies
      .map((c) => ({ id: safeKey(c.id), name: safeKey(c.companyName) }))
      .filter((c) => c.id && c.name)
      .sort((a, b) => a.name.localeCompare(b.name, "ja"));
  }, [companies]);

  // ✅ 列設計：会社は狭く、媒体は広め、操作列を広く
  const GRID = "sm:grid-cols-[88px_minmax(0,160px)_minmax(0,200px)_minmax(0,280px)_minmax(0,200px)_140px_110px]";

  /* ─────────────── プレミアムHero用マウストラッキング ─────────────── */
  const heroRef = useRef<HTMLDivElement>(null);
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    setMouse({ x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height });
  }, []);

  const timeInfo = getTimeOfDay();
  const summaryText = globalStats.totalNew > 0
    ? `新着 ${globalStats.totalNew}件の応募があります。${globalStats.totalAttention > 0 ? `${globalStats.totalAttention}件が対応待ちです。` : ""}`
    : "新着の応募はありません。";
  const typedSummary = useTypingEffect(summaryText, 25);

  return (
    <div className="space-y-3 max-w-full">
      {/* Hero - Premium Design (Work Queue Style) */}
      <div
        ref={heroRef}
        onMouseMove={onMouseMove}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 shadow-2xl shadow-indigo-200/40 dark:shadow-black/40 ring-1 ring-indigo-100 dark:ring-white/5"
      >
        {/* マウス追従グラデーション */}
        <div
          className="pointer-events-none absolute h-[600px] w-[600px] rounded-full bg-gradient-to-br from-indigo-400/20 via-purple-400/15 to-pink-400/10 blur-3xl transition-all duration-500"
          style={{ left: `calc(${mouse.x * 100}% - 300px)`, top: `calc(${mouse.y * 100}% - 300px)` }}
        />
        {/* フローティングブロブ */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-40 -top-40 h-[400px] w-[400px] rounded-full bg-indigo-200/30 dark:bg-indigo-500/10 blur-3xl animate-[float_20s_ease-in-out_infinite]" />
          <div className="absolute -right-32 top-1/3 h-[300px] w-[300px] rounded-full bg-purple-200/25 dark:bg-purple-500/10 blur-3xl animate-[float_25s_ease-in-out_infinite_reverse]" />
          <div className="absolute left-1/3 -bottom-20 h-[250px] w-[400px] rounded-full bg-violet-100/40 dark:bg-violet-500/10 blur-3xl animate-[float_18s_ease-in-out_infinite_2s]" />
        </div>

        {/* ヘッダー */}
        <div className="relative z-10 px-6 pt-6 pb-5 lg:px-10">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
            {/* 左: タイトル・サマリー・ボタン */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{timeInfo.icon}</span>
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight">
                  Applicants
                </h1>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{typedSummary}<span className="animate-pulse">|</span></p>

              {/* アクションボタン */}
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/applicants/list"
                  className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:bg-emerald-700 transition-all"
                >
                  登録済み一覧
                </Link>
                <button
                  type="button"
                  onClick={sync}
                  disabled={disabled}
                  className="rounded-xl bg-indigo-600 dark:bg-white px-5 py-2.5 text-sm font-semibold text-white dark:text-indigo-700 shadow-lg shadow-indigo-500/25 hover:shadow-xl transition-all disabled:opacity-50"
                >
                  {syncing ? "同期中..." : "同期"}
                </button>
                <select
                  className="rounded-xl bg-white/80 dark:bg-white/10 backdrop-blur-sm px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 ring-1 ring-indigo-200/40 dark:ring-white/10 shadow-md disabled:opacity-50"
                  value={companyFilterId}
                  onChange={(e) => {
                    const newCompanyId = e.target.value;
                    updateCompanyFilter(newCompanyId);
                    void load(1, newCompanyId);
                  }}
                  disabled={disabled}
                >
                  <option value="" className="dark:bg-slate-800">会社（すべて）</option>
                  {companyOptions.map((c) => (
                    <option key={c.id} value={c.id} className="dark:bg-slate-800">
                      {c.name}
                    </option>
                  ))}
                </select>
                {companyFilterId && (
                  <button
                    type="button"
                    onClick={() => { updateCompanyFilter(""); void load(1, ""); }}
                    disabled={disabled}
                    className="rounded-xl bg-white/80 dark:bg-white/10 px-3 py-2.5 text-sm text-slate-500 dark:text-slate-400 ring-1 ring-indigo-200/40 dark:ring-white/10 shadow-md hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-50"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* 右: ステータスパネル（横並び） */}
            <div className="flex flex-wrap gap-3 lg:flex-nowrap">
              {/* New */}
              <div className="flex items-center gap-3 rounded-xl bg-white/60 dark:bg-white/5 backdrop-blur-md px-4 py-3 ring-1 ring-indigo-200/40 dark:ring-white/10 shadow-lg">
                <div className="h-10 w-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">New</div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums leading-none">{globalStats.totalNew}</div>
                </div>
              </div>

              {/* 原稿未設定 */}
              {globalStats.totalNoJob > 0 && (
                <div className="flex items-center gap-3 rounded-xl bg-rose-50/80 dark:bg-rose-900/30 backdrop-blur-md px-4 py-3 ring-1 ring-rose-200/60 dark:ring-rose-700/40 shadow-lg">
                  <div className="h-10 w-10 rounded-xl bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
                    </span>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 uppercase">原稿未設定</div>
                    <div className="text-2xl font-bold text-rose-700 dark:text-rose-300 tabular-nums leading-none">{globalStats.totalNoJob}</div>
                  </div>
                </div>
              )}

              {/* 未登録 */}
              {globalStats.totalLinkedButNew > 0 && (
                <div className="flex items-center gap-3 rounded-xl bg-amber-50/80 dark:bg-amber-900/30 backdrop-blur-md px-4 py-3 ring-1 ring-amber-200/60 dark:ring-amber-700/40 shadow-lg">
                  <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase">未登録</div>
                    <div className="text-2xl font-bold text-amber-700 dark:text-amber-300 tabular-nums leading-none">{globalStats.totalLinkedButNew}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* KPIセクション */}
        <div className="relative z-10 border-t border-slate-200/60 dark:border-slate-700/60 px-6 py-4 lg:px-10">
          <div className="flex flex-wrap gap-4 sm:gap-6">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-indigo-500" />
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">New</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">{globalStats.totalNew}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">要対応</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">{globalStats.totalAttention}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">未紐付け</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">{globalStats.totalUnlinked}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-slate-400" />
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Direct</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">{globalStats.totalDirect}</span>
            </div>
            <div className="ml-auto">
              {companyFilterId ? (
                <span className="text-[12px] font-semibold text-indigo-700 dark:text-indigo-300">
                  フィルタ: {visibleItems.length}件 / 全{pageInfo.total}件
                </span>
              ) : (
                <span className="text-[12px] text-slate-500 dark:text-slate-400 tabular-nums">
                  全{pageInfo.total}件 / {pageInfo.page} / {pageInfo.totalPages}ページ
                </span>
              )}
            </div>
          </div>

          {mastersError ? (
            <div className="mt-3 rounded-xl border border-rose-200/80 dark:border-rose-700/50 bg-rose-50/90 dark:bg-rose-900/30 backdrop-blur-sm px-4 py-3 text-[12px] text-rose-800 dark:text-rose-300 shadow-sm">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {mastersError}
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="mt-3 rounded-xl border border-rose-200/80 dark:border-rose-700/50 bg-rose-50/90 dark:bg-rose-900/30 backdrop-blur-sm px-4 py-3 text-[12px] text-rose-800 dark:text-rose-300 shadow-sm">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            </div>
          ) : null}

          {lastResult ? (
            <div className="mt-3 rounded-xl border border-emerald-200/80 dark:border-emerald-700/50 bg-emerald-50/90 dark:bg-emerald-900/30 backdrop-blur-sm px-4 py-3 text-[12px] text-emerald-800 dark:text-emerald-300 shadow-sm">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {lastResult}
              </div>
            </div>
          ) : null}

          {/* ページネーション - プレミアムスタイル */}
          {!companyFilterId && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm px-3 py-1.5 text-[12px] font-medium text-slate-600 dark:text-slate-400 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={disabled || !pageInfo.hasPrev}
                onClick={() => gotoPage(pageInfo.page - 1)}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                前へ
              </button>

              <div className="flex items-center gap-1">
                {pageButtons.map((b, idx) =>
                  b === "dots" ? (
                    <span key={`dots-${idx}`} className="px-2 text-slate-400 dark:text-slate-500">…</span>
                  ) : (
                    <button
                      key={b}
                      type="button"
                      className={
                        b === pageInfo.page
                          ? "min-w-[32px] h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-[12px] font-semibold shadow-md shadow-indigo-500/25"
                          : "min-w-[32px] h-8 rounded-lg border border-slate-200/80 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm text-[12px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                      }
                      disabled={disabled || b === pageInfo.page}
                      onClick={() => gotoPage(b)}
                    >
                      {b}
                    </button>
                  )
                )}
              </div>

              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm px-3 py-1.5 text-[12px] font-medium text-slate-600 dark:text-slate-400 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={disabled || !pageInfo.hasNext}
                onClick={() => gotoPage(pageInfo.page + 1)}
              >
                次へ
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Table - プレミアムスタイル */}
      <div className="overflow-hidden rounded-xl border-2 border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg">
        <div className={[UI.TABLE_HEAD_ROW, GRID].join(" ")}>
          <div>状態</div>
          <div>会社</div>
          <div>媒体</div>
          <div>求人原稿</div>
          <div>分類/除外</div>
          <div>受信</div>
          <div className="text-right">操作</div>
        </div>

        {loading ? (
          <div className="px-4 py-3 text-sm text-slate-600">読み込み中...</div>
        ) : visibleItems.length === 0 ? (
          <div className="px-4 py-3 text-sm text-slate-600">該当する受信がありません。</div>
        ) : (
          <div className={UI.ROW_DIVIDER}>
            {visibleItems.map((r) => {
              const cur = normalizeStatus(r.status);
              const saving = savingId === r.id;

              const companyNameKey = normalizeCompanyName(r.companyName);
              const jobOptions = companyNameKey ? jobsByCompanyNameKey.get(companyNameKey) ?? [] : [];

              const effectiveCompanyId = safeKey(r.companyId) || (companyNameKey ? companyIdByNameKey.get(companyNameKey) ?? "" : "");

              const selectedJobId = selectedJobByInboxId[r.id] ?? (r.jobId ?? "");

              const cls = classifyMail(r.subject, r.snippet);
              const att = attentionLevel(r.receivedAt, r.status);
              const mt = normalizeMailType(r.mailType);

              return (
                <div key={r.id} className={UI.ROW}>
                  <div className={["hidden sm:grid sm:items-center sm:gap-2 min-w-0", GRID].join(" ")}>
                    {/* 状態 */}
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={["h-2 w-2 rounded-full shrink-0", statusDotClass(cur)].join(" ")} />
                      <SelectWrap className="w-[72px] shrink-0">
                        <select
                          className={SELECT + " w-[72px]"}
                          value={cur}
                          disabled={saving || disabled}
                          onChange={(e) => void updateStatus(r.id, e.target.value as InboxStatusValue)}
                        >
                          {STATUS_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </SelectWrap>
                    </div>

                    {/* 会社 */}
                    <div className="min-w-0">
                      <div className={["truncate text-slate-900 dark:text-slate-100", companyTextClass(r.companyName || "")].join(" ")} title={r.companyName || ""}>
                        {r.companyName || "(未判定)"}
                      </div>
                    </div>

                    {/* 媒体（ロゴ表示） */}
                    <div className="min-w-0">
                      <SourceChip r={r} />
                    </div>

                    {/* 求人原稿 */}
                    <div className="min-w-0">
                      {jobOptions.length > 0 ? (
                        <SelectWrap className="w-full max-w-[280px]">
                          <select
                            className={SELECT + " w-full"}
                            disabled={disabled || saving}
                            value={selectedJobId}
                            onChange={(e) => {
                              const jobId = e.target.value;

                              setSelectedJobByInboxId((prev) => ({ ...prev, [r.id]: jobId }));

                              if (!jobId) {
                                void saveJobSelection(r.id, effectiveCompanyId || "", "");
                                return;
                              }

                              if (!effectiveCompanyId) {
                                setError(`会社IDが特定できません（companyName="${r.companyName ?? ""}"）。会社マスタと会社名の一致を確認してください。`);
                                return;
                              }

                              void saveJobSelection(r.id, effectiveCompanyId, jobId);
                            }}
                          >
                            <option value="">（未設定）</option>
                            {jobOptions.map((j) => (
                              <option key={j.id} value={j.id}>
                                {j.jobTitle ?? "（原稿名未設定）"}
                              </option>
                            ))}
                          </select>
                        </SelectWrap>
                      ) : (
                        <div className="truncate text-[11px] text-slate-400 dark:text-slate-500">候補なし</div>
                      )}

                      {!selectedJobId ? <div className="mt-0.5 text-[10px] text-amber-700 font-semibold">未紐付け</div> : null}
                    </div>

                    {/* 分類 + 要対応 + 応募/除外 */}
                    <div className="flex items-center gap-1 min-w-0">
                      <ClassPill k={cls} />
                      <AttentionPill level={att} />

                      {/* ✅ 応募/除外トグル：非応募にした瞬間、この一覧から消える */}
                      <SelectWrap className="w-[84px] ml-1">
                        <select
                          className={SELECT + " w-[84px]"}
                          value={mt}
                          disabled={saving || disabled}
                          onChange={(e) => void updateMailType(r.id, e.target.value as MailTypeValue)}
                          title="応募/除外（mail_type）"
                        >
                          {MAILTYPE_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </SelectWrap>
                    </div>

                    {/* 受信 */}
                    <div className="text-[11px] text-slate-700 dark:text-slate-300 tabular-nums truncate">{r.receivedAt ? formatLocal(r.receivedAt) : "-"}</div>

                    {/* 操作: 本文 + 応募者登録 + 登録済みバッジ */}
                    <div className="flex items-center justify-end gap-1">
                      {r.id ? (
                        <>
                          <Link href={`/applicants/inbox/${encodeURIComponent(r.id)}${getCurrentQueryString()}`} className="cv-btn-secondary !px-2 !py-1 text-[11px] whitespace-nowrap">
                            本文
                          </Link>
                          {cur === "registered" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold whitespace-nowrap">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              登録済
                            </span>
                          ) : selectedJobId && effectiveCompanyId ? (
                            <button
                              type="button"
                              className="cv-btn-primary !px-2 !py-1 text-[11px] whitespace-nowrap"
                              disabled={disabled || saving}
                              onClick={async () => {
                                const name = prompt("応募者の氏名を入力してください:", "");
                                if (!name) return;

                                setSavingId(r.id);
                                try {
                                  // Create applicant
                                  const res = await fetch("/api/applicants", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      companyId: effectiveCompanyId,
                                      jobId: selectedJobId,
                                      name,
                                      appliedAt: r.receivedAt.split("T")[0] || new Date().toISOString().split("T")[0],
                                      siteKey: canonSiteKey(r.siteKey),
                                      status: "NEW",
                                      note: `${r.subject}\n\n${r.snippet}`,
                                    }),
                                  });

                                  if (!res.ok) throw new Error("Failed to create applicant");
                                  const json = await res.json();
                                  if (!json.ok) throw new Error(json.error || "Failed");

                                  const applicantId = json.data?.id;

                                  // ステータスを「登録済み」に更新（重複防止）
                                  await updateStatus(r.id, "registered");

                                  if (applicantId) {
                                    router.push(`/applicants/${encodeURIComponent(applicantId)}${getCurrentQueryString()}`);
                                  }
                                } catch (e: any) {
                                  alert(`登録失敗: ${e.message}`);
                                } finally {
                                  setSavingId("");
                                }
                              }}
                            >
                              登録
                            </button>
                          ) : null}
                        </>
                      ) : (
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">-</span>
                      )}
                    </div>
                  </div>

                  {/* Mobile */}
                  <div className="sm:hidden">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className={["truncate text-slate-900", companyTextClass(r.companyName || "")].join(" ")}>
                          {r.companyName || "(未判定)"}
                        </div>

                        <div className="mt-0.5 flex items-center gap-2 text-[10px] text-slate-500">
                          <SourceChip r={r} />
                          <span className="truncate tabular-nums">{r.receivedAt ? formatLocal(r.receivedAt) : "-"}</span>
                        </div>
                      </div>

                      {r.id ? (
                        <>
                          <Link href={`/applicants/inbox/${encodeURIComponent(r.id)}${getCurrentQueryString()}`} className="cv-btn-secondary !px-3 !py-1 text-[12px] whitespace-nowrap">
                            本文
                          </Link>
                          {cur === "registered" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold whitespace-nowrap shrink-0">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              登録済
                            </span>
                          ) : selectedJobId && effectiveCompanyId ? (
                            <button
                              type="button"
                              className="cv-btn-primary !px-3 !py-1 text-[12px] whitespace-nowrap"
                              disabled={disabled || saving}
                              onClick={async () => {
                                const name = prompt("応募者の氏名を入力してください:", "");
                                if (!name) return;

                                setSavingId(r.id);
                                try {
                                  const res = await fetch("/api/applicants", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      companyId: effectiveCompanyId,
                                      jobId: selectedJobId,
                                      name,
                                      appliedAt: r.receivedAt.split("T")[0] || new Date().toISOString().split("T")[0],
                                      siteKey: canonSiteKey(r.siteKey),
                                      status: "NEW",
                                      note: `${r.subject}\n\n${r.snippet}`,
                                    }),
                                  });

                                  if (!res.ok) throw new Error("Failed to create applicant");
                                  const json = await res.json();
                                  if (!json.ok) throw new Error(json.error || "Failed");

                                  const applicantId = json.data?.id;

                                  // ステータスを「登録済み」に更新（重複防止）
                                  await updateStatus(r.id, "registered");

                                  if (applicantId) {
                                    router.push(`/applicants/${encodeURIComponent(applicantId)}${getCurrentQueryString()}`);
                                  }
                                } catch (e: any) {
                                  alert(`登録失敗: ${e.message}`);
                                } finally {
                                  setSavingId("");
                                }
                              }}
                            >
                              登録
                            </button>
                          ) : null}
                        </>
                      ) : null}
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      <span className={["h-2 w-2 rounded-full", statusDotClass(cur)].join(" ")} />
                      <SelectWrap className="w-[112px]">
                        <select
                          className={SELECT + " w-[112px]"}
                          value={cur}
                          disabled={saving || disabled}
                          onChange={(e) => void updateStatus(r.id, e.target.value as InboxStatusValue)}
                        >
                          {STATUS_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </SelectWrap>

                      <div className="ml-auto flex items-center gap-1">
                        <ClassPill k={cls} />
                        <AttentionPill level={att} />
                      </div>
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      <MailTypePill t={mt} />
                      <SelectWrap className="w-[140px]">
                        <select
                          className={SELECT + " w-[140px]"}
                          value={mt}
                          disabled={saving || disabled}
                          onChange={(e) => void updateMailType(r.id, e.target.value as MailTypeValue)}
                        >
                          {MAILTYPE_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </SelectWrap>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">※ 除外にすると一覧から消えます</span>
                    </div>

                    <div className="mt-2">
                      {jobOptions.length > 0 ? (
                        <SelectWrap className="w-full">
                          <select
                            className={SELECT + " w-full"}
                            disabled={disabled || saving}
                            value={selectedJobId}
                            onChange={(e) => {
                              const jobId = e.target.value;

                              setSelectedJobByInboxId((prev) => ({ ...prev, [r.id]: jobId }));

                              if (!jobId) {
                                void saveJobSelection(r.id, effectiveCompanyId || "", "");
                                return;
                              }

                              if (!effectiveCompanyId) {
                                setError(`会社IDが特定できません（companyName="${r.companyName ?? ""}"）。会社マスタと会社名の一致を確認してください。`);
                                return;
                              }

                              void saveJobSelection(r.id, effectiveCompanyId, jobId);
                            }}
                          >
                            <option value="">（求人原稿：未設定）</option>
                            {jobOptions.map((j) => (
                              <option key={j.id} value={j.id}>
                                {j.jobTitle ?? "（原稿名未設定）"}
                              </option>
                            ))}
                          </select>
                        </SelectWrap>
                      ) : (
                        <div className="text-[11px] text-slate-400 dark:text-slate-500">求人原稿：候補なし</div>
                      )}

                      {!selectedJobId ? <div className="mt-1 text-[10px] text-amber-700 font-semibold">未紐付け</div> : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* フッターノート */}
      <div className="rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/50 backdrop-blur-sm px-4 py-3 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
        <div className="flex items-start gap-2">
          <svg className="w-4 h-4 mt-0.5 text-slate-400 dark:text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="space-y-1">
            <div>Re / 返信 / 転送 / Fw 系は「応募メール」として扱わないため、この一覧と集計から除外しています。</div>
            <div>「除外」は DB の mail_type=non_application として保存し、以後この一覧から除外されます。</div>
            <div>会社フィルタを選択すると、全データ（最大10000件）をロードして該当する会社のメールのみ表示します。</div>
          </div>
        </div>
      </div>
    </div>
  );
}
