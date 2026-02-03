-- =============================================
-- LINE Notification Integration
-- =============================================
-- クライアントユーザーがLINEで通知を受け取るための連携機能

-- Add LINE-related columns to client_users
ALTER TABLE client_users
ADD COLUMN IF NOT EXISTS line_user_id TEXT,
ADD COLUMN IF NOT EXISTS line_linked_at TIMESTAMPTZ;

-- Create index for LINE user ID lookups
CREATE INDEX IF NOT EXISTS idx_client_users_line_user_id ON client_users(line_user_id);

-- Create LINE linking codes table
-- 一時的な連携コードを保存（有効期限付き）
CREATE TABLE IF NOT EXISTS line_linking_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_user_id UUID NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for code lookups
CREATE INDEX IF NOT EXISTS idx_line_linking_codes_code ON line_linking_codes(code);
CREATE INDEX IF NOT EXISTS idx_line_linking_codes_expires ON line_linking_codes(expires_at);

-- Enable RLS
ALTER TABLE line_linking_codes ENABLE ROW LEVEL SECURITY;

-- RLS: Clients can view their own linking codes
CREATE POLICY "client_view_own_linking_codes"
  ON line_linking_codes
  FOR SELECT
  TO authenticated
  USING (
    client_user_id IN (
      SELECT id FROM client_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- RLS: Clients can create their own linking codes
CREATE POLICY "client_create_linking_codes"
  ON line_linking_codes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    client_user_id IN (
      SELECT id FROM client_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- RLS: Admin can view all linking codes
CREATE POLICY "admin_view_all_linking_codes"
  ON line_linking_codes
  FOR SELECT
  TO authenticated
  USING (
    NOT EXISTS (
      SELECT 1 FROM client_users
      WHERE user_id = auth.uid()
    )
  );

-- Create LINE notification log table (optional, for debugging)
CREATE TABLE IF NOT EXISTS line_notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_user_id UUID REFERENCES client_users(id) ON DELETE SET NULL,
  line_user_id TEXT NOT NULL,
  message_type TEXT NOT NULL,
  message_content TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_line_notification_logs_client ON line_notification_logs(client_user_id);
CREATE INDEX IF NOT EXISTS idx_line_notification_logs_created ON line_notification_logs(created_at DESC);
