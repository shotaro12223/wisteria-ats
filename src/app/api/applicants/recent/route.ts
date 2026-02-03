import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseRoute";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

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

export async function GET(req: NextRequest) {
  const { supabase } = supabaseRoute(req);

  // Authentication check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { ok: false, error: { message: "Unauthorized" } },
      { status: 401 }
    );
  }

  // Authorization check
  const { data: clientUser } = await supabase
    .from("client_users")
    .select("company_id, is_active")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  const { data: workspaceMember } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("user_id", user.id)
    .single();

  const isAdmin = workspaceMember?.role === "admin";

  if (!clientUser && !isAdmin) {
    return NextResponse.json(
      { ok: false, error: { message: "Access denied" } },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);

  const limitRaw = searchParams.get("limit");
  const limit = Math.min(Math.max(Number(limitRaw ?? "5") || 5, 1), 20);

  const onlyNew = (searchParams.get("onlyNew") ?? "1") !== "0";

  // Use supabase (anon) instead of supabaseAdmin
  let q = supabase
    .from("applicants")
    .select("id,company_id,job_id,applied_at,site_key,name,status,note,created_at,updated_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  // Filter by company for client users
  if (clientUser) {
    q = q.eq("company_id", clientUser.company_id);
  }

  if (onlyNew) q = q.eq("status", "NEW");

  const { data, error } = await q;

  if (error) {
    console.error("[applicants/recent] Query error:", error);
    return NextResponse.json(
      { ok: false, error: { message: "最近の応募者取得に失敗しました" } },
      { status: 500 }
    );
  }

  const items = (data ?? []).map(toApplicant);

  // ===== 表示名の解決（バッチ） =====
  const companyIds = Array.from(new Set(items.map((a) => a.companyId).filter(Boolean)));
  const jobIds = Array.from(new Set(items.map((a) => a.jobId).filter(Boolean)));

  const companyNameById = new Map<string, string>();
  const jobTitleById = new Map<string, string>();

  // jobs: job_title / company_name を持ってるので、ここで取れる分は取る
  if (jobIds.length > 0) {
    const { data: jobs } = await supabase
      .from("jobs")
      .select("id,job_title,company_id,company_name")
      .is("deleted_at", null)
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
    const { data: companies } = await supabase
      .from("companies")
      .select("id,company_name")
      .is("deleted_at", null)
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
