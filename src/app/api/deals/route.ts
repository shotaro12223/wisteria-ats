// src/app/api/deals/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { supabaseRoute } from "@/lib/supabaseRoute";

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing");
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing");

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

function jsonOk(data: any, init?: ResponseInit) {
  return NextResponse.json(data, { status: 200, ...init });
}

function jsonErr(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: { message } }, { status });
}

/**
 * POST /api/deals
 * 後方互換 + deals/new 用の拡張
 *
 * A) 旧形式（既存 company に deal を作る）
 *   { companyId, kind, title, stage }
 *
 * B) 新形式（deals/new が送る：会社 + 台帳 + deal をまとめて作る）
 *   {
 *     kind: "new",
 *     companyName: string,
 *     record: { status, tags, memo, profile },
 *     deal: { title, stage, startDate, dueDate, amount, probability, memo }
 *   }
 *
 * 返却:
 *   { ok: true, dealId, companyId, createdCompany?: boolean, createdRecord?: boolean }
 */
export async function GET(req: NextRequest) {
  try {
    const { supabase: sbRoute } = supabaseRoute(req);

    // Authentication check
    const {
      data: { user },
      error: authError,
    } = await sbRoute.auth.getUser();

    if (authError || !user) {
      return jsonErr("Unauthorized", 401);
    }

    // Authorization check: Only admins can list all deals
    const { data: workspaceMember } = await sbRoute
      .from("workspace_members")
      .select("role")
      .eq("user_id", user.id)
      .single();

    const isAdmin = workspaceMember?.role === "admin";

    if (!isAdmin) {
      return jsonErr("Access denied", 403);
    }

    const supabase = supabaseAdmin();
    const { searchParams } = new URL(req.url);

    const limitRaw = Number(searchParams.get("limit") ?? "30");
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(200, limitRaw)) : 30;

    const companyIdFilter = cleanString(searchParams.get("companyId") ?? "");
    const kindFilter = cleanString(searchParams.get("kind") ?? "");

    // 1) deals を取得（FK join しない）
    let query = supabase
      .from("deals")
      .select("id, company_id, kind, title, stage, created_at, updated_at")
      .is("deleted_at", null);

    if (companyIdFilter) {
      query = query.eq("company_id", companyIdFilter);
    }

    if (kindFilter === "new" || kindFilter === "existing") {
      query = query.eq("kind", kindFilter);
    }

    const { data: deals, error: dErr } = await query
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (dErr) return jsonErr(dErr.message, 500);

    const rows: any[] = Array.isArray(deals) ? deals : [];

    // 2) company_id をまとめて companies から引く（FK不要）
    const companyIds = Array.from(
      new Set(
        rows
          .map((r) => String(r?.company_id ?? "").trim())
          .filter((x) => Boolean(x))
      )
    );

    let companyNameById = new Map<string, string>();

    if (companyIds.length > 0) {
      const { data: comps, error: cErr } = await supabase
        .from("companies")
        .select("id, company_name")
        .is("deleted_at", null)
        .in("id", companyIds);

      if (cErr) return jsonErr(cErr.message, 500);

      const carr: any[] = Array.isArray(comps) ? comps : [];
      companyNameById = new Map(
        carr.map((c) => [String(c?.id ?? ""), String(c?.company_name ?? "")] as const)
      );
    }

    const items = rows.map((r) => {
      const companyId = String(r?.company_id ?? "");
      return {
        id: String(r?.id ?? ""),
        companyId,
        companyName: companyNameById.get(companyId) ?? "",
        kind: (String(r?.kind ?? "existing") === "new" ? "new" : "existing") as "new" | "existing",
        title: String(r?.title ?? ""),
        stage: String(r?.stage ?? ""),
        createdAt: String(r?.created_at ?? ""),
        updatedAt: String(r?.updated_at ?? ""),
      };
    });

    return jsonOk({ ok: true, items });
  } catch (e: any) {
    return jsonErr(String(e?.message ?? e ?? "unknown error"), 500);
  }
}

function asObj(v: any): Record<string, any> | null {
  if (!v || typeof v !== "object") return null;
  if (Array.isArray(v)) return null;
  return v as any;
}

function s(v: any) {
  return String(v ?? "");
}

function cleanString(v: any) {
  return s(v).trim();
}

function toNumberOrNull(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n;
}

function toDateOrNull(v: any): string | null {
  const x = cleanString(v);
  return x ? x : null;
}

function nowIso() {
  return new Date().toISOString();
}

export async function POST(req: NextRequest) {
  const { supabase: sbRoute } = supabaseRoute(req);

  // Authentication check
  const {
    data: { user },
    error: authError,
  } = await sbRoute.auth.getUser();

  if (authError || !user) {
    return jsonErr("Unauthorized", 401);
  }

  // Authorization check: Only admins can create deals
  const { data: workspaceMember } = await sbRoute
    .from("workspace_members")
    .select("role")
    .eq("user_id", user.id)
    .single();

  const isAdmin = workspaceMember?.role === "admin";

  if (!isAdmin) {
    return jsonErr("Access denied", 403);
  }

  const supabase = supabaseAdmin();

  // ベストエフォート・ロールバック用
  let createdCompanyId: string | null = null;

  try {
    const body = await req.json().catch(() => null);
    const obj = asObj(body);
    if (!obj) return jsonErr("Invalid JSON body", 400);

    const now = nowIso();

    // -----------------------------
    // A) 旧形式（companyId 必須）
    // -----------------------------
    const companyIdLegacy = cleanString(obj.companyId);
    if (companyIdLegacy) {
      const kindLegacy = cleanString(obj.kind) === "new" ? "new" : "existing";
      const titleLegacy = cleanString(obj.title);
      const stageLegacy = cleanString(obj.stage);

      // created_at NOT NULL 環境にも耐える（列が無い場合は Supabase が弾くので、二段で試す）
      const insertMin: any = {
        company_id: companyIdLegacy,
        kind: kindLegacy,
        title: titleLegacy,
        stage: stageLegacy,
      };

      const insertWithTs: any = {
        ...insertMin,
        created_at: now,
        updated_at: now,
      };

      // まず created_at/updated_at 付きで試し、列が無い等で落ちたら最小で再試行
      const { data: dTry, error: eTry } = await supabase
        .from("deals")
        .insert(insertWithTs)
        .select("id, company_id")
        .single();

      if (!eTry) {
        const dealId = cleanString((dTry as any)?.id);
        const companyId = cleanString((dTry as any)?.company_id);
        if (!dealId) return jsonErr("Failed to create deal", 500);
        return jsonOk({ ok: true, dealId, companyId, createdCompany: false, createdRecord: false });
      }

      const { data: dData, error: dErr } = await supabase
        .from("deals")
        .insert(insertMin)
        .select("id, company_id")
        .single();

      if (dErr) return jsonErr(dErr.message, 500);

      const dealId = cleanString((dData as any)?.id);
      const companyId = cleanString((dData as any)?.company_id);
      if (!dealId) return jsonErr("Failed to create deal", 500);

      return jsonOk({ ok: true, dealId, companyId, createdCompany: false, createdRecord: false });
    }

    // -----------------------------
    // B) 新形式（deals/new 用）
    // -----------------------------
    const companyName = cleanString(obj.companyName);
    if (!companyName) return jsonErr("companyName is required", 400);

    const kind = cleanString(obj.kind) === "new" ? "new" : "existing";

    const record = asObj(obj.record) ?? {};
    const deal = asObj(obj.deal) ?? {};

    // deal payload
    const dealTitle = cleanString(deal.title) || "初回ヒアリング";
    const dealStage = cleanString(deal.stage) || "ヒアリング";
    const startDate = toDateOrNull(deal.startDate);
    const dueDate = toDateOrNull(deal.dueDate);
    const amount = toNumberOrNull(deal.amount);
    const probability = toNumberOrNull(deal.probability);
    const dealMemo = s(deal.memo);

    // record payload（company_records）
    const recordStatus = cleanString(record.status) || "active";
    const recordMemo = s(record.memo ?? "");
    const recordTagsRaw = (record as any).tags;
    const recordTags: string[] = Array.isArray(recordTagsRaw)
      ? recordTagsRaw.map((x) => cleanString(x)).filter(Boolean)
      : [];
    const recordProfile = (record as any).profile ?? {};

    // companies.application_email を可能なら埋める（任意）
    const contactEmail = cleanString((recordProfile as any)?.contact_email);

    // 1) companies 作成
    // ★ companies.id / companies.created_at が NOT NULL で default 無しでも確実に動くよう値を入れる
    const companyId = randomUUID();
    createdCompanyId = companyId;

    const companyBase: any = {
      id: companyId,
      company_name: companyName,
      created_at: now,
      updated_at: now,
    };

    // application_email 列が無い環境でも落とさないため、付で試し→失敗なら無しで再試行
    if (contactEmail) {
      const { error: cErrTry } = await supabase.from("companies").insert({
        ...companyBase,
        application_email: contactEmail,
      });
      if (cErrTry) {
        const { error: cErr } = await supabase.from("companies").insert(companyBase);
        if (cErr) return jsonErr(cErr.message, 500);
      }
    } else {
      const { error: cErr } = await supabase.from("companies").insert(companyBase);
      if (cErr) return jsonErr(cErr.message, 500);
    }

    // 2) company_records 作成
    // created_at/updated_at NOT NULL の可能性に備え、まず付で試し→ダメなら最小で再試行
    const recordInsertMin: any = {
      company_id: companyId,
      status: recordStatus,
      owner_user_id: null,
      tags: recordTags,
      memo: recordMemo,
      profile: recordProfile,
    };

    const recordInsertWithTs: any = {
      ...recordInsertMin,
      created_at: now,
      updated_at: now,
    };

    {
      const { error: rTryErr } = await supabase.from("company_records").insert(recordInsertWithTs);
      if (rTryErr) {
        const { error: rErr } = await supabase.from("company_records").insert(recordInsertMin);
        if (rErr) {
          await supabase.from("companies").delete().eq("id", companyId);
          createdCompanyId = null;
          return jsonErr(rErr.message, 500);
        }
      }
    }

    // 3) deals 作成（optional列/created_at not nullにも耐える）
    const dealInsertBase: any = {
      company_id: companyId,
      kind,
      title: dealTitle,
      stage: dealStage,
    };

    const optionalCols: any = {
      start_date: startDate,
      due_date: dueDate,
      amount,
      probability,
      memo: dealMemo ? String(dealMemo) : null,
    };

    const withTs: any = {
      created_at: now,
      updated_at: now,
    };

    // (1) optional + ts
    // (2) min + ts
    // (3) min
    let dealId = "";

    {
      const { data: d1, error: e1 } = await supabase
        .from("deals")
        .insert({ ...dealInsertBase, ...optionalCols, ...withTs })
        .select("id")
        .single();

      if (!e1) {
        dealId = cleanString((d1 as any)?.id);
      } else {
        const { data: d2, error: e2 } = await supabase
          .from("deals")
          .insert({ ...dealInsertBase, ...withTs })
          .select("id")
          .single();

        if (!e2) {
          dealId = cleanString((d2 as any)?.id);
        } else {
          const { data: d3, error: e3 } = await supabase
            .from("deals")
            .insert(dealInsertBase)
            .select("id")
            .single();

          if (e3) {
            await supabase.from("company_records").delete().eq("company_id", companyId);
            await supabase.from("companies").delete().eq("id", companyId);
            createdCompanyId = null;
            return jsonErr(e3.message, 500);
          }

          dealId = cleanString((d3 as any)?.id);
        }
      }
    }

    if (!dealId) {
      await supabase.from("company_records").delete().eq("company_id", companyId);
      await supabase.from("companies").delete().eq("id", companyId);
      createdCompanyId = null;
      return jsonErr("Failed to create deal", 500);
    }

    return jsonOk({
      ok: true,
      dealId,
      companyId,
      createdCompany: true,
      createdRecord: true,
    });
  } catch (e: any) {
    // 予期せぬ例外時も company だけ作ってたら戻す
    try {
      if (createdCompanyId) {
        await supabase.from("company_records").delete().eq("company_id", createdCompanyId);
        await supabase.from("companies").delete().eq("id", createdCompanyId);
      }
    } catch {
      // noop（ベストエフォート）
    }
    return jsonErr(String(e?.message ?? e ?? "unknown error"), 500);
  }
}
