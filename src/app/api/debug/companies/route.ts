import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("companies")
    .select("id, company_name, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(50);

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

  return NextResponse.json({ ok: true, companies: data ?? [] });
}

type PostBody = {
  id?: string;
  companyName?: string;
  createdAt?: string;
  updatedAt?: string;
};

export async function POST(req: Request) {
  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ ok: false, error: { message: "Invalid JSON body" } }, { status: 400 });
  }

  const id = String(body.id ?? "").trim();
  const companyName = String(body.companyName ?? "").trim();

  if (!id) {
    return NextResponse.json({ ok: false, error: { message: "Missing: id" } }, { status: 400 });
  }
  if (!companyName) {
    return NextResponse.json({ ok: false, error: { message: "Missing: companyName" } }, { status: 400 });
  }

  const now = new Date().toISOString();
  const createdAt = String(body.createdAt ?? "").trim() || now;
  const updatedAt = String(body.updatedAt ?? "").trim() || now;

  // 現在のDB schemaは companies(id, company_name, created_at, updated_at) だけなので
  // フォームの他項目はまだ保存しません（後でテーブル拡張 or jsonb等で対応）
  const { data, error } = await supabaseAdmin
    .from("companies")
    .upsert(
      [
        {
          id,
          company_name: companyName,
          created_at: createdAt,
          updated_at: updatedAt,
        },
      ],
      { onConflict: "id" }
    )
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

  return NextResponse.json({ ok: true, company: data });
}
