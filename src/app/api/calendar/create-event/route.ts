// src/app/api/calendar/create-event/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseRoute";

export const dynamic = "force-dynamic";

interface CreateEventPayload {
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  duration?: number; // 分単位、デフォルト60分
  description?: string;
}

export async function POST(req: NextRequest) {
  const { supabase } = supabaseRoute(req);

  try {
    const body: CreateEventPayload = await req.json();

    if (!body.title || !body.date || !body.time) {
      return NextResponse.json(
        { ok: false, error: { message: "title, date, time are required" } },
        { status: 400 }
      );
    }

    // カレンダー接続情報を取得
    const { data: connection, error: connError } = await supabase
      .from("calendar_connections")
      .select("*")
      .eq("id", "central")
      .single();

    if (connError || !connection) {
      return NextResponse.json(
        { ok: false, error: { message: "Google Calendar not connected" } },
        { status: 401 }
      );
    }

    const accessToken = connection.access_token;

    // 日時をISO形式に変換
    const startDateTime = `${body.date}T${body.time}:00`;
    const duration = body.duration || 60;
    const endDate = new Date(startDateTime);
    endDate.setMinutes(endDate.getMinutes() + duration);

    // Google Calendar API でイベント作成
    const event = {
      summary: body.title,
      description: body.description || "",
      start: {
        dateTime: new Date(startDateTime).toISOString(),
        timeZone: "Asia/Tokyo",
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: "Asia/Tokyo",
      },
    };

    const calendarRes = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      }
    );

    if (!calendarRes.ok) {
      const errorText = await calendarRes.text();
      console.error("Google Calendar API error:", errorText);

      // アクセストークン期限切れの場合はリフレッシュを促す
      if (calendarRes.status === 401) {
        return NextResponse.json(
          { ok: false, error: { message: "Access token expired. Please reconnect." } },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { ok: false, error: { message: `Calendar API error: ${calendarRes.status}` } },
        { status: 500 }
      );
    }

    const createdEvent = await calendarRes.json();

    return NextResponse.json({
      ok: true,
      event: {
        id: createdEvent.id,
        htmlLink: createdEvent.htmlLink,
        summary: createdEvent.summary,
        start: createdEvent.start,
        end: createdEvent.end,
      },
    });
  } catch (err: any) {
    console.error("Create calendar event error:", err);
    return NextResponse.json(
      { ok: false, error: { message: err?.message ?? "Unknown error" } },
      { status: 500 }
    );
  }
}
