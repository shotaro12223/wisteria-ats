import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseRoute";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

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

export async function PUT(req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  const { supabase, res } = supabaseRoute(req);

  const { data, error } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (error || !userId) return jsonWithCookies(res, { ok: false, error: "unauthorized" }, { status: 401 });

  const { roomId } = await params;

  const memberCheck = await requireRoomMember(supabase, roomId, userId);
  if (!memberCheck.ok) return jsonWithCookies(res, { ok: false, error: memberCheck.message }, { status: memberCheck.status });

  // 最新メッセージのタイムスタンプを取得
  const lastMsg = await supabaseAdmin
    .from("chat_messages")
    .select("created_at")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // 最新メッセージがあればそのタイムスタンプ、なければ現在時刻
  const readAt = lastMsg.data?.created_at || new Date().toISOString();

  const upd = await supabaseAdmin
    .from("chat_room_members")
    .update({
      last_read_at: readAt,
    })
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .select();

  if (upd.error) {
    console.error("Update last_read_at error:", upd.error);
    return jsonWithCookies(res, { ok: false, error: upd.error.message }, { status: 500 });
  }

  console.log(`User ${userId} marked room ${roomId} as read at ${readAt}. Updated rows:`, upd.data?.length);

  if (!upd.data || upd.data.length === 0) {
    console.error("No rows updated! User may not be a member of this room.");
    // メンバーレコードがない場合は作成
    const ins = await supabaseAdmin
      .from("chat_room_members")
      .insert({
        room_id: roomId,
        user_id: userId,
        last_read_at: readAt,
        joined_at: new Date().toISOString(),
      });

    if (ins.error) {
      console.error("Insert member error:", ins.error);
    } else {
      console.log("Created member record and marked as read");
    }
  }

  return jsonWithCookies(res, { ok: true });
}
