import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { supabaseRoute } from "@/lib/supabaseRoute";

type CompanyRow = {
  id: string;
  company_name: string;
  company_profile: any;
  application_email: string | null;
  created_at: string;
  updated_at: string;
};

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ companyId: string }> }
) {
  const { companyId } = await ctx.params;
  const id = String(companyId ?? "").trim();
  if (!id) {
    return NextResponse.json(
      { ok: false, error: { message: "Missing: companyId" } },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("companies")
    .select("id, company_name, company_profile, application_email, created_at, updated_at")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { ok: false, error: { message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    company: (data as CompanyRow | null) ?? null,
  });
}

type PatchBody = {
  [key: string]: any;
  companyName?: string;
  applicationEmail?: string; // ✅ 追加
  jobEmail?: string; // ✅ CompanyFormの正本
};

function deepMerge(base: any, patch: any): any {
  const isObj = (v: any) =>
    v !== null && typeof v === "object" && !Array.isArray(v);

  if (!isObj(base) || !isObj(patch)) return patch;

  const out: any = { ...base };
  for (const k of Object.keys(patch)) {
    const pv = patch[k];
    const bv = out[k];
    if (isObj(bv) && isObj(pv)) out[k] = deepMerge(bv, pv);
    else out[k] = pv;
  }
  return out;
}

function sanitizeProfileValue(v: any): any | undefined {
  if (v === undefined || v === null) return undefined;

  if (typeof v === "string") {
    const s = v.trim();
    if (s === "") return undefined;
    return s;
  }

  if (Array.isArray(v)) {
    return v;
  }

  if (typeof v === "object") {
    const next: any = {};
    for (const k of Object.keys(v)) {
      const sv = sanitizeProfileValue(v[k]);
      if (sv !== undefined) next[k] = sv;
    }
    if (Object.keys(next).length === 0) return undefined;
    return next;
  }

  return v;
}

function sanitizeProfileObject(profile: any): any {
  const sv = sanitizeProfileValue(profile);
  if (sv === undefined) return {};
  if (sv !== null && typeof sv === "object" && !Array.isArray(sv)) return sv;
  return {};
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ companyId: string }> }
) {
  const { companyId } = await ctx.params;
  const id = String(companyId ?? "").trim();
  if (!id) {
    return NextResponse.json(
      { ok: false, error: { message: "Missing: companyId" } },
      { status: 400 }
    );
  }

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

  // Authorization check: Only admins can update companies
  const { data: workspaceMember } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("user_id", user.id)
    .single();

  const isAdmin = workspaceMember?.role === "admin";

  if (!isAdmin) {
    return NextResponse.json(
      { ok: false, error: { message: "Access denied" } },
      { status: 403 }
    );
  }

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: { message: "Invalid JSON" } },
      { status: 400 }
    );
  }

  const companyName =
    typeof body.companyName === "string" ? body.companyName.trim() : "";
  if (!companyName) {
    return NextResponse.json(
      { ok: false, error: { message: "companyName is required" } },
      { status: 400 }
    );
  }

  // ✅ 応募受信用メール（最優先：applicationEmail、次点：jobEmail）
  const applicationEmailRaw =
    typeof body.applicationEmail === "string"
      ? body.applicationEmail
      : typeof body.jobEmail === "string"
      ? body.jobEmail
      : "";
  const applicationEmail = String(applicationEmailRaw ?? "").trim() || null;

  const {
    companyName: _drop,
    id: _drop2,
    createdAt: _drop3,
    updatedAt: _drop4,

    applicationEmail: _drop5, // ✅ profileに混ぜない（カラムに入れる）
    ...profilePatchRaw
  } = (body ?? {}) as any;

  const profilePatch = sanitizeProfileObject(profilePatchRaw);

  const { data: current, error: curErr } = await supabaseAdmin
    .from("companies")
    .select("company_profile")
    .eq("id", id)
    .maybeSingle();

  if (curErr) {
    return NextResponse.json(
      { ok: false, error: { message: curErr.message } },
      { status: 500 }
    );
  }

  const currentProfile = (current as any)?.company_profile ?? {};
  const mergedProfile =
    Object.keys(profilePatch).length === 0
      ? currentProfile
      : deepMerge(currentProfile, profilePatch);

  const nowIso = new Date().toISOString();

  const updatePayload: any = {
    company_name: companyName,
    updated_at: nowIso,
  };

  // ✅ ここが本題：companies.application_email を更新
  // 「空上書き防止」したいなら null 更新を禁止にするが、今回は転送箱なので null も許可（必要なら後で締める）
  updatePayload.application_email = applicationEmail;

  if (Object.keys(profilePatch).length !== 0) {
    updatePayload.company_profile = mergedProfile;
  }

  const { data, error } = await supabaseAdmin
    .from("companies")
    .update(updatePayload)
    .eq("id", id)
    .select("id, company_name, company_profile, application_email, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, error: { message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    company: data as CompanyRow,
  });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ companyId: string }> }
) {
  const { companyId } = await ctx.params;
  const id = String(companyId ?? "").trim();
  if (!id) {
    return NextResponse.json(
      { ok: false, error: { message: "Missing: companyId" } },
      { status: 400 }
    );
  }

  // Check for related jobs
  const { data: relatedJobs } = await supabaseAdmin
    .from("jobs")
    .select("id")
    .eq("company_id", id)
    .is("deleted_at", null);

  // Check for related applicants
  const { data: relatedApplicants } = await supabaseAdmin
    .from("applicants")
    .select("id")
    .eq("company_id", id)
    .is("deleted_at", null);

  // Check for related deals
  const { data: relatedDeals } = await supabaseAdmin
    .from("company_records")
    .select("id")
    .eq("company_id", id)
    .is("deleted_at", null);

  const jobCount = relatedJobs?.length || 0;
  const applicantCount = relatedApplicants?.length || 0;
  const dealCount = relatedDeals?.length || 0;

  if (jobCount > 0 || applicantCount > 0 || dealCount > 0) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: `この企業には関連データがあります（求人: ${jobCount}件, 応募者: ${applicantCount}件, 案件: ${dealCount}件）。先に関連データを削除してください。`,
          relatedData: {
            jobs: jobCount,
            applicants: applicantCount,
            deals: dealCount,
          },
        },
      },
      { status: 400 }
    );
  }

  // Soft delete
  const { error } = await supabaseAdmin
    .from("companies")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { ok: false, error: { message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, data: null });
}
