import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type CompanyRow = {
  id: string;
  company_name: string;
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
    .select("id, company_name, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        },
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, company: (data as CompanyRow | null) ?? null });
}

type PatchBody = {
  companyName?: string;
};

export async function PATCH(
  req: Request,
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

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: { message: "Invalid JSON" } },
      { status: 400 }
    );
  }

  const companyName = typeof body.companyName === "string" ? body.companyName.trim() : "";
  if (!companyName) {
    return NextResponse.json(
      { ok: false, error: { message: "companyName is required" } },
      { status: 400 }
    );
  }

  const nowIso = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("companies")
    .update({ company_name: companyName, updated_at: nowIso })
    .eq("id", id)
    .select("id, company_name, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        },
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, company: data as CompanyRow });
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

  const { error } = await supabaseAdmin.from("companies").delete().eq("id", id);

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        },
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
