import { NextResponse, NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type ActivityType = "note" | "call" | "mail" | "task" | "meeting" | "system";

function s(v: any) {
  return String(v ?? "");
}

function isObj(v: any): v is Record<string, any> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function json(status: number, payload: any) {
  return NextResponse.json(payload, { status });
}

function isValidType(t: string): t is ActivityType {
  return (
    t === "note" ||
    t === "call" ||
    t === "mail" ||
    t === "task" ||
    t === "meeting" ||
    t === "system"
  );
}

export async function GET(_: Request, { params }: { params: Promise<{ dealId: string }> }) {
  try {
    const { dealId: dealIdParam } = await params;
    const supabase = supabaseAdmin;

    const dealId = s(dealIdParam).trim();
    if (!dealId) return json(400, { ok: false, error: { message: "dealId is required" } });

    const { data, error } = await supabase
      .from("deal_activities")
      .select("id, deal_id, type, body, meta, occurred_at, created_by, created_at")
      .eq("deal_id", dealId)
      .order("occurred_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw new Error(error.message);

    return json(200, { ok: true, items: data ?? [] });
  } catch (e: any) {
    return json(500, { ok: false, error: { message: String(e?.message ?? e ?? "failed") } });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ dealId: string }> }) {
  try {
    const { dealId: dealIdParam } = await params;
    const supabase = supabaseAdmin;

    const dealId = s(dealIdParam).trim();
    if (!dealId) return json(400, { ok: false, error: { message: "dealId is required" } });

    const payload = await req.json().catch(() => ({}));
    const typeRaw = s(payload?.type).trim();
    if (!isValidType(typeRaw)) {
      return json(400, { ok: false, error: { message: "invalid type" } });
    }

    const body = payload?.body === null || payload?.body === undefined ? "" : s(payload?.body);
    const now = new Date().toISOString();
    const occurredAt =
      payload?.occurred_at && typeof payload.occurred_at === "string" ? payload.occurred_at : now;

    const meta = isObj(payload?.meta) ? payload.meta : null;

    const insertRow: any = {
      deal_id: dealId,
      type: typeRaw,
      body,
      meta,
      occurred_at: occurredAt,
      created_by: null,
      created_at: now,
    };

    const { data, error } = await supabase
      .from("deal_activities")
      .insert(insertRow)
      .select("id, deal_id, type, body, meta, occurred_at, created_by, created_at")
      .single();

    if (error) throw new Error(error.message);

    return json(200, { ok: true, item: data });
  } catch (e: any) {
    return json(500, { ok: false, error: { message: String(e?.message ?? e ?? "failed") } });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ dealId: string }> }) {
  try {
    const { dealId: dealIdParam } = await params;
    const supabase = supabaseAdmin;

    const dealId = s(dealIdParam).trim();
    if (!dealId) return json(400, { ok: false, error: { message: "dealId is required" } });

    const payload = await req.json().catch(() => ({}));
    const activityId = s(payload?.activityId).trim();

    if (!activityId) return json(400, { ok: false, error: { message: "activityId is required" } });

    const meta = isObj(payload?.meta) ? payload.meta : null;

    const { data, error } = await supabase
      .from("deal_activities")
      .update({ meta })
      .eq("id", activityId)
      .eq("deal_id", dealId)
      .select("id, deal_id, type, body, meta, occurred_at, created_by, created_at")
      .single();

    if (error) throw new Error(error.message);

    return json(200, { ok: true, item: data });
  } catch (e: any) {
    return json(500, { ok: false, error: { message: String(e?.message ?? e ?? "failed") } });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ dealId: string }> }) {
  try {
    const { dealId: dealIdParam } = await params;
    const supabase = supabaseAdmin;

    const dealId = s(dealIdParam).trim();
    if (!dealId) return json(400, { ok: false, error: { message: "dealId is required" } });

    const url = new URL(req.url);
    const activityId = s(url.searchParams.get("activityId")).trim();

    if (!activityId) return json(400, { ok: false, error: { message: "activityId is required" } });

    const { error } = await supabase
      .from("deal_activities")
      .delete()
      .eq("id", activityId)
      .eq("deal_id", dealId);

    if (error) throw new Error(error.message);

    return json(200, { ok: true });
  } catch (e: any) {
    return json(500, { ok: false, error: { message: String(e?.message ?? e ?? "failed") } });
  }
}
