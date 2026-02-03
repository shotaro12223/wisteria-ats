import { NextResponse, NextRequest } from "next/server";
import { supabaseRoute } from "@/lib/supabaseRoute";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/applicants/[id]/share
 * クライアントに応募者を連携
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
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

  // Check admin role using supabaseAdmin to bypass RLS
  const { data: workspaceMember } = await supabaseAdmin
    .from("workspace_members")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (!workspaceMember || workspaceMember.role !== "admin") {
    return NextResponse.json(
      { ok: false, error: { message: "Forbidden: Admin only" } },
      { status: 403 }
    );
  }

  // Update applicant to mark as shared
  const { data: applicant, error: updateError } = await supabaseAdmin
    .from("applicants")
    .update({
      shared_with_client: true,
      shared_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: updateError.message,
        },
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, data: applicant });
}

/**
 * DELETE /api/admin/applicants/[id]/share
 * クライアントとの連携を解除
 */
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
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

  // Check admin role
  const { data: workspaceMember } = await supabaseAdmin
    .from("workspace_members")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (!workspaceMember || workspaceMember.role !== "admin") {
    return NextResponse.json(
      { ok: false, error: { message: "Forbidden: Admin only" } },
      { status: 403 }
    );
  }

  // Update applicant to unmark as shared
  const { data: applicant, error: updateError } = await supabaseAdmin
    .from("applicants")
    .update({
      shared_with_client: false,
      shared_at: null,
    })
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: updateError.message,
        },
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, data: applicant });
}
