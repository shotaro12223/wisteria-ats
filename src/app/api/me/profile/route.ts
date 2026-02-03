import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

function makeSupabase(req: NextRequest) {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    "";
  const anon =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "";

  if (!url || !anon) {
    throw new Error("Missing Supabase env (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)");
  }

  // cookie をレスポンスへ確実に反映するため、一旦バッファする
  const cookiesToSet: Array<{ name: string; value: string; options: any }> = [];

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(list) {
        list.forEach(({ name, value, options }) => {
          cookiesToSet.push({ name, value, options });
        });
      },
    },
  });

  function withCookies(res: NextResponse) {
    cookiesToSet.forEach(({ name, value, options }) => {
      res.cookies.set(name, value, options);
    });
    return res;
  }

  return { supabase, withCookies };
}

export async function GET(req: NextRequest) {
  try {
    const { supabase, withCookies } = makeSupabase(req);

    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr) {
      return withCookies(
        NextResponse.json(
          { ok: false, error: { message: `auth.getUser failed: ${authErr.message}` } },
          { status: 401 }
        )
      );
    }
    if (!auth?.user) {
      return withCookies(
        NextResponse.json(
          { ok: false, error: { message: "Unauthorized (no user session)" } },
          { status: 401 }
        )
      );
    }

    // workspace_membersから取得
    const { data, error } = await supabase
      .from("workspace_members")
      .select("*")
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (error) {
      return withCookies(
        NextResponse.json(
          { ok: false, error: { message: `workspace_members select failed: ${error.message}` } },
          { status: 500 }
        )
      );
    }

    return withCookies(
      NextResponse.json(
        {
          ok: true,
          user: { id: auth.user.id, email: auth.user.email ?? null },
          profile: data ?? null,
        },
        { status: 200 }
      )
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: { message: String(e?.message ?? e ?? "me/profile failed") } },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { supabase, withCookies } = makeSupabase(req);

    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr) {
      return withCookies(
        NextResponse.json(
          { ok: false, error: { message: `auth.getUser failed: ${authErr.message}` } },
          { status: 401 }
        )
      );
    }
    if (!auth?.user) {
      return withCookies(
        NextResponse.json(
          { ok: false, error: { message: "Unauthorized (no user session)" } },
          { status: 401 }
        )
      );
    }

    const body = await req.json().catch(() => ({}));
    const { display_name, bio } = body;

    // 更新するフィールドを準備
    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (display_name !== undefined) {
      updates.display_name = display_name;
    }
    if (bio !== undefined) {
      updates.bio = bio;
    }

    const { data, error } = await supabase
      .from("workspace_members")
      .update(updates)
      .eq("user_id", auth.user.id)
      .select("*")
      .maybeSingle();

    if (error) {
      return withCookies(
        NextResponse.json(
          { ok: false, error: { message: `workspace_members update failed: ${error.message}` } },
          { status: 500 }
        )
      );
    }

    return withCookies(
      NextResponse.json(
        {
          ok: true,
          profile: data,
        },
        { status: 200 }
      )
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: { message: String(e?.message ?? e ?? "me/profile PATCH failed") } },
      { status: 500 }
    );
  }
}
