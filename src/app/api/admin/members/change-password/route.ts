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
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

// POST /api/admin/members/change-password - パスワード変更
export async function POST(req: NextRequest) {
  try {
    const gate = await requireAdmin(req);
    if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

    const body = await req.json().catch(() => null);
    const userId = String(body?.user_id ?? "").trim();
    const newPassword = String(body?.new_password ?? "").trim();

    if (!userId || !isUuidLike(userId)) {
      return NextResponse.json({ ok: false, error: "invalid user_id" }, { status: 400 });
    }

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ ok: false, error: "new_password must be at least 6 characters" }, { status: 400 });
    }

    // Use Supabase Admin API to update user password
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "server error" }, { status: 500 });
  }
}
