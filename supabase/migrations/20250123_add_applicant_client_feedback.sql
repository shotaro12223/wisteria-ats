-- ============================================
-- 企業側フィードバックテーブル
-- applicant_client_feedback
-- ============================================

-- 面接結果を企業が入力するためのテーブル
-- Wisteria側の管理ステータス(applicants.status)とは別に、
-- 企業側が面接後の評価・結果を記録できる

CREATE TABLE IF NOT EXISTS applicant_client_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 関連
  applicant_id TEXT NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_user_id UUID NOT NULL REFERENCES client_users(id) ON DELETE SET NULL,

  -- 面接情報
  interview_type TEXT NOT NULL CHECK (interview_type IN ('first', 'second', 'final', 'casual', 'trial')),
  interview_date DATE NOT NULL,
  interviewer_name TEXT,

  -- 面接結果
  interview_result TEXT NOT NULL CHECK (interview_result IN ('pass', 'fail', 'pending', 'no_show')),

  -- 不合格の場合の理由
  fail_reason TEXT CHECK (fail_reason IN (
    'culture_mismatch',    -- 社風に合わない
    'skill_shortage',      -- スキル不足
    'experience_lack',     -- 経験不足
    'communication',       -- コミュニケーション面
    'motivation',          -- 意欲・志望度が低い
    'salary_mismatch',     -- 条件面（給与）が合わない
    'schedule_mismatch',   -- 勤務条件が合わない
    'appearance',          -- 身だしなみ・印象
    'overqualified',       -- オーバースペック
    'other'                -- その他
  )),
  fail_reason_detail TEXT,

  -- 合格の場合の評価
  pass_rating INTEGER CHECK (pass_rating >= 1 AND pass_rating <= 5),
  pass_strengths TEXT[], -- 良かった点（配列）
  pass_comment TEXT,

  -- 採用意向
  hire_intention TEXT CHECK (hire_intention IN ('strong_yes', 'yes', 'maybe', 'no')),

  -- 次のアクション
  next_action TEXT,

  -- メタ
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_applicant_client_feedback_applicant_id ON applicant_client_feedback(applicant_id);
CREATE INDEX IF NOT EXISTS idx_applicant_client_feedback_company_id ON applicant_client_feedback(company_id);
CREATE INDEX IF NOT EXISTS idx_applicant_client_feedback_interview_date ON applicant_client_feedback(interview_date);
CREATE INDEX IF NOT EXISTS idx_applicant_client_feedback_interview_result ON applicant_client_feedback(interview_result);
CREATE INDEX IF NOT EXISTS idx_applicant_client_feedback_fail_reason ON applicant_client_feedback(fail_reason);

-- RLS有効化
ALTER TABLE applicant_client_feedback ENABLE ROW LEVEL SECURITY;

-- ポリシー: 企業ユーザーは自社のフィードバックのみアクセス可能
DROP POLICY IF EXISTS "client_users_can_view_own_company_feedback" ON applicant_client_feedback;
CREATE POLICY "client_users_can_view_own_company_feedback" ON applicant_client_feedback
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM client_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "client_users_can_insert_own_company_feedback" ON applicant_client_feedback;
CREATE POLICY "client_users_can_insert_own_company_feedback" ON applicant_client_feedback
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM client_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "client_users_can_update_own_company_feedback" ON applicant_client_feedback;
CREATE POLICY "client_users_can_update_own_company_feedback" ON applicant_client_feedback
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM client_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "client_users_can_delete_own_company_feedback" ON applicant_client_feedback;
CREATE POLICY "client_users_can_delete_own_company_feedback" ON applicant_client_feedback
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM client_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- 管理者は全てアクセス可能（service_role経由）
-- service_roleはRLSをバイパスするため、別途ポリシーは不要

-- コメント
COMMENT ON TABLE applicant_client_feedback IS '企業側の面接フィードバック。Wisteria管理のステータスとは別に、企業が面接結果を記録。';
COMMENT ON COLUMN applicant_client_feedback.interview_type IS '面接タイプ: first=一次, second=二次, final=最終, casual=カジュアル, trial=体験';
COMMENT ON COLUMN applicant_client_feedback.interview_result IS '面接結果: pass=合格, fail=不合格, pending=保留, no_show=無断欠席';
COMMENT ON COLUMN applicant_client_feedback.fail_reason IS '不合格理由カテゴリ';
COMMENT ON COLUMN applicant_client_feedback.pass_rating IS '合格時の評価(1-5)';
COMMENT ON COLUMN applicant_client_feedback.pass_strengths IS '合格時の良かった点(配列)';
COMMENT ON COLUMN applicant_client_feedback.hire_intention IS '採用意向: strong_yes=ぜひ採用, yes=採用, maybe=検討中, no=見送り';
