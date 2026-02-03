import { supabaseAdmin } from "./supabaseAdmin";

type NotificationSeverity = "info" | "warning" | "error" | "critical";

type AdminNotificationOptions = {
  title: string;
  body: string;
  severity?: NotificationSeverity;
  category?: "gmail_sync" | "system" | "security" | "data";
  details?: Record<string, any>;
};

/**
 * Send notification to all admin users
 * Saves to admin_notifications table for display in admin dashboard
 */
export async function sendAdminNotification(
  options: AdminNotificationOptions
): Promise<{ success: boolean; notificationCount: number }> {
  const supabase = supabaseAdmin;

  // Get all admin users
  const { data: adminUsers, error: adminError } = await supabase
    .from("workspace_members")
    .select("user_id")
    .eq("role", "admin");

  if (adminError || !adminUsers || adminUsers.length === 0) {
    console.error("[AdminNotification] No admin users found:", adminError);
    return { success: false, notificationCount: 0 };
  }

  const now = new Date().toISOString();

  // Insert notifications for each admin
  const notifications = adminUsers.map((admin) => ({
    user_id: admin.user_id,
    title: options.title,
    body: options.body,
    severity: options.severity || "info",
    category: options.category || "system",
    details: options.details || null,
    is_read: false,
    created_at: now,
  }));

  const { error: insertError } = await supabase
    .from("admin_notifications")
    .insert(notifications);

  if (insertError) {
    console.error("[AdminNotification] Insert error:", insertError);
    return { success: false, notificationCount: 0 };
  }

  console.log(
    `[AdminNotification] Sent ${notifications.length} notifications: ${options.title}`
  );

  return { success: true, notificationCount: notifications.length };
}

// ==========================================
// Predefined notification templates
// ==========================================

/**
 * Notify admins about Gmail sync failure
 */
export async function notifyGmailSyncFailure(
  errorMessage: string,
  syncType: "full" | "incremental",
  retryCount?: number
): Promise<void> {
  await sendAdminNotification({
    title: "Gmail同期エラー",
    body: `Gmail同期が失敗しました: ${errorMessage}`,
    severity: retryCount && retryCount >= 3 ? "critical" : "error",
    category: "gmail_sync",
    details: {
      errorMessage,
      syncType,
      retryCount: retryCount || 0,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Notify admins about Gmail token expiration/refresh failure
 */
export async function notifyGmailTokenError(
  errorType: "refresh_failed" | "token_expired" | "invalid_grant",
  errorMessage: string
): Promise<void> {
  await sendAdminNotification({
    title: "Gmail認証エラー",
    body: `Gmail認証トークンの更新に失敗しました。再認証が必要です: ${errorMessage}`,
    severity: "critical",
    category: "gmail_sync",
    details: {
      errorType,
      errorMessage,
      timestamp: new Date().toISOString(),
      action: "再認証が必要です。/admin/settings から Gmail を再接続してください。",
    },
  });
}

/**
 * Notify admins about Gmail sync success after failure recovery
 */
export async function notifyGmailSyncRecovered(): Promise<void> {
  await sendAdminNotification({
    title: "Gmail同期復旧",
    body: "Gmail同期が正常に復旧しました。",
    severity: "info",
    category: "gmail_sync",
    details: {
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Notify admins about large number of unprocessed emails
 */
export async function notifyGmailBacklog(unprocessedCount: number): Promise<void> {
  await sendAdminNotification({
    title: "Gmail未処理メール多数",
    body: `未処理のGmailメールが${unprocessedCount}件あります。処理に時間がかかる可能性があります。`,
    severity: "warning",
    category: "gmail_sync",
    details: {
      unprocessedCount,
      timestamp: new Date().toISOString(),
    },
  });
}
