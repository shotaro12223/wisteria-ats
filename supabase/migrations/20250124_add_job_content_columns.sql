-- ============================================
-- 求人詳細コンテンツカラム追加
-- jobs テーブルに求人原稿の詳細フィールドを追加
-- ============================================

-- キャッチコピー・カテゴリ
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS catch_copy TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS job_category TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS hiring_count TEXT;

-- 勤務地
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS prefecture_city_town TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS address_line TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS building_floor TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS location_note TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS nearest_station TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS access TEXT;

-- 勤務条件
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS work_style TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS work_hours TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS break_time TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS avg_monthly_work_hours TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS avg_monthly_work_days TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS work_days_hours_required TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS overtime_hours TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS secondment TEXT;

-- 給与
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS pay_type TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS gross_pay TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS pay_min INTEGER;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS pay_max INTEGER;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS base_pay_and_allowance TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS fixed_allowance TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS fixed_overtime TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS bonus TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS raise TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS annual_income_example TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS pay_note TEXT;

-- 休日・休暇
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS holidays TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS annual_holidays TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS leave TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS childcare_leave TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS retirement_age TEXT;

-- 仕事内容
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS job_description TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS career_map TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS appeal_points TEXT;

-- 応募資格
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS qualifications TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS education_experience TEXT;

-- 福利厚生
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS benefits TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS social_insurance TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS passive_smoking TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS side_job TEXT;

-- 試用期間
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS probation TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS probation_period TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS probation_condition TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS probation_pay_type TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS probation_pay_min INTEGER;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS probation_pay_max INTEGER;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS probation_fixed_overtime TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS probation_avg_monthly_work_hours TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS probation_note TEXT;

-- 連絡先
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS contact_phone TEXT;

-- その他
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS other TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS tags TEXT;

-- コメント追加
COMMENT ON COLUMN jobs.catch_copy IS 'キャッチコピー';
COMMENT ON COLUMN jobs.job_category IS '職種カテゴリ';
COMMENT ON COLUMN jobs.hiring_count IS '採用人数';
COMMENT ON COLUMN jobs.job_description IS '仕事内容';
COMMENT ON COLUMN jobs.qualifications IS '応募資格';
COMMENT ON COLUMN jobs.appeal_points IS 'アピールポイント・この仕事の魅力';
COMMENT ON COLUMN jobs.benefits IS '福利厚生';
COMMENT ON COLUMN jobs.social_insurance IS '社会保険';
COMMENT ON COLUMN jobs.probation IS '試用期間の有無';
COMMENT ON COLUMN jobs.probation_period IS '試用期間';
COMMENT ON COLUMN jobs.probation_condition IS '試用期間の条件';

-- 確認
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'jobs'
ORDER BY ordinal_position;
