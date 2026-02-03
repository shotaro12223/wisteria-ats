-- ============================================
-- デモ用フィードバックデータのみ挿入
-- ============================================
--
-- 【前提条件】
-- 1. demo_data.sql が実行済み（企業、求人、応募者が存在する）
-- 2. /admin/client-users でクライアントユーザーが作成済み
--
-- 【使用方法】
-- Supabase SQL Editor でこのSQLを実行
-- ============================================

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

  -- クライアントユーザーが存在しない場合はエラー
  IF v_client_user_id IS NULL THEN
    RAISE EXCEPTION 'クライアントユーザーが見つかりません。/admin/client-users でデモ企業（demo-company-001）にユーザーを作成してください。';
  END IF;

  -- 既存のデモフィードバックを削除（再実行対応）
  DELETE FROM applicant_client_feedback
  WHERE id IN (
    'f0000000-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000002',
    'f0000000-0000-0000-0000-000000000003',
    'f0000000-0000-0000-0000-000000000004',
    'f0000000-0000-0000-0000-000000000005',
    'f0000000-0000-0000-0000-000000000006',
    'f0000000-0000-0000-0000-000000000007',
    'f0000000-0000-0000-0000-000000000008'
  );

  -- フィードバックデータを挿入
  INSERT INTO applicant_client_feedback (
    id,
    applicant_id,
    company_id,
    client_user_id,
    interview_type,
    interview_date,
    interviewer_name,
    interview_result,
    fail_reason,
    fail_reason_detail,
    pass_rating,
    pass_strengths,
    pass_comment,
    hire_intention,
    next_action,
    created_at,
    updated_at
  )
  VALUES
    -- 山本翔太（エンジニア・面接中）: 一次面接 合格
    (
      'f0000000-0000-0000-0000-000000000001',
      'demo-applicant-005',
      'demo-company-001',
      v_client_user_id,
      'first',
      CURRENT_DATE - INTERVAL '7 days',
      '田村マネージャー',
      'pass',
      NULL,
      NULL,
      4,
      ARRAY['experience', 'communication', 'motivation'],
      'React/TypeScriptの実務経験が豊富で、即戦力として期待できます。コミュニケーションも円滑で、チームに馴染めそうです。',
      'yes',
      '二次面接（技術面接）へ進める',
      NOW() - INTERVAL '5 days',
      NOW() - INTERVAL '5 days'
    ),

    -- 中村大輔（営業・面接中）: 一次面接 合格
    (
      'f0000000-0000-0000-0000-000000000002',
      'demo-applicant-006',
      'demo-company-001',
      v_client_user_id,
      'first',
      CURRENT_DATE - INTERVAL '6 days',
      '鈴木部長',
      'pass',
      NULL,
      NULL,
      5,
      ARRAY['experience', 'motivation', 'leadership'],
      '営業実績が素晴らしい。前職での全国トップ10入りは本物の実力。当社での成長意欲も非常に感じられます。',
      'strong_yes',
      '最終面接へ',
      NOW() - INTERVAL '4 days',
      NOW() - INTERVAL '4 days'
    ),

    -- 中村大輔（営業・面接中）: 二次面接 合格
    (
      'f0000000-0000-0000-0000-000000000003',
      'demo-applicant-006',
      'demo-company-001',
      v_client_user_id,
      'second',
      CURRENT_DATE - INTERVAL '3 days',
      '佐藤取締役',
      'pass',
      NULL,
      NULL,
      5,
      ARRAY['communication', 'culture_fit', 'personality'],
      '会社のビジョンへの共感が強く感じられました。人柄も誠実で、長く一緒に働けるイメージが湧きます。',
      'strong_yes',
      '最終面接の日程調整中',
      NOW() - INTERVAL '2 days',
      NOW() - INTERVAL '2 days'
    ),

    -- 小林あかり（事務・内定）: 一次面接 合格
    (
      'f0000000-0000-0000-0000-000000000004',
      'demo-applicant-007',
      'demo-company-001',
      v_client_user_id,
      'first',
      CURRENT_DATE - INTERVAL '20 days',
      '佐藤花子',
      'pass',
      NULL,
      NULL,
      4,
      ARRAY['communication', 'motivation', 'personality'],
      '明るく前向きな印象。学ぶ意欲が高く、成長が期待できます。事務経験はありませんが、ポテンシャルを感じます。',
      'yes',
      '最終面接へ',
      NOW() - INTERVAL '18 days',
      NOW() - INTERVAL '18 days'
    ),

    -- 小林あかり（事務・内定）: 最終面接 合格
    (
      'f0000000-0000-0000-0000-000000000005',
      'demo-applicant-007',
      'demo-company-001',
      v_client_user_id,
      'final',
      CURRENT_DATE - INTERVAL '12 days',
      '山田社長',
      'pass',
      NULL,
      NULL,
      4,
      ARRAY['culture_fit', 'teamwork', 'flexibility'],
      '会社の成長フェーズを楽しめる人材だと確信しました。柔軟性があり、様々な業務に対応できそうです。内定を出したいと思います。',
      'strong_yes',
      '内定通知、条件提示',
      NOW() - INTERVAL '10 days',
      NOW() - INTERVAL '10 days'
    ),

    -- 渡辺誠（営業・不採用）: 一次面接 不合格
    (
      'f0000000-0000-0000-0000-000000000006',
      'demo-applicant-008',
      'demo-company-001',
      v_client_user_id,
      'first',
      CURRENT_DATE - INTERVAL '17 days',
      '鈴木部長',
      'fail',
      'experience_lack',
      '法人営業の経験が1年未満で、当社の求めるレベルに達していませんでした。基本的なビジネスマナーは問題ありませんが、提案力や交渉力の面でまだ経験が必要です。',
      NULL,
      NULL,
      NULL,
      'no',
      NULL,
      NOW() - INTERVAL '16 days',
      NOW() - INTERVAL '16 days'
    ),

    -- 加藤裕子（エンジニア・不採用）: 一次面接 合格
    (
      'f0000000-0000-0000-0000-000000000007',
      'demo-applicant-009',
      'demo-company-001',
      v_client_user_id,
      'first',
      CURRENT_DATE - INTERVAL '15 days',
      '田村マネージャー',
      'pass',
      NULL,
      NULL,
      4,
      ARRAY['experience', 'communication'],
      '技術力は申し分ない。コードレビューでも問題なし。Next.js、TypeScriptの経験も豊富です。',
      'yes',
      '二次面接へ',
      NOW() - INTERVAL '14 days',
      NOW() - INTERVAL '14 days'
    ),

    -- 加藤裕子（エンジニア・不採用）: 二次面接 不合格
    (
      'f0000000-0000-0000-0000-000000000008',
      'demo-applicant-009',
      'demo-company-001',
      v_client_user_id,
      'second',
      CURRENT_DATE - INTERVAL '11 days',
      'チームメンバー複数',
      'fail',
      'culture_mismatch',
      'チームとのディスカッションで、働き方の価値観に違いが見られました。リモートワーク希望が強く、当社のハイブリッド勤務体制との折り合いが難しそうです。技術力は高いだけに残念です。',
      NULL,
      NULL,
      NULL,
      'no',
      NULL,
      NOW() - INTERVAL '10 days',
      NOW() - INTERVAL '10 days'
    );

  RAISE NOTICE '✅ フィードバックデータを挿入しました（8件）';
  RAISE NOTICE '   - 合格フィードバック: 5件';
  RAISE NOTICE '   - 不合格フィードバック: 3件';
  RAISE NOTICE '   - client_user_id: %', v_client_user_id;
END $$;

-- ============================================
-- 挿入確認
-- ============================================
SELECT
  f.id,
  a.name as applicant_name,
  f.interview_type,
  f.interview_result,
  f.interviewer_name,
  f.pass_rating,
  f.fail_reason
FROM applicant_client_feedback f
JOIN applicants a ON a.id = f.applicant_id
WHERE f.company_id = 'demo-company-001'
ORDER BY f.created_at DESC;
