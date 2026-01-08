import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type JobRow = {
  id: string;
  company_id: string | null;
  company_name: string | null;
  job_title: string | null;
  employment_type: string | null;
  site_status: any | null;
  created_at: string;
  updated_at: string;
};

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await ctx.params;
  const id = String(jobId ?? "").trim();
  if (!id) {
    return NextResponse.json(
      { ok: false, error: { message: "Missing: jobId" } },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("jobs")
    .select(
      "id, company_id, company_name, job_title, employment_type, site_status, created_at, updated_at"
    )
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        },
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, job: data as JobRow });
}

type PatchBody = {
  // ① まとめて置き換えたい場合（jobs編集画面用）
  jobTitle?: string;
  employmentType?: string;
  companyName?: string;
  companyId?: string;

  // ② site_status を丸ごと置換したい場合（いちばん簡単）
  siteStatus?: any;

  // ③ WorkQueueの「媒体行」だけ更新したい場合（推奨）
  siteKey?: string;
  patchState?: {
    status?: string; // "資料待ち"など
    updatedAt?: string; // 媒体更新日（ステータス変更時だけ更新したいならクライアント側で制御）
    note?: string;
    rpoLastTouchedAt?: string; // メモ保存で更新する想定
  };
};

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await ctx.params;
  const id = String(jobId ?? "").trim();
  if (!id) {
    return NextResponse.json(
      { ok: false, error: { message: "Missing: jobId" } },
      { status: 400 }
    );
  }

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: { message: "Invalid JSON" } },
      { status: 400 }
    );
  }

  const nowIso = new Date().toISOString();

  // 現在の job を取得（site_status をマージするため）
  const { data: cur, error: curErr } = await supabaseAdmin
    .from("jobs")
    .select(
      "id, company_id, company_name, job_title, employment_type, site_status, created_at, updated_at"
    )
    .eq("id", id)
    .single();

  if (curErr) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: curErr.message,
          details: curErr.details,
          hint: curErr.hint,
          code: curErr.code,
        },
      },
      { status: 500 }
    );
  }

  const updatePayload: Record<string, any> = {
    updated_at: nowIso,
  };

  // 通常項目
  if (typeof body.jobTitle === "string") updatePayload.job_title = body.jobTitle.trim();
  if (typeof body.employmentType === "string") updatePayload.employment_type = body.employmentType.trim();
  if (typeof body.companyName === "string") updatePayload.company_name = body.companyName.trim();
  if (typeof body.companyId === "string") updatePayload.company_id = body.companyId.trim() || null;

  // site_status の扱い
  const hasSiteStatusReplace = "siteStatus" in body;
  const hasSiteRowPatch = typeof body.siteKey === "string" && body.siteKey.trim() && body.patchState && typeof body.patchState === "object";

  if (hasSiteStatusReplace) {
    // 丸ごと置換（nullも許可）
    updatePayload.site_status = body.siteStatus ?? null;
  } else if (hasSiteRowPatch) {
    // 1行だけマージ（WorkQueue向け）
    const siteKey = body.siteKey!.trim();

    const curSiteStatus = (cur as any).site_status;
    const base =
      curSiteStatus && typeof curSiteStatus === "object" ? curSiteStatus : {};

    const curRow =
      base[siteKey] && typeof base[siteKey] === "object" ? base[siteKey] : {};

    const nextRow = {
      ...curRow,
      ...body.patchState,
    };

    updatePayload.site_status = {
      ...base,
      [siteKey]: nextRow,
    };
  }

  const { data, error } = await supabaseAdmin
    .from("jobs")
    .update(updatePayload)
    .eq("id", id)
    .select(
      "id, company_id, company_name, job_title, employment_type, site_status, created_at, updated_at"
    )
    .single();

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        },
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, job: data as JobRow }, { status: 200 });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await ctx.params;
  const id = String(jobId ?? "").trim();
  if (!id) {
    return NextResponse.json(
      { ok: false, error: { message: "Missing: jobId" } },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin.from("jobs").delete().eq("id", id);

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        },
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
