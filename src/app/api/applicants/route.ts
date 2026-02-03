import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

function clampInt(v: any, min: number, max: number, fallback: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function s(v: any) {
  return String(v ?? "").trim();
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);

    const limit = clampInt(url.searchParams.get("limit"), 1, 100, 20);
    const companyId = s(url.searchParams.get("companyId"));
    const jobId = s(url.searchParams.get("jobId"));

    let q = supabaseAdmin
      .from("applicants")
      .select(
        "id,company_id,job_id,applied_at,site_key,name,status,note,created_at,updated_at",
        { count: "exact" }
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (companyId) q = q.eq("company_id", companyId);
    if (jobId) q = q.eq("job_id", jobId);

    const r = await q;

    if (r.error) {
      return NextResponse.json(
        { ok: false, error: r.error.message, where: "select applicants" },
        { status: 500 }
      );
    }

    const items = (r.data ?? []).map((a: any) => ({
      id: s(a.id),
      companyId: s(a.company_id),
      jobId: s(a.job_id),
      appliedAt: a.applied_at ? s(a.applied_at) : null,
      siteKey: a.site_key ? s(a.site_key) : null,
      name: a.name ? s(a.name) : null,
      status: a.status ? s(a.status) : null,
      note: a.note ? String(a.note) : "",
      createdAt: s(a.created_at),
      updatedAt: s(a.updated_at),
    }));

    // 全体のNEW件数を取得（フィルタなし）
    const newCountRes = await supabaseAdmin
      .from("applicants")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .or("status.eq.NEW,status.eq.new,status.is.null,status.eq.");

    const stats = {
      totalNew: Number(newCountRes.count ?? 0),
    };

    return NextResponse.json({
      ok: true,
      items,
      total: Number(r.count ?? items.length),
      stats,
      debug: { companyId: companyId || null, jobId: jobId || null, returned: items.length },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "unexpected error", where: "catch" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { companyId, jobId, name, appliedAt, siteKey, status, note } = body;

    if (!companyId || !jobId || !name) {
      return NextResponse.json(
        { ok: false, error: "companyId, jobId, and name are required" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const nowDate = now.split("T")[0];  // YYYY-MM-DD

    // Validate applied_at is not in the future
    const appliedDate = appliedAt || nowDate;
    if (appliedDate > nowDate) {
      return NextResponse.json(
        { ok: false, error: "応募日は未来の日付にできません" },
        { status: 400 }
      );
    }

    const id = `applicant_${Date.now()}_${Math.random().toString(16).slice(2)}`;

    const { data, error } = await supabaseAdmin
      .from("applicants")
      .insert({
        id,
        company_id: companyId,
        job_id: jobId,
        name,
        applied_at: appliedDate,
        site_key: siteKey || "Direct",
        status: status || "NEW",
        note: note || null,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "unexpected error" },
      { status: 500 }
    );
  }
}
