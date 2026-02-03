// src/app/api/calendar/auth/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseRoute";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`/calendar?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect("/calendar?error=no_code");
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/calendar/auth/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect("/calendar?error=missing_config");
  }

  try {
    // トークン交換
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const txt = await tokenRes.text();
      console.error("Token exchange failed:", txt);
      return NextResponse.redirect("/calendar?error=token_exchange_failed");
    }

    const tokens = await tokenRes.json();

    // Supabaseに保存
    const { supabase } = supabaseRoute(req);

    // 既存のカレンダー接続を取得
    const { data: existing } = await supabase
      .from("calendar_connections")
      .select("*")
      .eq("id", "central")
      .single();

    const now = new Date().toISOString();

    const payload = {
      id: "central",
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || existing?.refresh_token || null, // refresh_tokenを保持
      token_type: tokens.token_type || "Bearer",
      expires_in: tokens.expires_in || 3600,
      scope: tokens.scope || "",
      created_at: existing?.created_at || now,
      updated_at: now,
    };

    const { error: upsertError } = await supabase
      .from("calendar_connections")
      .upsert(payload, { onConflict: "id" });

    if (upsertError) {
      console.error("Supabase upsert error:", upsertError);
      return NextResponse.redirect("/calendar?error=db_save_failed");
    }

    return NextResponse.redirect("/calendar?success=1");
  } catch (err: any) {
    console.error("Calendar auth callback error:", err);
    return NextResponse.redirect(`/calendar?error=${encodeURIComponent(err.message || "unknown")}`);
  }
}
