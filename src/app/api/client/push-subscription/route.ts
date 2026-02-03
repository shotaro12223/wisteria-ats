import { NextResponse, NextRequest } from "next/server";
import { supabaseRoute } from "@/lib/supabaseRoute";

export const dynamic = "force-dynamic";

// GET: Get VAPID public key and current subscriptions
export async function GET(req: NextRequest) {
  const { supabase } = supabaseRoute(req);

  // Get VAPID public key directly from env (no need to import webPush for this)
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

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

  // Get client user
  const { data: clientUser, error: clientUserError } = await supabase
    .from("client_users")
    .select("id, is_active")
    .eq("user_id", user.id)
    .single();

  if (clientUserError || !clientUser || !clientUser.is_active) {
    return NextResponse.json(
      { ok: false, error: { message: "Client user not found" } },
      { status: 403 }
    );
  }

  // Get existing subscriptions for this user (table might not exist yet)
  let subscriptions: { id: string; endpoint: string; device_name: string | null; created_at: string; last_used_at: string | null }[] = [];
  try {
    const { data } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, device_name, created_at, last_used_at")
      .eq("client_user_id", clientUser.id)
      .eq("is_active", true);
    subscriptions = data || [];
  } catch {
    // Table might not exist yet, that's ok
  }

  return NextResponse.json({
    ok: true,
    data: {
      vapidPublicKey,
      subscriptions,
    },
  });
}

// POST: Register new push subscription
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

  // Get client user
  const { data: clientUser, error: clientUserError } = await supabase
    .from("client_users")
    .select("id, is_active")
    .eq("user_id", user.id)
    .single();

  if (clientUserError || !clientUser || !clientUser.is_active) {
    return NextResponse.json(
      { ok: false, error: { message: "Client user not found" } },
      { status: 403 }
    );
  }

  // Parse request body
  let body: {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
    deviceName?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  const { endpoint, keys, deviceName } = body;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json(
      { ok: false, error: { message: "Missing subscription data" } },
      { status: 400 }
    );
  }

  // Get user agent for device info
  const userAgent = req.headers.get("user-agent") || "";

  // Upsert subscription (update if endpoint exists, insert if new)
  const { data: subscription, error: insertError } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        client_user_id: clientUser.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        user_agent: userAgent,
        device_name: deviceName || null,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        onConflict: "endpoint",
      }
    )
    .select()
    .single();

  if (insertError) {
    console.error("[Push Subscription] Error:", insertError);
    return NextResponse.json(
      { ok: false, error: { message: insertError.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, data: subscription }, { status: 201 });
}

// DELETE: Unsubscribe
export async function DELETE(req: NextRequest) {
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

  // Get client user
  const { data: clientUser, error: clientUserError } = await supabase
    .from("client_users")
    .select("id, is_active")
    .eq("user_id", user.id)
    .single();

  if (clientUserError || !clientUser || !clientUser.is_active) {
    return NextResponse.json(
      { ok: false, error: { message: "Client user not found" } },
      { status: 403 }
    );
  }

  // Parse request body
  let body: { endpoint?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  const { endpoint } = body;

  if (!endpoint) {
    return NextResponse.json(
      { ok: false, error: { message: "Missing endpoint" } },
      { status: 400 }
    );
  }

  // Delete or deactivate subscription
  const { error: deleteError } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("client_user_id", clientUser.id)
    .eq("endpoint", endpoint);

  if (deleteError) {
    return NextResponse.json(
      { ok: false, error: { message: deleteError.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, data: null });
}
