import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseRoute";

export async function GET(req: NextRequest) {
  const { supabase, res } = supabaseRoute(req);
  await supabase.auth.signOut();

  const redirect = NextResponse.redirect(new URL("/login", req.url));

  // supabaseRoute が res に set した cookie を redirect に引き継ぐ
  res.cookies.getAll().forEach((c) => {
    redirect.cookies.set(c.name, c.value, c);
  });

  return redirect;
}
