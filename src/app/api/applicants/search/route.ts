import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseRoute";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type ApplicantStatus = "NEW" | "DOC" | "INT" | "OFFER" | "NG";

type ApplicantOut = {
  id: string;
  companyId: string;
  jobId: string;
  appliedAt: string; // YYYY-MM-DD
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

  // Authorization check: Get user's company_id or admin role
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
  let allowedCompanyId: string | null = null;

  if (clientUser) {
    // Client user can only access their company's data
    allowedCompanyId = clientUser.company_id;
  } else if (!isAdmin) {
    // Not a client user and not an admin
    return NextResponse.json(
      { ok: false, error: { message: "Access denied" } },
      { status: 403 }
    );
  }
  // Admin can access all companies (allowedCompanyId remains null)

  const { searchParams } = new URL(req.url);

  const q = String(searchParams.get("q") ?? "").trim();
  const status = String(searchParams.get("status") ?? "").trim(); // NEW/DOC...
  const companyIdParam = String(searchParams.get("companyId") ?? "").trim();

  // Enforce company_id restriction
  const companyId = allowedCompanyId || companyIdParam;

  const limitRaw = searchParams.get("limit");
  const limit = Math.min(Math.max(Number(limitRaw ?? "300") || 300, 1), 500);

  // Use supabase (anon key) instead of supabaseAdmin to respect RLS
  let query = supabase
    .from("applicants")
    .select("id,company_id,job_id,applied_at,site_key,name,status,note,created_at,updated_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (companyId) {
    query = query.eq("company_id", companyId);
  }

  if (status && status !== "ALL") {
    query = query.eq("status", status);
  }

  if (q) {
    const like = `%${q}%`;
    query = query.or(
      [
        `name.ilike.${like}`,
        `note.ilike.${like}`,
        `site_key.ilike.${like}`,
        `job_id.ilike.${like}`,
        `applied_at::text.ilike.${like}`,
      ].join(",")
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error("[applicants/search] Query error:", error);
    return NextResponse.json(
      { ok: false, error: { message: "検索処理に失敗しました" } },
      { status: 500 }
    );
  }

  const base = (data ?? []).map(toApplicantBase);

  // ===== 表示名解決（companies / jobs をまとめ取得して辞書化）=====
  const companyIds = Array.from(new Set(base.map((a) => a.companyId).filter(Boolean)));
  const jobIds = Array.from(new Set(base.map((a) => a.jobId).filter(Boolean)));

  const companyNameMap = new Map<string, string>();
  if (companyIds.length > 0) {
    const { data: companies, error: cErr } = await supabase
      .from("companies")
      .select("id,company_name")
      .is("deleted_at", null)
      .in("id", companyIds);

    if (!cErr) {
      for (const r of companies ?? []) {
        if (r?.id && r?.company_name) companyNameMap.set(String(r.id), String(r.company_name));
      }
    }
  }

  const jobTitleMap = new Map<string, string>();
  const jobCompanyNameMap = new Map<string, string>();
  if (jobIds.length > 0) {
    const { data: jobs, error: jErr } = await supabase
      .from("jobs")
      .select("id,job_title,company_name")
      .is("deleted_at", null)
      .in("id", jobIds);

    if (!jErr) {
      for (const r of jobs ?? []) {
        const id = r?.id ? String(r.id) : "";
        if (!id) continue;
        if (r?.job_title) jobTitleMap.set(id, String(r.job_title));
        if (r?.company_name) jobCompanyNameMap.set(id, String(r.company_name));
      }
    }
  }

  const items: ApplicantOut[] = base.map((a) => {
    const companyName =
      companyNameMap.get(a.companyId) ?? jobCompanyNameMap.get(a.jobId) ?? undefined;
    const jobTitle = jobTitleMap.get(a.jobId) ?? undefined;

    return {
      ...a,
      companyName,
      jobTitle,
    };
  });

  return NextResponse.json({ ok: true, items });
}
