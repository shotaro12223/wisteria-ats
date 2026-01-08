import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("companies")
    .select("id, company_name, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json(
      { ok: false, error },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, companies: data ?? [] });
}

export async function POST(req: Request) {
  const body = await req.json();

  const companyName = String(body.companyName ?? "").trim();
  if (!companyName) {
    return NextResponse.json(
      { ok: false, error: { message: "companyName required" } },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const id =
    body.id ??
    (typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `company_${Date.now()}`);

  const { data, error } = await supabaseAdmin
    .from("companies")
    .upsert(
      {
        id,
        company_name: companyName,
        created_at: now,
        updated_at: now,
      },
      { onConflict: "id" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, error },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, company: data });
}
