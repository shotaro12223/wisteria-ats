// src/app/api/gmail/inbox/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { extractBodies } from "@/lib/gmailPayload";

const ALLOWED_STATUS = new Set(["new", "registered", "ng", "interview", "offer"]);
const ALLOWED_MAIL_TYPE = new Set(["application", "non_application"]);

type GmailConn = {
  id: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
  email?: string | null;
};

function nowIso() {
  return new Date().toISOString();
}

function normalizeMailType(raw: any): "application" | "non_application" {
  const s = String(raw ?? "").trim().toLowerCase();
  if (s === "non_application" || s === "non-application" || s === "nonapplication") return "non_application";
  return "application";
}

async function fetchJson(url: string, init: RequestInit) {
  const res = await fetch(url, init);
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { res, text, json };
}

async function refreshAccessToken(refreshToken: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET");
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  }).toString();

  const { res, text, json } = await fetchJson("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok || !json?.access_token) {
    throw new Error(`refresh_token failed: ${res.status} ${text}`);
  }

  return {
    access_token: String(json.access_token),
    expires_in: Number(json.expires_in ?? 3600),
  };
}

async function getCentralConnection(): Promise<{
  accessToken: string;
  refreshToken: string | null;
}> {
  const { data: conn, error: connErr } = await supabaseAdmin
    .from("gmail_connections")
    .select("id,access_token,refresh_token,expires_at,email")
    .eq("id", "central")
    .maybeSingle();

  if (connErr || !conn) {
    throw new Error("gmail_connections central not found");
  }

  let accessToken = (conn as GmailConn).access_token;
  const refreshToken = (conn as GmailConn).refresh_token;

  const expiresAt = (conn as GmailConn).expires_at ? Date.parse(String(conn.expires_at)) : NaN;
  const shouldRefresh = refreshToken && Number.isFinite(expiresAt) && expiresAt <= Date.now() + 60 * 1000;

  if (shouldRefresh && refreshToken) {
    const r = await refreshAccessToken(refreshToken);
    accessToken = r.access_token;

    await supabaseAdmin
      .from("gmail_connections")
      .update({
        access_token: r.access_token,
        expires_at: new Date(Date.now() + r.expires_in * 1000).toISOString(),
        updated_at: nowIso(),
      })
      .eq("id", "central");
  }

  return { accessToken, refreshToken };
}

async function fetchGmailMessageFull(args: { accessToken: string; gmailMessageId: string }) {
  const url = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${args.gmailMessageId}`);
  url.searchParams.set("format", "full");

  const { res, text, json } = await fetchJson(url.toString(), {
    method: "GET",
    headers: { Authorization: `Bearer ${args.accessToken}` },
    cache: "no-store",
  });

  if (!res.ok || !json) {
    throw new Error(`gmail get(full) failed: ${res.status} ${text}`);
  }

  return json;
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const p = await ctx.params;
    const inboxId = String(p?.id ?? "").trim();

    if (!inboxId) {
      return NextResponse.json(
        { ok: false, error: "Missing inbox id in route params", debug: { params: p ?? null } },
        { status: 400 }
      );
    }

    // 1) inbox row
    const inboxRes = await supabaseAdmin
      .from("gmail_inbox_messages")
      .select(
        "id,gmail_message_id,thread_id,from_email,to_email,subject,snippet,received_at,site_key,status,mail_type,created_at,updated_at"
      )
      .eq("id", inboxId)
      .maybeSingle();

    if (inboxRes.error) {
      return NextResponse.json({ ok: false, error: inboxRes.error.message }, { status: 500 });
    }
    if (!inboxRes.data) {
      return NextResponse.json({ ok: false, error: "Inbox message not found", debug: { inboxId } }, { status: 404 });
    }

    const gmailMessageId = String((inboxRes.data as any).gmail_message_id ?? "").trim();
    const threadId = String((inboxRes.data as any).thread_id ?? "").trim();

    // 2) DBキャッシュ（gmail_messages）をまず見る
    let msg: any | null = null;

    if (gmailMessageId) {
      const m1 = await supabaseAdmin
        .from("gmail_messages")
        .select("id,payload,internal_date,subject,to_email,from_email,snippet,thread_id")
        .eq("id", gmailMessageId)
        .maybeSingle();

      if (m1.error) {
        return NextResponse.json({ ok: false, error: m1.error.message }, { status: 500 });
      }
      msg = m1.data ?? null;
    }

    // thread_id で最新を見る（保険）
    if (!msg && threadId) {
      const m2 = await supabaseAdmin
        .from("gmail_messages")
        .select("id,payload,internal_date,subject,to_email,from_email,snippet,thread_id")
        .eq("thread_id", threadId)
        .order("internal_date", { ascending: false })
        .limit(1);

      if (m2.error) {
        return NextResponse.json({ ok: false, error: m2.error.message }, { status: 500 });
      }
      msg = Array.isArray(m2.data) && m2.data.length > 0 ? m2.data[0] : null;
    }

    // 3) 本文抽出（DBに“本文入りpayload”が無いなら gmail から full を取りに行く）
    let bodies = msg?.payload ? extractBodies(msg.payload) : { html: null, text: null };

    if (!bodies.html && !bodies.text && gmailMessageId) {
      const { accessToken } = await getCentralConnection();
      const full = await fetchGmailMessageFull({ accessToken, gmailMessageId });

      bodies = extractBodies(full?.payload ?? null);

      // 取れたらDBにキャッシュ（gmail_messages）
      const internalMs = Number(full?.internalDate);
      const internalDate = Number.isFinite(internalMs) ? new Date(internalMs).toISOString() : null;

      await supabaseAdmin.from("gmail_messages").upsert(
        {
          id: String(full?.id ?? gmailMessageId),
          thread_id: String(full?.threadId ?? threadId ?? ""),
          to_email: (inboxRes.data as any).to_email ? String((inboxRes.data as any).to_email) : null,
          from_email: String((inboxRes.data as any).from_email ?? ""),
          subject: String((inboxRes.data as any).subject ?? ""),
          snippet: (inboxRes.data as any).snippet ? String((inboxRes.data as any).snippet) : null,
          internal_date: internalDate,
          payload: full?.payload ?? null,
          created_at: nowIso(),
        },
        { onConflict: "id" }
      );
    }

    const toEmail =
      msg?.to_email
        ? String(msg.to_email)
        : (inboxRes.data as any).to_email
          ? String((inboxRes.data as any).to_email)
          : null;

    const mailType = normalizeMailType((inboxRes.data as any).mail_type);

    return NextResponse.json({
      ok: true,
      item: {
        id: String((inboxRes.data as any).id),
        gmailMessageId,
        threadId: threadId ? threadId : null,
        fromEmail: String((inboxRes.data as any).from_email ?? ""),
        toEmail,
        subject: String((inboxRes.data as any).subject ?? ""),
        snippet: (inboxRes.data as any).snippet ? String((inboxRes.data as any).snippet) : null,
        receivedAt: String((inboxRes.data as any).received_at ?? ""),
        siteKey: String((inboxRes.data as any).site_key ?? ""),
        status: String((inboxRes.data as any).status ?? ""),
        mailType, // ✅ 追加
        createdAt: String((inboxRes.data as any).created_at ?? ""),
        updatedAt: String((inboxRes.data as any).updated_at ?? ""),
        bodyHtml: bodies.html,
        bodyText: bodies.text,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unexpected error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const p = await ctx.params;
    const inboxId = String(p?.id ?? "").trim();

    if (!inboxId) {
      return NextResponse.json(
        { ok: false, error: "Missing inbox id in route params", debug: { params: p ?? null } },
        { status: 400 }
      );
    }

    // ✅ status / jobId / companyId / mailType を受ける
    const body = (await req.json().catch(() => null)) as
      | { status?: string; jobId?: string; companyId?: string; mailType?: string; mail_type?: string }
      | null;

    const statusRaw = body?.status != null ? String(body.status).trim() : "";
    const jobIdRaw = body?.jobId != null ? String(body.jobId).trim() : "";
    const companyIdRaw = body?.companyId != null ? String(body.companyId).trim() : "";

    const hasStatus = body != null && Object.prototype.hasOwnProperty.call(body, "status");
    const hasJobId = body != null && Object.prototype.hasOwnProperty.call(body, "jobId");
    const hasCompanyId = body != null && Object.prototype.hasOwnProperty.call(body, "companyId");

    // mailType は camel/snake 両対応
    const hasMailType =
      body != null &&
      (Object.prototype.hasOwnProperty.call(body, "mailType") || Object.prototype.hasOwnProperty.call(body, "mail_type"));

    const mailTypeRaw = body?.mailType ?? body?.mail_type;
    const mailTypeNorm = normalizeMailType(mailTypeRaw);

    if (!hasStatus && !hasJobId && !hasCompanyId && !hasMailType) {
      return NextResponse.json({ ok: false, error: "No fields to update" }, { status: 400 });
    }

    if (hasStatus) {
      if (!ALLOWED_STATUS.has(statusRaw)) {
        return NextResponse.json({ ok: false, error: "Invalid status", debug: { status: statusRaw } }, { status: 400 });
      }
    }

    if (hasMailType) {
      if (!ALLOWED_MAIL_TYPE.has(mailTypeNorm)) {
        return NextResponse.json(
          { ok: false, error: "Invalid mailType", debug: { mailType: String(mailTypeRaw ?? "") } },
          { status: 400 }
        );
      }
    }

    // ✅ update payload
    const updatePayload: any = { updated_at: nowIso() };
    if (hasStatus) updatePayload.status = statusRaw;
    if (hasJobId) updatePayload.job_id = jobIdRaw ? jobIdRaw : null;
    if (hasCompanyId) updatePayload.company_id = companyIdRaw ? companyIdRaw : null;
    if (hasMailType) updatePayload.mail_type = mailTypeNorm;

    const updateRes = await supabaseAdmin
      .from("gmail_inbox_messages")
      .update(updatePayload)
      .eq("id", inboxId)
      .select("id,status,updated_at,job_id,company_id,mail_type")
      .maybeSingle();

    if (updateRes.error) {
      return NextResponse.json({ ok: false, error: updateRes.error.message }, { status: 500 });
    }

    if (!updateRes.data) {
      return NextResponse.json({ ok: false, error: "Inbox message not found", debug: { inboxId } }, { status: 404 });
    }

    const serverMailType = normalizeMailType((updateRes.data as any).mail_type);

    return NextResponse.json({
      ok: true,
      item: {
        id: String((updateRes.data as any).id),
        status: String((updateRes.data as any).status ?? ""),
        mailType: serverMailType, // ✅ 追加
        updatedAt: String((updateRes.data as any).updated_at ?? ""),
        jobId: (updateRes.data as any).job_id ? String((updateRes.data as any).job_id) : null,
        companyId: (updateRes.data as any).company_id ? String((updateRes.data as any).company_id) : null,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unexpected error" }, { status: 500 });
  }
}
