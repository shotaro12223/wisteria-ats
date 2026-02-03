import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.json({ ok: false, error: "Missing code" }, { status: 400 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json(
      { ok: false, error: "Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI" },
      { status: 500 }
    );
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }).toString(),
  });

  if (!tokenRes.ok) {
    return NextResponse.json({ ok: false, error: await tokenRes.text() }, { status: 500 });
  }

  const token = (await tokenRes.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
    scope?: string;
  };

  // 既存の refresh_token を保持する（Googleはrefresh_tokenを返さないことがある）
  const existing = await supabaseAdmin
    .from("gmail_connections")
    .select("refresh_token")
    .eq("id", "central")
    .maybeSingle();

  const refreshTokenToSave =
    token.refresh_token ?? existing.data?.refresh_token ?? null;

  await supabaseAdmin.from("gmail_connections").upsert({
    id: "central",
    access_token: token.access_token,
    refresh_token: refreshTokenToSave,
    expires_at: new Date(Date.now() + token.expires_in * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  });

  return NextResponse.redirect(new URL("/work-queue", url.origin));
}
