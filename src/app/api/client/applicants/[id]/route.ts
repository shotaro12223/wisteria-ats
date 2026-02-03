import { NextResponse, NextRequest } from "next/server";
import { supabaseRoute } from "@/lib/supabaseRoute";
import { recordApplicantView } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const { supabase } = supabaseRoute(req);

  // Get authenticated user
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
    .select("company_id, is_active")
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

  // Fetch applicant (must be shared and belong to client's company)
  const { data: applicant, error: applicantError } = await supabase
    .from("applicants")
    .select("*")
    .eq("id", id)
    .eq("company_id", clientUser.company_id)
    .eq("shared_with_client", true)
    .single();

  if (applicantError || !applicant) {
    return NextResponse.json(
      { ok: false, error: { message: "Applicant not found or not shared" } },
      { status: 404 }
    );
  }

  // 監査ログ記録（クライアント側の個人情報閲覧）
  await recordApplicantView(user.id, id, clientUser.company_id);

  return NextResponse.json({ ok: true, data: applicant });
}
