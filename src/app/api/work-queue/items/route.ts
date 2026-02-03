import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseRoute";

export const dynamic = "force-dynamic";

// GET /api/work-queue/items - キュー一覧取得
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

  const { data: items, error: itemsError } = await supabase
    .from("work_queue_items")
    .select(`
      id,
      title,
      task_type,
      status,
      priority,
      is_acknowledged,
      company_id,
      assignee_user_id,
      assignee_user_ids,
      deadline,
      preferred_date,
      note,
      created_by,
      created_at,
      updated_at,
      companies:company_id (
        id,
        company_name
      )
    `)
    .order("created_at", { ascending: false });

  if (itemsError) {
    return NextResponse.json(
      { ok: false, error: { message: itemsError.message } },
      { status: 500 }
    );
  }

  // Fetch assignee info for each item (optimized with parallel queries)
  try {
    const itemsWithDetails = await Promise.all(
      (items || []).map(async (item) => {
        let assigneeInfo = null;
        if (item.assignee_user_id) {
          const { data: memberData } = await supabase
            .from("workspace_members")
            .select("user_id, display_name, avatar_url")
            .eq("user_id", item.assignee_user_id)
            .maybeSingle();
          assigneeInfo = memberData;
        }

        return {
          ...item,
          assignee_info: assigneeInfo,
        };
      })
    );

    return NextResponse.json({ ok: true, data: itemsWithDetails });
  } catch (error) {
    console.error("[Work Queue API] Error fetching assignee info:", error);
    return NextResponse.json(
      { ok: false, error: { message: "Failed to fetch assignee information" } },
      { status: 500 }
    );
  }
}

// POST /api/work-queue/items - 新規追加
export async function POST(req: NextRequest) {
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
  const {
    title,
    task_type,
    company_id,
    assignee_user_id,
    assignee_user_ids,
    deadline,
    preferred_date,
    note,
  } = body;

  if (!title || !task_type) {
    return NextResponse.json(
      { ok: false, error: { message: "title and task_type are required" } },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();

  // 複数担当者がある場合は assignee_user_ids を使用、なければ assignee_user_id から配列を作成
  let finalAssigneeIds: string[] | null = null;
  if (assignee_user_ids && Array.isArray(assignee_user_ids) && assignee_user_ids.length > 0) {
    finalAssigneeIds = assignee_user_ids;
  } else if (assignee_user_id) {
    finalAssigneeIds = [assignee_user_id];
  }

  const { data: item, error: itemError } = await supabase
    .from("work_queue_items")
    .insert({
      title,
      task_type,
      company_id: company_id || null,
      assignee_user_id: assignee_user_id || null,
      assignee_user_ids: finalAssigneeIds,
      deadline: deadline || null,
      preferred_date: preferred_date || null,
      note: note || null,
      status: "pending",
      priority: "medium",
      is_acknowledged: false,
      created_by: user.id,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (itemError) {
    return NextResponse.json(
      { ok: false, error: { message: itemError.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, data: item });
}
