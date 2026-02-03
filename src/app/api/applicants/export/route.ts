import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { supabaseRoute } from "@/lib/supabaseRoute";
import { recordApplicantExport } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

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

  // Authorization check: Get user's company_id or admin role
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
  let allowedCompanyId: string | null = null;

  if (clientUser) {
    // Client user can only export their company's data
    allowedCompanyId = clientUser.company_id;
  } else if (!isAdmin) {
    // Not a client user and not an admin
    return NextResponse.json(
      { ok: false, error: { message: "Access denied" } },
      { status: 403 }
    );
  }
  // Admin can export all companies (allowedCompanyId remains null)

  const url = new URL(req.url);
  const companyIdParam = url.searchParams.get("companyId");
  const status = url.searchParams.get("status");
  const jobId = url.searchParams.get("jobId");

  // Enforce company_id restriction
  const companyId = allowedCompanyId || companyIdParam;

  // Build query - use supabase (anon) instead of supabaseAdmin
  let query = supabase
    .from("applicants")
    .select("id, name, company_id, job_id, applied_at, site_key, status, note, email, phone, created_at")
    .is("deleted_at", null);

  if (companyId) {
    query = query.eq("company_id", companyId);
  }

  if (status) {
    query = query.eq("status", status);
  }

  if (jobId) {
    query = query.eq("job_id", jobId);
  }

  const { data, error } = await query.order("applied_at", { ascending: false });

  if (error) {
    console.error("[applicants/export] Query error:", error);
    return NextResponse.json(
      { ok: false, error: { message: "エクスポート処理に失敗しました" } },
      { status: 500 }
    );
  }

  // Build CSV
  const headers = [
    "ID",
    "氏名",
    "会社ID",
    "求人ID",
    "応募日",
    "媒体",
    "ステータス",
    "メモ",
    "メールアドレス",
    "電話番号",
    "登録日",
  ];

  const rows =
    data?.map((a) => [
      String(a.id),
      String(a.name || ""),
      String(a.company_id || ""),
      String(a.job_id || ""),
      String(a.applied_at || ""),
      String(a.site_key || ""),
      String(a.status || ""),
      String(a.note || "").replace(/\n/g, " ").replace(/\r/g, ""),
      String(a.email || ""),
      String(a.phone || ""),
      String(a.created_at || ""),
    ]) || [];

  // CSV formatting: escape double quotes and wrap in quotes
  const escapeCSV = (cell: string) => `"${cell.replace(/"/g, '""')}"`;

  const csvContent = [
    headers.map(escapeCSV).join(","),
    ...rows.map((row) => row.map(escapeCSV).join(",")),
  ].join("\n");

  // Add BOM for Excel UTF-8 support
  const bom = "\uFEFF";
  const csvWithBom = bom + csvContent;

  const today = new Date().toISOString().split("T")[0];
  const filename = `applicants_${today}.csv`;

  // 監査ログ記録（データエクスポート）
  if (user?.id) {
    const exportCount = data?.length || 0;
    await recordApplicantExport(user.id, exportCount, companyId || undefined);
  }

  return new Response(csvWithBom, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
