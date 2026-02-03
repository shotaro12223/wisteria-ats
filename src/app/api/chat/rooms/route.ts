import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { supabaseRoute } from "@/lib/supabaseRoute";

export const dynamic = "force-dynamic";

type RoomRow = {
  id: string;
  name: string;
  created_by: string | null;
  created_at: string;
};

function toApiRoom(r: RoomRow) {
  return {
    id: r.id,
    name: r.name,
    createdBy: r.created_by ?? null,
    createdAt: r.created_at,
  };
}

function withSupabaseCookies(src: NextResponse, cookieCarrier: NextResponse) {
  // supabaseRoute が cookieCarrier(res) に set するので、それを src に写す
  cookieCarrier.cookies.getAll().forEach((c) => {
    src.cookies.set(c.name, c.value, c as any);
  });
  return src;
}

/**
 * GET /api/chat/rooms
 * 自分が member の chat_rooms 一覧（RLSにより自動制限）
 */
export async function GET(req: NextRequest) {
  const { supabase, res } = supabaseRoute(req);

  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes?.user) {
    const json = NextResponse.json(
      { ok: false, error: { message: "Unauthorized" } },
      { status: 401 }
    );
    return withSupabaseCookies(json, res);
  }

  const userId = userRes.user.id;

  const myMembersR = await supabase
    .from("chat_room_members")
    .select("room_id")
    .eq("user_id", userId);

  if (myMembersR.error) {
    console.error("[chat/rooms] Members fetch error:", myMembersR.error);
    const json = NextResponse.json(
      { ok: false, error: { message: "チャットルーム一覧の取得に失敗しました" } },
      { status: 500 }
    );
    return withSupabaseCookies(json, res);
  }

  const myRoomIds = (myMembersR.data ?? []).map((m: any) => m.room_id);
  if (myRoomIds.length === 0) {
    const json = NextResponse.json({ ok: true, items: [] }, { status: 200 });
    return withSupabaseCookies(json, res);
  }

  const roomsR = await supabase
    .from("chat_rooms")
    .select("id,type,name,created_at,icon_url,description,background_color")
    .in("id", myRoomIds)
    .order("created_at", { ascending: false });

  if (roomsR.error) {
    console.error("[chat/rooms] Rooms fetch error:", roomsR.error);
    const json = NextResponse.json(
      { ok: false, error: { message: "チャットルーム一覧の取得に失敗しました" } },
      { status: 500 }
    );
    return withSupabaseCookies(json, res);
  }

  const rooms = roomsR.data ?? [];

  const lastMsgR = await supabase
    .from("chat_messages")
    .select("room_id,body,created_at")
    .in("room_id", myRoomIds)
    .order("created_at", { ascending: false })
    .limit(100);

  const lastMsgMap: any = {};
  (lastMsgR.data ?? []).forEach((m: any) => {
    if (!lastMsgMap[m.room_id]) {
      lastMsgMap[m.room_id] = m;
    }
  });

  const membersR = await supabase
    .from("chat_room_members")
    .select("room_id,user_id,last_read_at,muted,muted_until,pinned,role")
    .eq("user_id", userId)
    .in("room_id", myRoomIds);

  console.log(`🔖 [API] chat_room_members query result:`, {
    error: membersR.error,
    dataLength: membersR.data?.length,
    sampleData: membersR.data?.slice(0, 2)
  });

  const readMap: any = {};
  const muteMap: any = {};
  const pinnedMap: any = {};
  const roleMap: any = {};
  (membersR.data ?? []).forEach((m: any) => {
    readMap[m.room_id] = m.last_read_at;
    muteMap[m.room_id] = { muted: m.muted, muted_until: m.muted_until };
    pinnedMap[m.room_id] = m.pinned || false;
    roleMap[m.room_id] = m.role || 'member';

    // Debug log for ALL members to see pinned values
    console.log(`🔖 [API] Member data:`, {
      room_id: m.room_id,
      user_id: m.user_id,
      pinned: m.pinned,
      pinned_type: typeof m.pinned,
      has_pinned_key: 'pinned' in m
    });
  });

  // Batch fetch all unread messages at once
  const allUnreadR = await supabase
    .from("chat_messages")
    .select("id,room_id,created_at")
    .in("room_id", myRoomIds)
    .neq("user_id", userId);

  const unreadMap: Record<string, number> = {};
  (allUnreadR.data ?? []).forEach((msg: any) => {
    const lastReadAt = readMap[msg.room_id];
    if (!lastReadAt || msg.created_at > lastReadAt) {
      unreadMap[msg.room_id] = (unreadMap[msg.room_id] || 0) + 1;
    }
  });

  // Batch fetch all room members for direct chats
  const allMembersR = await supabase
    .from("chat_room_members")
    .select("room_id,user_id")
    .in("room_id", myRoomIds);

  const roomMembersMap: Record<string, string[]> = {};
  (allMembersR.data ?? []).forEach((m: any) => {
    if (!roomMembersMap[m.room_id]) {
      roomMembersMap[m.room_id] = [];
    }
    roomMembersMap[m.room_id].push(m.user_id);
  });

  // Get all other users from direct chats
  const otherUserIds = new Set<string>();
  rooms.forEach((r: any) => {
    if (r.type === "direct" && !r.name) {
      const members = roomMembersMap[r.id] || [];
      const otherUserId = members.find((id) => id !== userId);
      if (otherUserId) {
        otherUserIds.add(otherUserId);
      }
    }
  });

  // Batch fetch all workspace member names
  const userNamesMap: Record<string, string> = {};
  if (otherUserIds.size > 0) {
    const workspaceR = await supabase
      .from("workspace_members")
      .select("user_id,display_name")
      .in("user_id", Array.from(otherUserIds));

    (workspaceR.data ?? []).forEach((u: any) => {
      userNamesMap[u.user_id] = u.display_name || "Unknown";
    });
  }

  // Build items without additional queries
  const items = rooms.map((r: any) => {
    const lastMsg = lastMsgMap[r.id];
    const unreadCount = unreadMap[r.id] || 0;
    const muteInfo = muteMap[r.id] || { muted: false, muted_until: null };

    let roomName = r.name;
    if (r.type === "direct" && !roomName) {
      const members = roomMembersMap[r.id] || [];
      const otherUserId = members.find((id) => id !== userId);
      if (otherUserId) {
        roomName = userNamesMap[otherUserId] || "Unknown";
      }
    }

    return {
      id: r.id,
      type: r.type,
      name: roomName,
      icon_url: r.icon_url || null,
      description: r.description || null,
      background_color: r.background_color || null,
      last_message_at: lastMsg?.created_at || null,
      last_message_preview: lastMsg?.body?.slice(0, 50) || null,
      unread_count: unreadCount,
      muted: muteInfo.muted || false,
      muted_until: muteInfo.muted_until || null,
      pinned: pinnedMap[r.id] || false,
      my_role: roleMap[r.id] || 'member',
    };
  });

  const json = NextResponse.json({ ok: true, items }, { status: 200 });
  return withSupabaseCookies(json, res);
}

/**
 * POST /api/chat/rooms
 * body: { name: string }
 * - chat_rooms 作成
 * - chat_room_members に自分を追加
 */
export async function POST(req: NextRequest) {
  const { supabase, res } = supabaseRoute(req);

  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes?.user) {
    const json = NextResponse.json(
      { ok: false, error: { message: "Unauthorized" } },
      { status: 401 }
    );
    return withSupabaseCookies(json, res);
  }

  try {
    const user = userRes.user;
    const body = (await req.json()) as any;
    const type = body?.type ?? "group";
    const name = String(body?.name ?? "").trim();
    const otherUserId = body?.otherUserId;
    const memberUserIds = body?.memberUserIds ?? [];

    if (type === "direct") {
      if (!otherUserId) {
        const json = NextResponse.json(
          { ok: false, error: { message: "otherUserId is required for direct chat" } },
          { status: 400 }
        );
        return withSupabaseCookies(json, res);
      }

      const existingR = await supabase
        .from("chat_rooms")
        .select("id,type,name")
        .eq("type", "direct");

      const existing = existingR.data ?? [];
      for (const room of existing) {
        const membersR = await supabase
          .from("chat_room_members")
          .select("user_id")
          .eq("room_id", room.id);
        const members = (membersR.data ?? []).map((m: any) => m.user_id);
        if (members.length === 2 && members.includes(user.id) && members.includes(otherUserId)) {
          const json = NextResponse.json({ ok: true, item: room }, { status: 200 });
          return withSupabaseCookies(json, res);
        }
      }

      const roomId = randomUUID();
      const { data: room, error: roomErr } = await supabase
        .from("chat_rooms")
        .insert({
          id: roomId,
          type: "direct",
          name: null,
          created_by: user.id,
        })
        .select("id,type,name,created_at")
        .single();

      if (roomErr) {
        console.error("[chat/rooms] Room creation error:", roomErr);
        const json = NextResponse.json({ ok: false, error: { message: "チャットルームの作成に失敗しました" } }, { status: 500 });
        return withSupabaseCookies(json, res);
      }

      const { error: m1Err } = await supabase.from("chat_room_members").insert({ room_id: roomId, user_id: user.id });
      const { error: m2Err } = await supabase.from("chat_room_members").insert({ room_id: roomId, user_id: otherUserId });

      if (m1Err || m2Err) {
        console.error("[chat/rooms] Member addition error:", m1Err || m2Err);
        const json = NextResponse.json({ ok: false, error: { message: "チャットルームの作成に失敗しました" } }, { status: 500 });
        return withSupabaseCookies(json, res);
      }

      const json = NextResponse.json({ ok: true, item: room }, { status: 201 });
      return withSupabaseCookies(json, res);
    }

    if (!name) {
      const json = NextResponse.json(
        { ok: false, error: { message: "name is required for group chat" } },
        { status: 400 }
      );
      return withSupabaseCookies(json, res);
    }

    const roomId = randomUUID();
    const { data: room, error: roomErr } = await supabase
      .from("chat_rooms")
      .insert({
        id: roomId,
        type: "group",
        name,
        created_by: user.id,
      })
      .select("id,type,name,created_at")
      .single();

    if (roomErr) {
      const json = NextResponse.json({ ok: false, error: { message: roomErr.message } }, { status: 500 });
      return withSupabaseCookies(json, res);
    }

    // ✅ 重複を除外（自分自身が memberUserIds に含まれている可能性があるため）
    const uniqueMemberIds = Array.from(new Set([user.id, ...memberUserIds]));
    // グループ作成者は admin、他のメンバーは member
    const memberInserts = uniqueMemberIds.map((uid: string) => ({
      room_id: roomId,
      user_id: uid,
      role: uid === user.id ? 'admin' : 'member'
    }));
    const { error: memberErr } = await supabase.from("chat_room_members").insert(memberInserts);

    if (memberErr) {
      console.error("[chat/rooms] Member insert error:", memberErr);
      const json = NextResponse.json({ ok: false, error: { message: "チャットルームの作成に失敗しました" } }, { status: 500 });
      return withSupabaseCookies(json, res);
    }

    const json = NextResponse.json({ ok: true, item: room }, { status: 201 });
    return withSupabaseCookies(json, res);
  } catch (e: any) {
    console.error("[chat/rooms] POST error:", e);
    const json = NextResponse.json(
      { ok: false, error: { message: "チャットルームの作成に失敗しました" } },
      { status: 400 }
    );
    return withSupabaseCookies(json, res);
  }
}
