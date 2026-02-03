import { NextResponse, NextRequest } from "next/server";
import { supabaseRoute } from "@/lib/supabaseRoute";

export const dynamic = "force-dynamic";

// GET: Fetch interview schedules for the client's company
export async function GET(req: NextRequest) {
  const { supabase } = supabaseRoute(req);

  // Get authenticated user
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

  // Get client user info
  const { data: clientUser, error: clientUserError } = await supabase
    .from("client_users")
    .select("id, company_id, is_active")
    .eq("user_id", user.id)
    .single();

  if (clientUserError || !clientUser) {
    return NextResponse.json(
      { ok: false, error: { message: "Client user not found" } },
      { status: 403 }
    );
  }

  if (!clientUser.is_active) {
    return NextResponse.json(
      { ok: false, error: { message: "Account is inactive" } },
      { status: 403 }
    );
  }

  // Parse query params for date range
  const url = new URL(req.url);
  const startDate = url.searchParams.get("start");
  const endDate = url.searchParams.get("end");
  const status = url.searchParams.get("status");

  // Build query
  let query = supabase
    .from("interview_schedules")
    .select(`
      *,
      applicants (
        id,
        name,
        status
      ),
      jobs (
        id,
        job_title
      )
    `)
    .eq("company_id", clientUser.company_id)
    .order("interview_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (startDate) {
    query = query.gte("interview_date", startDate);
  }

  if (endDate) {
    query = query.lte("interview_date", endDate);
  }

  if (status) {
    query = query.eq("status", status);
  }

  const { data: schedules, error: schedulesError } = await query;

  if (schedulesError) {
    console.error("[Interview Schedules] Fetch error:", schedulesError);
    return NextResponse.json(
      { ok: false, error: { message: "Failed to fetch interview schedules" } },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    data: schedules || [],
  });
}
