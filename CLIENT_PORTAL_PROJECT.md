# 企業側ATSマイページ プロジェクト仕様書（改訂版）

## 📋 プロジェクト概要

Wisteriaが管理する企業向けの**応募者管理専用ポータル**を構築する。企業の採用担当者が自社の応募者を直接管理できるシステム。

---

## 🎯 目的・ゴール

- **企業の選考業務効率化**: 企業が連携された応募者の選考管理を直接実施
- **Wisteriaとのシームレス連携**: ステータス変更などがリアルタイムで双方向同期
- **透明性の向上**: 企業が自社の採用状況をリアルタイムで把握
- **コミュニケーション強化**: Wisteriaへの要望チャット機能

---

## 🔄 応募〜選考フロー（重要）

```
1. 【応募受付】
   Indeed等の求人サイト → Wisteriaのシステムに応募データが入る

2. 【Wisteriaが企業に連携】
   Wisteriaスタッフが操作:
   「この応募者を企業Aのポータルに連携する」
   ↓
   企業側ポータルで応募者が見えるようになる

3. 【企業が選考管理】
   企業側ポータルで:
   ✅ ステータス変更（NEW → 書類選考 → 面接 → 内定/NG）
   ✅ 応募者とメッセージング
   ✅ 評価・メモ追加
```

---

## 👥 ユーザー権限

### 企業ユーザー（Client Users）
- **誰**: Wisteriaが管理している企業の採用担当者
- **複数ユーザー**: 1企業に複数ユーザー（採用担当、人事部長など）
- **権限**:
  | 機能 | 権限 |
  |------|------|
  | 求人閲覧 | ✅ 自社求人の一覧・詳細を見る |
  | 求人編集 | ❌ 作成・編集・削除は不可（Wisteriaが運用） |
  | 応募者閲覧 | ✅ **連携された応募者のみ** |
  | 応募者管理 | ✅ ステータス変更・メモ・メッセージ |
  | 分析レポート | ✅ 自社データの閲覧 |
- **認証**: 企業ユーザー専用のログイン画面（`/client/login`）

### Wisteriaスタッフ（Admin Users）
- **既存機能**: 現在のシステムをそのまま使用
- **全社アクセス**: すべての企業データを閲覧・管理可能
- **新規機能**: 応募者を企業ポータルに連携する操作
- **認証**: 既存のログイン画面（`/login`）

---

## 🔐 認証・権限設計

### ユーザータイプ
```typescript
type UserRole = "admin" | "client";

type UserSession = {
  userId: string;
  email: string;
  role: "admin" | "client";
  companyId?: string; // client の場合のみ必須
};
```

### 認証フロー
1. **ログイン画面分離**
   - Admin: `/login` (既存)
   - Client: `/client/login` (新規)

2. **セッション管理**
   - Supabase Authを使用
   - workspace_membersテーブルに `role` カラム追加
   - client ユーザーには必ず `company_id` を紐付け

3. **アクセス制御**
   - Middleware で `/client/*` へのアクセスを制御
   - Admin は `/client/*` にアクセス不可（逆も同様）
   - API routeで必ず `role` と `company_id` をチェック

---

## 🗂️ データベース設計

### 新規テーブル

#### `client_users` (企業ユーザー)
```sql
CREATE TABLE client_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id text REFERENCES companies(id) ON DELETE CASCADE,
  display_name text,
  email text NOT NULL,
  role text DEFAULT 'member', -- member, admin (企業内の役割)
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_client_users_company_id ON client_users(company_id);
CREATE INDEX idx_client_users_user_id ON client_users(user_id);
```

#### `client_support_messages` (Wisteriaへの要望チャット)
```sql
CREATE TABLE client_support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  user_name text,
  message text NOT NULL,
  is_from_client boolean DEFAULT true, -- true: 企業から, false: Wisteriaから
  read_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_client_support_messages_company_id ON client_support_messages(company_id);
CREATE INDEX idx_client_support_messages_created_at ON client_support_messages(created_at DESC);
```

### 既存テーブルの拡張

#### `workspace_members` (role 追加)
```sql
ALTER TABLE workspace_members
ADD COLUMN IF NOT EXISTS role text DEFAULT 'admin'; -- 'admin' or 'client'

ALTER TABLE workspace_members
ADD COLUMN IF NOT EXISTS company_id text REFERENCES companies(id);

-- client ユーザーには company_id が必須
ALTER TABLE workspace_members
ADD CONSTRAINT check_client_has_company
CHECK (role != 'client' OR company_id IS NOT NULL);
```

#### `applicants` (企業連携フラグ追加)
```sql
ALTER TABLE applicants
ADD COLUMN IF NOT EXISTS shared_with_client boolean DEFAULT false;
-- Wisteriaが企業に連携したかどうかのフラグ

ALTER TABLE applicants
ADD COLUMN IF NOT EXISTS shared_at timestamp with time zone;
-- 企業に連携した日時
```

### RLSポリシー（Row Level Security）

#### applicants テーブル
```sql
-- Client users can only see applicants that have been shared with them
CREATE POLICY "Client users view shared applicants only"
ON applicants FOR SELECT
TO authenticated
USING (
  shared_with_client = true
  AND EXISTS (
    SELECT 1 FROM client_users cu
    WHERE cu.user_id = auth.uid()
    AND cu.company_id = applicants.company_id
  )
);

-- Client users can update shared applicants (status, notes, etc.)
CREATE POLICY "Client users update shared applicants"
ON applicants FOR UPDATE
TO authenticated
USING (
  shared_with_client = true
  AND EXISTS (
    SELECT 1 FROM client_users cu
    WHERE cu.user_id = auth.uid()
    AND cu.company_id = applicants.company_id
  )
);
```

#### jobs テーブル
```sql
-- Client users can view their company's jobs (read-only)
CREATE POLICY "Client users view own company jobs"
ON jobs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM client_users cu
    WHERE cu.user_id = auth.uid()
    AND cu.company_id = jobs.company_id
  )
);

-- Client users CANNOT update jobs (Wisteria manages jobs)
-- No UPDATE policy for client users
```

---

## 🏗️ URL構造・ルーティング

### 同じドメイン内で分離

```
【Admin側（既存 + 新機能）】
/                           → Wisteria Admin ダッシュボード
/login                      → Wisteria Admin ログイン
/companies                  → Wisteria Admin 会社一覧
/applicants                 → Wisteria Admin 応募者一覧（全社）
/applicants/[id]            → Wisteria Admin 応募者詳細 + [企業に連携]ボタン（新規）
...

【Client Portal（新規）】
/client                     → リダイレクト to /client/dashboard
/client/login               → Client ログイン画面
/client/dashboard           → Client ダッシュボード
/client/jobs                → Client 求人一覧（閲覧のみ）
/client/jobs/[id]           → Client 求人詳細（閲覧のみ）
/client/applicants          → Client 応募者一覧（連携済みのみ）
/client/applicants/[id]     → Client 応募者詳細・メッセージング
/client/analytics           → Client 分析・レポート
/client/support             → Client サポートチャット（Wisteriaへの要望）
/client/settings            → Client 設定（ユーザー管理など）
```

### Middleware設定

```typescript
// src/middleware.ts
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Client portal へのアクセス
  if (pathname.startsWith('/client')) {
    const session = await getSession(request);

    // 未ログインの場合
    if (!session && pathname !== '/client/login') {
      return NextResponse.redirect(new URL('/client/login', request.url));
    }

    // Admin ユーザーはアクセス不可
    if (session?.role === 'admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Client ユーザーは OK
    if (session?.role === 'client') {
      return NextResponse.next();
    }
  }

  // Admin portal へのアクセス
  if (!pathname.startsWith('/client') && !pathname.startsWith('/login')) {
    const session = await getSession(request);

    // Client ユーザーはアクセス不可
    if (session?.role === 'client') {
      return NextResponse.redirect(new URL('/client/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

---

## 📱 機能一覧

### 1. ✅ 自社の求人一覧・詳細の閲覧

**画面**: `/client/jobs`、`/client/jobs/[id]`

**機能**:
- 自社の求人一覧を表示（カード/リスト表示切り替え）
- 求人のステータス（準備中、掲載中、停止中など）
- 媒体別の掲載状況
- 求人ごとの応募数・選考状況サマリー
- **❌ 新規作成・編集・削除は不可（Wisteriaが運用）**

**API**:
- `GET /api/client/jobs` - 自社求人一覧取得
- `GET /api/client/jobs/[id]` - 求人詳細取得

---

### 2. ✅ 応募者の閲覧・管理（連携済みのみ）

**画面**: `/client/applicants`

**機能**:
- **連携された応募者のみ表示**（Wisteriaが連携操作を実施）
- 応募者のフィルタリング（求人別、ステータス別、日付範囲）
- 応募者の詳細情報（履歴書、職務経歴書）
- 選考ステータスの更新（NEW → DOC → INT → OFFER/NG/HIRED/WITHDRAWN）
- 応募者への評価・メモ

**API**:
- `GET /api/client/applicants` - 連携済み応募者一覧取得
- `GET /api/client/applicants/[id]` - 応募者詳細取得
- `PATCH /api/client/applicants/[id]` - 応募者情報更新（ステータス、メモなど）

**Wisteria側との連携**:
- 応募者のステータス変更時、Wisteria側のシステムにも即座に反映
- 同じDBを共有（Supabase RLSで権限制御）

**Wisteria側の新機能**:
- 応募者詳細ページに「企業ポータルに連携」ボタン追加
- `POST /api/admin/applicants/[id]/share-with-client` - 企業に連携

---

### 3. ✅ 応募者とのメッセージング

**画面**: `/client/applicants/[id]` (応募者詳細ページ内)

**機能**:
- 応募者との1対1チャット
- メッセージ履歴の表示
- ファイル添付（面接日程、追加資料など）
- 未読・既読表示

**データベース**:
```sql
CREATE TABLE client_applicant_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id text REFERENCES applicants(id) ON DELETE CASCADE,
  company_id text NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  message text NOT NULL,
  is_from_company boolean DEFAULT true,
  attachments jsonb,
  read_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);
```

**API**:
- `GET /api/client/applicants/[id]/messages` - メッセージ履歴取得
- `POST /api/client/applicants/[id]/messages` - メッセージ送信

---

### 4. ✅ 選考ステータスの更新

**統合機能**: 応募者一覧・詳細画面に統合

**ステータス**:
```typescript
type ApplicantStatus =
  | "NEW"              // 新規応募
  | "DOC"              // 書類選考中（資料待ち）
  | "INT"              // 面接（媒体審査中）
  | "OFFER"            // 内定
  | "NG"               // 不採用
  | "HIRED"            // 入社確定
  | "WITHDRAWN";       // 辞退

const STATUS_FLOW = {
  NEW: ["DOC", "NG"],
  DOC: ["INT", "NG"],
  INT: ["OFFER", "NG"],
  OFFER: ["HIRED", "WITHDRAWN"],
};
```

**Wisteria連携**:
- ステータス変更時、`applicants` テーブルを直接更新
- Wisteria側の画面でも即座に反映（同じDBを共有）
- 監査ログ（`audit_logs` テーブル）で変更履歴を記録

---

### 5. ✅ 分析・レポート閲覧

**画面**: `/client/analytics`

**KPI**:
- 応募数（今月・先月・累計）
- 求人別応募数
- 媒体別応募数
- 選考ステータス別の割合（円グラフ）
- 応募から内定までの平均日数
- 月別応募数推移（折れ線グラフ）

**グラフ**:
- Wisteria側と同じCSSベースのグラフ実装
- レスポンシブ対応

**API**:
- `GET /api/client/analytics/overview` - 全体KPI
- `GET /api/client/analytics/by-job` - 求人別統計
- `GET /api/client/analytics/by-source` - 媒体別統計
- `GET /api/client/analytics/funnel` - 選考ファネル

---

### 6. ✅ Wisteriaへの要望チャット

**画面**: `/client/support`

**機能**:
- Wisteriaスタッフとのチャット
- メッセージ履歴
- 未読通知（バッジ）
- ファイル添付

**Wisteria側**:
- 専用の「クライアントサポート」ページ
- 全企業からの要望を一覧表示
- 企業別にフィルタリング
- 未読メッセージの通知

**API**:
- `GET /api/client/support/messages` - サポートメッセージ一覧
- `POST /api/client/support/messages` - メッセージ送信
- `GET /api/admin/support/messages` - Admin: 全企業のメッセージ
- `PATCH /api/admin/support/messages/[id]/read` - Admin: 既読にする

---

## 🎨 デザイン・UX戦略（最重要）

> **コンセプト**: 契約時・契約後の「Wisteriaの顔」として、プロフェッショナルで洗練され、企業が誇れるシステムを構築

### ブランディング戦略

#### Wisteriaの価値を伝える
- **信頼性**: 銀行・金融系のような安心感のあるデザイン
- **先進性**: 最新のデザイントレンドを取り入れた洗練された見た目
- **プロフェッショナル**: 経営層にも見せられる品質
- **使いやすさ**: 誰でも直感的に使える UI/UX

#### カラーパレット

**Primary（メイン）**: オーシャンブルー系
```
- Primary Blue: #0EA5E9 (Sky Blue 500)
- Primary Dark: #0284C7 (Sky Blue 600)
- Primary Light: #38BDF8 (Sky Blue 400)
```

**Secondary（アクセント）**: シアン/ティール系
```
- Accent Cyan: #06B6D4 (Cyan 500)
- Accent Teal: #14B8A6 (Teal 500)
```

**Success（成功・ポジティブ）**: エメラルドグリーン
```
- Success: #10B981 (Emerald 500)
- Success Light: #34D399 (Emerald 400)
```

**Neutral（背景・テキスト）**:
```
- Background: #FAFBFC (ほぼ白、わずかにブルーがかった)
- Surface: #FFFFFF
- Text Primary: #0F172A (Slate 900)
- Text Secondary: #475569 (Slate 600)
```

**差別化**:
- **Wisteria Admin**: インディゴ/パープル系（#6366F1 / #8B5CF6）
- **Client Portal**: オーシャンブルー/シアン系（#0EA5E9 / #06B6D4）

---

### UI/UX設計原則

#### 1. **直感的なナビゲーション**
- **常に現在位置を明示**: パンくずリスト、アクティブメニューのハイライト
- **3クリック以内**: どの機能も3クリック以内でアクセス可能
- **検索機能**: グローバル検索で求人・応募者を即座に検索

#### 2. **ポジティブデータの強調表示**

**ダッシュボードで強調**:
- ✨ **応募数の増加**: 前月比 +15% などを大きく表示
- ✨ **内定率**: 高い内定率を強調（例: 内定率 45%）
- ✨ **応募速度**: 求人掲載から最初の応募までの平均時間
- ✨ **トップパフォーマンス求人**: 最も応募が多い求人をカード表示

**ネガティブデータは控えめに**:
- ❌ 「応募が少ない求人」などは表示しない
- ✅ 「改善のチャンス」などポジティブな表現に変換
- 📊 グラフは常に右肩上がりに見えるよう工夫

#### 3. **プレミアム感のある演出**

**マイクロインタラクション**:
- カードホバー: 浮き上がる + シャドウ強化 + わずかな拡大（scale: 1.02）
- ボタンクリック: リップルエフェクト（波紋）
- データ読み込み: スケルトンスクリーン（美しいプレースホルダー）
- 数値カウントアップ: KPIの数字がアニメーションで増加

**グラデーション多用**:
- カードの背景: 微細なグラデーション（白 → 薄いブルー）
- ボタン: グラデーション（Sky Blue 500 → Cyan 500）
- グラフ: カラフルなグラデーションバー
- アイコン: SVGグラデーション

**シャドウとデプス**:
- 浮遊感: `shadow-lg` `shadow-2xl` を多用
- レイヤー構造: 重要な要素ほど手前に配置

#### 4. **レスポンシブ・モバイルファースト**
- スマホでも快適に使える（採用担当者が移動中に確認）
- タブレット最適化（経営層がiPadで確認）
- デスクトップで最大限の情報表示

---

### コンポーネント設計

#### **トップバー（Client Portal専用）**
```
┌─────────────────────────────────────────────────────────┐
│ [Wisteriaロゴ] [会社名]     ダッシュボード 求人 応募者 分析  │
│                                                         │
│                           [検索🔍] [サポート💬] [👤menu] │
└─────────────────────────────────────────────────────────┘
```

**特徴**:
- グラデーション背景（白 → 薄いブルー）
- 会社名を大きく表示（企業のアイデンティティ）
- サポートアイコンに未読バッジ（Wisteriaへの質問を促進）
- グローバル検索バー（求人・応募者を瞬時に検索）

#### **サイドバー**
```
┌──────────────┐
│ 📊 ダッシュボード │ ← ホーム
│ 📝 求人一覧    │ ← 求人一覧（閲覧のみ）
│ 👥 応募者     │ ← 応募者管理
│ 📈 分析       │ ← レポート・KPI
│ 💬 サポート    │ ← Wisteriaチャット
│ ⚙️  設定      │ ← ユーザー管理
└──────────────┘
```

**特徴**:
- アイコン + テキストで分かりやすい
- アクティブ項目はグラデーションカード
- ホバーで説明ツールチップ表示
- 求人は閲覧専用（編集機能なし）

#### **ダッシュボード（最重要画面）**

**レイアウト**:
```
┌─────────────────────────────────────────────────┐
│ 🎉 今月の応募数: 42件（前月比 +18%↑）             │ ← Hero
├─────────────────────────────────────────────────┤
│ [今月応募] [内定数] [選考中] [応募/求人]          │ ← KPIカード
├─────────────────────────────────────────────────┤
│ 📊 応募数推移（3ヶ月）                           │ ← グラフ
│ ┌────────────────────────────────┐            │
│ │     ╱╲                         │            │
│ │    ╱  ╲      ╱╲               │            │
│ │   ╱    ╲    ╱  ╲              │            │
│ └────────────────────────────────┘            │
├─────────────────────────────────────────────────┤
│ 🌟 トップパフォーマンス求人                       │ ← カード
│ [営業職 - 15件] [エンジニア - 12件]              │
├─────────────────────────────────────────────────┤
│ 📬 最新の応募                                    │ ← リスト
│ • 山田太郎 - 営業職（5分前）[詳細を見る]          │
│ • 佐藤花子 - エンジニア（20分前）[詳細を見る]     │
└─────────────────────────────────────────────────┘
```

**Hero エリア**:
- 大きなグラデーションカード
- 今月の主要KPIを目立たせる
- ポジティブな変化を強調（↑↓アイコン、色分け）

**KPIカード**:
- 4つの主要指標をカード表示
- アイコン + 数値 + 説明
- カウントアップアニメーション
- グラデーション背景

**グラフ**:
- 折れ線グラフ: 応募数推移（右肩上がりに見えるよう調整）
- 円グラフ: 選考ステータスの割合
- 棒グラフ: 求人別応募数ランキング
- すべてグラデーション + アニメーション

**最新の応募**:
- リアルタイム更新（5秒ごと）
- 新しい応募が来たらトースト通知 + 音
- すぐにアクションできるボタン（詳細、ステータス変更）

#### **求人一覧**

**カード表示（デフォルト）**:
```
┌────────────────────┐  ┌────────────────────┐
│ 📝 営業職          │  │ 💻 エンジニア       │
│                   │  │                   │
│ 応募数: 15件      │  │ 応募数: 12件      │
│ 掲載中: 3媒体     │  │ 掲載中: 5媒体     │
│                   │  │                   │
│ [詳細を見る]      │  │ [詳細を見る]      │
└────────────────────┘  └────────────────────┘
```

**特徴**:
- カードサイズが大きめ（情報が見やすい）
- 応募数を大きく強調
- ホバーで詳細情報をツールチップ表示
- グリッド/リスト切り替えボタン
- **編集ボタンなし**（閲覧専用）

#### **応募者詳細**

**2カラムレイアウト**:
```
┌─────────────────────────┬──────────────────┐
│ 山田太郎                 │ ステータス: 書類選考中│
│ 営業職に応募             │ [面接へ進む] [NG]  │
├─────────────────────────┼──────────────────┤
│ 📄 履歴書・職務経歴書     │ 💬 メッセージ      │
│ ┌─────────────────┐   │ ┌──────────────┐ │
│ │ [PDFビューア]     │   │ │ チャット履歴   │ │
│ │                  │   │ │              │ │
│ └─────────────────┘   │ └──────────────┘ │
│                        │ [メッセージ送信]   │
├─────────────────────────┴──────────────────┤
│ 📝 評価・メモ                               │
│ [メモを入力...]                             │
└───────────────────────────────────────────┘
```

**特徴**:
- 左側: 応募者情報・履歴書
- 右側: ステータス変更・メッセージング
- すべてワンスクリーンで完結
- ステータス変更は大きなボタン（ミスを防ぐ）

---

### アニメーション・インタラクション

#### **ページ遷移**
- フェードイン: 新しいページが 200ms でフェードイン
- スライド: カードが下から上にスライドイン（stagger 50ms）

#### **データ読み込み**
- スケルトンスクリーン: グレーのプレースホルダーがパルス
- プログレスバー: 上部に細いプログレスバー（YouTube風）

#### **成功・エラー**
- トースト通知: 右上からスライドイン
  - 成功: 緑のグラデーション + ✓アイコン
  - エラー: 赤のグラデーション + ✗アイコン
- コンフェッティ: 初めて内定を出した時に紙吹雪 🎉

#### **カウントアップ**
- KPI数値: 0 から目標値まで 1秒でカウントアップ
- パーセンテージ: バーがアニメーションで伸びる（500ms）

#### **ホバー**
- カード: `-translate-y-1` + `shadow-lg` + `scale-1.02`
- ボタン: グラデーション強化 + `shadow-md`
- リンク: 下線がスライドイン

---

### 「良いところを見せる」具体例

#### 1. **ポジティブ言語**
- ❌ 「応募がありません」
- ✅ 「まもなく最初の応募が届きます」

- ❌ 「不採用」
- ✅ 「今回は見送り」「別の機会に」

#### 2. **成功体験の強調**
- 🎉 **初応募**: 初めて応募が来た時、大きな祝福メッセージ
- 🏆 **マイルストーン**: 「応募数50件突破！」などを通知
- 📈 **記録更新**: 「今月は過去最高の応募数です！」

#### 3. **比較の工夫**
- ✅ **前月比**: 改善している場合のみ表示
- ✅ **業界平均**: 自社が上回っている指標のみ表示
- ❌ **悪い比較**: 「前月比 -20%」などは表示しない

#### 4. **データの見せ方**
- 📊 **グラフの軸**: 常に右肩上がりに見えるよう Y軸を調整
- 🎨 **色**: 緑（成功）を多用、赤（警告）は最小限
- ✨ **ハイライト**: 良い数値ほど大きく、目立つ位置に

#### 5. **Wisteriaの価値を伝える**
- 💬 **サポートチャット**: 「困ったらいつでもWisteriaに相談」
- 📊 **分析レポート**: 「Wisteriaが提供する高度な分析」
- 🚀 **機能紹介**: 「Wisteriaだけの先進機能」をアピール

---

### モックアップ・プロトタイプ

#### Phase 1: ワイヤーフレーム
- Figma で全画面のワイヤーフレーム作成
- 主要な遷移フローを図示

#### Phase 2: ビジュアルデザイン
- カラーパレット適用
- グラデーション・シャドウ追加
- アイコン・イラスト配置

#### Phase 3: プロトタイプ
- Figma でインタラクティブプロトタイプ
- アニメーション・遷移を実装
- ユーザーテスト実施

#### Phase 4: 実装
- Next.js + Tailwind CSS で実装
- Framer Motion でアニメーション
- 細部まで磨き上げ

---

### デザインシステム

#### **再利用コンポーネント**
- `Button` (Primary, Secondary, Ghost, Danger)
- `Card` (Default, Gradient, Elevated)
- `Input` (Text, Number, Date, Select)
- `Badge` (Status, Count, New)
- `Modal` (Confirm, Form, Full)
- `Toast` (Success, Error, Info, Warning)
- `Chart` (Line, Bar, Pie, Donut)
- `Table` (Sortable, Filterable, Paginated)
- `Avatar` (User, Company)
- `Skeleton` (Card, List, Text)

#### **トークン**
```typescript
const CLIENT_UI = {
  // Colors
  PRIMARY: "from-sky-500 to-cyan-500",
  SUCCESS: "from-emerald-500 to-teal-500",
  WARNING: "from-amber-500 to-orange-500",
  DANGER: "from-rose-500 to-pink-500",

  // Shadows
  SHADOW_SM: "shadow-sm shadow-sky-100/50",
  SHADOW_MD: "shadow-md shadow-sky-200/50",
  SHADOW_LG: "shadow-lg shadow-sky-300/50",
  SHADOW_XL: "shadow-xl shadow-sky-400/50",

  // Transitions
  TRANSITION: "transition-all duration-200",
  TRANSITION_FAST: "transition-all duration-150",
  TRANSITION_SLOW: "transition-all duration-300",

  // Hover
  HOVER_LIFT: "hover:-translate-y-1 hover:shadow-lg",
  HOVER_SCALE: "hover:scale-102",
  HOVER_GLOW: "hover:shadow-lg hover:shadow-sky-500/30",
};
```

---

### 成功の指標

#### **デザインKPI**
- 初回ログイン → 主要機能使用: 5分以内
- ユーザー満足度（NPS）: 70以上
- 「使いやすい」評価: 90%以上
- モバイル利用率: 30%以上

#### **ビジネスKPI**
- 契約成約率: +20%向上
- 契約継続率: +15%向上
- 企業からの紹介率: +30%向上
- サポート問い合わせ: -50%削減

---

## 🔄 Wisteria側との連携仕様

### 1. データ同期

**共有テーブル**:
- `companies` - 会社情報
- `jobs` - 求人情報（企業は閲覧のみ）
- `applicants` - 応募者情報（企業は連携済みのみ編集可能）

**同期方法**:
- **リアルタイム**: 同じDBを直接参照（Supabase RLS で権限制御）
- **双方向**: Client が applicants の status を変更 → Wisteria 側の画面でも即座に反映
- **監査ログ**: 変更履歴を記録（誰がいつ何を変更したか → `audit_logs` テーブル）

### 2. 応募者の企業連携フロー

**Wisteria側の操作**:
1. 応募データがシステムに入る（Indeed等から）
2. Wisteriaスタッフが応募者詳細ページで「企業に連携」ボタンをクリック
3. `applicants.shared_with_client = true` に更新
4. 企業側ポータルで応募者が表示されるようになる

**API**:
```typescript
POST /api/admin/applicants/[id]/share-with-client
// Body: { companyId: string }
// Updates: shared_with_client = true, shared_at = now()
```

### 3. 通知

**Client → Wisteria**:
- 企業がサポートチャットでメッセージ送信 → Wisteria スタッフに通知
- 企業が応募者のステータスを変更 → Wisteria側に即座に反映（通知はオプション）

**Wisteria → Client**:
- Wisteriaが応募者を連携 → 企業ユーザーにメール/アプリ内通知
- Wisteria がサポートチャットで返信 → 企業ユーザーに通知

### 4. Wisteria側の新機能

**応募者詳細画面の拡張**: `/applicants/[id]`
- 「企業ポータルに連携」ボタン追加
- 連携済みかどうかのステータス表示
- 連携日時の表示

**クライアントサポート画面**: `/admin/client-support`
- 全企業からのサポートメッセージを一覧表示
- 企業別にフィルタリング
- 未読メッセージの通知バッジ
- 返信機能

**企業管理画面の拡張**: `/companies/[id]`
- 「Client Portal ユーザー管理」タブ追加
- 企業ユーザーの追加・削除・権限変更
- ログインリンクの発行

---

## 🚀 開発フェーズ

### Phase 1: 基盤構築（1-2週間）
- [ ] データベーススキーマ設計
  - [ ] `client_users` テーブル作成
  - [ ] `client_support_messages` テーブル作成
  - [ ] `client_applicant_messages` テーブル作成
  - [ ] `audit_logs` テーブル作成
  - [ ] `workspace_members` に `role`, `company_id` カラム追加
  - [ ] `applicants` に `shared_with_client`, `shared_at` カラム追加
- [ ] マイグレーションSQL作成・実行
- [ ] 認証システム構築（Client login/logout）
- [ ] Middleware実装（アクセス制御）
- [ ] RLSポリシー設定
- [ ] Client Portal レイアウト（TopBar/Sidebar）

### Phase 2: コア機能（2-3週間）
- [ ] 求人一覧・詳細（閲覧のみ）
- [ ] 応募者一覧・詳細（連携済みのみ表示）
- [ ] 選考ステータス更新機能
- [ ] Wisteria Admin: 応募者連携ボタン実装
  - [ ] `/applicants/[id]` に「企業に連携」ボタン追加
  - [ ] `POST /api/admin/applicants/[id]/share-with-client` API実装
- [ ] Wisteria側との同期確認

### Phase 3: コミュニケーション（1-2週間）
- [ ] 応募者とのメッセージング
- [ ] Wisteriaへのサポートチャット
- [ ] 通知機能（未読バッジ）

### Phase 4: 分析・レポート（1週間）
- [ ] ダッシュボード
- [ ] 分析画面（グラフ・KPI）

### Phase 5: テスト・リリース（1週間）
- [ ] セキュリティテスト（RLS、アクセス制御）
- [ ] E2Eテスト
- [ ] 本番環境デプロイ

**合計**: 6-9週間

---

## ⚠️ セキュリティ考慮事項

### リスクと対策

#### 1. データ漏洩リスク
**リスク**: Client ユーザーが他社のデータにアクセス

**対策**:
- ✅ Supabase RLS で行レベルのアクセス制御
- ✅ すべてのAPI routeで `company_id` をチェック
- ✅ Middleware で `/client/*` へのアクセスを厳格に制御
- ✅ セッションに `company_id` を含め、すべてのクエリでフィルタ

#### 2. 権限昇格リスク
**リスク**: Client ユーザーが Admin 機能にアクセス

**対策**:
- ✅ Middleware で `/client/*` 以外へのアクセスをブロック
- ✅ `workspace_members.role` で厳格に分離
- ✅ Admin 専用 API は `/api/admin/*` に配置し、client からアクセス不可

#### 3. CSRF/XSS リスク
**対策**:
- ✅ Next.js のビルトイン CSRF 対策
- ✅ 入力値のサニタイゼーション
- ✅ Content Security Policy 設定

#### 4. SQL Injection リスク
**対策**:
- ✅ Supabase クライアントを使用（パラメータ化クエリ）
- ✅ 直接SQLを書かない

---

## 📊 監視・ログ

### ログ項目
- 企業ユーザーのログイン/ログアウト
- 応募者ステータスの変更（誰が、いつ、何を変更したか）
- 求人の作成・編集・削除
- サポートメッセージの送受信

### 監査テーブル
```sql
CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  company_id text,
  action text NOT NULL, -- 'applicant_status_change', 'job_created', etc.
  resource_type text, -- 'applicant', 'job', 'message'
  resource_id text,
  old_value jsonb,
  new_value jsonb,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_audit_logs_company_id ON audit_logs(company_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
```

---

## 🎯 成功指標（KPI）

### 開発KPI
- [ ] Phase 1-5 を予定通り完了
- [ ] セキュリティテスト 0件のクリティカル脆弱性
- [ ] E2Eテストカバレッジ 80%以上
- [ ] RLSポリシーの完全性（他社データアクセス不可を保証）

### ビジネスKPI（リリース後）
- 企業の選考業務時間 30%削減
- Wisteriaスタッフの問い合わせ対応時間 50%削減
- Client Portal ユーザーの月間アクティブ率 80%以上
- 契約成約率 +20%向上
- 契約継続率 +15%向上

### ユーザー体験KPI
- 初回ログイン → 主要機能使用: 5分以内
- ユーザー満足度（NPS）: 70以上
- 「使いやすい」評価: 90%以上
- モバイル利用率: 30%以上

---

## 🎯 重要ポイント（まとめ）

### 企業ユーザーの権限範囲（最重要）
1. **求人**: 閲覧のみ（作成・編集・削除は Wisteria が運用）
2. **応募者**: Wisteria が「連携」操作した後に見える
3. **選考管理**: 企業は応募者の選考ステータス管理のみ実施
4. **データ分離**: RLS で企業別に完全分離、他社データにアクセス不可

### 応募〜選考フロー
```
応募受付 → Wisteriaシステム → Wisteriaが企業に連携 → 企業が選考管理
```

### デザイン戦略
- **Wisteriaの顔**: プロフェッショナルで洗練されたデザイン
- **カラー**: オーシャンブルー系（Admin側はインディゴ/パープル系）
- **ポジティブデータ強調**: 応募数増加、内定率などを大きく表示
- **プレミアム感**: グラデーション、アニメーション多用

### セキュリティ
- Middleware でアクセス制御
- Supabase RLS で行レベルセキュリティ
- すべての API で `company_id` 検証
- 監査ログで変更履歴記録

---

## 📝 Next Steps

1. **このドキュメントのレビュー**
   - 要件の過不足確認
   - 優先順位の調整

2. **技術スタック確認**
   - Next.js 16.1 (App Router)
   - Supabase (PostgreSQL + Auth + RLS)
   - TypeScript
   - Tailwind CSS v4

3. **Phase 1 開始**
   - データベーススキーマ設計
   - マイグレーションSQL作成
   - 認証システム実装

準備完了したら開始しましょう！ 🚀
