import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { supabaseRoute } from "@/lib/supabaseRoute";

export const dynamic = "force-dynamic";

type ApplicantRow = {
  id: string;
  company_id: string;
  job_id: string;
  applied_at: string;
  name: string;
  email?: string | null;
  status: string;
};

export async function GET(req: NextRequest) {
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

  // Authorization check
  const { data: clientUser } = await supabase
    .from("client_users")
    .select("company_id, is_active")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  const { data: workspaceMember } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("user_id", user.id)
    .single();

  const isAdmin = workspaceMember?.role === "admin";

  if (!clientUser && !isAdmin) {
    return NextResponse.json(
      { ok: false, error: { message: "Access denied" } },
      { status: 403 }
    );
  }

  // Get all non-deleted applicants (use supabase instead of supabaseAdmin)
  let query = supabase
    .from("applicants")
    .select("id, company_id, job_id, applied_at, name, email, status")
    .is("deleted_at", null);

  // Filter by company for client users
  if (clientUser) {
    query = query.eq("company_id", clientUser.company_id);
  }

  const { data, error } = await query.order("applied_at", { ascending: false });

  if (error) {
    console.error("[applicants/duplicates] Query error:", error);
    return NextResponse.json(
      { ok: false, error: { message: "重複検出処理に失敗しました" } },
      { status: 500 }
    );
  }

  // Group by company_id + job_id + applied_at (date only)
  const duplicateMap = new Map<string, ApplicantRow[]>();

  for (const applicant of data || []) {
    const appliedDate = String(applicant.applied_at).split("T")[0]; // Extract date part only
    const key = `${applicant.company_id}_${applicant.job_id}_${appliedDate}`;

    if (!duplicateMap.has(key)) {
      duplicateMap.set(key, []);
    }
    duplicateMap.get(key)!.push(applicant as ApplicantRow);
  }

  // Filter groups with 2 or more applicants
  const duplicateGroups = Array.from(duplicateMap.values()).filter(
    (group) => group.length >= 2
  );

  const totalDuplicates = duplicateGroups.reduce(
    (sum, group) => sum + group.length,
    0
  );

  return NextResponse.json({
    ok: true,
    data: {
      duplicateGroups,
      totalDuplicates,
      groupCount: duplicateGroups.length,
    },
  });
}
