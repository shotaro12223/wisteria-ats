import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseRoute";

export const dynamic = "force-dynamic";

function jsonWithCookies(baseRes: NextResponse, body: any, init?: { status?: number }) {
  const out = NextResponse.json(body, init);
  baseRes.cookies.getAll().forEach((c) => out.cookies.set(c.name, c.value, c));
  return out;
}

export async function GET(req: NextRequest) {
  const { supabase, res } = supabaseRoute(req);

  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  const me = userRes.user?.id;
  if (userErr || !me) return jsonWithCookies(res, { ok: false, error: "unauthorized" }, { status: 401 });

  // 自分がworkspace memberであることだけ確認（このプロジェクトの他APIと合わせる）
  const chk = await supabase.from("workspace_members").select("user_id").eq("user_id", me).maybeSingle();
  if (chk.error) return jsonWithCookies(res, { ok: false, error: chk.error.message }, { status: 500 });
  if (!chk.data) return jsonWithCookies(res, { ok: false, error: "forbidden" }, { status: 403 });

  const q = new URL(req.url).searchParams.get("q");
  const term = String(q ?? "").trim();

  let query = supabase
    .from("workspace_members")
    .select("user_id, role, display_name, avatar_url, presence_status, presence_updated_at")
    .neq("user_id", me) // ✅ 自分自身を除外
    .order("presence_updated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);

  if (term) {
    // ilike は display_name が null のケースに弱いので、まずは最小でOK
    query = query.ilike("display_name", `%${term}%`);
  }

  const r = await query;
  if (r.error) return jsonWithCookies(res, { ok: false, error: r.error.message }, { status: 500 });

  return jsonWithCookies(res, { ok: true, items: r.data ?? [] });
}
