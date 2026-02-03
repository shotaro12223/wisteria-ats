import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: applicantId } = await ctx.params;

  if (!applicantId) {
    return NextResponse.json(
      { ok: false, error: { message: "applicant id is required" } },
      { status: 400 }
    );
  }

  const { data: feedback, error } = await supabaseAdmin
    .from("applicant_client_feedback")
    .select(`
      id,
      interview_type,
      interview_date,
      interviewer_name,
      interview_result,
      fail_reason,
      fail_reason_detail,
      pass_rating,
      pass_strengths,
      pass_comment,
      hire_intention,
      next_action,
      created_at,
      updated_at,
      client_users (
        id,
        display_name
      )
    `)
    .eq("applicant_id", applicantId)
    .order("interview_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Admin Feedback] Fetch error:", error);
    return NextResponse.json(
      { ok: false, error: { message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, data: feedback || [] });
}
