import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendClientNotification } from "@/lib/sendClientNotification";

type NewApplicantMessage = {
  id: string;
  company_id: string | null;
  site_key: string;
  subject: string;
  from_email: string;
  received_at: string;
  companies?: {
    id: string;
    company_name: string;
  };
};

/**
 * 新着応募メールの通知を送信
 * 最近15分以内に登録されたメールを対象
 *
 * 返り値: { totalSent, totalSuccess, totalFailed }
 */
export async function sendNewApplicantNotifications(): Promise<{
  totalSent: number;
  totalSuccess: number;
  totalFailed: number;
}> {
  // 15分前の時刻を計算
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

  console.log(`[Notifications] Fetching new messages since ${fifteenMinutesAgo}`);

  // 新着応募メールを取得
  // ※ RLS対応のため、publicな取得を想定
  const { data: messages, error } = await supabaseAdmin
    .from("gmail_inbox_messages")
    .select(
      `
      id,
      company_id,
      site_key,
      subject,
      from_email,
      received_at,
      created_at,
      companies (
        id,
        company_name
      )
    `
    )
    .eq("mail_type", "application")
    .eq("status", "new")
    .gte("created_at", fifteenMinutesAgo)
    .order("received_at", { ascending: false });

  if (error) {
    console.error("[Notifications] Error fetching new messages:", error);
    return { totalSent: 0, totalSuccess: 0, totalFailed: 0 };
  }

  if (!messages || messages.length === 0) {
    console.log("[Notifications] No new messages to notify");
    return { totalSent: 0, totalSuccess: 0, totalFailed: 0 };
  }

  console.log(`[Notifications] Found ${messages.length} new messages`);

  // 管理者ユーザーの取得
  const { data: adminUsers, error: adminError } = await supabaseAdmin
    .from("workspace_members")
    .select("user_id")
    .eq("role", "admin");

  if (adminError) {
    console.error("[Notifications] Error fetching admin users:", adminError);
    return { totalSent: messages.length, totalSuccess: 0, totalFailed: messages.length };
  }

  if (!adminUsers || adminUsers.length === 0) {
    console.warn("[Notifications] No admin users found for notifications");
    return { totalSent: messages.length, totalSuccess: 0, totalFailed: messages.length };
  }

  console.log(`[Notifications] Found ${adminUsers.length} admin users`);

  // 各メッセージについて通知を送信
  let totalSuccess = 0;
  let totalFailed = 0;

  for (const msg of messages) {
    try {
      const typedMsg = msg as unknown as NewApplicantMessage;
      const companyName = (typedMsg as any).companies?.company_name || "不明な会社";
      const siteKey = typedMsg.site_key || "Direct";

      console.log(
        `[Notifications] Processing: ${companyName} (${siteKey}) - "${typedMsg.subject}"`
      );

      // 企業向けの通知（もし company_id が設定されている場合）
      if (typedMsg.company_id) {
        try {
          await notifyCompanyNewApplicant(
            typedMsg.company_id,
            typedMsg.from_email,
            typedMsg.subject,
            siteKey
          );
          console.log(`[Notifications] Sent company notification for company_id=${typedMsg.company_id}`);
        } catch (e: any) {
          console.error(`[Notifications] Failed to send company notification:`, e.message);
          // 企業向け通知失敗は続行
        }
      }

      // TODO: 管理者向けプッシュ通知システムの実装
      // 現在のsendClientNotificationはclient_users向け
      // 管理者向けには admin_notifications テーブルやスマホプッシュが必要

      totalSuccess++;
    } catch (e: any) {
      console.error(`[Notifications] Error processing message:`, e.message);
      totalFailed++;
    }
  }

  console.log(
    `[Notifications] Completed: sent=${messages.length}, success=${totalSuccess}, failed=${totalFailed}`
  );

  return {
    totalSent: messages.length,
    totalSuccess,
    totalFailed,
  };
}

/**
 * 特定の会社の新着応募を企業ポータルユーザーに通知
 */
export async function notifyCompanyNewApplicant(
  companyId: string,
  applicantEmail: string,
  jobTitle: string,
  siteKey: string
): Promise<void> {
  // 企業に属するクライアントユーザーを取得
  const { data: clientUsers, error } = await supabaseAdmin
    .from("client_users")
    .select("id")
    .eq("company_id", companyId)
    .eq("is_active", true);

  if (error || !clientUsers || clientUsers.length === 0) {
    console.log(`[Notifications] No active client users for company ${companyId}`);
    return;
  }

  // 各ユーザーに通知を送信
  for (const user of clientUsers) {
    try {
      await sendClientNotification(
        { type: "client_user", clientUserId: user.id },
        {
          title: "新規応募のお知らせ",
          body: `新しい応募があります (${siteKey})\n件名: ${jobTitle}`,
          url: `/client/applicants`,
          tag: "new-applicant",
          type: "applicant",
          saveToDb: true,
        }
      );
    } catch (e: any) {
      console.error(
        `[Notifications] Failed to notify client user ${user.id}:`,
        e.message
      );
      // 個別ユーザーへの通知失敗は続行
    }
  }
}

/**
 * 管理者向け通知を送信（将来実装用）
 * admin_notifications テーブルが必要
 */
export async function notifyAdminNewApplicant(
  companyName: string,
  siteKey: string,
  subject: string
): Promise<void> {
  // TODO: 管理者向け通知テーブルへの挿入
  // または Slack/Email 通知の実装

  // 暫定: ログのみ
  console.log(
    `[Notifications] Admin notification: ${companyName} (${siteKey}) - ${subject}`
  );
}
