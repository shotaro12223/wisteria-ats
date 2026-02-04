import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { notifyGmailTokenError } from "@/lib/sendAdminNotification";

// ============================================
// 型定義
// ============================================

type GmailConn = {
  id: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
  email?: string | null;
  last_sync_at?: string | null;
};

export type SyncOptions = {
  labelName?: string;
  pageSize?: number;
  maxTotal?: number;
  forceFullSync?: boolean;
};

export type SyncResult = {
  ok: boolean;
  messagesFetched: number;
  messagesInserted: number;
  syncType: "full" | "incremental";
  error?: string;
};

// ============================================
// ユーティリティ関数
// ============================================

function nowIso() {
  return new Date().toISOString();
}

function normalizeEmailAddress(input?: string | null): string {
  let s = String(input ?? "").trim();
  if (!s) return "";

  const m = s.match(/<([^>]+)>/);
  if (m?.[1]) s = m[1].trim();

  s = s.replace(/^<+/, "").replace(/>+$/, "").trim();
  s = s.replace(/^"([^"]+)"@/g, "$1@");
  s = s.replace(/"/g, "");
  s = s.replace(/[;]+$/g, "").trim();

  return s.toLowerCase();
}

function parseEmailFromHeader(v?: string | null) {
  return normalizeEmailAddress(v);
}

function parseEmailsFromHeader(v?: string | null): string[] {
  const s = String(v ?? "").trim();
  if (!s) return [];

  const parts = s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

  const out: string[] = [];
  for (const p of parts) {
    const e = normalizeEmailAddress(p);
    if (e) out.push(e);
  }
  return out;
}

function normEmail(s: string) {
  return String(s ?? "").trim().toLowerCase();
}

function inferSiteKeyFromFromEmail(fromEmail: string): string {
  const s = normEmail(fromEmail);

  if (s.includes("indeed")) return "Indeed";
  if (s.includes("airwork") || s.includes("air-work") || s.includes("joboplite")) return "AirWork";
  if (s.includes("engage") || s.includes("en-gage")) return "Engage";
  if (s.includes("jmty") || s.includes("jimoty")) return "ジモティー";
  if (s.includes("saiyo-kakaricho") || s.includes("saiyokakaricho")) return "採用係長";
  if (s.includes("kyujinbox") || s.includes("kyujin-box")) return "求人ボックス";

  return "Direct";
}

function normalizeLabelName(s: string) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replaceAll("／", "/")
    .replaceAll("　", " ");
}

function clampInt(n: any, min: number, max: number, fallback: number) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(v)));
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

// ============================================
// メイン関数
// ============================================

/**
 * Gmail同期のメインエントリーポイント
 * 差分同期または全件同期を実行
 */
export async function syncGmailMessages(
  connectionId: string = "central",
  options: SyncOptions = {}
): Promise<SyncResult> {
  const {
    labelName = "ATS/応募",
    pageSize = 200,
    maxTotal = 5000,
    forceFullSync = false,
  } = options;

  let logId: string | null = null;
  const startTime = Date.now();

  try {
    // 接続情報の取得
    const conn = await getGmailConnection(connectionId);
    if (!conn) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    // 同期ログの作成
    logId = await createSyncLog(connectionId);

    // トークンリフレッシュ（必要に応じて）
    const accessToken = await ensureValidAccessToken(conn);

    // ラベルIDの取得（オプショナル）
    let labelId: string | null = null;
    if (labelName) {
      labelId = await getLabelId(accessToken, labelName);
      if (!labelId) {
        console.warn(`[Sync] Label "${labelName}" not found, skipping sync`);
        if (logId) await completeSyncLog(logId, { status: "success", messagesFetched: 0, messagesInserted: 0 });
        return { ok: true, messagesFetched: 0, messagesInserted: 0, syncType: "full" as const };
      }
    }

    // 差分同期か全件同期かを判定
    const syncType = determineSyncType(conn, forceFullSync);

    // Gmailクエリの構築
    const gmailQuery = buildGmailQuery(conn, syncType);

    // メッセージの取得
    const messageRefs = await fetchAllMessageRefs({
      accessToken,
      labelId,
      pageSize,
      maxTotal,
      query: gmailQuery,
    });

    // データベースへの保存
    const insertedCount = await syncMessagesToDb({
      messageRefs,
      accessToken,
      labelName,
      labelId,
    });

    // 同期完了の記録
    const executionTime = Date.now() - startTime;
    await completeSyncLog(logId, {
      status: "success",
      messagesFetched: messageRefs.length,
      messagesInserted: insertedCount,
      syncType,
      queryUsed: gmailQuery,
      executionTimeMs: executionTime,
    });

    // gmail_connections の last_sync_at を更新
    await updateLastSyncTime(connectionId);

    return {
      ok: true,
      messagesFetched: messageRefs.length,
      messagesInserted: insertedCount,
      syncType,
    };
  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    if (logId) {
      await completeSyncLog(logId, {
        status: "error",
        errorMessage: error.message,
        executionTimeMs: executionTime,
      });
    }

    return {
      ok: false,
      messagesFetched: 0,
      messagesInserted: 0,
      syncType: forceFullSync ? "full" : "incremental",
      error: error.message,
    };
  }
}

// ============================================
// 同期タイプ判定
// ============================================

function determineSyncType(
  conn: GmailConn,
  forceFullSync: boolean
): "full" | "incremental" {
  if (forceFullSync) return "full";
  if (!conn.last_sync_at) return "full";

  // 最終同期から7日以上経過している場合は全件同期
  const lastSync = new Date(conn.last_sync_at).getTime();
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  if (lastSync < sevenDaysAgo) return "full";

  return "incremental";
}

// ============================================
// Gmailクエリ構築
// ============================================

function buildGmailQuery(
  conn: GmailConn,
  syncType: "full" | "incremental"
): string | null {
  if (syncType === "full") {
    return null; // クエリなし = 全件
  }

  // 差分同期: last_sync_at 以降のメールのみ
  if (!conn.last_sync_at) return null;

  const lastSyncDate = new Date(conn.last_sync_at);
  // Gmail APIのafter:クエリは日付のみ（時刻は指定不可）
  // 余裕を持って前日からとする
  lastSyncDate.setDate(lastSyncDate.getDate() - 1);

  const yyyy = lastSyncDate.getFullYear();
  const mm = String(lastSyncDate.getMonth() + 1).padStart(2, "0");
  const dd = String(lastSyncDate.getDate()).padStart(2, "0");

  return `after:${yyyy}/${mm}/${dd}`;
}

// ============================================
// メッセージ取得
// ============================================

async function fetchAllMessageRefs(args: {
  accessToken: string;
  labelId: string | null;
  pageSize: number;
  maxTotal: number;
  query: string | null;
}): Promise<Array<{ id: string; threadId?: string }>> {
  const authHeader = { Authorization: `Bearer ${args.accessToken}` };
  let pageToken: string | null = null;
  const out: Array<{ id: string; threadId?: string }> = [];

  while (out.length < args.maxTotal) {
    const listUrl = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
    if (args.labelId) {
      listUrl.searchParams.set("labelIds", args.labelId);
    }
    listUrl.searchParams.set("maxResults", String(args.pageSize));

    // クエリ追加（差分同期の場合）
    if (args.query) {
      listUrl.searchParams.set("q", args.query);
    }

    if (pageToken) {
      listUrl.searchParams.set("pageToken", pageToken);
    }

    const res = await fetch(listUrl.toString(), {
      method: "GET",
      headers: { ...authHeader },
      cache: "no-store",
    });

    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Gmail API error: ${res.status} ${t}`);
    }

    const j = await res.json();
    const items: Array<{ id: string; threadId?: string }> = j?.messages ?? [];

    for (const it of items) {
      if (it?.id) {
        out.push({
          id: String(it.id),
          threadId: it.threadId ? String(it.threadId) : undefined,
        });
      }
      if (out.length >= args.maxTotal) break;
    }

    pageToken = j?.nextPageToken ? String(j.nextPageToken) : null;
    if (!pageToken) break;
  }

  return out;
}

// ============================================
// データベース保存（既存コードから移植）
// ============================================

async function syncMessagesToDb(args: {
  messageRefs: Array<{ id: string; threadId?: string }>;
  accessToken: string;
  labelName: string;
  labelId: string | null;
}): Promise<number> {
  const messages = (args.messageRefs ?? []).map(ref => ({
    id: ref.id,
    threadId: ref.threadId ?? ref.id
  }));
  if (!messages.length) {
    return 0;
  }

  const userId = await resolveSingleUserId();
  if (!userId) {
    throw new Error("workspace_members is empty (cannot resolve user_id)");
  }

  const { data: companies, error: cErr } = await supabaseAdmin
    .from("companies")
    .select("id,company_profile,application_email");
  if (cErr) {
    throw new Error(`companies load failed: ${cErr.message}`);
  }

  const emailToCompanyId: Record<string, string> = {};
  for (const c of companies ?? []) {
    const id = String((c as any).id ?? "");
    const profile = ((c as any).company_profile ?? {}) as any;

    // ✅ application_email カラムを優先的に使用
    const applicationEmail = (c as any).application_email
      ? normalizeEmailAddress(String((c as any).application_email))
      : "";
    const jobEmail = profile?.jobEmail ? normalizeEmailAddress(String(profile.jobEmail)) : "";
    const companyEmail = profile?.companyEmail ? normalizeEmailAddress(String(profile.companyEmail)) : "";

    // application_email を優先、次に jobEmail, companyEmail
    if (applicationEmail) emailToCompanyId[applicationEmail] = id;
    if (jobEmail && !emailToCompanyId[jobEmail]) emailToCompanyId[jobEmail] = id;
    if (companyEmail && !emailToCompanyId[companyEmail]) emailToCompanyId[companyEmail] = id;
  }

  const authHeader = { Authorization: `Bearer ${args.accessToken}` };

  const inboxRows: Array<{
    id: string;
    user_id: string;
    gmail_message_id: string;
    thread_id: string;
    from_email: string;
    to_email: string;
    company_id: string | null;
    subject: string;
    snippet: string;
    received_at: string;
    site_key: string;
  }> = [];

  const messageRows: Array<{
    id: string;
    thread_id: string;
    to_email: string | null;
    from_email: string | null;
    subject: string | null;
    snippet: string | null;
    internal_date: string | null;
    payload: any;
    created_at: string;
  }> = [];

  for (const m of messages) {
    const getUrl = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}`);
    getUrl.searchParams.set("format", "full");

    const res = await fetch(getUrl.toString(), {
      method: "GET",
      headers: { ...authHeader },
      cache: "no-store",
    });
    if (!res.ok) continue;

    const j = await res.json();

    const headers: Array<{ name: string; value: string }> = j?.payload?.headers ?? [];

    const fromRaw = headers.find((h) => h.name.toLowerCase() === "from")?.value ?? "";
    const toRaw = headers.find((h) => h.name.toLowerCase() === "to")?.value ?? "";
    const deliveredToRaw = headers.find((h) => h.name.toLowerCase() === "delivered-to")?.value ?? "";
    const xOriginalToRaw = headers.find((h) => h.name.toLowerCase() === "x-original-to")?.value ?? "";
    const xForwardedToRaw = headers.find((h) => h.name.toLowerCase() === "x-forwarded-to")?.value ?? "";
    const envelopeToRaw = headers.find((h) => h.name.toLowerCase() === "envelope-to")?.value ?? "";
    const subject = headers.find((h) => h.name.toLowerCase() === "subject")?.value ?? "";

    const fromEmail = parseEmailFromHeader(fromRaw);

    const candidates = [
      ...parseEmailsFromHeader(toRaw),
      ...parseEmailsFromHeader(deliveredToRaw),
      ...parseEmailsFromHeader(xOriginalToRaw),
      ...parseEmailsFromHeader(xForwardedToRaw),
      ...parseEmailsFromHeader(envelopeToRaw),
    ]
      .map(normalizeEmailAddress)
      .filter(Boolean);

    let matchedEmail = "";
    let companyId: string | null = null;

    for (const e of candidates) {
      const hit = emailToCompanyId[e];
      if (hit) {
        matchedEmail = e;
        companyId = hit;
        break;
      }
    }

    const normalizedToEmail = matchedEmail || candidates[0] || "";

    const internalMsRaw = j?.internalDate;
    const internalMs = Number(internalMsRaw);
    const receivedAtIso = Number.isFinite(internalMs) ? new Date(internalMs).toISOString() : nowIso();

    const gmailId = String(j?.id ?? m.id);
    const threadId = String(j?.threadId ?? m.threadId ?? "");
    const snippet = String(j?.snippet ?? "");

    const siteKey = inferSiteKeyFromFromEmail(fromEmail);

    inboxRows.push({
      id: crypto.randomUUID(),
      user_id: userId,
      gmail_message_id: gmailId,
      thread_id: threadId,
      from_email: fromEmail,
      to_email: normalizedToEmail,
      company_id: companyId,
      subject: String(subject ?? ""),
      snippet,
      received_at: receivedAtIso,
      site_key: siteKey,
    });

    messageRows.push({
      id: gmailId,
      thread_id: threadId || "unknown",
      to_email: normalizedToEmail || null,
      from_email: fromEmail || null,
      subject: String(subject ?? "") || null,
      snippet: snippet || null,
      internal_date: Number.isFinite(internalMs) ? new Date(internalMs).toISOString() : null,
      payload: j,
      created_at: nowIso(),
    });
  }

  if (!inboxRows.length) {
    return 0;
  }

  if (messageRows.length) {
    const { error: mErr } = await supabaseAdmin
      .from("gmail_messages")
      .upsert(messageRows, { onConflict: "id" });

    if (mErr) {
      throw new Error(`gmail_messages upsert failed: ${mErr.message}`);
    }
  }

  const { error } = await supabaseAdmin
    .from("gmail_inbox_messages")
    .upsert(inboxRows, { onConflict: "gmail_message_id" });

  if (error) {
    throw new Error(`gmail_inbox_messages upsert failed: ${error.message}`);
  }

  return inboxRows.length;
}

// ============================================
// ヘルパー関数
// ============================================

async function getGmailConnection(id: string): Promise<GmailConn | null> {
  const { data, error } = await supabaseAdmin
    .from("gmail_connections")
    .select("id,access_token,refresh_token,expires_at,email,last_sync_at")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data as GmailConn;
}

async function resolveSingleUserId(): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("workspace_members")
    .select("user_id")
    .limit(1);

  if (error) {
    console.error("[resolveSingleUserId]", error);
    return null;
  }
  return data?.[0]?.user_id ? String(data[0].user_id) : null;
}

async function ensureValidAccessToken(conn: GmailConn): Promise<string> {
  const expiresAt = conn.expires_at ? Date.parse(String(conn.expires_at)) : NaN;
  const shouldRefresh =
    conn.refresh_token && Number.isFinite(expiresAt) && expiresAt <= Date.now() + 60 * 1000;

  if (shouldRefresh && conn.refresh_token) {
    try {
      const r = await refreshAccessToken(conn.refresh_token);
      const newExpiresAt = new Date(Date.now() + r.expires_in * 1000).toISOString();

      // データベースを更新
      await supabaseAdmin
        .from("gmail_connections")
        .update({
          access_token: r.access_token,
          expires_at: newExpiresAt,
          updated_at: nowIso(),
        })
        .eq("id", conn.id);

      return r.access_token;
    } catch (e) {
      console.error("[ensureValidAccessToken] refresh failed:", e);

      // 管理者に通知
      const errorMessage = e instanceof Error ? e.message : String(e);
      await notifyGmailTokenError("refresh_failed", errorMessage).catch((notifyErr) => {
        console.error("[ensureValidAccessToken] Failed to send admin notification:", notifyErr);
      });

      // リフレッシュ失敗時は既存トークンで続行
      return conn.access_token;
    }
  }

  return conn.access_token;
}

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
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

async function getLabelId(accessToken: string, labelName: string): Promise<string | null> {
  const authHeader = { Authorization: `Bearer ${accessToken}` };

  const labelsRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/labels", {
    method: "GET",
    headers: { ...authHeader },
    cache: "no-store",
  });

  if (!labelsRes.ok) {
    return null;
  }

  const labelsJson = (await labelsRes.json()) as { labels?: Array<{ id: string; name: string }> };
  const labels = labelsJson.labels ?? [];

  const want = normalizeLabelName(labelName);
  const wantAlt1 = normalizeLabelName(labelName.replaceAll("/", "-"));
  const wantAlt2 = normalizeLabelName(labelName.replaceAll("-", "/"));

  const label =
    labels.find((l) => normalizeLabelName(l.name) === want) ??
    labels.find((l) => normalizeLabelName(l.name) === wantAlt1) ??
    labels.find((l) => normalizeLabelName(l.name) === wantAlt2);

  return label?.id ?? null;
}

// ============================================
// 同期ログ記録
// ============================================

async function createSyncLog(connectionId: string): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("gmail_sync_logs")
    .insert({
      connection_id: connectionId,
      sync_type: "incremental", // 暫定値、後で更新
      status: "running",
      started_at: nowIso(),
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

async function completeSyncLog(
  logId: string,
  result: {
    status: "success" | "error";
    messagesFetched?: number;
    messagesInserted?: number;
    syncType?: "full" | "incremental";
    queryUsed?: string | null;
    errorMessage?: string;
    executionTimeMs?: number;
  }
): Promise<void> {
  const completedAt = nowIso();

  await supabaseAdmin
    .from("gmail_sync_logs")
    .update({
      status: result.status,
      completed_at: completedAt,
      messages_fetched: result.messagesFetched ?? 0,
      messages_inserted: result.messagesInserted ?? 0,
      sync_type: result.syncType,
      query_used: result.queryUsed,
      error_message: result.errorMessage,
      execution_time_ms: result.executionTimeMs,
    })
    .eq("id", logId);
}

async function updateLastSyncTime(connectionId: string): Promise<void> {
  await supabaseAdmin
    .from("gmail_connections")
    .update({
      last_sync_at: nowIso(),
      last_sync_status: "success",
      last_sync_error: null,
      updated_at: nowIso(),
    })
    .eq("id", connectionId);
}
