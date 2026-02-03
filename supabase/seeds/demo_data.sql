-- ============================================
-- デモ用データ シードスクリプト
-- ============================================
--
-- 【使用方法】
-- 1. 管理画面で以下を作成:
--    a. /admin/companies で「株式会社サンプルテック」を作成（ID: demo-company-001）
--       または、このSQLで自動作成されます
--    b. /admin/client-users で上記企業にクライアントユーザーを作成
--       例: demo@wisteria-demo.com
--
-- 2. このSQLをSupabase SQL Editorで実行
-- ============================================

-- ============================================
-- 1. デモ企業
-- ============================================
INSERT INTO companies (
  id,
  company_name,
  created_at,
  updated_at
) VALUES (
  'demo-company-001',
  '株式会社サンプルテック',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 3. デモ用求人
-- ============================================
INSERT INTO jobs (
  id,
  company_id,
  company_name,
  job_title,
  employment_type,
  site_status,
  applicants_count,
  created_at,
  updated_at
) VALUES
-- 求人1: エンジニア
(
  'demo-job-001',
  'demo-company-001',
  '株式会社サンプルテック',
  'Webエンジニア（React/TypeScript）',
  '正社員',
  '{"Indeed": {"status": "掲載中", "updatedAt": "2025-01-20T10:00:00Z"}, "求人BOX": {"status": "掲載中", "updatedAt": "2025-01-18T09:00:00Z"}}',
  5,
  NOW() - INTERVAL '30 days',
  NOW()
),
-- 求人2: 営業
(
  'demo-job-002',
  'demo-company-001',
  '株式会社サンプルテック',
  '法人営業（IT業界経験者歓迎）',
  '正社員',
  '{"AirWork": {"status": "掲載中", "updatedAt": "2025-01-19T14:00:00Z"}, "Engage": {"status": "準備中", "updatedAt": "2025-01-15T11:00:00Z"}}',
  4,
  NOW() - INTERVAL '45 days',
  NOW()
),
-- 求人3: 事務
(
  'demo-job-003',
  'demo-company-001',
  '株式会社サンプルテック',
  '総務・人事アシスタント',
  '正社員',
  '{"ハローワーク": {"status": "掲載中", "updatedAt": "2025-01-21T08:00:00Z"}}',
  3,
  NOW() - INTERVAL '20 days',
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 4. デモ用応募者（様々なステータス）
-- ============================================
INSERT INTO applicants (
  id,
  company_id,
  job_id,
  name,
  status,
  source,
  site_key,
  applied_at,
  note,
  shared_with_client,
  shared_at,
  created_at,
  updated_at
) VALUES
-- 新規応募（エンジニア）
(
  'demo-applicant-001',
  'demo-company-001',
  'demo-job-001',
  '田中 一郎',
  'NEW',
  'Indeed',
  'Indeed',
  (CURRENT_DATE - INTERVAL '2 days')::date,
  '前職：SIer勤務5年。React経験あり。',
  true,
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '2 days',
  NOW()
),
(
  'demo-applicant-002',
  'demo-company-001',
  'demo-job-001',
  '鈴木 美咲',
  'NEW',
  '求人BOX',
  '求人BOX',
  (CURRENT_DATE - INTERVAL '1 day')::date,
  'ポートフォリオサイトあり。デザインも得意。',
  true,
  NOW() - INTERVAL '12 hours',
  NOW() - INTERVAL '1 day',
  NOW()
),
-- 書類選考中（営業）
(
  'demo-applicant-003',
  'demo-company-001',
  'demo-job-002',
  '高橋 健太',
  'DOC',
  'AirWork',
  'AirWork',
  (CURRENT_DATE - INTERVAL '5 days')::date,
  'IT商材の営業経験4年。大手企業への提案実績多数。',
  true,
  NOW() - INTERVAL '4 days',
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '3 days'
),
(
  'demo-applicant-004',
  'demo-company-001',
  'demo-job-002',
  '伊藤 さくら',
  'DOC',
  'Engage',
  'Engage',
  (CURRENT_DATE - INTERVAL '4 days')::date,
  '人材業界出身。コミュニケーション力に自信あり。',
  true,
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '4 days',
  NOW() - INTERVAL '2 days'
),
-- 面接中（エンジニア）
(
  'demo-applicant-005',
  'demo-company-001',
  'demo-job-001',
  '山本 翔太',
  'INT',
  'Indeed',
  'Indeed',
  (CURRENT_DATE - INTERVAL '14 days')::date,
  '一次面接通過。二次面接（技術面接）予定。TypeScript/Next.js経験豊富。',
  true,
  NOW() - INTERVAL '12 days',
  NOW() - INTERVAL '14 days',
  NOW() - INTERVAL '3 days'
),
(
  'demo-applicant-006',
  'demo-company-001',
  'demo-job-002',
  '中村 大輔',
  'INT',
  'はたらきんぐ',
  'はたらきんぐ',
  (CURRENT_DATE - INTERVAL '10 days')::date,
  '最終面接予定。営業成績優秀、前職では全国トップ10入り。',
  true,
  NOW() - INTERVAL '9 days',
  NOW() - INTERVAL '10 days',
  NOW() - INTERVAL '1 day'
),
-- 内定（事務）
(
  'demo-applicant-007',
  'demo-company-001',
  'demo-job-003',
  '小林 あかり',
  'OFFER',
  'AirWork',
  'AirWork',
  (CURRENT_DATE - INTERVAL '25 days')::date,
  '内定承諾済み。入社日：来月1日予定。',
  true,
  NOW() - INTERVAL '20 days',
  NOW() - INTERVAL '25 days',
  NOW() - INTERVAL '5 days'
),
-- 不採用（営業）
(
  'demo-applicant-008',
  'demo-company-001',
  'demo-job-002',
  '渡辺 誠',
  'NG',
  'げんきワーク',
  'げんきワーク',
  (CURRENT_DATE - INTERVAL '20 days')::date,
  '一次面接後、見送り。経験不足。',
  true,
  NOW() - INTERVAL '18 days',
  NOW() - INTERVAL '20 days',
  NOW() - INTERVAL '15 days'
),
(
  'demo-applicant-009',
  'demo-company-001',
  'demo-job-001',
  '加藤 裕子',
  'NG',
  'Indeed',
  'Indeed',
  (CURRENT_DATE - INTERVAL '18 days')::date,
  '二次面接後、見送り。技術力は高いが、チームフィットの懸念。',
  true,
  NOW() - INTERVAL '16 days',
  NOW() - INTERVAL '18 days',
  NOW() - INTERVAL '10 days'
),
-- 辞退
(
  'demo-applicant-010',
  'demo-company-001',
  'demo-job-001',
  '松田 健',
  'NG',
  '求人BOX',
  '求人BOX',
  (CURRENT_DATE - INTERVAL '12 days')::date,
  '他社内定のため辞退。',
  true,
  NOW() - INTERVAL '10 days',
  NOW() - INTERVAL '12 days',
  NOW() - INTERVAL '7 days'
),
-- 追加の新規応募
(
  'demo-applicant-011',
  'demo-company-001',
  'demo-job-003',
  '吉田 真理',
  'NEW',
  'ハローワーク',
  'ハローワーク',
  CURRENT_DATE,
  '前職：中小企業で経理5年。人事領域にも興味あり。',
  true,
  NOW(),
  NOW(),
  NOW()
),
(
  'demo-applicant-012',
  'demo-company-001',
  'demo-job-002',
  '斎藤 翼',
  'NEW',
  'ジモティー',
  'ジモティー',
  CURRENT_DATE,
  'Web広告代理店出身。デジタルマーケティングにも精通。',
  true,
  NOW(),
  NOW() - INTERVAL '6 hours',
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 5. デモ用フィードバック（企業側の面接結果）
-- ============================================
-- ※ applicant_client_feedback テーブルが作成済みであること
-- ※ client_user_id は動的に取得（管理画面で作成したユーザーを使用）

DO $$
DECLARE
  v_client_user_id UUID;
BEGIN
  -- デモ企業のクライアントユーザーを取得
  SELECT id INTO v_client_user_id
  FROM client_users
  WHERE company_id = 'demo-company-001'
    AND is_active = true
  ORDER BY created_at ASC
  LIMIT 1;

  -- クライアントユーザーが存在しない場合はスキップ
  IF v_client_user_id IS NULL THEN
    RAISE NOTICE 'クライアントユーザーが見つかりません。フィードバックデータはスキップされました。/admin/client-users でユーザーを作成後、再実行してください。';
    RETURN;
  END IF;

  -- フィードバックデータを挿入
  INSERT INTO applicant_client_feedback (id, applicant_id, company_id, client_user_id, interview_type, interview_date, interviewer_name, interview_result, fail_reason, fail_reason_detail, pass_rating, pass_strengths, pass_comment, hire_intention, next_action, created_at, updated_at)
  VALUES
    ('f0000000-0000-0000-0000-000000000001', 'demo-applicant-005', 'demo-company-001', v_client_user_id, 'first', CURRENT_DATE - INTERVAL '7 days', '田村マネージャー', 'pass', NULL, NULL, 4, ARRAY['experience', 'communication', 'motivation'], 'React/TypeScriptの実務経験が豊富で、即戦力として期待できます。', 'yes', '二次面接へ', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
    ('f0000000-0000-0000-0000-000000000002', 'demo-applicant-006', 'demo-company-001', v_client_user_id, 'first', CURRENT_DATE - INTERVAL '6 days', '鈴木部長', 'pass', NULL, NULL, 5, ARRAY['experience', 'motivation', 'leadership'], '営業実績が素晴らしい。当社での成長意欲も感じられる。', 'strong_yes', '最終面接へ', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
    ('f0000000-0000-0000-0000-000000000003', 'demo-applicant-006', 'demo-company-001', v_client_user_id, 'second', CURRENT_DATE - INTERVAL '3 days', '佐藤取締役', 'pass', NULL, NULL, 5, ARRAY['communication', 'culture_fit', 'personality'], '会社のビジョンへの共感が感じられた。', 'strong_yes', '最終面接調整中', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
    ('f0000000-0000-0000-0000-000000000004', 'demo-applicant-007', 'demo-company-001', v_client_user_id, 'first', CURRENT_DATE - INTERVAL '20 days', '佐藤花子', 'pass', NULL, NULL, 4, ARRAY['communication', 'motivation', 'personality'], '明るく前向きな印象。学ぶ意欲が高い。', 'yes', '最終面接へ', NOW() - INTERVAL '18 days', NOW() - INTERVAL '18 days'),
    ('f0000000-0000-0000-0000-000000000005', 'demo-applicant-007', 'demo-company-001', v_client_user_id, 'final', CURRENT_DATE - INTERVAL '12 days', '山田社長', 'pass', NULL, NULL, 4, ARRAY['culture_fit', 'teamwork', 'flexibility'], '会社の成長フェーズを楽しめる人材。内定を出したい。', 'strong_yes', '内定通知、条件提示', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),
    ('f0000000-0000-0000-0000-000000000006', 'demo-applicant-008', 'demo-company-001', v_client_user_id, 'first', CURRENT_DATE - INTERVAL '17 days', '鈴木部長', 'fail', 'experience_lack', '法人営業の経験が1年未満で、当社の求めるレベルに達していませんでした。', NULL, NULL, NULL, 'no', NULL, NOW() - INTERVAL '16 days', NOW() - INTERVAL '16 days'),
    ('f0000000-0000-0000-0000-000000000007', 'demo-applicant-009', 'demo-company-001', v_client_user_id, 'first', CURRENT_DATE - INTERVAL '15 days', '田村マネージャー', 'pass', NULL, NULL, 4, ARRAY['experience', 'communication'], '技術力は申し分ない。コードレビューでも問題なし。', 'yes', '二次面接へ', NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days'),
    ('f0000000-0000-0000-0000-000000000008', 'demo-applicant-009', 'demo-company-001', v_client_user_id, 'second', CURRENT_DATE - INTERVAL '11 days', 'チームメンバー複数', 'fail', 'culture_mismatch', 'チームとのディスカッションで、働き方の価値観に違いが見られました。', NULL, NULL, NULL, 'no', NULL, NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days')
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'フィードバックデータを挿入しました（client_user_id: %）', v_client_user_id;
END $$;

-- ============================================
-- 完了メッセージ
-- ============================================
-- デモデータの挿入が完了しました。
--
-- 【セットアップ手順】
-- 1. /admin/client-users でクライアントユーザーを作成
-- 2. このSQLを実行
-- 3. 作成したユーザーでログイン
--
-- 【デモデータ概要】
-- - 企業: 株式会社サンプルテック
-- - 求人: 3件（エンジニア、営業、事務）
-- - 応募者: 12名（各ステータスに分散）
-- - フィードバック: 8件（合格5件、不合格3件）