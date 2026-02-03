import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseRoute";

export const dynamic = "force-dynamic";

function normalizeMedia(siteKey: string): string {
  const s = String(siteKey ?? "").trim().toLowerCase();

  if (!s) return "Direct";
  if (s === "indeed") return "Indeed";
  if (s === "engage" || s === "エンゲージ") return "Engage";
  if (s === "airwork" || s === "air-work") return "AirWork";
  if (s.includes("げんき") || s.includes("genki")) return "げんきワーク";
  if (s.includes("ジモティ") || s.includes("jmty")) return "ジモティー";
  if (s.includes("はたらきんぐ") || s.includes("hataraking")) return "はたらきんぐ";
  if (s.includes("ハローワーク") || s.includes("hellowork")) return "ハローワーク";
  if (s.includes("求人box") || s.includes("kyujinbox")) return "求人BOX";
  if (s.includes("採用係長") || s.includes("saiyou") || s.includes("keicho")) return "採用係長";

  return siteKey;
}

function inferSiteFromEmail(fromEmail: string): string {
  const email = String(fromEmail ?? "").toLowerCase();

  if (email.includes("jmty.jp")) return "ジモティー";
  if (email.includes("indeed")) return "Indeed";
  if (email.includes("airwork")) return "AirWork";
  if (email.includes("saiyo-kakaricho")) return "採用係長";
  if (email.includes("en-gage")) return "Engage";
  if (email.includes("hellowork")) return "ハローワーク";

  return "Direct";
}

/**
 * GET /api/work-queue/applicants
 *
 * Returns applicant counts per job × site combination
 * Response: { ok: true, data: { byJobSite: Record<string, { count: number, lastDate: string | null }> } }
 * Key format: "jobId:siteKey"
 */
export async function GET(req: NextRequest) {
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

  try {
    // Fetch all inbox messages
    const { data: inboxItems, error: inboxError } = await supabase
      .from("gmail_inbox_messages")
      .select("job_id, site_key, from_email, subject, received_at")
      .order("received_at", { ascending: false });

    if (inboxError) {
      console.error("[work-queue/applicants] Inbox fetch error:", inboxError);
      return NextResponse.json(
        { ok: false, error: { message: "応募者データの取得に失敗しました" } },
        { status: 500 }
      );
    }

    const items = inboxItems ?? [];

    // Group by job_id × site_key
    const byJobSite: Record<string, { count: number; lastDate: string | null }> = {};

    for (const item of items) {
      const jobId = item.job_id;
      if (!jobId) continue;

      // Determine site key
      let siteKey = item.site_key ?? "";
      if (!siteKey || siteKey === "Direct" || siteKey === "unknown") {
        siteKey = inferSiteFromEmail(item.from_email ?? "");
      }
      siteKey = normalizeMedia(siteKey);

      const key = `${jobId}:${siteKey}`;

      if (!byJobSite[key]) {
        byJobSite[key] = {
          count: 0,
          lastDate: null,
        };
      }

      byJobSite[key].count += 1;

      // Track latest date
      if (item.received_at) {
        if (!byJobSite[key].lastDate || item.received_at > byJobSite[key].lastDate) {
          byJobSite[key].lastDate = item.received_at;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      data: { byJobSite },
    });
  } catch (error: any) {
    console.error("[work-queue/applicants] GET error:", error);
    return NextResponse.json(
      { ok: false, error: { message: "応募者データの取得に失敗しました" } },
      { status: 500 }
    );
  }
}
