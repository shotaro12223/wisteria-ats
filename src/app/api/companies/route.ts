import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseRoute";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

type CompanyRow = {
  id: string;
  company_name: string;
  company_profile: any;
  application_email: string | null;
  created_at: string;
  updated_at: string;
};

type CompanyWithRecord = CompanyRow & {
  company_records?: Array<{
    status: string;
    profile: any;
  }> | null;
};

function toApiCompany(r: CompanyWithRecord) {
  // Supabase returns company_records as object (not array) for 1-to-1 relationships
  let record = null;
  if (Array.isArray(r.company_records) && r.company_records.length > 0) {
    record = r.company_records[0];
  } else if (r.company_records && typeof r.company_records === 'object') {
    record = r.company_records as any;
  }

  const recordStatus = record?.status || null;
  const dealStage = record?.profile?.deal_stage || null;

  return {
    id: r.id,
    company_name: r.company_name,
    company_profile: r.company_profile ?? {},
    application_email: r.application_email ?? null,
    created_at: r.created_at,
    updated_at: r.updated_at,
    record_status: recordStatus,
    deal_stage: dealStage,

    companyName: r.company_name,
    companyProfile: r.company_profile ?? {},
    applicationEmail: r.application_email ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
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

  // Authorization check: Only admins can list all companies
  const { data: workspaceMember } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("user_id", user.id)
    .single();

  const isAdmin = workspaceMember?.role === "admin";

  if (!isAdmin) {
    // Client users should not access this endpoint (they have specific company API)
    return NextResponse.json(
      { ok: false, error: { message: "Access denied" } },
      { status: 403 }
    );
  }

  // Use supabase (anon) instead of supabaseAdmin
  const { data, error } = await supabase
    .from("companies")
    .select(`
      id,
      company_name,
      company_profile,
      application_email,
      created_at,
      updated_at,
      company_records!inner(status, profile)
    `)
    .is("deleted_at", null)
    .is("company_records.deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[companies] GET error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: { message: "企業一覧の取得に失敗しました" },
      },
      { status: 500 }
    );
  }

  const rows = ((data as CompanyWithRecord[] | null) ?? []).map((r) => toApiCompany(r));
  return NextResponse.json({ ok: true, companies: rows });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as any;

    const companyName = String(body.companyName ?? body.company_name ?? "").trim();
    if (!companyName) {
      return NextResponse.json(
        { ok: false, error: { message: "companyName is required" } },
        { status: 400 }
      );
    }

    const companyProfile = (body.companyProfile ?? body.company_profile ?? {}) as any;

    const applicationEmail =
      body.applicationEmail ?? body.application_email ?? body.application_email_address ?? null;

    // ✅ DB default が効かない環境対策：ここで補填
    const now = new Date().toISOString();

    // ✅ 常にサーバー側で正しいUUIDを生成
    const companyId = randomUUID();

    const { data, error } = await supabaseAdmin
      .from("companies")
      .insert({
        id: companyId,
        company_name: companyName,
        company_profile: companyProfile ?? {},
        application_email: applicationEmail,
        created_at: body.createdAt || now,
        updated_at: body.updatedAt || now,
      })
      .select("id, company_name, company_profile, application_email, created_at, updated_at")
      .single();

    if (error) {
      console.error("[companies] POST error:", error);
      return NextResponse.json(
        {
          ok: false,
          error: { message: "企業の作成に失敗しました" },
        },
        { status: 500 }
      );
    }

    // ✅ Create company_records entry automatically so deal_stage can be set immediately
    const recordInsertResult = await supabaseAdmin
      .from("company_records")
      .insert({
        company_id: companyId,
        status: "active",
        owner_user_id: null,
        tags: [],
        memo: null,
        profile: companyProfile ?? {},
        created_at: now,
        updated_at: now,
      })
      .select("*")
      .single();

    // Don't fail the company creation if record creation fails (non-critical)
    if (recordInsertResult.error) {
      console.error("Failed to create company_records entry:", recordInsertResult.error);
    }

    return NextResponse.json({ ok: true, company: toApiCompany(data as CompanyRow) }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: { message: e?.message ?? "Invalid JSON" } },
      { status: 400 }
    );
  }
}
