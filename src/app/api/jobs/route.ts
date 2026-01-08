import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type JobsListRow = {
  id: string;
  company_id: string | null;
  company_name: string | null;
  job_title: string | null;
  employment_type: string | null;
  site_status: any | null;
  created_at: string;
  updated_at: string;
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const companyId = String(url.searchParams.get("companyId") ?? "").trim();

  let q = supabaseAdmin
    .from("jobs")
    .select(
      "id, company_id, company_name, job_title, employment_type, site_status, created_at, updated_at"
    )
    .order("created_at", { ascending: false })
    .limit(500);

  if (companyId) {
    q = q.eq("company_id", companyId);
  }

  const { data, error } = await q;

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        },
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, jobs: (data ?? []) as JobsListRow[] });
}

type JobsCreateReq = {
  companyId: string;
  companyName?: string;
  jobTitle?: string;
  employmentType?: string;
  siteStatus?: any; // jsonb
};

export async function POST(req: Request) {
  let body: JobsCreateReq;
  try {
    body = (await req.json()) as JobsCreateReq;
  } catch {
    return NextResponse.json(
      { ok: false, error: { message: "Invalid JSON" } },
      { status: 400 }
    );
  }

  const companyId = String(body.companyId ?? "").trim();
  if (!companyId) {
    return NextResponse.json(
      { ok: false, error: { message: "companyId is required" } },
      { status: 400 }
    );
  }

  const jobTitle = String(body.jobTitle ?? "").trim();
  if (!jobTitle) {
    return NextResponse.json(
      { ok: false, error: { message: "jobTitle is required" } },
      { status: 400 }
    );
  }

  const nowIso = new Date().toISOString();

  // jobs.id は text の想定 → こちらで作る
  const jobId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `job_${Math.random().toString(16).slice(2)}_${Date.now()}`;

  const payload = {
    id: jobId,
    company_id: companyId,
    company_name: String(body.companyName ?? "").trim() || null,
    job_title: jobTitle,
    employment_type: String(body.employmentType ?? "").trim() || null,
    site_status: body.siteStatus ?? null,
    created_at: nowIso,
    updated_at: nowIso,
  };

  const { data, error } = await supabaseAdmin
    .from("jobs")
    .insert(payload)
    .select(
      "id, company_id, company_name, job_title, employment_type, site_status, created_at, updated_at"
    )
    .single();

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        },
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, job: data }, { status: 200 });
}
