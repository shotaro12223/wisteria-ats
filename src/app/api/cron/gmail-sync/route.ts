import { NextRequest, NextResponse } from "next/server";
import { syncGmailMessages } from "@/lib/gmailSync";
import { sendNewApplicantNotifications } from "@/lib/gmailNotifications";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5分タイムアウト（Vercel Pro以上で必要）

/**
 * Cron Job用Gmail同期エンドポイント
 * Vercel Cron Jobsから1時間毎に呼び出される
 *
 * 認証: CRON_SECRET ヘッダーで検証
 */
export async function GET(req: NextRequest) {
  // セキュリティ: Vercel Cronからの呼び出しを検証
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("[Cron] CRON_SECRET is not configured");
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET not configured" },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    console.warn("[Cron] Unauthorized cron request");
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const timestamp = new Date().toISOString();
    console.log(`[Cron] Gmail sync started at ${timestamp}`);

    // 差分同期を実行
    const syncResult = await syncGmailMessages("central", {
      labelName: "ATS/応募",
      forceFullSync: false,
    });

    if (!syncResult.ok) {
      console.error(`[Cron] Sync failed: ${syncResult.error}`);
      return NextResponse.json(
        { ok: false, error: syncResult.error },
        { status: 500 }
      );
    }

    console.log(
      `[Cron] Sync completed: fetched=${syncResult.messagesFetched}, inserted=${syncResult.messagesInserted}, type=${syncResult.syncType}`
    );

    // 新着応募メールの通知送信
    let notificationResult = { totalSent: 0, totalSuccess: 0, totalFailed: 0 };
    if (syncResult.messagesInserted > 0) {
      try {
        notificationResult = await sendNewApplicantNotifications();
        console.log(
          `[Cron] Notifications sent: total=${notificationResult.totalSent}, success=${notificationResult.totalSuccess}, failed=${notificationResult.totalFailed}`
        );
      } catch (notifyError: any) {
        console.error(`[Cron] Notification error: ${notifyError.message}`);
        // 通知エラーはログに記録するが、同期自体は成功とする
      }
    }

    return NextResponse.json({
      ok: true,
      syncType: syncResult.syncType,
      messagesFetched: syncResult.messagesFetched,
      messagesInserted: syncResult.messagesInserted,
      notifications: notificationResult,
      timestamp,
    });
  } catch (error: any) {
    console.error(`[Cron] Unexpected error: ${error.message}`);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * 開発環境での手動実行用
 * POSTでも同じ処理を実行
 */
export async function POST(req: NextRequest) {
  return GET(req);
}
