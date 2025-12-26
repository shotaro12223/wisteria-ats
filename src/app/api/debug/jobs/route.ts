import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const companyId = String(url.searchParams.get("companyId") ?? "").trim();

  let q = supabaseAdmin
    .from("jobs")
    .select("id, company_id, company_name, job_title, employment_type, site_status, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(500);

  if (companyId) {
    q = q.eq("company_id", companyId);
  }

  const { data, error } = await q;

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

  return NextResponse.json({ ok: true, jobs: data ?? [] });
}
