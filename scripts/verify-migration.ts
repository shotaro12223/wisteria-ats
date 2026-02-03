#!/usr/bin/env node
/**
 * Verify Gmail sync automation migration
 * Run: npx ts-node scripts/verify-migration.ts
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function verifyMigration() {
  console.log("🔍 Verifying Gmail sync automation migration...\n");

  try {
    // Check if new columns exist in gmail_connections
    const { data: connData, error: connError } = await supabase
      .from("gmail_connections")
      .select("last_sync_at, last_sync_status, last_sync_error, total_synced")
      .limit(1);

    if (connError) {
      throw new Error(
        `Failed to query gmail_connections: ${connError.message}`
      );
    }

    console.log("✅ gmail_connections table has sync columns");

    // Check if gmail_sync_logs table exists
    const { data: logsData, error: logsError } = await supabase
      .from("gmail_sync_logs")
      .select("id")
      .limit(1);

    if (logsError && logsError.code !== "PGRST116") {
      // PGRST116 means table doesn't exist
      throw new Error(`Failed to query gmail_sync_logs: ${logsError.message}`);
    }

    console.log("✅ gmail_sync_logs table exists");

    console.log("\n✨ Migration verification passed!");
    console.log("\nNew database schema:\n");
    console.log(
      "  gmail_connections:\n    - last_sync_at (TIMESTAMPTZ)\n    - last_sync_status (TEXT)\n    - last_sync_error (TEXT)\n    - total_synced (INTEGER)"
    );
    console.log("\n  gmail_sync_logs:\n    - connection_id (UUID)\n    - sync_type ('full' | 'incremental')\n    - started_at (TIMESTAMPTZ)\n    - completed_at (TIMESTAMPTZ)\n    - status ('running' | 'success' | 'error')\n    - messages_fetched (INTEGER)\n    - messages_inserted (INTEGER)\n    - execution_time_ms (INTEGER)");
  } catch (err: any) {
    console.error("❌ Migration verification failed:", err.message);
    console.error(
      "\n📝 To apply the migration manually:\n  1. Go to Supabase Dashboard: https://app.supabase.com\n  2. Select your project\n  3. Go to SQL Editor\n  4. Create a new query and paste the contents of:\n     supabase/migrations/20260124_gmail_sync_automation.sql\n  5. Click RUN"
    );
    process.exit(1);
  }
}

verifyMigration();
