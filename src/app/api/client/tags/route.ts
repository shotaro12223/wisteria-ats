import { NextResponse, NextRequest } from "next/server";
import { supabaseRoute } from "@/lib/supabaseRoute";

export const dynamic = "force-dynamic";

// GET: Fetch all tags for the company
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

  // Get client user info
  const { data: clientUser, error: clientUserError } = await supabase
    .from("client_users")
    .select("id, company_id, is_active")
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

  // Fetch tags
  const { data: tags, error: tagsError } = await supabase
    .from("client_tags")
    .select("*")
    .eq("company_id", clientUser.company_id)
    .order("name", { ascending: true });

  if (tagsError) {
    console.error("[Tags] Fetch error:", tagsError);
    return NextResponse.json(
      { ok: false, error: { message: "Failed to fetch tags" } },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      data: tags || [],
    },
    {
      headers: {
        "Cache-Control": "private, s-maxage=300, stale-while-revalidate=600",
      },
    }
  );
}

// POST: Create a new tag
export async function POST(req: NextRequest) {
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
    .select("id, company_id, is_active")
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

  // Parse request body
  const body = await req.json();
  const { name, color } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { ok: false, error: { message: "Tag name is required" } },
      { status: 400 }
    );
  }

  // Insert tag
  const { data: newTag, error: insertError } = await supabase
    .from("client_tags")
    .insert({
      company_id: clientUser.company_id,
      name: name.trim(),
      color: color || "#6366f1",
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json(
        { ok: false, error: { message: "このタグ名は既に使用されています" } },
        { status: 400 }
      );
    }
    console.error("[Tags] Insert error:", insertError);
    return NextResponse.json(
      { ok: false, error: { message: "Failed to create tag" } },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, data: newTag });
}

// DELETE: Delete a tag
export async function DELETE(req: NextRequest) {
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
    .select("id, company_id, is_active")
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

  // Parse request body
  const body = await req.json();
  const { tagId } = body;

  if (!tagId) {
    return NextResponse.json(
      { ok: false, error: { message: "Tag ID is required" } },
      { status: 400 }
    );
  }

  // Delete tag (cascade will delete applicant_tags associations)
  const { error: deleteError } = await supabase
    .from("client_tags")
    .delete()
    .eq("id", tagId)
    .eq("company_id", clientUser.company_id);

  if (deleteError) {
    console.error("[Tags] Delete error:", deleteError);
    return NextResponse.json(
      { ok: false, error: { message: "Failed to delete tag" } },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
