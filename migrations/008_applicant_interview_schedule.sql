-- Add interview scheduling columns to applicants table
-- This allows admin to set interview dates directly without requiring client portal setup

ALTER TABLE applicants
ADD COLUMN IF NOT EXISTS interview_date DATE,
ADD COLUMN IF NOT EXISTS interview_start_time TIME,
ADD COLUMN IF NOT EXISTS interview_end_time TIME;

-- Index for querying upcoming interviews
CREATE INDEX IF NOT EXISTS idx_applicants_interview_date ON applicants(interview_date) WHERE interview_date IS NOT NULL;
