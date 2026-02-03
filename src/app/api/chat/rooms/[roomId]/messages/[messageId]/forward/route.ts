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

// POST: Forward message to other rooms
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

  // Get message to forward
  const msgR = await supabase
    .from("chat_messages")
    .select("id,body,attachments")
    .eq("id", messageId)
    .eq("room_id", roomId)
    .maybeSingle();

  if (msgR.error) return jsonWithCookies(res, { ok: false, error: msgR.error.message }, { status: 500 });
  if (!msgR.data) return jsonWithCookies(res, { ok: false, error: "message not found" }, { status: 404 });

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return jsonWithCookies(res, { ok: false, error: "invalid json" }, { status: 400 });
  }

  const targetRoomIds = body?.targetRoomIds || [];
  if (!Array.isArray(targetRoomIds) || targetRoomIds.length === 0) {
    return jsonWithCookies(res, { ok: false, error: "targetRoomIds must be a non-empty array" }, { status: 400 });
  }

  // Verify user is member of all target rooms
  for (const targetRoomId of targetRoomIds) {
    const targetCheck = await requireRoomMember(supabase, targetRoomId, userId);
    if (!targetCheck.ok) {
      return jsonWithCookies(
        res,
        { ok: false, error: `not a member of room ${targetRoomId}` },
        { status: targetCheck.status }
      );
    }
  }

  // Create forwarded messages
  const forwardedMessages = [];
  for (const targetRoomId of targetRoomIds) {
    const ins = await supabase
      .from("chat_messages")
      .insert({
        room_id: targetRoomId,
        user_id: userId,
        body: `[転送] ${msgR.data.body}`,
        attachments: msgR.data.attachments || [],
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (ins.error) {
      console.error(`Failed to forward to room ${targetRoomId}:`, ins.error);
      continue;
    }

    forwardedMessages.push(ins.data);
  }

  return jsonWithCookies(res, {
    ok: true,
    forwarded_count: forwardedMessages.length,
    items: forwardedMessages,
  });
}
