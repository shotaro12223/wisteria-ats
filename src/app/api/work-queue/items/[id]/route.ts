import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseRoute";

export const dynamic = "force-dynamic";

// PATCH /api/work-queue/items/[id] - 更新
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
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

  const body = await req.json();
  const { title, task_type, company_id, assignee_user_id, assignee_user_ids, deadline, preferred_date, note, status, is_acknowledged, priority } = body;

  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (title !== undefined) updateData.title = title;
  if (task_type !== undefined) updateData.task_type = task_type;
  if (company_id !== undefined) updateData.company_id = company_id;
  if (assignee_user_id !== undefined) updateData.assignee_user_id = assignee_user_id;
  if (assignee_user_ids !== undefined) {
    // 複数担当者の更新
    if (Array.isArray(assignee_user_ids) && assignee_user_ids.length > 0) {
      updateData.assignee_user_ids = assignee_user_ids;
      // 主担当も更新（配列の最初の要素）
      updateData.assignee_user_id = assignee_user_ids[0];
    } else {
      updateData.assignee_user_ids = null;
    }
  }
  if (deadline !== undefined) updateData.deadline = deadline;
  if (preferred_date !== undefined) updateData.preferred_date = preferred_date;
  if (note !== undefined) updateData.note = note;
  if (status !== undefined) updateData.status = status;
  if (is_acknowledged !== undefined) updateData.is_acknowledged = is_acknowledged;
  if (priority !== undefined) updateData.priority = priority;

  console.log("[WorkQueue PATCH API] Updating item:", id, "with data:", updateData);

  const { data: item, error: updateError } = await supabase
    .from("work_queue_items")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    console.error("[WorkQueue PATCH API] Update error:", updateError);
    return NextResponse.json(
      { ok: false, error: { message: updateError.message } },
      { status: 500 }
    );
  }

  console.log("[WorkQueue PATCH API] Updated item:", {
    id: item.id,
    status: item.status,
    priority: item.priority,
    is_acknowledged: item.is_acknowledged
  });

  return NextResponse.json({ ok: true, data: item });
}

// DELETE /api/work-queue/items/[id] - 削除
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
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

  const { error: deleteError } = await supabase
    .from("work_queue_items")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return NextResponse.json(
      { ok: false, error: { message: deleteError.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, data: { id } });
}
