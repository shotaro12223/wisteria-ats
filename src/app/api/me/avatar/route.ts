import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

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

export async function POST(req: NextRequest) {
  try {
    const { supabase, withCookies } = makeSupabase(req);

    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth?.user) {
      return withCookies(
        NextResponse.json(
          { ok: false, error: { message: "Unauthorized" } },
          { status: 401 }
        )
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return withCookies(
        NextResponse.json(
          { ok: false, error: { message: "No file provided" } },
          { status: 400 }
        )
      );
    }

    // ファイルサイズチェック（5MB制限）
    if (file.size > 5 * 1024 * 1024) {
      return withCookies(
        NextResponse.json(
          { ok: false, error: { message: "File size must be less than 5MB" } },
          { status: 400 }
        )
      );
    }

    // ファイルタイプチェック
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return withCookies(
        NextResponse.json(
          { ok: false, error: { message: "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed" } },
          { status: 400 }
        )
      );
    }

    const userId = auth.user.id;
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    // 既存のアバター削除（オプション）
    const { data: existingProfile } = await supabase
      .from("workspace_members")
      .select("avatar_url")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingProfile?.avatar_url) {
      // 既存のアバターをStorageから削除
      try {
        const urlParts = existingProfile.avatar_url.split("/avatars/");
        if (urlParts.length > 1) {
          const oldPath = urlParts[1];
          await supabase.storage.from("avatars").remove([oldPath]);
        }
      } catch (e) {
        console.error("Failed to delete old avatar:", e);
      }
    }

    // Supabase Storageにアップロード
    const arrayBuffer = await file.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, arrayBuffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      return withCookies(
        NextResponse.json(
          { ok: false, error: { message: `Upload failed: ${uploadError.message}` } },
          { status: 500 }
        )
      );
    }

    // 公開URLを取得
    const { data: publicUrlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    const avatarUrl = publicUrlData.publicUrl;

    // workspace_membersを更新
    const { data: updatedProfile, error: updateError } = await supabase
      .from("workspace_members")
      .update({
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .select("*")
      .maybeSingle();

    if (updateError) {
      return withCookies(
        NextResponse.json(
          { ok: false, error: { message: `Profile update failed: ${updateError.message}` } },
          { status: 500 }
        )
      );
    }

    return withCookies(
      NextResponse.json(
        {
          ok: true,
          avatar_url: avatarUrl,
          profile: updatedProfile,
        },
        { status: 200 }
      )
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: { message: String(e?.message ?? e ?? "avatar upload failed") } },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { supabase, withCookies } = makeSupabase(req);

    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth?.user) {
      return withCookies(
        NextResponse.json(
          { ok: false, error: { message: "Unauthorized" } },
          { status: 401 }
        )
      );
    }

    const userId = auth.user.id;

    // 既存のアバター削除
    const { data: existingProfile } = await supabase
      .from("workspace_members")
      .select("avatar_url")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingProfile?.avatar_url) {
      try {
        const urlParts = existingProfile.avatar_url.split("/avatars/");
        if (urlParts.length > 1) {
          const oldPath = urlParts[1];
          await supabase.storage.from("avatars").remove([oldPath]);
        }
      } catch (e) {
        console.error("Failed to delete old avatar:", e);
      }
    }

    // workspace_membersを更新（avatar_urlをnullに）
    const { data: updatedProfile, error: updateError } = await supabase
      .from("workspace_members")
      .update({
        avatar_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .select("*")
      .maybeSingle();

    if (updateError) {
      return withCookies(
        NextResponse.json(
          { ok: false, error: { message: `Profile update failed: ${updateError.message}` } },
          { status: 500 }
        )
      );
    }

    return withCookies(
      NextResponse.json(
        {
          ok: true,
          profile: updatedProfile,
        },
        { status: 200 }
      )
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: { message: String(e?.message ?? e ?? "avatar delete failed") } },
      { status: 500 }
    );
  }
}
