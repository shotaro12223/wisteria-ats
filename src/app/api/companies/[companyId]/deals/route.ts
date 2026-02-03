// src/app/api/companies/[companyId]/deals/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseRoute";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ companyId: string }> | { companyId: string } }
) {
  try {
    const p: any = (ctx as any)?.params;
    const companyId = typeof p?.then === "function" ? (await p).companyId : p?.companyId;
    const id = String(companyId ?? "").trim();

    if (!id) {
      return NextResponse.json({ ok: false, error: { message: "companyId is required" } }, { status: 400 });
    }

    const { supabase } = supabaseRoute(req);

    // その企業の全商談を取得
    const { data: deals, error: dealsError } = await supabase
      .from("deals")
      .select("id, title, stage, start_date, due_date, amount, probability, created_at, updated_at")
      .eq("company_id", id)
      .order("created_at", { ascending: false });

    if (dealsError) {
      return NextResponse.json({ ok: false, error: { message: dealsError.message } }, { status: 500 });
    }

    return NextResponse.json({ ok: true, deals: deals || [] });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: { message: err?.message ?? "Unknown error" } },
      { status: 500 }
    );
  }
}
