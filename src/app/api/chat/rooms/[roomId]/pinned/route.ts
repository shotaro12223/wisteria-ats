import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseRoute";

export const dynamic = "force-dynamic";

function jsonWithCookies(baseRes: NextResponse, body: any, init?: { status?: number }) {
  const out = NextResponse.json(body, init);
  baseRes.cookies.getAll().forEach((c) => out.cookies.set(c.name, c.value, c));
  return out;
}

async function requireRoomMember(supabase: any, roomId: string, userId: string) {
  const r = await supabase
    .from("chat_room_members")
    .select("room_id")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .maybeSingle();

  if (r.error) return { ok: false as const, status: 500, message: r.error.message };
  if (!r.data) return { ok: false as const, status: 403, message: "forbidden" };
  return { ok: true as const };
}

// GET: List pinned messages
export async function GET(req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  const { supabase, res } = supabaseRoute(req);

  const { data, error } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (error || !userId) return jsonWithCookies(res, { ok: false, error: "unauthorized" }, { status: 401 });

  const { roomId } = await params;

  const memberCheck = await requireRoomMember(supabase, roomId, userId);
  if (!memberCheck.ok) return jsonWithCookies(res, { ok: false, error: memberCheck.message }, { status: memberCheck.status });

  // Get pinned messages with message data
  const r = await supabase
    .from("chat_pinned_messages")
    .select(`
      id,
      message_id,
      pinned_by,
      pinned_at
    `)
    .eq("room_id", roomId)
    .order("pinned_at", { ascending: false });

  if (r.error) return jsonWithCookies(res, { ok: false, error: r.error.message }, { status: 500 });

  const pins = r.data ?? [];
  if (pins.length === 0) {
    return jsonWithCookies(res, { ok: true, items: [] });
  }

  const messageIds = pins.map((p: any) => p.message_id);

  // Get message details
  const messagesR = await supabase
    .from("chat_messages")
    .select(`
      id,
      user_id,
      body,
      created_at,
      attachments
    `)
    .in("id", messageIds);

  if (messagesR.error) return jsonWithCookies(res, { ok: false, error: messagesR.error.message }, { status: 500 });

  const messagesMap = (messagesR.data ?? []).reduce((acc: any, m: any) => {
    acc[m.id] = m;
    return acc;
  }, {});

  // Get user info for pinned_by and message authors
  const userIds = [...new Set([...pins.map((p: any) => p.pinned_by), ...Object.values(messagesMap).map((m: any) => m.user_id)])];

  const usersR = await supabase.from("workspace_members").select("user_id,display_name").in("user_id", userIds);

  const usersMap = (usersR.data ?? []).reduce((acc: any, u: any) => {
    acc[u.user_id] = { id: u.user_id, display_name: u.display_name, email: null };
    return acc;
  }, {});

  const missingUserIds = userIds.filter((id) => !usersMap[id]);
  if (missingUserIds.length > 0) {
    const authUsersR = await supabase.auth.admin.listUsers();
    if (authUsersR.data?.users) {
      authUsersR.data.users.forEach((u: any) => {
        if (missingUserIds.includes(u.id)) {
          usersMap[u.id] = { id: u.id, display_name: u.email?.split("@")[0], email: u.email };
        }
      });
    }
  }

  // Combine data
  const enriched = pins
    .map((p: any) => {
      const msg = messagesMap[p.message_id];
      if (!msg) return null; // Message was deleted
      return {
        pin_id: p.id,
        message: {
          ...msg,
          user: usersMap[msg.user_id] || null,
        },
        pinned_by: usersMap[p.pinned_by] || null,
        pinned_at: p.pinned_at,
      };
    })
    .filter(Boolean);

  return jsonWithCookies(res, { ok: true, items: enriched });
}
