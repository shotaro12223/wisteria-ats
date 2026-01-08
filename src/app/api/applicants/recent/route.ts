import { NextResponse } from "next/server";
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

  // 表示用（追加）
  companyName?: string;
  jobTitle?: string;
};

function toApplicant(row: any): ApplicantOut {
  return {
    id: String(row.id),
    companyId: String(row.company_id ?? ""),
    jobId: String(row.job_id ?? ""),
    appliedAt: String(row.applied_at ?? ""),
    siteKey: String(row.site_key ?? ""),
    name: String(row.name ?? ""),
    status: String(row.status ?? "NEW") as ApplicantStatus,
    note: row.note ?? undefined,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const limitRaw = searchParams.get("limit");
  const limit = Math.min(Math.max(Number(limitRaw ?? "5") || 5, 1), 20);

  // NEWだけに絞るかどうか（既存仕様はNEWだけ）
  // dashboardではNEWだけが基本でOKなので、デフォルトは true
  const onlyNew = (searchParams.get("onlyNew") ?? "1") !== "0";

  let q = supabaseAdmin
    .from("applicants")
    .select("id,company_id,job_id,applied_at,site_key,name,status,note,created_at,updated_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (onlyNew) q = q.eq("status", "NEW");

  const { data, error } = await q;

  if (error) {
    return NextResponse.json({ ok: false, error: { message: error.message } }, { status: 500 });
  }

  const items = (data ?? []).map(toApplicant);

  // ===== 表示名の解決（バッチ） =====
  const companyIds = Array.from(new Set(items.map((a) => a.companyId).filter(Boolean)));
  const jobIds = Array.from(new Set(items.map((a) => a.jobId).filter(Boolean)));

  const companyNameById = new Map<string, string>();
  const jobTitleById = new Map<string, string>();

  // jobs: job_title / company_name を持ってるので、ここで取れる分は取る
  if (jobIds.length > 0) {
    const { data: jobs } = await supabaseAdmin
      .from("jobs")
      .select("id,job_title,company_id,company_name")
      .in("id", jobIds);

    for (const j of jobs ?? []) {
      const id = String((j as any).id ?? "");
      const jobTitle = String((j as any).job_title ?? "");
      if (id && jobTitle) jobTitleById.set(id, jobTitle);

      // jobs側に company_name が入っていれば、会社名も拾える
      const cid = String((j as any).company_id ?? "");
      const cname = String((j as any).company_name ?? "");
      if (cid && cname && !companyNameById.has(cid)) {
        companyNameById.set(cid, cname);
      }
    }
  }

  // companies: company_name を持ってる（jobsで埋まらなかった分を補完）
  const missingCompanyIds = companyIds.filter((id) => !companyNameById.has(id));
  if (missingCompanyIds.length > 0) {
    const { data: companies } = await supabaseAdmin
      .from("companies")
      .select("id,company_name")
      .in("id", missingCompanyIds);

    for (const c of companies ?? []) {
      const id = String((c as any).id ?? "");
      const name = String((c as any).company_name ?? "");
      if (id && name) companyNameById.set(id, name);
    }
  }

  const enriched: ApplicantOut[] = items.map((a) => ({
    ...a,
    companyName: a.companyId ? companyNameById.get(a.companyId) : undefined,
    jobTitle: a.jobId ? jobTitleById.get(a.jobId) : undefined,
  }));

  return NextResponse.json({ ok: true, items: enriched });
}
