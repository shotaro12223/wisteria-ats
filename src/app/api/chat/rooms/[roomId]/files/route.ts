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

// GET: List files in room
export async function GET(req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  const { supabase, res } = supabaseRoute(req);

  const { data, error } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (error || !userId) return jsonWithCookies(res, { ok: false, error: "unauthorized" }, { status: 401 });

  const { roomId } = await params;

  const memberCheck = await requireRoomMember(supabase, roomId, userId);
  if (!memberCheck.ok) return jsonWithCookies(res, { ok: false, error: memberCheck.message }, { status: memberCheck.status });

  const url = new URL(req.url);
  const offset = parseInt(url.searchParams.get("offset") || "0", 10);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 100);
  const type = url.searchParams.get("type") || "all"; // all, image, video, document

  // Get messages with attachments
  const r = await supabase
    .from("chat_messages")
    .select(`
      id,
      user_id,
      body,
      created_at,
      attachments
    `)
    .eq("room_id", roomId)
    .not("attachments", "is", null)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (r.error) return jsonWithCookies(res, { ok: false, error: r.error.message }, { status: 500 });

  const messages = r.data ?? [];

  // Extract and flatten attachments
  const files: any[] = [];
  messages.forEach((m: any) => {
    const attachments = m.attachments || [];
    attachments.forEach((att: any) => {
      // Filter by type if specified
      if (type !== "all") {
        if (type === "image" && !att.type?.startsWith("image/")) return;
        if (type === "video" && !att.type?.startsWith("video/")) return;
        if (type === "document" && (att.type?.startsWith("image/") || att.type?.startsWith("video/"))) return;
      }

      files.push({
        message_id: m.id,
        user_id: m.user_id,
        created_at: m.created_at,
        name: att.name,
        url: att.url,
        type: att.type,
        size: att.size,
      });
    });
  });

  // Get user info
  const userIds = [...new Set(files.map((f) => f.user_id))];
  const usersR = await supabase.from("workspace_members").select("user_id,display_name").in("user_id", userIds);

  const usersMap = (usersR.data ?? []).reduce((acc: any, u: any) => {
    acc[u.user_id] = { id: u.user_id, display_name: u.display_name };
    return acc;
  }, {});

  const missingUserIds = userIds.filter((id) => !usersMap[id]);
  if (missingUserIds.length > 0) {
    const authUsersR = await supabase.auth.admin.listUsers();
    if (authUsersR.data?.users) {
      authUsersR.data.users.forEach((u: any) => {
        if (missingUserIds.includes(u.id)) {
          usersMap[u.id] = { id: u.id, display_name: u.email?.split("@")[0] };
        }
      });
    }
  }

  const enriched = files.map((f) => ({
    ...f,
    user: usersMap[f.user_id] || null,
  }));

  return jsonWithCookies(res, { ok: true, items: enriched, offset, limit });
}
