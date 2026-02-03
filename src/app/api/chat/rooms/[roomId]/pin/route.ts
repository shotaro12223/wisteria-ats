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

// PUT: Toggle pin status for this room for current user
export async function PUT(req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
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
    return jsonWithCookies(res, { ok: false, error: "invalid json" }, { status: 400 });
  }

  const pinned = Boolean(body?.pinned);

  console.log(`🔖 [API] Updating pin status:`, {
    room_id: roomId,
    user_id: userId,
    pinned: pinned
  });

  const update = await supabase
    .from("chat_room_members")
    .update({ pinned })
    .eq("room_id", roomId)
    .eq("user_id", userId);

  if (update.error) {
    console.error(`🔖 [API] Pin update failed:`, update.error);
    return jsonWithCookies(res, { ok: false, error: update.error.message }, { status: 500 });
  }

  console.log(`🔖 [API] Pin updated successfully. Room ${roomId} is now ${pinned ? 'pinned' : 'unpinned'}`);

  return jsonWithCookies(res, { ok: true, pinned });
}
