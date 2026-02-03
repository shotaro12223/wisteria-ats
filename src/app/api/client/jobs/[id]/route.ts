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

  // Get client user info to get company_id
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

  // Fetch job detail (RLS will handle access control)
  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .eq("company_id", clientUser.company_id)
    .single();

  if (jobError) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: jobError.message,
        },
      },
      { status: jobError.code === "PGRST116" ? 404 : 500 }
    );
  }

  if (!job) {
    return NextResponse.json(
      { ok: false, error: { message: "Job not found" } },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, data: job });
}
