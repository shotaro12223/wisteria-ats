-- Migration 010: Admin Notifications Table
-- Date: 2026-01-27
-- Purpose: Create admin_notifications table for system alerts to administrators

-- Create admin_notifications table
CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  category TEXT NOT NULL DEFAULT 'system' CHECK (category IN ('gmail_sync', 'system', 'security', 'data')),
  details JSONB,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for user_id + is_read (for efficient dashboard queries)
CREATE INDEX IF NOT EXISTS idx_admin_notifications_user_unread
  ON admin_notifications(user_id, is_read)
  WHERE is_read = FALSE;

-- Create index for created_at (for sorting)
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at
  ON admin_notifications(created_at DESC);

-- Create index for severity (for filtering critical alerts)
CREATE INDEX IF NOT EXISTS idx_admin_notifications_severity
  ON admin_notifications(severity)
  WHERE severity IN ('error', 'critical');

-- RLS policies
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view their own notifications
CREATE POLICY "Admins can view their own notifications"
  ON admin_notifications
  FOR SELECT
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.user_id = auth.uid()
      AND workspace_members.role = 'admin'
    )
  );

-- Policy: Admins can update their own notifications (mark as read)
CREATE POLICY "Admins can update their own notifications"
  ON admin_notifications
  FOR UPDATE
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.user_id = auth.uid()
      AND workspace_members.role = 'admin'
    )
  );

-- Policy: System can insert notifications (service role only)
CREATE POLICY "System can insert admin notifications"
  ON admin_notifications
  FOR INSERT
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE admin_notifications IS 'システム管理者向け通知（Gmail同期エラー、セキュリティアラートなど）';
