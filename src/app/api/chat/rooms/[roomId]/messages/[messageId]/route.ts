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

// PUT: Edit message
export async function PUT(
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

  // Get existing message
  const existing = await supabase
    .from("chat_messages")
    .select("id,user_id,body,deleted_at,original_body")
    .eq("id", messageId)
    .eq("room_id", roomId)
    .maybeSingle();

  if (existing.error) return jsonWithCookies(res, { ok: false, error: existing.error.message }, { status: 500 });
  if (!existing.data) return jsonWithCookies(res, { ok: false, error: "message not found" }, { status: 404 });

  // Check ownership
  if (existing.data.user_id !== userId) {
    return jsonWithCookies(res, { ok: false, error: "only message owner can edit" }, { status: 403 });
  }

  // Cannot edit deleted messages
  if (existing.data.deleted_at) {
    return jsonWithCookies(res, { ok: false, error: "cannot edit deleted message" }, { status: 400 });
  }

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return jsonWithCookies(res, { ok: false, error: "invalid json" }, { status: 400 });
  }

  const newBody = String(body?.body ?? "").trim();
  if (!newBody) return jsonWithCookies(res, { ok: false, error: "body required" }, { status: 400 });
  if (newBody.length > 5000) return jsonWithCookies(res, { ok: false, error: "body too long" }, { status: 400 });

  // Save original body on first edit
  const original_body = existing.data.original_body || existing.data.body;

  const update = await supabase
    .from("chat_messages")
    .update({
      body: newBody,
      edited_at: new Date().toISOString(),
      original_body: original_body,
    })
    .eq("id", messageId)
    .select(`
      id,room_id,user_id,body,created_at,edited_at,
      mentions,reply_to,attachments
    `)
    .single();

  if (update.error) return jsonWithCookies(res, { ok: false, error: update.error.message }, { status: 500 });

  return jsonWithCookies(res, { ok: true, item: update.data });
}

// DELETE: Soft delete message
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

  // Get existing message
  const existing = await supabase
    .from("chat_messages")
    .select("id,user_id,deleted_at")
    .eq("id", messageId)
    .eq("room_id", roomId)
    .maybeSingle();

  if (existing.error) return jsonWithCookies(res, { ok: false, error: existing.error.message }, { status: 500 });
  if (!existing.data) return jsonWithCookies(res, { ok: false, error: "message not found" }, { status: 404 });

  // Check ownership
  if (existing.data.user_id !== userId) {
    return jsonWithCookies(res, { ok: false, error: "only message owner can delete" }, { status: 403 });
  }

  // Already deleted
  if (existing.data.deleted_at) {
    return jsonWithCookies(res, { ok: false, error: "already deleted" }, { status: 400 });
  }

  const update = await supabase
    .from("chat_messages")
    .update({
      body: "[削除されたメッセージ]",
      deleted_at: new Date().toISOString(),
    })
    .eq("id", messageId)
    .select(`
      id,room_id,user_id,body,created_at,deleted_at
    `)
    .single();

  if (update.error) return jsonWithCookies(res, { ok: false, error: update.error.message }, { status: 500 });

  return jsonWithCookies(res, { ok: true, item: update.data });
}
