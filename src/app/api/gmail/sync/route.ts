import { NextRequest, NextResponse } from "next/server";
import { syncGmailMessages } from "@/lib/gmailSync";
import { supabaseRoute } from "@/lib/supabaseRoute";

export const dynamic = "force-dynamic";

/**
 * Gmail同期APIエンドポイント（手動実行用）
 *
 * クエリパラメータ:
 * - label: 同期対象のGmailラベル（デフォルト: "ATS/応募"）
 * - full: "true" で全件同期を強制
 *
 * 返り値:
 * {
 *   ok: boolean,
 *   syncType: "full" | "incremental",
 *   messagesFetched: number,
 *   messagesInserted: number,
 *   error?: string
 * }
 */
export async function POST(req: NextRequest) {
  const { supabase } = supabaseRoute(req);

  // Authentication check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  // Authorization check: Only admins can manually sync Gmail
  const { data: workspaceMember } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("user_id", user.id)
    .single();

  const isAdmin = workspaceMember?.role === "admin";

  if (!isAdmin) {
    return NextResponse.json(
      { ok: false, error: "Access denied" },
      { status: 403 }
    );
  }

  const url = new URL(req.url);
  const labelName = url.searchParams.get("label") ?? "ATS/応募";
  const forceFullSync = url.searchParams.get("full") === "true";

  const result = await syncGmailMessages("central", {
    labelName,
    forceFullSync,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    syncType: result.syncType,
    messagesFetched: result.messagesFetched,
    messagesInserted: result.messagesInserted,
  });
}
