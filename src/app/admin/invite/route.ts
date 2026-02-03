import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { supabaseRoute } from "@/lib/supabaseRoute";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
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
    const { email, password, displayName } = body;

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: { message: "Email and password are required" } },
        { status: 400 }
      );
    }

    // Create auth user using admin client
    const { data: authData, error: authCreateError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
    });

    if (authCreateError) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            message: `Failed to create auth user: ${authCreateError.message}`,
          },
        },
        { status: 500 }
      );
    }

    const newUserId = authData.user.id;

    // Create workspace_members record
    const { data: workspaceUser, error: workspaceError } = await supabaseAdmin
      .from("workspace_members")
      .insert({
        user_id: newUserId,
        display_name: displayName || email,
        role: "member",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (workspaceError) {
      // Rollback: delete auth user if workspace_members creation fails
      await supabaseAdmin.auth.admin.deleteUser(newUserId);

      return NextResponse.json(
        {
          ok: false,
          error: {
            message: `Failed to create workspace user: ${workspaceError.message}`,
            details: workspaceError.details,
            hint: workspaceError.hint,
          },
        },
        { status: 500 }
      );
    }

    // Create audit log
    await supabaseAdmin.from("audit_logs").insert({
      user_id: user.id,
      action: "workspace_user_created",
      resource_type: "workspace_member",
      resource_id: workspaceUser.user_id,
      old_value: null,
      new_value: { email },
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, data: workspaceUser });
  } catch (error: any) {
    console.error("[ERROR] Workspace user creation failed:", error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: `Server error: ${error.message}`,
        },
      },
      { status: 500 }
    );
  }
}
