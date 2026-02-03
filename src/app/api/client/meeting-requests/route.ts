import { NextResponse, NextRequest } from "next/server";
import { supabaseRoute } from "@/lib/supabaseRoute";

export const dynamic = "force-dynamic";

// GET: クライアントの打ち合わせ依頼一覧を取得
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

  // Fetch meeting requests for this company
  const { data: requests, error: requestsError } = await supabase
    .from("meeting_requests")
    .select("*")
    .eq("company_id", clientUser.company_id)
    .order("created_at", { ascending: false });

  if (requestsError) {
    return NextResponse.json(
      { ok: false, error: { message: requestsError.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, data: requests ?? [] });
}

// POST: 打ち合わせ依頼を作成
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

  // Parse request body
  let body: { subject?: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  const { subject, note } = body;

  if (!subject || subject.trim() === "") {
    return NextResponse.json(
      { ok: false, error: { message: "Subject is required" } },
      { status: 400 }
    );
  }

  // Create meeting request
  const now = new Date().toISOString();
  const { data: newRequest, error: insertError } = await supabase
    .from("meeting_requests")
    .insert({
      company_id: clientUser.company_id,
      client_user_id: clientUser.id,
      subject: subject.trim(),
      note: note?.trim() || null,
      status: "pending",
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json(
      { ok: false, error: { message: insertError.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, data: newRequest }, { status: 201 });
}
