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

// PATCH: Update room settings
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
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

  const updates: any = {};

  if (body.icon_url !== undefined) {
    updates.icon_url = body.icon_url ? String(body.icon_url).trim() : null;
  }

  if (body.description !== undefined) {
    updates.description = body.description ? String(body.description).trim() : null;
  }

  if (body.background_color !== undefined) {
    const color = String(body.background_color).trim();
    // Basic validation for hex color
    if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return jsonWithCookies(res, { ok: false, error: "invalid background_color format (use #RRGGBB)" }, { status: 400 });
    }
    updates.background_color = color || "#ffffff";
  }

  if (Object.keys(updates).length === 0) {
    return jsonWithCookies(res, { ok: false, error: "no fields to update" }, { status: 400 });
  }

  const update = await supabase
    .from("chat_rooms")
    .update(updates)
    .eq("id", roomId)
    .select(`
      id,
      type,
      name,
      icon_url,
      description,
      background_color
    `)
    .single();

  if (update.error) return jsonWithCookies(res, { ok: false, error: update.error.message }, { status: 500 });

  return jsonWithCookies(res, { ok: true, item: update.data });
}
