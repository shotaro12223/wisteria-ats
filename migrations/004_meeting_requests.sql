-- =============================================
-- Meeting Requests Table for Client Portal
-- =============================================
-- クライアントが打ち合わせを希望 → 管理者が候補日を提示 → クライアントが確定

-- Create meeting_requests table
CREATE TABLE IF NOT EXISTS meeting_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_user_id UUID NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,

  -- Request details
  subject TEXT NOT NULL,
  note TEXT,

  -- Status: pending → dates_proposed → confirmed → completed / cancelled
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'dates_proposed', 'confirmed', 'completed', 'cancelled')
  ),

  -- Admin proposes dates (array of ISO datetime strings)
  proposed_dates JSONB DEFAULT '[]'::jsonb,

  -- Client confirms one of the proposed dates
  confirmed_date TIMESTAMPTZ,

  -- Admin message to client
  admin_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_meeting_requests_company_id ON meeting_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_meeting_requests_client_user_id ON meeting_requests(client_user_id);
CREATE INDEX IF NOT EXISTS idx_meeting_requests_status ON meeting_requests(status);
CREATE INDEX IF NOT EXISTS idx_meeting_requests_created_at ON meeting_requests(created_at DESC);

-- Enable RLS
ALTER TABLE meeting_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Clients can view their own company's meeting requests
CREATE POLICY "client_view_own_company_meeting_requests"
  ON meeting_requests
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM client_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Clients can create meeting requests for their own company
CREATE POLICY "client_create_meeting_requests"
  ON meeting_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM client_users
      WHERE user_id = auth.uid() AND is_active = true
    )
    AND client_user_id IN (
      SELECT id FROM client_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Clients can update their own meeting requests (to confirm dates)
CREATE POLICY "client_update_own_meeting_requests"
  ON meeting_requests
  FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM client_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM client_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Admin users (non-client users) can view all meeting requests
CREATE POLICY "admin_view_all_meeting_requests"
  ON meeting_requests
  FOR SELECT
  TO authenticated
  USING (
    NOT EXISTS (
      SELECT 1 FROM client_users
      WHERE user_id = auth.uid()
    )
  );

-- Admin users can update any meeting request
CREATE POLICY "admin_update_meeting_requests"
  ON meeting_requests
  FOR UPDATE
  TO authenticated
  USING (
    NOT EXISTS (
      SELECT 1 FROM client_users
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    NOT EXISTS (
      SELECT 1 FROM client_users
      WHERE user_id = auth.uid()
    )
  );

-- Admin users can delete any meeting request
CREATE POLICY "admin_delete_meeting_requests"
  ON meeting_requests
  FOR DELETE
  TO authenticated
  USING (
    NOT EXISTS (
      SELECT 1 FROM client_users
      WHERE user_id = auth.uid()
    )
  );
