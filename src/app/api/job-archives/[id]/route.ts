import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// GET /api/job-archives/[id] - アーカイブ詳細取得
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;

    const { data, error } = await supabaseAdmin
      .from("job_archives")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: { message: error.message } },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { ok: false, error: { message: "Archive not found" } },
        { status: 404 }
      );
    }

    const archive = {
      id: String(data.id),
      companyId: data.company_id ? String(data.company_id) : null,
      jobId: String(data.job_id),
      archivedAt: String(data.archived_at ?? data.changed_at ?? data.created_at ?? ""),
      archiveTitle: data.archive_title ? String(data.archive_title) : null,
      cycleDays: typeof data.cycle_days === "number" ? data.cycle_days : null,
      cycleApplicantsCount: typeof data.cycle_applicants_count === "number" ? data.cycle_applicants_count : null,
      snapshot: data.snapshot ?? data.job_snapshot ?? null,
    };

    return NextResponse.json({ ok: true, data: archive });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: { message: e?.message ?? "unexpected error" } },
      { status: 500 }
    );
  }
}
