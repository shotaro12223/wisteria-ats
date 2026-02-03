import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function safeLower(s: any): string {
  return String(s ?? "").trim().toLowerCase();
}

function normalizeApplicantSiteKey(k: any): string {
  const s = String(k ?? "").trim();
  if (!s) return "Direct";

  // 旧データ互換：gmail は媒体ではないので直応募へ
  if (safeLower(s) === "gmail") return "Direct";

  return s;
}

function safeString(x: any): string {
  return String(x ?? "").trim();
}

function toIsoDateYYYYMMDD(isoLike: any): string {
  try {
    const d = new Date(String(isoLike));
    if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
    return d.toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const p = await ctx.params;
    const inboxId = safeString(p?.id);

    if (!inboxId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing inbox id in route params",
          debug: { params: p ?? null },
        },
        { status: 400 }
      );
    }

    // ✅ UIは jobId だけ送る（companyIdはjobから決める）
    let body: { companyId?: string; jobId?: string } = {};
    try {
      body = (await req.json()) as any;
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const jobId = safeString(body?.jobId);
    const explicitCompanyId = safeString(body?.companyId); // 互換用（あってもOK）

    if (!jobId) {
      return NextResponse.json({ ok: false, error: "Missing jobId" }, { status: 400 });
    }

    // ✅ job から company_id を取得（companyId未送信でもOKにする）
    const jobRes = await supabaseAdmin.from("jobs").select("id, company_id").eq("id", jobId).maybeSingle();

    if (jobRes.error) {
      return NextResponse.json(
        { ok: false, error: jobRes.error.message, where: "select jobs", code: jobRes.error.code ?? null },
        { status: 500 }
      );
    }

    if (!jobRes.data) {
      return NextResponse.json({ ok: false, error: "Job not found", debug: { jobId } }, { status: 404 });
    }

    const companyId = explicitCompanyId || safeString(jobRes.data.company_id);
    if (!companyId) {
      return NextResponse.json(
        { ok: false, error: "Job has no company_id (cannot register)", debug: { jobId } },
        { status: 400 }
      );
    }

    const inboxRes = await supabaseAdmin
      .from("gmail_inbox_messages")
      .select("id, gmail_message_id, site_key, subject, snippet, received_at, from_email, status")
      .eq("id", inboxId)
      .maybeSingle();

    if (inboxRes.error) {
      return NextResponse.json(
        {
          ok: false,
          error: inboxRes.error.message,
          where: "select gmail_inbox_messages",
          code: inboxRes.error.code ?? null,
        },
        { status: 500 }
      );
    }

    if (!inboxRes.data) {
      return NextResponse.json(
        { ok: false, error: "Inbox message not found", debug: { inboxId } },
        { status: 404 }
      );
    }

    const msg = inboxRes.data;

    // すでに連携済みならそのままOK
    if (msg.status === "registered") {
      return NextResponse.json({ ok: true, already: true });
    }

    const appliedAtDate = toIsoDateYYYYMMDD(msg.received_at);
    const siteKey = normalizeApplicantSiteKey(msg.site_key);
    const now = new Date().toISOString();

    const gmailMessageId = safeString(msg.gmail_message_id);
    if (!gmailMessageId) {
      return NextResponse.json(
        { ok: false, error: "gmail_message_id is missing on inbox message", debug: { inboxId } },
        { status: 500 }
      );
    }

    const applicantId = `gmail_${gmailMessageId}`;

    // ✅ 二重登録で落とさない（同じIDなら上書き/更新）
    // NOTE: upsert は created_at も上書きするので、必要なら「insert→conflictならupdate」に変更してください。
    const upsertRes = await supabaseAdmin
      .from("applicants")
      .upsert(
        {
          id: applicantId,
          company_id: companyId,
          job_id: jobId,
          applied_at: appliedAtDate,
          site_key: siteKey,
          name: "（メールから取込）",
          status: "NEW",
          note: `From: ${safeString(msg.from_email)}\nSubject: ${safeString(msg.subject)}\nSnippet: ${safeString(
            msg.snippet
          )}\nGmailMessageId: ${gmailMessageId}`,
          created_at: now,
          updated_at: now,
        },
        { onConflict: "id" }
      );

    if (upsertRes.error) {
      return NextResponse.json(
        { ok: false, error: upsertRes.error.message, where: "upsert applicants", code: upsertRes.error.code ?? null },
        { status: 500 }
      );
    }

    const updateRes = await supabaseAdmin
      .from("gmail_inbox_messages")
      .update({ status: "registered", updated_at: now })
      .eq("id", inboxId);

    if (updateRes.error) {
      return NextResponse.json(
        { ok: false, error: updateRes.error.message, where: "update inbox status", code: updateRes.error.code ?? null },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      inbox: { id: inboxId, status: "registered" },
      applicant: { id: applicantId, companyId, jobId },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "unexpected error", where: "catch" },
      { status: 500 }
    );
  }
}
