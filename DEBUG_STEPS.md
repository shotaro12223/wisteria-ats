# Wisteria ATS デバッグ手順

## 🔴 現在の問題

### Vercel本番環境
**URL:** https://wisteria-b1flr0cmg-shotaros-projects-555a383c.vercel.app

**エラー:**
```
Application error: a client-side exception has occurred
while loading wisteria-b1flr0cmg-shotaros-projects-555a383c.vercel.app
```

### 影響範囲
- ❌ `/companies` - 会社一覧が表示されない
- ❌ `/applicants` - 応募者一覧が表示されない（GmailInboxが表示される）
- ✅ `/applicants/list` - 実際の応募者一覧（こちらにアクセスすべき）

---

## 🔍 原因分析

### 1. ページルーティングの問題
**ファイル:** `src/app/applicants/page.client.tsx`

```tsx
export default function ApplicantsPageClient() {
  return (
    <main>
      <Suspense fallback={<div>読み込み中...</div>}>
        <GmailInboxPanel /> {/* ← 間違ったコンポーネント！ */}
      </Suspense>
    </main>
  );
}
```

**問題:**
- `/applicants` が `GmailInboxPanel` を表示
- 本来は応募者一覧を表示すべき
- 正しいコンポーネントは `/applicants/list/page.tsx` にある

### 2. API認証・権限の問題

**ファイル:** `src/app/api/companies/route.ts:70-85`

```typescript
// Authorization check: Only admins can list all companies
const { data: workspaceMember } = await supabase
  .from("workspace_members")
  .select("role")
  .eq("user_id", user.id)
  .single();

const isAdmin = workspaceMember?.role === "admin";

if (!isAdmin) {
  return NextResponse.json(
    { ok: false, error: { message: "Access denied" } },
    { status: 403 }
  );
}
```

**問題:**
- 管理者権限が必要
- `workspace_members` テーブルへのクエリが失敗している可能性
- RLS (Row Level Security) ポリシーがクエリをブロックしている可能性

### 3. Supabase RLS ポリシーの問題

**テーブル:** `companies`, `company_records`, `workspace_members`

**問題点:**
- `company_records` への `!inner` join が RLS でブロックされている可能性
- `workspace_members` への SELECT 権限がない可能性

```typescript
// line 88-101 in companies/route.ts
const { data, error } = await supabase
  .from("companies")
  .select(`
    id,
    company_name,
    company_profile,
    application_email,
    created_at,
    updated_at,
    company_records!inner(status, profile)  // ← RLS問題の可能性
  `)
  .is("deleted_at", null)
  .is("company_records.deleted_at", null)
  .order("created_at", { ascending: false });
```

### 4. エラーハンドリングの不足

**ファイル:** `src/app/companies/page.tsx:831-846`

```typescript
async function loadCompanies() {
  setState("loading");
  setErrorMessage("");

  try {
    const res = await fetch("/api/companies", { cache: "no-store" });
    const json = (await res.json()) as CompaniesGetRes;

    if (!res.ok || !json.ok) {
      const msg = !json.ok ? json.error.message : `会社一覧の取得に失敗しました (status: ${res.status})`;
      throw new Error(msg);
    }

    setCompanies(Array.isArray(json.companies) ? json.companies : []);
    setState("ready");
  } catch (e) {
    setState("error");
    setErrorMessage(e instanceof Error ? e.message : "会社一覧の取得に失敗しました");
    setCompanies([]);
  }
}
```

**問題:**
- エラーは catch されているが、UI がクラッシュする可能性
- `companies` が `undefined` になる可能性

---

## ✅ 修正手順

### 即座に実行可能な修正

#### 1. 応募者ページの修正（優先度: 高）

**ファイル:** `src/app/applicants/page.client.tsx`

**変更前:**
```tsx
import GmailInboxPanel from "@/components/GmailInboxPanel";

export default function ApplicantsPageClient() {
  return (
    <main>
      <Suspense fallback={<div>読み込み中...</div>}>
        <GmailInboxPanel />
      </Suspense>
    </main>
  );
}
```

**変更後:**
```tsx
"use client";

import { Suspense } from "react";
import { redirect } from "next/navigation";

export default function ApplicantsPageClient() {
  // 応募者リストページにリダイレクト
  redirect("/applicants/list");
}
```

または、リストコンポーネントを直接インポート:

```tsx
"use client";

import { Suspense } from "react";
import ApplicantListContent from "../list/page";

export default function ApplicantsPageClient() {
  return (
    <main>
      <Suspense fallback={<div>読み込み中...</div>}>
        <ApplicantListContent />
      </Suspense>
    </main>
  );
}
```

#### 2. Supabase RLS ポリシーの確認と修正

**実行すべきSQL（Supabase SQL Editor）:**

```sql
-- workspace_members テーブルに SELECT 権限を追加
CREATE POLICY "workspace_members_select_policy"
ON workspace_members
FOR SELECT
USING (auth.uid() = user_id);

-- company_records テーブルに SELECT 権限を追加
CREATE POLICY "company_records_select_for_workspace_members"
ON company_records
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.user_id = auth.uid()
  )
);

-- companies テーブルに SELECT 権限を追加
CREATE POLICY "companies_select_for_workspace_members"
ON companies
FOR SELECT
USING (
  deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.user_id = auth.uid()
  )
);
```

#### 3. API エラーレスポンスの改善

**ファイル:** `src/app/api/companies/route.ts`

**変更前（line 103-112）:**
```typescript
if (error) {
  console.error("[companies] GET error:", error);
  return NextResponse.json(
    {
      ok: false,
      error: { message: "企業一覧の取得に失敗しました" },
    },
    { status: 500 }
  );
}
```

**変更後:**
```typescript
if (error) {
  console.error("[companies] GET error:", error);
  return NextResponse.json(
    {
      ok: false,
      error: {
        message: "企業一覧の取得に失敗しました",
        details: error.message,
        code: error.code,
        hint: error.hint
      },
    },
    { status: 500 }
  );
}
```

---

## 🧪 テスト手順

### 1. ローカルテスト

```bash
# 1. 環境変数を確認
cat .env.local

# 2. 開発サーバーを起動
npm run dev

# 3. ブラウザで確認
# http://localhost:3000/companies
# http://localhost:3000/applicants/list
```

### 2. Vercel デプロイ

```bash
# 1. 変更をコミット
git add .
git commit -m "Fix: Redirect applicants page to list view and improve error handling"

# 2. Vercelにプッシュ
git push

# 3. デプロイ完了を待つ
vercel --prod
```

### 3. 本番環境テスト

1. ブラウザのキャッシュをクリア
2. ログアウト → 再ログイン
3. 以下のページをテスト:
   - https://wisteria-b1flr0cmg-shotaros-projects-555a383c.vercel.app/companies
   - https://wisteria-b1flr0cmg-shotaros-projects-555a383c.vercel.app/applicants/list

---

## 📊 診断コマンド

### Supabase RLS ポリシーを確認

```sql
-- 現在の RLS ポリシーを確認
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('companies', 'company_records', 'workspace_members')
ORDER BY tablename, policyname;

-- RLS が有効か確認
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename IN ('companies', 'company_records', 'workspace_members');
```

### ユーザーの権限を確認

```sql
-- 現在のユーザーIDを確認
SELECT auth.uid();

-- workspace_members テーブルを確認
SELECT * FROM workspace_members WHERE user_id = auth.uid();

-- companies へのアクセスをテスト
SELECT COUNT(*) FROM companies WHERE deleted_at IS NULL;
```

---

## 🔧 緊急回避策

もし上記の修正が難しい場合、以下の緊急回避策を使用:

### 1. RLS を一時的に無効化（非推奨）

```sql
-- ⚠️ セキュリティリスクがあるため本番環境では使用しないこと
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE company_records DISABLE ROW LEVEL SECURITY;
```

### 2. supabaseAdmin を使用

**ファイル:** `src/app/api/companies/route.ts`

```typescript
// line 54 を変更
// const { supabase } = supabaseRoute(req);
// ↓
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// line 88 を変更
const { data, error } = await supabaseAdmin  // supabase → supabaseAdmin
  .from("companies")
  ...
```

**注意:** これはRLSをバイパスするため、認証チェックが必須です。

---

## 📝 次のステップ

1. ✅ 応募者ページを修正
2. ✅ RLS ポリシーを確認・修正
3. ✅ API エラーハンドリングを改善
4. ✅ Vercelに再デプロイ
5. ✅ 本番環境でテスト
6. ✅ チェックリストで全機能を確認
