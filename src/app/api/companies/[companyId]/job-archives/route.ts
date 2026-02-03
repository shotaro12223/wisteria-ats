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

  // ✅ fallback用（job_title が jobs から取れない場合に使う）
  job_snapshot: any;
};

function safeInt(n: any, fallback = 0) {
  const x = Number(n);
  if (!Number.isFinite(x)) return fallback;
  return x | 0;
}

function safeString(x: any) {
  return String(x ?? "").trim();
}

function pickJobTitleFromSnapshot(snapshot: any): string {
  // ✅ 推測は最小限：よくあるキーだけ拾う（無ければ空）
  const s = snapshot ?? {};
  const candidates = [
    s?.job_title,
    s?.jobTitle,
    s?.job?.job_title,
    s?.job?.jobTitle,
    s?.snapshot?.job_title,
    s?.snapshot?.jobTitle,
  ];
  for (const c of candidates) {
    const t = safeString(c);
    if (t) return t;
  }
  return "";
}

export async function GET(req: Request, ctx: { params: Promise<{ companyId: string }> }) {
  try {
    const { companyId } = await ctx.params;
    const cid = safeString(companyId);
    if (!cid) {
      return NextResponse.json(
        { ok: false, error: { message: "Missing: companyId" } },
        { status: 400 }
      );
    }

    const url = new URL(req.url);
    const limitRaw = url.searchParams.get("limit");
    const limit = Math.max(1, Math.min(200, safeInt(limitRaw ?? 50, 50)));

    // ✅ job_snapshot も取る（job_title fallback 用）
    const { data, error } = await supabaseAdmin
      .from("job_archives")
      .select(
        "id,company_id,job_id,archived_at,archive_title,cycle_days,cycle_applicants_count,job_snapshot"
      )
      .eq("company_id", cid)
      .order("archived_at", { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json(
        { ok: false, error: { message: error.message, code: error.code } },
        { status: 500 }
      );
    }

    const rows: ArchiveRow[] = (data ?? []) as any;

    // jobs から job_title を一括解決
    const jobIds = Array.from(
      new Set(rows.map((r) => safeString((r as any).job_id)).filter(Boolean))
    );

    const jobTitleById = new Map<string, string>();

    if (jobIds.length > 0) {
      const { data: jobsData, error: jobsErr } = await supabaseAdmin
        .from("jobs")
        .select("id,job_title")
        .in("id", jobIds);

      // jobs が取れなくても archives 自体は返す（jobTitle は snapshot fallback）
      if (!jobsErr) {
        for (const j of jobsData ?? []) {
          const id = safeString((j as any).id);
          const title = safeString((j as any).job_title);
          if (id && title) jobTitleById.set(id, title);
        }
      }
    }

    const items = rows.map((row: any) => {
      const jobId = safeString(row.job_id);

      const fromJobs = jobTitleById.get(jobId) ?? "";
      const fromSnap = pickJobTitleFromSnapshot(row.job_snapshot);
      const jobTitle = (fromJobs || fromSnap) ? (fromJobs || fromSnap) : null;

      return {
        id: safeString(row.id),
        companyId: row.company_id ? safeString(row.company_id) : null,
        jobId,
        jobTitle, // ✅ 職種名
        archivedAt: safeString(row.archived_at),
        archiveTitle: row.archive_title != null ? safeString(row.archive_title) : null,
        cycleDays: safeInt(row.cycle_days, 0),
        cycleApplicantsCount: safeInt(row.cycle_applicants_count, 0),
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
