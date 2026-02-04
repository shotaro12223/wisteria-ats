import { supabaseAdmin } from "./supabaseAdmin";
import { sendPushNotificationBatch, PushPayload } from "./webPush";

type NotificationTarget =
  | { type: "client_user"; clientUserId: string }
  | { type: "company"; companyId: string }
  | { type: "all" };

type NotificationOptions = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  type?: "info" | "applicant" | "interview" | "system";
  referenceId?: string;
  saveToDb?: boolean; // Whether to save to client_notifications table
};

/**
 * Send push notification to client users
 * Can be called from API routes or server actions
 */
export async function sendClientNotification(
  target: NotificationTarget,
  options: NotificationOptions
): Promise<{
  success: boolean;
  totalSent: number;
  totalSuccess: number;
  totalFailed: number;
}> {
  const supabase = supabaseAdmin;

  // Build query to get target subscriptions
  let query = supabase
    .from("push_subscriptions")
    .select(`
      id,
      endpoint,
      p256dh,
      auth,
      client_user_id,
      client_users!inner (
        id,
        company_id,
        is_active
      )
    `)
    .eq("is_active", true)
    .eq("client_users.is_active", true);

  // Filter by target
  if (target.type === "client_user") {
    query = query.eq("client_user_id", target.clientUserId);
  } else if (target.type === "company") {
    query = query.eq("client_users.company_id", target.companyId);
  }

  const { data: subscriptions, error: subError } = await query;

  if (subError) {
    console.error("[Notification] Error fetching subscriptions:", subError);
    return { success: false, totalSent: 0, totalSuccess: 0, totalFailed: 0 };
  }

  // Save to client_notifications table FIRST (bell icon, independent of push)
  if (options.saveToDb !== false) {
    try {
      if (target.type === "company") {
        await supabase.from("client_notifications").insert({
          company_id: target.companyId,
          client_user_id: null,
          title: options.title,
          body: options.body,
          url: options.url || null,
          type: options.type || "info",
          reference_id: options.referenceId || null,
          is_read: false,
          created_at: new Date().toISOString(),
        });
      } else if (target.type === "client_user") {
        const { data: cu } = await supabase
          .from("client_users")
          .select("company_id")
          .eq("id", target.clientUserId)
          .single();

        if (cu) {
          await supabase.from("client_notifications").insert({
            company_id: cu.company_id,
            client_user_id: target.clientUserId,
            title: options.title,
            body: options.body,
            url: options.url || null,
            type: options.type || "info",
            reference_id: options.referenceId || null,
            is_read: false,
            created_at: new Date().toISOString(),
          });
        }
      }
    } catch (dbErr) {
      console.error("[Notification] client_notifications insert error:", dbErr);
    }
  }

  if (!subscriptions || subscriptions.length === 0) {
    console.log("[Notification] No active push subscriptions found");
    return { success: true, totalSent: 0, totalSuccess: 0, totalFailed: 0 };
  }

  // Prepare payload
  const payload: PushPayload = {
    title: options.title,
    body: options.body,
    url: options.url || "/client/dashboard",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: options.tag || `wisteria-${Date.now()}`,
  };

  // Send notifications
  const result = await sendPushNotificationBatch(
    subscriptions.map((sub: { id: string; endpoint: string; p256dh: string; auth: string }) => ({
      id: sub.id,
      subscription: {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      },
    })),
    payload
  );

  // Remove expired subscriptions
  if (result.expiredSubscriptionIds.length > 0) {
    await supabase
      .from("push_subscriptions")
      .delete()
      .in("id", result.expiredSubscriptionIds);
  }

  // Log the notification
  await supabase.from("push_notification_logs").insert({
    client_user_id: target.type === "client_user" ? target.clientUserId : null,
    company_id: target.type === "company" ? target.companyId : null,
    title: options.title,
    body: options.body,
    url: options.url,
    total_sent: result.totalSent,
    total_success: result.totalSuccess,
    total_failed: result.totalFailed,
    sent_at: new Date().toISOString(),
  });

  return {
    success: true,
    totalSent: result.totalSent,
    totalSuccess: result.totalSuccess,
    totalFailed: result.totalFailed,
  };
}

// ==========================================
// Predefined notification templates
// ==========================================

/**
 * Notify client that meeting dates have been proposed
 */
export async function notifyMeetingDatesProposed(
  clientUserId: string,
  subject: string
) {
  return sendClientNotification(
    { type: "client_user", clientUserId },
    {
      title: "打ち合わせ候補日のお知らせ",
      body: `「${subject}」の候補日が提示されました。ご確認ください。`,
      url: "/client/meetings",
      tag: "meeting-dates-proposed",
      type: "interview",
    }
  );
}

/**
 * Notify client about new applicant shared
 */
export async function notifyNewApplicantShared(
  companyId: string,
  applicantName: string,
  applicantId: string,
  jobTitle: string
) {
  return sendClientNotification(
    { type: "company", companyId },
    {
      title: "新規応募者のお知らせ",
      body: `${applicantName}さんが「${jobTitle}」に応募しました。`,
      url: `/client/applicants/${applicantId}`,
      tag: "new-applicant",
      type: "applicant",
      referenceId: applicantId,
    }
  );
}

/**
 * Notify client about applicant status change
 */
export async function notifyApplicantStatusChange(
  companyId: string,
  applicantName: string,
  applicantId: string,
  newStatus: string
) {
  return sendClientNotification(
    { type: "company", companyId },
    {
      title: "応募者ステータス更新",
      body: `${applicantName}さんのステータスが「${newStatus}」に変更されました。`,
      url: `/client/applicants/${applicantId}`,
      tag: "applicant-status",
      type: "applicant",
      referenceId: applicantId,
    }
  );
}

/**
 * Notify client about interview scheduled
 */
export async function notifyInterviewScheduled(
  companyId: string,
  applicantName: string,
  applicantId: string,
  interviewDate: string,
  interviewTime: string
) {
  const dateObj = new Date(interviewDate + "T00:00:00");
  const formattedDate = dateObj.toLocaleDateString("ja-JP", {
    month: "long",
    day: "numeric",
  });
  const [h, m] = interviewTime.split(":");
  const formattedTime = `${h}:${m}`;

  return sendClientNotification(
    { type: "company", companyId },
    {
      title: "面接日程が確定しました",
      body: `${applicantName}さんの面接が${formattedDate} ${formattedTime}に確定しました。`,
      url: "/client/interview-calendar",
      tag: "interview-scheduled",
      type: "interview",
      referenceId: applicantId,
    }
  );
}

/**
 * Notify client about interview reminder (day before)
 */
export async function notifyInterviewReminder(
  companyId: string,
  applicantName: string,
  applicantId: string,
  interviewTime: string
) {
  const [h, m] = interviewTime.split(":");
  const formattedTime = `${h}:${m}`;

  return sendClientNotification(
    { type: "company", companyId },
    {
      title: "明日の面接リマインダー",
      body: `明日${formattedTime}から${applicantName}さんとの面接があります。`,
      url: "/client/interview-calendar",
      tag: "interview-reminder",
      type: "interview",
      referenceId: applicantId,
    }
  );
}
