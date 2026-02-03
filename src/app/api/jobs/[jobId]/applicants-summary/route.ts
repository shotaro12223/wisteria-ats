// src/app/api/jobs/[jobId]/applicants-summary/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function clampInt(v: any, min: number, max: number, fallback: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ jobId: string }> }) {
  try {
    const p = await ctx.params;
    const jobId = String(p?.jobId ?? "").trim();
    if (!jobId) {
      return NextResponse.json({ ok: false, error: "Missing jobId" }, { status: 400 });
    }

    // 件数はとりあえず20（必要なら画面側で増やす）
    const limit = clampInt(new URL(_req.url).searchParams.get("limit"), 1, 200, 20);

    // ✅ 1) プルダウンで保存された「応募メール」
    const inboxRes = await supabaseAdmin
      .from("gmail_inbox_messages")
      .select("id,subject,from_email,to_email,snippet,received_at,status,site_key,job_id,company_id")
      .eq("job_id", jobId)
      .order("received_at", { ascending: false })
      .limit(limit);

    if (inboxRes.error) {
      return NextResponse.json(
        { ok: false, error: inboxRes.error.message, where: "select gmail_inbox_messages by job_id" },
        { status: 500 }
      );
    }

    // ✅ 2) もし「applicants（登録済み）」も一緒に出したいならここで取得（任意）
    // 今回の要望は「プルダウンで設定した応募メール」なので、まずは inbox だけ返す
    const inboxItems = (inboxRes.data ?? []).map((r: any) => ({
      id: String(r.id),
      subject: String(r.subject ?? ""),
      fromEmail: String(r.from_email ?? ""),
      toEmail: r.to_email ? String(r.to_email) : null,
      snippet: r.snippet ? String(r.snippet) : "",
      receivedAt: String(r.received_at ?? ""),
      status: String(r.status ?? ""),
      siteKey: String(r.site_key ?? ""),
    }));

    return NextResponse.json({
      ok: true,
      jobId,
      inbox: {
        total: inboxItems.length,
        items: inboxItems,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unexpected error" }, { status: 500 });
  }
}
