import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// POST /api/admin/migrate-priority - Add priority column to work_queue_items
export async function POST() {
  try {
    // Add priority column with check constraint
    const { error: alterError } = await supabaseAdmin.rpc("exec_sql", {
      sql: `
        ALTER TABLE work_queue_items
        ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'medium'
        CHECK (priority IN ('urgent', 'high', 'medium', 'low'));
      `,
    });

    if (alterError) {
      // Try alternative approach: raw SQL execution
      const { error: rawError } = await supabaseAdmin.from("work_queue_items").select("priority").limit(1);

      if (rawError && rawError.message.includes("priority")) {
        // Column doesn't exist, need to add it via SQL editor
        return NextResponse.json({
          ok: false,
          error: {
            message: "Please run the following SQL in Supabase Dashboard SQL Editor:\n\n" +
              "ALTER TABLE work_queue_items\n" +
              "ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'medium'\n" +
              "CHECK (priority IN ('urgent', 'high', 'medium', 'low'));\n\n" +
              "CREATE INDEX IF NOT EXISTS idx_work_queue_items_priority ON work_queue_items(priority);"
          }
        }, { status: 500 });
      }
    }

    // Add index
    const { error: indexError } = await supabaseAdmin.rpc("exec_sql", {
      sql: `CREATE INDEX IF NOT EXISTS idx_work_queue_items_priority ON work_queue_items(priority);`,
    });

    if (indexError) {
      console.warn("Index creation warning:", indexError);
    }

    // Update existing rows to have 'medium' priority if NULL
    const { error: updateError } = await supabaseAdmin
      .from("work_queue_items")
      .update({ priority: "medium" })
      .is("priority", null);

    if (updateError) {
      console.warn("Update existing rows warning:", updateError);
    }

    return NextResponse.json({
      ok: true,
      message: "Priority column added successfully",
    });
  } catch (err) {
    console.error("Migration error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: err instanceof Error ? err.message : "Migration failed",
        },
      },
      { status: 500 }
    );
  }
}
