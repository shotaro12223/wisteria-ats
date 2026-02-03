-- Migration 009: Soft Delete and Cascade Delete Support
-- Date: 2026-01-27
-- Purpose: Add soft delete columns, Gmail composite key, and performance indexes

-- 1. Add soft delete columns to main tables
ALTER TABLE companies ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE company_records ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 2. Gmail inbox messages - composite key for multiple company support
-- Note: This will fail if there are duplicate (gmail_message_id, company_id) pairs
-- Run this query first to check: SELECT gmail_message_id, company_id, COUNT(*) FROM gmail_inbox_messages GROUP BY gmail_message_id, company_id HAVING COUNT(*) > 1;
ALTER TABLE gmail_inbox_messages DROP CONSTRAINT IF EXISTS unique_gmail_company;
ALTER TABLE gmail_inbox_messages ADD CONSTRAINT unique_gmail_company UNIQUE (gmail_message_id, company_id);

-- 3. Performance indexes for soft delete queries
CREATE INDEX IF NOT EXISTS idx_companies_deleted_at ON companies(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_deleted_at ON jobs(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_applicants_deleted_at ON applicants(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_company_records_deleted_at ON company_records(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_deals_deleted_at ON deals(deleted_at) WHERE deleted_at IS NULL;

-- 4. Index for duplicate applicant detection
CREATE INDEX IF NOT EXISTS idx_applicants_duplicate_check
  ON applicants(company_id, job_id, applied_at)
  WHERE deleted_at IS NULL;

-- 5. Index for Gmail inbox lookups
CREATE INDEX IF NOT EXISTS idx_gmail_inbox_company_job
  ON gmail_inbox_messages(company_id, job_id)
  WHERE status != 'registered';
