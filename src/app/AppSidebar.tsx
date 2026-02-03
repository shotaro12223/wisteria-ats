"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";


export const SIDEBAR_W = 248;
export const TOPBAR_H = 44;

type NavItem = { href: string; label: string; desc?: string; badge?: string };

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

function itemCls(active: boolean) {
  return [
    "group flex w-full items-start gap-3 rounded-2xl border px-3 py-3",
    "transition-all duration-200",
    active
      ? "bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 border-indigo-200/60 dark:border-indigo-700/60 shadow-sm"
      : "bg-white dark:bg-slate-800 border-slate-200/60 dark:border-slate-700 hover:bg-gradient-to-br hover:from-slate-50 hover:to-slate-100 dark:hover:from-slate-700 dark:hover:to-slate-600 hover:border-slate-300/70 dark:hover:border-slate-600 hover:shadow-sm",
  ].join(" ");
}

function dotCls(active: boolean) {
  return [
    "mt-1 h-2.5 w-2.5 rounded-full shadow-sm transition-all duration-200",
    active
      ? "bg-gradient-to-br from-indigo-500 to-purple-600 dark:from-indigo-400 dark:to-purple-500"
      : "bg-slate-200 dark:bg-slate-600 group-hover:bg-gradient-to-br group-hover:from-slate-300 group-hover:to-slate-400 dark:group-hover:from-slate-500 dark:group-hover:to-slate-400",
  ].join(" ");
}

function safeDecodeURIComponent(s: string) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function parseContext(pathname: string): { companyId: string | null; jobId: string | null } {
  // /companies/[companyId]
  // /companies/[companyId]/record
  // /companies/[companyId]/jobs
  // /companies/[companyId]/jobs/new
  // /companies/[companyId]/jobs/[jobId]
  // /companies/[companyId]/jobs/[jobId]/data
  // /companies/[companyId]/jobs/[jobId]/outputs
  const m = pathname.match(/^\/companies\/([^\/]+)(?:\/jobs\/([^\/]+))?/);
  const companyId = m?.[1] ? safeDecodeURIComponent(m[1]) : null;

  const jobSeg = m?.[2] ? safeDecodeURIComponent(m[2]) : null;
  if (!companyId) return { companyId: null, jobId: null };
  if (!jobSeg) return { companyId, jobId: null };
  if (jobSeg === "new") return { companyId, jobId: null };
  return { companyId, jobId: jobSeg };
}

function sectionFromPath(pathname: string) {
  if (pathname.startsWith("/companies")) return "companies";
  if (pathname.startsWith("/jobs")) return "jobs";
  if (pathname.startsWith("/applicants")) return "applicants";
  if (pathname.startsWith("/work-queue")) return "workQueue";
  if (pathname.startsWith("/analytics")) return "analytics";
  if (pathname.startsWith("/chat")) return "chat";
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/me")) return "me";
  return "home";
}

function SectionLabel({ text, right }: { text: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 px-1 pb-1">
      <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{text}</div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

function NavList({ pathname, items }: { pathname: string; items: NavItem[] }) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((it) => {
        const active = isActive(pathname, it.href);
        return (
          <Link key={it.href} href={it.href} className={itemCls(active)}>
            <span className={dotCls(active)} />
            <span className="min-w-0">
              <span className="flex items-center gap-2">
                <span className="truncate text-[13px] font-semibold text-slate-900 dark:text-slate-100">{it.label}</span>
                {it.badge ? (
                  <span className="rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-[11px] text-slate-700 dark:text-slate-300">
                    {it.badge}
                  </span>
                ) : null}
              </span>
              {it.desc ? <span className="mt-0.5 block truncate text-[11px] text-slate-500 dark:text-slate-400">{it.desc}</span> : null}
            </span>
          </Link>
        );
      })}
    </div>
  );
}



type PinEntry =
  | { kind: "company"; companyId: string; label?: string; ts: number }
  | { kind: "job"; companyId: string; jobId: string; label?: string; ts: number };

type RecentEntry =
  | { kind: "company"; companyId: string; label?: string; ts: number }
  | { kind: "job"; companyId: string; jobId: string; label?: string; ts: number };

const LS_PINS = "wisteria:sidebar:pins:v1";
const LS_RECENTS = "wisteria:sidebar:recents:v1";
const PINS_MAX = 3;
const RECENTS_MAX = 8;

function safeJsonParse<T>(s: string | null, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

function keyOf(e: PinEntry | RecentEntry) {
  if (e.kind === "company") return `c:${e.companyId}`;
  return `j:${e.companyId}:${e.jobId}`;
}

function hrefOf(e: PinEntry | RecentEntry) {
  if (e.kind === "company") return `/companies/${encodeURIComponent(e.companyId)}`;
  return `/companies/${encodeURIComponent(e.companyId)}/jobs/${encodeURIComponent(e.jobId)}`;
}

function titleOf(e: PinEntry | RecentEntry) {
  const label = String(e.label ?? "").trim();
  if (label) return label;
  if (e.kind === "company") return `会社 ${e.companyId}`;
  return `求人 ${e.jobId}`;
}

function subOf(e: PinEntry | RecentEntry) {
  if (e.kind === "company") return "会社トップ";
  return `会社 ${e.companyId}`;
}

function uniqByKey<T extends PinEntry | RecentEntry>(arr: T[]) {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const x of arr) {
    const k = keyOf(x);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(x);
  }
  return out;
}



async function fetchJsonTry(url: string) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function pickFirstString(obj: any, paths: string[]): string | null {
  for (const p of paths) {
    const segs = p.split(".");
    let cur: any = obj;
    for (const s of segs) {
      if (cur == null) break;
      cur = cur[s];
    }
    const v = cur;
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function extractCompanyName(json: any): string | null {
  return pickFirstString(json, [
    "companyName",
    "company_name",
    "name",
    "title",
    "item.companyName",
    "item.company_name",
    "item.name",
    "item.title",
    "company.companyName",
    "company.company_name",
    "company.name",
    "company.title",
    "data.companyName",
    "data.company_name",
    "data.name",
    "data.title",
  ]);
}

function extractJobTitle(json: any): string | null {
  return pickFirstString(json, [
    "jobTitle",
    "job_title",
    "title",
    "name",
    "item.jobTitle",
    "item.job_title",
    "item.title",
    "item.name",
    "job.jobTitle",
    "job.job_title",
    "job.title",
    "job.name",
    "data.jobTitle",
    "data.job_title",
    "data.title",
    "data.name",
  ]);
}

async function resolveCompanyLabel(companyId: string): Promise<string | null> {
  const cid = encodeURIComponent(companyId);

  const candidates = [
    `/api/companies/${cid}`,
    `/api/companies/${cid}/record`,
    `/api/company/${cid}`,
    `/api/company/${cid}/record`,
  ];

  for (const url of candidates) {
    const json = await fetchJsonTry(url);
    if (!json) continue;
    const name = extractCompanyName(json);
    if (name) return name;
  }
  return null;
}

async function resolveJobLabel(companyId: string, jobId: string): Promise<string | null> {
  const cid = encodeURIComponent(companyId);
  const jid = encodeURIComponent(jobId);

  const candidates = [
    `/api/companies/${cid}/jobs/${jid}`,
    `/api/jobs/${jid}`,
    `/api/job/${jid}`,
    `/api/companies/${cid}/job/${jid}`,
  ];

  for (const url of candidates) {
    const json = await fetchJsonTry(url);
    if (!json) continue;
    const title = extractJobTitle(json);
    if (title) return title;
  }
  return null;
}



export default function AppSidebar() {
  const pathname = usePathname();
  const section = sectionFromPath(pathname);
  const { companyId, jobId } = useMemo(() => parseContext(pathname), [pathname]);

  const [isAdmin, setIsAdmin] = useState(false);

  const [pins, setPins] = useState<PinEntry[]>([]);
  const [recents, setRecents] = useState<RecentEntry[]>([]);

  const [companyLabel, setCompanyLabel] = useState<string>("");
  const [jobLabel, setJobLabel] = useState<string>("");

  // admin role
  useEffect(() => {
    let alive = true;

    fetch("/api/me/role")
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        setIsAdmin(j?.role === "admin");
      })
      .catch(() => {});

    return () => {
      alive = false;
    };
  }, []);

  // load pins/recents once
  useEffect(() => {
    try {
      const p = safeJsonParse<PinEntry[]>(localStorage.getItem(LS_PINS), []);
      const r = safeJsonParse<RecentEntry[]>(localStorage.getItem(LS_RECENTS), []);
      setPins(Array.isArray(p) ? p : []);
      setRecents(Array.isArray(r) ? r : []);
    } catch {
      setPins([]);
      setRecents([]);
    }
  }, []);

  // A: resolve labels from API when context changes
  useEffect(() => {
    let alive = true;

    (async () => {
      setCompanyLabel("");
      setJobLabel("");

      if (!companyId) return;

      const c = await resolveCompanyLabel(companyId);
      if (!alive) return;
      if (c) setCompanyLabel(c);

      if (jobId) {
        const j = await resolveJobLabel(companyId, jobId);
        if (!alive) return;
        if (j) setJobLabel(j);
      }
    })();

    return () => {
      alive = false;
    };
  }, [companyId, jobId]);

  function patchLabelEverywhere(targetKey: string, label: string) {
    const nextLabel = String(label ?? "").trim();
    if (!nextLabel) return;

    setPins((prev) => {
      const arr = Array.isArray(prev) ? prev : [];
      const next = arr.map((x) => (keyOf(x) === targetKey ? { ...x, label: nextLabel } : x));
      try {
        localStorage.setItem(LS_PINS, JSON.stringify(next));
      } catch {}
      return next;
    });

    setRecents((prev) => {
      const arr = Array.isArray(prev) ? prev : [];
      const next = arr.map((x) => (keyOf(x) === targetKey ? { ...x, label: nextLabel } : x));
      try {
        localStorage.setItem(LS_RECENTS, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  // push to recents on navigation (company/job context only)
  useEffect(() => {
    if (!companyId) return;

    const now = Date.now();

    const entry: RecentEntry = jobId
      ? { kind: "job", companyId, jobId, label: jobLabel || "", ts: now }
      : { kind: "company", companyId, label: companyLabel || "", ts: now };

    setRecents((prev) => {
      const base = Array.isArray(prev) ? prev : [];
      const merged = uniqByKey([entry, ...base])
        .sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0))
        .slice(0, RECENTS_MAX);

      try {
        localStorage.setItem(LS_RECENTS, JSON.stringify(merged));
      } catch {}
      return merged;
    });

    const k = keyOf(entry);
    if (entry.kind === "company" && companyLabel) patchLabelEverywhere(k, companyLabel);
    if (entry.kind === "job" && jobLabel) patchLabelEverywhere(k, jobLabel);
  }, [companyId, jobId, pathname, companyLabel, jobLabel]);

  // ===== Additions: company job list + last viewed job link =====

  const lastJobForCompany = useMemo(() => {
    if (!companyId) return null;
    const list = Array.isArray(recents) ? recents : [];
    const hit = list
      .filter((r) => r.kind === "job" && r.companyId === companyId)
      .sort((a: any, b: any) => (b.ts ?? 0) - (a.ts ?? 0))[0] as any;
    if (!hit) return null;
    return hit as RecentEntry & { kind: "job" };
  }, [recents, companyId]);

  const contextCompanyItems = useMemo<NavItem[]>(() => {
    if (!companyId) return [];
    const cid = encodeURIComponent(companyId);

    const items: NavItem[] = [
      { href: `/companies/${cid}`, label: "会社トップ", desc: "概要 / 求人" },
      { href: `/companies/${cid}/deal`, label: "打ち合わせ", desc: "定例・MTG" },
      { href: `/companies/${cid}/analytics`, label: "企業分析", desc: "パフォーマンス" },
      { href: `/companies/${cid}/jobs`, label: "求人原稿", desc: "一覧 / フィルタ / 更新" },
      ...(lastJobForCompany
        ? [
            {
              href: `/companies/${cid}/jobs/${encodeURIComponent((lastJobForCompany as any).jobId)}`,
              label: "直近求人",
              desc: (lastJobForCompany as any).label ? String((lastJobForCompany as any).label) : "最後に開いた求人",
            },
          ]
        : []),
      { href: `/companies/${cid}/record`, label: "台帳", desc: "契約・運用" },
      { href: `/companies/${cid}/jobs/new`, label: "求人追加", desc: "新規作成" },
    ];

    return items;
  }, [companyId, lastJobForCompany]);

  const contextJobItems = useMemo<NavItem[]>(() => {
    if (!companyId || !jobId) return [];
    const cid = encodeURIComponent(companyId);
    const jid = encodeURIComponent(jobId);
    return [
      { href: `/companies/${cid}/jobs/${jid}`, label: "求人詳細", desc: "原稿 / 状態" },
      { href: `/companies/${cid}/jobs/${jid}/outputs`, label: "出力", desc: "コピー" },
      { href: `/companies/${cid}/jobs/${jid}/data`, label: "データ", desc: "応募" },
    ];
  }, [companyId, jobId]);

  const fallbackItems = useMemo<NavItem[]>(() => {
    if (section === "home") return [];

    if (section === "companies") {
      return [
        { href: "/companies", label: "会社一覧", desc: "検索" },
        { href: "/companies/new", label: "会社追加", desc: "新規" },
      ];
    }

    if (section === "jobs") {
      return [
        { href: "/jobs", label: "求人一覧", desc: "全体" },
        { href: "/jobs/new", label: "求人作成", desc: "新規" },
        { href: "/jobs/manuscripts", label: "原稿", desc: "テンプレ" },
      ];
    }

    if (section === "applicants") {
      return [
        { href: "/applicants", label: "応募一覧", desc: "全体" },
      ];
    }

    if (section === "workQueue") {
      return [{ href: "/work-queue", label: "Work Queue", desc: "今日" }];
    }

    if (section === "analytics") {
      return [{ href: "/analytics", label: "分析", desc: "媒体" }];
    }

    if (section === "admin") {
      if (isAdmin) {
        return [
          { href: "/admin/users", label: "ユーザー招待", desc: "追加" },
          { href: "/admin/client-users", label: "クライアントユーザー", desc: "企業ポータル" },
        ];
      }
      return [{ href: "/", label: "Home", desc: "権限なし" }];
    }

    if (section === "me") {
      return [
        { href: "/me", label: "マイページ", desc: "プロフィール" },
      ];
    }

    return [];
  }, [section, isAdmin]);

  const hasContext = !!companyId;
  const isHome = section === "home" && !hasContext;

  function addPin(kind: "company" | "job") {
    if (!companyId) return;

    const now = Date.now();

    const entry: PinEntry =
      kind === "job"
        ? jobId
          ? { kind: "job", companyId, jobId, label: jobLabel || "", ts: now }
          : { kind: "company", companyId, label: companyLabel || "", ts: now }
        : { kind: "company", companyId, label: companyLabel || "", ts: now };

    setPins((prev) => {
      const base = Array.isArray(prev) ? prev : [];
      const merged = uniqByKey([entry, ...base])
        .sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0))
        .slice(0, PINS_MAX);

      try {
        localStorage.setItem(LS_PINS, JSON.stringify(merged));
      } catch {}
      return merged;
    });

    const k = keyOf(entry);
    if (entry.kind === "company" && companyLabel) patchLabelEverywhere(k, companyLabel);
    if (entry.kind === "job" && jobLabel) patchLabelEverywhere(k, jobLabel);
  }

  function removePinByKey(k: string) {
    setPins((prev) => {
      const next = (Array.isArray(prev) ? prev : []).filter((x) => keyOf(x) !== k);
      try {
        localStorage.setItem(LS_PINS, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  function removeRecentByKey(k: string) {
    setRecents((prev) => {
      const next = (Array.isArray(prev) ? prev : []).filter((x) => keyOf(x) !== k);
      try {
        localStorage.setItem(LS_RECENTS, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  function clearRecents() {
    setRecents([]);
    try {
      localStorage.setItem(LS_RECENTS, JSON.stringify([]));
    } catch {}
  }

  const pinBtnCls =
    "inline-flex items-center justify-center rounded-lg border border-slate-200/60 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 shadow-sm hover:bg-gradient-to-br hover:from-indigo-50 hover:to-purple-50 dark:hover:from-indigo-900/30 dark:hover:to-purple-900/30 hover:border-indigo-200/60 dark:hover:border-indigo-700/60 hover:shadow-md transition-all duration-200";

  const iconBtnCls =
    "inline-flex items-center justify-center rounded-lg border border-slate-200/60 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400 shadow-sm hover:bg-gradient-to-br hover:from-slate-50 hover:to-slate-100 dark:hover:from-slate-700 dark:hover:to-slate-600 hover:text-slate-900 dark:hover:text-slate-100 hover:shadow-md transition-all duration-200";

  function PinsBox() {
    return (
      <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-900/50 px-3 py-3 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">ピン留め</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">最大{PINS_MAX}件</div>
        </div>

        {pins.length === 0 ? (
          <div className="mt-2 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">会社/求人ページでピンを押す</div>
        ) : (
          <div className="mt-2 flex flex-col gap-2">
            {pins.map((p) => {
              const k = keyOf(p);
              return (
                <div
                  key={k}
                  className="flex items-start justify-between gap-2 rounded-xl border border-indigo-200/60 dark:border-indigo-700/60 bg-gradient-to-br from-indigo-50/40 to-purple-50/40 dark:from-indigo-900/30 dark:to-purple-900/30 px-3 py-2 shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <Link href={hrefOf(p)} className="min-w-0">
                    <div className="truncate text-[12px] font-semibold text-slate-900 dark:text-slate-100">{titleOf(p)}</div>
                    <div className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">{subOf(p)}</div>
                  </Link>

                  <button
                    type="button"
                    className={iconBtnCls}
                    onClick={() => removePinByKey(k)}
                    aria-label="remove pin"
                    title="削除"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  function RecentsBox() {
    return (
      <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-900/50 px-3 py-3 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">最近見た</div>
          <button type="button" className={iconBtnCls} onClick={clearRecents}>
            クリア
          </button>
        </div>

        {recents.length === 0 ? (
          <div className="mt-2 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">会社/求人を開くと履歴が貯まる</div>
        ) : (
          <div className="mt-2 flex flex-col gap-2">
            {recents.slice(0, 6).map((r) => {
              const k = keyOf(r);
              return (
                <div
                  key={k}
                  className="flex items-start justify-between gap-2 rounded-xl border border-slate-200/60 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 shadow-sm hover:bg-gradient-to-br hover:from-slate-50 hover:to-slate-100 dark:hover:from-slate-700 dark:hover:to-slate-600 hover:shadow-md transition-all duration-200"
                >
                  <Link href={hrefOf(r)} className="min-w-0">
                    <div className="truncate text-[12px] font-semibold text-slate-900 dark:text-slate-100">{titleOf(r)}</div>
                    <div className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">{subOf(r)}</div>
                  </Link>

                  <button
                    type="button"
                    className={iconBtnCls}
                    onClick={() => removeRecentByKey(k)}
                    aria-label="remove recent"
                    title="削除"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  function HomePinsRecents() {
    return (
      <div className="flex flex-col gap-3">
        <PinsBox />
        <RecentsBox />
      </div>
    );
  }

  function PinsOnly() {
    return (
      <div className="flex flex-col gap-3">
        <PinsBox />
      </div>
    );
  }

  return (
    <aside
      className="fixed left-0 z-30 border-r border-slate-200/60 dark:border-slate-700 bg-gradient-to-b from-white to-slate-50/30 dark:from-slate-800 dark:to-slate-900/30 shadow-sm"
      style={{
        top: TOPBAR_H,
        width: SIDEBAR_W,
        height: `calc(100vh - ${TOPBAR_H}px)`,
      }}
    >
      <div className="flex h-full flex-col">
        <nav className="flex flex-1 flex-col gap-3 px-4 pt-4">
          {hasContext ? (
            <>
              <SectionLabel
                text="CONTEXT"
                right={
                  <div className="flex items-center gap-2">
                    <button type="button" className={pinBtnCls} onClick={() => addPin("company")}>
                      会社をピン
                    </button>
                    <button
                      type="button"
                      className={pinBtnCls}
                      onClick={() => addPin("job")}
                      disabled={!jobId}
                      title={!jobId ? "求人ページで有効" : "ピン留め"}
                      style={!jobId ? { opacity: 0.55, cursor: "not-allowed" } : undefined}
                    >
                      求人をピン
                    </button>
                  </div>
                }
              />

              <div className="px-1 -mt-2 pb-1">
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {companyLabel ? `会社: ${companyLabel}` : companyId ? `会社: ${companyId}` : ""}
                  {jobId ? (jobLabel ? ` / 求人: ${jobLabel}` : ` / 求人: ${jobId}`) : ""}
                </div>
              </div>

              <NavList pathname={pathname} items={contextCompanyItems} />

              {contextJobItems.length > 0 ? (
                <>
                  <div className="pt-1" />
                  <SectionLabel text="JOB" />
                  <NavList pathname={pathname} items={contextJobItems} />
                </>
              ) : null}

              {fallbackItems.length > 0 ? (
                <>
                  <div className="pt-2" />
                  <SectionLabel text="TOOLS" />
                  <NavList pathname={pathname} items={fallbackItems.slice(0, 2)} />
                </>
              ) : null}
            </>
          ) : isHome ? (
            <>
              <SectionLabel text="HOME" />
              <HomePinsRecents />
            </>
          ) : (
            <>
              {/* HOME以外（context無し）の場合：ピン留めのみ */}
              <SectionLabel text="HOME" />
              <PinsOnly />
            </>
          )}

          {!hasContext && section !== "home" ? (
            <>
              <div className="pt-2" />
              <SectionLabel text={section.toUpperCase()} />
              {fallbackItems.length > 0 ? <NavList pathname={pathname} items={fallbackItems} /> : null}
            </>
          ) : null}
        </nav>

        <div className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">テーマ</span>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </aside>
  );
}
