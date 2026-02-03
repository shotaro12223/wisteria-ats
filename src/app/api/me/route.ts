import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseRoute";

export const dynamic = "force-dynamic";

/**
 * GET /api/me
 * 現在ログインしているユーザー情報を返す
 */
export async function GET(req: NextRequest) {
  try {
    const { supabase } = supabaseRoute(req);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { ok: false, error: { message: "Unauthorized" } },
        { status: 401 }
      );
    }

    // Get workspace member data for additional profile info
    const { data: profile } = await supabase
      .from("workspace_members")
      .select("display_name,avatar_url")
      .eq("user_id", user.id)
      .maybeSingle();

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        display_name: profile?.display_name || null,
        avatar_url: profile?.avatar_url || null,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: { message: String(e?.message ?? e) } },
      { status: 500 }
    );
  }
}
