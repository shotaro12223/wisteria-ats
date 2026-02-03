import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { supabaseRoute } from "@/lib/supabaseRoute";
import { randomUUID } from "crypto";

type CompanyRow = {
  id: string;
  company_name: string;
  company_profile: any;
  created_at: string;
  updated_at: string;
};

type BulkReqJson =
  | { names: string[] }
  | { companies: Array<{ companyName: string }> };

function normalizeName(s: string): string {
  return String(s ?? "")
    .replace(/\u3000/g, " ") // 全角スペース→半角
    .trim();
}

function parseNamesFromText(text: string): string[] {
  // CSV（1列） or 改行区切りの想定
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // 1列CSV想定なので、カンマがあっても先頭列を採用
  const names = lines
    .map((l) => l.split(",")[0]?.trim() ?? "")
    .map(normalizeName)
    .filter(Boolean)
    .filter((n) => n !== "企業名"); // ヘッダ混入対策

  // 重複排除（順序維持）
  const seen = new Set<string>();
  const uniq: string[] = [];
  for (const n of names) {
    if (seen.has(n)) continue;
    seen.add(n);
    uniq.push(n);
  }
  return uniq;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function POST(req: NextRequest) {
  const { supabase } = supabaseRoute(req);

  // Authentication check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { ok: false, error: { message: "Unauthorized" } },
      { status: 401 }
    );
  }

  // Authorization check: Only admins can bulk create companies
  const { data: workspaceMember } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("user_id", user.id)
    .single();

  const isAdmin = workspaceMember?.role === "admin";

  if (!isAdmin) {
    return NextResponse.json(
      { ok: false, error: { message: "Access denied" } },
      { status: 403 }
    );
  }

  // 受け取りは2系統：
  // 1) JSON: { names: [...] } or { companies: [{ companyName }] }
  // 2) text/csv or text/plain: 1行1社（1列）
  const ct = req.headers.get("content-type") ?? "";

  let names: string[] = [];

  try {
    if (ct.includes("application/json")) {
      const body = (await req.json()) as BulkReqJson;

      if ("names" in body && Array.isArray(body.names)) {
        names = body.names.map(normalizeName).filter(Boolean);
      } else if ("companies" in body && Array.isArray(body.companies)) {
        names = body.companies
          .map((c) => normalizeName((c as any)?.companyName))
          .filter(Boolean);
      } else {
        return NextResponse.json(
          { ok: false, error: { message: "Invalid JSON body. Use {names:[...]}." } },
          { status: 400 }
        );
      }
    } else {
      const text = await req.text();
      names = parseNamesFromText(text);
    }
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: { message: "Invalid request body" } },
      { status: 400 }
    );
  }

  // 正規化＆重複排除
  names = names.map(normalizeName).filter(Boolean).filter((n) => n !== "企業名");
  const seen = new Set<string>();
  names = names.filter((n) => (seen.has(n) ? false : (seen.add(n), true)));

  if (names.length === 0) {
    return NextResponse.json(
      { ok: false, error: { message: "No company names found" } },
      { status: 400 }
    );
  }

  const nowIso = new Date().toISOString();

  // 既存チェック（company_name が同じなら作らない）
  // ※ IN 句の制限/サイズ考慮して分割
  const nameChunks = chunk(names, 200);

  const existingByName = new Map<string, CompanyRow>();
  for (const part of nameChunks) {
    const { data, error } = await supabaseAdmin
      .from("companies")
      .select("id, company_name, company_profile, created_at, updated_at")
      .is("deleted_at", null)
      .in("company_name", part);

    if (error) {
      console.error("[companies/bulk] Existing companies check error:", error);
      return NextResponse.json(
        { ok: false, error: { message: "既存企業の確認に失敗しました" } },
        { status: 500 }
      );
    }

    for (const r of (data as CompanyRow[] | null) ?? []) {
      existingByName.set(r.company_name, r);
    }
  }

  const toInsert = names
    .filter((n) => !existingByName.has(n))
    .map((companyName) => ({
      id: randomUUID(), // idは text なのでUUIDでOK（URLにも使える）
      company_name: companyName,
      company_profile: {}, // 今回は空で作る
      created_at: nowIso,
      updated_at: nowIso,
    }));

  let inserted: CompanyRow[] = [];
  if (toInsert.length > 0) {
    const { data, error } = await supabaseAdmin
      .from("companies")
      .insert(toInsert)
      .select("id, company_name, company_profile, created_at, updated_at");

    if (error) {
      console.error("[companies/bulk] Insert error:", error);
      return NextResponse.json(
        { ok: false, error: { message: "企業の一括登録に失敗しました" } },
        { status: 500 }
      );
    }

    inserted = (data as CompanyRow[] | null) ?? [];
    for (const r of inserted) {
      existingByName.set(r.company_name, r);
    }
  }

  // 返却：入力順で、最終的にDBにある行（既存 + 新規）
  const result = names
    .map((n) => existingByName.get(n))
    .filter(Boolean) as CompanyRow[];

  return NextResponse.json({
    ok: true,
    summary: {
      input: names.length,
      created: inserted.length,
      existed: names.length - inserted.length,
    },
    companies: result,
  });
}
