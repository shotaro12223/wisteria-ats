import { NextResponse, NextRequest } from "next/server";
import { supabaseRoute } from "@/lib/supabaseRoute";

export const dynamic = "force-dynamic";

// GET: 全ての打ち合わせ依頼を取得（管理者用）
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

  // Verify user is NOT a client user (admin only)
  const { data: clientUser } = await supabase
    .from("client_users")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (clientUser) {
    return NextResponse.json(
      { ok: false, error: { message: "Access denied. Admin only." } },
      { status: 403 }
    );
  }

  // Get filter parameters
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const companyId = url.searchParams.get("companyId");

  // Fetch meeting requests with company info
  let query = supabase
    .from("meeting_requests")
    .select(`
      *,
      companies:company_id (
        id,
        company_name
      ),
      client_users:client_user_id (
        id,
        name,
        email
      )
    `)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  if (companyId) {
    query = query.eq("company_id", companyId);
  }

  const { data: requests, error: requestsError } = await query;

  if (requestsError) {
    return NextResponse.json(
      { ok: false, error: { message: requestsError.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, data: requests ?? [] });
}
