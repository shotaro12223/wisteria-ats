"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";

import type { Job, JobSite } from "@/lib/types";
import { SITE_TEMPLATES, JOB_SITES } from "@/lib/templates";
import { getTemplateFieldValue } from "@/lib/render";

import { JobForm } from "@/components/JobForm";
import { JobSiteStatusBar } from "@/components/JobSiteStatusBar";
import JobApplicantsSummary from "@/components/JobApplicantsSummary";
import { TemplateSelector } from "@/components/TemplateSelector";
import JobArchivesPanel from "@/components/JobArchivesPanel";

type SaveStatus = "idle" | "saved";
type OutputItem = { label: string; value: string };

function formatLocalDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

type CompanyGetRes =
  | { ok: true; company: { id: string; company_name: string; created_at: string; updated_at: string } | null }
  | { ok: false; error: { message: string } };

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

  // 任意
  manuscript_status?: string | null;
  is_archived?: boolean | null;

  // 求人詳細コンテンツ（snake_case from DB）
  catch_copy?: string | null;
  job_category?: string | null;
  hiring_count?: string | null;
  postal_code?: string | null;
  prefecture_city_town?: string | null;
  address_line?: string | null;
  building_floor?: string | null;
  location_note?: string | null;
  nearest_station?: string | null;
  access?: string | null;
  work_style?: string | null;
  work_hours?: string | null;
  break_time?: string | null;
  avg_monthly_work_hours?: string | null;
  avg_monthly_work_days?: string | null;
  work_days_hours_required?: string | null;
  overtime_hours?: string | null;
  secondment?: string | null;
  pay_type?: string | null;
  gross_pay?: string | null;
  pay_min?: number | null;
  pay_max?: number | null;
  base_pay_and_allowance?: string | null;
  fixed_allowance?: string | null;
  fixed_overtime?: string | null;
  bonus?: string | null;
  raise?: string | null;
  annual_income_example?: string | null;
  pay_note?: string | null;
  holidays?: string | null;
  annual_holidays?: string | null;
  leave?: string | null;
  childcare_leave?: string | null;
  retirement_age?: string | null;
  job_description?: string | null;
  career_map?: string | null;
  appeal_points?: string | null;
  qualifications?: string | null;
  education_experience?: string | null;
  benefits?: string | null;
  social_insurance?: string | null;
  passive_smoking?: string | null;
  side_job?: string | null;
  probation?: string | null;
  probation_period?: string | null;
  probation_condition?: string | null;
  probation_pay_type?: string | null;
  probation_pay_min?: number | null;
  probation_pay_max?: number | null;
  probation_fixed_overtime?: string | null;
  probation_avg_monthly_work_hours?: string | null;
  probation_note?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  other?: string | null;
  tags?: string | null;
};

type JobGetRes = { ok: true; job: JobRow | null } | { ok: false; error: { message: string } };
type JobPatchRes = { ok: true; job: JobRow } | { ok: false; error: { message: string } };

function rowToJob(r: JobRow, fallbackCompanyId: string, fallbackCompanyName: string): Job {
  return {
    id: r.id,
    companyId: r.company_id ?? fallbackCompanyId,
    companyName: r.company_name ?? fallbackCompanyName,
    jobTitle: r.job_title ?? "",
    employmentType: r.employment_type ?? "",
    siteStatus: r.site_status ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,

    applicantsCount: (r as any).applicants_count ?? 0,
    counterStartedAt: (r as any).counter_started_at ?? null,

    manuscriptStatus: (r as any).manuscript_status ?? null,
    isArchived: (r as any).is_archived ?? null,

    // 求人詳細コンテンツ（snake_case → camelCase）
    catchCopy: r.catch_copy ?? "",
    jobCategory: r.job_category ?? "",
    hiringCount: r.hiring_count ?? "",
    postalCode: r.postal_code ?? "",
    prefectureCityTown: r.prefecture_city_town ?? "",
    addressLine: r.address_line ?? "",
    buildingFloor: r.building_floor ?? "",
    locationNote: r.location_note ?? "",
    nearestStation: r.nearest_station ?? "",
    access: r.access ?? "",
    workStyle: r.work_style ?? "",
    workHours: r.work_hours ?? "",
    breakTime: r.break_time ?? "",
    avgMonthlyWorkHours: r.avg_monthly_work_hours ?? "",
    avgMonthlyWorkDays: r.avg_monthly_work_days ?? "",
    workDaysHoursRequired: r.work_days_hours_required ?? "",
    overtimeHours: r.overtime_hours ?? "",
    secondment: r.secondment ?? "",
    payType: r.pay_type ?? "",
    grossPay: r.gross_pay ?? "",
    payMin: r.pay_min ?? null,
    payMax: r.pay_max ?? null,
    basePayAndAllowance: r.base_pay_and_allowance ?? "",
    fixedAllowance: r.fixed_allowance ?? "",
    fixedOvertime: r.fixed_overtime ?? "",
    bonus: r.bonus ?? "",
    raise: r.raise ?? "",
    annualIncomeExample: r.annual_income_example ?? "",
    payNote: r.pay_note ?? "",
    holidays: r.holidays ?? "",
    annualHolidays: r.annual_holidays ?? "",
    leave: r.leave ?? "",
    childcareLeave: r.childcare_leave ?? "",
    retirementAge: r.retirement_age ?? "",
    jobDescription: r.job_description ?? "",
    careerMap: r.career_map ?? "",
    appealPoints: r.appeal_points ?? "",
    qualifications: r.qualifications ?? "",
    educationExperience: r.education_experience ?? "",
    benefits: r.benefits ?? "",
    socialInsurance: r.social_insurance ?? "",
    passiveSmoking: r.passive_smoking ?? "",
    sideJob: r.side_job ?? "",
    probation: r.probation ?? "",
    probationPeriod: r.probation_period ?? "",
    probationCondition: r.probation_condition ?? "",
    probationPayType: r.probation_pay_type ?? "",
    probationPayMin: r.probation_pay_min ?? null,
    probationPayMax: r.probation_pay_max ?? null,
    probationFixedOvertime: r.probation_fixed_overtime ?? "",
    probationAvgMonthlyWorkHours: r.probation_avg_monthly_work_hours ?? "",
    probationNote: r.probation_note ?? "",
    contactEmail: r.contact_email ?? "",
    contactPhone: r.contact_phone ?? "",
    other: r.other ?? "",
    tags: r.tags ?? "",
  } as any;
}

function cls(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function outputItemBox(copied: boolean) {
  return [
    "rounded-2xl border p-4 text-sm shadow-sm",
    copied ? "border-emerald-300 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/40" : "bg-white dark:bg-slate-800 border-[var(--border)]",
  ].join(" ");
}

function actionBtnCls() {
  return [
    "inline-flex items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold",
    "border border-[var(--border)] bg-white dark:bg-slate-800 shadow-sm",
    "text-slate-900 dark:text-slate-100",
    "hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)] transition",
  ].join(" ");
}

function selectCls() {
  return ["cv-input", "min-h-[36px]", "py-1", "text-sm"].join(" ");
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
    <div
      ref={heroRef}
      className="relative overflow-hidden rounded-2xl border bg-white dark:bg-slate-800 shadow-sm"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-white to-purple-50/50 dark:from-blue-950/30 dark:via-slate-800 dark:to-purple-950/30" />
        <div className="hero-parallax absolute -inset-24">
          <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-blue-200/14 dark:bg-blue-500/10 blur-3xl" />
          <div className="absolute -right-44 -bottom-44 h-[560px] w-[560px] rounded-full bg-purple-200/12 dark:bg-purple-500/10 blur-3xl" />
          <div className="absolute left-1/2 top-[-180px] h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-indigo-200/10 dark:bg-indigo-500/10 blur-3xl" />
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

const MANUSCRIPT_STATUSES = ["運用中", "停止中", "アーカイブ"] as const;
type ManuscriptStatus = (typeof MANUSCRIPT_STATUSES)[number];

function normalizeManuscriptStatus(v: any): ManuscriptStatus {
  const s = String(v ?? "").trim();
  if (s === "停止中") return "停止中";
  if (s === "アーカイブ") return "アーカイブ";
  return "運用中";
}

export default function CompanyJobDetailPage() {
  const params = useParams<{ companyId: string; jobId: string }>();

  const companyId = useMemo(() => String(params.companyId ?? ""), [params.companyId]);
  const jobId = useMemo(() => String(params.jobId ?? ""), [params.jobId]);

  const [companyName, setCompanyName] = useState("");
  const [job, setJob] = useState<Job | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const savedTimerRef = useRef<number | null>(null);

  const [site, setSite] = useState<JobSite>("採用係長");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [openJobForm, setOpenJobForm] = useState(false);

  const [manuscriptStatus, setManuscriptStatus] = useState<ManuscriptStatus>("運用中");

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) window.clearTimeout(savedTimerRef.current);
    };
  }, []);

  function showSavedOnce() {
    setSaveStatus("saved");
    if (savedTimerRef.current) window.clearTimeout(savedTimerRef.current);
    savedTimerRef.current = window.setTimeout(() => {
      setSaveStatus("idle");
      savedTimerRef.current = null;
    }, 1400);
  }

  async function loadAll(cid: string, jid: string) {
    setNotFound(false);
    setJob(null);

    const cRes = await fetch(`/api/companies/${encodeURIComponent(cid)}`, { cache: "no-store" });
    const cJson = (await cRes.json()) as CompanyGetRes;
    const cname = cRes.ok && cJson.ok && cJson.company ? String(cJson.company.company_name ?? "") : "";
    setCompanyName(cname);

    const jRes = await fetch(`/api/jobs/${encodeURIComponent(jid)}`, { cache: "no-store" });
    const jJson = (await jRes.json()) as JobGetRes;

    if (!jRes.ok || !jJson.ok || !jJson.job) {
      setNotFound(true);
      return;
    }

    const dbCid = String(jJson.job.company_id ?? "");
    if (dbCid && dbCid !== cid) {
      setNotFound(true);
      return;
    }

    const nextJob = rowToJob(jJson.job, cid, cname);
    setJob(nextJob);
    setSaveStatus("idle");

    const ms = normalizeManuscriptStatus((jJson.job as any).manuscript_status ?? (nextJob as any).manuscriptStatus);
    setManuscriptStatus(ms);
  }

  useEffect(() => {
    if (!companyId || !jobId) return;
    void loadAll(companyId, jobId);
  }, [companyId, jobId]);

  async function patch(body: any) {
    const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify(body),
    });

    const json = (await res.json()) as JobPatchRes;
    if (!res.ok || !json.ok) {
      alert(!json.ok ? json.error.message : `保存に失敗しました (status: ${res.status})`);
      return null;
    }

    return json.job;
  }

  async function handleSave() {
    if (!job) return;

    const title = String(job.jobTitle ?? "").trim();
    if (!title) {
      alert("職種を入力してください。");
      return;
    }

    const archiveTitle = window.prompt("アーカイブ名", `${title} / ${new Date().toLocaleDateString()}`);
    if (archiveTitle == null) return;
    const at = archiveTitle.trim();
    if (!at) return;

    const row = await patch({
      companyId,
      companyName: job.companyName || companyName || "",
      jobTitle: title,
      employmentType: (job as any).employmentType ?? "",
      siteStatus: (job as any).siteStatus ?? null,

      archiveTitle: at,

      manuscriptStatus: "アーカイブ",
      isArchived: true,
    });

    if (!row) return;

    setJob(rowToJob(row, companyId, companyName || ""));
    setManuscriptStatus("アーカイブ");
    showSavedOnce();
  }

  async function handleSiteStatusUpdate(next: Job) {
    setJob(next);

    const n = next as any;
    const row = await patch({
      companyId,
      companyName: next.companyName || companyName || "",
      jobTitle: next.jobTitle || "",
      employmentType: n.employmentType ?? "",
      siteStatus: n.siteStatus ?? null,
      manuscriptStatus,

      // 求人詳細コンテンツ
      catchCopy: n.catchCopy ?? "",
      jobCategory: n.jobCategory ?? "",
      hiringCount: n.hiringCount ?? "",
      postalCode: n.postalCode ?? "",
      prefectureCityTown: n.prefectureCityTown ?? "",
      addressLine: n.addressLine ?? "",
      buildingFloor: n.buildingFloor ?? "",
      locationNote: n.locationNote ?? "",
      nearestStation: n.nearestStation ?? "",
      access: n.access ?? "",
      workStyle: n.workStyle ?? "",
      workHours: n.workHours ?? "",
      breakTime: n.breakTime ?? "",
      avgMonthlyWorkHours: n.avgMonthlyWorkHours ?? "",
      avgMonthlyWorkDays: n.avgMonthlyWorkDays ?? "",
      workDaysHoursRequired: n.workDaysHoursRequired ?? "",
      overtimeHours: n.overtimeHours ?? "",
      secondment: n.secondment ?? "",
      payType: n.payType ?? "",
      grossPay: n.grossPay ?? "",
      payMin: n.payMin ?? null,
      payMax: n.payMax ?? null,
      basePayAndAllowance: n.basePayAndAllowance ?? "",
      fixedAllowance: n.fixedAllowance ?? "",
      fixedOvertime: n.fixedOvertime ?? "",
      bonus: n.bonus ?? "",
      raise: n.raise ?? "",
      annualIncomeExample: n.annualIncomeExample ?? "",
      payNote: n.payNote ?? "",
      holidays: n.holidays ?? "",
      annualHolidays: n.annualHolidays ?? "",
      leave: n.leave ?? "",
      childcareLeave: n.childcareLeave ?? "",
      retirementAge: n.retirementAge ?? "",
      jobDescription: n.jobDescription ?? "",
      careerMap: n.careerMap ?? "",
      appealPoints: n.appealPoints ?? "",
      qualifications: n.qualifications ?? "",
      educationExperience: n.educationExperience ?? "",
      benefits: n.benefits ?? "",
      socialInsurance: n.socialInsurance ?? "",
      passiveSmoking: n.passiveSmoking ?? "",
      sideJob: n.sideJob ?? "",
      probation: n.probation ?? "",
      probationPeriod: n.probationPeriod ?? "",
      probationCondition: n.probationCondition ?? "",
      probationPayType: n.probationPayType ?? "",
      probationPayMin: n.probationPayMin ?? null,
      probationPayMax: n.probationPayMax ?? null,
      probationFixedOvertime: n.probationFixedOvertime ?? "",
      probationAvgMonthlyWorkHours: n.probationAvgMonthlyWorkHours ?? "",
      probationNote: n.probationNote ?? "",
      contactEmail: n.contactEmail ?? "",
      contactPhone: n.contactPhone ?? "",
      other: n.other ?? "",
      tags: n.tags ?? "",
    });

    if (!row) return;

    setJob(rowToJob(row, companyId, companyName || ""));
    showSavedOnce();
  }

  async function handleManuscriptStatusChange(next: ManuscriptStatus) {
    if (!job) return;

    if (next === "アーカイブ") {
      await handleSave();
      return;
    }

    setManuscriptStatus(next);

    const row = await patch({
      companyId,
      companyName: job.companyName || companyName || "",
      jobTitle: job.jobTitle || "",
      employmentType: (job as any).employmentType ?? "",
      siteStatus: (job as any).siteStatus ?? null,

      manuscriptStatus: next,
      isArchived: false,
    });

    if (!row) return;

    setJob(rowToJob(row, companyId, companyName || ""));
    showSavedOnce();
  }

  const template = useMemo(() => SITE_TEMPLATES.find((t) => t.site === site)!, [site]);

  const outputs: OutputItem[] = useMemo(() => {
    if (!job) return [];
    return template.fields
      .map((f) => {
        const v = getTemplateFieldValue(job, f);
        if (!v || v.trim().length === 0) return null;
        return { label: f.label, value: v };
      })
      .filter(Boolean) as OutputItem[];
  }, [job, template]);

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 900);
  }

  if (notFound) {
    return (
      <main className="space-y-4">
        <div className="cv-panel p-8">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Not Found</h1>
          <div className="mt-5">
            <Link href={`/companies/${companyId}`} className="cv-btn-secondary">
              ← 戻る
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!job) {
    return (
      <main className="space-y-4">
        <div className="cv-panel p-6 text-sm text-slate-600 dark:text-slate-400">読み込み中...</div>
      </main>
    );
  }

  return (
    <main className="space-y-4">
      <div className="sticky top-0 z-30">
        <HeroGradient>
          <div className="px-5 py-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm">
                  <Link href="/companies" className="cv-link">
                    会社一覧
                  </Link>
                  <span className="text-slate-300 dark:text-slate-600">/</span>
                  <Link href={`/companies/${companyId}`} className="cv-link">
                    {companyName || "会社"}
                  </Link>
                  <span className="text-slate-300 dark:text-slate-600">/</span>
                  <span className="truncate font-semibold text-slate-900 dark:text-slate-100">{job.jobTitle || "求人詳細"}</span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                  {saveStatus === "saved" ? <span className="cv-badge">保存済み</span> : null}
                  <span className="rounded-full border bg-white/70 dark:bg-slate-700/70 px-3 py-1" style={{ borderColor: "var(--border)" }}>
                    更新: <span className="font-medium text-slate-800 dark:text-slate-200">{formatLocalDateTime(job.updatedAt)}</span>
                  </span>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <select
                  className={selectCls()}
                  value={manuscriptStatus}
                  onChange={(e) => void handleManuscriptStatusChange(normalizeManuscriptStatus(e.target.value))}
                >
                  {MANUSCRIPT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>

                <button type="button" className="cv-btn-primary" onClick={() => void handleSave()}>
                  アーカイブ
                </button>

                <Link href={`/companies/${encodeURIComponent(companyId)}/jobs`} className={actionBtnCls()}>
                  原稿一覧
                </Link>
              </div>
            </div>

            <div className="mt-4">
              <JobSiteStatusBar job={job} onUpdate={handleSiteStatusUpdate} />
            </div>
          </div>
        </HeroGradient>
      </div>

      <section className="cv-panel p-5">
        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">応募サマリ</div>
        <div className="mt-3">
          <JobApplicantsSummary companyId={companyId} jobId={jobId} />
        </div>
      </section>

      <section className="cv-panel p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">出力</div>
          <div className="flex items-center gap-2">
            <TemplateSelector value={site} options={JOB_SITES} onChange={setSite} />
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {outputs.length === 0 ? (
            <div
              className="rounded-2xl border bg-[var(--surface-muted)] p-4 text-sm text-slate-600 dark:text-slate-400"
              style={{ borderColor: "var(--border)" }}
            >
              —
            </div>
          ) : (
            outputs.map((o, idx) => {
              const key = `${site}-${o.label}-${idx}`;
              const copied = copiedKey === key;

              return (
                <div key={key} className={outputItemBox(copied)} style={{ borderColor: copied ? undefined : "var(--border)" }}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="min-w-0 text-xs font-semibold text-slate-700 dark:text-slate-300">{o.label}</div>
                    <button
                      className="shrink-0 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:underline"
                      onClick={() => copy(o.value, key)}
                    >
                      {copied ? "コピー済み" : "コピー"}
                    </button>
                  </div>

                  <div className="whitespace-pre-wrap break-words text-slate-900 dark:text-slate-100">{o.value}</div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="cv-panel overflow-hidden">
        <div className="border-b px-5 py-4" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">編集</div>
            <button type="button" className="cv-btn-secondary" onClick={() => setOpenJobForm((v) => !v)} aria-expanded={openJobForm}>
              {openJobForm ? "閉じる" : "開く"}
            </button>
          </div>
        </div>

        <div className="px-5 py-5">
          {openJobForm ? (
            <div className="cv-panel p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">原稿</div>
                <button type="button" className="cv-btn-primary" onClick={() => void handleSiteStatusUpdate(job)}>
                  保存
                </button>
              </div>

              <div className="h-px w-full bg-slate-100 dark:bg-slate-700" />

              <div className="mt-4">
                <JobForm job={job} onChange={setJob} />
              </div>
            </div>
          ) : (
            <div
              className="rounded-2xl border bg-[var(--surface-muted)] p-5 text-sm text-slate-700 dark:text-slate-400"
              style={{ borderColor: "var(--border)" }}
            >
              —
            </div>
          )}
        </div>
      </section>

      <JobArchivesPanel jobId={jobId} />
    </main>
  );
}
