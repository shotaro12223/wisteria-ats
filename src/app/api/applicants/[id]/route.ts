import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { supabaseRoute } from "@/lib/supabaseRoute";
import { recordApplicantView, recordApplicantUpdate, recordApplicantDelete } from "@/lib/auditLog";

type ApplicantStatus = "NEW" | "DOC" | "INT" | "OFFER" | "NG";

// Status transition rules
const VALID_TRANSITIONS: Record<ApplicantStatus, ApplicantStatus[]> = {
  "NEW": ["DOC", "INT", "NG"],
  "DOC": ["INT", "NG"],
  "INT": ["OFFER", "NG"],
  "OFFER": ["NG"],  // Can withdraw offer
  "NG": []  // Cannot transition from NG
};

type ApplicantOut = {
  id: string;
  companyId: string;
  jobId: string;
  appliedAt: string;
  siteKey: string;
  name: string;
  status: ApplicantStatus;
  note?: string;
  client_comment?: string;
  createdAt: string;
  updatedAt: string;
  shared_with_client?: boolean;
  shared_at?: string | null;

  companyName?: string;
  jobTitle?: string;
};

function toApplicantBase(row: any): Omit<ApplicantOut, "companyName" | "jobTitle"> {
  return {
    id: String(row.id),
    companyId: String(row.company_id),
    jobId: String(row.job_id),
    appliedAt: String(row.applied_at),
    siteKey: String(row.site_key),
    name: String(row.name),
    status: String(row.status) as ApplicantStatus,
    note: row.note ?? undefined,
    client_comment: row.client_comment ?? undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    shared_with_client: row.shared_with_client ?? false,
    shared_at: row.shared_at ?? null,
  };
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await ctx.params;
  const id = String(rawId ?? "").trim();

  if (!id) {
    return NextResponse.json({ ok: false, error: { message: "id is required" } }, { status: 400 });
  }

  // 認証チェック（監査ログ用にuser_idが必要）
  const { supabase } = supabaseRoute(req);
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabaseAdmin
    .from("applicants")
    .select("id,company_id,job_id,applied_at,site_key,name,status,note,client_comment,created_at,updated_at,shared_with_client,shared_at")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { ok: false, error: { message: error?.message ?? "not found" } },
      { status: 404 }
    );
  }

  // 監査ログ記録（個人情報閲覧）
  if (user?.id) {
    await recordApplicantView(user.id, id, data.company_id);
  }

  const base = toApplicantBase(data);

  let companyName: string | undefined;
  let jobTitle: string | undefined;

  if (base.companyId) {
    const { data: c } = await supabaseAdmin
      .from("companies")
      .select("id,company_name")
      .eq("id", base.companyId)
      .maybeSingle();

    if (c?.company_name) companyName = String(c.company_name);
  }

  if (base.jobId) {
    const { data: j } = await supabaseAdmin
      .from("jobs")
      .select("id,job_title,company_name")
      .eq("id", base.jobId)
      .maybeSingle();

    if (j?.job_title) jobTitle = String(j.job_title);
    if (!companyName && j?.company_name) companyName = String(j.company_name);
  }

  const item: ApplicantOut = { ...base, companyName, jobTitle };

  return NextResponse.json({ ok: true, item });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await ctx.params;
  const id = String(rawId ?? "").trim();

  if (!id) {
    return NextResponse.json({ ok: false, error: { message: "id is required" } }, { status: 400 });
  }

  // 認証チェック（監査ログ用）
  const { supabase } = supabaseRoute(req);
  const { data: { user } } = await supabase.auth.getUser();

  const body = (await req.json()) as { status?: ApplicantStatus; note?: string; clientComment?: string; jobId?: string };

  const patch: Record<string, any> = { updated_at: new Date().toISOString() };

  // Status transition validation
  if (typeof body.status === "string" && body.status) {
    const newStatus = body.status.toUpperCase() as ApplicantStatus;

    // Validate status value
    if (!["NEW", "DOC", "INT", "OFFER", "NG"].includes(newStatus)) {
      return NextResponse.json(
        { ok: false, error: { message: "無効なステータスです" } },
        { status: 400 }
      );
    }

    // Get current status for transition validation
    const { data: current } = await supabaseAdmin
      .from("applicants")
      .select("status")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (current) {
      const currentStatus = (current.status || "NEW").toUpperCase() as ApplicantStatus;
      const allowedTransitions = VALID_TRANSITIONS[currentStatus] || [];

      if (!allowedTransitions.includes(newStatus) && currentStatus !== newStatus) {
        return NextResponse.json(
          {
            ok: false,
            error: {
              message: `${currentStatus}から${newStatus}への遷移はできません`,
              currentStatus,
              attemptedStatus: newStatus,
              allowedTransitions,
            },
          },
          { status: 400 }
        );
      }
    }

    patch.status = newStatus;
  }

  if (typeof body.note === "string") {
    patch.note = body.note.length ? body.note : null;
  }

  if (typeof body.clientComment === "string") {
    patch.client_comment = body.clientComment.length ? body.clientComment : null;
  }

  if (typeof body.jobId === "string") {
    patch.job_id = body.jobId.length ? body.jobId : null;
  }

  // updated_at しか無いなら弾く
  if (!("status" in patch) && !("note" in patch) && !("client_comment" in patch) && !("job_id" in patch)) {
    return NextResponse.json(
      { ok: false, error: { message: "status, note, clientComment, or jobId is required" } },
      { status: 400 }
    );
  }

  // 更新前の値を取得（監査ログ用）
  const { data: oldData } = await supabaseAdmin
    .from("applicants")
    .select("company_id, status, note, client_comment, job_id")
    .eq("id", id)
    .single();

  const { error } = await supabaseAdmin.from("applicants").update(patch).eq("id", id);

  if (error) {
    return NextResponse.json({ ok: false, error: { message: error.message } }, { status: 500 });
  }

  // 監査ログ記録（個人情報更新）
  if (user?.id && oldData) {
    const oldValue: Record<string, any> = {};
    const newValue: Record<string, any> = {};

    if ("status" in patch) {
      oldValue.status = oldData.status;
      newValue.status = patch.status;
    }
    if ("note" in patch) {
      oldValue.note = oldData.note;
      newValue.note = patch.note;
    }
    if ("client_comment" in patch) {
      oldValue.client_comment = oldData.client_comment;
      newValue.client_comment = patch.client_comment;
    }
    if ("job_id" in patch) {
      oldValue.job_id = oldData.job_id;
      newValue.job_id = patch.job_id;
    }

    await recordApplicantUpdate(user.id, id, oldValue, newValue, oldData.company_id);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await ctx.params;
  const id = String(rawId ?? "").trim();

  if (!id) {
    return NextResponse.json({ ok: false, error: { message: "id is required" } }, { status: 400 });
  }

  // 認証チェック（監査ログ用）
  const { supabase } = supabaseRoute(req);
  const { data: { user } } = await supabase.auth.getUser();

  // 削除前にcompany_idを取得（監査ログ用）
  const { data: applicantData } = await supabaseAdmin
    .from("applicants")
    .select("company_id")
    .eq("id", id)
    .single();

  // Clean up interview booking if exists
  await supabaseAdmin
    .from("interview_availability")
    .update({
      is_booked: false,
      booked_applicant_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("booked_applicant_id", id);

  // Soft delete
  const { error } = await supabaseAdmin
    .from("applicants")
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("[applicants/delete] Error:", error);
    return NextResponse.json(
      { ok: false, error: { message: "削除処理に失敗しました" } },
      { status: 500 }
    );
  }

  // 監査ログ記録（個人情報削除）
  if (user?.id) {
    await recordApplicantDelete(user.id, id, applicantData?.company_id);
  }

  return NextResponse.json({ ok: true, data: null });
}
