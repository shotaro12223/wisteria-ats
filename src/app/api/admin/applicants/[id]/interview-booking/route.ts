import { NextResponse, NextRequest } from "next/server";
import { supabaseRoute } from "@/lib/supabaseRoute";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// GET: Get interview info for this applicant (admin view)
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: applicantId } = await ctx.params;
  const { supabase } = supabaseRoute(req);

  // Check auth
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

  // Get applicant with interview info
  const { data: applicant, error: applicantError } = await supabaseAdmin
    .from("applicants")
    .select("id, company_id, interview_date, interview_start_time, interview_end_time")
    .eq("id", applicantId)
    .single();

  if (applicantError || !applicant) {
    return NextResponse.json(
      { ok: false, error: { message: "Applicant not found" } },
      { status: 404 }
    );
  }

  // Build booking object if interview is set
  let booking = null;
  if (applicant.interview_date) {
    booking = {
      id: `interview_${applicantId}`,
      available_date: applicant.interview_date,
      start_time: applicant.interview_start_time || "10:00:00",
      end_time: applicant.interview_end_time || "11:00:00",
      note: null,
      is_booked: true,
    };
  }

  // Get available slots from client (if any)
  const today = new Date().toISOString().split("T")[0];
  const { data: availableSlots } = await supabaseAdmin
    .from("interview_availability")
    .select("id, available_date, start_time, end_time, note, is_booked")
    .eq("company_id", applicant.company_id)
    .eq("is_booked", false)
    .gte("available_date", today)
    .order("available_date", { ascending: true })
    .order("start_time", { ascending: true });

  return NextResponse.json({
    ok: true,
    data: {
      booking,
      availableSlots: availableSlots || [],
    },
  });
}

// POST: Set interview date for this applicant (admin)
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: applicantId } = await ctx.params;
  const { supabase } = supabaseRoute(req);

  // Check auth
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

  // Parse body
  let body: { slotId?: string; manualDate?: string; startTime?: string; endTime?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  const { slotId, manualDate, startTime, endTime } = body;

  // Option 1: Select from client's available slots
  if (slotId) {
    // Atomic conditional UPDATE to prevent race condition
    const { data: updatedSlot, error: slotUpdateError } = await supabaseAdmin
      .from("interview_availability")
      .update({
        is_booked: true,
        booked_applicant_id: applicantId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", slotId)
      .eq("is_booked", false)  // Only update if not already booked
      .select("*")
      .single();

    if (slotUpdateError || !updatedSlot) {
      return NextResponse.json(
        { ok: false, error: { message: "このスロットは既に予約済みです" } },
        { status: 400 }
      );
    }

    // Update applicant with interview date
    const { error: updateApplicantError } = await supabaseAdmin
      .from("applicants")
      .update({
        interview_date: updatedSlot.available_date,
        interview_start_time: updatedSlot.start_time,
        interview_end_time: updatedSlot.end_time,
        updated_at: new Date().toISOString(),
      })
      .eq("id", applicantId);

    if (updateApplicantError) {
      console.error("[Interview Booking] Update applicant error:", updateApplicantError);

      // Rollback: Release the slot
      await supabaseAdmin
        .from("interview_availability")
        .update({
          is_booked: false,
          booked_applicant_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", slotId);

      return NextResponse.json(
        { ok: false, error: { message: updateApplicantError.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        id: `interview_${applicantId}`,
        available_date: updatedSlot.available_date,
        start_time: updatedSlot.start_time,
        end_time: updatedSlot.end_time,
        note: updatedSlot.note,
        is_booked: true,
      },
    });
  }

  // Option 2: Manual date input
  if (manualDate) {
    const start = startTime || "10:00";
    const end = endTime || "11:00";

    // Validate date (JST timezone)
    const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
    const nowJst = new Date(Date.now() + JST_OFFSET_MS);
    const today = new Date(nowJst.getUTCFullYear(), nowJst.getUTCMonth(), nowJst.getUTCDate())
      .toISOString().split("T")[0];

    if (manualDate < today) {
      return NextResponse.json(
        { ok: false, error: { message: "過去の日付は指定できません" } },
        { status: 400 }
      );
    }

    // Update applicant with interview date
    const { error: updateError } = await supabaseAdmin
      .from("applicants")
      .update({
        interview_date: manualDate,
        interview_start_time: start,
        interview_end_time: end,
        updated_at: new Date().toISOString(),
      })
      .eq("id", applicantId);

    if (updateError) {
      console.error("[Interview Booking] Update error:", updateError);
      return NextResponse.json(
        { ok: false, error: { message: updateError.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        id: `interview_${applicantId}`,
        available_date: manualDate,
        start_time: start,
        end_time: end,
        note: null,
        is_booked: true,
      },
    });
  }

  return NextResponse.json(
    { ok: false, error: { message: "slotId or manualDate is required" } },
    { status: 400 }
  );
}

// DELETE: Clear interview date for this applicant (admin)
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: applicantId } = await ctx.params;
  const { supabase } = supabaseRoute(req);

  // Check auth
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

  // Clear interview date
  const { error: updateError } = await supabaseAdmin
    .from("applicants")
    .update({
      interview_date: null,
      interview_start_time: null,
      interview_end_time: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", applicantId);

  if (updateError) {
    console.error("[Interview Booking] Clear error:", updateError);
    return NextResponse.json(
      { ok: false, error: { message: updateError.message } },
      { status: 500 }
    );
  }

  // Also unbook any slot that was booked for this applicant
  await supabaseAdmin
    .from("interview_availability")
    .update({
      is_booked: false,
      booked_applicant_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("booked_applicant_id", applicantId);

  return NextResponse.json({ ok: true, data: null });
}
