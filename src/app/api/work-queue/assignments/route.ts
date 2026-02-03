import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseRoute";

export const dynamic = "force-dynamic";

/**
 * GET /api/work-queue/assignments
 * 全アサインメント取得
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
      .from("work_queue_assignments")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { ok: false, error: { message: error.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, assignments: data ?? [] });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: { message: String(e?.message ?? e) } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/work-queue/assignments
 * アサインメント作成/更新
 * Body: { job_id, site_key, assignee_user_id?, deadline?, note? }
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
    const { job_id, site_key, assignee_user_id, deadline, note } = body;

    if (!job_id || !site_key) {
      return NextResponse.json(
        { ok: false, error: { message: "job_id and site_key are required" } },
        { status: 400 }
      );
    }

    const userId = auth.user.id;

    // アサインメントをUPSERT
    const { data, error } = await supabase
      .from("work_queue_assignments")
      .upsert(
        {
          job_id,
          site_key,
          assignee_user_id: assignee_user_id || null,
          deadline: deadline || null,
          note: note || null,
          created_by: userId,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "job_id,site_key",
        }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: { message: error.message } },
        { status: 500 }
      );
    }

    // イベント記録
    await supabase.from("work_queue_events").insert({
      job_id,
      site_key,
      user_id: userId,
      event_type: "assigned",
      new_value: assignee_user_id || null,
      occurred_at: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, assignment: data });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: { message: String(e?.message ?? e) } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/work-queue/assignments
 * アサインメント削除
 * Query: ?job_id=xxx&site_key=yyy
 */
export async function DELETE(req: NextRequest) {
  try {
    const { supabase } = supabaseRoute(req);

    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth?.user) {
      return NextResponse.json(
        { ok: false, error: { message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const job_id = url.searchParams.get("job_id");
    const site_key = url.searchParams.get("site_key");

    if (!job_id || !site_key) {
      return NextResponse.json(
        { ok: false, error: { message: "job_id and site_key are required" } },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("work_queue_assignments")
      .delete()
      .eq("job_id", job_id)
      .eq("site_key", site_key);

    if (error) {
      return NextResponse.json(
        { ok: false, error: { message: error.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: { message: String(e?.message ?? e) } },
      { status: 500 }
    );
  }
}
