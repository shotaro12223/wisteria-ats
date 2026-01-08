import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type ApplicantStatus = "NEW" | "DOC" | "INT" | "OFFER" | "NG";

type ApplicantOut = {
  id: string;
  companyId: string;
  jobId: string;
  appliedAt: string;
  siteKey: string;
  name: string;
  status: ApplicantStatus;
  note?: string;
  createdAt: string;
  updatedAt: string;

  companyName?: string;
  jobTitle?: string;
};

function toApplicantBase(row: any): Omit<ApplicantOut, "companyName" | "jobTitle"> {
  return {
    id: String(row.id),
    companyId: String(row.company_id),
    jobId: String(row.job_id),
    appliedAt: String(row.applied_at),
    siteKey: String(row.site_key),
    name: String(row.name),
    status: String(row.status) as ApplicantStatus,
    note: row.note ?? undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await ctx.params;
  const id = String(rawId ?? "").trim();

  if (!id) {
    return NextResponse.json(
      { ok: false, error: { message: "id is required" } },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("applicants")
    .select("id,company_id,job_id,applied_at,site_key,name,status,note,created_at,updated_at")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { ok: false, error: { message: error?.message ?? "not found" } },
      { status: 404 }
    );
  }

  const base = toApplicantBase(data);

  // 表示名解決（単発なので必要分だけ）
  let companyName: string | undefined;
  let jobTitle: string | undefined;

  if (base.companyId) {
    const { data: c } = await supabaseAdmin
      .from("companies")
      .select("id,company_name")
      .eq("id", base.companyId)
      .maybeSingle();

    if (c?.company_name) companyName = String(c.company_name);
  }

  if (base.jobId) {
    const { data: j } = await supabaseAdmin
      .from("jobs")
      .select("id,job_title,company_name")
      .eq("id", base.jobId)
      .maybeSingle();

    if (j?.job_title) jobTitle = String(j.job_title);
    if (!companyName && j?.company_name) companyName = String(j.company_name);
  }

  const item: ApplicantOut = {
    ...base,
    companyName,
    jobTitle,
  };

  return NextResponse.json({ ok: true, item });
}
