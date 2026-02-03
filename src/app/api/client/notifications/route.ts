import { NextResponse, NextRequest } from "next/server";
import { supabaseRoute } from "@/lib/supabaseRoute";

export const dynamic = "force-dynamic";

// GET: Fetch all notifications for the client user's company
export async function GET(req: NextRequest) {
  const { supabase } = supabaseRoute(req);

  // Get authenticated user
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

  // Get client user info
  const { data: clientUser, error: clientUserError } = await supabase
    .from("client_users")
    .select("id, company_id, is_active")
    .eq("user_id", user.id)
    .single();

  if (clientUserError || !clientUser) {
    return NextResponse.json(
      { ok: false, error: { message: "Client user not found" } },
      { status: 403 }
    );
  }

  if (!clientUser.is_active) {
    return NextResponse.json(
      { ok: false, error: { message: "Account is inactive" } },
      { status: 403 }
    );
  }

  // Parse query params
  const url = new URL(req.url);
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : 50;
  const unreadOnly = url.searchParams.get("unread") === "true";

  // Build query
  let query = supabase
    .from("client_notifications")
    .select("*")
    .eq("company_id", clientUser.company_id)
    .order("created_at", { ascending: false })
    .limit(limit);

  // Filter by user or company-wide
  query = query.or(`client_user_id.eq.${clientUser.id},client_user_id.is.null`);

  if (unreadOnly) {
    query = query.eq("is_read", false);
  }

  const { data: notifications, error: notificationsError } = await query;

  if (notificationsError) {
    console.error("[Notifications] Fetch error:", notificationsError);
    return NextResponse.json(
      { ok: false, error: { message: "Failed to fetch notifications" } },
      { status: 500 }
    );
  }

  // Get unread count
  const { count: unreadCount } = await supabase
    .from("client_notifications")
    .select("*", { count: "exact", head: true })
    .eq("company_id", clientUser.company_id)
    .eq("is_read", false)
    .or(`client_user_id.eq.${clientUser.id},client_user_id.is.null`);

  return NextResponse.json({
    ok: true,
    data: {
      notifications: notifications || [],
      unreadCount: unreadCount || 0,
    },
  });
}

// PUT: Mark notification(s) as read
export async function PUT(req: NextRequest) {
  const { supabase } = supabaseRoute(req);

  // Get authenticated user
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

  // Get client user info
  const { data: clientUser, error: clientUserError } = await supabase
    .from("client_users")
    .select("id, company_id, is_active")
    .eq("user_id", user.id)
    .single();

  if (clientUserError || !clientUser) {
    return NextResponse.json(
      { ok: false, error: { message: "Client user not found" } },
      { status: 403 }
    );
  }

  if (!clientUser.is_active) {
    return NextResponse.json(
      { ok: false, error: { message: "Account is inactive" } },
      { status: 403 }
    );
  }

  // Parse request body
  const body = await req.json();
  const { notificationId, markAllRead } = body;

  if (markAllRead) {
    // Mark all as read
    const { error: updateError } = await supabase
      .from("client_notifications")
      .update({ is_read: true })
      .eq("company_id", clientUser.company_id)
      .eq("is_read", false)
      .or(`client_user_id.eq.${clientUser.id},client_user_id.is.null`);

    if (updateError) {
      console.error("[Notifications] Mark all read error:", updateError);
      return NextResponse.json(
        { ok: false, error: { message: "Failed to mark as read" } },
        { status: 500 }
      );
    }
  } else if (notificationId) {
    // Mark single as read
    const { error: updateError } = await supabase
      .from("client_notifications")
      .update({ is_read: true })
      .eq("id", notificationId)
      .eq("company_id", clientUser.company_id);

    if (updateError) {
      console.error("[Notifications] Mark read error:", updateError);
      return NextResponse.json(
        { ok: false, error: { message: "Failed to mark as read" } },
        { status: 500 }
      );
    }
  } else {
    return NextResponse.json(
      { ok: false, error: { message: "notificationId or markAllRead required" } },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
