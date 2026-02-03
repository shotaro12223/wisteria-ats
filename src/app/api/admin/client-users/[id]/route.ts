import { NextResponse, NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { supabaseRoute } from "@/lib/supabaseRoute";

export const dynamic = "force-dynamic";

export async function PATCH(
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
  const { data: workspaceMember, error: memberError } = await supabase
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
  const { is_active, display_name } = body;

  // Build update object
  const updates: any = {
    updated_at: new Date().toISOString(),
  };

  if (is_active !== undefined) {
    updates.is_active = is_active;
  }

  if (display_name !== undefined) {
    updates.display_name = display_name;
  }

  // Update client user
  const { data: updatedUser, error: updateError } = await supabaseAdmin
    .from("client_users")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: updateError.message,
        },
      },
      { status: 500 }
    );
  }

  // Create audit log
  await supabaseAdmin.from("audit_logs").insert({
    user_id: user.id,
    company_id: updatedUser.company_id,
    action: "client_user_updated",
    resource_type: "client_user",
    resource_id: id,
    old_value: null,
    new_value: updates,
    created_at: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, data: updatedUser });
}

export async function DELETE(
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
  const { data: workspaceMember, error: memberError } = await supabase
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

  // Get client user
  const { data: clientUser, error: fetchError } = await supabaseAdmin
    .from("client_users")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !clientUser) {
    return NextResponse.json(
      { ok: false, error: { message: "Client user not found" } },
      { status: 404 }
    );
  }

  // Soft delete: set is_active to false
  const { data: deletedUser, error: deleteError } = await supabaseAdmin
    .from("client_users")
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (deleteError) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: deleteError.message,
        },
      },
      { status: 500 }
    );
  }

  // Create audit log
  await supabaseAdmin.from("audit_logs").insert({
    user_id: user.id,
    company_id: clientUser.company_id,
    action: "client_user_deleted",
    resource_type: "client_user",
    resource_id: id,
    old_value: { is_active: true },
    new_value: { is_active: false },
    created_at: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, data: deletedUser });
}
