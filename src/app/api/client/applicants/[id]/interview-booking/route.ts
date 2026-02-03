import { NextResponse, NextRequest } from "next/server";
import { supabaseRoute } from "@/lib/supabaseRoute";

export const dynamic = "force-dynamic";

// GET: Get interview booking for this applicant (client view - read only)
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: applicantId } = await ctx.params;
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

  // Get client user
  const { data: clientUser, error: clientUserError } = await supabase
    .from("client_users")
    .select("id, company_id, is_active")
    .eq("user_id", user.id)
    .single();

  if (clientUserError || !clientUser || !clientUser.is_active) {
    return NextResponse.json(
      { ok: false, error: { message: "Client user not found" } },
      { status: 403 }
    );
  }

  // Check if applicant is shared with this company and get interview info
  const { data: applicant, error: applicantError } = await supabase
    .from("applicants")
    .select("id, company_id, shared_with_client, interview_date, interview_start_time, interview_end_time")
    .eq("id", applicantId)
    .eq("company_id", clientUser.company_id)
    .eq("shared_with_client", true)
    .single();

  if (applicantError || !applicant) {
    return NextResponse.json(
      { ok: false, error: { message: "Applicant not found or not shared" } },
      { status: 404 }
    );
  }

  // Build booked slot response
  let bookedSlot = null;
  if (applicant.interview_date) {
    bookedSlot = {
      id: `interview_${applicantId}`,
      available_date: applicant.interview_date,
      start_time: applicant.interview_start_time || "10:00:00",
      end_time: applicant.interview_end_time || "11:00:00",
      note: null,
      is_booked: true,
      booked_applicant_id: applicantId,
    };
  }

  return NextResponse.json({
    ok: true,
    data: {
      bookedSlot,
    },
  });
}
