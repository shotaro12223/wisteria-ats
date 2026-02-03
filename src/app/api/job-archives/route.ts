import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { supabaseRoute } from "@/lib/supabaseRoute";

type ArchiveRow = {
  id: string;
  company_id: string | null;
  job_id: string;
  archived_at: string; // ← 実DBが changed_at 等ならここを合わせる
  archive_title: string | null;
  cycle_days: number | null;
  cycle_applicants_count: number | null;
  snapshot: any; // jsonb
};

function pickJobTitle(snapshot: any): string {
  const s = snapshot ?? {};
  // 揺れ吸収（camel/snake）
  const t =
    s.jobTitle ??
    s.job_title ??
    s.job?.jobTitle ??
    s.job?.job_title ??
    "";
  return String(t ?? "").trim();
}

export async function GET(req: NextRequest) {
  try {
    const { supabase } = supabaseRoute(req);

    // Authentication check
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

    // Authorization check: Only admins can view job archives
    const { data: workspaceMember } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("user_id", user.id)
      .single();

    const isAdmin = workspaceMember?.role === "admin";

    if (!isAdmin) {
      return NextResponse.json(
        { ok: false, error: { message: "Access denied" } },
        { status: 403 }
      );
    }

    const url = new URL(req.url);
    const companyId = String(url.searchParams.get("companyId") ?? "").trim();
    if (!companyId) {
      return NextResponse.json(
        { ok: false, error: { message: "Missing: companyId" } },
        { status: 400 }
      );
    }

    // ✅ ここは“既に一覧表示できてる”列名に合わせてください
    const { data, error } = await supabaseAdmin
      .from("job_archives")
      .select("id,company_id,job_id,archived_at,archive_title,cycle_days,cycle_applicants_count,snapshot")
      .eq("company_id", companyId)
      .order("archived_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("[job-archives] GET error:", error);
      return NextResponse.json(
        { ok: false, error: { message: "アーカイブの取得に失敗しました" } },
        { status: 500 }
      );
    }

    const items = (data ?? []).map((r: any) => {
      const snap = r.snapshot ?? r.job_snapshot ?? r.snapshot_json ?? null; // ←揺れ吸収
      return {
        id: String(r.id),
        companyId: r.company_id ? String(r.company_id) : null,
        jobId: String(r.job_id),
        archivedAt: String(r.archived_at ?? r.changed_at ?? r.created_at ?? ""),
        archiveTitle: r.archive_title ? String(r.archive_title) : "",
        cycleDays: typeof r.cycle_days === "number" ? r.cycle_days : null,
        cycleApplicantsCount:
          typeof r.cycle_applicants_count === "number" ? r.cycle_applicants_count : null,
        jobTitle: pickJobTitle(snap),
      };
    });

    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: { message: e?.message ?? "unexpected error" } },
      { status: 500 }
    );
  }
}
