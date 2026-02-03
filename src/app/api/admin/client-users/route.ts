import { NextResponse, NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { supabaseRoute } from "@/lib/supabaseRoute";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
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

  // Get filter parameters
  const url = new URL(req.url);
  const companyId = url.searchParams.get("companyId");

  // Fetch client users
  let query = supabaseAdmin
    .from("client_users")
    .select("*")
    .order("created_at", { ascending: false });

  if (companyId) {
    query = query.eq("company_id", companyId);
  }

  const { data: clientUsers, error: fetchError } = await query;

  if (fetchError) {
    console.error("[admin/client-users] GET error:", fetchError);
    return NextResponse.json(
      { ok: false, error: { message: "クライアントユーザーの取得に失敗しました" } },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, data: clientUsers ?? [] });
}

export async function POST(req: NextRequest) {
  try {
    const { supabase } = supabaseRoute(req);

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    console.log("[DEBUG] Auth user:", { user: user?.id, error: authError?.message });

    if (authError || !user) {
      return NextResponse.json(
        { ok: false, error: { message: `Unauthorized: ${authError?.message || "No user"}` } },
        { status: 401 }
      );
    }

    // Check if user is admin (use supabaseAdmin to bypass RLS)
    const { data: workspaceMember, error: memberError } = await supabaseAdmin
      .from("workspace_members")
      .select("role")
      .eq("user_id", user.id)
      .single();

    console.log("[DEBUG] Workspace member:", { member: workspaceMember, error: memberError?.message });

    if (memberError || !workspaceMember) {
      return NextResponse.json(
        { ok: false, error: { message: `User not found in workspace: ${memberError?.message || "Unknown"}` } },
        { status: 403 }
      );
    }

    if (workspaceMember.role !== "admin") {
      return NextResponse.json(
        { ok: false, error: { message: `Admin access required. Current role: ${workspaceMember.role}` } },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { email, password, companyId, displayName } = body;

    console.log("[DEBUG] Create client user request:", { email, companyId, displayName });

    if (!email || !password || !companyId) {
      return NextResponse.json(
        { ok: false, error: { message: "Email, password, and companyId are required" } },
        { status: 400 }
      );
    }

    // Verify company exists
    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .select("id, company_name")
      .eq("id", companyId)
      .single();

    console.log("[DEBUG] Company lookup:", { company, error: companyError });

    if (companyError || !company) {
      console.error("[admin/client-users] Company not found:", companyError);
      return NextResponse.json(
        { ok: false, error: { message: "指定された企業が見つかりません" } },
        { status: 404 }
      );
    }

    // Create auth user using admin client
    const { data: authData, error: authCreateError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
    });

    console.log("[DEBUG] Auth user creation:", { authData, error: authCreateError });

    if (authCreateError) {
      console.error("[admin/client-users] Auth user creation error:", authCreateError);
      return NextResponse.json(
        { ok: false, error: { message: "認証ユーザーの作成に失敗しました" } },
        { status: 500 }
      );
    }

    const newUserId = authData.user.id;

    // Create client_users record
    const { data: clientUser, error: clientUserError } = await supabaseAdmin
      .from("client_users")
      .insert({
        user_id: newUserId,
        company_id: companyId,
        email,
        display_name: displayName || email,
        role: "member",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    console.log("[DEBUG] Client user creation:", { clientUser, error: clientUserError });

    if (clientUserError) {
      console.error("[admin/client-users] Client user creation error:", clientUserError);
      // Rollback: delete auth user if client_users creation fails
      await supabaseAdmin.auth.admin.deleteUser(newUserId);

      return NextResponse.json(
        { ok: false, error: { message: "クライアントユーザーの作成に失敗しました" } },
        { status: 500 }
      );
    }

    // Create audit log
    await supabaseAdmin.from("audit_logs").insert({
      user_id: user.id,
      company_id: companyId,
      action: "client_user_created",
      resource_type: "client_user",
      resource_id: clientUser.id,
      old_value: null,
      new_value: { email, company_id: companyId },
      created_at: new Date().toISOString(),
    });

    console.log("[DEBUG] Client user created successfully:", clientUser.id);

    return NextResponse.json({ ok: true, data: clientUser });
  } catch (error: any) {
    console.error("[admin/client-users] POST error:", error);
    return NextResponse.json(
      { ok: false, error: { message: "クライアントユーザーの作成に失敗しました" } },
      { status: 500 }
    );
  }
}
