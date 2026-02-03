import { NextResponse, NextRequest } from "next/server";
import { supabaseRoute } from "@/lib/supabaseRoute";
import { sendPushNotificationBatch, PushPayload } from "@/lib/webPush";

export const dynamic = "force-dynamic";

// POST: Send push notification to clients
export async function POST(req: NextRequest) {
  const { supabase } = supabaseRoute(req);

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

  // Verify user is admin (not a client user)
  const { data: clientUser } = await supabase
    .from("client_users")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (clientUser) {
    return NextResponse.json(
      { ok: false, error: { message: "Admin only" } },
      { status: 403 }
    );
  }

  // Parse request body
  let body: {
    title?: string;
    body?: string;
    url?: string;
    companyId?: string;
    clientUserId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  const { title, body: messageBody, url, companyId, clientUserId } = body;

  if (!title || !messageBody) {
    return NextResponse.json(
      { ok: false, error: { message: "title and body are required" } },
      { status: 400 }
    );
  }

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
    .eq("is_active", true);

  // Filter by company or specific user
  if (clientUserId) {
    query = query.eq("client_user_id", clientUserId);
  } else if (companyId) {
    query = query.eq("client_users.company_id", companyId);
  }

  const { data: subscriptions, error: subError } = await query;

  if (subError) {
    return NextResponse.json(
      { ok: false, error: { message: subError.message } },
      { status: 500 }
    );
  }

  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({
      ok: true,
      data: {
        message: "No active subscriptions found",
        totalSent: 0,
        totalSuccess: 0,
        totalFailed: 0,
      },
    });
  }

  // Prepare payload
  const payload: PushPayload = {
    title,
    body: messageBody,
    url: url || "/client/dashboard",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: `wisteria-${Date.now()}`,
  };

  // Send notifications
  const result = await sendPushNotificationBatch(
    subscriptions.map((sub) => ({
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
    client_user_id: clientUserId || null,
    company_id: companyId || null,
    title,
    body: messageBody,
    url,
    total_sent: result.totalSent,
    total_success: result.totalSuccess,
    total_failed: result.totalFailed,
    sent_at: new Date().toISOString(),
  });

  return NextResponse.json({
    ok: true,
    data: {
      totalSent: result.totalSent,
      totalSuccess: result.totalSuccess,
      totalFailed: result.totalFailed,
    },
  });
}
