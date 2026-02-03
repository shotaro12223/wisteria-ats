-- Interview Availability Table
-- Stores dates/times when the client is available for interviews

CREATE TABLE IF NOT EXISTS interview_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_user_id UUID NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,
  available_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  note TEXT,
  is_booked BOOLEAN DEFAULT FALSE,
  booked_applicant_id TEXT REFERENCES applicants(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure end_time is after start_time
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_interview_availability_company ON interview_availability(company_id);
CREATE INDEX IF NOT EXISTS idx_interview_availability_date ON interview_availability(available_date);
CREATE INDEX IF NOT EXISTS idx_interview_availability_client_user ON interview_availability(client_user_id);

-- RLS Policies
ALTER TABLE interview_availability ENABLE ROW LEVEL SECURITY;

-- Policy for client users to manage their own company's availability
CREATE POLICY "client_users_manage_availability" ON interview_availability
  FOR ALL
  USING (
    company_id IN (
      SELECT cu.company_id FROM client_users cu
      WHERE cu.user_id = auth.uid() AND cu.is_active = TRUE
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT cu.company_id FROM client_users cu
      WHERE cu.user_id = auth.uid() AND cu.is_active = TRUE
    )
  );

-- Policy for service role (admin) to access all
CREATE POLICY "service_role_full_access_availability" ON interview_availability
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
