import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type ArchiveRow = {
  id: string;
  company_id: string | null;
  job_id: string;
  archived_at: string;
  archive_title: string | null;
  cycle_days: number;
  cycle_applicants_count: number;

  // テーブルにはあるが今回は返さないもの:
  // applicants_count: number;
  // days_elapsed: number;
  // counter_started_at: string | null;
  // counter_ended_at: string | null;
  // job_snapshot: any;
};

function safeInt(n: any, fallback = 0) {
  const x = Number(n);
  if (!Number.isFinite(x)) return fallback;
  return x | 0;
}

function safeString(x: any) {
  return String(x ?? "").trim();
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await ctx.params;
    const jid = safeString(jobId);

    if (!jid) {
      return NextResponse.json(
        { ok: false, error: { message: "Missing: jobId" } },
        { status: 400 }
      );
    }

    const url = new URL(req.url);
    const limitRaw = url.searchParams.get("limit");
    const limit = Math.max(1, Math.min(200, safeInt(limitRaw ?? 50, 50)));

    const { data, error } = await supabaseAdmin
      .from("job_archives")
      .select("id,company_id,job_id,archived_at,archive_title,cycle_days,cycle_applicants_count,job_snapshot")
      .eq("job_id", jid)
      .order("archived_at", { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json(
        { ok: false, error: { message: error.message, code: error.code } },
        { status: 500 }
      );
    }

    const items = ((data ?? []) as any[]).map((row: ArchiveRow) => ({
      id: safeString(row.id),
      companyId: row.company_id ? safeString(row.company_id) : null,
      jobId: safeString(row.job_id),
      archivedAt: safeString(row.archived_at),
      archiveTitle: row.archive_title != null ? safeString(row.archive_title) : null,
      cycleDays: Math.max(0, safeInt(row.cycle_days, 0)),
      cycleApplicantsCount: Math.max(0, safeInt(row.cycle_applicants_count, 0)),
      snapshot: (row as any).job_snapshot ?? null,
    }));

    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: { message: e?.message ?? "unexpected error" } },
      { status: 500 }
    );
  }
}
