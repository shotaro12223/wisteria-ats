import { NextResponse, NextRequest } from "next/server";
import { supabaseRoute } from "@/lib/supabaseRoute";

export const dynamic = "force-dynamic";

/**
 * POST /api/client/applicants/batch-tags
 * Fetch tags for multiple applicants in a single query
 * Body: { applicantIds: string[] }
 * Returns: { ok: true, data: Record<string, Array<{ tag_id: string, ... }>> }
 */
export async function POST(req: NextRequest) {
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

  // Get client user info to get company_id
  const { data: clientUser, error: clientUserError } = await supabase
    .from("client_users")
    .select("company_id, is_active")
    .eq("user_id", user.id)
    .single();

  let companyId: string | null = null;
  let isAdmin = false;

  if (clientUserError || !clientUser) {
    // Not a client user - check if workspace member (admin)
    const { data: workspaceMember } = await supabase
      .from("workspace_members")
      .select("user_id")
      .eq("user_id", user.id)
      .single();

    if (!workspaceMember) {
      return NextResponse.json(
        { ok: false, error: { message: "Access denied" } },
        { status: 403 }
      );
    }

    isAdmin = true;
  } else {
    if (!clientUser.is_active) {
      return NextResponse.json(
        { ok: false, error: { message: "Account is inactive" } },
        { status: 403 }
      );
    }

    companyId = clientUser.company_id;
  }

  // Parse request body
  const body = await req.json();
  const { applicantIds } = body;

  if (!applicantIds || !Array.isArray(applicantIds) || applicantIds.length === 0) {
    return NextResponse.json(
      { ok: false, error: { message: "applicantIds array is required" } },
      { status: 400 }
    );
  }

  // Fetch all tags for the requested applicants in a single query
  let query = supabase
    .from("client_applicant_tags")
    .select(`
      applicant_id,
      tag_id,
      client_tags (
        id,
        name,
        color
      )
    `)
    .in("applicant_id", applicantIds);

  // Filter by company if not admin
  if (!isAdmin && companyId) {
    query = query.eq("company_id", companyId);
  }

  const { data: allTags, error: tagsError } = await query;

  if (tagsError) {
    console.error("[BatchTags] Fetch error:", tagsError);
    return NextResponse.json(
      { ok: false, error: { message: "Failed to fetch tags" } },
      { status: 500 }
    );
  }

  // Group tags by applicant_id for easier consumption
  const tagsByApplicant: Record<string, any[]> = {};

  applicantIds.forEach((id: string) => {
    tagsByApplicant[id] = [];
  });

  (allTags || []).forEach((tag) => {
    if (tag.applicant_id && tagsByApplicant[tag.applicant_id] !== undefined) {
      tagsByApplicant[tag.applicant_id].push(tag);
    }
  });

  return NextResponse.json({
    ok: true,
    data: tagsByApplicant,
  });
}
