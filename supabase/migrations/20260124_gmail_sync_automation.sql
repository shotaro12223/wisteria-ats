-- ============================================
-- Gmail同期自動化のためのスキーマ拡張
-- Created: 2026-01-24
-- ============================================

-- gmail_connections テーブルに差分同期用フィールドを追加
ALTER TABLE gmail_connections
ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_sync_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS last_sync_error TEXT,
ADD COLUMN IF NOT EXISTS total_synced INTEGER DEFAULT 0;

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_gmail_connections_last_sync
  ON gmail_connections(last_sync_at DESC NULLS LAST);

-- コメント追加
COMMENT ON COLUMN gmail_connections.last_sync_at IS '最終同期完了日時（UTC）。差分同期の基準時刻として使用';
COMMENT ON COLUMN gmail_connections.last_sync_status IS '最終同期ステータス: pending/success/error';
COMMENT ON COLUMN gmail_connections.last_sync_error IS '最終同期エラーメッセージ（エラー時のみ設定）';
COMMENT ON COLUMN gmail_connections.total_synced IS '累計同期メッセージ数';

-- ============================================
-- gmail_sync_logs テーブル（同期履歴の記録）
-- ============================================

CREATE TABLE IF NOT EXISTS gmail_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id TEXT NOT NULL REFERENCES gmail_connections(id) ON DELETE CASCADE,

  -- 同期情報
  sync_type TEXT NOT NULL CHECK (sync_type IN ('full', 'incremental')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- 結果
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'error')) DEFAULT 'running',
  error_message TEXT,

  -- 統計
  messages_fetched INTEGER DEFAULT 0,
  messages_inserted INTEGER DEFAULT 0,
  messages_updated INTEGER DEFAULT 0,

  -- メタデータ
  query_used TEXT,  -- Gmail API クエリ文字列（例: after:2026/01/23）
  execution_time_ms INTEGER,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_gmail_sync_logs_connection
  ON gmail_sync_logs(connection_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_gmail_sync_logs_status
  ON gmail_sync_logs(status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_gmail_sync_logs_time_range
  ON gmail_sync_logs(started_at DESC);

-- コメント
COMMENT ON TABLE gmail_sync_logs IS 'Gmail同期の実行履歴。トラブルシューティングやパフォーマンス監視に使用';
COMMENT ON COLUMN gmail_sync_logs.sync_type IS 'full=全件同期, incremental=差分同期';
COMMENT ON COLUMN gmail_sync_logs.query_used IS 'Gmail APIに渡されたクエリ文字列（差分同期時は after:YYYY/MM/DD など）';
COMMENT ON COLUMN gmail_sync_logs.execution_time_ms IS '同期処理の実行時間（ミリ秒）';
