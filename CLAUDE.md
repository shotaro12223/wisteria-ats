# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Note**: グローバルルール (`~/.claude/CLAUDE.md`) に加えて、以下のWisteria-ATS固有ルールを適用します。

## Quick Reference (Wisteria-ATS Rules)

**Supabase Client:**
- Server Component → `supabaseServer`
- API Route → `supabaseRoute`
- Admin operations → `supabaseAdmin`

**Next.js 16 Params:**
```typescript
const { id } = await ctx.params;  // MUST await
```

**JST Timezone:**
```typescript
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
```

**API Response:**
```typescript
{ ok: true, data } | { ok: false, error: { message: string } }
```

**Timestamps:**
```typescript
createdAt: new Date().toISOString()  // DB defaults don't work
```

**Imports:**
```typescript
import { something } from "@/path/to/module";
```

---

## Project Overview

**Wisteria-ATS** is an Applicant Tracking System for Japanese recruitment operations. It manages job postings across multiple Japanese recruitment sites (Indeed, 採用係長, Engage, 求人BOX, はたらきんぐ, ハローワーク, げんきワーク, ジモティー, AirWork), tracks applicants through their workflow, and integrates with Gmail for application processing.

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 16.1 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS v4
- **Language**: TypeScript (strict mode)

### Supabase Client Pattern

The codebase uses **four different Supabase clients** for different contexts:

1. **`supabaseAdmin`** (`src/lib/supabaseAdmin.ts`) - Server-only, uses service role key
   - Use in API routes that need admin privileges
   - Marked with `"server-only"` package

2. **`supabaseServer`** (`src/lib/supabaseServer.ts`) - Server-only, SSR client
   - Use in Server Components
   - Respects RLS policies based on authenticated user

3. **`supabaseRoute`** (`src/lib/supabaseRoute.ts`) - Route handler context
   - Use in API route handlers (`src/app/api/**/route.ts`)
   - Manages request/response cookies for session handling

4. **`supabaseBrowser`** (`src/lib/supabaseBrowser.ts`) - Browser client
   - Currently not actively used (client-side fetching goes through API routes)

**Critical**: Always use the correct client for the context. Using the wrong client can cause auth issues or security vulnerabilities.

### Page Pattern: Server Wrapper + Client Component

Most pages follow this pattern:
```typescript
// src/app/feature/page.tsx (Server Component)
export default function FeaturePage() {
  return <FeaturePageClient />;
}

// src/app/feature/page.client.tsx ("use client")
export default function FeaturePageClient() {
  // Client-side data fetching, interactivity
}
```

Server components handle metadata and auth checks, client components handle interactive data fetching via API routes.

### Data Fetching Pattern

- **Client-side fetching**: Components use `useEffect` + `fetch()` with `cache: "no-store"`
- **No external state library**: Pure `useState` + `useEffect` for data management
- **localStorage as fallback**: Work queue uses localStorage cache for offline support
- All API routes return standardized responses:
  ```typescript
  { ok: true, data: T } | { ok: false, error: { message: string } }
  ```

### Japanese Timezone Handling (JST)

**Critical pattern**: All date calculations use JST offset to align with Japanese business requirements:

```typescript
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

function getThisMonthRangeJstAsUtcIso(now = new Date()) {
  const nowJst = new Date(now.getTime() + JST_OFFSET_MS);
  const y = nowJst.getUTCFullYear();
  const m = nowJst.getUTCMonth();

  // Convert back to UTC for DB storage
  const startUtc = new Date(Date.UTC(y, m, 1) - JST_OFFSET_MS);
  return startUtc.toISOString();
}
```

This ensures "this month" metrics align with Japanese calendar months, even though Supabase stores UTC.

## Key Database Tables

- **`companies`** - Company profiles
- **`jobs`** - Job postings with per-site status tracking via `siteStatus` JSON field
- **`applicants`** - Applications with status workflow (NEW → DOC/資料待ち → INT/媒体審査中 → OFFER/内定 or NG)
- **`gmail_connections`** - OAuth tokens for Gmail integration (centralized ID: "central")
- **`company_records`** - Deal/pipeline tracking (status: active/risk/paused/inactive)
- **`job_archives`** - Historical job posting snapshots
- **`gmail_inbox`** - Cached Gmail messages linked to companies/jobs
- **`chat_rooms`, `chat_messages`** - Team communication

## API Route Patterns

### Next.js 16 Dynamic Params

**Important**: Next.js 16 changed dynamic route params to be async. All route handlers must await params:

```typescript
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;  // MUST await
  // ...
}
```

### Response Format

All API routes use a consistent envelope:
```typescript
return NextResponse.json({ ok: true, data: result });
// or
return NextResponse.json({ ok: false, error: { message: "..." } }, { status: 400 });
```

### Force Dynamic

Most routes disable caching:
```typescript
export const dynamic = "force-dynamic";
```

## Work Queue Business Logic

The **Work Queue** (`src/app/work-queue/page.tsx`) is the central feature. It explodes each Job into multiple rows (one per recruitment site) and joins with Company data:

- Each row = Job × Site combination
- Tracks per-site status: 準備中, 掲載中, 資料待ち, 媒体審査中, NG, 停止中
- Calculates "staleness": days since last site update
- Tracks RPO engagement: days since RPO last touched this posting

This is stored in the `Job.siteStatus` field as `Record<string, JobSiteState>`.

## Gmail OAuth Flow

1. **Start**: `/api/gmail/auth/start` redirects to Google consent screen
2. **Callback**: `/api/gmail/auth/callback` exchanges code for tokens
3. **Storage**: Tokens stored in `gmail_connections` table with ID "central"
4. **Token Refresh**: Backend preserves `refresh_token` across exchanges (Google doesn't always return it)

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY

GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI
```

## Import Aliases

Use `@/*` for imports:
```typescript
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { Job, Company } from "@/lib/types";
```

## UI Design System

The codebase uses consistent UI tokens (GENIEE-style):
```typescript
const UI = {
  PANEL: "rounded-md border-2 border-slate-200/80 bg-white shadow-sm",
  KPI_GRID: "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4",
  LINK: "text-sm font-semibold text-indigo-700/95 hover:text-indigo-800 hover:underline",
};
```

These tokens appear consistently across dashboard pages (home, analytics, work-queue).

## Recruitment Sites

The system tracks 9 Japanese job boards. See `src/lib/templates.ts` for site-specific field mappings. Each site has different required fields and data formats.

## Critical Patterns

1. **DB timestamp defaults don't work** in this environment - manually set timestamps in API routes:
   ```typescript
   createdAt: new Date().toISOString()
   ```

2. **localStorage versioning**: Cache keys use version suffixes (`_v1`) for safe schema evolution:
   ```typescript
   localStorage.getItem("wisteria_ats_jobs_v1")
   ```

3. **Safe JSON parsing**: Use `safeParse()` helper to prevent localStorage corruption crashes

4. **Company-Job relationship**: Jobs have optional `companyId` for backward compatibility. New jobs should always link to a company.

5. **Middleware auth refresh**: `src/middleware.ts` runs on every request to refresh Supabase sessions via cookies
