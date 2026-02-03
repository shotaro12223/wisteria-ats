import { NextRequest, NextResponse } from "next/server";

// Simple in-memory rate limiting
const rateLimit = new Map<
  string,
  { count: number; resetAt: number }
>();

const RATE_LIMIT = 100; // 100 requests per minute
const WINDOW_MS = 60 * 1000; // 1 minute

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimit.entries()) {
    if (now > value.resetAt) {
      rateLimit.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function checkRateLimit(req: NextRequest): NextResponse | null {
  // Only apply to API routes
  if (!req.nextUrl.pathname.startsWith("/api/")) {
    return null;
  }

  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const now = Date.now();

  const limit = rateLimit.get(ip);

  if (!limit || now > limit.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return null;
  }

  if (limit.count >= RATE_LIMIT) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: "Rate limit exceeded. Please try again later.",
          retryAfter: Math.ceil((limit.resetAt - now) / 1000),
        },
      },
      { status: 429 }
    );
  }

  limit.count++;
  return null;
}
