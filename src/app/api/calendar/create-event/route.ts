// src/app/api/calendar/create-event/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { supabaseRoute } from "@/lib/supabaseRoute";

export const dynamic = "force-dynamic";

interface CreateEventPayload {
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  duration?: number; // 分単位、デフォルト60分
  description?: string;
  dealId?: string;
  companyId?: string;
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

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { ok: false, error: { message: "認証が必要です。ログインしてください。" } },
        { status: 401 }
      );
    }

    // calendar_events テーブルに INSERT
    const { data: event, error: insertError } = await supabaseAdmin
      .from("calendar_events")
      .insert({
        title: body.title,
        date: body.date,
        time: body.time,
        duration: body.duration || 60,
        description: body.description || "",
        deal_id: body.dealId || null,
        company_id: body.companyId || null,
        created_by: user.id,
        created_at: new Date().toISOString(),
      })
      .select("id, title, date, time")
      .single();

    if (insertError) {
      console.error("calendar_events insert error:", insertError);
      return NextResponse.json(
        { ok: false, error: { message: `イベント作成に失敗しました: ${insertError.message}` } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      event: {
        id: event.id,
        title: event.title,
        date: event.date,
        time: event.time,
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
