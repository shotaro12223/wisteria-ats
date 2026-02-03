import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseRoute";

export const dynamic = "force-dynamic";

// GET /api/work-queue/unacknowledged-count - 未確認タスク数を取得
export async function GET(req: NextRequest) {
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

  try {
    // 自分が担当で未確認のタスク数をカウント
    const { count, error: countError } = await supabase
      .from("work_queue_items")
      .select("*", { count: "exact", head: true })
      .neq("status", "completed")
      .eq("is_acknowledged", false)
      .or(`assignee_user_id.eq.${user.id},assignee_user_ids.cs.{${user.id}}`);

    if (countError) {
      // is_acknowledged カラムがない場合は 0 を返す
      if (countError.message.includes("column") && countError.message.includes("is_acknowledged")) {
        return NextResponse.json({ ok: true, count: 0 });
      }
      return NextResponse.json(
        { ok: false, error: { message: countError.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, count: count || 0 });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: { message: err?.message ?? "Unknown error" } },
      { status: 500 }
    );
  }
}
