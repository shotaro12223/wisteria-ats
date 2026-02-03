import { NextResponse, NextRequest } from "next/server";
import { supabaseRoute } from "@/lib/supabaseRoute";

export const dynamic = "force-dynamic";

// GET: Fetch tags for an applicant
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

  // Verify applicant belongs to client's company
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

  // Fetch applicant's tags with tag details
  const { data: applicantTags, error: tagsError } = await supabase
    .from("client_applicant_tags")
    .select(`
      id,
      tag_id,
      created_at,
      client_tags (
        id,
        name,
        color
      )
    `)
    .eq("applicant_id", applicantId)
    .eq("company_id", clientUser.company_id);

  if (tagsError) {
    console.error("[ApplicantTags] Fetch error:", tagsError);
    return NextResponse.json(
      { ok: false, error: { message: "Failed to fetch tags" } },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    data: applicantTags || [],
  });
}

// POST: Add tag to applicant
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

  // Verify applicant belongs to client's company
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
  const { tagId } = body;

  if (!tagId) {
    return NextResponse.json(
      { ok: false, error: { message: "Tag ID is required" } },
      { status: 400 }
    );
  }

  // Verify tag belongs to company
  const { data: tag, error: tagError } = await supabase
    .from("client_tags")
    .select("id")
    .eq("id", tagId)
    .eq("company_id", clientUser.company_id)
    .single();

  if (tagError || !tag) {
    return NextResponse.json(
      { ok: false, error: { message: "Tag not found" } },
      { status: 404 }
    );
  }

  // Add tag to applicant
  const { data: newApplicantTag, error: insertError } = await supabase
    .from("client_applicant_tags")
    .insert({
      applicant_id: applicantId,
      tag_id: tagId,
      company_id: clientUser.company_id,
      created_at: new Date().toISOString(),
    })
    .select(`
      id,
      tag_id,
      created_at,
      client_tags (
        id,
        name,
        color
      )
    `)
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json(
        { ok: false, error: { message: "このタグは既に付いています" } },
        { status: 400 }
      );
    }
    console.error("[ApplicantTags] Insert error:", insertError);
    return NextResponse.json(
      { ok: false, error: { message: "Failed to add tag" } },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, data: newApplicantTag });
}

// DELETE: Remove tag from applicant
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
  const { tagId } = body;

  if (!tagId) {
    return NextResponse.json(
      { ok: false, error: { message: "Tag ID is required" } },
      { status: 400 }
    );
  }

  // Delete tag from applicant
  const { error: deleteError } = await supabase
    .from("client_applicant_tags")
    .delete()
    .eq("applicant_id", applicantId)
    .eq("tag_id", tagId)
    .eq("company_id", clientUser.company_id);

  if (deleteError) {
    console.error("[ApplicantTags] Delete error:", deleteError);
    return NextResponse.json(
      { ok: false, error: { message: "Failed to remove tag" } },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
