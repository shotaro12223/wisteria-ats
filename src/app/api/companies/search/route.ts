import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseRoute } from "@/lib/supabaseRoute";

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing");
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing");

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

function jsonErr(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: { message } }, { status });
}

export async function GET(req: NextRequest) {
  try {
    const { supabase: sbRoute } = supabaseRoute(req);

    // Authentication check
    const {
      data: { user },
      error: authError,
    } = await sbRoute.auth.getUser();

    if (authError || !user) {
      return jsonErr("Unauthorized", 401);
    }

    // Authorization check: Only admins can search companies
    const { data: workspaceMember } = await sbRoute
      .from("workspace_members")
      .select("role")
      .eq("user_id", user.id)
      .single();

    const isAdmin = workspaceMember?.role === "admin";

    if (!isAdmin) {
      return jsonErr("Access denied", 403);
    }

    const supabase = supabaseAdmin();
    const { searchParams } = new URL(req.url);

    const q = String(searchParams.get("q") ?? "").trim();
    const limitRaw = Number(searchParams.get("limit") ?? "8");
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(30, limitRaw)) : 8;

    if (!q) {
      return NextResponse.json({ ok: true, items: [] }, { status: 200 });
    }

    // ilike で会社名部分一致（日本語OK）
    const { data, error } = await supabase
      .from("companies")
      .select("id, company_name, updated_at")
      .is("deleted_at", null)
      .ilike("company_name", `%${q}%`)
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (error) return jsonErr(error.message, 500);

    const rows: any[] = Array.isArray(data) ? data : [];
    const items = rows.map((r) => ({
      id: String(r?.id ?? ""),
      companyName: String(r?.company_name ?? ""),
      updatedAt: String(r?.updated_at ?? ""),
    }));

    return NextResponse.json({ ok: true, items }, { status: 200 });
  } catch (e: any) {
    return jsonErr(String(e?.message ?? e ?? "unknown error"), 500);
  }
}
