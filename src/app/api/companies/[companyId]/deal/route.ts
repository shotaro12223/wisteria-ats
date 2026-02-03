// src/app/api/companies/[companyId]/deal/route.ts
// 既存企業のデフォルトdeal取得・自動作成API
import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseRoute";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

function jsonOk(data: any) {
  return NextResponse.json(data, { status: 200 });
}

function jsonErr(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: { message } }, { status });
}

function s(v: any) {
  return String(v ?? "").trim();
}

function nowIso() {
  return new Date().toISOString();
}

/**
 * GET /api/companies/[companyId]/deal
 * 既存企業のデフォルトdealを取得。なければ自動作成してから返す。
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ companyId: string }> | { companyId: string } }
) {
  try {
    const p: any = (ctx as any)?.params;
    const companyId = typeof p?.then === "function" ? (await p).companyId : p?.companyId;
    const id = s(companyId);

    if (!id) {
      return jsonErr("companyId is required", 400);
    }

    const { supabase } = supabaseRoute(req);
    const admin = supabaseAdmin;

    // 1) 会社の存在確認
    const { data: company, error: companyErr } = await supabase
      .from("companies")
      .select("id, company_name")
      .eq("id", id)
      .single();

    if (companyErr || !company) {
      return jsonErr("Company not found", 404);
    }

    // 2) 既存のdeal（kind: existing）を探す
    const { data: existingDeals, error: dealsErr } = await supabase
      .from("deals")
      .select("*")
      .eq("company_id", id)
      .eq("kind", "existing")
      .order("created_at", { ascending: true })
      .limit(1);

    if (dealsErr) {
      return jsonErr(dealsErr.message, 500);
    }

    let deal = existingDeals?.[0] ?? null;

    // 3) なければ自動作成
    if (!deal) {
      const now = nowIso();

      const { data: newDeal, error: insertErr } = await admin
        .from("deals")
        .insert({
          company_id: id,
          kind: "existing",
          title: "定例打ち合わせ",
          stage: "準備",
          created_at: now,
          updated_at: now,
        })
        .select("*")
        .single();

      if (insertErr) {
        return jsonErr(insertErr.message, 500);
      }

      deal = newDeal;
    }

    // 4) company_records も取得
    const { data: record } = await supabase
      .from("company_records")
      .select("*")
      .eq("company_id", id)
      .single();

    return jsonOk({
      ok: true,
      deal,
      company,
      record: record ?? null,
    });
  } catch (err: any) {
    return jsonErr(err?.message ?? "Unknown error", 500);
  }
}
