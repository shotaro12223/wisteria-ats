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

// GET: List users who read this message
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string; messageId: string }> }
) {
  const { supabase, res } = supabaseRoute(req);

  const { data, error } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (error || !userId) return jsonWithCookies(res, { ok: false, error: "unauthorized" }, { status: 401 });

  const { roomId, messageId } = await params;

  const memberCheck = await requireRoomMember(supabase, roomId, userId);
  if (!memberCheck.ok) return jsonWithCookies(res, { ok: false, error: memberCheck.message }, { status: memberCheck.status });

  // Get message to check created_at
  const msgR = await supabase
    .from("chat_messages")
    .select("created_at")
    .eq("id", messageId)
    .eq("room_id", roomId)
    .maybeSingle();

  if (msgR.error) return jsonWithCookies(res, { ok: false, error: msgR.error.message }, { status: 500 });
  if (!msgR.data) return jsonWithCookies(res, { ok: false, error: "message not found" }, { status: 404 });

  const messageCreatedAt = msgR.data.created_at;

  // Get all room members
  const membersR = await supabase
    .from("chat_room_members")
    .select("user_id,last_read_at")
    .eq("room_id", roomId);

  if (membersR.error) return jsonWithCookies(res, { ok: false, error: membersR.error.message }, { status: 500 });

  const members = membersR.data ?? [];

  // Filter readers: those whose last_read_at >= message created_at
  const readers = members.filter((m: any) => {
    if (!m.last_read_at) return false;
    return new Date(m.last_read_at).getTime() >= new Date(messageCreatedAt).getTime();
  });

  const readerUserIds = readers.map((r: any) => r.user_id);

  if (readerUserIds.length === 0) {
    return jsonWithCookies(res, { ok: true, readers: [], total: 0 });
  }

  // Get user info
  const usersR = await supabase.from("workspace_members").select("user_id,display_name,avatar_url").in("user_id", readerUserIds);

  const usersMap = (usersR.data ?? []).reduce((acc: any, u: any) => {
    acc[u.user_id] = { id: u.user_id, display_name: u.display_name, avatar_url: u.avatar_url };
    return acc;
  }, {});

  const missingUserIds = readerUserIds.filter((id) => !usersMap[id]);
  if (missingUserIds.length > 0) {
    const authUsersR = await supabase.auth.admin.listUsers();
    if (authUsersR.data?.users) {
      authUsersR.data.users.forEach((u: any) => {
        if (missingUserIds.includes(u.id)) {
          usersMap[u.id] = { id: u.id, display_name: u.email?.split("@")[0], avatar_url: null };
        }
      });
    }
  }

  const enriched = readers.map((r: any) => ({
    user_id: r.user_id,
    display_name: usersMap[r.user_id]?.display_name || "Unknown",
    avatar_url: usersMap[r.user_id]?.avatar_url || null,
    read_at: r.last_read_at,
  }));

  return jsonWithCookies(res, { ok: true, readers: enriched, total: enriched.length });
}
