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

// POST: Pin message
export async function POST(
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

  // Check if message exists and belongs to this room
  const messageCheck = await supabase
    .from("chat_messages")
    .select("id")
    .eq("id", messageId)
    .eq("room_id", roomId)
    .maybeSingle();

  if (messageCheck.error) return jsonWithCookies(res, { ok: false, error: messageCheck.error.message }, { status: 500 });
  if (!messageCheck.data) return jsonWithCookies(res, { ok: false, error: "message not found" }, { status: 404 });

  // Check pin limit (max 10 pins per room)
  const countR = await supabase
    .from("chat_pinned_messages")
    .select("id", { count: "exact", head: true })
    .eq("room_id", roomId);

  if (countR.error) return jsonWithCookies(res, { ok: false, error: countR.error.message }, { status: 500 });

  const pinCount = countR.count || 0;
  if (pinCount >= 10) {
    return jsonWithCookies(res, { ok: false, error: "最大10件までピン留めできます" }, { status: 400 });
  }

  // Insert pin (or ignore if already pinned)
  const ins = await supabase
    .from("chat_pinned_messages")
    .insert({
      room_id: roomId,
      message_id: messageId,
      pinned_by: userId,
      pinned_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (ins.error) {
    // Unique constraint violation - already pinned
    if (ins.error.code === "23505") {
      return jsonWithCookies(res, { ok: false, error: "already pinned" }, { status: 400 });
    }
    return jsonWithCookies(res, { ok: false, error: ins.error.message }, { status: 500 });
  }

  return jsonWithCookies(res, { ok: true, item: ins.data });
}

// DELETE: Unpin message
export async function DELETE(
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

  // Get existing pin
  const existing = await supabase
    .from("chat_pinned_messages")
    .select("pinned_by")
    .eq("room_id", roomId)
    .eq("message_id", messageId)
    .maybeSingle();

  if (existing.error) return jsonWithCookies(res, { ok: false, error: existing.error.message }, { status: 500 });
  if (!existing.data) return jsonWithCookies(res, { ok: false, error: "not pinned" }, { status: 404 });

  // Only allow the person who pinned it or room creator to unpin
  // For simplicity, we'll allow any member to unpin
  // You can add additional checks here if needed

  const del = await supabase
    .from("chat_pinned_messages")
    .delete()
    .eq("room_id", roomId)
    .eq("message_id", messageId);

  if (del.error) return jsonWithCookies(res, { ok: false, error: del.error.message }, { status: 500 });

  return jsonWithCookies(res, { ok: true });
}
