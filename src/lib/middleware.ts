import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_PATHS = [
  "/login",
  "/favicon.ico",
];

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (pathname.startsWith("/_next")) return true;
  return false;
}

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();

  if (isPublicPath(url.pathname)) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { ok: false, error: "Missing Supabase env vars" },
      { status: 500 }
    );
  }

  const res = NextResponse.next();

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          res.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  // 未ログインは /login へ
  if (!user) {
    url.pathname = "/login";
    url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: [
    /*
      /login と静的ファイル以外を保護
      （必要なら /api/contact_requests などだけ除外を追加）
    */
    "/((?!_next/static|_next/image|favicon.ico|login).*)",
  ],
};
