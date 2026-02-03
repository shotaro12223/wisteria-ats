"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";

import type { Company, Job } from "@/lib/types";
import { JobsTable } from "@/components/JobsTable";
import CompanyApplicantEmails from "@/components/CompanyApplicantEmails";
import DatePicker from "@/components/DatePicker";



type LoadState = "loading" | "ready" | "error";

type CompanyRow = {
  id: string;
  company_name: string;
  company_profile?: any; // legacy
  created_at: string;
  updated_at: string;
};

type CompanyGetRes =
  | { ok: true; company: CompanyRow | null }
  | { ok: false; error: { message: string } };

type JobsGetRes =
  | {
      ok: true;
      jobs: Array<{
        id: string;
        company_id: string | null;
        company_name: string | null;
        job_title: string | null;
        employment_type: string | null;
        site_status: any;
        created_at: string;
        updated_at: string;
      }>;
    }
  | { ok: false; error: { message: string } };

type RecordRow = {
  company_id: string;
  status: string; // active/risk/paused/inactive
  owner_user_id: string | null;
  tags: string[];
  memo: string | null;
  profile: any; // deal_stage など
  created_at: string;
  updated_at: string;
};

type RecordGetRes =
  | { ok: true; record: RecordRow }
  | { ok: false; error: { message: string } };

// /api/gmail/inbox の item 形（必要部分だけ）
type InboxItem = {
  id: string;
  companyId: string | null;
  companyName: string | null;
  jobId: string | null;
  siteKey: string; // Indeed / Engage / AirWork など
  subject: string;
  receivedAt: string;
  status: string; // new/registered/ng/interview/offer 等
};

type InboxPageInfo = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
};

type InboxGetRes =
  | { ok: true; items: InboxItem[]; page: InboxPageInfo }
  | { ok: false; error: string };



function s(v: any) {
  return String(v ?? "").trim();
}

function lower(v: any) {
  return s(v).toLowerCase();
}

function safeObj(x: any) {
  return x && typeof x === "object" ? x : {};
}

function formatLocalDateTimeShort(iso: string) {
  const x = s(iso);
  if (!x) return "—";
  try {
    const d = new Date(x);
    if (!Number.isFinite(d.getTime())) return x;
    const pad = (n: number) => String(n).padStart(2, "0");
    const y = d.getFullYear();
    const m = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());
    return `${y}/${m}/${day} ${hh}:${mm}`;
  } catch {
    return x;
  }
}

function daysSince(iso: string | null | undefined): number | null {
  const x = s(iso);
  if (!x) return null;
  const t = new Date(x).getTime();
  if (!Number.isFinite(t)) return null;
  const now = Date.now();
  const diff = Math.max(0, now - t);
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * ✅ 「応募メールとして扱うか」
 * - subject だけで Re/Fw/返信/転送 を除外
 */
function isReplyLikeSubject(subject: any): boolean {
  const t = String(subject ?? "").trim();
  const stripped = t.replace(/^\s*(\[[^\]]+\]\s*)+/g, "");
  return /(^|\s)(re|fw|fwd)\s*[:：]/i.test(stripped) || /(^|\s)(返信|転送)\s*[:：]/.test(stripped);
}

function isApplicationMail(it: { subject: any }) {
  return !isReplyLikeSubject(it.subject);
}

function normalizeInboxStatus(raw: any): "new" | "registered" | "ng" | "interview" | "offer" | "other" {
  const x = lower(raw);
  if (x === "new") return "new";
  if (x === "registered") return "registered";
  if (x === "ng") return "ng";
  if (x === "interview") return "interview";
  if (x === "offer") return "offer";
  return "other";
}

function rowToCompanyFromRecord(companyRow: CompanyRow, recordRow: RecordRow): Company {
  const profile = safeObj(recordRow.profile);
  return {
    id: companyRow.id,
    companyName: companyRow.company_name,
    ...profile,
    createdAt: recordRow.created_at ?? companyRow.created_at,
    updatedAt: recordRow.updated_at ?? companyRow.updated_at,
  } as any;
}



const UI = {
  PANEL: ["rounded-md", "border-2", "border-slate-200/80", "dark:border-slate-700", "bg-white", "dark:bg-slate-800", "shadow-sm"].join(" "),
  PANEL_HDR: ["flex items-start justify-between gap-3", "border-b-2", "border-slate-200/80", "dark:border-slate-700", "px-4 py-3"].join(" "),
  PANEL_TITLE: "text-[12px] font-semibold tracking-wide text-slate-900 dark:text-slate-100",
  LINK: "text-[12px] font-semibold text-indigo-700/95 dark:text-indigo-400 whitespace-nowrap hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline",
  BADGE:
    "inline-flex items-center rounded-full border border-slate-200 dark:border-slate-700 bg-white/75 dark:bg-slate-700/75 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300",
  PAGE_BG: "relative",
} as const;



function statusTone(status: string) {
  const x = lower(status);
  if (x === "inactive") return "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600";
  if (x === "paused") return "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600";
  if (x === "risk") return "bg-rose-50 dark:bg-rose-900/30 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-700";
  if (x === "active") return "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700";
  return "bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-700";
}

function statusLabel(status: string) {
  const x = lower(status);
  if (x === "active") return "稼働";
  if (x === "risk") return "要注意";
  if (x === "paused") return "停止";
  if (x === "inactive") return "非稼働";
  return status || "—";
}

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold",
        statusTone(status),
      ].join(" ")}
      title={status}
    >
      {statusLabel(status)}
    </span>
  );
}

function StagePill({ stage }: { stage: string }) {
  const st = s(stage) || "—";
  const key = st === "—" ? "other" : st;

  const tone =
    key === "契約中"
      ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700"
      : key === "稟議中" || key === "提案中"
        ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700"
        : key === "契約前"
          ? "bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-700"
          : key === "休眠" || key === "解約"
            ? "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600"
            : key === "NG"
              ? "bg-rose-50 dark:bg-rose-900/30 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-700"
              : "bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600";

  return (
    <span
      className={["inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold", tone].join(" ")}
      title={st}
    >
      {st}
    </span>
  );
}



function CompactKpi({
  title,
  value,
  tone = "base",
  valueClassName,
}: {
  title: string;
  value: string | number;
  tone?: "base" | "warn" | "danger";
  valueClassName?: string;
}) {
  const cls =
    tone === "danger"
      ? "border-rose-200/70 dark:border-rose-700/70 bg-rose-50/55 dark:bg-rose-900/20"
      : tone === "warn"
        ? "border-amber-200/70 dark:border-amber-700/70 bg-amber-50/55 dark:bg-amber-900/20"
        : "border-slate-200/70 dark:border-slate-700/70 bg-white/65 dark:bg-slate-800/65";

  return (
    <div className={["rounded-md border px-3 py-2", cls].join(" ")}>
      <div className="text-[10px] font-semibold tracking-wide text-slate-600 dark:text-slate-400">{title}</div>
      <div
        className={[
          "mt-0.5 font-bold leading-none text-slate-900 dark:text-slate-100 tabular-nums tracking-tight",
          valueClassName ?? "text-[15px]",
        ].join(" ")}
        title={typeof value === "string" ? value : undefined}
      >
        {value}
      </div>
    </div>
  );
}

function CompaniesHero({
  companyName,
  status,
  stage,
  updatedAt,
  jobsCount,
  jobsStaleDays,
  onReload,
  companyId,
  onWorkQueueAdd,
}: {
  companyName: string;
  status: string;
  stage: string;
  updatedAt: string;
  jobsCount: number;
  jobsStaleDays: number | null;
  onReload: () => void;
  companyId: string;
  onWorkQueueAdd?: () => void;
}) {
  const heroRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const pxRef = useRef(0);
  const pyRef = useRef(0);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      el.style.setProperty("--px", "0px");
      el.style.setProperty("--py", "0px");
      return;
    }

    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      const dx = (e.clientX - cx) / Math.max(1, rect.width / 2);
      const dy = (e.clientY - cy) / Math.max(1, rect.height / 2);

      const tx = Math.max(-1, Math.min(1, dx)) * 6;
      const ty = Math.max(-1, Math.min(1, dy)) * 4;

      pxRef.current = tx;
      pyRef.current = ty;

      if (rafRef.current == null) {
        rafRef.current = window.requestAnimationFrame(() => {
          rafRef.current = null;
          el.style.setProperty("--px", `${pxRef.current.toFixed(2)}px`);
          el.style.setProperty("--py", `${pyRef.current.toFixed(2)}px`);
        });
      }
    };

    const onLeave = () => {
      pxRef.current = 0;
      pyRef.current = 0;
      el.style.setProperty("--px", "0px");
      el.style.setProperty("--py", "0px");
    };

    el.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerleave", onLeave, { passive: true });

    return () => {
      el.removeEventListener("pointermove", onMove as any);
      el.removeEventListener("pointerleave", onLeave as any);
      if (rafRef.current != null) window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, []);

  const updDays = daysSince(updatedAt);
  const danger = lower(status) === "risk" || lower(status) === "inactive";
  const warn = lower(status) === "paused" || (updDays != null && updDays >= 14);

  const recordHref = `/companies/${encodeURIComponent(companyId)}/record`;
  const jobsNewHref = `/companies/${encodeURIComponent(companyId)}/jobs/new`;

  return (
    <div ref={heroRef} className={[UI.PANEL, "relative overflow-hidden"].join(" ")}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/55 via-white to-purple-50/55 dark:from-blue-950/30 dark:via-slate-900 dark:to-purple-950/30" />
        <div className="hero-parallax absolute -inset-24">
          <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-blue-200/16 dark:bg-blue-500/10 blur-3xl" />
          <div className="absolute -right-44 -bottom-44 h-[560px] w-[560px] rounded-full bg-purple-200/14 dark:bg-purple-500/10 blur-3xl" />
          <div className="absolute left-1/2 top-[-180px] h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-indigo-200/12 dark:bg-indigo-500/10 blur-3xl" />
          <div
            className="absolute inset-24 opacity-[0.08] dark:opacity-[0.15]"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(15,23,42,0.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.22) 1px, transparent 1px)",
              backgroundSize: "44px 44px",
              maskImage:
                "radial-gradient(ellipse at 45% 12%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0) 78%)",
              WebkitMaskImage:
                "radial-gradient(ellipse at 45% 12%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0) 78%)",
            }}
          />
        </div>
      </div>

      <div className={[UI.PANEL_HDR, "relative"].join(" ")}>
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[12px] text-slate-600 dark:text-slate-400">
            <Link href="/companies" className={UI.LINK}>
              会社一覧
            </Link>
            <span className="text-slate-300 dark:text-slate-600">/</span>
            <span className="truncate font-semibold text-slate-900 dark:text-slate-100">{companyName || "企業概要"}</span>
            <span className="ml-2" />
            <StatusPill status={status || "active"} />
            <StagePill stage={stage} />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            className={[
              "inline-flex items-center justify-center",
              "rounded-md border-2 border-slate-200/80 dark:border-slate-700",
              "bg-white/70 dark:bg-slate-800/70 backdrop-blur",
              "px-3 py-1.5",
              "text-[12px] font-semibold",
              "text-slate-800 dark:text-slate-200",
              "shadow-sm",
              "hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 hover:shadow-md",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40",
              "whitespace-nowrap",
            ].join(" ")}
            onClick={onReload}
          >
            再読み込み
          </button>

          <Link
            href={`/companies/${encodeURIComponent(companyId)}/analytics`}
            className={[
              "inline-flex items-center justify-center",
              "rounded-md border-2 border-slate-200/80 dark:border-slate-700",
              "bg-white/90 dark:bg-slate-800/90 backdrop-blur",
              "px-3 py-1.5",
              "text-[12px] font-semibold",
              "text-slate-800 dark:text-slate-200",
              "shadow-sm",
              "hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 hover:shadow-md",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40",
              "whitespace-nowrap",
            ].join(" ")}
          >
            分析
          </Link>

          <Link
            href={recordHref}
            className={[
              "inline-flex items-center justify-center",
              "rounded-md border-2 border-slate-200/80 dark:border-slate-700",
              "bg-white/90 dark:bg-slate-800/90 backdrop-blur",
              "px-3 py-1.5",
              "text-[12px] font-semibold",
              "text-slate-800 dark:text-slate-200",
              "shadow-sm",
              "hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 hover:shadow-md",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40",
              "whitespace-nowrap",
            ].join(" ")}
          >
            企業詳細
          </Link>

          <Link
            href={`/client/companies/${encodeURIComponent(companyId)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={[
              "inline-flex items-center justify-center",
              "rounded-md border-2 border-blue-200/80 dark:border-blue-700",
              "bg-blue-50/90 dark:bg-blue-900/40 backdrop-blur",
              "px-3 py-1.5",
              "text-[12px] font-semibold",
              "text-blue-700 dark:text-blue-300",
              "shadow-sm",
              "hover:bg-blue-100 dark:hover:bg-blue-900/60 hover:text-blue-800 dark:hover:text-blue-200 hover:shadow-md",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/40",
              "whitespace-nowrap",
            ].join(" ")}
          >
            👁️ クライアントページ
          </Link>

          <Link
            href={`/companies/${encodeURIComponent(companyId)}/deal`}
            className={[
              "inline-flex items-center justify-center",
              "rounded-md border-2 border-emerald-200/80 dark:border-emerald-700",
              "bg-emerald-50/90 dark:bg-emerald-900/40 backdrop-blur",
              "px-3 py-1.5",
              "text-[12px] font-semibold",
              "text-emerald-700 dark:text-emerald-300",
              "shadow-sm",
              "hover:bg-emerald-100 dark:hover:bg-emerald-900/60 hover:text-emerald-800 dark:hover:text-emerald-200 hover:shadow-md",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40",
              "whitespace-nowrap",
            ].join(" ")}
          >
            打ち合わせ
          </Link>

          <Link href={jobsNewHref} className="cv-btn-primary whitespace-nowrap">
            求人追加
          </Link>

          {onWorkQueueAdd && (
            <button
              type="button"
              onClick={onWorkQueueAdd}
              className={[
                "inline-flex items-center justify-center",
                "rounded-md border-2 border-indigo-200/80 dark:border-indigo-700",
                "bg-indigo-50/90 dark:bg-indigo-900/40 backdrop-blur",
                "px-3 py-1.5",
                "text-[12px] font-semibold",
                "text-indigo-700 dark:text-indigo-300",
                "shadow-sm",
                "hover:bg-indigo-100 dark:hover:bg-indigo-900/60 hover:text-indigo-800 dark:hover:text-indigo-200 hover:shadow-md",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40",
                "whitespace-nowrap",
              ].join(" ")}
            >
              📋 Work Queue
            </button>
          )}
        </div>
      </div>

      <div className="relative px-4 py-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
          <CompactKpi title="稼働" value={statusLabel(status)} tone={danger ? "danger" : "base"} />
          <CompactKpi title="ステージ" value={s(stage) || "—"} valueClassName="text-[13px] leading-tight truncate" />
          <CompactKpi
            title="更新"
            value={updatedAt ? formatLocalDateTimeShort(updatedAt) : "—"}
            tone={warn ? "warn" : "base"}
            valueClassName="text-[12px] leading-tight truncate"
          />
          <CompactKpi
            title="経過"
            value={updDays == null ? "—" : `${updDays}日`}
            tone={updDays != null && updDays >= 14 ? "warn" : "base"}
          />
          <CompactKpi title="求人" value={jobsCount} tone={jobsCount === 0 ? "danger" : "base"} />
          <CompactKpi
            title="求人経過"
            value={jobsStaleDays == null ? "—" : `${jobsStaleDays}日`}
            tone={jobsStaleDays != null && jobsStaleDays >= 14 ? "warn" : "base"}
          />
        </div>
      </div>

      <style jsx>{`
        .hero-parallax {
          transform: translate3d(var(--px, 0px), var(--py, 0px), 0);
          transition: transform 140ms ease-out;
          will-change: transform;
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-parallax {
            transition: none !important;
            transform: translate3d(0, 0, 0) !important;
          }
        }
      `}</style>
    </div>
  );
}



function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 px-2.5 py-1 text-[11px] font-semibold text-slate-800 dark:text-slate-200">
      <span className="text-slate-600 dark:text-slate-400">{label}</span>
      <span className="tabular-nums font-bold tracking-tight">{value}</span>
    </span>
  );
}

function chipToggle(active: boolean) {
  return active
    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600 shadow-sm"
    : "bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100";
}



type DonutPart = {
  label: string;
  value: number;
  gradId: string;
  gradFrom: string;
  gradTo: string;
};

function DonutSvg({
  parts,
  centerTop,
  centerBottom,
  subline,
}: {
  parts: DonutPart[];
  centerTop: string;
  centerBottom: string;
  subline?: string;
}) {
  const total = Math.max(
    0,
    parts.reduce((a, b) => a + Math.max(0, b.value), 0),
  );

  const size = 132;
  const cx = size / 2;
  const cy = size / 2;
  const r = 48;
  const strokeW = 14;
  const c = 2 * Math.PI * r;

  const segs = (() => {
    if (total <= 0) return [];
    let acc = 0;
    return parts
      .map((p) => {
        const v = Math.max(0, p.value);
        const frac = total > 0 ? v / total : 0;
        const len = frac * c;
        const startFrac = acc / total;
        acc += v;
        return {
          ...p,
          len,
          startFrac,
        };
      })
      .filter((x) => x.len > 0);
  })();

  const muted = total <= 0;

  return (
    <div className="relative h-[132px] w-[132px] shrink-0">
      <div className="absolute inset-0 rounded-full bg-white/65 dark:bg-slate-800/65 backdrop-blur-[1.5px]" />
      <div
        className="absolute inset-0 rounded-full"
        style={{
          boxShadow: "0 10px 22px rgba(15,23,42,0.06), inset 0 0 0 1px rgba(15,23,42,0.06)",
        }}
      />

      <svg
        className="absolute inset-0"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label="応募内訳"
      >
        <defs>
          {parts.map((p) => (
            <linearGradient key={p.gradId} id={p.gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={p.gradFrom} stopOpacity={0.95} />
              <stop offset="100%" stopColor={p.gradTo} stopOpacity={0.78} />
            </linearGradient>
          ))}

          <filter id="donutGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="1.4" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="
                1 0 0 0 0
                0 1 0 0 0
                0 0 1 0 0
                0 0 0 0.22 0"
              result="soft"
            />
            <feMerge>
              <feMergeNode in="soft" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(226,232,240,1)" strokeWidth={strokeW} className="dark:stroke-slate-700" />

        {muted ? (
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="rgba(148,163,184,0.55)"
            strokeWidth={strokeW}
            strokeLinecap="round"
            filter="url(#donutGlow)"
            strokeDasharray={`${c * 0.12} ${c}`}
            strokeDashoffset={c * 0.05}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        ) : (
          segs.map((p) => {
            const dashArray = `${p.len} ${Math.max(0, c - p.len)}`;
            const dashOffset = -p.startFrac * c;
            return (
              <circle
                key={p.gradId}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={`url(#${p.gradId})`}
                strokeWidth={strokeW}
                strokeLinecap="butt"
                filter="url(#donutGlow)"
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
                transform={`rotate(-90 ${cx} ${cy})`}
              />
            );
          })
        )}

        <circle cx={cx} cy={cy} r={r - strokeW / 2 - 6} fill="white" opacity={0.96} className="dark:fill-slate-800" />
        <circle cx={cx} cy={cy} r={r - strokeW / 2 - 6} fill="none" stroke="rgba(15,23,42,0.06)" strokeWidth={1} className="dark:stroke-slate-700" />
      </svg>

      <div className="absolute inset-0 grid place-items-center text-center">
        <div className="px-2">
          <div className="text-[10px] font-semibold tracking-wide text-slate-600 dark:text-slate-400">{centerTop}</div>
          <div className="mt-0.5 text-[20px] font-bold leading-none text-slate-900 dark:text-slate-100 tabular-nums tracking-tight">
            {centerBottom}
          </div>
          {subline ? <div className="mt-1 text-[10px] font-semibold text-slate-600 dark:text-slate-400">{subline}</div> : null}
        </div>
      </div>
    </div>
  );
}



const MEDIA_ORDER = [
  "Indeed",
  "Engage",
  "AirWork",
  "げんきワーク",
  "ジモティー",
  "はたらきんぐ",
  "ハローワーク",
  "求人BOX",
  "採用係長",
  "その他",
] as const;

type MediaLabel = (typeof MEDIA_ORDER)[number];

function normalizeMedia(siteKey: any): MediaLabel {
  const raw = s(siteKey);
  const l = lower(raw);

  if (!raw) return "その他";

  if (l === "indeed") return "Indeed";
  if (l === "engage") return "Engage";
  if (l === "airwork" || l === "air_work" || l === "air work") return "AirWork";

  if (raw.includes("げんき") || l.includes("genki")) return "げんきワーク";
  if (raw.includes("ジモティ") || l.includes("jmty") || l.includes("jimoty")) return "ジモティー";
  if (raw.includes("はたらきんぐ") || l.includes("hataraking")) return "はたらきんぐ";
  if (raw.includes("ハローワーク") || l.includes("hellowork") || l.includes("hello-work")) return "ハローワーク";
  if (raw.includes("求人box") || raw.includes("求人BOX") || l.includes("kyujinbox") || l.includes("jobbox")) return "求人BOX";
  if (raw.includes("採用係長") || l.includes("saiyou") || l.includes("keicho")) return "採用係長";

  if (raw.toLowerCase().includes("indeed")) return "Indeed";
  if (raw.toLowerCase().includes("engage")) return "Engage";
  if (raw.toLowerCase().includes("airwork")) return "AirWork";

  return "その他";
}



function DealsSummaryCard({ companyId }: { companyId: string }) {
  const [loading, setLoading] = useState(false);
  const [deals, setDeals] = useState<Array<{ id: string; kind: string; title: string; stage: string }>>([]);

  useEffect(() => {
    if (!companyId) return;

    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/deals?companyId=${encodeURIComponent(companyId)}&limit=3`, { cache: "no-store" });
        const json = await res.json();
        if (!alive) return;
        if (res.ok && json.ok && Array.isArray(json.items)) {
          setDeals(json.items);
        }
      } catch {
        // silent
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [companyId]);

  const dealsListHref = `/deals`;

  return (
    <section className={[UI.PANEL, "relative overflow-hidden flex flex-col min-h-0"].join(" ")}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/55 via-white to-blue-50/55 dark:from-indigo-950/30 dark:via-slate-900 dark:to-blue-950/30" />
        <div className="absolute inset-0 backdrop-blur-[1.5px]" />
        <div className="absolute -left-28 -top-28 h-[360px] w-[360px] rounded-full bg-indigo-200/12 dark:bg-indigo-500/10 blur-3xl" />
        <div className="absolute -right-28 -bottom-28 h-[360px] w-[360px] rounded-full bg-blue-200/10 dark:bg-blue-500/10 blur-3xl" />
      </div>

      <div className={[UI.PANEL_HDR, "relative"].join(" ")}>
        <div className="flex items-center gap-2">
          <div className={UI.PANEL_TITLE}>商談・契約管理</div>
          {loading ? (
            <span className={UI.BADGE}>読込中</span>
          ) : deals.length > 0 ? (
            <span className={UI.BADGE}>{deals.length}件</span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <Link href={dealsListHref} className="cv-btn-primary !px-3 !py-1.5 text-[12px] whitespace-nowrap">
            商談一覧へ
          </Link>
        </div>
      </div>

      <div className="relative px-4 py-3 flex-1 min-h-0 overflow-auto">
        {loading ? (
          <div className="text-[12px] text-slate-600 dark:text-slate-400">読み込み中...</div>
        ) : deals.length === 0 ? (
          <div className="rounded-md border border-slate-200/80 dark:border-slate-700/80 bg-white/70 dark:bg-slate-800/70 px-3 py-2">
            <div className="text-[12px] text-slate-700 dark:text-slate-300">この会社の商談はまだありません。</div>
            <div className="mt-2">
              <Link href={dealsListHref} className="text-[12px] font-semibold text-indigo-700 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline">
                商談一覧ページで新規作成 →
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {deals.map((d) => {
              const isExisting = d.kind === "existing";
              const dealHref = isExisting
                ? `/deals/${encodeURIComponent(d.id)}`
                : `/deals/${encodeURIComponent(d.id)}?view=meeting`;

              return (
                <Link
                  key={d.id}
                  href={dealHref}
                  className="block rounded-lg border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-800/80 px-3 py-2.5 transition-all hover:bg-white dark:hover:bg-slate-800 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100 truncate">{d.title || "(タイトルなし)"}</div>
                      <div className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-400">{d.stage || "—"}</div>
                    </div>
                    <div className="shrink-0">
                      <span
                        className={[
                          "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                          isExisting ? "border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300" : "border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300",
                        ].join(" ")}
                      >
                        {isExisting ? "既存" : "新規"}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}

            {deals.length >= 3 ? (
              <div className="pt-2">
                <Link
                  href={dealsListHref}
                  className="block text-center text-[12px] font-semibold text-indigo-700 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline"
                >
                  すべての商談を見る →
                </Link>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}



function pct(n: number, d: number) {
  if (!Number.isFinite(n) || !Number.isFinite(d) || d <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((n / d) * 100)));
}

function FunnelBar({
  label,
  value,
  max,
  tone,
  right,
}: {
  label: string;
  value: number;
  max: number;
  tone: "new" | "reg" | "interview" | "offer" | "ng" | "other";
  right?: string;
}) {
  const widthPct = max > 0 ? Math.round((Math.max(0, value) / max) * 100) : 0;

  const grad =
    tone === "new"
      ? "linear-gradient(to right, rgba(99,102,241,0.82), rgba(59,130,246,0.78))"
      : tone === "reg"
        ? "linear-gradient(to right, rgba(139,92,246,0.82), rgba(99,102,241,0.78))"
        : tone === "interview"
          ? "linear-gradient(to right, rgba(16,185,129,0.82), rgba(52,211,153,0.72))"
          : tone === "offer"
            ? "linear-gradient(to right, rgba(245,158,11,0.86), rgba(251,191,36,0.72))"
            : tone === "ng"
              ? "linear-gradient(to right, rgba(244,63,94,0.86), rgba(251,113,133,0.72))"
              : "linear-gradient(to right, rgba(148,163,184,0.82), rgba(203,213,225,0.72))";

  const glow =
    tone === "ng"
      ? "0 0 0 1px rgba(244,63,94,0.10), 0 10px 18px rgba(244,63,94,0.08)"
      : "0 0 0 1px rgba(99,102,241,0.08), 0 10px 18px rgba(15,23,42,0.05)";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 truncate text-[12px] font-semibold text-slate-800 dark:text-slate-200">{label}</div>
        <div className="shrink-0 text-[12px] font-bold text-slate-900 dark:text-slate-100 tabular-nums tracking-tight">
          {value}
          {right ? <span className="ml-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">{right}</span> : null}
        </div>
      </div>

      <div className="h-2.5 w-full rounded-full bg-slate-200/70 dark:bg-slate-700/70">
        <div
          className="h-2.5 rounded-full"
          style={{
            width: `${widthPct}%`,
            background: grad,
            boxShadow: glow,
            filter: "saturate(1.03)",
            transition: "filter 120ms ease-out",
          }}
        />
      </div>
    </div>
  );
}

function FunnelCard({
  overall,
  inboxLoading,
  inboxErr,
}: {
  overall: {
    total: number;
    newCnt: number;
    regCnt: number;
    ngCnt: number;
    interviewCnt: number;
    offerCnt: number;
    otherCnt: number;
    last7: number;
    lastReceivedAt: string;
  };
  inboxLoading: boolean;
  inboxErr: string;
}) {
  const nNew = Math.max(0, overall.newCnt);
  const nReg = Math.max(0, overall.regCnt);
  const nInt = Math.max(0, overall.interviewCnt);
  const nOff = Math.max(0, overall.offerCnt);
  const nNg = Math.max(0, overall.ngCnt);
  const nOther = Math.max(0, overall.otherCnt);

  const max = Math.max(1, nNew, nReg, nInt, nOff, nNg, nOther);

  const rNewToReg = pct(nReg, nNew);
  const rRegToInt = pct(nInt, nReg);
  const rIntToOff = pct(nOff, nInt);

  const rNewToInt = pct(nInt, nNew);
  const rNewToOff = pct(nOff, nNew);

  const hasAny = overall.total > 0;

  return (
    <section className={[UI.PANEL, "relative overflow-hidden flex flex-col min-h-0"].join(" ")}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/55 via-white to-blue-50/55 dark:from-indigo-950/30 dark:via-slate-900 dark:to-blue-950/30" />
        <div className="absolute inset-0 backdrop-blur-[1.5px]" />
        <div className="absolute -left-28 -top-28 h-[360px] w-[360px] rounded-full bg-indigo-200/12 dark:bg-indigo-500/10 blur-3xl" />
        <div className="absolute -right-28 -bottom-28 h-[360px] w-[360px] rounded-full bg-blue-200/10 dark:bg-blue-500/10 blur-3xl" />
      </div>

      <div className={[UI.PANEL_HDR, "relative"].join(" ")}>
        <div className="flex items-center gap-2">
          <div className={UI.PANEL_TITLE}>ファネル</div>
          {inboxLoading ? <span className={UI.BADGE}>集計中</span> : null}
          {inboxErr ? (
            <span className="inline-flex items-center rounded-full border border-rose-200 dark:border-rose-700 bg-rose-50 dark:bg-rose-900/30 px-2 py-1 text-[11px] font-semibold text-rose-800 dark:text-rose-300">
              エラー
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <span className={UI.BADGE}>
            累計 <span className="ml-1 tabular-nums font-bold tracking-tight">{overall.total}</span>
          </span>
        </div>
      </div>

      <div className="relative px-4 py-3 flex-1 min-h-0 overflow-auto">
        {!hasAny ? (
          <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 px-3 py-2 text-[12px] text-slate-700 dark:text-slate-300">—</div>
        ) : (
          <div className="space-y-3">
            <FunnelBar label="New" value={nNew} max={max} tone="new" right={nNew > 0 ? `→連携 ${rNewToReg}%` : ""} />
            <FunnelBar label="連携" value={nReg} max={max} tone="reg" right={nReg > 0 ? `→面接 ${rRegToInt}%` : ""} />
            <FunnelBar label="面接" value={nInt} max={max} tone="interview" right={nInt > 0 ? `→内定 ${rIntToOff}%` : ""} />
            <FunnelBar label="内定" value={nOff} max={max} tone="offer" right={nNew > 0 ? `New→内定 ${rNewToOff}%` : ""} />

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="rounded-md border border-slate-200/80 dark:border-slate-700/80 bg-white/70 dark:bg-slate-800/70 px-3 py-2">
                <div className="text-[10px] font-semibold tracking-wide text-slate-600 dark:text-slate-400">New→面接</div>
                <div className="mt-0.5 text-[16px] font-bold text-slate-900 dark:text-slate-100 tabular-nums tracking-tight">
                  {nNew > 0 ? `${rNewToInt}%` : "—"}
                </div>
              </div>
              <div className="rounded-md border border-slate-200/80 dark:border-slate-700/80 bg-white/70 dark:bg-slate-800/70 px-3 py-2">
                <div className="text-[10px] font-semibold tracking-wide text-slate-600 dark:text-slate-400">New→内定</div>
                <div className="mt-0.5 text-[16px] font-bold text-slate-900 dark:text-slate-100 tabular-nums tracking-tight">
                  {nNew > 0 ? `${rNewToOff}%` : "—"}
                </div>
              </div>
            </div>

            <div className="pt-1">
              <FunnelBar label="NG" value={nNg} max={max} tone="ng" />
              <div className="mt-2">
                <FunnelBar label="他" value={nOther} max={max} tone="other" />
              </div>
            </div>

            <div className="mt-2 rounded-md border border-slate-200/80 dark:border-slate-700/80 bg-white/70 dark:bg-slate-800/70 px-3 py-2">
              <div className="text-[11px] font-semibold tracking-wide text-slate-700 dark:text-slate-300">補足</div>
              <div className="mt-1 text-[12px] text-slate-600 dark:text-slate-400 leading-relaxed">
                率は「現在のステータス内訳」から算出（遷移ログではありません）。詰まり（New→連携、連携→面接等）の把握用です。
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className={UI.BADGE}>
                  直近7日 <span className="ml-1 tabular-nums font-bold tracking-tight">{overall.last7}</span>
                </span>
                <span className={UI.BADGE}>
                  最終{" "}
                  <span className="ml-1 tabular-nums font-bold tracking-tight">
                    {overall.lastReceivedAt ? formatLocalDateTimeShort(overall.lastReceivedAt) : "—"}
                  </span>
                </span>
              </div>
            </div>
          </div>
        )}

        {inboxErr ? (
          <div className="mt-3 rounded-md border border-rose-200 dark:border-rose-700 bg-rose-50 dark:bg-rose-900/30 px-3 py-2 text-[12px] font-semibold text-rose-800 dark:text-rose-300">
            {inboxErr}
          </div>
        ) : null}
      </div>
    </section>
  );
}



export default function CompanyMyPage() {
  const params = useParams();

  const companyId = useMemo(() => {
    const raw = (params as any)?.companyId;
    if (raw === undefined || raw === null) return "";
    return String(raw);
  }, [params]);

  const [state, setState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const [companyRow, setCompanyRow] = useState<CompanyRow | null>(null);
  const [recordRow, setRecordRow] = useState<RecordRow | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [notFound, setNotFound] = useState(false);

  // inbox
  const [inboxLoading, setInboxLoading] = useState(false);
  const [inboxErr, setInboxErr] = useState("");
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([]);

  // UI toggles
  const [jobsMode, setJobsMode] = useState<"summary" | "edit">("summary");
  const [emailsOpen, setEmailsOpen] = useState(true);
  const [showWorkQueueDialog, setShowWorkQueueDialog] = useState(false);

  async function loadCompanyAndJobs(cid: string) {
    setState("loading");
    setErrorMessage("");

    try {
      const cRes = await fetch(`/api/companies/${encodeURIComponent(cid)}`, { cache: "no-store" });
      const cJson = (await cRes.json()) as CompanyGetRes;

      if (!cRes.ok || !cJson.ok) {
        throw new Error(!cJson.ok ? cJson.error.message : `会社取得に失敗しました (status: ${cRes.status})`);
      }
      if (cJson.company === null) {
        setNotFound(true);
        setCompanyRow(null);
        setRecordRow(null);
        setCompany(null);
        setJobs([]);
        setState("ready");
        return;
      }

      const rRes = await fetch(`/api/companies/${encodeURIComponent(cid)}/record`, { cache: "no-store" });
      const rJson = (await rRes.json()) as RecordGetRes;

      if (!rRes.ok || !rJson.ok) {
        throw new Error(!rJson.ok ? rJson.error.message : `record取得に失敗しました (status: ${rRes.status})`);
      }

      setNotFound(false);
      setCompanyRow(cJson.company);
      setRecordRow(rJson.record);
      setCompany(rowToCompanyFromRecord(cJson.company, rJson.record));

      const jRes = await fetch(`/api/jobs?companyId=${encodeURIComponent(cid)}`, { cache: "no-store" });
      const jJson = (await jRes.json()) as JobsGetRes;

      if (!jRes.ok || !jJson.ok) {
        setJobs([]);
        setState("ready");
        return;
      }

      const nextJobs: Job[] = (jJson.jobs ?? []).map((r) => {
        return {
          id: r.id,
          companyId: r.company_id ?? cid,
          jobTitle: r.job_title ?? "",
          employmentType: r.employment_type ?? "",
          siteStatus: r.site_status ?? null,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        } as any;
      });

      setJobs(nextJobs);
      setState("ready");
    } catch (e: any) {
      setCompanyRow(null);
      setRecordRow(null);
      setCompany(null);
      setJobs([]);
      setNotFound(false);
      setState("error");
      setErrorMessage(String(e?.message ?? e ?? "読み込みに失敗しました"));
    }
  }

  // 応募メール（companyId）を既存 API から取得して集計（job紐付け済みを対象）
  async function loadInboxForCompany(cid: string) {
    setInboxLoading(true);
    setInboxErr("");
    setInboxItems([]);

    try {
      const LIMIT = 200;
      const MAX_PAGES = 6; // 最大 1200 件まで

      const all: InboxItem[] = [];

      for (let page = 1; page <= MAX_PAGES; page++) {
        const res = await fetch(`/api/gmail/inbox?limit=${LIMIT}&page=${page}`, { cache: "no-store" });
        const json = (await res.json()) as InboxGetRes;

        if (!res.ok || !json.ok) {
          throw new Error((json as any)?.error ?? `inbox load failed (status: ${res.status})`);
        }

        const items = Array.isArray(json.items) ? json.items : [];

        const filtered = items.filter((x: any) => {
          const companyId = s(x.companyId);
          if (!companyId) return false;
          if (companyId !== cid) return false;
          // jobId が無いものは「内訳/求人計上」から外す（誤集計回避）
          const jobId = s(x.jobId);
          if (!jobId) return false;
          return true;
        });

        for (const it of filtered as any[]) {
          if (!isApplicationMail(it)) continue;
          all.push({
            id: s(it.id),
            companyId: it.companyId ? s(it.companyId) : null,
            companyName: it.companyName ? s(it.companyName) : null,
            jobId: it.jobId ? s(it.jobId) : null,
            siteKey: s(it.siteKey),
            subject: s(it.subject),
            receivedAt: s(it.receivedAt),
            status: s(it.status),
          });
        }

        if (!json.page?.hasNext) break;
      }

      all.sort((a, b) => String(b.receivedAt).localeCompare(String(a.receivedAt)));
      setInboxItems(all);
    } catch (e: any) {
      setInboxErr(String(e?.message ?? e ?? "inbox load failed"));
      setInboxItems([]);
    } finally {
      setInboxLoading(false);
    }
  }

  useEffect(() => {
    if (!companyId) return;
    void loadCompanyAndJobs(companyId);
    void loadInboxForCompany(companyId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  function handleJobsChanged() {
    if (!companyId) return;
    void loadCompanyAndJobs(companyId);
  }

  const stage = useMemo(() => {
    const p = safeObj(recordRow?.profile);
    return s(p.deal_stage);
  }, [recordRow]);

  const jobsStaleDays = useMemo(() => {
    if (!jobs || jobs.length === 0) return null;
    let maxIso = "";
    for (const j of jobs) {
      const u = s((j as any).updatedAt);
      if (!u) continue;
      if (!maxIso || u.localeCompare(maxIso) > 0) maxIso = u;
    }
    if (!maxIso) return null;
    return daysSince(maxIso);
  }, [jobs]);

  // 集計
  const agg = useMemo(() => {
    const base = inboxItems ?? [];

    const overall = {
      total: 0,
      newCnt: 0,
      regCnt: 0,
      ngCnt: 0,
      interviewCnt: 0,
      offerCnt: 0,
      otherCnt: 0,
      last7: 0,
      lastReceivedAt: "",
    };

    const byJob = new Map<
      string,
      {
        total: number;
        newCnt: number;
        regCnt: number;
        ngCnt: number;
        interviewCnt: number;
        offerCnt: number;
        otherCnt: number;
        lastReceivedAt: string;
        byMedia: Map<MediaLabel, number>;
      }
    >();

    const byMediaOverall = new Map<MediaLabel, number>();

    const now = Date.now();
    for (const it of base) {
      const jobId = s(it.jobId);
      if (!jobId) continue;

      const status = normalizeInboxStatus(it.status);
      const media = normalizeMedia(it.siteKey);

      overall.total += 1;
      if (!overall.lastReceivedAt) overall.lastReceivedAt = s(it.receivedAt);

      if (status === "new") overall.newCnt += 1;
      else if (status === "registered") overall.regCnt += 1;
      else if (status === "ng") overall.ngCnt += 1;
      else if (status === "interview") overall.interviewCnt += 1;
      else if (status === "offer") overall.offerCnt += 1;
      else overall.otherCnt += 1;

      const t = new Date(s(it.receivedAt)).getTime();
      if (Number.isFinite(t)) {
        const diffDays = (now - t) / (1000 * 60 * 60 * 24);
        if (diffDays <= 7) overall.last7 += 1;
      }

      byMediaOverall.set(media, (byMediaOverall.get(media) ?? 0) + 1);

      if (!byJob.has(jobId)) {
        byJob.set(jobId, {
          total: 0,
          newCnt: 0,
          regCnt: 0,
          ngCnt: 0,
          interviewCnt: 0,
          offerCnt: 0,
          otherCnt: 0,
          lastReceivedAt: "",
          byMedia: new Map<MediaLabel, number>(),
        });
      }

      const j = byJob.get(jobId)!;
      j.total += 1;
      if (!j.lastReceivedAt) j.lastReceivedAt = s(it.receivedAt);

      if (status === "new") j.newCnt += 1;
      else if (status === "registered") j.regCnt += 1;
      else if (status === "ng") j.ngCnt += 1;
      else if (status === "interview") j.interviewCnt += 1;
      else if (status === "offer") j.offerCnt += 1;
      else j.otherCnt += 1;

      j.byMedia.set(media, (j.byMedia.get(media) ?? 0) + 1);
    }

    const mediaRows = MEDIA_ORDER.map((m) => ({ media: m, count: byMediaOverall.get(m) ?? 0 })).filter((x) => x.count > 0);
    mediaRows.sort((a, b) => b.count - a.count);

    return { overall, byJob, mediaRows };
  }, [inboxItems]);

  const jobsSummary = useMemo(() => {
    const list = (jobs ?? []).map((j) => {
      const id = s((j as any).id);
      const title = s((j as any).jobTitle) || "(求人名なし)";
      const a = id ? agg.byJob.get(id) : null;

      return {
        id,
        title,
        total: a?.total ?? 0,
        newCnt: a?.newCnt ?? 0,
        interviewCnt: a?.interviewCnt ?? 0,
        offerCnt: a?.offerCnt ?? 0,
        ngCnt: a?.ngCnt ?? 0,
      };
    });

    list.sort((a, b) => b.total - a.total);
    return list;
  }, [jobs, agg.byJob]);

  const donutParts = useMemo<DonutPart[]>(() => {
    return [
      {
        label: "New",
        value: agg.overall.newCnt,
        gradId: "gNew",
        gradFrom: "rgba(99, 102, 241, 1)",
        gradTo: "rgba(59, 130, 246, 1)",
      },
      {
        label: "連携",
        value: agg.overall.regCnt,
        gradId: "gReg",
        gradFrom: "rgba(139, 92, 246, 1)",
        gradTo: "rgba(99, 102, 241, 1)",
      },
      {
        label: "面接",
        value: agg.overall.interviewCnt,
        gradId: "gInt",
        gradFrom: "rgba(16, 185, 129, 1)",
        gradTo: "rgba(52, 211, 153, 1)",
      },
      {
        label: "内定",
        value: agg.overall.offerCnt,
        gradId: "gOff",
        gradFrom: "rgba(245, 158, 11, 1)",
        gradTo: "rgba(251, 191, 36, 1)",
      },
      {
        label: "NG",
        value: agg.overall.ngCnt,
        gradId: "gNg",
        gradFrom: "rgba(244, 63, 94, 1)",
        gradTo: "rgba(251, 113, 133, 1)",
      },
      {
        label: "他",
        value: agg.overall.otherCnt,
        gradId: "gOther",
        gradFrom: "rgba(148, 163, 184, 1)",
        gradTo: "rgba(203, 213, 225, 1)",
      },
    ];
  }, [agg.overall]);

  // layout: 2 rows under hero
  const BELOW_HERO_H = "calc(100vh - 230px)";

  const recordHref = companyId ? `/companies/${encodeURIComponent(companyId)}/record` : "/companies";

  if (!companyId) {
    return (
      <main className="space-y-3">
        <div className={UI.PANEL + " px-4 py-3 text-sm text-slate-700 dark:text-slate-300"}>読み込み中...</div>
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="space-y-3">
        <div className={UI.PANEL + " px-6 py-6"}>
          <h1 className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">会社が見つかりません</h1>
          <div className="mt-4">
            <Link href="/companies" className="cv-btn-secondary">
              ← 会社一覧
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className={[UI.PAGE_BG, "space-y-3"].join(" ")}>
      {/* background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900" />
        <div className="absolute inset-0 backdrop-blur-[1.5px]" />
        <div className="absolute -left-44 -top-52 h-[560px] w-[560px] rounded-full bg-blue-200/12 dark:bg-blue-500/8 blur-3xl" />
        <div className="absolute -right-48 -top-44 h-[620px] w-[620px] rounded-full bg-purple-200/10 dark:bg-purple-500/8 blur-3xl" />
        <div className="absolute left-1/2 top-24 h-56 w-[720px] -translate-x-1/2 rounded-full bg-indigo-200/08 dark:bg-indigo-500/8 blur-3xl" />
      </div>

      {state === "error" ? (
        <div className="rounded-md border border-rose-200 dark:border-rose-700 bg-rose-50 dark:bg-rose-900/30 p-4 text-sm text-rose-800 dark:text-rose-300" role="alert">
          {errorMessage}
        </div>
      ) : null}

      <CompaniesHero
        companyName={s(companyRow?.company_name) || (company as any)?.companyName || "企業概要"}
        status={s(recordRow?.status) || "active"}
        stage={stage || "—"}
        updatedAt={s(recordRow?.updated_at) || s(companyRow?.updated_at)}
        jobsCount={jobs.length}
        jobsStaleDays={jobsStaleDays}
        onReload={() => {
          void loadCompanyAndJobs(companyId);
          void loadInboxForCompany(companyId);
        }}
        companyId={companyId}
        onWorkQueueAdd={() => setShowWorkQueueDialog(true)}
      />

      {/* 2 rows layout */}
      <div className="lg:flex lg:flex-col lg:gap-3" style={{ minHeight: BELOW_HERO_H }}>
        {/* Top row: 3 columns */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 lg:flex-1 lg:min-h-0">
          {/* Column 1: summary (premium) */}
          <section className={[UI.PANEL, "relative overflow-hidden flex flex-col min-h-0"].join(" ")}>
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-50/70 via-white to-indigo-50/50 dark:from-slate-900/70 dark:via-slate-900 dark:to-indigo-950/30" />
              <div className="absolute inset-0 backdrop-blur-[1.5px]" />
              <div className="absolute -left-28 -bottom-28 h-[360px] w-[360px] rounded-full bg-indigo-200/10 dark:bg-indigo-500/8 blur-3xl" />
              <div className="absolute -right-32 -top-32 h-[380px] w-[380px] rounded-full bg-blue-200/10 dark:bg-blue-500/8 blur-3xl" />
            </div>

            <div className={[UI.PANEL_HDR, "relative"].join(" ")}>
              <div className={UI.PANEL_TITLE}>サマリー</div>
              <div className="flex items-center gap-2">
                {inboxLoading ? (
                  <span className={UI.BADGE}>集計中</span>
                ) : inboxErr ? (
                  <span className="inline-flex items-center rounded-full border border-rose-200 dark:border-rose-700 bg-rose-50 dark:bg-rose-900/30 px-2 py-1 text-[11px] font-semibold text-rose-800 dark:text-rose-300">
                    エラー
                  </span>
                ) : (
                  <span className={UI.BADGE}>
                    応募 <span className="ml-1 tabular-nums font-bold tracking-tight">{agg.overall.total}</span>
                  </span>
                )}
              </div>
            </div>

            <div className="relative px-4 py-3 flex-1 min-h-0 overflow-auto">
              {/* donut + chips */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[148px_1fr] sm:items-center">
                <div className="flex items-center gap-3">
                  <DonutSvg
                    parts={donutParts}
                    centerTop="TOTAL"
                    centerBottom={String(agg.overall.total)}
                    subline={agg.overall.total > 0 ? `直近7日 +${agg.overall.last7}` : undefined}
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <StatChip label="New" value={agg.overall.newCnt} />
                    <StatChip label="連携" value={agg.overall.regCnt} />
                    <StatChip label="面接" value={agg.overall.interviewCnt} />
                    <StatChip label="内定" value={agg.overall.offerCnt} />
                    <StatChip label="NG" value={agg.overall.ngCnt} />
                    <StatChip label="他" value={agg.overall.otherCnt} />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className={UI.BADGE}>
                      直近7日 <span className="ml-1 tabular-nums font-bold tracking-tight">{agg.overall.last7}</span>
                    </span>
                    <span className={UI.BADGE}>
                      最終{" "}
                      <span className="ml-1 tabular-nums font-bold tracking-tight">
                        {agg.overall.lastReceivedAt ? formatLocalDateTimeShort(agg.overall.lastReceivedAt) : "—"}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              {/* media quick list */}
              <div className="mt-4 rounded-md border border-slate-200/80 dark:border-slate-700/80 bg-white/70 dark:bg-slate-800/70 px-3 py-2">
                <div className="text-[11px] font-semibold tracking-wide text-slate-700 dark:text-slate-300">媒体（上位）</div>
                <div className="mt-2 space-y-2">
                  {agg.mediaRows.slice(0, 6).map((r) => {
                    const pct = agg.overall.total > 0 ? Math.round((r.count / agg.overall.total) * 100) : 0;
                    return (
                      <div key={r.media} className="space-y-1">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 truncate text-[12px] font-semibold text-slate-800 dark:text-slate-200">{r.media}</div>
                          <div className="shrink-0 text-[12px] font-bold text-slate-900 dark:text-slate-100 tabular-nums tracking-tight">
                            {r.count} <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">({pct}%)</span>
                          </div>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-200/70 dark:bg-slate-700/70">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${pct}%`,
                              background: "linear-gradient(to right, rgba(99,102,241,0.72), rgba(59,130,246,0.72))",
                              transition: "filter 120ms ease-out",
                              filter: "saturate(1.02)",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {agg.mediaRows.length === 0 ? <div className="text-[12px] text-slate-600 dark:text-slate-400">—</div> : null}
                </div>
              </div>

              {inboxLoading ? <div className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">集計中…</div> : null}
              {inboxErr ? (
                <div className="mt-3 rounded-md border border-rose-200 dark:border-rose-700 bg-rose-50 dark:bg-rose-900/30 px-3 py-2 text-[12px] font-semibold text-rose-800 dark:text-rose-300">
                  {inboxErr}
                </div>
              ) : null}
            </div>
          </section>

          {/* Column 2: 商談 */}
          <DealsSummaryCard companyId={companyId} />

          {/* Column 3: Jobs */}
          <section className={[UI.PANEL, "flex flex-col min-h-0"].join(" ")}>
            <div className={UI.PANEL_HDR}>
              <div className={UI.PANEL_TITLE}>求人</div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className={[
                    "rounded-md border-2 px-2.5 py-1 text-[12px] font-semibold transition",
                    chipToggle(jobsMode === "summary"),
                  ].join(" ")}
                  onClick={() => setJobsMode("summary")}
                >
                  一覧
                </button>
                <button
                  type="button"
                  className={[
                    "rounded-md border-2 px-2.5 py-1 text-[12px] font-semibold transition",
                    chipToggle(jobsMode === "edit"),
                  ].join(" ")}
                  onClick={() => setJobsMode("edit")}
                >
                  編集
                </button>
                <Link
                  href={`/companies/${encodeURIComponent(companyId)}/jobs/new`}
                  className="cv-btn-secondary !px-3 !py-1.5 text-[12px] whitespace-nowrap"
                >
                  + 追加
                </Link>
              </div>
            </div>

            {jobsMode === "summary" ? (
              <div className="px-4 py-3 flex-1 min-h-0 overflow-auto">
                <div className="grid grid-cols-[1fr_54px_44px_44px_44px] gap-2 border-b border-slate-200/80 dark:border-slate-700/80 pb-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                  <div>求人</div>
                  <div className="text-right">応募</div>
                  <div className="text-right">New</div>
                  <div className="text-right">面接</div>
                  <div className="text-right">内定</div>
                </div>

                <div className="mt-2 space-y-1">
                  {jobsSummary.length === 0 ? (
                    <div className="text-[12px] text-slate-600 dark:text-slate-400">—</div>
                  ) : (
                    jobsSummary.map((r) => (
                      <div
                        key={r.id}
                        className="grid grid-cols-[1fr_54px_44px_44px_44px] gap-2 rounded-md border border-slate-200/70 dark:border-slate-700/70 bg-white/70 dark:bg-slate-800/70 px-2.5 py-2"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-[12px] font-semibold text-slate-800 dark:text-slate-200" title={r.title}>
                            {r.title}
                          </div>
                        </div>
                        <div className="text-right text-[12px] font-bold text-slate-900 dark:text-slate-100 tabular-nums tracking-tight">
                          {r.total}
                        </div>
                        <div className="text-right text-[12px] font-bold text-slate-900 dark:text-slate-100 tabular-nums tracking-tight">
                          {r.newCnt}
                        </div>
                        <div className="text-right text-[12px] font-bold text-slate-900 dark:text-slate-100 tabular-nums tracking-tight">
                          {r.interviewCnt}
                        </div>
                        <div className="text-right text-[12px] font-bold text-slate-900 dark:text-slate-100 tabular-nums tracking-tight">
                          {r.offerCnt}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="px-4 py-3 flex-1 min-h-0 overflow-auto">
                <JobsTable companyId={companyId} jobs={jobs} onDeleted={handleJobsChanged} />
              </div>
            )}
          </section>
        </div>

        {/* Bottom row: 2 + 1 */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 lg:flex-1 lg:min-h-0">
          {/* 2 columns: emails */}
          <section className={[UI.PANEL, "flex flex-col min-h-0 lg:col-span-2"].join(" ")}>
            <div className={UI.PANEL_HDR}>
              <div className={UI.PANEL_TITLE}>応募メール</div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="cv-btn-secondary !px-3 !py-1.5 text-[12px] whitespace-nowrap"
                  onClick={() => setEmailsOpen((v) => !v)}
                  aria-expanded={emailsOpen}
                >
                  {emailsOpen ? "閉じる" : "開く"}
                </button>

                <Link href={recordHref} className="cv-btn-secondary !px-3 !py-1.5 text-[12px] whitespace-nowrap">
                  企業詳細
                </Link>
              </div>
            </div>

            {emailsOpen ? (
              <div className="px-4 py-3 flex-1 min-h-0 overflow-auto">
                <CompanyApplicantEmails companyId={companyId} />
              </div>
            ) : (
              <div className="px-4 py-3">
                <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 px-3 py-2 text-[12px] text-slate-700 dark:text-slate-300">
                  —
                </div>
              </div>
            )}
          </section>

          {/* 1 column: funnel (A) ※ここが「左下（分析枠）」の置換 */}
          <FunnelCard overall={agg.overall} inboxLoading={inboxLoading} inboxErr={inboxErr} />
        </div>
      </div>

      {/* Work Queue追加ダイアログ */}
      {showWorkQueueDialog && (
        <WorkQueueAddDialog
          companyId={companyId}
          companyName={s(companyRow?.company_name)}
          jobs={jobs}
          onClose={() => setShowWorkQueueDialog(false)}
          onSuccess={() => setShowWorkQueueDialog(false)}
        />
      )}
    </div>
  );
}



const TASK_TYPES = [
  { value: "meeting", label: "打ち合わせ", icon: "🤝", defaultTitle: "打ち合わせ日程調整" },
  { value: "proposal", label: "提案・商談", icon: "💼", defaultTitle: "提案資料作成" },
  { value: "job_posting", label: "求人原稿作成", icon: "📝", defaultTitle: "求人原稿作成" },
  { value: "update", label: "情報更新", icon: "🔄", defaultTitle: "情報更新" },
  { value: "follow_up", label: "フォローアップ", icon: "📞", defaultTitle: "フォローアップ連絡" },
  { value: "document", label: "資料作成", icon: "📄", defaultTitle: "資料作成" },
  { value: "other", label: "その他", icon: "📋", defaultTitle: "" },
];

function WorkQueueAddDialog({
  companyId,
  companyName,
  jobs,
  onClose,
  onSuccess,
}: {
  companyId: string;
  companyName: string;
  jobs: Job[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [taskType, setTaskType] = useState("");
  const [title, setTitle] = useState("");
  const [assigneeUserId, setAssigneeUserId] = useState("");
  const [deadline, setDeadline] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    loadMembers();
  }, []);

  async function loadMembers() {
    try {
      const res = await fetch("/api/work-queue/members", { cache: "no-store" });
      const json = await res.json();
      if (json.ok) {
        setMembers(json.data);
      }
    } catch (err) {
      console.error("Failed to load members:", err);
    }
  }

  async function handleSubmit() {
    if (!taskType || !title.trim()) {
      alert("タスクタイプとタイトルは必須です");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/work-queue/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_type: taskType,
          title: title.trim(),
          company_id: companyId,
          assignee_user_id: assigneeUserId || null,
          deadline: deadline || null,
          note: note || null,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        alert("Work Queueに追加しました");
        onSuccess();
      } else {
        alert("追加に失敗しました: " + json.error.message);
      }
    } catch (err) {
      console.error("Failed to add to work queue:", err);
      alert("追加に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70">
      <div className="w-full max-w-md rounded-lg bg-white dark:bg-slate-800 p-6 shadow-xl">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
          Work Queueに追加
        </h2>

        <div className="mb-3 text-sm text-slate-600 dark:text-slate-400">
          {companyName}
        </div>

        {/* タスクタイプ */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            タスクタイプ <span className="text-rose-600 dark:text-rose-400">*</span>
          </label>
          <select
            value={taskType}
            onChange={(e) => {
              const selectedType = e.target.value;
              setTaskType(selectedType);
              const taskTypeObj = TASK_TYPES.find((t) => t.value === selectedType);
              if (taskTypeObj && taskTypeObj.defaultTitle) {
                setTitle(taskTypeObj.defaultTitle);
              }
            }}
            className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500"
          >
            <option value="">選択してください</option>
            {TASK_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.icon} {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* タイトル */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            タイトル <span className="text-rose-600 dark:text-rose-400">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="タスクのタイトル"
            className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>

        {/* 担当者 */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            担当者
          </label>
          <select
            value={assigneeUserId}
            onChange={(e) => setAssigneeUserId(e.target.value)}
            className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500"
          >
            <option value="">未割当</option>
            {(members || []).map((m: any) => (
              <option key={m.user_id} value={m.user_id}>
                {m.display_name || m.user_id}
              </option>
            ))}
          </select>
        </div>

        {/* 期限 */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            期限
          </label>
          <DatePicker
            value={deadline}
            onChange={setDeadline}
            className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500"
          />
        </div>

        {/* メモ */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            メモ
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>

        {/* ボタン */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !taskType || !title.trim()}
            className="rounded-md bg-indigo-600 dark:bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50"
          >
            {submitting ? "追加中..." : "追加"}
          </button>
        </div>
      </div>
    </div>
  );
}
