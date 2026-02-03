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

export async function GET(req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  const { supabase, res } = supabaseRoute(req);

  const { data, error } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (error || !userId) return jsonWithCookies(res, { ok: false, error: "unauthorized" }, { status: 401 });

  const { roomId } = await params;

  const memberCheck = await requireRoomMember(supabase, roomId, userId);
  if (!memberCheck.ok) return jsonWithCookies(res, { ok: false, error: memberCheck.message }, { status: memberCheck.status });

  const r = await supabase
    .from("chat_messages")
    .select(`
      id,room_id,user_id,body,created_at,edited_at,deleted_at,
      mentions,reply_to,attachments
    `)
    .eq("room_id", roomId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(200);

  if (r.error) return jsonWithCookies(res, { ok: false, error: r.error.message }, { status: 500 });

  const messages = r.data ?? [];
  const userIds = [...new Set(messages.map((m: any) => m.user_id))];
  const messageIds = messages.map((m: any) => m.id);

  const usersR = await supabase
    .from("workspace_members")
    .select("user_id,display_name,avatar_url")
    .in("user_id", userIds);

  const usersMap = (usersR.data ?? []).reduce((acc: any, u: any) => {
    acc[u.user_id] = { id: u.user_id, display_name: u.display_name, avatar_url: u.avatar_url, email: null };
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

  const reactionsR = await supabase
    .from("chat_message_reactions")
    .select("id,message_id,user_id,emoji,created_at")
    .in("message_id", messageIds);

  const replyIds = messages.map((m: any) => m.reply_to).filter(Boolean);
  let repliesMap: any = {};
  if (replyIds.length > 0) {
    const repliesR = await supabase
      .from("chat_messages")
      .select("id,user_id,body")
      .in("id", replyIds);
    if (!repliesR.error && repliesR.data) {
      repliesMap = Object.fromEntries(repliesR.data.map((r: any) => [r.id, r]));
    }
  }

  const reactionsMap = (reactionsR.data ?? []).reduce((acc: any, r: any) => {
    if (!acc[r.message_id]) acc[r.message_id] = [];
    acc[r.message_id].push(r);
    return acc;
  }, {});

  const enriched = messages.map((m: any) => ({
    ...m,
    user: usersMap[m.user_id] || null,
    reactions: reactionsMap[m.id] || [],
    reply_to_data: m.reply_to ? repliesMap[m.reply_to] || null : null,
  }));

  return jsonWithCookies(res, { ok: true, items: enriched });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  const { supabase, res } = supabaseRoute(req);

  const { data, error } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (error || !userId) return jsonWithCookies(res, { ok: false, error: "unauthorized" }, { status: 401 });

  const { roomId } = await params;

  const memberCheck = await requireRoomMember(supabase, roomId, userId);
  if (!memberCheck.ok) return jsonWithCookies(res, { ok: false, error: memberCheck.message }, { status: memberCheck.status });

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }
  const text = String(body?.body ?? "").trim();
  const mentions = body?.mentions || body?.mentioned_user_ids || [];
  const replyTo = body?.reply_to || body?.reply_to_message_id || null;
  const attachments = body?.attachments || [];

  if (!text && attachments.length === 0) {
    return jsonWithCookies(res, { ok: false, error: "body or attachments required" }, { status: 400 });
  }
  if (text.length > 5000) return jsonWithCookies(res, { ok: false, error: "body too long" }, { status: 400 });

  const ins = await supabase
    .from("chat_messages")
    .insert({
      room_id: roomId,
      user_id: userId,
      body: text,
      mentions: mentions,
      reply_to: replyTo,
      attachments: attachments,
    })
    .select(`
      id,room_id,user_id,body,created_at,
      mentions,reply_to,attachments
    `)
    .single();

  if (ins.error) return jsonWithCookies(res, { ok: false, error: ins.error.message }, { status: 500 });

  const userR = await supabase.from("workspace_members").select("user_id,display_name,avatar_url").eq("user_id", userId).maybeSingle();
  const enriched = {
    ...ins.data,
    user: userR.data ? { id: userR.data.user_id, display_name: userR.data.display_name, avatar_url: userR.data.avatar_url, email: null } : null,
    reactions: [],
    reply_to_data: null,
  };

  return jsonWithCookies(res, { ok: true, item: enriched });
}
