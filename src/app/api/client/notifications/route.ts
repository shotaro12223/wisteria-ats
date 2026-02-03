import { NextResponse, NextRequest } from "next/server";
import { supabaseRoute } from "@/lib/supabaseRoute";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// Helper: resolve company_id and client_user_id from auth
async function resolveUser(req: NextRequest) {
  const { supabase } = supabaseRoute(req);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return null;

  // Try client_users first
  const { data: clientUser } = await supabaseAdmin
    .from("client_users")
    .select("id, company_id, is_active")
    .eq("user_id", user.id)
    .single();

  if (clientUser && clientUser.is_active) {
    return { companyId: clientUser.company_id, clientUserId: clientUser.id, isAdmin: false };
  }

  // Fallback: admin preview mode (companyId from query param)
  const url = new URL(req.url);
  const companyIdParam = url.searchParams.get("companyId");
  if (companyIdParam) {
    const { data: member } = await supabaseAdmin
      .from("workspace_members")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (member) {
      return { companyId: companyIdParam, clientUserId: null, isAdmin: true };
    }
  }

  return null;
}

// GET: Fetch all notifications for the client user's company
export async function GET(req: NextRequest) {
  const resolved = await resolveUser(req);
  if (!resolved) {
    return NextResponse.json(
      { ok: false, error: { message: "Unauthorized" } },
      { status: 401 }
    );
  }

  const { companyId, clientUserId } = resolved;

  // Parse query params
  const url = new URL(req.url);
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : 50;
  const unreadOnly = url.searchParams.get("unread") === "true";

  // Build query (use supabaseAdmin to bypass RLS for reliable reads)
  let query = supabaseAdmin
    .from("client_notifications")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(limit);

  // Filter by user or company-wide
  if (clientUserId) {
    query = query.or(`client_user_id.eq.${clientUserId},client_user_id.is.null`);
  }

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
  let countQuery = supabaseAdmin
    .from("client_notifications")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("is_read", false);

  if (clientUserId) {
    countQuery = countQuery.or(`client_user_id.eq.${clientUserId},client_user_id.is.null`);
  }

  const { count: unreadCount } = await countQuery;

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
  const resolved = await resolveUser(req);
  if (!resolved) {
    return NextResponse.json(
      { ok: false, error: { message: "Unauthorized" } },
      { status: 401 }
    );
  }

  const { companyId } = resolved;

  // Parse request body
  const body = await req.json();
  const { notificationId, markAllRead } = body;

  if (markAllRead) {
    // Mark all as read (use supabaseAdmin for reliable writes)
    let updateQuery = supabaseAdmin
      .from("client_notifications")
      .update({ is_read: true })
      .eq("company_id", companyId)
      .eq("is_read", false);

    if (resolved.clientUserId) {
      updateQuery = updateQuery.or(`client_user_id.eq.${resolved.clientUserId},client_user_id.is.null`);
    }

    const { error: updateError } = await updateQuery;

    if (updateError) {
      console.error("[Notifications] Mark all read error:", updateError);
      return NextResponse.json(
        { ok: false, error: { message: "Failed to mark as read" } },
        { status: 500 }
      );
    }
  } else if (notificationId) {
    // Mark single as read
    const { error: updateError } = await supabaseAdmin
      .from("client_notifications")
      .update({ is_read: true })
      .eq("id", notificationId)
      .eq("company_id", companyId);

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
