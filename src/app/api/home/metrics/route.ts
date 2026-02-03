import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { supabaseRoute } from "@/lib/supabaseRoute";

export const dynamic = "force-dynamic";

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/**
 * JST基準の「今月 [start, end)」を UTC ISO にして返す（timestamptz比較用）
 * TokyoはDSTが無いので +09:00 固定でOK。
 */
function getThisMonthRangeJstAsUtcIso(now = new Date()) {
  // JSTの年月を取りたいので、UTC+9に寄せた "見かけの" now を作る
  const nowJst = new Date(now.getTime() + JST_OFFSET_MS);
  const y = nowJst.getUTCFullYear();
  const m = nowJst.getUTCMonth(); // 0-based

  // JST 00:00 を UTCへ戻す（-9h）
  const startUtc = new Date(Date.UTC(y, m, 1, 0, 0, 0) - JST_OFFSET_MS);
  const endUtc = new Date(Date.UTC(y, m + 1, 1, 0, 0, 0) - JST_OFFSET_MS);

  const startDateStr = `${y}-${pad2(m + 1)}-01`; // applicants.applied_at (date) 用
  const endDateStr = `${m + 2 <= 12 ? y : y + 1}-${pad2(((m + 2 - 1) % 12) + 1)}-01`;

  return {
    y,
    m: m + 1, // 1-based for display
    startIso: startUtc.toISOString(),
    endIso: endUtc.toISOString(),
    startDateStr,
    endDateStr,
  };
}

function getLast7DaysRangeJstDateStrings(now = new Date()) {
  const nowJst = new Date(now.getTime() + JST_OFFSET_MS);

  // JSTの「今日」を UTC日付として扱うため、UTC getter を使う
  const y = nowJst.getUTCFullYear();
  const m = nowJst.getUTCMonth(); // 0-based
  const d = nowJst.getUTCDate();

  // JSTの今日 00:00 を UTCへ戻す
  const todayStartUtc = new Date(Date.UTC(y, m, d, 0, 0, 0) - JST_OFFSET_MS);
  const fromUtc = new Date(todayStartUtc.getTime() - 7 * 24 * 60 * 60 * 1000);

  // applicants.applied_at は date なので YYYY-MM-DD で比較
  const fromJst = new Date(fromUtc.getTime() + JST_OFFSET_MS);
  const toJst = new Date(todayStartUtc.getTime() + JST_OFFSET_MS);

  const fromStr = `${fromJst.getUTCFullYear()}-${pad2(fromJst.getUTCMonth() + 1)}-${pad2(fromJst.getUTCDate())}`;
  const toStr = `${toJst.getUTCFullYear()}-${pad2(toJst.getUTCMonth() + 1)}-${pad2(toJst.getUTCDate())}`;

  return { fromStr, toStr };
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

    // Authorization check: Only admins can view metrics
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

    const month = getThisMonthRangeJstAsUtcIso();
    const last7 = getLast7DaysRangeJstDateStrings();

    // 会社数（今月）
    const companiesCountRes = await supabaseAdmin
      .from("companies")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .gte("created_at", month.startIso)
      .lt("created_at", month.endIso);

    if (companiesCountRes.error) {
      return NextResponse.json(
        { ok: false, error: { message: companiesCountRes.error.message }, where: "companies count" },
        { status: 500 }
      );
    }

    // 求人数（今月）
    const jobsCountRes = await supabaseAdmin
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .gte("created_at", month.startIso)
      .lt("created_at", month.endIso);

    if (jobsCountRes.error) {
      return NextResponse.json(
        { ok: false, error: { message: jobsCountRes.error.message }, where: "jobs count" },
        { status: 500 }
      );
    }

    // 応募数（今月）: applied_at(date) 基準
    const applicantsMonthCountRes = await supabaseAdmin
      .from("applicants")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .gte("applied_at", month.startDateStr)
      .lt("applied_at", month.endDateStr);

    if (applicantsMonthCountRes.error) {
      return NextResponse.json(
        { ok: false, error: { message: applicantsMonthCountRes.error.message }, where: "applicants month count" },
        { status: 500 }
      );
    }

    // 応募数（直近7日）: applied_at(date) 基準（fromStr <= applied_at < toStr+1日相当）
    // ※「今日を含む直近7日」をやりたいなら toStr を +1日するが、既存UIはDate.parseで雑にやっていたので、ここは安全に「7日前 00:00 以降」を採用。
    const applicants7dCountRes = await supabaseAdmin
      .from("applicants")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .gte("applied_at", last7.fromStr);

    if (applicants7dCountRes.error) {
      return NextResponse.json(
        { ok: false, error: { message: applicants7dCountRes.error.message }, where: "applicants 7d count" },
        { status: 500 }
      );
    }

    // 最近更新した求人（6件）
    const jobsRecentRes = await supabaseAdmin
      .from("jobs")
      .select("id,company_id,company_name,job_title,employment_type,updated_at")
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(6);

    if (jobsRecentRes.error) {
      return NextResponse.json(
        { ok: false, error: { message: jobsRecentRes.error.message }, where: "jobs recent" },
        { status: 500 }
      );
    }

    // 最近更新した会社（6件）
    const companiesRecentRes = await supabaseAdmin
      .from("companies")
      .select("id,company_name,updated_at")
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(6);

    if (companiesRecentRes.error) {
      return NextResponse.json(
        { ok: false, error: { message: companiesRecentRes.error.message }, where: "companies recent" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      kpi: {
        // すべて「今月」
        companiesThisMonth: Number(companiesCountRes.count ?? 0),
        jobsThisMonth: Number(jobsCountRes.count ?? 0),
        applicantsThisMonth: Number(applicantsMonthCountRes.count ?? 0),

        // おまけ（既存UIの枠に合わせて残す）
        applicants7d: Number(applicants7dCountRes.count ?? 0),
      },
      recent: {
        jobs: (jobsRecentRes.data ?? []).map((r) => ({
          id: String((r as any).id ?? ""),
          companyId: String((r as any).company_id ?? ""),
          companyName: String((r as any).company_name ?? ""),
          jobTitle: String((r as any).job_title ?? ""),
          employmentType: String((r as any).employment_type ?? ""),
          updatedAt: String((r as any).updated_at ?? ""),
        })),
        companies: (companiesRecentRes.data ?? []).map((r) => ({
          id: String((r as any).id ?? ""),
          companyName: String((r as any).company_name ?? ""),
          updatedAt: String((r as any).updated_at ?? ""),
        })),
      },
      debug: {
        month: {
          y: month.y,
          m: month.m,
          startIso: month.startIso,
          endIso: month.endIso,
          appliedAtRange: [month.startDateStr, month.endDateStr],
        },
        last7,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: { message: String(e?.message ?? e ?? "unexpected error") } },
      { status: 500 }
    );
  }
}
