"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";

type JobRow = {
  id: string;
  company_id: string | null;
  company_name: string | null;
  job_title: string | null;
  employment_type: string | null;
  site_status: any;
  applicants_count?: number | null;
  counter_started_at?: string | null;
  created_at: string;
  updated_at: string;

  posted_at?: string | null;
  manuscript_status?: string | null;
  is_archived?: boolean | null;
};

type JobsRes =
  | { ok: true; jobs: JobRow[]; debug?: any }
  | { ok: false; error: { message: string } };

function safeDateMs(iso: any): number | null {
  try {
    const ms = new Date(String(iso ?? "")).getTime();
    if (!Number.isFinite(ms)) return null;
    return ms;
  } catch {
    return null;
  }
}

function formatLocalDate(iso: string) {
  try {
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return "-";
    return d.toLocaleDateString();
  } catch {
    return "-";
  }
}

function daysSince(iso: any): number | null {
  const ms = safeDateMs(iso);
  if (ms == null) return null;
  const now = Date.now();
  const days = Math.floor((now - ms) / (24 * 60 * 60 * 1000));
  if (!Number.isFinite(days)) return null;
  return Math.max(0, days);
}

function pickStartDate(j: JobRow): string | null {
  const cands = [j.posted_at, j.counter_started_at, j.created_at].filter(Boolean) as string[];
  return cands[0] ?? null;
}

function cls(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function heroShellCls() {
  return ["relative overflow-hidden rounded-2xl border", "bg-white dark:bg-slate-800", "shadow-sm"].join(" ");
}

function heroHdrCls() {
  return "relative flex items-start justify-between gap-4 px-5 py-4";
}

function HeroGradient({ children }: { children: React.ReactNode }) {
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

  return (
    <div ref={heroRef} className={heroShellCls()} style={{ borderColor: "var(--border)" }}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-white to-purple-50/50 dark:from-blue-950/20 dark:via-slate-800 dark:to-purple-950/20" />
        <div className="hero-parallax absolute -inset-24">
          <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-blue-200/14 blur-3xl dark:bg-blue-500/10" />
          <div className="absolute -right-44 -bottom-44 h-[560px] w-[560px] rounded-full bg-purple-200/12 blur-3xl dark:bg-purple-500/10" />
          <div className="absolute left-1/2 top-[-180px] h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-indigo-200/10 blur-3xl dark:bg-indigo-500/10" />
          <div
            className="absolute inset-24 opacity-[0.07] dark:opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(15,23,42,0.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.22) 1px, transparent 1px)",
              backgroundSize: "44px 44px",
              maskImage:
                "radial-gradient(ellipse at 45% 10%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0) 78%)",
              WebkitMaskImage:
                "radial-gradient(ellipse at 45% 10%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0) 78%)",
            }}
          />
        </div>
      </div>

      <div className="relative">{children}</div>

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

function actionBtnCls() {
  return [
    "inline-flex items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold",
    "border border-[var(--border)] bg-white dark:bg-slate-700 shadow-sm",
    "hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)] transition",
    "dark:text-slate-100",
  ].join(" ");
}

function selectCls() {
  return ["cv-input", "min-h-[36px]", "py-1", "text-sm"].join(" ");
}



function iconBtnCls(disabled?: boolean) {
  return cls(
    "inline-flex h-[36px] w-[36px] items-center justify-center rounded-xl",
    "border border-[var(--border)] bg-white dark:bg-slate-700 shadow-sm",
    "hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)] transition",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/35",
    "dark:text-slate-100",
    disabled ? "opacity-60 pointer-events-none" : ""
  );
}

function IconBtn({
  title,
  disabled,
  onClick,
  children,
}: {
  title: string;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" className={iconBtnCls(disabled)} onClick={onClick} title={title} aria-label={title}>
      {children}
    </button>
  );
}



function coerceObject(v: any): Record<string, any> | null {
  if (!v) return null;
  if (typeof v === "object") return v as any;
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return null;
    try {
      const obj = JSON.parse(s);
      if (obj && typeof obj === "object") return obj as any;
      return null;
    } catch {
      return null;
    }
  }
  return null;
}

function normalizeJobRow(raw: any): JobRow {
  const r = raw && typeof raw === "object" ? raw : {};

  const siteStatusRaw = r.site_status ?? r.siteStatus ?? null;
  const manuscriptStatusRaw = r.manuscript_status ?? r.manuscriptStatus ?? null;
  const isArchivedRaw = r.is_archived ?? r.isArchived ?? null;

  return {
    id: String(r.id ?? ""),
    company_id: (r.company_id ?? r.companyId ?? null) as any,
    company_name: (r.company_name ?? r.companyName ?? null) as any,
    job_title: (r.job_title ?? r.jobTitle ?? null) as any,
    employment_type: (r.employment_type ?? r.employmentType ?? null) as any,
    site_status: coerceObject(siteStatusRaw),

    applicants_count: (r.applicants_count ?? r.applicantsCount ?? null) as any,
    counter_started_at: (r.counter_started_at ?? r.counterStartedAt ?? null) as any,

    created_at: String(r.created_at ?? r.createdAt ?? ""),
    updated_at: String(r.updated_at ?? r.updatedAt ?? ""),

    posted_at: (r.posted_at ?? r.postedAt ?? null) as any,
    manuscript_status: (manuscriptStatusRaw ?? null) as any,
    is_archived: (isArchivedRaw ?? null) as any,
  };
}

function normalizeJobs(arr: any): JobRow[] {
  if (!Array.isArray(arr)) return [];
  return arr.map(normalizeJobRow).filter((x) => !!x.id);
}



async function fetchJobsByCompany(companyId: string): Promise<JobsRes> {
  const cid = encodeURIComponent(companyId);

  const candidates = [`/api/companies/${cid}/jobs`, `/api/jobs?companyId=${cid}`, `/api/company/${cid}/jobs`];

  for (const url of candidates) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      const json = (await res.json()) as any;

      if (res.ok && json && json.ok === true) {
        const raw = Array.isArray(json.jobs) ? json.jobs : Array.isArray(json.items) ? json.items : [];
        return { ok: true, jobs: normalizeJobs(raw), debug: json.debug };
      }
    } catch {}
  }

  return { ok: false, error: { message: "jobs load failed" } };
}

async function patchJob(jobId: string, body: any): Promise<boolean> {
  try {
    const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as any;
    return !!(res.ok && json && json.ok === true);
  } catch {
    return false;
  }
}



const STATUS_OPTIONS = ["運用中", "停止中", "アーカイブ"] as const;
type ManuscriptStatus = (typeof STATUS_OPTIONS)[number];

function normalizeStatus(v: any): ManuscriptStatus {
  const s = String(v ?? "").trim();
  if (s === "停止中") return "停止中";
  if (s === "アーカイブ") return "アーカイブ";
  return "運用中";
}

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
};

const SITE_ICON_SRC: Record<string, string> = {
  Indeed: "/site_indeed.png",
  求人BOX: "/site_kyujinbox.png",
  AirWork: "/site_airwork.png",
  Engage: "/site_engage.png",
  採用係長: "/site_saiyokakaricho.png",
  はたらきんぐ: "/site_hataraking.png",
  げんきワーク: "/site_genkiwork.png",
  ハローワーク: "/site_hellowork.png",
  ジモティー: "/site_jmty.png",
};

type SiteStatus = "掲載中" | "媒体審査中" | "資料待ち" | "停止中" | "NG" | "準備中";

function getSiteStatus(job: JobRow, siteKey: string): SiteStatus {
  const base = coerceObject(job.site_status ?? null);
  const cur = base?.[siteKey];
  const s = String(cur?.status ?? "").trim();
  if (s === "掲載中" || s === "媒体審査中" || s === "資料待ち" || s === "停止中" || s === "NG" || s === "準備中") {
    return s as SiteStatus;
  }
  return "準備中";
}

function setSiteStatus(nextSiteStatus: any, siteKey: string, status: SiteStatus) {
  const base = coerceObject(nextSiteStatus) ?? {};
  const prev = base?.[siteKey] && typeof base[siteKey] === "object" ? base[siteKey] : {};
  return {
    ...base,
    [siteKey]: {
      ...prev,
      status,
      updatedAt: new Date().toISOString(),
    },
  };
}



function siteSlotBtnCls(on: boolean, saving: boolean) {
  return cls(
    "relative inline-flex h-[40px] w-[40px] shrink-0 aspect-square items-center justify-center rounded-full box-border",
    "transition select-none",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/35",
    "border-2",
    saving ? "opacity-60 pointer-events-none" : "",
    on ? "bg-emerald-500/[0.06] border-emerald-400/50 dark:bg-emerald-500/10 dark:border-emerald-400/60" : "border-transparent hover:bg-slate-900/[0.035] dark:hover:bg-slate-100/[0.05]"
  );
}

function siteImgCls(on: boolean) {
  return cls("h-[24px] w-[24px] object-contain transition", on ? "opacity-100" : "opacity-30 grayscale");
}

function SiteIconButton({
  siteKey,
  on,
  saving,
  onClick,
}: {
  siteKey: string;
  on: boolean;
  saving: boolean;
  onClick: () => void;
}) {
  const label = SITE_LABEL[siteKey] ?? siteKey;
  const src = SITE_ICON_SRC[siteKey] ?? "";

  return (
    <button
      type="button"
      className={siteSlotBtnCls(on, saving)}
      onClick={onClick}
      aria-label={`${label} を ${on ? "停止" : "掲載"}`}
      title={`${label}: ${on ? "掲載中" : "未掲載"}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={label} className={siteImgCls(on)} />
    </button>
  );
}

export default function CompanyJobsPage() {
  const params = useParams<{ companyId: string }>();
  const companyId = useMemo(() => String(params.companyId ?? ""), [params.companyId]);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [jobs, setJobs] = useState<JobRow[]>([]);

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "archived">("active");
  const [siteFilter, setSiteFilter] = useState<string>("");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [applicantCounts, setApplicantCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setErr("");
      try {
        const res = await fetchJobsByCompany(companyId);
        if (!alive) return;

        if (!res.ok) {
          setJobs([]);
          setErr(res.error.message);
          return;
        }

        // デバッグしたい場合だけ一時的に有効化
        // console.log("jobs sample:", res.jobs?.[0]);

        const list = Array.isArray(res.jobs) ? res.jobs : [];
        setJobs(list);
        setApplicantCounts(Object.fromEntries(list.map((j) => [j.id, Number(j.applicants_count ?? 0)])));
      } catch (e: any) {
        if (!alive) return;
        setJobs([]);
        setErr(String(e?.message ?? e));
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [companyId]);

  async function reload() {
    setLoading(true);
    setErr("");
    const res = await fetchJobsByCompany(companyId);
    if (!res.ok) {
      setJobs([]);
      setErr(res.error.message);
      setLoading(false);
      return;
    }
    setJobs(res.jobs);
    setApplicantCounts(Object.fromEntries(res.jobs.map((j) => [j.id, Number(j.applicants_count ?? 0)])));
    setLoading(false);
  }

  const sitesInUi = useMemo(() => SITE_ORDER.filter((s) => !!SITE_ICON_SRC[s]), []);

  const view = useMemo(() => {
    const text = q.trim().toLowerCase();

    const mapped = jobs.map((j) => {
      const title = String(j.job_title ?? "").trim();
      const start = pickStartDate(j);
      const since = start ? daysSince(start) : null;

      const explicitArchived = j.is_archived === true || normalizeStatus(j.manuscript_status) === "アーカイブ";
      const status = explicitArchived ? "アーカイブ" : normalizeStatus(j.manuscript_status);

      const onSites = sitesInUi.filter((s) => getSiteStatus(j, s) === "掲載中");

      return { j, title, start, since, status: status as ManuscriptStatus, onSites };
    });

    const filtered = mapped.filter((x) => {
      const titleOk = !text || x.title.toLowerCase().includes(text);
      if (!titleOk) return false;

      if (statusFilter === "archived" && x.status !== "アーカイブ") return false;
      if (statusFilter === "active" && x.status === "アーカイブ") return false;

if (siteFilter) {
  const list = Array.isArray((x as any).onSites) ? (x as any).onSites : [];
  if (!list.includes(siteFilter)) return false;
}


      return true;
    });

    filtered.sort((a, b) => String(b.j.updated_at ?? "").localeCompare(String(a.j.updated_at ?? "")));

    return filtered;
  }, [jobs, q, statusFilter, siteFilter, sitesInUi]);

  async function onChangeStatus(job: JobRow, next: ManuscriptStatus) {
    const ok = await patchJob(job.id, {
      companyId: job.company_id ?? companyId,
      companyName: job.company_name ?? "",
      jobTitle: job.job_title ?? "",
      employmentType: job.employment_type ?? "",
      siteStatus: job.site_status ?? null,
      manuscriptStatus: next,
      isArchived: next === "アーカイブ",
    });

    if (!ok) {
      alert("更新に失敗しました");
      return;
    }

    await reload();
  }

  async function archiveWithTitle(job: JobRow) {
    const title = String(job.job_title ?? "").trim() || "求人";
    const archiveTitle = window.prompt("アーカイブ名", `${title} / ${new Date().toLocaleDateString()}`);
    if (archiveTitle == null) return;
    const at = archiveTitle.trim();
    if (!at) return;

    // アーカイブ前にローカルの応募数をDBに反映（RPCがDB値を読むため）
    const localCount = applicantCounts[job.id] ?? 0;
    if (localCount !== Number(job.applicants_count ?? 0)) {
      await patchJob(job.id, { applicantsCount: localCount });
    }

    const ok = await patchJob(job.id, {
      companyId: job.company_id ?? companyId,
      companyName: job.company_name ?? "",
      jobTitle: job.job_title ?? "",
      employmentType: job.employment_type ?? "",
      siteStatus: job.site_status ?? null,
      archiveTitle: at,
      manuscriptStatus: "アーカイブ",
      isArchived: true,
    });

    if (!ok) {
      alert("アーカイブに失敗しました");
      return;
    }

    await reload();
  }

  async function toggleSite(job: JobRow, siteKey: string) {
    const current = getSiteStatus(job, siteKey);
    const next: SiteStatus = current === "掲載中" ? "停止中" : "掲載中";

    const label = SITE_LABEL[siteKey] ?? siteKey;
    const okPrompt = window.confirm(`${label} を「${next}」に切り替えますか？`);
    if (!okPrompt) return;

    const nextSiteStatus = setSiteStatus(job.site_status ?? null, siteKey, next);

    const k = `${job.id}:${siteKey}`;
    setSavingKey(k);

    const ok = await patchJob(job.id, {
      companyId: job.company_id ?? companyId,
      companyName: job.company_name ?? "",
      jobTitle: job.job_title ?? "",
      employmentType: job.employment_type ?? "",
      siteStatus: nextSiteStatus,
      toggledSite: siteKey,
      toggledSiteStatus: next,
    });

    setSavingKey(null);

    if (!ok) {
      alert("媒体更新に失敗しました");
      return;
    }

    // ここでローカルは確実に反映
    setJobs((prev) => prev.map((x) => (x.id === job.id ? { ...x, site_status: nextSiteStatus } : x)));
  }

  return (
    <main className="space-y-4">
      <HeroGradient>
        <div className={heroHdrCls()}>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm">
              <Link href="/companies" className="cv-link">
                会社一覧
              </Link>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <Link href={`/companies/${encodeURIComponent(companyId)}`} className="cv-link">
                会社
              </Link>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <span className="truncate font-semibold text-slate-900 dark:text-slate-100">求人原稿</span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="タイトル検索"
                className="cv-input w-[260px] min-h-[36px] py-1 text-sm"
              />

              <select className={selectCls()} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
                <option value="active">アクティブ</option>
                <option value="archived">アーカイブ</option>
                <option value="all">すべて</option>
              </select>

              <select className={selectCls()} value={siteFilter} onChange={(e) => setSiteFilter(String(e.target.value))}>
                <option value="">媒体: すべて</option>
                {sitesInUi.map((s) => (
                  <option key={s} value={s}>
                    {SITE_LABEL[s] ?? s}
                  </option>
                ))}
              </select>

              <button type="button" className={actionBtnCls()} onClick={reload} disabled={loading}>
                {loading ? "更新中…" : "更新"}
              </button>

              <Link href={`/companies/${encodeURIComponent(companyId)}/jobs/new`} className={actionBtnCls()}>
                求人追加
              </Link>
            </div>
          </div>
        </div>
      </HeroGradient>

      {err ? <div className="rounded-2xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-4 text-sm text-rose-800 dark:text-rose-200">{err}</div> : null}

      <div className="cv-panel overflow-hidden">
        <div
          className="grid grid-cols-12 gap-4 border-b px-5 py-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400"
          style={{ borderColor: "var(--border)" }}
        >
          {/* タイトル3 / 開始1 / 経過1 / 媒体4 / 応募1 / 状態2 */}
          <div className="col-span-3">タイトル</div>
          <div className="col-span-1">掲載開始</div>
          <div className="col-span-1">掲載経過</div>
          <div className="col-span-4">掲載媒体</div>
          <div className="col-span-1">応募</div>
          <div className="col-span-2 text-right">状態</div>
        </div>

        <div className="divide-y" style={{ borderColor: "var(--border)" }}>
          {loading && jobs.length === 0 ? <div className="px-5 py-4 text-sm text-slate-600 dark:text-slate-400">読み込み中...</div> : null}

          {!loading && view.length === 0 ? <div className="px-5 py-6 text-sm text-slate-700 dark:text-slate-300">該当なし</div> : null}

          {view.map(({ j, title, start, since, status }) => {
            const jobHref = `/companies/${encodeURIComponent(companyId)}/jobs/${encodeURIComponent(j.id)}`;
            const archived = status === "アーカイブ";

            return (
              <div key={j.id} className="group px-5 py-4 hover:bg-slate-50/70 dark:hover:bg-slate-700/30">
                <div className="grid grid-cols-12 items-center gap-4">
                  <div className="col-span-3 min-w-0">
                    <Link href={jobHref} className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-100 hover:text-slate-700 dark:hover:text-slate-300">
                      {title || "(未設定)"}
                    </Link>
                    <div className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
                      更新: <span className="tabular-nums">{formatLocalDate(j.updated_at)}</span>
                    </div>
                  </div>

                  <div className="col-span-1">
                    <div className="text-sm text-slate-800 dark:text-slate-200 tabular-nums">{start ? formatLocalDate(start) : "-"}</div>
                  </div>

                  <div className="col-span-1">
                    <div className="text-sm text-slate-800 dark:text-slate-200 tabular-nums">{since == null ? "-" : `${since}日`}</div>
                  </div>

                  <div className="col-span-4">
                    <div className="flex items-center gap-2 overflow-x-auto pr-2">
                      {sitesInUi.map((s) => {
                        const on = getSiteStatus(j, s) === "掲載中";
                        const k = `${j.id}:${s}`;
                        const saving = savingKey === k;

                        return (
                          <SiteIconButton
                            key={s}
                            siteKey={s}
                            on={on}
                            saving={saving}
                            onClick={() => void toggleSite(j, s)}
                          />
                        );
                      })}
                    </div>
                  </div>

                  <div className="col-span-1">
                    <input
                      type="number"
                      min={0}
                      className="cv-input w-full min-h-[36px] py-1 text-sm tabular-nums"
                      value={applicantCounts[j.id] ?? 0}
                      onChange={(e) => {
                        const v = Math.max(0, Math.trunc(Number(e.target.value) || 0));
                        setApplicantCounts((prev) => ({ ...prev, [j.id]: v }));
                      }}
                      onBlur={async () => {
                        const v = applicantCounts[j.id] ?? 0;
                        if (v === Number(j.applicants_count ?? 0)) return;
                        const ok = await patchJob(j.id, { applicantsCount: v });
                        if (!ok) alert("応募数の保存に失敗しました");
                        else setJobs((prev) => prev.map((x) => (x.id === j.id ? { ...x, applicants_count: v } : x)));
                      }}
                    />
                  </div>

                  <div className="col-span-2 flex items-center justify-end gap-2">
                    <select
                      className={selectCls()}
                      value={status}
                      onChange={(e) => {
                        const next = normalizeStatus(e.target.value);
                        if (next === "アーカイブ") void archiveWithTitle(j);
                        else void onChangeStatus(j, next);
                      }}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>

                    <Link href={jobHref} className={iconBtnCls()} title="開く" aria-label="開く">
                      <span className="inline-flex items-center justify-center">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M14 3h7v7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path
                            d="M21 14v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    </Link>

                    {!archived ? (
                      <IconBtn title="アーカイブ" onClick={() => void archiveWithTitle(j)}>
                        <span className="inline-flex items-center justify-center">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path
                              d="M21 8v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path d="M10 12h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path
                              d="M22 3H2v5h20V3Z"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                      </IconBtn>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
