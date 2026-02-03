import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

type RecordRow = {
  company_id: string;
  status: string;
  owner_user_id: string | null;
  tags: string[];
  memo: string | null;
  profile: any;
  created_at: string;
  updated_at: string;
};

type CompanyRow = {
  id: string;
  company_name: string;
  company_profile: any;
  application_email: string | null;
};

function getSupabaseRouteClient(req: NextRequest, res: NextResponse) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

  if (!url || !anon) {
    throw new Error("Missing Supabase env (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)");
  }

  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          res.cookies.set(name, value, options);
        });
      },
    },
  });
}

function isObj(v: any) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function isEmptyObject(v: any) {
  return isObj(v) && Object.keys(v).length === 0;
}

function isEmptyValue(v: any) {
  return v === undefined || v === null || (typeof v === "string" && v.trim() === "");
}

/**
 * dst の「空欄だけ」src で埋める（上書きしない）
 * - オブジェクトは再帰で埋める
 */
function fillMissing(dst: any, src: any): any {
  const d = isObj(dst) ? { ...dst } : {};
  const s = isObj(src) ? src : {};

  for (const k of Object.keys(s)) {
    const sv = s[k];
    const dv = d[k];

    if (isObj(dv) && isObj(sv)) {
      d[k] = fillMissing(dv, sv);
      continue;
    }

    if (isEmptyValue(dv) || (isObj(dv) && isEmptyObject(dv))) {
      d[k] = sv;
    }
  }
  return d;
}

/**
 * camelCase で入ってしまった古いキーを snake_case に「空欄だけ」移送する。
 * 既に snake_case があるならそっちを優先（＝上書きしない）。
 */
function migrateCamelToSnakeOnlyIfMissing(profile: any) {
  const p = isObj(profile) ? { ...profile } : {};

  const map: Array<[string, string]> = [
    ["acquisitionSourceType", "acquisition_source_type"],
    ["acquisitionSourceFree", "acquisition_source_detail"],
    ["industryMajor", "industry_major"],
    ["industryMiddle", "industry_middle"],
    ["industrySmall", "industry_small"],

    ["contractStartDate", "contract_start_date"],
    ["contractPausedAt", "contract_pause_date"],
    ["contractPauseCount", "contract_pause_count"],
    ["contractEndedAt", "contract_end_date"],
    ["contractEndCount", "contract_end_count"],
    ["contractPlan", "contract_plan"],
    ["cancellationReason", "cancellation_reason"],
    ["dormantReason", "dormancy_reason"],
    ["campaign", "campaign_applied"],
    ["firstMeetingDate", "first_meeting_date"],
  ];

  for (const [from, to] of map) {
    const fromV = p[from];
    const toV = p[to];

    if (!isEmptyValue(fromV) && isEmptyValue(toV)) {
      p[to] = fromV;
    }
  }

  return p;
}

/**
 * record.profile の正規形（snake_case SSOT）を作る
 * - 既存値は保持
 * - 不足キーだけ default
 * - companies 側由来の “既存会社概要” はそのまま残す（上書きしない）
 */
function normalizeProfile(profile: any, company: CompanyRow | null) {
  let p = isObj(profile) ? { ...profile } : {};

  // 1) camel -> snake（空欄だけ）
  p = migrateCamelToSnakeOnlyIfMissing(p);

  // 2) companies.application_email を jobEmail に“空欄だけ”補完（現データ互換）
  const appEmail =
    typeof company?.application_email === "string" && company.application_email.trim()
      ? company.application_email.trim()
      : null;

  if (appEmail && isEmptyValue(p.jobEmail)) {
    p.jobEmail = appEmail;
  }

  // 3) 追加したい台帳項目：snake_case で不足分だけ default
  const defaults = {
    acquisition_source_type: "",
    acquisition_source_detail: "",
    industry_major: "",
    industry_middle: "",
    industry_small: "",

    contract_start_date: "",
    contract_pause_date: "",
    contract_pause_count: "",
    contract_end_date: "",
    contract_end_count: "",
    contract_plan: "",
    cancellation_reason: "",
    dormancy_reason: "",
    campaign_applied: "",
    first_meeting_date: "",

    // 推奨（レコードとして持つと強い）
    deal_stage: "",
    mrr: "",
    billing_cycle: "",
    payment_method: "",
    next_renewal_date: "",
    renewal_confidence: "",
    health: "",

    decision_maker_title: "",
    decision_maker_name: "",
    primary_contact_title: "",
    primary_contact_name: "",
    contact_email: "",
    contact_phone: "",
    communication_preference: "",
    contact_hours: "",
    ng_notes: "",

    hiring_goal: "",
    hiring_difficulty: "",
    main_job_category: "",
    location_prefecture: "",
    location_city: "",

    company_code: "",
    external_crm_id: "",
    accounting_id: "",
    notes_internal: "",
  };

  p = fillMissing(p, defaults);

  return p;
}

async function loadCompanyForInit(supabase: any, companyId: string): Promise<CompanyRow | null> {
  const { data, error } = await supabase
    .from("companies")
    .select("id, company_name, company_profile, application_email")
    .eq("id", companyId)
    .maybeSingle();

  if (error) {
    // companies の RLS で弾かれても record は作る
    return null;
  }
  return (data as CompanyRow | null) ?? null;
}

async function ensureRecordRow(supabase: any, companyId: string): Promise<RecordRow> {
  const { data: existing, error: selErr } = await supabase
    .from("company_records")
    .select("*")
    .eq("company_id", companyId)
    .maybeSingle();

  if (selErr) throw selErr;

  // companies から seed を取る（ただし上書きしない）
  const company = await loadCompanyForInit(supabase, companyId);
  const companyProfile = isObj(company?.company_profile) ? company!.company_profile : {};

  // 既存あり：profile が空なら初期コピー（現行仕様維持）
  if (existing) {
    const ex = existing as RecordRow;

    const exProfile = ex?.profile ?? {};
    if (isEmptyObject(exProfile)) {
      const initProfile = normalizeProfile({ ...companyProfile }, company);

      const { data: patched, error: upErr } = await supabase
        .from("company_records")
        .update({ profile: initProfile, updated_at: new Date().toISOString() })
        .eq("company_id", companyId)
        .select("*")
        .single();

      if (!upErr && patched) return patched as RecordRow;
      return ex;
    }

    // profile が空ではない：ここでは絶対に上書きしない。
    // ただし “キー崩壊” 対策として、snake_case 不足分だけ埋めたい場合は以下を有効化できる。
    // 今回は「消さない」最優先なので、GETでは触らず返す。
    return ex;
  }

  // 新規作成：companies から profile を初期コピー（＋正規化）
  const initProfile = normalizeProfile({ ...companyProfile }, company);

  const { data: inserted, error: insErr } = await supabase
    .from("company_records")
    .insert({
      company_id: companyId,
      status: "active",
      owner_user_id: null,
      tags: [],
      memo: null,
      profile: initProfile,
    })
    .select("*")
    .single();

  if (insErr) throw insErr;
  return inserted as RecordRow;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ companyId: string }> }) {
  const res = NextResponse.next();

  try {
    const { companyId } = await ctx.params;
    const cid = String(companyId ?? "").trim();
    if (!cid) {
      return NextResponse.json({ ok: false, error: { message: "companyId is required" } }, { status: 400 });
    }

    const supabase = getSupabaseRouteClient(req, res);

    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr) {
      return NextResponse.json(
        { ok: false, error: { message: `auth.getUser failed: ${authErr.message}` } },
        { status: 401 }
      );
    }
    if (!auth?.user) {
      return NextResponse.json({ ok: false, error: { message: "Unauthorized" } }, { status: 401 });
    }

    const row = await ensureRecordRow(supabase, cid);

    const out = NextResponse.json({ ok: true, record: row });
    res.cookies.getAll().forEach((c) => out.cookies.set(c));
    return out;
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: { message: String(e?.message ?? e ?? "record get failed") } },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ companyId: string }> }) {
  const res = NextResponse.next();

  try {
    const { companyId } = await ctx.params;
    const cid = String(companyId ?? "").trim();
    if (!cid) {
      return NextResponse.json({ ok: false, error: { message: "companyId is required" } }, { status: 400 });
    }

    const supabase = getSupabaseRouteClient(req, res);

    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr) {
      return NextResponse.json(
        { ok: false, error: { message: `auth.getUser failed: ${authErr.message}` } },
        { status: 401 }
      );
    }
    if (!auth?.user) {
      return NextResponse.json({ ok: false, error: { message: "Unauthorized" } }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    const nextStatus = body?.status != null ? String(body.status) : undefined;
    const nextOwner =
      body?.owner_user_id === null || body?.owner_user_id === undefined ? body?.owner_user_id : String(body.owner_user_id);

    const nextMemo = body?.memo === null || body?.memo === undefined ? body?.memo : String(body.memo);

    const nextTagsRaw = body?.tags;
    const nextTags =
      Array.isArray(nextTagsRaw) ? nextTagsRaw.map((x: any) => String(x ?? "").trim()).filter(Boolean) : undefined;

    const nextProfileRaw = body?.profile != null && typeof body.profile === "object" ? body.profile : undefined;

    // 存在保証
    await ensureRecordRow(supabase, cid);

    // PATCH の profile は “正規化だけ” かけて、キー崩壊を防ぐ（値は上書きしない方針）
    let nextProfile = nextProfileRaw;
    if (nextProfileRaw) {
      const company = await loadCompanyForInit(supabase, cid);
      nextProfile = normalizeProfile(nextProfileRaw, company);
    }

    const patch: any = { updated_at: new Date().toISOString() };
    if (nextStatus !== undefined) patch.status = nextStatus;
    if (nextOwner !== undefined) patch.owner_user_id = nextOwner;
    if (nextTags !== undefined) patch.tags = nextTags;
    if (nextMemo !== undefined) patch.memo = nextMemo;
    if (nextProfile !== undefined) patch.profile = nextProfile;

    const { data, error } = await supabase
      .from("company_records")
      .update(patch)
      .eq("company_id", cid)
      .select("*")
      .single();

    if (error) throw error;

    const out = NextResponse.json({ ok: true, record: data });
    res.cookies.getAll().forEach((c) => out.cookies.set(c));
    return out;
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: { message: String(e?.message ?? e ?? "record patch failed") } },
      { status: 500 }
    );
  }
}
