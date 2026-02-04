-- 011_calendar_events.sql
-- 内部カレンダーイベントテーブル（次回MTG日程調整で使用）

CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  duration INTEGER DEFAULT 60,
  description TEXT DEFAULT '',
  deal_id UUID,
  company_id TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
