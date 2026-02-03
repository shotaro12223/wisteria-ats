import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Simple in-memory rate limiting
const rateLimit = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT = 100; // 100 requests per minute
const WINDOW_MS = 60 * 1000;

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const limit = rateLimit.get(ip);

  if (!limit || now > limit.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT - 1 };
  }

  if (limit.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  limit.count++;
  return { allowed: true, remaining: RATE_LIMIT - limit.count };
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ================================================
  // Rate Limiting for API routes
  // ================================================
  if (pathname.startsWith("/api/")) {
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const { allowed, remaining } = checkRateLimit(ip);

    if (!allowed) {
      return NextResponse.json(
        { ok: false, error: { message: "Rate limit exceeded. Please try again later." } },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    const res = NextResponse.next();
    res.headers.set("X-RateLimit-Limit", String(RATE_LIMIT));
    res.headers.set("X-RateLimit-Remaining", String(remaining));
    return res;
  }

  // ================================================
  // Authentication & Authorization for non-API routes
  // ================================================
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    "";
  const anon =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "";

  if (!url || !anon) {
    return NextResponse.next();
  }

  // Next のレスポンス（ここに cookie 更新を載せる）
  const res = NextResponse.next();

  // Add pathname to headers for layout routing
  res.headers.set("x-pathname", req.nextUrl.pathname);

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          res.cookies.set(name, value, options);
        });
      },
    },
  });

  // 重要:これを呼ぶことで「期限切れ/更新が必要なセッション」が refresh され、cookie が res に乗る
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Public paths that don't require authentication
  const publicPaths = ["/login", "/client/login", "/auth/callback", "/set-password"];
  const isPublicPath = publicPaths.includes(pathname);

  // ================================================
  // Authentication Check - All routes require auth except public paths
  // ================================================
  if (!isPublicPath && !user) {
    // Redirect to appropriate login page
    if (pathname.startsWith("/client")) {
      return NextResponse.redirect(new URL(`/client/login?next=${pathname}`, req.url));
    }
    return NextResponse.redirect(new URL(`/login?next=${pathname}`, req.url));
  }

  // ================================================
  // Client Portal Access Control
  // ================================================
  if (pathname.startsWith("/client")) {
    // Allow access to /client/login without authentication
    if (pathname === "/client/login") {
      // If already logged in, redirect to dashboard
      if (user) {
        return NextResponse.redirect(new URL("/client/dashboard", req.url));
      }
      return res;
    }

    // At this point, user is guaranteed to exist (checked above)
    if (!user) {
      return NextResponse.redirect(new URL("/client/login", req.url));
    }

    // Check if user is a client user
    const { data: clientUser } = await supabase
      .from("client_users")
      .select("id, company_id, is_active")
      .eq("user_id", user.id)
      .single();

    // If not a client user, allow admin users (workspace_members) to access
    if (!clientUser) {
      // Check if user is an admin/workspace member
      const { data: workspaceMember } = await supabase
        .from("workspace_members")
        .select("user_id")
        .eq("user_id", user.id)
        .single();

      // If not a workspace member either, redirect to admin login
      if (!workspaceMember) {
        return NextResponse.redirect(new URL("/login", req.url));
      }

      // Admin user can access
      return res;
    }

    // If inactive client user, redirect to login
    if (!clientUser.is_active) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/client/login", req.url));
    }

    // Client user is valid, allow access
    return res;
  }

  // ================================================
  // Admin Portal Access Control
  // ================================================
  // For admin routes, require workspace membership
  if (!pathname.startsWith("/client") && pathname !== "/login") {
    // At this point, user is guaranteed to exist (checked above for non-public paths)
    if (!user) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // Check if user is a client user
    const { data: clientUser } = await supabase
      .from("client_users")
      .select("id")
      .eq("user_id", user.id)
      .single();

    // If user is a client user, redirect to client dashboard
    if (clientUser) {
      return NextResponse.redirect(new URL("/client/dashboard", req.url));
    }

    // Check if user is a workspace member
    const { data: workspaceMember } = await supabase
      .from("workspace_members")
      .select("user_id")
      .eq("user_id", user.id)
      .single();

    // If not a workspace member, redirect to login
    if (!workspaceMember) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  return res;
}

// Include API routes for rate limiting, exclude only static assets
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|sw.js|manifest.json|icons/).*)",
  ],
};
