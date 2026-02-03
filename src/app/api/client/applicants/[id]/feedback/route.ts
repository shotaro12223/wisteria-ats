import { NextResponse, NextRequest } from "next/server";
import { supabaseRoute } from "@/lib/supabaseRoute";
import type {
  InterviewResult,
  FailReason,
  HireIntention,
  InterviewType,
} from "@/lib/types";

export const dynamic = "force-dynamic";

// GET: Get all feedback for an applicant
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

  // Check if applicant belongs to this company
  const { data: applicant, error: applicantError } = await supabase
    .from("applicants")
    .select("id, company_id")
    .eq("id", applicantId)
    .single();

  if (applicantError || !applicant) {
    return NextResponse.json(
      { ok: false, error: { message: "Applicant not found" } },
      { status: 404 }
    );
  }

  if (applicant.company_id !== clientUser.company_id) {
    return NextResponse.json(
      { ok: false, error: { message: "Access denied" } },
      { status: 403 }
    );
  }

  // Get all feedback for this applicant
  const { data: feedback, error: fetchError } = await supabase
    .from("applicant_client_feedback")
    .select(`
      *,
      client_users (
        id,
        display_name
      )
    `)
    .eq("applicant_id", applicantId)
    .order("interview_date", { ascending: false });

  if (fetchError) {
    console.error("[Client Feedback] Fetch error:", fetchError);
    return NextResponse.json(
      { ok: false, error: { message: fetchError.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, data: feedback || [] });
}

// POST: Add new feedback
export async function POST(
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

  // Check if applicant belongs to this company
  const { data: applicant, error: applicantError } = await supabase
    .from("applicants")
    .select("id, company_id")
    .eq("id", applicantId)
    .single();

  if (applicantError || !applicant) {
    return NextResponse.json(
      { ok: false, error: { message: "Applicant not found" } },
      { status: 404 }
    );
  }

  if (applicant.company_id !== clientUser.company_id) {
    return NextResponse.json(
      { ok: false, error: { message: "Access denied" } },
      { status: 403 }
    );
  }

  // Parse request body
  let body: {
    interview_type: InterviewType;
    interview_date: string;
    interviewer_name?: string;
    interview_result: InterviewResult;
    fail_reason?: FailReason;
    fail_reason_detail?: string;
    pass_rating?: number;
    pass_strengths?: string[];
    pass_comment?: string;
    hire_intention?: HireIntention;
    next_action?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  const {
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
  } = body;

  // Validation
  if (!interview_type || !interview_date || !interview_result) {
    return NextResponse.json(
      { ok: false, error: { message: "面接タイプ、日付、結果は必須です" } },
      { status: 400 }
    );
  }

  // Validate rating range
  if (pass_rating !== undefined && (pass_rating < 1 || pass_rating > 5)) {
    return NextResponse.json(
      { ok: false, error: { message: "評価は1〜5の範囲で入力してください" } },
      { status: 400 }
    );
  }

  // Insert feedback
  const { data: newFeedback, error: insertError } = await supabase
    .from("applicant_client_feedback")
    .insert({
      applicant_id: applicantId,
      company_id: clientUser.company_id,
      client_user_id: clientUser.id,
      interview_type,
      interview_date,
      interviewer_name: interviewer_name || null,
      interview_result,
      fail_reason: fail_reason || null,
      fail_reason_detail: fail_reason_detail || null,
      pass_rating: pass_rating || null,
      pass_strengths: pass_strengths || null,
      pass_comment: pass_comment || null,
      hire_intention: hire_intention || null,
      next_action: next_action || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select(`
      *,
      client_users (
        id,
        display_name
      )
    `)
    .single();

  if (insertError) {
    console.error("[Client Feedback] Insert error:", insertError);
    return NextResponse.json(
      { ok: false, error: { message: insertError.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, data: newFeedback }, { status: 201 });
}

// PUT: Update feedback
export async function PUT(
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

  // Parse request body
  let body: {
    feedback_id: string;
    interview_type?: InterviewType;
    interview_date?: string;
    interviewer_name?: string;
    interview_result?: InterviewResult;
    fail_reason?: FailReason | null;
    fail_reason_detail?: string | null;
    pass_rating?: number | null;
    pass_strengths?: string[] | null;
    pass_comment?: string | null;
    hire_intention?: HireIntention | null;
    next_action?: string | null;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  const { feedback_id, ...updateFields } = body;

  if (!feedback_id) {
    return NextResponse.json(
      { ok: false, error: { message: "feedback_id is required" } },
      { status: 400 }
    );
  }

  // Check if feedback exists and belongs to this company
  const { data: existing, error: checkError } = await supabase
    .from("applicant_client_feedback")
    .select("id, company_id, applicant_id")
    .eq("id", feedback_id)
    .single();

  if (checkError || !existing) {
    return NextResponse.json(
      { ok: false, error: { message: "Feedback not found" } },
      { status: 404 }
    );
  }

  if (existing.company_id !== clientUser.company_id) {
    return NextResponse.json(
      { ok: false, error: { message: "Access denied" } },
      { status: 403 }
    );
  }

  if (existing.applicant_id !== applicantId) {
    return NextResponse.json(
      { ok: false, error: { message: "Applicant mismatch" } },
      { status: 400 }
    );
  }

  // Update feedback
  const { data: updated, error: updateError } = await supabase
    .from("applicant_client_feedback")
    .update({
      ...updateFields,
      updated_at: new Date().toISOString(),
    })
    .eq("id", feedback_id)
    .select(`
      *,
      client_users (
        id,
        display_name
      )
    `)
    .single();

  if (updateError) {
    console.error("[Client Feedback] Update error:", updateError);
    return NextResponse.json(
      { ok: false, error: { message: updateError.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, data: updated });
}

// DELETE: Delete feedback
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: applicantId } = await ctx.params;
  const { supabase } = supabaseRoute(req);

  const url = new URL(req.url);
  const feedbackId = url.searchParams.get("feedback_id");

  if (!feedbackId) {
    return NextResponse.json(
      { ok: false, error: { message: "feedback_id is required" } },
      { status: 400 }
    );
  }

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

  // Check if feedback exists and belongs to this company
  const { data: existing, error: checkError } = await supabase
    .from("applicant_client_feedback")
    .select("id, company_id, applicant_id")
    .eq("id", feedbackId)
    .single();

  if (checkError || !existing) {
    return NextResponse.json(
      { ok: false, error: { message: "Feedback not found" } },
      { status: 404 }
    );
  }

  if (existing.company_id !== clientUser.company_id) {
    return NextResponse.json(
      { ok: false, error: { message: "Access denied" } },
      { status: 403 }
    );
  }

  if (existing.applicant_id !== applicantId) {
    return NextResponse.json(
      { ok: false, error: { message: "Applicant mismatch" } },
      { status: 400 }
    );
  }

  // Delete feedback
  const { error: deleteError } = await supabase
    .from("applicant_client_feedback")
    .delete()
    .eq("id", feedbackId);

  if (deleteError) {
    console.error("[Client Feedback] Delete error:", deleteError);
    return NextResponse.json(
      { ok: false, error: { message: deleteError.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, data: null });
}
