import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseRoute";

export const dynamic = "force-dynamic";

function jsonWithCookies(baseRes: NextResponse, body: any, init?: { status?: number }) {
  const out = NextResponse.json(body, init);
  baseRes.cookies.getAll().forEach((c) => {
    out.cookies.set(c.name, c.value, c);
  });
  return out;
}

/**
 * GET
 * - /api/presence        : 全メンバーの状態
 * - /api/presence?me=1   : 自分の状態だけ
 */
export async function GET(req: NextRequest) {
  const { supabase, res } = supabaseRoute(req);

  const { data, error } = await supabase.auth.getUser();
  const userId = data.user?.id;

  if (error || !userId) {
    return jsonWithCookies(res, { ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const meOnly = url.searchParams.get("me") === "1";

  const selectCols =
    "user_id, role, display_name, avatar_url, presence_status, presence_updated_at";

  if (meOnly) {
    const r = await supabase
      .from("workspace_members")
      .select(selectCols)
      .eq("user_id", userId)
      .maybeSingle();

    if (r.error) {
      console.error("[presence] GET error:", r.error);
      return jsonWithCookies(res, { ok: false, error: "プレゼンス情報の取得に失敗しました" }, { status: 500 });
    }
    return jsonWithCookies(res, { ok: true, items: r.data ? [r.data] : [] });
  }

  const r = await supabase
    .from("workspace_members")
    .select(selectCols);

  if (r.error) return jsonWithCookies(res, { ok: false, error: r.error.message }, { status: 500 });
  return jsonWithCookies(res, { ok: true, items: r.data ?? [] });
}

/**
 * PATCH
 * 自分のステータスを更新
 */
export async function PATCH(req: NextRequest) {
  const { supabase, res } = supabaseRoute(req);

  const { data, error } = await supabase.auth.getUser();
  const userId = data.user?.id;

  if (error || !userId) {
    return jsonWithCookies(res, { ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const status = body?.status;
  if (!["working", "away"].includes(status)) {
    return jsonWithCookies(res, { ok: false, error: "invalid status" }, { status: 400 });
  }

  const r = await supabase
    .from("workspace_members")
    .update({
      presence_status: status,
      presence_updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .select("user_id, display_name, presence_status, presence_updated_at")
    .maybeSingle();

  if (r.error) {
    console.error("[presence] PATCH error:", r.error);
    return jsonWithCookies(res, { ok: false, error: "プレゼンス情報の更新に失敗しました" }, { status: 500 });
  }
  return jsonWithCookies(res, { ok: true, item: r.data });
}
