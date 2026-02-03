import { NextResponse, NextRequest } from "next/server";
import { supabaseRoute } from "@/lib/supabaseRoute";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// GET: サイドバー用の未読・未対応カウントを返す
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

  // Verify admin
  const { data: member } = await supabaseAdmin
    .from("workspace_members")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member || member.role !== "admin") {
    return NextResponse.json(
      { ok: false, error: { message: "Access denied" } },
      { status: 403 }
    );
  }

  // Count unread support messages (from client, not yet read by admin)
  const { count: supportCount } = await supabaseAdmin
    .from("client_support_messages")
    .select("id", { count: "exact", head: true })
    .eq("is_from_client", true)
    .is("read_at", null);

  // Count pending meeting requests
  const { count: meetingCount } = await supabaseAdmin
    .from("meeting_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  return NextResponse.json({
    ok: true,
    data: {
      support: supportCount ?? 0,
      meetings: meetingCount ?? 0,
    },
  });
}
