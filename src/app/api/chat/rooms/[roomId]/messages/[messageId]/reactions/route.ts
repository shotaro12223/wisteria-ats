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

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }
  const emoji = String(body?.emoji ?? "").trim();
  if (!emoji) return jsonWithCookies(res, { ok: false, error: "emoji required" }, { status: 400 });

  const msgCheck = await supabase.from("chat_messages").select("id").eq("id", messageId).eq("room_id", roomId).maybeSingle();
  if (msgCheck.error || !msgCheck.data) return jsonWithCookies(res, { ok: false, error: "message not found" }, { status: 404 });

  const ins = await supabase
    .from("chat_message_reactions")
    .insert({ message_id: messageId, user_id: userId, emoji })
    .select("id,message_id,user_id,emoji,created_at")
    .single();

  if (ins.error) {
    if (ins.error.code === "23505") {
      return jsonWithCookies(res, { ok: false, error: "already reacted" }, { status: 409 });
    }
    return jsonWithCookies(res, { ok: false, error: ins.error.message }, { status: 500 });
  }

  return jsonWithCookies(res, { ok: true, item: ins.data });
}

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

  const url = new URL(req.url);
  const emoji = url.searchParams.get("emoji");
  if (!emoji) return jsonWithCookies(res, { ok: false, error: "emoji required" }, { status: 400 });

  const del = await supabase
    .from("chat_message_reactions")
    .delete()
    .eq("message_id", messageId)
    .eq("user_id", userId)
    .eq("emoji", emoji);

  if (del.error) return jsonWithCookies(res, { ok: false, error: del.error.message }, { status: 500 });

  return jsonWithCookies(res, { ok: true });
}
