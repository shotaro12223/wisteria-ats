-- ================================================
-- Add client_comment to applicants
-- ================================================
-- クライアントに表示するコメント欄を追加
-- noteは社内専用メモとして使用
-- ================================================

ALTER TABLE applicants
ADD COLUMN IF NOT EXISTS client_comment text;

COMMENT ON COLUMN applicants.client_comment IS 'クライアントに表示する選考状況コメント';
