import { NextResponse, NextRequest } from "next/server";
import { supabaseRoute } from "@/lib/supabaseRoute";

export const dynamic = "force-dynamic";

// GET: クライアントのサポートメッセージ一覧を取得
export async function GET(req: NextRequest) {
  const { supabase } = supabaseRoute(req);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { ok: false, error: { message: "Unauthorized" } },
      { status: 401 }
    );
  }

  // Get client user info
  const { data: clientUser, error: clientUserError } = await supabase
    .from("client_users")
    .select("id, company_id, is_active")
    .eq("user_id", user.id)
    .single();

  if (clientUserError || !clientUser) {
    return NextResponse.json(
      { ok: false, error: { message: "Client user not found" } },
      { status: 403 }
    );
  }

  if (!clientUser.is_active) {
    return NextResponse.json(
      { ok: false, error: { message: "Account is inactive" } },
      { status: 403 }
    );
  }

  const { data: messages, error: messagesError } = await supabase
    .from("client_support_messages")
    .select("*")
    .eq("company_id", clientUser.company_id)
    .order("created_at", { ascending: true });

  if (messagesError) {
    return NextResponse.json(
      { ok: false, error: { message: messagesError.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, data: messages ?? [] });
}

// POST: サポートメッセージを送信
export async function POST(req: NextRequest) {
  const { supabase } = supabaseRoute(req);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { ok: false, error: { message: "Unauthorized" } },
      { status: 401 }
    );
  }

  // Get client user info
  const { data: clientUser, error: clientUserError } = await supabase
    .from("client_users")
    .select("id, company_id, display_name, is_active")
    .eq("user_id", user.id)
    .single();

  if (clientUserError || !clientUser) {
    return NextResponse.json(
      { ok: false, error: { message: "Client user not found" } },
      { status: 403 }
    );
  }

  if (!clientUser.is_active) {
    return NextResponse.json(
      { ok: false, error: { message: "Account is inactive" } },
      { status: 403 }
    );
  }

  let body: { subject?: string; category?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  const { message } = body;

  if (!message || message.trim() === "") {
    return NextResponse.json(
      { ok: false, error: { message: "Message is required" } },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const { data: newMessage, error: insertError } = await supabase
    .from("client_support_messages")
    .insert({
      company_id: clientUser.company_id,
      user_id: user.id,
      user_name: clientUser.display_name || user.email || null,
      message: message.trim(),
      is_from_client: true,
      created_at: now,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json(
      { ok: false, error: { message: insertError.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, data: newMessage }, { status: 201 });
}
