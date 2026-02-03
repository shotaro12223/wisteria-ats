import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseRoute";

export const dynamic = "force-dynamic";

/**
 * POST /api/work-queue/assignments/batch
 * 複数のアサインメントを一括作成/更新
 * Body: { items: [{ job_id, site_key, assignee_user_id?, deadline?, note? }] }
 */
export async function POST(req: NextRequest) {
  try {
    const { supabase } = supabaseRoute(req);

    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth?.user) {
      return NextResponse.json(
        { ok: false, error: { message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const items = body.items;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { ok: false, error: { message: "items array is required" } },
        { status: 400 }
      );
    }

    const userId = auth.user.id;
    const now = new Date().toISOString();

    // アサインメントをバッチUPSERT
    const assignments = items.map((item: any) => ({
      job_id: item.job_id,
      site_key: item.site_key,
      assignee_user_id: item.assignee_user_id || null,
      deadline: item.deadline || null,
      note: item.note || null,
      created_by: userId,
      updated_at: now,
    }));

    const { data, error } = await supabase
      .from("work_queue_assignments")
      .upsert(assignments, {
        onConflict: "job_id,site_key",
      })
      .select();

    if (error) {
      return NextResponse.json(
        { ok: false, error: { message: error.message } },
        { status: 500 }
      );
    }

    // イベント記録（バッチ）
    const events = items.map((item: any) => ({
      job_id: item.job_id,
      site_key: item.site_key,
      user_id: userId,
      event_type: "assigned",
      new_value: item.assignee_user_id || null,
      occurred_at: now,
    }));

    await supabase.from("work_queue_events").insert(events);

    return NextResponse.json({ ok: true, assignments: data ?? [] });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: { message: String(e?.message ?? e) } },
      { status: 500 }
    );
  }
}
