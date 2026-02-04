import { NextResponse, NextRequest } from "next/server";
import { supabaseRoute } from "@/lib/supabaseRoute";
import { notifyMeetingDatesProposed } from "@/lib/sendClientNotification";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// GET: 特定の打ち合わせ依頼を取得（管理者用）
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
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

  // Verify user is NOT a client user (admin only)
  const { data: clientUser } = await supabase
    .from("client_users")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (clientUser) {
    return NextResponse.json(
      { ok: false, error: { message: "Access denied. Admin only." } },
      { status: 403 }
    );
  }

  // Fetch the meeting request with company info
  const { data: request, error: requestError } = await supabase
    .from("meeting_requests")
    .select(`
      *,
      companies:company_id (
        id,
        company_name
      ),
      client_users:client_user_id (
        id,
        name,
        email
      )
    `)
    .eq("id", id)
    .single();

  if (requestError || !request) {
    return NextResponse.json(
      { ok: false, error: { message: "Meeting request not found" } },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, data: request });
}

// PATCH: 打ち合わせ依頼を更新（候補日を提示、ステータス変更など）
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
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

  // Verify user is NOT a client user (admin only)
  const { data: clientUser } = await supabase
    .from("client_users")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (clientUser) {
    return NextResponse.json(
      { ok: false, error: { message: "Access denied. Admin only." } },
      { status: 403 }
    );
  }

  // Fetch existing meeting request
  const { data: existingRequest, error: existingError } = await supabase
    .from("meeting_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (existingError || !existingRequest) {
    return NextResponse.json(
      { ok: false, error: { message: "Meeting request not found" } },
      { status: 404 }
    );
  }

  // Parse request body
  let body: {
    proposed_dates?: string[];
    admin_message?: string;
    status?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  const { proposed_dates, admin_message, status } = body;

  // Build update object
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  // If proposing dates, validate and set status
  if (proposed_dates !== undefined) {
    if (!Array.isArray(proposed_dates) || proposed_dates.length === 0) {
      return NextResponse.json(
        { ok: false, error: { message: "proposed_dates must be a non-empty array" } },
        { status: 400 }
      );
    }
    updateData.proposed_dates = proposed_dates;
    updateData.status = "dates_proposed";
  }

  // Admin can add a message
  if (admin_message !== undefined) {
    updateData.admin_message = admin_message;
  }

  // Allow manual status changes (e.g., completed, cancelled)
  if (status !== undefined) {
    const validStatuses = ["pending", "dates_proposed", "confirmed", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { ok: false, error: { message: "Invalid status" } },
        { status: 400 }
      );
    }
    updateData.status = status;
  }

  // Update the meeting request
  const { data: updatedRequest, error: updateError } = await supabase
    .from("meeting_requests")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json(
      { ok: false, error: { message: updateError.message } },
      { status: 500 }
    );
  }

  // 通知送信（候補日提示 or ステータス変更時）
  try {
    const clientUserId = existingRequest.client_user_id;
    const subject = existingRequest.subject || "打ち合わせ";
    const finalStatus = updatedRequest.status;

    if (clientUserId) {
      if (finalStatus === "dates_proposed" && proposed_dates) {
        await notifyMeetingDatesProposed(clientUserId, subject);
      } else if (finalStatus === "confirmed") {
        const { sendClientNotification } = await import("@/lib/sendClientNotification");
        const { data: clientUser } = await supabaseAdmin
          .from("client_users")
          .select("company_id")
          .eq("id", clientUserId)
          .single();

        if (clientUser) {
          await sendClientNotification(
            { type: "client_user", clientUserId },
            {
              title: "打ち合わせ日程確定",
              body: `「${subject}」の日程が確定しました。`,
              url: "/client/meetings",
              tag: "meeting-confirmed",
              type: "interview",
            }
          );
        }
      } else if (finalStatus === "cancelled") {
        const { sendClientNotification } = await import("@/lib/sendClientNotification");
        await sendClientNotification(
          { type: "client_user", clientUserId },
          {
            title: "打ち合わせキャンセル",
            body: `「${subject}」がキャンセルされました。`,
            url: "/client/meetings",
            tag: "meeting-cancelled",
            type: "info",
          }
        );
      }
    }
  } catch (notifyErr) {
    console.error("[meeting-requests] Notification error:", notifyErr);
    // 通知失敗でもレスポンスは返す
  }

  return NextResponse.json({ ok: true, data: updatedRequest });
}

// DELETE: 打ち合わせ依頼を削除
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
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

  // Verify user is NOT a client user (admin only)
  const { data: clientUser } = await supabase
    .from("client_users")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (clientUser) {
    return NextResponse.json(
      { ok: false, error: { message: "Access denied. Admin only." } },
      { status: 403 }
    );
  }

  // Delete the meeting request
  const { error: deleteError } = await supabase
    .from("meeting_requests")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return NextResponse.json(
      { ok: false, error: { message: deleteError.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, data: null });
}
