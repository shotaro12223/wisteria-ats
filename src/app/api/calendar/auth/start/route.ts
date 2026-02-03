// src/app/api/calendar/auth/start/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/calendar/auth/callback`;

  if (!clientId) {
    return NextResponse.json(
      { ok: false, error: { message: "GOOGLE_CLIENT_ID not configured" } },
      { status: 500 }
    );
  }

  // Google Calendar API スコープ
  const scope = [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/calendar.events",
  ].join(" ");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scope,
    access_type: "offline",
    prompt: "consent",
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  return NextResponse.redirect(authUrl);
}
