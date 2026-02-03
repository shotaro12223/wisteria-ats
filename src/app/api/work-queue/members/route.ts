import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseRoute";

export const dynamic = "force-dynamic";

/**
 * GET /api/work-queue/members
 * チームメンバー一覧取得（アサイン用）
 */
export async function GET(req: NextRequest) {
  try {
    const { supabase } = supabaseRoute(req);

    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth?.user) {
      return NextResponse.json(
        { ok: false, error: { message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from("workspace_members")
      .select("user_id, display_name, avatar_url, role, presence_status")
      .order("display_name", { ascending: true });

    if (error) {
      return NextResponse.json(
        { ok: false, error: { message: error.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, data: data ?? [] });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: { message: String(e?.message ?? e) } },
      { status: 500 }
    );
  }
}
