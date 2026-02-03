import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

/**
 * One-time migration endpoint to create company_records entries for companies that don't have one
 * Call this endpoint once to backfill existing companies
 */
export async function POST() {
  try {
    // Get all companies
    const { data: companies, error: companiesError } = await supabaseAdmin
      .from("companies")
      .select("id, company_name, company_profile, application_email");

    if (companiesError) {
      return NextResponse.json(
        { ok: false, error: { message: companiesError.message } },
        { status: 500 }
      );
    }

    if (!companies || companies.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "No companies found",
        created: 0,
        skipped: 0,
      });
    }

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const company of companies) {
      // Check if record already exists
      const { data: existing } = await supabaseAdmin
        .from("company_records")
        .select("company_id")
        .eq("company_id", company.id)
        .maybeSingle();

      if (existing) {
        skipped++;
        continue;
      }

      // Create company_records entry
      const now = new Date().toISOString();
      const { error: insertError } = await supabaseAdmin
        .from("company_records")
        .insert({
          company_id: company.id,
          status: "active",
          owner_user_id: null,
          tags: [],
          memo: null,
          profile: company.company_profile ?? {},
          created_at: now,
          updated_at: now,
        });

      if (insertError) {
        errors.push(`Failed to create record for ${company.company_name}: ${insertError.message}`);
      } else {
        created++;
      }
    }

    return NextResponse.json({
      ok: true,
      message: `Backfill complete. Created: ${created}, Skipped: ${skipped}`,
      created,
      skipped,
      total: companies.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: { message: e?.message ?? "Backfill failed" } },
      { status: 500 }
    );
  }
}
