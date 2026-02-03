import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { supabaseRoute } from "@/lib/supabaseRoute";
import { recordAuditLog } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { supabase } = supabaseRoute(req);

  // Authentication check
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

  // Authorization check: Only admins can batch delete
  const { data: workspaceMember } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("user_id", user.id)
    .single();

  const isAdmin = workspaceMember?.role === "admin";

  if (!isAdmin) {
    return NextResponse.json(
      { ok: false, error: { message: "Access denied" } },
      { status: 403 }
    );
  }

  let body: { ids: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  const { ids } = body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json(
      { ok: false, error: { message: "ids array required and must not be empty" } },
      { status: 400 }
    );
  }

  // Validate all IDs are strings
  if (!ids.every((id) => typeof id === "string")) {
    return NextResponse.json(
      { ok: false, error: { message: "All ids must be strings" } },
      { status: 400 }
    );
  }

  // Batch soft delete
  const { error } = await supabaseAdmin
    .from("applicants")
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .in("id", ids);

  if (error) {
    console.error("[applicants/batch-delete] Error:", error);
    return NextResponse.json(
      { ok: false, error: { message: "一括削除に失敗しました" } },
      { status: 500 }
    );
  }

  // 監査ログ記録（一括削除）
  if (user?.id) {
    for (const id of ids) {
      await recordAuditLog({
        userId: user.id,
        action: "applicant_delete",
        resourceType: "applicant",
        resourceId: id,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    data: { deletedCount: ids.length },
  });
}
