import { NextResponse, NextRequest } from "next/server";
import { supabaseRoute } from "@/lib/supabaseRoute";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// GET: 特定の打ち合わせ依頼を取得
export async function GET(
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

  // Fetch the meeting request
  const { data: request, error: requestError } = await supabase
    .from("meeting_requests")
    .select("*")
    .eq("id", id)
    .eq("company_id", clientUser.company_id)
    .single();

  if (requestError || !request) {
    return NextResponse.json(
      { ok: false, error: { message: "Meeting request not found" } },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, data: request });
}

// PATCH: 日程を確定する（クライアント側）
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

  // Fetch the meeting request to verify ownership
  const { data: existingRequest, error: existingError } = await supabase
    .from("meeting_requests")
    .select("*")
    .eq("id", id)
    .eq("company_id", clientUser.company_id)
    .single();

  if (existingError || !existingRequest) {
    return NextResponse.json(
      { ok: false, error: { message: "Meeting request not found" } },
      { status: 404 }
    );
  }

  // Only allow confirming if dates have been proposed
  if (existingRequest.status !== "dates_proposed") {
    return NextResponse.json(
      { ok: false, error: { message: "Cannot confirm date in current status" } },
      { status: 400 }
    );
  }

  // Parse request body
  let body: { confirmed_date?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  const { confirmed_date } = body;

  if (!confirmed_date) {
    return NextResponse.json(
      { ok: false, error: { message: "confirmed_date is required" } },
      { status: 400 }
    );
  }

  // Validate that confirmed_date is one of the proposed dates
  const proposedDates = existingRequest.proposed_dates || [];
  if (!proposedDates.includes(confirmed_date)) {
    return NextResponse.json(
      { ok: false, error: { message: "Selected date is not in proposed dates" } },
      { status: 400 }
    );
  }

  // Update the meeting request
  const { data: updatedRequest, error: updateError } = await supabase
    .from("meeting_requests")
    .update({
      status: "confirmed",
      confirmed_date,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json(
      { ok: false, error: { message: updateError.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, data: updatedRequest });
}

// DELETE: 打ち合わせ依頼を取り消す（pendingのみ）
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

  // Verify the request exists and is pending
  const { data: existingRequest, error: existingError } = await supabase
    .from("meeting_requests")
    .select("id, status")
    .eq("id", id)
    .eq("company_id", clientUser.company_id)
    .single();

  if (existingError || !existingRequest) {
    return NextResponse.json(
      { ok: false, error: { message: "Meeting request not found" } },
      { status: 404 }
    );
  }

  if (existingRequest.status !== "pending") {
    return NextResponse.json(
      { ok: false, error: { message: "依頼受付中のもののみ取り消しできます" } },
      { status: 400 }
    );
  }

  // Delete the request (use admin client - no client DELETE RLS policy)
  const { error: deleteError } = await supabaseAdmin
    .from("meeting_requests")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return NextResponse.json(
      { ok: false, error: { message: deleteError.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
