-- =============================================
-- Web Push Notification System
-- =============================================
-- PWA + Web Push通知のためのサブスクリプション管理

-- Push subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_user_id UUID NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,

  -- Web Push subscription data
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,  -- Public key
  auth TEXT NOT NULL,    -- Auth secret

  -- Device info (optional, for management)
  user_agent TEXT,
  device_name TEXT,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,

  -- Prevent duplicate subscriptions for same endpoint
  UNIQUE(endpoint)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_client_user ON push_subscriptions(client_user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS: Clients can view their own subscriptions
CREATE POLICY "client_view_own_push_subscriptions"
  ON push_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    client_user_id IN (
      SELECT id FROM client_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- RLS: Clients can create their own subscriptions
CREATE POLICY "client_create_push_subscriptions"
  ON push_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    client_user_id IN (
      SELECT id FROM client_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- RLS: Clients can update their own subscriptions
CREATE POLICY "client_update_own_push_subscriptions"
  ON push_subscriptions
  FOR UPDATE
  TO authenticated
  USING (
    client_user_id IN (
      SELECT id FROM client_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- RLS: Clients can delete their own subscriptions
CREATE POLICY "client_delete_own_push_subscriptions"
  ON push_subscriptions
  FOR DELETE
  TO authenticated
  USING (
    client_user_id IN (
      SELECT id FROM client_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- RLS: Admin can view all subscriptions (for sending notifications)
CREATE POLICY "admin_view_all_push_subscriptions"
  ON push_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    NOT EXISTS (
      SELECT 1 FROM client_users
      WHERE user_id = auth.uid()
    )
  );

-- Notification log table (for tracking sent notifications)
CREATE TABLE IF NOT EXISTS push_notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Target (can be specific user, company, or all)
  client_user_id UUID REFERENCES client_users(id) ON DELETE SET NULL,
  company_id TEXT REFERENCES companies(id) ON DELETE SET NULL,

  -- Notification content
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  url TEXT,
  data JSONB,

  -- Delivery stats
  total_sent INTEGER DEFAULT 0,
  total_success INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_push_notification_logs_created ON push_notification_logs(created_at DESC);
