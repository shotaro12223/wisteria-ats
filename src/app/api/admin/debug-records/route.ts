import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

/**
 * Debug endpoint to check company_records data
 */
export async function GET() {
  try {
    // Get first 5 companies with their records
    const { data: companies, error: companiesError } = await supabaseAdmin
      .from("companies")
      .select(`
        id,
        company_name,
        company_records(
          company_id,
          status,
          profile
        )
      `)
      .limit(5);

    if (companiesError) {
      return NextResponse.json(
        { ok: false, error: { message: companiesError.message } },
        { status: 500 }
      );
    }

    // Also get raw company_records
    const { data: records, error: recordsError } = await supabaseAdmin
      .from("company_records")
      .select("company_id, status, profile")
      .limit(5);

    if (recordsError) {
      return NextResponse.json(
        { ok: false, error: { message: recordsError.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      companiesWithJoin: companies,
      rawRecords: records,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: { message: e?.message ?? "Debug failed" } },
      { status: 500 }
    );
  }
}
