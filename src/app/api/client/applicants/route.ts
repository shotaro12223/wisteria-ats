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
    console.log("[API /client/applicants] Auth error:", authError?.message || "No user");
    return NextResponse.json(
      { ok: false, error: { message: "Unauthorized" } },
      { status: 401 }
    );
  }

  console.log("[API /client/applicants] Authenticated user:", user.id);

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
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!workspaceMember || workspaceMember.role !== "admin") {
      console.log("[API /client/applicants] Not an admin user");
      return NextResponse.json(
        { ok: false, error: { message: "Access denied" } },
        { status: 403 }
      );
    }

    // Admin user - can view all applicants or specific company
    isAdmin = true;
    companyId = companyIdParam;
    console.log("[API /client/applicants] Admin user access, companyId:", companyId);
  } else {
    if (!clientUser.is_active) {
      console.log("[API /client/applicants] Client user inactive");
      return NextResponse.json(
        { ok: false, error: { message: "Account is inactive" } },
        { status: 403 }
      );
    }

    companyId = clientUser.company_id;
    console.log("[API /client/applicants] Client user found:", companyId);
  }

  // Get filter and pagination parameters
  const jobId = url.searchParams.get("jobId");
  const status = url.searchParams.get("status");
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "50");

  // Validate pagination parameters
  const validPage = Math.max(1, page);
  const validLimit = Math.max(1, Math.min(100, limit)); // Max 100 per page
  const offset = (validPage - 1) * validLimit;

  // Build base query for counting
  let countQuery = supabase
    .from("applicants")
    .select("*", { count: "exact", head: true })
    .is("deleted_at", null);

  // Filter by company
  if (companyId) {
    countQuery = countQuery.eq("company_id", companyId).eq("shared_with_client", true);
  }

  if (jobId) {
    countQuery = countQuery.eq("job_id", jobId);
  }

  if (status) {
    countQuery = countQuery.eq("status", status);
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

  // Build query for data with pagination (select only necessary fields)
  let query = supabase
    .from("applicants")
    .select(`
      id,
      company_id,
      job_id,
      name,
      status,
      applied_at,
      site_key,
      created_at,
      updated_at,
      shared_with_client,
      shared_at,
      client_comment
    `)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(offset, offset + validLimit - 1);

  // Filter by company
  if (companyId) {
    query = query.eq("company_id", companyId).eq("shared_with_client", true);
  }

  if (jobId) {
    query = query.eq("job_id", jobId);
  }

  if (status) {
    query = query.eq("status", status);
  }

  const { data: applicants, error: applicantsError } = await query;

  if (applicantsError) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: applicantsError.message,
        },
      },
      { status: 500 }
    );
  }

  const totalPages = Math.ceil((totalCount || 0) / validLimit);

  return NextResponse.json({
    ok: true,
    data: applicants ?? [],
    pagination: {
      page: validPage,
      limit: validLimit,
      totalCount: totalCount || 0,
      totalPages,
      hasNextPage: validPage < totalPages,
      hasPreviousPage: validPage > 1,
    },
  });
}
