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
    .select("room_id,role")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .maybeSingle();

  if (r.error) return { ok: false as const, status: 500, message: r.error.message };
  if (!r.data) return { ok: false as const, status: 403, message: "forbidden" };
  return { ok: true as const, role: r.data.role || 'member' };
}

// DELETE: Delete room (or remove from personal history)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  const { supabase, res } = supabaseRoute(req);

  const { data, error } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (error || !userId) return jsonWithCookies(res, { ok: false, error: "unauthorized" }, { status: 401 });

  const { roomId } = await params;

  console.log("DELETE room API called:", { roomId, userId });

  const memberCheck = await requireRoomMember(supabase, roomId, userId);
  if (!memberCheck.ok) {
    console.log("Member check failed:", memberCheck);
    return jsonWithCookies(res, { ok: false, error: memberCheck.message }, { status: memberCheck.status });
  }

  // Get room info
  const roomR = await supabase
    .from("chat_rooms")
    .select("id,type")
    .eq("id", roomId)
    .maybeSingle();

  console.log("Room query result:", roomR);

  if (roomR.error) {
    console.error("Room query error:", roomR.error);
    return jsonWithCookies(res, { ok: false, error: roomR.error.message }, { status: 500 });
  }
  if (!roomR.data) {
    console.error("Room not found");
    return jsonWithCookies(res, { ok: false, error: "room not found" }, { status: 404 });
  }

  const room = roomR.data;
  console.log("Room data:", room, "Current user:", userId);

  // For direct messages: just remove the user from the room (soft delete from their side)
  if (room.type === "direct") {
    console.log("Deleting direct message room membership");
    const delMember = await supabase
      .from("chat_room_members")
      .delete()
      .eq("room_id", roomId)
      .eq("user_id", userId);

    if (delMember.error) {
      console.error("Delete member error:", delMember.error);
      return jsonWithCookies(res, { ok: false, error: delMember.error.message }, { status: 500 });
    }

    // Check if all members left
    const remainingR = await supabase
      .from("chat_room_members")
      .select("user_id", { count: "exact", head: true })
      .eq("room_id", roomId);

    console.log("Remaining members:", remainingR.count);

    if (remainingR.count === 0) {
      // Delete the room if no members left
      console.log("No members left, deleting room");
      await supabase.from("chat_rooms").delete().eq("id", roomId);
    }

    return jsonWithCookies(res, { ok: true, type: "direct" });
  }

  // For groups: only admins can delete the room
  console.log("Deleting group room");

  // Check if user is admin
  if (memberCheck.role !== 'admin') {
    return jsonWithCookies(res, { ok: false, error: "アドミンのみがグループを削除できます" }, { status: 403 });
  }

  const delR = await supabase
    .from("chat_rooms")
    .delete()
    .eq("id", roomId);

  if (delR.error) {
    console.error("Delete room error:", delR.error);
    return jsonWithCookies(res, { ok: false, error: delR.error.message }, { status: 500 });
  }

  console.log("Room deleted successfully");
  return jsonWithCookies(res, { ok: true, type: "group" });
}
