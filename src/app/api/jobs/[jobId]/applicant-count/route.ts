import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

function clampInt(v: any, min: number, max: number, fallback: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

export async function PATCH(req: Request, ctx: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId: jobIdRaw } = await ctx.params;
    const jobId = String(jobIdRaw ?? "").trim();
    if (!jobId) {
      return NextResponse.json({ ok: false, error: "jobId is required" }, { status: 400 });
    }

    const body = (await req.json().catch(() => ({}))) as any;

    // null も許可（空欄保存用）
    const raw = body?.applicantCount;
    const applicantCount =
      raw === null || raw === undefined || raw === ""
        ? null
        : clampInt(raw, 0, 999999, 0);

    const upd = await supabaseAdmin
      .from("jobs")
      .update({
        applicant_count: applicantCount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId)
      .select("id, applicant_count")
      .single();

    if (upd.error) {
      return NextResponse.json(
        { ok: false, error: upd.error.message, where: "update jobs.applicant_count" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      item: {
        id: String(upd.data.id),
        applicantCount: upd.data.applicant_count,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unexpected error" }, { status: 500 });
  }
}
