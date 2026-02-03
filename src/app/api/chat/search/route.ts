import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseRoute";

export const dynamic = "force-dynamic";

function jsonWithCookies(baseRes: NextResponse, body: any, init?: { status?: number }) {
  const out = NextResponse.json(body, init);
  baseRes.cookies.getAll().forEach((c) => out.cookies.set(c.name, c.value, c));
  return out;
}

export async function GET(req: NextRequest) {
  const { supabase, res } = supabaseRoute(req);

  const { data, error } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (error || !userId) return jsonWithCookies(res, { ok: false, error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const q = url.searchParams.get("q") || "";
  const roomId = url.searchParams.get("room_id") || null;
  const fromDate = url.searchParams.get("from_date") || null;
  const toDate = url.searchParams.get("to_date") || null;
  const searchUserId = url.searchParams.get("user_id") || null;
  const hasAttachments = url.searchParams.get("has_attachments") || null;
  const fileType = url.searchParams.get("file_type") || null;

  if (!q.trim()) return jsonWithCookies(res, { ok: true, items: [] });

  const myRoomsR = await supabase
    .from("chat_room_members")
    .select("room_id")
    .eq("user_id", userId);

  if (myRoomsR.error) return jsonWithCookies(res, { ok: false, error: myRoomsR.error.message }, { status: 500 });

  const myRoomIds = (myRoomsR.data ?? []).map((r: any) => r.room_id);
  if (myRoomIds.length === 0) return jsonWithCookies(res, { ok: true, items: [] });

  let query = supabase
    .from("chat_messages")
    .select(`
      id,room_id,user_id,body,created_at,
      mentions,reply_to,attachments
    `)
    .in("room_id", myRoomIds)
    .ilike("body", `%${q}%`)
    .order("created_at", { ascending: false })
    .limit(50);

  if (roomId) {
    query = query.eq("room_id", roomId);
  }

  if (fromDate) {
    query = query.gte("created_at", fromDate);
  }

  if (toDate) {
    query = query.lte("created_at", toDate);
  }

  if (searchUserId) {
    query = query.eq("user_id", searchUserId);
  }

  if (hasAttachments === "true") {
    query = query.not("attachments", "is", null);
  } else if (hasAttachments === "false") {
    query = query.is("attachments", null);
  }

  const r = await query;

  if (r.error) return jsonWithCookies(res, { ok: false, error: r.error.message }, { status: 500 });

  let messages = r.data ?? [];

  // Client-side filter for file_type if specified
  if (fileType && fileType !== "all") {
    messages = messages.filter((m: any) => {
      const attachments = m.attachments || [];
      return attachments.some((att: any) => {
        if (fileType === "image") return att.type?.startsWith("image/");
        if (fileType === "video") return att.type?.startsWith("video/");
        if (fileType === "document") return !att.type?.startsWith("image/") && !att.type?.startsWith("video/");
        return false;
      });
    });
  }

  const userIds = [...new Set(messages.map((m: any) => m.user_id))];

  const usersR = await supabase
    .from("workspace_members")
    .select("user_id,display_name,avatar_url")
    .in("user_id", userIds);

  const usersMap = (usersR.data ?? []).reduce((acc: any, u: any) => {
    acc[u.user_id] = { id: u.user_id, display_name: u.display_name, avatar_url: u.avatar_url, email: null };
    return acc;
  }, {});

  const enriched = messages.map((m: any) => ({
    ...m,
    user: usersMap[m.user_id] || null,
  }));

  return jsonWithCookies(res, { ok: true, items: enriched });
}
