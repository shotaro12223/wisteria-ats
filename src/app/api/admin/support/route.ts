import { NextResponse, NextRequest } from "next/server";
import { supabaseRoute } from "@/lib/supabaseRoute";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// GET: 全会社のサポートメッセージを取得（管理者用）
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

  // Verify admin
  const { data: member } = await supabaseAdmin
    .from("workspace_members")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member || member.role !== "admin") {
    return NextResponse.json(
      { ok: false, error: { message: "Access denied. Admin only." } },
      { status: 403 }
    );
  }

  // Get optional company filter
  const url = new URL(req.url);
  const companyId = url.searchParams.get("companyId");

  // Fetch messages with company info
  let query = supabaseAdmin
    .from("client_support_messages")
    .select(`
      *,
      companies:company_id (
        id,
        company_name
      )
    `)
    .order("created_at", { ascending: true });

  if (companyId) {
    query = query.eq("company_id", companyId);
  }

  const { data: messages, error: messagesError } = await query;

  if (messagesError) {
    return NextResponse.json(
      { ok: false, error: { message: messagesError.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, data: messages ?? [] });
}

// POST: 管理者がクライアントに返信
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

  // Verify admin
  const { data: member } = await supabaseAdmin
    .from("workspace_members")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member || member.role !== "admin") {
    return NextResponse.json(
      { ok: false, error: { message: "Access denied. Admin only." } },
      { status: 403 }
    );
  }

  let body: { companyId?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  const { companyId, message } = body;

  if (!companyId || !message || message.trim() === "") {
    return NextResponse.json(
      { ok: false, error: { message: "companyId and message are required" } },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const { data: newMessage, error: insertError } = await supabaseAdmin
    .from("client_support_messages")
    .insert({
      company_id: companyId,
      user_id: user.id,
      user_name: user.email || "Wisteria サポート",
      message: message.trim(),
      is_from_client: false,
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

// PATCH: クライアントからの未読メッセージを既読にする
export async function PATCH(req: NextRequest) {
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

  // Verify admin
  const { data: member } = await supabaseAdmin
    .from("workspace_members")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member || member.role !== "admin") {
    return NextResponse.json(
      { ok: false, error: { message: "Access denied. Admin only." } },
      { status: 403 }
    );
  }

  let body: { companyId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  const { companyId } = body;
  if (!companyId) {
    return NextResponse.json(
      { ok: false, error: { message: "companyId is required" } },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const { error: updateError } = await supabaseAdmin
    .from("client_support_messages")
    .update({ read_at: now })
    .eq("company_id", companyId)
    .eq("is_from_client", true)
    .is("read_at", null);

  if (updateError) {
    return NextResponse.json(
      { ok: false, error: { message: updateError.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
