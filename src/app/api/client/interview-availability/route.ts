import { NextResponse, NextRequest } from "next/server";
import { supabaseRoute } from "@/lib/supabaseRoute";

export const dynamic = "force-dynamic";

type InterviewAvailability = {
  id: string;
  company_id: string;
  client_user_id: string;
  available_date: string;
  start_time: string;
  end_time: string;
  note: string | null;
  is_booked: boolean;
  booked_applicant_id: string | null;
  created_at: string;
  updated_at: string;
};

// GET: Get all availability for the client's company
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

  // Get client user
  const { data: clientUser, error: clientUserError } = await supabase
    .from("client_users")
    .select("id, company_id, is_active")
    .eq("user_id", user.id)
    .single();

  if (clientUserError || !clientUser || !clientUser.is_active) {
    return NextResponse.json(
      { ok: false, error: { message: "Client user not found" } },
      { status: 403 }
    );
  }

  // Get availability for this company
  const { data: availability, error: fetchError } = await supabase
    .from("interview_availability")
    .select("*")
    .eq("company_id", clientUser.company_id)
    .gte("available_date", new Date().toISOString().split("T")[0]) // Only future dates
    .order("available_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (fetchError) {
    console.error("[Interview Availability] Fetch error:", fetchError);
    return NextResponse.json(
      { ok: false, error: { message: fetchError.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, data: availability || [] });
}

// POST: Add new availability
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

  // Get client user
  const { data: clientUser, error: clientUserError } = await supabase
    .from("client_users")
    .select("id, company_id, is_active")
    .eq("user_id", user.id)
    .single();

  if (clientUserError || !clientUser || !clientUser.is_active) {
    return NextResponse.json(
      { ok: false, error: { message: "Client user not found" } },
      { status: 403 }
    );
  }

  // Parse request body
  let body: {
    available_date?: string;
    start_time?: string;
    end_time?: string;
    note?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  const { available_date, start_time, end_time, note } = body;

  if (!available_date || !start_time || !end_time) {
    return NextResponse.json(
      { ok: false, error: { message: "日付と時間は必須です" } },
      { status: 400 }
    );
  }

  // Validate date is in the future
  const today = new Date().toISOString().split("T")[0];
  if (available_date < today) {
    return NextResponse.json(
      { ok: false, error: { message: "過去の日付は登録できません" } },
      { status: 400 }
    );
  }

  // Validate time range
  if (start_time >= end_time) {
    return NextResponse.json(
      { ok: false, error: { message: "終了時間は開始時間より後にしてください" } },
      { status: 400 }
    );
  }

  // Insert new availability
  const { data: newAvailability, error: insertError } = await supabase
    .from("interview_availability")
    .insert({
      company_id: clientUser.company_id,
      client_user_id: clientUser.id,
      available_date,
      start_time,
      end_time,
      note: note || null,
      is_booked: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertError) {
    console.error("[Interview Availability] Insert error:", insertError);
    return NextResponse.json(
      { ok: false, error: { message: insertError.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, data: newAvailability }, { status: 201 });
}

// DELETE: Delete availability by ID (passed as query param)
export async function DELETE(req: NextRequest) {
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

  // Get client user
  const { data: clientUser, error: clientUserError } = await supabase
    .from("client_users")
    .select("id, company_id, is_active")
    .eq("user_id", user.id)
    .single();

  if (clientUserError || !clientUser || !clientUser.is_active) {
    return NextResponse.json(
      { ok: false, error: { message: "Client user not found" } },
      { status: 403 }
    );
  }

  // Get ID from query params
  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { ok: false, error: { message: "IDが必要です" } },
      { status: 400 }
    );
  }

  // Check if the availability belongs to this company and is not booked
  const { data: existing, error: checkError } = await supabase
    .from("interview_availability")
    .select("id, company_id, is_booked")
    .eq("id", id)
    .single();

  if (checkError || !existing) {
    return NextResponse.json(
      { ok: false, error: { message: "対応可能日が見つかりません" } },
      { status: 404 }
    );
  }

  if (existing.company_id !== clientUser.company_id) {
    return NextResponse.json(
      { ok: false, error: { message: "権限がありません" } },
      { status: 403 }
    );
  }

  if (existing.is_booked) {
    return NextResponse.json(
      { ok: false, error: { message: "予約済みの日程は削除できません" } },
      { status: 400 }
    );
  }

  // Delete the availability
  const { error: deleteError } = await supabase
    .from("interview_availability")
    .delete()
    .eq("id", id);

  if (deleteError) {
    console.error("[Interview Availability] Delete error:", deleteError);
    return NextResponse.json(
      { ok: false, error: { message: deleteError.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, data: null });
}

// PUT: Update availability
export async function PUT(req: NextRequest) {
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

  // Get client user
  const { data: clientUser, error: clientUserError } = await supabase
    .from("client_users")
    .select("id, company_id, is_active")
    .eq("user_id", user.id)
    .single();

  if (clientUserError || !clientUser || !clientUser.is_active) {
    return NextResponse.json(
      { ok: false, error: { message: "Client user not found" } },
      { status: 403 }
    );
  }

  // Parse request body
  let body: {
    id?: string;
    available_date?: string;
    start_time?: string;
    end_time?: string;
    note?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  const { id, available_date, start_time, end_time, note } = body;

  if (!id) {
    return NextResponse.json(
      { ok: false, error: { message: "IDが必要です" } },
      { status: 400 }
    );
  }

  // Check if the availability belongs to this company and is not booked
  const { data: existing, error: checkError } = await supabase
    .from("interview_availability")
    .select("id, company_id, is_booked")
    .eq("id", id)
    .single();

  if (checkError || !existing) {
    return NextResponse.json(
      { ok: false, error: { message: "対応可能日が見つかりません" } },
      { status: 404 }
    );
  }

  if (existing.company_id !== clientUser.company_id) {
    return NextResponse.json(
      { ok: false, error: { message: "権限がありません" } },
      { status: 403 }
    );
  }

  if (existing.is_booked) {
    return NextResponse.json(
      { ok: false, error: { message: "予約済みの日程は変更できません" } },
      { status: 400 }
    );
  }

  // Validate date is in the future
  if (available_date) {
    const today = new Date().toISOString().split("T")[0];
    if (available_date < today) {
      return NextResponse.json(
        { ok: false, error: { message: "過去の日付は登録できません" } },
        { status: 400 }
      );
    }
  }

  // Validate time range
  if (start_time && end_time && start_time >= end_time) {
    return NextResponse.json(
      { ok: false, error: { message: "終了時間は開始時間より後にしてください" } },
      { status: 400 }
    );
  }

  // Build update object
  const updateData: Partial<InterviewAvailability> = {
    updated_at: new Date().toISOString(),
  };
  if (available_date) updateData.available_date = available_date;
  if (start_time) updateData.start_time = start_time;
  if (end_time) updateData.end_time = end_time;
  if (note !== undefined) updateData.note = note || null;

  // Update the availability
  const { data: updated, error: updateError } = await supabase
    .from("interview_availability")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    console.error("[Interview Availability] Update error:", updateError);
    return NextResponse.json(
      { ok: false, error: { message: updateError.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, data: updated });
}
