import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function mustEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return { url, anon };
}

async function requireAdmin(req: NextRequest) {
  const { url, anon } = mustEnv();

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll() {},
    },
  });

  const { data, error } = await supabase.auth.getUser();
  const user = data?.user;

  if (error || !user) {
    return { ok: false as const, status: 401, error: "unauthorized" };
  }

  const { data: me, error: meErr } = await supabaseAdmin
    .from("workspace_members")
    .select("user_id,role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (meErr || !me) {
    return { ok: false as const, status: 403, error: "forbidden (not a member)" };
  }
  if (me.role !== "admin") {
    return { ok: false as const, status: 403, error: "forbidden (admin only)" };
  }

  return { ok: true as const, callerUserId: user.id };
}

function isUuidLike(v: string) {
  // 厳密でなくてOK。最低限の弾き。
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export async function GET(req: NextRequest) {
  try {
    const gate = await requireAdmin(req);
    if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

    const { data: members, error } = await supabaseAdmin
      .from("workspace_members")
      .select("user_id,role,created_at,display_name,avatar_url")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[admin/members] GET error:", error);
      return NextResponse.json({ ok: false, error: "メンバー一覧の取得に失敗しました" }, { status: 500 });
    }

    // Fetch email addresses from Supabase Auth
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (authError) {
      console.warn("Failed to fetch auth users:", authError);
    }

    // Create a map of user_id -> email
    const emailMap = new Map<string, string>();
    if (authUsers?.users) {
      for (const authUser of authUsers.users) {
        emailMap.set(authUser.id, authUser.email ?? "");
      }
    }

    // Enrich members with email
    const enrichedMembers = (members ?? []).map((m) => ({
      ...m,
      email: emailMap.get(m.user_id) ?? null,
    }));

    return NextResponse.json({ ok: true, members: enrichedMembers });
  } catch (e: any) {
    console.error("[admin/members] GET exception:", e);
    return NextResponse.json({ ok: false, error: "メンバー一覧の取得に失敗しました" }, { status: 500 });
  }
}

// PATCH - メンバー情報更新 (display_name, role)
export async function PATCH(req: NextRequest) {
  try {
    const gate = await requireAdmin(req);
    if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

    const body = await req.json().catch(() => null);
    const userId = String(body?.user_id ?? "").trim();
    const role = body?.role;
    const displayName = body?.display_name;

    if (!userId || !isUuidLike(userId)) {
      return NextResponse.json({ ok: false, error: "invalid user_id" }, { status: 400 });
    }

    const updateData: any = {};
    if (role !== undefined) {
      if (role !== "admin" && role !== "member") {
        return NextResponse.json({ ok: false, error: "role must be admin or member" }, { status: 400 });
      }
      updateData.role = role;
    }
    if (displayName !== undefined) {
      updateData.display_name = String(displayName).trim();
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ ok: false, error: "no fields to update" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("workspace_members")
      .update(updateData)
      .eq("user_id", userId);

    if (error) {
      console.error("[admin/members] PATCH error:", error);
      return NextResponse.json({ ok: false, error: "メンバー情報の更新に失敗しました" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[admin/members] PATCH exception:", e);
    return NextResponse.json({ ok: false, error: "メンバー情報の更新に失敗しました" }, { status: 500 });
  }
}

// フロントが DELETE で叩いてきた場合に対応
export async function DELETE(req: NextRequest) {
  try {
    const gate = await requireAdmin(req);
    if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

    // body { user_id } / query ?user_id= の両対応
    const url = new URL(req.url);
    const q = url.searchParams.get("user_id") ?? "";

    const body = await req.json().catch(() => null);
    const userId = String(body?.user_id ?? q ?? "").trim();

    if (!userId || !isUuidLike(userId)) {
      return NextResponse.json({ ok: false, error: "invalid user_id" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("workspace_members").delete().eq("user_id", userId);

    if (error) {
      console.error("[admin/members] DELETE error:", error);
      return NextResponse.json({ ok: false, error: "メンバーの削除に失敗しました" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[admin/members] DELETE exception:", e);
    return NextResponse.json({ ok: false, error: "メンバーの削除に失敗しました" }, { status: 500 });
  }
}

// フロントが POST で「削除」を投げてきても落ちないようにする（保険）
export async function POST(req: NextRequest) {
  try {
    const gate = await requireAdmin(req);
    if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

    const body = await req.json().catch(() => null);
    const action = String(body?.action ?? "").trim();

    // action 指定が無い場合でも、{ user_id } だけ送ってくる実装があるので許容
    const userId = String(body?.user_id ?? "").trim();

    if ((action && action !== "delete") || !userId) {
      return NextResponse.json({ ok: false, error: "invalid request" }, { status: 400 });
    }
    if (!isUuidLike(userId)) {
      return NextResponse.json({ ok: false, error: "invalid user_id" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("workspace_members").delete().eq("user_id", userId);
    if (error) {
      console.error("[admin/members] POST delete error:", error);
      return NextResponse.json({ ok: false, error: "メンバーの削除に失敗しました" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[admin/members] POST exception:", e);
    return NextResponse.json({ ok: false, error: "メンバーの削除に失敗しました" }, { status: 500 });
  }
}
