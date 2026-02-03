import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseRoute";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type InboxRow = {
  id: string;
  gmail_message_id: string;
  thread_id: string | null;
  from_email: string;
  to_email?: string | null;
  company_id?: string | null;

  // ✅ 追加：プルダウンで選んだ求人IDを保持
  job_id?: string | null;

  // ✅ 追加：応募/非応募（除外）を保持
  mail_type: string;

  subject: string;
  snippet: string | null;
  received_at: string;
  site_key: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type CompanyRow = {
  id: string;
  company_name: string;
};

function clampInt(v: any, min: number, max: number, fallback: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function normalizeMailType(raw: any): "application" | "non_application" {
  const s = String(raw ?? "").trim().toLowerCase();
  if (s === "non_application" || s === "non-application" || s === "nonapplication") return "non_application";
  return "application";
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

    // Authorization check
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
      allowedCompanyId = clientUser.company_id;
    } else if (!isAdmin) {
      return NextResponse.json(
        { ok: false, error: { message: "Access denied" } },
        { status: 403 }
      );
    }

    const url = new URL(req.url);

    const limit = clampInt(url.searchParams.get("limit"), 1, 500, 50);
    const page = clampInt(url.searchParams.get("page"), 1, 1000000, 1);

    const companyIdRaw = url.searchParams.get("companyId");
    const companyIdParam = companyIdRaw ? String(companyIdRaw).trim() : "";

    // Enforce company_id restriction
    const companyId = allowedCompanyId || companyIdParam;

    const toEmailRaw = url.searchParams.get("toEmail");
    const toEmail = toEmailRaw ? String(toEmailRaw).trim() : "";

    const searchQueryRaw = url.searchParams.get("search");
    const searchQuery = searchQueryRaw ? String(searchQueryRaw).trim() : "";

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // count を取るため head + count: exact
    let q = supabaseAdmin
      .from("gmail_inbox_messages")
      .select(
        // ✅ mail_type を追加
        "id,gmail_message_id,thread_id,from_email,to_email,company_id,job_id,mail_type,subject,snippet,received_at,site_key,status,created_at,updated_at",
        { count: "exact" }
      )
      .order("received_at", { ascending: false });

    // 会社フィルタは適用しない（クライアント側で全データをフィルタする）
    if (toEmail) {
      q = q.eq("to_email", toEmail);
    }

    // 検索クエリ対応（全データから検索）
    if (searchQuery) {
      q = q.or(`subject.ilike.%${searchQuery}%,from_email.ilike.%${searchQuery}%,snippet.ilike.%${searchQuery}%`);
    }

    const inboxRes = await q.range(from, to);

    if (inboxRes.error) {
      return NextResponse.json(
        { ok: false, error: inboxRes.error.message, where: "select gmail_inbox_messages" },
        { status: 500 }
      );
    }

    const rows = (inboxRes.data ?? []) as InboxRow[];
    const total = Number(inboxRes.count ?? 0);
    const totalPages = total > 0 ? Math.ceil(total / limit) : 1;

    const companyIds = Array.from(
      new Set(
        rows
          .map((r) => (r.company_id ? String(r.company_id) : ""))
          .filter((x) => Boolean(x))
      )
    );

    const companyNameById = new Map<string, string>();
    if (companyIds.length > 0) {
      const cRes = await supabaseAdmin.from("companies").select("id,company_name").in("id", companyIds);

      if (cRes.error) {
        console.error("[gmail/inbox] companies lookup failed:", cRes.error);
      } else {
        for (const c of (cRes.data ?? []) as CompanyRow[]) {
          companyNameById.set(String(c.id), String(c.company_name));
        }
      }
    }

    // ✅ 既存の応募者を取得してマッチングに使用
    const applicantsRes = await supabaseAdmin
      .from("applicants")
      .select("id, company_id, job_id, applied_at, name, site_key");

    // 応募者マッチング用のSetを作成（company_id + job_id + applied_at でマッチ）
    const existingApplicantKeys = new Set<string>();
    if (!applicantsRes.error && applicantsRes.data) {
      for (const a of applicantsRes.data) {
        if (a.company_id && a.job_id && a.applied_at) {
          // company_id + job_id + applied_at の組み合わせでキーを作成
          const key = `${a.company_id}_${a.job_id}_${a.applied_at}`;
          existingApplicantKeys.add(key);
        }
      }
    }

    const items = rows.map((row) => {
      const cid = row.company_id ? String(row.company_id) : null;
      const companyName = cid ? companyNameById.get(cid) ?? null : null;

      const mailType = normalizeMailType((row as any).mail_type);

      // ✅ 既存の応募者とマッチングして自動的にregisteredにする
      let effectiveStatus = String(row.status);
      const currentStatusLower = effectiveStatus.toLowerCase();
      if (cid && row.job_id && row.received_at && currentStatusLower === "new") {
        const receivedDate = row.received_at.split("T")[0]; // 日付部分のみ
        const matchKey = `${cid}_${row.job_id}_${receivedDate}`;
        if (existingApplicantKeys.has(matchKey)) {
          effectiveStatus = "registered";
          // DBも更新（非同期で実行、エラーは無視）
          void supabaseAdmin
            .from("gmail_inbox_messages")
            .update({ status: "registered", updated_at: new Date().toISOString() })
            .eq("id", row.id);
        }
      }

      return {
        id: String(row.id),
        gmailMessageId: String(row.gmail_message_id),
        threadId: row.thread_id ? String(row.thread_id) : null,
        fromEmail: String(row.from_email ?? ""),
        toEmail: row.to_email ? String(row.to_email) : null,
        companyId: cid,
        companyName,

        // ✅ 追加：保存済みの求人ID（プルダウンの初期値に使う）
        jobId: row.job_id ? String(row.job_id) : null,

        // ✅ 追加：応募/除外（mail_type）
        mailType,

        subject: String(row.subject ?? ""),
        snippet: row.snippet ? String(row.snippet) : "",
        receivedAt: String(row.received_at),
        siteKey: String(row.site_key),
        status: effectiveStatus,
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
      };
    });

    // ✅ 全体集計（KPI用）- mail_type=application かつ Re/Fw系以外
    const statsRes = await supabaseAdmin
      .from("gmail_inbox_messages")
      .select("subject, status, job_id, company_id, site_key, received_at, mail_type");

    let stats = {
      totalNew: 0,
      totalAttention: 0,
      totalUnlinked: 0,
      totalDirect: 0,
      totalNoJob: 0,
      totalLinkedButNew: 0,
    };

    // Re/Fw系の件名かどうか判定（フロントエンドと同じロジック）
    function isReplyLikeSubject(subject: any): boolean {
      const s = String(subject ?? "").trim();
      const stripped = s.replace(/^\s*(\[[^\]]+\]\s*)+/g, "");
      return /(^|\s)(re|fw|fwd)\s*[:：]/i.test(stripped) || /(^|\s)(返信|転送)\s*[:：]/.test(stripped);
    }

    if (!statsRes.error && statsRes.data) {
      const now = Date.now();
      const H24 = 24 * 60 * 60 * 1000;
      const D7 = 7 * 24 * 60 * 60 * 1000; // 7日間

      // mail_type=application かつ Re/Fw系以外のみ集計対象
      const appRows = statsRes.data.filter((r: any) => {
        if (normalizeMailType(r.mail_type) !== "application") return false;
        if (isReplyLikeSubject(r.subject)) return false;
        return true;
      });

      for (const r of appRows) {
        let st = String(r.status ?? "").trim().toLowerCase();

        // ✅ 既存応募者とマッチしていれば registered として扱う
        if ((st === "new" || st === "") && r.company_id && r.job_id && r.received_at) {
          const receivedDate = String(r.received_at).split("T")[0];
          const matchKey = `${r.company_id}_${r.job_id}_${receivedDate}`;
          if (existingApplicantKeys.has(matchKey)) {
            st = "registered";
          }
        }

        const isNew = st === "new" || st === "";
        const hasJob = Boolean(r.job_id);
        const siteKey = String(r.site_key ?? "").trim().toLowerCase();
        const isDirect = !siteKey || siteKey === "direct" || siteKey === "unknown" || siteKey === "undefined" || siteKey === "null";

        // 受信日時の経過時間を計算
        let elapsed = Infinity;
        if (r.received_at) {
          const receivedTime = new Date(r.received_at).getTime();
          if (Number.isFinite(receivedTime)) {
            elapsed = now - receivedTime;
          }
        }

        // NEW応募: status=new かつ 7日以内
        if (isNew && elapsed <= D7) stats.totalNew++;
        if (!hasJob) stats.totalUnlinked++;
        if (isDirect) stats.totalDirect++;

        // 要対応: status=new かつ 24h以上経過（7日以内）
        if (isNew && elapsed >= H24 && elapsed <= D7) stats.totalAttention++;

        // 求人原稿が未設定（応募があるのにjobIdがない＆new＆7日以内）
        if (!hasJob && isNew && elapsed <= D7) stats.totalNoJob++;
        // 連携済み・未登録（jobIdはあるがstatus=new＆7日以内）
        if (hasJob && isNew && elapsed <= D7) stats.totalLinkedButNew++;
      }
    }

    return NextResponse.json({
      ok: true,
      items,
      page: {
        page,
        limit,
        total,
        totalPages,
        hasPrev: page > 1,
        hasNext: page < totalPages,
      },
      stats,
      debug: {
        filteredBy: companyId ? "companyId" : toEmail ? "toEmail" : "none",
        companyId: companyId || null,
        toEmail: toEmail || null,
        returned: items.length,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unexpected error" }, { status: 500 });
  }
}
