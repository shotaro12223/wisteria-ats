// src/app/api/deals/[dealId]/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

async function supabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error("Missing env: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  // ✅ Next.js では cookies() が Promise の場合があるため await
  const cookieStore = await cookies();

  return createServerClient(url, anon, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      // Route Handler ではレスポンス cookie を書き戻さない運用でもOK（no-op）
      set(_name: string, _value: string, _options: any) {},
      remove(_name: string, _options: any) {},
    },
  });
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ dealId: string }> | { dealId: string } }
) {
  try {
    const p: any = (ctx as any)?.params;
    const dealId = typeof p?.then === "function" ? (await p).dealId : p?.dealId;
    const id = String(dealId ?? "").trim();

    if (!id) {
      return NextResponse.json({ ok: false, error: { message: "dealId is required" } }, { status: 400 });
    }

    const sb = await supabaseServer();

    // 認証チェック（RLSがある前提）
    const { data: userRes, error: userErr } = await sb.auth.getUser();
    if (userErr || !userRes?.user) {
      return NextResponse.json({ ok: false, error: { message: "Unauthorized" } }, { status: 401 });
    }

    const { data: deal, error: dealErr } = await sb.from("deals").select("*").eq("id", id).maybeSingle();

    if (dealErr) {
      return NextResponse.json({ ok: false, error: { message: dealErr.message } }, { status: 500 });
    }
    if (!deal) {
      return NextResponse.json({ ok: false, error: { message: "Deal not found" } }, { status: 404 });
    }

    const companyId = String((deal as any).company_id ?? "").trim();

    const [{ data: company, error: cErr }, { data: record, error: rErr }] = await Promise.all([
      sb.from("companies").select("*").eq("id", companyId).maybeSingle(),
      sb.from("company_records").select("*").eq("company_id", companyId).maybeSingle(),
    ]);

    if (cErr) {
      return NextResponse.json({ ok: false, error: { message: cErr.message } }, { status: 500 });
    }
    if (rErr) {
      return NextResponse.json({ ok: false, error: { message: rErr.message } }, { status: 500 });
    }

    return NextResponse.json({ ok: true, deal, company: company ?? null, record: record ?? null });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: { message: String(e?.message ?? e ?? "failed") } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ dealId: string }> | { dealId: string } }
) {
  try {
    const p: any = (ctx as any)?.params;
    const dealId = typeof p?.then === "function" ? (await p).dealId : p?.dealId;
    const id = String(dealId ?? "").trim();

    if (!id) {
      return NextResponse.json({ ok: false, error: { message: "dealId is required" } }, { status: 400 });
    }

    const body = (await req.json()) as any;

    const patch: any = {};
    if (body?.title != null) patch.title = String(body.title);
    if (body?.stage != null) patch.stage = String(body.stage);
    if (body?.start_date !== undefined) patch.start_date = body.start_date ? String(body.start_date) : null;
    if (body?.due_date !== undefined) patch.due_date = body.due_date ? String(body.due_date) : null;
    if (body?.memo !== undefined) patch.memo = body.memo != null ? String(body.memo) : null;
    if (body?.amount !== undefined) patch.amount = body.amount != null ? Number(body.amount) : null;
    if (body?.probability !== undefined) patch.probability = body.probability != null ? Number(body.probability) : null;
    if (body?.meeting_goal !== undefined) patch.meeting_goal = body.meeting_goal != null ? String(body.meeting_goal) : null;
    if (body?.meeting_risks !== undefined) patch.meeting_risks = body.meeting_risks != null ? String(body.meeting_risks) : null;
    if (body?.meeting_next !== undefined) patch.meeting_next = body.meeting_next != null ? String(body.meeting_next) : null;

    // 空PATCHは拒否
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ ok: false, error: { message: "No fields to update" } }, { status: 400 });
    }

    const sb = await supabaseServer();

    const { data: userRes, error: userErr } = await sb.auth.getUser();
    if (userErr || !userRes?.user) {
      return NextResponse.json({ ok: false, error: { message: "Unauthorized" } }, { status: 401 });
    }

    const { data: deal, error } = await sb.from("deals").update(patch).eq("id", id).select("*").maybeSingle();

    if (error) {
      return NextResponse.json({ ok: false, error: { message: error.message } }, { status: 500 });
    }
    if (!deal) {
      return NextResponse.json({ ok: false, error: { message: "Deal not found" } }, { status: 404 });
    }

    return NextResponse.json({ ok: true, deal });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: { message: String(e?.message ?? e ?? "failed") } },
      { status: 500 }
    );
  }
}
