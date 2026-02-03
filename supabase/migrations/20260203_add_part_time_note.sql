-- 勤務補足カラム追加（パート・アルバイト向け）
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS part_time_note TEXT;
COMMENT ON COLUMN jobs.part_time_note IS '勤務補足（1日3時間〜OK、週2日〜OKなど）';
