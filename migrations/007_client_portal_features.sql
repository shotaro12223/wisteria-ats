-- ================================================
-- Client Portal Premium Features
-- 1. Client comments on applicants
-- 2. Client tags/labels for applicants
-- 3. Client notifications history
-- 4. Interview schedules (confirmed interviews)
-- ================================================

-- 1. Client Comments Table
-- クライアントが応募者にメモを残せる
CREATE TABLE IF NOT EXISTS client_applicant_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id TEXT NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
  client_user_id UUID NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_comments_applicant ON client_applicant_comments(applicant_id);
CREATE INDEX IF NOT EXISTS idx_client_comments_company ON client_applicant_comments(company_id);

ALTER TABLE client_applicant_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_users_manage_comments" ON client_applicant_comments;
CREATE POLICY "client_users_manage_comments" ON client_applicant_comments
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

-- 2. Client Tags Table
-- カスタムタグ定義
CREATE TABLE IF NOT EXISTS client_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1', -- indigo
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_client_tags_company ON client_tags(company_id);

ALTER TABLE client_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_users_manage_tags" ON client_tags;
CREATE POLICY "client_users_manage_tags" ON client_tags
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

-- 3. Applicant Tags Junction Table
-- 応募者にタグを付ける
CREATE TABLE IF NOT EXISTS client_applicant_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id TEXT NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES client_tags(id) ON DELETE CASCADE,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(applicant_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_applicant_tags_applicant ON client_applicant_tags(applicant_id);
CREATE INDEX IF NOT EXISTS idx_applicant_tags_company ON client_applicant_tags(company_id);

ALTER TABLE client_applicant_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_users_manage_applicant_tags" ON client_applicant_tags;
CREATE POLICY "client_users_manage_applicant_tags" ON client_applicant_tags
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

-- 4. Client Notifications Table
-- 通知履歴
CREATE TABLE IF NOT EXISTS client_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_user_id UUID REFERENCES client_users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  url TEXT,
  type TEXT NOT NULL DEFAULT 'info', -- info, applicant, interview, system
  reference_id TEXT, -- applicant_id or other reference
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_notifications_company ON client_notifications(company_id);
CREATE INDEX IF NOT EXISTS idx_client_notifications_user ON client_notifications(client_user_id);
CREATE INDEX IF NOT EXISTS idx_client_notifications_unread ON client_notifications(company_id, is_read) WHERE is_read = FALSE;

ALTER TABLE client_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_users_view_notifications" ON client_notifications;
CREATE POLICY "client_users_view_notifications" ON client_notifications
  FOR SELECT
  USING (
    company_id IN (
      SELECT cu.company_id FROM client_users cu
      WHERE cu.user_id = auth.uid() AND cu.is_active = TRUE
    )
  );

DROP POLICY IF EXISTS "client_users_update_notifications" ON client_notifications;
CREATE POLICY "client_users_update_notifications" ON client_notifications
  FOR UPDATE
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

-- 5. Interview Schedules Table
-- 確定した面接スケジュール
CREATE TABLE IF NOT EXISTS interview_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  applicant_id TEXT NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
  job_id TEXT REFERENCES jobs(id) ON DELETE SET NULL,
  interview_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  location TEXT,
  interview_type TEXT DEFAULT 'onsite', -- onsite, online, phone
  meeting_url TEXT,
  notes TEXT,
  status TEXT DEFAULT 'scheduled', -- scheduled, completed, cancelled, no_show
  availability_id UUID REFERENCES interview_availability(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interview_schedules_company ON interview_schedules(company_id);
CREATE INDEX IF NOT EXISTS idx_interview_schedules_applicant ON interview_schedules(applicant_id);
CREATE INDEX IF NOT EXISTS idx_interview_schedules_date ON interview_schedules(interview_date);

ALTER TABLE interview_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_users_view_interviews" ON interview_schedules;
CREATE POLICY "client_users_view_interviews" ON interview_schedules
  FOR SELECT
  USING (
    company_id IN (
      SELECT cu.company_id FROM client_users cu
      WHERE cu.user_id = auth.uid() AND cu.is_active = TRUE
    )
  );

-- Service role full access for all new tables
DROP POLICY IF EXISTS "service_role_comments" ON client_applicant_comments;
CREATE POLICY "service_role_comments" ON client_applicant_comments
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "service_role_tags" ON client_tags;
CREATE POLICY "service_role_tags" ON client_tags
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "service_role_applicant_tags" ON client_applicant_tags;
CREATE POLICY "service_role_applicant_tags" ON client_applicant_tags
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "service_role_notifications" ON client_notifications;
CREATE POLICY "service_role_notifications" ON client_notifications
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "service_role_interviews" ON interview_schedules;
CREATE POLICY "service_role_interviews" ON interview_schedules
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Add favorite column to track applicant favorites per company
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS is_favorite_by_client BOOLEAN DEFAULT FALSE;
