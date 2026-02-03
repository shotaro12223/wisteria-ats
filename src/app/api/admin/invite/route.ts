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
      console.error("[admin/invite] Auth creation error:", authCreateError);
      // Provide Japanese error messages for common cases
      let errorMessage = authCreateError.message;
      if (authCreateError.message.includes("already been registered")) {
        errorMessage = "このメールアドレスは既に登録されています";
      } else if (authCreateError.message.includes("password")) {
        errorMessage = "パスワードが要件を満たしていません";
      } else {
        errorMessage = "認証ユーザーの作成に失敗しました";
      }

      return NextResponse.json(
        { ok: false, error: { message: errorMessage } },
        { status: 400 }
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
      console.error("[admin/invite] Workspace user creation error:", workspaceError);
      // Rollback: delete auth user if workspace_members creation fails
      await supabaseAdmin.auth.admin.deleteUser(newUserId);

      return NextResponse.json(
        { ok: false, error: { message: "ワークスペースユーザーの作成に失敗しました" } },
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
    console.error("[admin/invite] POST error:", error);
    return NextResponse.json(
      { ok: false, error: { message: "招待処理に失敗しました" } },
      { status: 500 }
    );
  }
}
