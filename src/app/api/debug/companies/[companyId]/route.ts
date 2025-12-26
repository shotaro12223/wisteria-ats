import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Ctx = { params: Promise<{ companyId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { companyId } = await ctx.params; // ✅ ここが重要（Promiseをunwrap）
  const id = String(companyId ?? "").trim();

  if (!id) {
    return NextResponse.json(
      { ok: false, error: { message: "Missing companyId" } },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("companies")
    .select("id, company_name, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { ok: false, error: { message: error.message, details: error.details, hint: error.hint, code: error.code } },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, company: data ?? null });
}

type PatchBody = { companyName?: string };

export async function PATCH(req: Request, ctx: Ctx) {
  const { companyId } = await ctx.params; // ✅ ここも
  const id = String(companyId ?? "").trim();

  if (!id) {
    return NextResponse.json(
      { ok: false, error: { message: "Missing companyId" } },
      { status: 400 }
    );
  }

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: { message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  const companyName = String(body.companyName ?? "").trim();
  if (!companyName) {
    return NextResponse.json(
      { ok: false, error: { message: "Missing companyName" } },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("companies")
    .update({ company_name: companyName, updated_at: now })
    .eq("id", id)
    .select("id, company_name, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, error: { message: error.message, details: error.details, hint: error.hint, code: error.code } },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, company: data });
}
