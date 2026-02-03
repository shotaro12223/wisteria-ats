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
    .select("room_id,role")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .maybeSingle();

  if (r.error) return { ok: false as const, status: 500, message: r.error.message };
  if (!r.data) return { ok: false as const, status: 403, message: "forbidden" };
  return { ok: true as const, role: r.data.role };
}

// GET: Get all members of a room
export async function GET(req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  const { supabase, res } = supabaseRoute(req);

  const { data, error } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (error || !userId) return jsonWithCookies(res, { ok: false, error: "unauthorized" }, { status: 401 });

  const { roomId } = await params;

  const memberCheck = await requireRoomMember(supabase, roomId, userId);
  if (!memberCheck.ok) return jsonWithCookies(res, { ok: false, error: memberCheck.message }, { status: memberCheck.status });

  // Get all members with their workspace info
  const membersR = await supabase
    .from("chat_room_members")
    .select("user_id,role,joined_at")
    .eq("room_id", roomId)
    .order("role", { ascending: false }) // admin first
    .order("joined_at", { ascending: true });

  if (membersR.error) {
    return jsonWithCookies(res, { ok: false, error: membersR.error.message }, { status: 500 });
  }

  const members = membersR.data || [];
  const userIds = members.map((m: any) => m.user_id);

  // Fetch workspace member info
  const workspaceR = await supabase
    .from("workspace_members")
    .select("user_id,display_name,avatar_url")
    .in("user_id", userIds);

  const userInfoMap: Record<string, any> = {};
  (workspaceR.data || []).forEach((u: any) => {
    userInfoMap[u.user_id] = {
      display_name: u.display_name || "Unknown",
      avatar_url: u.avatar_url || null,
    };
  });

  // Build member list with user info
  const items = members.map((m: any) => {
    const userInfo = userInfoMap[m.user_id] || { display_name: "Unknown", avatar_url: null };
    return {
      user_id: m.user_id,
      display_name: userInfo.display_name,
      avatar_url: userInfo.avatar_url,
      role: m.role,
      joined_at: m.joined_at,
    };
  });

  return jsonWithCookies(res, { ok: true, items, my_role: memberCheck.role });
}

// PATCH: Update member role (admin only)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  console.log("👥 [API] PATCH /api/chat/rooms/[roomId]/members called");

  const { supabase, res } = supabaseRoute(req);

  const { data, error } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (error || !userId) {
    console.log("👥 [API] PATCH: Unauthorized");
    return jsonWithCookies(res, { ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { roomId } = await params;
  console.log("👥 [API] PATCH: roomId =", roomId, "userId =", userId);

  const memberCheck = await requireRoomMember(supabase, roomId, userId);
  if (!memberCheck.ok) return jsonWithCookies(res, { ok: false, error: memberCheck.message }, { status: memberCheck.status });

  // Only admins can change roles
  if (memberCheck.role !== 'admin') {
    return jsonWithCookies(res, { ok: false, error: "アドミンのみが役職を変更できます" }, { status: 403 });
  }

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return jsonWithCookies(res, { ok: false, error: "invalid json" }, { status: 400 });
  }

  const { target_user_id, role } = body;

  console.log("👥 [API] PATCH: Request body =", { target_user_id, role });

  if (!target_user_id || !role) {
    console.log("👥 [API] PATCH: Missing target_user_id or role");
    return jsonWithCookies(res, { ok: false, error: "target_user_id and role are required" }, { status: 400 });
  }

  if (role !== 'admin' && role !== 'member') {
    console.log("👥 [API] PATCH: Invalid role");
    return jsonWithCookies(res, { ok: false, error: "role must be 'admin' or 'member'" }, { status: 400 });
  }

  // Prevent demoting yourself if you're the last admin
  if (target_user_id === userId && role === 'member') {
    const adminsR = await supabase
      .from("chat_room_members")
      .select("user_id")
      .eq("room_id", roomId)
      .eq("role", "admin");

    const admins = adminsR.data || [];
    if (admins.length <= 1) {
      return jsonWithCookies(res, { ok: false, error: "最後のアドミンは降格できません" }, { status: 400 });
    }
  }

  console.log("👥 [API] PATCH: Updating role in database...");

  // Use supabaseAdmin to bypass RLS
  const update = await supabaseAdmin
    .from("chat_room_members")
    .update({ role })
    .eq("room_id", roomId)
    .eq("user_id", target_user_id);

  console.log("👥 [API] PATCH: Update result =", update);

  if (update.error) {
    console.error("👥 [API] PATCH: Update error =", update.error);
    return jsonWithCookies(res, { ok: false, error: update.error.message }, { status: 500 });
  }

  console.log("👥 [API] PATCH: Success! Role updated.");

  return jsonWithCookies(res, { ok: true, message: "役職を更新しました" });
}

// DELETE: Remove member from room (admin only)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  console.log("👥 [API] DELETE /api/chat/rooms/[roomId]/members called");

  const { supabase, res } = supabaseRoute(req);

  const { data, error } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (error || !userId) {
    console.log("👥 [API] DELETE: Unauthorized");
    return jsonWithCookies(res, { ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { roomId } = await params;
  console.log("👥 [API] DELETE: roomId =", roomId, "userId =", userId);

  const memberCheck = await requireRoomMember(supabase, roomId, userId);
  if (!memberCheck.ok) return jsonWithCookies(res, { ok: false, error: memberCheck.message }, { status: memberCheck.status });

  // Only admins can remove members
  if (memberCheck.role !== 'admin') {
    return jsonWithCookies(res, { ok: false, error: "アドミンのみがメンバーを退会させられます" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const targetUserId = searchParams.get("user_id");

  console.log("👥 [API] DELETE: target_user_id =", targetUserId);

  if (!targetUserId) {
    console.log("👥 [API] DELETE: Missing user_id");
    return jsonWithCookies(res, { ok: false, error: "user_id is required" }, { status: 400 });
  }

  // Can't remove yourself using this endpoint (use leave instead)
  if (targetUserId === userId) {
    console.log("👥 [API] DELETE: Cannot remove yourself");
    return jsonWithCookies(res, { ok: false, error: "自分自身を退会させることはできません。退会機能を使用してください" }, { status: 400 });
  }

  console.log("👥 [API] DELETE: Deleting member from database...");

  // Use supabaseAdmin to bypass RLS
  const deleteR = await supabaseAdmin
    .from("chat_room_members")
    .delete()
    .eq("room_id", roomId)
    .eq("user_id", targetUserId);

  console.log("👥 [API] DELETE: Delete result =", deleteR);

  if (deleteR.error) {
    console.error("👥 [API] DELETE: Delete error =", deleteR.error);
    return jsonWithCookies(res, { ok: false, error: deleteR.error.message }, { status: 500 });
  }

  console.log("👥 [API] DELETE: Success! Member removed.");

  return jsonWithCookies(res, { ok: true, message: "メンバーを退会させました" });
}
