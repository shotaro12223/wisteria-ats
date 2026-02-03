import "server-only";
import webPush from "web-push";

// VAPID keys should be generated once and stored in environment variables
// Generate with: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

// Configure web-push
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export type PushSubscriptionData = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export type PushPayload = {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  requireInteraction?: boolean;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
};

/**
 * Send push notification to a single subscription
 */
export async function sendPushNotification(
  subscription: PushSubscriptionData,
  payload: PushPayload
): Promise<{ success: boolean; error?: string }> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.error("[WebPush] VAPID keys not configured");
    return { success: false, error: "VAPID keys not configured" };
  }

  try {
    await webPush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      },
      JSON.stringify(payload),
      {
        TTL: 60 * 60 * 24, // 24 hours
        urgency: "high",
      }
    );
    return { success: true };
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    console.error("[WebPush] Error sending notification:", err);

    // If subscription is invalid (410 Gone or 404), it should be removed
    if (err.statusCode === 410 || err.statusCode === 404) {
      return { success: false, error: "subscription_expired" };
    }

    return { success: false, error: err.message || "Unknown error" };
  }
}

/**
 * Send push notification to multiple subscriptions
 */
export async function sendPushNotificationBatch(
  subscriptions: Array<{ id: string; subscription: PushSubscriptionData }>,
  payload: PushPayload
): Promise<{
  totalSent: number;
  totalSuccess: number;
  totalFailed: number;
  expiredSubscriptionIds: string[];
}> {
  const results = await Promise.allSettled(
    subscriptions.map(async ({ id, subscription }) => {
      const result = await sendPushNotification(subscription, payload);
      return { id, ...result };
    })
  );

  let totalSuccess = 0;
  let totalFailed = 0;
  const expiredSubscriptionIds: string[] = [];

  for (const result of results) {
    if (result.status === "fulfilled") {
      if (result.value.success) {
        totalSuccess++;
      } else {
        totalFailed++;
        if (result.value.error === "subscription_expired") {
          expiredSubscriptionIds.push(result.value.id);
        }
      }
    } else {
      totalFailed++;
    }
  }

  return {
    totalSent: subscriptions.length,
    totalSuccess,
    totalFailed,
    expiredSubscriptionIds,
  };
}

/**
 * Get the public VAPID key for client-side subscription
 */
export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}
