"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useRef, useState } from "react";

import { SITE_TEMPLATES } from "@/lib/templates";
import type { Company, Job } from "@/lib/types";

// Premium hooks (same as Home & Work Queue)
function useCountUp(target: number, duration = 2800) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) {
      setValue(0);
      return;
    }
    setValue(Math.max(1, Math.round(target * 0.1)));
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 5);
      const current = Math.round(target * 0.1 + eased * target * 0.9);
      setValue(Math.min(current, target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return value;
}

function useTypingEffect(text: string, speed = 80) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(timer);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);
  return { displayed, done };
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return { greeting: "おはようございます", period: "morning", icon: "☀️" };
  if (h >= 12 && h < 17) return { greeting: "お疲れさまです", period: "afternoon", icon: "🌤" };
  if (h >= 17 && h < 21) return { greeting: "お疲れさまです", period: "evening", icon: "🌅" };
  return { greeting: "夜遅くまでお疲れさまです", period: "night", icon: "🌙" };
}

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
  snippet: string | null;
  receivedAt: string;

  siteKey: string;
  status: string;

  createdAt: string;
  updatedAt: string;
};

type SiteRow = {
  siteKey: string;
  postedJobs: number;
  applications: number;
  appRate: number | null;
  spark: number[]; // last 28 days
};

type JobRow = {
  jobId: string;
  jobTitle: string;
  companyName: string;
  applications: number;
  topSiteKey: string | null;
};

type Insight = {
  tone: "good" | "warn" | "bad" | "neutral";
  title: string;
  detail: string;
};

const UI = {
  PAGE_BG: "relative",
  PAGE_PAD: "py-8",

  RADIUS: "rounded-2xl",
  SHADOW: "shadow-[0_8px_28px_rgba(15,23,42,0.08)]",
  SHADOW_SOFT: "shadow-[0_6px_24px_rgba(15,23,42,0.06)]",

  H1: "text-[26px] sm:text-[28px] font-semibold tracking-tight text-slate-900 dark:text-slate-100",
  SUB: "mt-1 text-[12.5px] text-slate-700/90 dark:text-slate-400 font-medium",

  SECTION_TITLE: "text-[13px] font-semibold text-slate-900 dark:text-slate-100",
  SECTION_SUB: "mt-0.5 text-[12px] text-slate-700/90 dark:text-slate-400 font-medium",

  KPI_CARD: ["rounded-2xl", "border border-slate-200 dark:border-slate-700", "bg-white/72 dark:bg-slate-800/72", "backdrop-blur", "px-5 py-4", "shadow-sm"].join(" "),
  KPI_LABEL: "text-[11px] font-semibold tracking-wide text-slate-500 dark:text-slate-400",
  KPI_VALUE: "mt-2 text-[28px] font-semibold leading-none text-slate-900 dark:text-slate-100 tabular-nums",
  KPI_SUB: "mt-2 text-[11px] text-slate-500 dark:text-slate-400",

  TABLE_WRAP: ["overflow-hidden", "rounded-2xl", "border border-slate-200 dark:border-slate-700", "bg-white dark:bg-slate-800"].join(" "),
  TABLE_HEAD:
    "hidden lg:grid lg:items-center lg:gap-3 lg:border-b border-slate-200 dark:border-slate-700 lg:px-5 lg:py-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400",
  ROW: "group px-4 py-3 lg:px-5 lg:py-3 transition hover:bg-slate-50/70 dark:hover:bg-slate-700/50",
  ROW_DIVIDER: "divide-y divide-slate-200 dark:divide-slate-700",

  CARD_SOFT: ["rounded-2xl", "border border-slate-200 dark:border-slate-700", "bg-white/70 dark:bg-slate-800/70", "backdrop-blur", "shadow-sm"].join(" "),
} as const;

const SITE_ORDER = [
  "採用係長",
  "AirWork",
  "Engage",
  "Indeed",
  "求人BOX",
  "はたらきんぐ",
  "げんきワーク",
  "ハローワーク",
  "ジモティー",
  "Direct",
] as const;

const SITE_LABEL: Record<string, string> = {
  採用係長: "採用係長",
  AirWork: "AirWork",
  Engage: "エンゲージ",
  Indeed: "indeed",
  求人BOX: "求人ボックス",
  はたらきんぐ: "はたらきんぐ",
  げんきワーク: "げんきワーク",
  ハローワーク: "ハローワーク",
  ジモティー: "ジモティー",
  Direct: "Direct",

  // Aliases (表示だけ合わせたいケース用)
  エンゲージ: "エンゲージ",
  求人ボックス: "求人ボックス",
  ジモティ: "ジモティー",
  indeed: "indeed",
  airwork: "AirWork",
  engage: "エンゲージ",
};

const SITE_ICON_SRC: Record<string, string> = {
  Indeed: "/site_indeed.png",
  indeed: "/site_indeed.png",

  求人BOX: "/site_kyujinbox.png",
  求人ボックス: "/site_kyujinbox.png",

  AirWork: "/site_airwork.png",
  airwork: "/site_airwork.png",

  Engage: "/site_engage.png",
  エンゲージ: "/site_engage.png",
  engage: "/site_engage.png",

  採用係長: "/site_saiyokakaricho.png",
  はたらきんぐ: "/site_hataraking.png",
  げんきワーク: "/site_genkiwork.png",
  ハローワーク: "/site_hellowork.png",

  ジモティー: "/site_jmty.png",
  ジモティ: "/site_jmty.png",

  Direct: "/site_direct.png", // 無くても壊れない（fallback）
};

function cls(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function safeLower(s: any): string {
  return String(s ?? "").trim().toLowerCase();
}

function ymFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function currentYm(): string {
  return ymFromDate(new Date());
}

function prevYm(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return ymFromDate(d);
}

function isInYmIso(iso: string, ym: string): boolean {
  if (!iso || !ym) return false;
  try {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}` === ym;
  } catch {
    return String(iso).startsWith(ym);
  }
}

function dayKeyFromIso(iso: string): string {
  const s = String(iso ?? "");
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) {
      // パースできない場合は先頭10文字を試す
      if (s.length >= 10) return s.slice(0, 10);
      return s;
    }
    // ローカル時間で日付キーを生成
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  } catch {
    if (s.length >= 10) return s.slice(0, 10);
    return s;
  }
}

function lastNDaysKeys(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d);
    x.setDate(x.getDate() - i);
    // ローカル時間で日付キーを生成（UTCではなく）
    const y = x.getFullYear();
    const m = String(x.getMonth() + 1).padStart(2, "0");
    const dd = String(x.getDate()).padStart(2, "0");
    out.push(`${y}-${m}-${dd}`);
  }
  return out;
}

function formatLocalDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function compactNumber(n: number): string {
  if (!Number.isFinite(n)) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/**
 * ✅ Canonical: 最終的にこのページが扱う「媒体キー」
 * - ここをSSOTにして、SiteBadge/集計/UI/アイコン参照がブレないようにする
 */
function canonSiteKey(k: any): string {
  const s = String(k ?? "").trim();
  if (!s) return "Direct";

  const low = s.toLowerCase();

  // explicit aliases
  if (s === "求人ボックス") return "求人BOX";
  if (s === "エンゲージ") return "Engage";
  if (s === "ジモティ") return "ジモティー";
  if (s === "indeed") return "Indeed";
  if (s === "airwork" || s === "air-work") return "AirWork";
  if (s === "engage") return "Engage";

  if (low === "indeed") return "Indeed";
  if (low === "engage") return "Engage";
  if (low === "airwork" || low === "air-work") return "AirWork";
  if (low === "direct" || low === "unknown" || low === "undefined" || low === "null") return "Direct";

  // defensive known keys
  if (SITE_LABEL[s]) return s;

  return s;
}

/**
 * ✅ 送信元ドメインで媒体判定（ジモティーは件名でも拾う）
 * - “fromEmail”ベースの一次判定
 */
function inferSiteKeyFromFromEmail(fromEmail: string, _fallback?: string, subject?: string): string {
  const rawSubject = String(subject ?? "");
  if (rawSubject.includes("ジモティ")) return "ジモティー";

  const rawFrom = String(fromEmail ?? "").toLowerCase();
  const inner = rawFrom.match(/<([^>]+)>/)?.[1] ?? rawFrom;
  const email = inner.match(/[a-z0-9._%+\-]+@([a-z0-9.\-]+\.[a-z]{2,})/)?.[0] ?? "";
  const domain = email.split("@")[1]?.trim().replace(/[>\s;]+$/g, "") ?? "";

  if (domain === "vm.jmty.jp" || domain.endsWith(".jmty.jp")) return "ジモティー";
  if (domain === "indeedemail.com") return "Indeed";
  if (domain === "rct.airwork.net" || domain.endsWith(".airwork.net") || domain === "airwork.net") return "AirWork";
  if (domain === "saiyo-kakaricho.com") return "採用係長";
  if (domain === "en-gage.net") return "Engage";
  if (domain === "mail.hellowork.mhlw.go.jp" || domain.endsWith(".hellowork.mhlw.go.jp")) return "ハローワーク";

  return "Direct";
}

/**
 * ✅ 本文/送信元/件名から推定（Directを極小化）
 * - “Direct” になったときだけ使う（監査上の揺れを限定）
 */
function inferSiteKeyFromContent(it: Pick<InboxItem, "fromEmail" | "subject" | "snippet">): string | null {
  const s = `${String(it.subject ?? "")}\n${String(it.snippet ?? "")}\n${String(it.fromEmail ?? "")}`.toLowerCase();

  if (/(saiyo-kakaricho\.com|採用係長)/i.test(s)) return "採用係長";
  if (/(en-gage\.net|en-gage|engage|エンゲージ)/i.test(s)) return "Engage";
  if (/(jmty|jimoty|ジモティ)/i.test(s)) return "ジモティー";
  if (/(hellowork|ハローワーク|mhlw)/i.test(s)) return "ハローワーク";
  if (/(kyujinbox|求人box|求人ボックス|求人box)/i.test(s)) return "求人BOX";
  if (/(airwork|air-work)/i.test(s)) return "AirWork";
  if (/indeed/i.test(s)) return "Indeed";

  return null;
}

/**
 * ✅ resolvedSiteKey：UI/集計で使う“解決後”媒体キー
 * - 一次判定（fromEmail） → Direct のときだけ本文推定 → それでも無理なら Direct
 */
function resolvedSiteKey(it: InboxItem): string {
  const first = canonSiteKey(inferSiteKeyFromFromEmail(it.fromEmail, it.siteKey, it.subject));
  if (first !== "Direct") return first;

  const inferred = inferSiteKeyFromContent(it);
  if (inferred) return canonSiteKey(inferred);

  // 最後に保存値を救済（Direct以外が入ってるのにfrom判定がDirectのケース）
  const saved = canonSiteKey(it.siteKey);
  if (saved !== "Direct") return saved;

  return "Direct";
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

function getTemplateSites(): string[] {
  const sites = uniq((SITE_TEMPLATES ?? []).map((t) => String((t as any)?.site ?? ""))).filter(Boolean);
  return sites.sort((a, b) => a.localeCompare(b, "ja"));
}

/**
 * ✅ 掲載カウントは「テンプレ一覧」ではなく、job.siteStatus のキーから集計する
 * （キー揺れと“載ってるのに0”を根本解決）
 */
function getJobPostedSiteKeys(job: any): string[] {
  const st = (job as any)?.siteStatus ?? (job as any)?.site_status;
  if (!st || typeof st !== "object") return [];
  return Object.keys(st)
    .map((k) => canonSiteKey(k))
    .filter(Boolean);
}

function chipClass(active: boolean) {
  return cls(
    "inline-flex items-center justify-center rounded-full px-3 py-2 text-xs font-semibold",
    "border shadow-sm transition",
    active
      ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100"
      : "bg-white/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
  );
}

function selectClass() {
  return cls(
    "min-h-[36px] rounded-xl border bg-white/70 dark:bg-slate-800/70 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/35"
  );
}

function btnGhost() {
  return cls(
    "inline-flex items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold",
    "border bg-white/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 shadow-sm transition",
    "hover:bg-white dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/35"
  );
}

function TonePill({ tone, text }: { tone: "good" | "warn" | "bad" | "neutral"; text: string }) {
  const meta =
    tone === "good"
      ? { cls: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700", dot: "bg-emerald-500" }
      : tone === "warn"
        ? { cls: "bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-700", dot: "bg-amber-500" }
        : tone === "bad"
          ? { cls: "bg-rose-50 dark:bg-rose-900/30 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-700", dot: "bg-rose-500" }
          : { cls: "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700", dot: "bg-slate-400" };

  return (
    <span className={cls("inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[12px] font-semibold", meta.cls)}>
      <span className={cls("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {text}
    </span>
  );
}

function SiteBadge({ siteKey, emphasize }: { siteKey: string; emphasize?: boolean }) {
  const k = canonSiteKey(siteKey);
  const label = SITE_LABEL[k] ?? SITE_LABEL[k.toLowerCase()] ?? k;
  const src = SITE_ICON_SRC[k] ?? SITE_ICON_SRC[k.toLowerCase()] ?? "";

  const [imgOk, setImgOk] = useState(true);

  useEffect(() => {
    setImgOk(true);
  }, [src, k]);

  return (
    <span
      className={cls(
        "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[12px] font-semibold",
        "bg-white/72 dark:bg-slate-800/72 backdrop-blur",
        emphasize ? "border-slate-900/15 dark:border-slate-100/20 text-slate-900 dark:text-slate-100" : "border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
      )}
      title={label}
    >
      {src && imgOk ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={label}
          className="h-[16px] w-[16px] object-contain"
          onError={() => setImgOk(false)}
        />
      ) : (
        <span className="inline-flex h-[16px] w-[16px] items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-[10px] font-semibold text-slate-700 dark:text-slate-300">
          {label.slice(0, 1)}
        </span>
      )}
      <span className="leading-none">{label}</span>
    </span>
  );
}

function Sparkline({ data }: { data: number[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const w = 128;
  const h = 30;
  const sum = data.reduce((a, b) => a + b, 0);
  const max = Math.max(1, ...data);

  const points = data.map((v, i) => {
    const x = (i / Math.max(1, data.length - 1)) * (w - 2) + 1;
    const y = h - 2 - (v / max) * (h - 4);
    return { x, y, value: v };
  });

  const pts = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    let closestIdx = 0;
    let minDist = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - mouseX);
      if (dist < minDist) {
        minDist = dist;
        closestIdx = i;
      }
    });

    if (minDist < 15) {
      setHoveredIndex(closestIdx);
    } else {
      setHoveredIndex(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <svg
          ref={svgRef}
          width={w}
          height={h}
          viewBox={`0 0 ${w} ${h}`}
          className="block cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id="spk" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(99,102,241,0.18)" />
              <stop offset="100%" stopColor="rgba(168,85,247,0.20)" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width={w} height={h} rx="10" fill="rgba(15,23,42,0.03)" />
          <polyline points={pts} fill="none" stroke="url(#spk)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          {/* 最後のポイント */}
          {points.length > 0 && (
            <circle
              cx={points[points.length - 1].x}
              cy={points[points.length - 1].y}
              r="2.4"
              fill="rgba(79,70,229,0.85)"
            />
          )}
        </svg>

        {/* Tooltip */}
        {hoveredIndex !== null && (
          <div
            className="absolute z-10 rounded-md bg-slate-900/95 px-2 py-1 text-[11px] font-semibold text-white shadow-lg border border-indigo-500/50 pointer-events-none"
            style={{
              left: `${points[hoveredIndex].x}px`,
              top: `${points[hoveredIndex].y - 28}px`,
              transform: 'translateX(-50%)',
            }}
          >
            {points[hoveredIndex].value}
          </div>
        )}
      </div>

      <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100 tabular-nums w-[30px] text-right">{sum}</div>
    </div>
  );
}

// ミニ版の時系列チャート（ヒーロー用・プレミアム）
function MiniTimeSeriesChart({ data }: { data: Array<{ ym: string; total: number }> }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [animated, setAnimated] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const max = Math.max(1, ...data.map((d) => d.total));
  const total = data.reduce((sum, d) => sum + d.total, 0);
  const w = 480;
  const h = 200;
  const padding = { top: 24, right: 20, bottom: 32, left: 20 };
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;

  const points = data.map((d, i) => {
    const x = padding.left + (i / Math.max(1, data.length - 1)) * chartW;
    const y = padding.top + chartH - (d.total / max) * chartH;
    return { x, y, value: d.total, label: d.ym };
  });

  // スムーズな曲線パス生成
  const smoothPath = points.map((p, i, arr) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = arr[i - 1];
    const cpX = (prev.x + p.x) / 2;
    return `C ${cpX} ${prev.y}, ${cpX} ${p.y}, ${p.x} ${p.y}`;
  }).join(" ");

  const areaPath = `${smoothPath} L ${points[points.length - 1].x} ${padding.top + chartH} L ${padding.left} ${padding.top + chartH} Z`;

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    let closestIdx = 0;
    let minDist = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - mouseX);
      if (dist < minDist) { minDist = dist; closestIdx = i; }
    });
    setHoveredIndex(minDist < 40 ? closestIdx : null);
  };

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        className="block cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredIndex(null)}
      >
        <defs>
          {/* エリアグラデーション */}
          <linearGradient id="heroAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(99,102,241,0.3)" />
            <stop offset="40%" stopColor="rgba(139,92,246,0.15)" />
            <stop offset="100%" stopColor="rgba(99,102,241,0)" />
          </linearGradient>

          {/* 流動するラインのグラデーション */}
          <linearGradient id="flowLineGrad" x1="0%" y1="0%" x2="200%" y2="0%">
            <stop offset="0%" stopColor="rgba(99,102,241,0.4)">
              <animate attributeName="offset" values="-1;1" dur="3s" repeatCount="indefinite" />
            </stop>
            <stop offset="25%" stopColor="rgba(139,92,246,1)">
              <animate attributeName="offset" values="-0.75;1.25" dur="3s" repeatCount="indefinite" />
            </stop>
            <stop offset="50%" stopColor="rgba(236,72,153,1)">
              <animate attributeName="offset" values="-0.5;1.5" dur="3s" repeatCount="indefinite" />
            </stop>
            <stop offset="75%" stopColor="rgba(139,92,246,1)">
              <animate attributeName="offset" values="-0.25;1.75" dur="3s" repeatCount="indefinite" />
            </stop>
            <stop offset="100%" stopColor="rgba(99,102,241,0.4)">
              <animate attributeName="offset" values="0;2" dur="3s" repeatCount="indefinite" />
            </stop>
          </linearGradient>

          {/* グロー効果 */}
          <filter id="lineGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          {/* ポイント用グラデーション */}
          <radialGradient id="pointGrad" cx="30%" cy="30%">
            <stop offset="0%" stopColor="white" />
            <stop offset="100%" stopColor="rgba(199,210,254,1)" />
          </radialGradient>
        </defs>

        {/* 背景グリッド（薄く） */}
        {[0.25, 0.5, 0.75].map((ratio) => (
          <line
            key={ratio}
            x1={padding.left}
            y1={padding.top + chartH * (1 - ratio)}
            x2={padding.left + chartW}
            y2={padding.top + chartH * (1 - ratio)}
            stroke="rgba(99,102,241,0.08)"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
        ))}

        {/* エリア塗り */}
        <path
          d={areaPath}
          fill="url(#heroAreaGrad)"
          style={{
            opacity: animated ? 1 : 0,
            transition: "opacity 1s ease-out 0.3s",
          }}
        />

        {/* 流動するメインライン */}
        <path
          d={smoothPath}
          fill="none"
          stroke="url(#flowLineGrad)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#lineGlow)"
          style={{
            opacity: animated ? 1 : 0,
            transition: "opacity 0.5s ease-out",
          }}
        />

        {/* ポイント */}
        {points.map((p, i) => (
          <g
            key={i}
            style={{
              opacity: animated ? 1 : 0,
              transform: animated ? "scale(1)" : "scale(0)",
              transformOrigin: `${p.x}px ${p.y}px`,
              transition: `all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.5 + i * 0.08}s`,
            }}
          >
            {/* 常時パルス（最新ポイント） */}
            {i === points.length - 1 && (
              <>
                <circle cx={p.x} cy={p.y} r="16" fill="rgba(139,92,246,0.1)">
                  <animate attributeName="r" values="8;18;8" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite" />
                </circle>
                <circle cx={p.x} cy={p.y} r="12" fill="rgba(139,92,246,0.15)">
                  <animate attributeName="r" values="6;14;6" dur="2s" repeatCount="indefinite" begin="0.3s" />
                  <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite" begin="0.3s" />
                </circle>
              </>
            )}

            {/* ホバー時のリング */}
            {hoveredIndex === i && i !== points.length - 1 && (
              <circle cx={p.x} cy={p.y} r="14" fill="none" stroke="rgba(139,92,246,0.4)" strokeWidth="2">
                <animate attributeName="r" values="8;16;8" dur="1s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.6;0;0.6" dur="1s" repeatCount="indefinite" />
              </circle>
            )}

            {/* メインポイント */}
            <circle
              cx={p.x}
              cy={p.y}
              r={hoveredIndex === i ? "7" : i === points.length - 1 ? "6" : "5"}
              fill="url(#pointGrad)"
              stroke={hoveredIndex === i ? "rgba(236,72,153,1)" : i === points.length - 1 ? "rgba(139,92,246,1)" : "rgba(99,102,241,0.9)"}
              strokeWidth={hoveredIndex === i ? "3" : "2"}
              className="transition-all duration-200"
              style={{
                filter: hoveredIndex === i || i === points.length - 1
                  ? "drop-shadow(0 0 8px rgba(139,92,246,0.7))"
                  : "drop-shadow(0 2px 4px rgba(0,0,0,0.1))",
              }}
            />

            {/* 月ラベル */}
            <text
              x={p.x}
              y={h - 8}
              textAnchor="middle"
              fontSize="11"
              fontWeight="600"
              fill={hoveredIndex === i ? "rgba(99,102,241,1)" : "rgba(100,116,139,0.6)"}
              className="transition-all duration-200"
            >
              {p.label.slice(5)}月
            </text>
          </g>
        ))}

        {/* ツールチップ */}
        {hoveredIndex !== null && (
          <g
            style={{
              animation: "tooltipFadeIn 0.15s ease-out",
            }}
          >
            <rect
              x={clamp(points[hoveredIndex].x - 36, 0, w - 72)}
              y={Math.max(0, points[hoveredIndex].y - 42)}
              width="72"
              height="32"
              rx="10"
              fill="rgba(15,23,42,0.95)"
              style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.3))" }}
            />
            <text
              x={clamp(points[hoveredIndex].x, 36, w - 36)}
              y={Math.max(20, points[hoveredIndex].y - 20)}
              textAnchor="middle"
              fontSize="15"
              fill="white"
              fontWeight="700"
            >
              {points[hoveredIndex].value}件
            </text>
          </g>
        )}
      </svg>

      {/* 合計表示（右上） */}
      <div
        className="absolute -top-1 -right-2 flex items-baseline gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 ring-1 ring-indigo-200/50 dark:ring-indigo-500/20"
        style={{
          opacity: animated ? 1 : 0,
          transform: animated ? "translateY(0) scale(1)" : "translateY(-8px) scale(0.9)",
          transition: "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 1s",
        }}
      >
        <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">{total}</span>
        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">件/6M</span>
      </div>

      <style jsx>{`
        @keyframes tooltipFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function TimeSeriesChart({ months, data }: { months: string[]; data: Array<{ ym: string; total: number }> }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const max = Math.max(1, ...data.map((d) => d.total));
  const w = 800;
  const h = 180;
  const padding = { top: 20, right: 40, bottom: 30, left: 50 };
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;

  const points = data.map((d, i) => {
    const x = padding.left + (i / Math.max(1, data.length - 1)) * chartW;
    const y = padding.top + chartH - (d.total / max) * chartH;
    return { x, y, value: d.total, label: d.ym };
  });

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

  const areaD = `${pathD} L ${points[points.length - 1].x} ${padding.top + chartH} L ${padding.left} ${padding.top + chartH} Z`;

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    // Find closest point
    let closestIdx = 0;
    let minDist = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - mouseX);
      if (dist < minDist) {
        minDist = dist;
        closestIdx = i;
      }
    });

    if (minDist < 40) {
      setHoveredIndex(closestIdx);
    } else {
      setHoveredIndex(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
  };

  return (
    <div className="w-full overflow-x-auto">
      <svg
        ref={svgRef}
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        className="block cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(99,102,241,0.20)" />
            <stop offset="100%" stopColor="rgba(99,102,241,0.02)" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = padding.top + chartH * (1 - ratio);
          const val = Math.round(max * ratio);
          return (
            <g key={ratio}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + chartW}
                y2={y}
                stroke="rgba(15,23,42,0.08)"
                strokeWidth="1"
                strokeDasharray={ratio === 0 ? "0" : "4 4"}
              />
              <text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize="11" fill="rgba(15,23,42,0.5)">
                {val}
              </text>
            </g>
          );
        })}

        {/* Area */}
        <path d={areaD} fill="url(#areaGrad)" />

        {/* Line */}
        <path d={pathD} fill="none" stroke="rgba(99,102,241,0.75)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r={hoveredIndex === i ? "6" : "4"}
              fill="white"
              stroke="rgba(99,102,241,0.85)"
              strokeWidth={hoveredIndex === i ? "3" : "2"}
              className="transition-all duration-150"
            />
            <text x={p.x} y={h - 8} textAnchor="middle" fontSize="10" fill="rgba(15,23,42,0.6)">
              {p.label.slice(5)}
            </text>
          </g>
        ))}

        {/* Tooltip */}
        {hoveredIndex !== null && (
          <g>
            <rect
              x={points[hoveredIndex].x - 35}
              y={points[hoveredIndex].y - 35}
              width="70"
              height="28"
              rx="6"
              fill="rgba(15,23,42,0.95)"
              stroke="rgba(99,102,241,0.5)"
              strokeWidth="1.5"
            />
            <text
              x={points[hoveredIndex].x}
              y={points[hoveredIndex].y - 23}
              textAnchor="middle"
              fontSize="10"
              fill="rgba(255,255,255,0.7)"
              fontWeight="600"
            >
              {points[hoveredIndex].label}
            </text>
            <text
              x={points[hoveredIndex].x}
              y={points[hoveredIndex].y - 11}
              textAnchor="middle"
              fontSize="13"
              fill="white"
              fontWeight="700"
            >
              {points[hoveredIndex].value}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

function SiteDetailModal({
  siteKey,
  row,
  timeSeriesData,
  onClose,
}: {
  siteKey: string;
  row: SiteRow | null;
  timeSeriesData: { months: string[]; data: Array<{ ym: string; bySite: Record<string, number> }> };
  onClose: () => void;
}) {
  if (!row) return null;

  const label = SITE_LABEL[siteKey] ?? siteKey;
  const siteTimeSeries = timeSeriesData.data.map((d) => ({ ym: d.ym, total: d.bySite[siteKey] ?? 0 }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="max-w-3xl w-full mx-4 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-slate-200 dark:border-slate-700 px-6 py-4 bg-gradient-to-br from-blue-50/60 via-white to-purple-50/60 dark:from-blue-950/20 dark:via-slate-800 dark:to-purple-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SiteBadge siteKey={siteKey} emphasize />
              <div>
                <div className="text-[16px] font-bold text-slate-900 dark:text-slate-100">{label} 詳細</div>
                <div className="text-[12px] text-slate-600 dark:text-slate-400">パフォーマンスサマリー</div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300 transition"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3">
              <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">掲載求人</div>
              <div className="mt-1 text-[24px] font-bold text-slate-900 dark:text-slate-100 tabular-nums">{row.postedJobs}</div>
            </div>
            <div className="rounded-lg border border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 px-4 py-3">
              <div className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">応募数</div>
              <div className="mt-1 text-[24px] font-bold text-indigo-900 dark:text-indigo-200 tabular-nums">{row.applications}</div>
            </div>
            <div className="rounded-lg border border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 px-4 py-3">
              <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">応募/掲載</div>
              <div className="mt-1 text-[24px] font-bold text-emerald-900 dark:text-emerald-200 tabular-nums">
                {row.appRate !== null ? row.appRate.toFixed(2) : "—"}
              </div>
            </div>
          </div>

          <div>
            <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 mb-3">過去6ヶ月の推移</div>
            <TimeSeriesChart months={timeSeriesData.months} data={siteTimeSeries} />
          </div>

          <div>
            <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 mb-2">直近28日のアクティビティ</div>
            <div className="flex items-center gap-2">
              <Sparkline data={row.spark} />
              <span className="text-[12px] text-slate-600 dark:text-slate-400">合計: {row.spark.reduce((sum, v) => sum + v, 0)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ratePill(applications: number, postedJobs: number): { label: string; cls: string; title: string } {
  if (postedJobs <= 0) {
    if (applications > 0) {
      return {
        label: "要確認",
        cls: "bg-[rgba(124,58,237,0.10)] text-[rgba(91,33,182,0.95)] border border-[rgba(124,58,237,0.20)]",
        title: "掲載カウントが0なのに応募があります（掲載判定 or 媒体キーを確認）",
      };
    }
    return { label: "-", cls: "text-slate-400", title: "掲載0・応募0" };
  }

  const rate = applications / postedJobs;
  const label = rate.toFixed(2);

  if (rate >= 1.0) {
    return {
      label,
      cls: "bg-[rgba(16,185,129,0.14)] text-[rgba(6,95,70,0.95)] border border-[rgba(16,185,129,0.24)] font-semibold",
      title: "応募/掲載が非常に高い",
    };
  }
  if (rate >= 0.5) {
    return {
      label,
      cls: "bg-[rgba(16,185,129,0.10)] text-[rgba(6,95,70,0.90)] border border-[rgba(16,185,129,0.20)]",
      title: "応募/掲載が高い",
    };
  }
  if (rate >= 0.2) {
    return {
      label,
      cls: "bg-[rgba(234,179,8,0.12)] text-[rgba(113,63,18,0.95)] border border-[rgba(234,179,8,0.22)]",
      title: "応募/掲載は平均〜注意",
    };
  }
  return {
    label,
    cls: "bg-[rgba(15,23,42,0.06)] text-[rgba(15,23,42,0.82)] border border-[rgba(15,23,42,0.10)]",
    title: "応募/掲載が低い",
  };
}

function HeroGradient({
  title,
  subtitle,
  right,
  children,
  summaryText,
  kpiCards,
  timeSeriesData,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children?: React.ReactNode;
  summaryText?: string;
  kpiCards?: Array<{ label: string; value: number; gradient: string }>;
  timeSeriesData?: Array<{ ym: string; total: number }>;
}) {
  const heroRef = useRef<HTMLDivElement | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) return;

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      setMousePos({ x: clamp(x, 0, 1), y: clamp(y, 0, 1) });
    };

    el.addEventListener("mousemove", onMove, { passive: true });
    return () => el.removeEventListener("mousemove", onMove);
  }, []);

  const gradientStyle = {
    background: `radial-gradient(800px circle at ${mousePos.x * 100}% ${mousePos.y * 100}%, rgba(99,102,241,0.12), transparent 50%)`,
  };

  const { greeting, icon } = getTimeOfDay();
  const { displayed, done } = useTypingEffect(summaryText || "", 75);

  return (
    <div
      ref={heroRef}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 shadow-2xl shadow-indigo-200/40 dark:shadow-black/40 ring-1 ring-indigo-100 dark:ring-white/5"
    >
      {/* Mouse-following gradient */}
      <div className="pointer-events-none absolute inset-0 transition-all duration-500" style={gradientStyle} />

      {/* Floating blobs with animation */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[400px] w-[400px] rounded-full bg-indigo-200/30 dark:bg-indigo-500/10 blur-3xl animate-[float_20s_ease-in-out_infinite]" />
        <div className="absolute -right-32 top-20 h-[300px] w-[300px] rounded-full bg-purple-200/25 dark:bg-purple-500/10 blur-3xl animate-[float_25s_ease-in-out_infinite_reverse]" />
        <div className="absolute bottom-0 left-1/3 h-[250px] w-[250px] rounded-full bg-blue-200/20 dark:bg-blue-500/8 blur-3xl animate-[float_22s_ease-in-out_infinite]" />
      </div>

      <div className="relative z-10 flex flex-col lg:flex-row">
        {/* Left side - Title & Summary */}
        <div className="flex-1 p-8 lg:p-12 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">{icon}</span>
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{greeting}</span>
          </div>

          <h1 className="text-5xl lg:text-6xl font-bold bg-gradient-to-r from-slate-900 via-indigo-800 to-slate-900 dark:from-white dark:via-indigo-200 dark:to-white bg-clip-text text-transparent">
            {title}
          </h1>

          {subtitle && (
            <p className="mt-3 text-lg text-slate-600 dark:text-slate-400">{subtitle}</p>
          )}

          {summaryText && (
            <div className="mt-6 flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-300/50 dark:shadow-indigo-900/50 flex-shrink-0">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2a10 10 0 100 20 10 10 0 000-20z" />
                  <path d="M12 6v6l4 2" />
                </svg>
              </div>
              <p className="text-base text-slate-700 dark:text-slate-300 leading-relaxed">
                {displayed}
                {!done && <span className="inline-block w-0.5 h-5 bg-indigo-500 ml-0.5 animate-pulse" />}
              </p>
            </div>
          )}

          {right && <div className="mt-6">{right}</div>}
        </div>

        {/* Right side - Time Series + KPI Cards horizontal */}
        {kpiCards && kpiCards.length > 0 && (
          <div className="lg:w-[800px] p-4 lg:p-6 flex items-center gap-8">
            {/* Mini Time Series - left */}
            {timeSeriesData && timeSeriesData.length > 0 && (
              <div className="flex-shrink-0">
                <MiniTimeSeriesChart data={timeSeriesData} />
              </div>
            )}

            {/* KPI Cards - 2x2 grid right */}
            <div className="grid grid-cols-2 gap-2 flex-1">
              {kpiCards.map((kpi, idx) => (
                <div
                  key={idx}
                  className="group relative overflow-hidden rounded-lg bg-white/60 dark:bg-slate-800/60 backdrop-blur-md px-3 py-2 shadow-md ring-1 ring-slate-200/50 dark:ring-white/10 hover:ring-indigo-300 dark:hover:ring-indigo-500/30 transition-all duration-200"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${kpi.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-200`} />
                  <div className="relative">
                    <div className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{kpi.label}</div>
                    <div className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                      <AnimatedNumber value={kpi.value} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {children && <div className="relative z-10 px-8 pb-8 lg:px-12">{children}</div>}

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px) scale(1); }
          33% { transform: translateY(-20px) translateX(10px) scale(1.02); }
          66% { transform: translateY(10px) translateX(-10px) scale(0.98); }
        }
      `}</style>
    </div>
  );
}

function AnimatedNumber({ value }: { value: number }) {
  const animatedValue = useCountUp(value);
  return <>{animatedValue.toLocaleString()}</>;
}

export default function AnalyticsPage() {
  const [mounted, setMounted] = useState(false);

  const [ym, setYm] = useState<string>("ALL");
  const [companyId, setCompanyId] = useState<string>("ALL");

  const [jobs, setJobs] = useState<Job[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([]);
  const [loadError, setLoadError] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [loadedAt, setLoadedAt] = useState<string>("");

  // 詳細モーダル用
  const [selectedSite, setSelectedSite] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);

    async function loadAll() {
      setLoadError("");
      setLoading(true);

      // jobs
      {
        const r = await fetchJsonSafe("/api/jobs", { cache: "no-store" });
        if (!r.ok || !r.json) {
          setLoadError((x) => x || `jobs load failed: HTTP ${r.status}`);
        } else {
          const arr = Array.isArray((r.json as any)?.jobs) ? (r.json as any).jobs : Array.isArray((r.json as any)?.items) ? (r.json as any).items : Array.isArray(r.json) ? r.json : [];
          console.log("[Analytics Debug] Jobs loaded:", arr.length, "first job:", arr[0]);
          setJobs(arr as Job[]);
        }
      }

      // companies
      let companyNameToId = new Map<string, string>();
      {
        const r = await fetchJsonSafe("/api/companies", { cache: "no-store" });
        if (!r.ok || !r.json) {
          setLoadError((x) => x || `companies load failed: HTTP ${r.status}`);
        } else {
          const arr = Array.isArray((r.json as any)?.companies) ? (r.json as any).companies : Array.isArray((r.json as any)?.items) ? (r.json as any).items : Array.isArray(r.json) ? r.json : [];
          console.log("[Analytics Debug] Companies loaded:", arr.length, "first company:", arr[0]);
          setCompanies(arr as Company[]);

          companyNameToId = new Map(
            (arr as any[])
              .map((c) => {
                const id = String(c.id ?? "");
                const name = safeLower(c.company_name ?? c.companyName ?? "");
                return id && name ? [name, id] : null;
              })
              .filter(Boolean) as Array<[string, string]>
          );
        }
      }

      // gmail inbox（全ページ取得）
      {
        const all: InboxItem[] = [];
        const limit = 200;
        const maxPagesHard = 2000;
        const safetyMaxRows = 30000;

        let page = 1;
        while (page <= maxPagesHard) {
          const r = await fetchJsonSafe(`/api/gmail/inbox?limit=${limit}&page=${page}`, { cache: "no-store" });

          if (!r.ok || !r.json) {
            setLoadError((x) => x || `inbox load failed: HTTP ${r.status}`);
            break;
          }
          if ((r.json as any)?.ok === false) {
            setLoadError((x) => x || String((r.json as any)?.error ?? "inbox load failed"));
            break;
          }

          const arr = Array.isArray((r.json as any)?.items) ? (r.json as any).items : [];
          const mapped: InboxItem[] = arr.map((x: any) => {
            const rawCompanyName = String(x.companyName ?? x.company_name ?? "");
            const normalizedName = safeLower(rawCompanyName);
            const inferredCompanyId = x.companyId ? String(x.companyId) : companyNameToId.get(normalizedName) ?? null;

            return {
              id: String(x.id ?? ""),
              gmailMessageId: String(x.gmailMessageId ?? x.gmail_message_id ?? ""),
              threadId: x.threadId ? String(x.threadId) : x.thread_id ? String(x.thread_id) : null,

              fromEmail: String(x.fromEmail ?? x.from_email ?? ""),
              toEmail: x.toEmail ? String(x.toEmail) : x.to_email ? String(x.to_email) : null,

              companyId: inferredCompanyId,
              companyName: rawCompanyName ? rawCompanyName : x.companyName ? String(x.companyName) : null,

              jobId: x.jobId ? String(x.jobId) : x.job_id ? String(x.job_id) : null,

              subject: String(x.subject ?? ""),
              snippet: x.snippet != null ? String(x.snippet) : null,
              receivedAt: String(x.receivedAt ?? x.received_at ?? ""),

              siteKey: String(x.siteKey ?? x.site_key ?? ""),
              status: String(x.status ?? ""),

              createdAt: String(x.createdAt ?? x.created_at ?? ""),
              updatedAt: String(x.updatedAt ?? x.updated_at ?? ""),
            };
          });

          all.push(...mapped);

          if (all.length >= safetyMaxRows) break;

          const hasNext = Boolean((r.json as any)?.page?.hasNext);
          if (!hasNext) break;
          page += 1;
        }

        all.sort((a, b) => String(b.receivedAt).localeCompare(String(a.receivedAt)));
        setInboxItems(all);
      }

      setLoadedAt(new Date().toISOString());
      setLoading(false);
    }

    void loadAll();
  }, []);

  const sitesFromTemplates = useMemo(() => getTemplateSites(), []);

  const companyOptions = useMemo(() => {
    return (companies as any[])
      .map((c) => ({
        id: String((c as any).id),
        name: String((c as any).company_name ?? (c as any).companyName ?? "(会社名未設定)"),
      }))
      .filter((c) => c.id)
      .sort((a, b) => a.name.localeCompare(b.name, "ja"));
  }, [companies]);

  const filteredJobs = useMemo(() => {
    if (companyId === "ALL") return jobs;
    return (jobs as any[]).filter((j) => String((j as any).companyId ?? (j as any).company_id ?? "") === companyId) as any as Job[];
  }, [jobs, companyId]);

  const filteredInbox = useMemo(() => {
    const base = companyId === "ALL" ? inboxItems : inboxItems.filter((it) => String(it.companyId ?? "") === companyId);
    if (ym === "ALL") return base;
    if (!ym) return [];
    return base.filter((it) => isInYmIso(it.receivedAt, ym));
  }, [inboxItems, ym, companyId]);

  const dayKeys28 = useMemo(() => lastNDaysKeys(28), []);
  const dayIndex = useMemo(() => new Map(dayKeys28.map((k, i) => [k, i])), [dayKeys28]);

  const postedBySite = useMemo(() => {
    const m = new Map<string, number>();

    // 1) job.siteStatus の実キーで集計
    for (const j of filteredJobs as any[]) {
      for (const k of getJobPostedSiteKeys(j)) {
        m.set(k, (m.get(k) ?? 0) + 1);
      }
    }

    // 2) テンプレ側のサイトも“存在”として押さえる（0行でも表に出る）
    for (const s of sitesFromTemplates) {
      const k = canonSiteKey(s);
      if (!m.has(k)) m.set(k, 0);
    }

    // 3) UI側固定順も押さえる
    for (const k of SITE_ORDER) {
      if (!m.has(k)) m.set(k, 0);
    }

    return m;
  }, [filteredJobs, sitesFromTemplates]);

  // Sparkline用：会社フィルターのみ適用、月フィルターは無視（常に直近28日を表示）
  const inboxForSparkline = useMemo(() => {
    if (companyId === "ALL") return inboxItems;
    return inboxItems.filter((it) => String(it.companyId ?? "") === companyId);
  }, [inboxItems, companyId]);

  const siteRows = useMemo<SiteRow[]>(() => {
    const appsBySite = new Map<string, number>();
    const sparkBySite = new Map<string, number[]>();

    // 応募数はfilteredInbox（月フィルター適用）から計算
    for (const it of filteredInbox) {
      const key = resolvedSiteKey(it);
      appsBySite.set(key, (appsBySite.get(key) ?? 0) + 1);
    }

    // Sparklineは月フィルター無視で直近28日を計算
    for (const it of inboxForSparkline) {
      const key = resolvedSiteKey(it);
      const day = dayKeyFromIso(it.receivedAt);
      const idx = dayIndex.get(day);
      if (idx != null) {
        const arr = sparkBySite.get(key) ?? Array.from({ length: 28 }, () => 0);
        arr[idx] = (arr[idx] ?? 0) + 1;
        sparkBySite.set(key, arr);
      }
    }

    const allKeys = new Set<string>([
      ...SITE_ORDER,
      ...Array.from(appsBySite.keys()).map(canonSiteKey),
      ...Array.from(postedBySite.keys()).map(canonSiteKey),
    ]);

    const out: SiteRow[] = Array.from(allKeys).map((siteKey0) => {
      const siteKey = canonSiteKey(siteKey0);
      const postedJobs = postedBySite.get(siteKey) ?? 0;
      const applications = appsBySite.get(siteKey) ?? 0;
      const appRate = postedJobs > 0 ? applications / postedJobs : null;
      const spark = sparkBySite.get(siteKey) ?? Array.from({ length: 28 }, () => 0);
      return { siteKey, postedJobs, applications, appRate, spark };
    });

    out.sort((a, b) => {
      // Default: more applications first
      if (a.applications !== b.applications) return b.applications - a.applications;

      // Then efficiency
      const ar = a.appRate ?? -1;
      const br = b.appRate ?? -1;
      if (ar !== br) return br - ar;

      // Then stable by label
      return (SITE_LABEL[a.siteKey] ?? a.siteKey).localeCompare((SITE_LABEL[b.siteKey] ?? b.siteKey), "ja");
    });

    return out;
  }, [filteredInbox, inboxForSparkline, dayIndex, postedBySite]);

  const jobRows = useMemo<JobRow[]>(() => {
    const countByJob = new Map<string, number>();
    const siteCountByJob = new Map<string, Map<string, number>>();

    for (const it of filteredInbox) {
      const jobId = String(it.jobId ?? "");
      if (!jobId) continue;

      countByJob.set(jobId, (countByJob.get(jobId) ?? 0) + 1);

      const m = siteCountByJob.get(jobId) ?? new Map<string, number>();
      const key = resolvedSiteKey(it);
      m.set(key, (m.get(key) ?? 0) + 1);
      siteCountByJob.set(jobId, m);
    }

    console.log("[Analytics Debug] Inbox items with jobId:", countByJob.size, "Total jobs in state:", jobs.length, "Total companies:", companies.length);

    // Use all jobs, not filtered, to ensure we can find job info even when company filter is applied
    const jobById = new Map<string, any>((jobs as any[]).map((j) => [String((j as any).id ?? (j as any).jobId ?? ""), j]));
    const companyById = new Map<string, any>((companies as any[]).map((c) => [String((c as any).id ?? ""), c]));

    console.log("[Analytics Debug] jobById map size:", jobById.size, "companyById map size:", companyById.size);

    const out: JobRow[] = Array.from(countByJob.entries()).map(([jobId, applications]) => {
      const job = jobById.get(jobId);
      console.log("[Analytics Debug] Processing jobId:", jobId, "found job:", !!job, job);
      const title = String((job as any)?.jobTitle ?? (job as any)?.job_title ?? "(求人名未設定)");

      const companyIdOfJob = String((job as any)?.companyId ?? (job as any)?.company_id ?? "");
      const companyObj = companyIdOfJob ? companyById.get(companyIdOfJob) : null;

      const cName =
        String((companyObj as any)?.company_name ?? (companyObj as any)?.companyName ?? "") ||
        String((job as any)?.companyName ?? (job as any)?.company_name ?? "") ||
        "(会社名未設定)";

      console.log("[Analytics Debug] jobId:", jobId, "title:", title, "companyName:", cName);

      const siteMap = siteCountByJob.get(jobId) ?? new Map<string, number>();
      const topSite =
        Array.from(siteMap.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ja"))[0]?.[0] ?? null;

      return { jobId, jobTitle: title, companyName: cName, applications, topSiteKey: topSite };
    });

    out.sort((a, b) => b.applications - a.applications || a.jobTitle.localeCompare(b.jobTitle, "ja"));
    return out;
  }, [filteredInbox, jobs, companies]);

  const totals = useMemo(() => {
    return { postedJobs: filteredJobs.length, applications: filteredInbox.length };
  }, [filteredJobs, filteredInbox]);

  const topSites = useMemo(() => siteRows.slice(0, 3).map((r) => r.siteKey), [siteRows]);
  const maxApps = useMemo(() => Math.max(0, ...siteRows.map((r) => r.applications)), [siteRows]);

  const headerCompanyLabel = companyId === "ALL" ? "全社" : companyOptions.find((c) => c.id === companyId)?.name ?? "（会社）";
  const headerYmLabel = ym === "ALL" ? "累計" : ym;

  // 前月データの計算
  const prevMonthData = useMemo(() => {
    if (ym === "ALL") return null;

    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    const prevYmStr = ymFromDate(d);

    const prevInbox = inboxItems.filter((it) => {
      const base = companyId === "ALL" ? true : String(it.companyId ?? "") === companyId;
      return base && isInYmIso(it.receivedAt, prevYmStr);
    });

    return {
      applications: prevInbox.length,
      ym: prevYmStr,
    };
  }, [inboxItems, ym, companyId]);

  // 時系列データ（過去6ヶ月）
  const timeSeriesData = useMemo(() => {
    const months: string[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(ymFromDate(d));
    }

    const dataByMonth = months.map((m) => {
      const items = inboxItems.filter((it) => {
        const base = companyId === "ALL" ? true : String(it.companyId ?? "") === companyId;
        return base && isInYmIso(it.receivedAt, m);
      });

      const bySite: Record<string, number> = {};
      for (const it of items) {
        const key = resolvedSiteKey(it);
        bySite[key] = (bySite[key] ?? 0) + 1;
      }

      return { ym: m, total: items.length, bySite };
    });

    return { months, data: dataByMonth };
  }, [inboxItems, companyId]);

  // パフォーマンスアラート
  const alerts = useMemo(() => {
    if (!prevMonthData || ym === "ALL") return [];

    const out: Array<{ siteKey: string; change: number }> = [];

    for (const row of siteRows) {
      const currentApps = row.applications;
      const prevYmData = timeSeriesData.data.find((d) => d.ym === prevMonthData.ym);
      const prevApps = prevYmData?.bySite[row.siteKey] ?? 0;

      if (prevApps > 0) {
        const change = ((currentApps - prevApps) / prevApps) * 100;
        if (change < -30) {
          out.push({ siteKey: row.siteKey, change });
        }
      }
    }

    return out.sort((a, b) => a.change - b.change);
  }, [siteRows, prevMonthData, timeSeriesData, ym]);

  // CSV エクスポート
  const exportCSV = () => {
    const headers = ["媒体", "掲載求人", "応募数", "応募/掲載", "28日トレンド合計"];
    const rows = siteRows.map((r) => [
      SITE_LABEL[r.siteKey] ?? r.siteKey,
      r.postedJobs.toString(),
      r.applications.toString(),
      r.appRate !== null ? r.appRate.toFixed(2) : "-",
      r.spark.reduce((sum, v) => sum + v, 0).toString(),
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `analytics_${ym}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const insights = useMemo<Insight[]>(() => {
    const rows = siteRows.filter((r) => r.siteKey !== "Direct");
    const bestByApps = rows.slice().sort((a, b) => b.applications - a.applications)[0];
    const bestByRate = rows
      .filter((r) => (r.appRate ?? -1) >= 0)
      .slice()
      .sort((a, b) => (b.appRate ?? -1) - (a.appRate ?? -1))[0];

    const suspicious = siteRows.filter((r) => r.postedJobs === 0 && r.applications > 0);
    const under = siteRows
      .filter((r) => r.postedJobs >= 5 && (r.appRate ?? 0) < 0.1)
      .slice()
      .sort((a, b) => (a.appRate ?? 0) - (b.appRate ?? 0))[0];

    const out: Insight[] = [];

    if (bestByApps && bestByApps.applications > 0) {
      out.push({
        tone: "good",
        title: "主要流入",
        detail: `${SITE_LABEL[bestByApps.siteKey] ?? bestByApps.siteKey}（応募 ${compactNumber(bestByApps.applications)}）`,
      });
    } else {
      out.push({ tone: "neutral", title: "主要流入", detail: "データがまだ十分ではありません" });
    }

    if (bestByRate && (bestByRate.appRate ?? 0) > 0) {
      out.push({
        tone: (bestByRate.appRate ?? 0) >= 0.3 ? "good" : "warn",
        title: "効率（応募/掲載）",
        detail: `${SITE_LABEL[bestByRate.siteKey] ?? bestByRate.siteKey}（${(bestByRate.appRate ?? 0).toFixed(2)}）`,
      });
    } else {
      out.push({ tone: "neutral", title: "効率（応募/掲載）", detail: "掲載データが不足しています" });
    }

    if (suspicious.length > 0) {
      out.push({
        tone: "warn",
        title: "定義ズレ",
        detail: `掲載0で応募あり（${suspicious
          .slice(0, 2)
          .map((r) => SITE_LABEL[r.siteKey] ?? r.siteKey)
          .join(" / ")}）`,
      });
    } else {
      out.push({ tone: "good", title: "定義ズレ", detail: "顕著な矛盾は検出されませんでした" });
    }

    if (under && (under.appRate ?? 0) < 0.1) {
      out.push({
        tone: "bad",
        title: "低効率",
        detail: `${SITE_LABEL[under.siteKey] ?? under.siteKey}（${(under.appRate ?? 0).toFixed(2)}）`,
      });
    } else {
      out.push({ tone: "neutral", title: "低効率", detail: "大きなボトルネックは未検出です" });
    }

    return out.slice(0, 4);
  }, [siteRows]);

  // サマリーテキスト生成
  const analyticsSummary = useMemo(() => {
    if (loading) return "データを読み込み中...";
    const topSite = siteRows[0];
    if (!topSite || topSite.applications === 0) {
      return "データがまだ十分ではありません。";
    }
    const siteName = SITE_LABEL[topSite.siteKey] ?? topSite.siteKey;
    return `${siteName}が応募数${topSite.applications}件でトップです。全体で${totals.applications}件の応募を獲得しています。`;
  }, [loading, siteRows, totals.applications]);

  // KPIカード用データ
  const heroKpiCards = useMemo(() => [
    { label: "掲載求人", value: totals.postedJobs, gradient: "from-slate-500 to-slate-600" },
    { label: "応募数", value: totals.applications, gradient: "from-indigo-500 to-purple-500" },
    { label: "媒体数", value: siteRows.length, gradient: "from-emerald-500 to-teal-500" },
    { label: "求人ヒット", value: jobRows.length, gradient: "from-amber-500 to-orange-500" },
  ], [totals, siteRows.length, jobRows.length]);

  if (!mounted) return <main className="cv-container py-8" />;

  return (
    <main className={cls("px-4 sm:px-6 lg:px-8", UI.PAGE_PAD, UI.PAGE_BG)}>
      {/* Page background (premium) */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />
        <div className="absolute -left-52 -top-72 h-[760px] w-[760px] rounded-full bg-blue-200/14 dark:bg-blue-500/5 blur-3xl" />
        <div className="absolute -right-64 -top-64 h-[820px] w-[820px] rounded-full bg-purple-200/12 dark:bg-purple-500/5 blur-3xl" />
        <div className="absolute left-1/2 top-24 h-64 w-[860px] -translate-x-1/2 rounded-full bg-indigo-200/10 dark:bg-indigo-500/5 blur-3xl" />
      </div>

      <HeroGradient
        title="Analytics"
        subtitle="媒体別の実力を、意思決定できる情報密度で"
        summaryText={analyticsSummary}
        kpiCards={loading ? undefined : heroKpiCards}
        timeSeriesData={loading ? undefined : timeSeriesData.data}
        right={
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={exportCSV}
              disabled={loading}
              className="group relative overflow-hidden rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-lg shadow-slate-200/50 dark:shadow-black/30 ring-1 ring-slate-200/50 dark:ring-white/10 hover:ring-indigo-300 dark:hover:ring-indigo-500/30 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              CSV
            </button>
            <Link
              href="/companies"
              className="group relative overflow-hidden rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-lg shadow-slate-200/50 dark:shadow-black/30 ring-1 ring-slate-200/50 dark:ring-white/10 hover:ring-indigo-300 dark:hover:ring-indigo-500/30 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
            >
              会社
            </Link>
            <Link
              href="/work-queue"
              className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-300/50 dark:shadow-indigo-900/50 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
            >
              Work Queue
            </Link>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          {/* Controls */}
          <div
            className={cls(UI.RADIUS, "border border-slate-200 dark:border-slate-700 bg-white/65 dark:bg-slate-800/65 backdrop-blur px-4 py-3", "shadow-[0_6px_18px_rgba(15,23,42,0.06)]")}
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">スコープ</div>

              <div className="flex items-center gap-2">
                <button type="button" className={chipClass(ym === "ALL")} onClick={() => setYm("ALL")}>
                  累計
                </button>
                <button type="button" className={chipClass(ym === currentYm())} onClick={() => setYm(currentYm())}>
                  今月
                </button>
                <button type="button" className={chipClass(ym === prevYm())} onClick={() => setYm(prevYm())}>
                  先月
                </button>
              </div>

              <div className="hidden h-5 w-px bg-slate-200 dark:bg-slate-700 sm:block" />

              <div className="flex items-center gap-2">
                <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">会社</div>
                <select
                  className={selectClass()}
                  style={{ borderColor: "var(--border)" }}
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  disabled={loading}
                >
                  <option value="ALL">全社</option>
                  {companyOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="ml-auto flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 px-3 py-1 text-xs text-slate-600 dark:text-slate-400 shadow-sm">
                  <span className="text-slate-500 dark:text-slate-400">表示</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{headerYmLabel}</span>
                  <span className="text-slate-300 dark:text-slate-600">/</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{headerCompanyLabel}</span>
                </div>

                {companyId !== "ALL" && (
                  <Link
                    href={`/companies/${companyId}/analytics`}
                    className={btnGhost()}
                  >
                    企業専用分析
                  </Link>
                )}

                <button
                  type="button"
                  className={btnGhost()}
                  onClick={() => {
                    setYm("ALL");
                    setCompanyId("ALL");
                  }}
                  disabled={loading}
                >
                  リセット
                </button>
              </div>
            </div>

            {loadError ? (
              <div className="mt-2 rounded-xl border border-rose-200 dark:border-rose-700 bg-rose-50 dark:bg-rose-900/30 px-3 py-2 text-[12px] text-rose-800 dark:text-rose-300">{loadError}</div>
            ) : null}
          </div>

          {/* Insights */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
            {(loading ? Array.from({ length: 4 }, () => null) : insights).map((it, idx) => (
              <div
                key={idx}
                className={cls(UI.RADIUS, "border bg-white/70 dark:bg-slate-800/70 backdrop-blur px-4 py-3", "shadow-[0_4px_16px_rgba(15,23,42,0.06)]")}
                style={{ borderColor: "var(--border)" }}
              >
                {loading ? (
                  <div className="animate-pulse">
                    <div className="h-6 w-24 rounded-full bg-slate-200/80 dark:bg-slate-700/80" />
                    <div className="mt-3 h-4 w-[92%] rounded bg-slate-200/80 dark:bg-slate-700/80" />
                    <div className="mt-2 h-4 w-[70%] rounded bg-slate-200/60 dark:bg-slate-700/60" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <TonePill tone={it!.tone} text={it!.title} />
                    </div>
                    <div className="mt-2 text-[13px] font-semibold text-slate-900 dark:text-slate-100 leading-snug">{it!.detail}</div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </HeroGradient>

      {/* Alerts */}
      {!loading && alerts.length > 0 && (
        <div className="mt-4">
          <div className={cls(UI.CARD_SOFT, "px-4 py-3")}>
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className={UI.SECTION_TITLE}>パフォーマンスアラート</div>
            </div>
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div key={alert.siteKey} className="flex items-center justify-between gap-4 rounded-lg border border-rose-200 dark:border-rose-700 bg-rose-50/50 dark:bg-rose-900/30 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <SiteBadge siteKey={alert.siteKey} />
                    <span className="text-[13px] text-slate-700 dark:text-slate-300">前月比</span>
                  </div>
                  <span className="text-[14px] font-bold text-rose-800 dark:text-rose-300 tabular-nums">{alert.change.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main grid */}
      <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-[1.35fr_0.65fr]">
        {/* Site Performance */}
        <section className={UI.TABLE_WRAP} style={{ borderColor: "var(--border)" }}>
          <div className="border-b px-5 py-4" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className={UI.SECTION_TITLE}>媒体別パフォーマンス</div>
                <div className={UI.SECTION_SUB}>応募・掲載・効率・直近28日のトレンド</div>
              </div>
              <div className="shrink-0 text-[11px] text-slate-500 tabular-nums">{loadedAt ? `更新: ${formatLocalDateTime(loadedAt)}` : loading ? "読込中…" : ""}</div>
            </div>
          </div>

          {loading ? (
            <div className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 w-52 rounded bg-slate-200/80 dark:bg-slate-700/80" />
                <div className="h-4 w-72 rounded bg-slate-200/60 dark:bg-slate-700/60" />
                <div className="h-4 w-64 rounded bg-slate-200/60 dark:bg-slate-700/60" />
              </div>
            </div>
          ) : siteRows.length === 0 ? (
            <div className="p-6 text-sm text-slate-600 dark:text-slate-400">データがありません。</div>
          ) : (
            <>
              <div className={cls(UI.TABLE_HEAD, "lg:grid-cols-[260px_120px_1fr_140px_170px]")} style={{ borderColor: "var(--border)" }}>
                <div>媒体</div>
                <div className="text-right">掲載</div>
                <div>応募</div>
                <div className="text-right">応募/掲載</div>
                <div>Trend (28d)</div>
              </div>

              <div className={UI.ROW_DIVIDER} style={{ borderColor: "var(--border)" }}>
                {siteRows.map((r) => {
                  const isTop = topSites.includes(r.siteKey);
                  const pct = maxApps <= 0 ? 0 : Math.round((r.applications / maxApps) * 100);
                  const pill = ratePill(r.applications, r.postedJobs);

                  return (
                    <div
                      key={r.siteKey}
                      className={cls(UI.ROW, isTop ? "bg-indigo-50/40 dark:bg-indigo-950/20" : "", "cursor-pointer")}
                      onClick={() => setSelectedSite(r.siteKey)}
                    >
                      <div className="grid grid-cols-1 gap-2 lg:grid-cols-[260px_120px_1fr_140px_170px] lg:items-center lg:gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <SiteBadge siteKey={r.siteKey} emphasize={isTop} />
                          {isTop ? <span className="rounded-full bg-indigo-600 dark:bg-indigo-500 px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm">TOP</span> : null}
                        </div>

                        <div className="text-right text-[13px] text-slate-700 dark:text-slate-300 tabular-nums">{r.postedJobs}</div>

                        <div className="flex items-center gap-3">
                          <div className="w-full max-w-[520px]">
                            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700">
                              <div className="h-2 rounded-full bg-slate-900 dark:bg-slate-300" style={{ width: `${clamp(pct, 0, 100)}%` }} aria-label={`応募数 ${r.applications}`} />
                            </div>
                          </div>
                          <div className="w-12 text-right text-[13px] font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{r.applications}</div>
                        </div>

                        <div className="text-right">
                          {pill.label === "-" ? (
                            <span className={pill.cls} title={pill.title}>
                              -
                            </span>
                          ) : (
                            <span className={cls("inline-flex items-center rounded-full px-2 py-1 text-xs", pill.cls)} title={pill.title}>
                              {pill.label}
                            </span>
                          )}
                        </div>

                        <div className="flex justify-start lg:justify-end">
                          <Sparkline data={r.spark} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>

        {/* Right rail: Job ranking */}
        <section className={UI.TABLE_WRAP} style={{ borderColor: "var(--border)" }}>
          <div className="border-b px-5 py-4" style={{ borderColor: "var(--border)" }}>
            <div className={UI.SECTION_TITLE}>求人別 応募ランキング</div>
            <div className={UI.SECTION_SUB}>上位20件</div>
          </div>

          {loading ? (
            <div className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 w-48 rounded bg-slate-200/80 dark:bg-slate-700/80" />
                <div className="h-4 w-64 rounded bg-slate-200/60 dark:bg-slate-700/60" />
                <div className="h-4 w-56 rounded bg-slate-200/60 dark:bg-slate-700/60" />
              </div>
            </div>
          ) : jobRows.length === 0 ? (
            <div className="p-6 text-sm text-slate-600 dark:text-slate-400">データがありません。</div>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {jobRows.slice(0, 20).map((r) => (
                <div key={r.jobId} className="px-5 py-3 hover:bg-slate-50/70 dark:hover:bg-slate-700/50 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[12px] text-slate-600 dark:text-slate-400 truncate">{r.companyName}</div>
                      <div className="mt-0.5 text-[13px] font-semibold text-slate-900 dark:text-slate-100 truncate">{r.jobTitle}</div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-[11px] font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                          応募 {r.applications}
                        </span>
                        {r.topSiteKey ? <SiteBadge siteKey={r.topSiteKey} /> : null}
                      </div>
                    </div>

                    <div className="shrink-0 flex flex-col items-end gap-2">
                      {companyId !== "ALL" ? (
                        <>
                          <Link className={btnGhost()} href={`/companies/${companyId}/jobs/${r.jobId}`}>
                            求人
                          </Link>
                          <Link className={btnGhost()} href={`/companies/${companyId}/jobs/${r.jobId}/data`}>
                            データ
                          </Link>
                        </>
                      ) : (
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">会社選択でリンク</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Minimal footer (no "説明文"ノイズ) */}
      <div className="mt-4 flex flex-wrap items-center justify-end gap-2 text-[11px] text-slate-500">
        {loadedAt ? (
          <span className="inline-flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
            Updated {formatLocalDateTime(loadedAt)}
          </span>
        ) : null}
      </div>

      {/* 詳細モーダル */}
      {selectedSite && (
        <SiteDetailModal
          siteKey={selectedSite}
          row={siteRows.find((r) => r.siteKey === selectedSite) ?? null}
          timeSeriesData={timeSeriesData}
          onClose={() => setSelectedSite(null)}
        />
      )}
    </main>
  );
}
