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

// POST: Leave a group room
export async function POST(req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  const { supabase, res } = supabaseRoute(req);

  const { data, error } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (error || !userId) return jsonWithCookies(res, { ok: false, error: "unauthorized" }, { status: 401 });

  const { roomId } = await params;

  const memberCheck = await requireRoomMember(supabase, roomId, userId);
  if (!memberCheck.ok) return jsonWithCookies(res, { ok: false, error: memberCheck.message }, { status: memberCheck.status });

  // Get room info
  const roomR = await supabase
    .from("chat_rooms")
    .select("id,type,created_by")
    .eq("id", roomId)
    .maybeSingle();

  if (roomR.error) return jsonWithCookies(res, { ok: false, error: roomR.error.message }, { status: 500 });
  if (!roomR.data) return jsonWithCookies(res, { ok: false, error: "room not found" }, { status: 404 });

  // Can only leave group rooms
  if (roomR.data.type !== "group") {
    return jsonWithCookies(res, { ok: false, error: "個人チャットからは退会できません。削除してください。" }, { status: 400 });
  }

  // Count remaining members
  const countR = await supabase
    .from("chat_room_members")
    .select("user_id", { count: "exact", head: true })
    .eq("room_id", roomId);

  if (countR.error) return jsonWithCookies(res, { ok: false, error: countR.error.message }, { status: 500 });

  const memberCount = countR.count || 0;

  // If last member or creator, delete the room instead
  if (memberCount <= 1 || roomR.data.created_by === userId) {
    // Delete room (cascades to members and messages)
    const delR = await supabase
      .from("chat_rooms")
      .delete()
      .eq("id", roomId);

    if (delR.error) return jsonWithCookies(res, { ok: false, error: delR.error.message }, { status: 500 });

    return jsonWithCookies(res, { ok: true, deleted: true });
  }

  // Remove member
  const delMember = await supabase
    .from("chat_room_members")
    .delete()
    .eq("room_id", roomId)
    .eq("user_id", userId);

  if (delMember.error) return jsonWithCookies(res, { ok: false, error: delMember.error.message }, { status: 500 });

  return jsonWithCookies(res, { ok: true, deleted: false });
}
