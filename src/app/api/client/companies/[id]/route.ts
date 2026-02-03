import { NextResponse, NextRequest } from "next/server";
import { supabaseRoute } from "@/lib/supabaseRoute";

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

  // Verify client is accessing their own company
  if (clientUser.company_id !== id) {
    return NextResponse.json(
      { ok: false, error: { message: "Forbidden" } },
      { status: 403 }
    );
  }

  // Fetch company
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("*")
    .eq("id", id)
    .single();

  if (companyError || !company) {
    return NextResponse.json(
      { ok: false, error: { message: "Company not found" } },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, data: company });
}
