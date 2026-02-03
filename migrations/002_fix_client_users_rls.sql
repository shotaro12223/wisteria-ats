-- ================================================
-- Fix client_users RLS policies
-- ================================================
-- Allow users to read their own client_users record
-- Avoid infinite recursion
-- ================================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Client users view own company members" ON client_users;
DROP POLICY IF EXISTS "Users can read own client_users record" ON client_users;

-- Simple policy: users can only read their own record
-- This avoids infinite recursion
CREATE POLICY "Users can read own client_users record"
ON client_users FOR SELECT
TO authenticated
USING (user_id = auth.uid());
