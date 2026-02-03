-- ================================================
-- Client Portal Migration
-- ================================================
-- Phase 1: Database Schema Setup for Client Portal
-- Date: 2026-01-22
-- ================================================

-- ================================================
-- 1. Extend existing tables
-- ================================================

-- Add company_id to workspace_members
ALTER TABLE workspace_members
ADD COLUMN IF NOT EXISTS company_id text REFERENCES companies(id);

-- Add constraint: client users must have company_id
ALTER TABLE workspace_members
DROP CONSTRAINT IF EXISTS check_client_has_company;

ALTER TABLE workspace_members
ADD CONSTRAINT check_client_has_company
CHECK (role != 'client' OR company_id IS NOT NULL);

-- Add shared flags to applicants
ALTER TABLE applicants
ADD COLUMN IF NOT EXISTS shared_with_client boolean DEFAULT false;

ALTER TABLE applicants
ADD COLUMN IF NOT EXISTS shared_at timestamp with time zone;

-- Create index for filtering shared applicants
CREATE INDEX IF NOT EXISTS idx_applicants_shared_with_client
ON applicants(company_id, shared_with_client)
WHERE shared_with_client = true;

-- ================================================
-- 2. Create new tables
-- ================================================

-- Client Users (企業ユーザー)
CREATE TABLE IF NOT EXISTS client_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id text NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  display_name text,
  email text NOT NULL,
  role text DEFAULT 'member', -- member, admin (企業内の役割)
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_users_company_id ON client_users(company_id);
CREATE INDEX IF NOT EXISTS idx_client_users_user_id ON client_users(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_users_email ON client_users(email);

-- Client Support Messages (Wisteriaへの要望チャット)
CREATE TABLE IF NOT EXISTS client_support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  user_name text,
  message text NOT NULL,
  is_from_client boolean DEFAULT true, -- true: 企業から, false: Wisteriaから
  read_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_support_messages_company_id
ON client_support_messages(company_id);

CREATE INDEX IF NOT EXISTS idx_client_support_messages_created_at
ON client_support_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_support_messages_unread
ON client_support_messages(company_id, is_from_client)
WHERE read_at IS NULL;

-- Client Applicant Messages (応募者とのメッセージング)
CREATE TABLE IF NOT EXISTS client_applicant_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id text NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
  company_id text NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  message text NOT NULL,
  is_from_company boolean DEFAULT true,
  attachments jsonb,
  read_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_applicant_messages_applicant_id
ON client_applicant_messages(applicant_id);

CREATE INDEX IF NOT EXISTS idx_client_applicant_messages_company_id
ON client_applicant_messages(company_id);

CREATE INDEX IF NOT EXISTS idx_client_applicant_messages_created_at
ON client_applicant_messages(created_at DESC);

-- Audit Logs (監査ログ)
CREATE TABLE IF NOT EXISTS audit_logs (
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

CREATE INDEX IF NOT EXISTS idx_audit_logs_company_id ON audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- ================================================
-- 3. Row Level Security Policies
-- ================================================

-- Enable RLS on new tables
ALTER TABLE client_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_applicant_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ================================================
-- Client Users Policies
-- ================================================

-- Client users can view other users in their company
CREATE POLICY "Client users view own company members"
ON client_users FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT cu.company_id FROM client_users cu
    WHERE cu.user_id = auth.uid()
  )
);

-- Only admins can insert/update client users (handled via admin API)
-- No INSERT/UPDATE policies for regular client users

-- ================================================
-- Applicants Policies (Update existing)
-- ================================================

-- Drop existing policy to replace with new ones
DROP POLICY IF EXISTS "members full access applicants" ON applicants;

-- Admin (workspace_members) full access
CREATE POLICY "Admin full access to applicants"
ON applicants FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.user_id = auth.uid()
    AND wm.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.user_id = auth.uid()
    AND wm.role = 'admin'
  )
);

-- Client users can only see shared applicants
CREATE POLICY "Client users view shared applicants"
ON applicants FOR SELECT
TO authenticated
USING (
  shared_with_client = true
  AND EXISTS (
    SELECT 1 FROM client_users cu
    WHERE cu.user_id = auth.uid()
    AND cu.company_id = applicants.company_id
    AND cu.is_active = true
  )
);

-- Client users can update shared applicants (status, notes)
CREATE POLICY "Client users update shared applicants"
ON applicants FOR UPDATE
TO authenticated
USING (
  shared_with_client = true
  AND EXISTS (
    SELECT 1 FROM client_users cu
    WHERE cu.user_id = auth.uid()
    AND cu.company_id = applicants.company_id
    AND cu.is_active = true
  )
)
WITH CHECK (
  shared_with_client = true
  AND EXISTS (
    SELECT 1 FROM client_users cu
    WHERE cu.user_id = auth.uid()
    AND cu.company_id = applicants.company_id
    AND cu.is_active = true
  )
);

-- ================================================
-- Jobs Policies (Update existing)
-- ================================================

-- Client users can view their company's jobs (read-only)
CREATE POLICY "Client users view own company jobs"
ON jobs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM client_users cu
    WHERE cu.user_id = auth.uid()
    AND cu.company_id = jobs.company_id
    AND cu.is_active = true
  )
);

-- Client users CANNOT update jobs (Wisteria manages jobs)

-- ================================================
-- Client Support Messages Policies
-- ================================================

-- Client users can view messages for their company
CREATE POLICY "Client users view own company support messages"
ON client_support_messages FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT cu.company_id FROM client_users cu
    WHERE cu.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.user_id = auth.uid()
    AND wm.role = 'admin'
  )
);

-- Client users can insert messages for their company
CREATE POLICY "Client users send support messages"
ON client_support_messages FOR INSERT
TO authenticated
WITH CHECK (
  company_id IN (
    SELECT cu.company_id FROM client_users cu
    WHERE cu.user_id = auth.uid()
    AND cu.is_active = true
  )
  AND is_from_client = true
);

-- Admins can insert messages to any company
CREATE POLICY "Admins send support messages"
ON client_support_messages FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.user_id = auth.uid()
    AND wm.role = 'admin'
  )
  AND is_from_client = false
);

-- Admins can update read status
CREATE POLICY "Admins update support message read status"
ON client_support_messages FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.user_id = auth.uid()
    AND wm.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.user_id = auth.uid()
    AND wm.role = 'admin'
  )
);

-- ================================================
-- Client Applicant Messages Policies
-- ================================================

-- Client users can view messages for shared applicants
CREATE POLICY "Client users view applicant messages"
ON client_applicant_messages FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT cu.company_id FROM client_users cu
    WHERE cu.user_id = auth.uid()
    AND cu.is_active = true
  )
  AND EXISTS (
    SELECT 1 FROM applicants a
    WHERE a.id = client_applicant_messages.applicant_id
    AND a.shared_with_client = true
  )
);

-- Client users can send messages to shared applicants
CREATE POLICY "Client users send applicant messages"
ON client_applicant_messages FOR INSERT
TO authenticated
WITH CHECK (
  company_id IN (
    SELECT cu.company_id FROM client_users cu
    WHERE cu.user_id = auth.uid()
    AND cu.is_active = true
  )
  AND EXISTS (
    SELECT 1 FROM applicants a
    WHERE a.id = client_applicant_messages.applicant_id
    AND a.shared_with_client = true
    AND a.company_id = client_applicant_messages.company_id
  )
);

-- ================================================
-- Audit Logs Policies
-- ================================================

-- Admins can view all audit logs
CREATE POLICY "Admins view all audit logs"
ON audit_logs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.user_id = auth.uid()
    AND wm.role = 'admin'
  )
);

-- Client users can view their company's audit logs
CREATE POLICY "Client users view own company audit logs"
ON audit_logs FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT cu.company_id FROM client_users cu
    WHERE cu.user_id = auth.uid()
  )
);

-- System can insert audit logs
CREATE POLICY "System insert audit logs"
ON audit_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- ================================================
-- Triggers
-- ================================================

-- Auto-update updated_at for client_users
CREATE OR REPLACE FUNCTION update_client_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_client_users_updated_at
BEFORE UPDATE ON client_users
FOR EACH ROW
EXECUTE FUNCTION update_client_users_updated_at();

-- ================================================
-- Helper Functions
-- ================================================

-- Check if user is a client user
CREATE OR REPLACE FUNCTION is_client_user()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM client_users cu
    WHERE cu.user_id = auth.uid()
    AND cu.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's company_id
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS text AS $$
BEGIN
  RETURN (
    SELECT cu.company_id FROM client_users cu
    WHERE cu.user_id = auth.uid()
    AND cu.is_active = true
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- Migration Complete
-- ================================================
-- Run this script in Supabase SQL Editor
-- Verify all tables and policies are created correctly
-- ================================================
