import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseRoute";

export const dynamic = "force-dynamic";

type ApplicantStatus = "NEW" | "DOC" | "資料待ち" | "INT" | "媒体審査中" | "OFFER" | "内定" | "NG";

interface JobSiteState {
  status: string;
  updatedAt: string;
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

function canonSiteKey(k: any): string {
  const s = String(k ?? "").trim();
  if (!s) return "Direct";

  const low = s.toLowerCase();

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

  return s;
}

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

function inferSiteKeyFromContent(it: { fromEmail: string; subject: string; snippet: string | null }): string | null {
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

function resolvedSiteKey(it: { fromEmail: string; subject: string; snippet: string | null; siteKey: string }): string {
  const first = canonSiteKey(inferSiteKeyFromFromEmail(it.fromEmail, it.siteKey, it.subject));
  if (first !== "Direct") return first;

  const inferred = inferSiteKeyFromContent(it);
  if (inferred) return canonSiteKey(inferred);

  const saved = canonSiteKey(it.siteKey);
  if (saved !== "Direct") return saved;

  return "Direct";
}

function getJobPostedSiteKeys(job: any): string[] {
  const st = job?.siteStatus ?? job?.site_status;
  if (!st || typeof st !== "object") return [];
  return Object.keys(st)
    .map((k) => canonSiteKey(k))
    .filter(Boolean);
}

function getJobLatestUpdate(job: any): string {
  const st = job?.siteStatus ?? job?.site_status;
  if (!st || typeof st !== "object") return "";

  const dates = Object.values(st).map((v: any) => v?.updatedAt ?? v?.updated_at ?? "").filter(Boolean);
  if (dates.length === 0) return "";

  dates.sort();
  return dates[dates.length - 1] as string;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ companyId: string }> }
) {
  const { companyId } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const ym = searchParams.get("ym") || currentYm();

  const { supabase } = supabaseRoute(req);

  try {
    // Fetch company
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("*")
      .eq("id", companyId)
      .single();

    if (companyError || !company) {
      return NextResponse.json(
        { ok: false, error: { message: "Company not found" } },
        { status: 404 }
      );
    }

    // Fetch jobs for this company
    const { data: jobs, error: jobsError } = await supabase
      .from("jobs")
      .select("*")
      .eq("company_id", companyId);

    if (jobsError) {
      return NextResponse.json(
        { ok: false, error: { message: jobsError.message } },
        { status: 500 }
      );
    }

    const allJobs = jobs ?? [];

    // Fetch applicants for this company
    const { data: applicants, error: applicantsError } = await supabase
      .from("applicants")
      .select("*")
      .eq("company_id", companyId);

    if (applicantsError) {
      return NextResponse.json(
        { ok: false, error: { message: applicantsError.message } },
        { status: 500 }
      );
    }

    const allApplicants = applicants ?? [];

    // Fetch gmail inbox for this company
    const { data: inboxItems, error: inboxError } = await supabase
      .from("gmail_inbox_messages")
      .select("*")
      .eq("company_id", companyId)
      .order("received_at", { ascending: false });

    if (inboxError) {
      return NextResponse.json(
        { ok: false, error: { message: inboxError.message } },
        { status: 500 }
      );
    }

    const allInbox = inboxItems ?? [];

    // Filter inbox by ym
    const filteredInbox = ym === "ALL"
      ? allInbox
      : allInbox.filter(it => isInYmIso(it.received_at, ym));

    const prevYmStr = prevYm();
    const prevInbox = allInbox.filter(it => isInYmIso(it.received_at, prevYmStr));

    // KPI calculations
    const applicationsThisMonth = filteredInbox.length;
    const applicationsLastMonth = prevInbox.length;
    const activeJobs = allJobs.filter(j => {
      const st = j.site_status ?? {};
      return Object.values(st).some((v: any) => v?.status === "掲載中");
    }).length;
    const avgAppPerJob = activeJobs > 0 ? applicationsThisMonth / activeJobs : 0;

    const offers = allApplicants.filter(a => {
      const status = a.status ?? "";
      return status === "OFFER" || status === "内定";
    }).length;

    const conversionRate = applicationsThisMonth > 0 ? (offers / applicationsThisMonth) * 100 : 0;

    // Site performance
    const postedBySite = new Map<string, number>();
    for (const j of allJobs) {
      for (const k of getJobPostedSiteKeys(j)) {
        postedBySite.set(k, (postedBySite.get(k) ?? 0) + 1);
      }
    }

    const appsBySite = new Map<string, number>();
    for (const it of filteredInbox) {
      const key = resolvedSiteKey({
        fromEmail: it.from_email,
        subject: it.subject,
        snippet: it.snippet,
        siteKey: it.site_key
      });
      appsBySite.set(key, (appsBySite.get(key) ?? 0) + 1);
    }

    const allSiteKeys = new Set([...postedBySite.keys(), ...appsBySite.keys()]);
    const sitePerformance = Array.from(allSiteKeys).map(siteKey => {
      const posted = postedBySite.get(siteKey) ?? 0;
      const apps = appsBySite.get(siteKey) ?? 0;
      const rate = posted > 0 ? apps / posted : null;
      return { siteKey, posted, applications: apps, rate };
    }).sort((a, b) => b.applications - a.applications);

    // Job performance
    const appsByJob = new Map<string, number>();
    const sitesByJob = new Map<string, Map<string, number>>();

    for (const it of filteredInbox) {
      const jobId = it.job_id;
      if (!jobId) continue;

      appsByJob.set(jobId, (appsByJob.get(jobId) ?? 0) + 1);

      const key = resolvedSiteKey({
        fromEmail: it.from_email,
        subject: it.subject,
        snippet: it.snippet,
        siteKey: it.site_key
      });

      const m = sitesByJob.get(jobId) ?? new Map<string, number>();
      m.set(key, (m.get(key) ?? 0) + 1);
      sitesByJob.set(jobId, m);
    }

    const jobPerformance = allJobs.map(job => {
      const jobId = job.id;
      const apps = appsByJob.get(jobId) ?? 0;
      const postedSites = getJobPostedSiteKeys(job);
      const siteMap = sitesByJob.get(jobId);
      const topSite = siteMap
        ? Array.from(siteMap.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
        : null;

      const lastUpdate = getJobLatestUpdate(job);
      const daysSinceUpdate = lastUpdate
        ? Math.floor((Date.now() - new Date(lastUpdate).getTime()) / (1000 * 60 * 60 * 24))
        : null;

      return {
        jobId,
        jobTitle: job.job_title ?? "(求人名未設定)",
        postedSites: postedSites.length,
        applications: apps,
        topSite,
        lastUpdate,
        daysSinceUpdate,
        hasAlert: apps === 0 && daysSinceUpdate !== null && daysSinceUpdate > 14
      };
    }).sort((a, b) => b.applications - a.applications);

    // Applicant flow
    const statusGroups = {
      NEW: ["NEW"],
      DOC: ["DOC", "資料待ち"],
      INT: ["INT", "媒体審査中"],
      OFFER: ["OFFER", "内定"],
      NG: ["NG"]
    };

    const applicantFlow: Record<string, { count: number; avgDays: number }> = {};

    for (const [groupKey, statuses] of Object.entries(statusGroups)) {
      const groupApplicants = allApplicants.filter(a =>
        statuses.includes(a.status ?? "")
      );

      const count = groupApplicants.length;

      let totalDays = 0;
      let validCount = 0;
      for (const a of groupApplicants) {
        if (a.created_at) {
          const days = Math.floor((Date.now() - new Date(a.created_at).getTime()) / (1000 * 60 * 60 * 24));
          totalDays += days;
          validCount++;
        }
      }

      const avgDays = validCount > 0 ? Math.round(totalDays / validCount) : 0;

      applicantFlow[groupKey] = { count, avgDays };
    }

    // Stalled applicants
    const stalledApplicants = allApplicants
      .filter(a => {
        const status = a.status ?? "";
        if (status === "OFFER" || status === "内定" || status === "NG") return false;

        const updatedAt = a.updated_at ?? a.created_at;
        if (!updatedAt) return false;

        const daysSince = Math.floor((Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24));
        return daysSince >= 10;
      })
      .map(a => ({
        id: a.id,
        name: a.name ?? "(名前未設定)",
        status: a.status ?? "NEW",
        daysSinceUpdate: Math.floor((Date.now() - new Date(a.updated_at ?? a.created_at).getTime()) / (1000 * 60 * 60 * 24))
      }))
      .sort((a, b) => b.daysSinceUpdate - a.daysSinceUpdate)
      .slice(0, 10);

    // Time series (last 6 months)
    const months: string[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(ymFromDate(d));
    }

    const timeSeries = months.map(m => {
      const items = allInbox.filter(it => isInYmIso(it.received_at, m));
      const bySite: Record<string, number> = {};

      for (const it of items) {
        const key = resolvedSiteKey({
          fromEmail: it.from_email,
          subject: it.subject,
          snippet: it.snippet,
          siteKey: it.site_key
        });
        bySite[key] = (bySite[key] ?? 0) + 1;
      }

      return { ym: m, total: items.length, bySite };
    });

    return NextResponse.json({
      ok: true,
      data: {
        company: {
          id: company.id,
          name: company.company_name ?? company.companyName ?? "(会社名未設定)"
        },
        kpi: {
          applicationsThisMonth,
          applicationsLastMonth,
          activeJobs,
          avgAppPerJob: Math.round(avgAppPerJob * 10) / 10,
          offers,
          conversionRate: Math.round(conversionRate * 10) / 10
        },
        sitePerformance,
        jobPerformance,
        applicantFlow,
        stalledApplicants,
        timeSeries: {
          months,
          data: timeSeries
        }
      }
    });

  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: { message: error.message ?? "Unknown error" } },
      { status: 500 }
    );
  }
}
