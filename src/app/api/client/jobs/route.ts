import { NextResponse, NextRequest } from "next/server";
import { supabaseRoute } from "@/lib/supabaseRoute";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { supabase } = supabaseRoute(req);

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.log("[API /client/jobs] Auth error:", authError?.message || "No user");
    return NextResponse.json(
      { ok: false, error: { message: "Unauthorized" } },
      { status: 401 }
    );
  }

  console.log("[API /client/jobs] Authenticated user:", user.id);

  // Get client user info to get company_id
  const { data: clientUser, error: clientUserError } = await supabase
    .from("client_users")
    .select("company_id, is_active")
    .eq("user_id", user.id)
    .single();

  let companyId: string | null = null;
  let isAdmin = false;

  // Get URL parameters first
  const url = new URL(req.url);
  const companyIdParam = url.searchParams.get("companyId");

  if (clientUserError || !clientUser) {
    // Not a client user - check if workspace member (admin)
    const { data: workspaceMember } = await supabase
      .from("workspace_members")
      .select("user_id")
      .eq("user_id", user.id)
      .single();

    if (!workspaceMember) {
      console.log("[API /client/jobs] Not a client user or workspace member");
      return NextResponse.json(
        { ok: false, error: { message: "Access denied" } },
        { status: 403 }
      );
    }

    // Admin user - can view all jobs or specific company
    isAdmin = true;
    companyId = companyIdParam;
    console.log("[API /client/jobs] Admin user access, companyId:", companyId);
  } else {
    if (!clientUser.is_active) {
      console.log("[API /client/jobs] Client user inactive");
      return NextResponse.json(
        { ok: false, error: { message: "Account is inactive" } },
        { status: 403 }
      );
    }

    companyId = clientUser.company_id;
    console.log("[API /client/jobs] Client user found:", companyId);
  }
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "50");

  // Validate pagination parameters
  const validPage = Math.max(1, page);
  const validLimit = Math.max(1, Math.min(100, limit)); // Max 100 per page
  const offset = (validPage - 1) * validLimit;

  // Build base query for counting
  let countQuery = supabase
    .from("jobs")
    .select("*", { count: "exact", head: true });

  // Filter by company
  if (companyId) {
    countQuery = countQuery.eq("company_id", companyId);
  }

  // Get total count
  const { count: totalCount, error: countError } = await countQuery;

  if (countError) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: countError.message,
        },
      },
      { status: 500 }
    );
  }

  // Fetch jobs with pagination
  let query = supabase
    .from("jobs")
    .select(
      `
      id,
      company_id,
      company_name,
      job_title,
      employment_type,
      site_status,
      created_at,
      updated_at
    `
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + validLimit - 1);

  // Filter by company
  if (companyId) {
    query = query.eq("company_id", companyId);
  }

  const { data: jobs, error: jobsError } = await query;

  if (jobsError) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: jobsError.message,
        },
      },
      { status: 500 }
    );
  }

  const totalPages = Math.ceil((totalCount || 0) / validLimit);

  return NextResponse.json(
    {
      ok: true,
      data: jobs ?? [],
      pagination: {
        page: validPage,
        limit: validLimit,
        totalCount: totalCount || 0,
        totalPages,
        hasNextPage: validPage < totalPages,
        hasPreviousPage: validPage > 1,
      },
    },
    {
      headers: {
        "Cache-Control": "private, s-maxage=180, stale-while-revalidate=300",
      },
    }
  );
}
