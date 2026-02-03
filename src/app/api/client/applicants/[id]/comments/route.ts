import { NextResponse, NextRequest } from "next/server";
import { supabaseRoute } from "@/lib/supabaseRoute";

export const dynamic = "force-dynamic";

// GET: Fetch all comments for an applicant
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: applicantId } = await ctx.params;
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
    .select("id, company_id, is_active, display_name")
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

  // Verify applicant belongs to client's company and is shared
  const { data: applicant, error: applicantError } = await supabase
    .from("applicants")
    .select("id")
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

  // Fetch comments with user names
  const { data: comments, error: commentsError } = await supabase
    .from("client_applicant_comments")
    .select(`
      id,
      content,
      created_at,
      updated_at,
      client_user_id,
      client_users (
        id,
        display_name
      )
    `)
    .eq("applicant_id", applicantId)
    .eq("company_id", clientUser.company_id)
    .order("created_at", { ascending: false });

  if (commentsError) {
    console.error("[Comments] Fetch error:", commentsError);
    return NextResponse.json(
      { ok: false, error: { message: "Failed to fetch comments" } },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    data: {
      comments: comments || [],
      currentUserId: clientUser.id,
    },
  });
}

// POST: Add a new comment
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: applicantId } = await ctx.params;
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

  // Verify applicant belongs to client's company and is shared
  const { data: applicant, error: applicantError } = await supabase
    .from("applicants")
    .select("id")
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

  // Parse request body
  const body = await req.json();
  const { content } = body;

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json(
      { ok: false, error: { message: "Comment content is required" } },
      { status: 400 }
    );
  }

  // Insert comment
  const { data: newComment, error: insertError } = await supabase
    .from("client_applicant_comments")
    .insert({
      applicant_id: applicantId,
      client_user_id: clientUser.id,
      company_id: clientUser.company_id,
      content: content.trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select(`
      id,
      content,
      created_at,
      updated_at,
      client_user_id,
      client_users (
        id,
        display_name
      )
    `)
    .single();

  if (insertError) {
    console.error("[Comments] Insert error:", insertError);
    return NextResponse.json(
      { ok: false, error: { message: "Failed to add comment" } },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, data: newComment });
}

// DELETE: Remove a comment
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: applicantId } = await ctx.params;
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

  // Parse request body
  const body = await req.json();
  const { commentId } = body;

  if (!commentId) {
    return NextResponse.json(
      { ok: false, error: { message: "Comment ID is required" } },
      { status: 400 }
    );
  }

  // Verify comment exists and belongs to current user
  const { data: comment, error: commentError } = await supabase
    .from("client_applicant_comments")
    .select("id, client_user_id")
    .eq("id", commentId)
    .eq("applicant_id", applicantId)
    .eq("company_id", clientUser.company_id)
    .single();

  if (commentError || !comment) {
    return NextResponse.json(
      { ok: false, error: { message: "Comment not found" } },
      { status: 404 }
    );
  }

  // Only allow deletion of own comments
  if (comment.client_user_id !== clientUser.id) {
    return NextResponse.json(
      { ok: false, error: { message: "Cannot delete other user's comment" } },
      { status: 403 }
    );
  }

  // Delete comment
  const { error: deleteError } = await supabase
    .from("client_applicant_comments")
    .delete()
    .eq("id", commentId);

  if (deleteError) {
    console.error("[Comments] Delete error:", deleteError);
    return NextResponse.json(
      { ok: false, error: { message: "Failed to delete comment" } },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
