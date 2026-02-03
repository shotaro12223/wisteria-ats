import { NextResponse, NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { supabaseRoute } from "@/lib/supabaseRoute";

export const dynamic = "force-dynamic";

export async function POST(
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

  // Check if user is admin
  const { data: workspaceMember, error: memberError } = await supabaseAdmin
    .from("workspace_members")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (memberError || !workspaceMember || workspaceMember.role !== "admin") {
    return NextResponse.json(
      { ok: false, error: { message: "Admin access required" } },
      { status: 403 }
    );
  }

  // Parse request body
  const body = await req.json();
  const { newPassword } = body;

  if (!newPassword || newPassword.length < 6) {
    return NextResponse.json(
      { ok: false, error: { message: "New password is required (min 6 characters)" } },
      { status: 400 }
    );
  }

  // Get client user
  const { data: clientUser, error: fetchError } = await supabaseAdmin
    .from("client_users")
    .select("user_id, email, company_id")
    .eq("id", id)
    .single();

  if (fetchError || !clientUser) {
    return NextResponse.json(
      { ok: false, error: { message: "Client user not found" } },
      { status: 404 }
    );
  }

  // Update password using admin API
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    clientUser.user_id,
    { password: newPassword }
  );

  if (updateError) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: `Failed to update password: ${updateError.message}`,
        },
      },
      { status: 500 }
    );
  }

  // Create audit log
  await supabaseAdmin.from("audit_logs").insert({
    user_id: user.id,
    company_id: clientUser.company_id,
    action: "client_user_password_reset",
    resource_type: "client_user",
    resource_id: id,
    old_value: null,
    new_value: { email: clientUser.email },
    created_at: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
