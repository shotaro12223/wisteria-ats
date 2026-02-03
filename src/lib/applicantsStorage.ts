import { supabaseBrowser } from "@/lib/supabaseBrowser";

/* =====================
 * Types（維持）
 * ===================== */

export type ApplicantStatus = "NEW" | "DOC" | "INT" | "OFFER" | "NG";

export type Applicant = {
  id: string;
  companyId: string;
  jobId: string;

  appliedAt: string; // YYYY-MM-DD
  siteKey: string; // Indeed 等（手入力可）

  name: string;
  status: ApplicantStatus;
  note?: string;

  createdAt: string; // ISO
  updatedAt: string; // ISO
};

/* =====================
 * Mapper
 * ===================== */

function mapRowToApplicant(row: any): Applicant {
  return {
    id: row.id,
    companyId: row.company_id,
    jobId: row.job_id,
    appliedAt: row.applied_at,
    siteKey: row.site_key,
    name: row.name,
    status: row.status,
    note: row.note ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/* =====================
 * Reads
 * ===================== */

/**
 * 求人ごとの応募一覧（求人詳細で使う）
 */
export async function listApplicantsByJob(args: {
  companyId: string;
  jobId: string;
}): Promise<Applicant[]> {
  const { data, error } = await supabaseBrowser()
    .from("applicants")
    .select("*")
    .eq("company_id", args.companyId)
    .eq("job_id", args.jobId)
    .order("applied_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[listApplicantsByJob]", error);
    return [];
  }

  return (data ?? []).map(mapRowToApplicant);
}

/**
 * 全社横断：応募一覧（/applicants で使う想定）
 */
export async function listApplicants(args?: {
  companyId?: string;
  status?: ApplicantStatus;
  q?: string;
}): Promise<Applicant[]> {
  let query = supabaseBrowser()
    .from("applicants")
    .select("*")
    .order("created_at", { ascending: false });

  if (args?.companyId) {
    query = query.eq("company_id", args.companyId);
  }

  if (args?.status) {
    query = query.eq("status", args.status);
  }

  if (args?.q) {
    query = query.or(`name.ilike.%${args.q}%,note.ilike.%${args.q}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[listApplicants]", error);
    return [];
  }

  return (data ?? []).map(mapRowToApplicant);
}

/**
 * ダッシュボード用：直近の応募（全ステータス）
 * - ApplicantsSummary 側で「未対応のみ（NEW）」を切り替えるため、ここでは status を絞らない
 */
export async function listRecentApplicants(limit = 5): Promise<Applicant[]> {
  const { data, error } = await supabaseBrowser()
    .from("applicants")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[listRecentApplicants]", error);
    return [];
  }

  return (data ?? []).map(mapRowToApplicant);
}

/* =====================
 * Writes
 * ===================== */

function makeClientId(prefix = "app") {
  // apps側の DB が text id & default無し想定なので、クライアント生成に寄せる
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

/**
 * 応募作成（求人詳細の「+ 応募を追加」で使う）
 */
export async function createApplicant(input: {
  companyId: string;
  jobId: string;
  appliedAt: string;
  siteKey: string;
  name: string;
  status: ApplicantStatus;
  note?: string;
}): Promise<Applicant | null> {
  const now = new Date().toISOString();
  const id = makeClientId("applicant");

  const { data, error } = await supabaseBrowser()
    .from("applicants")
    .insert({
      id,
      company_id: input.companyId,
      job_id: input.jobId,
      applied_at: input.appliedAt,
      site_key: input.siteKey,
      name: input.name,
      status: input.status,
      note: input.note ?? null,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) {
    console.error("[createApplicant]", error);
    return null;
  }

  return mapRowToApplicant(data);
}

/**
 * 応募更新（状態/メモ）
 * ApplicantsClient.tsx は updateApplicant({ ...a, status }) の形で呼んでたので、
 * 互換性のため「Applicant丸ごと渡し」でもOKにしている。
 */
export async function updateApplicant(next: Applicant): Promise<void>;
export async function updateApplicant(
  applicantId: string,
  patch: Partial<Pick<Applicant, "status" | "note">>
): Promise<void>;
export async function updateApplicant(a: any, b?: any): Promise<void> {
  const now = new Date().toISOString();

  // 1) updateApplicant(next: Applicant) 互換
  if (typeof a === "object" && a?.id && !b) {
    const next = a as Applicant;
    const { error } = await supabaseBrowser()
      .from("applicants")
      .update({
        status: next.status,
        note: next.note ?? null,
        updated_at: now,
      })
      .eq("id", next.id);

    if (error) console.error("[updateApplicant]", error);
    return;
  }

  // 2) updateApplicant(applicantId, patch)
  const applicantId = a as string;
  const patch = b as Partial<Pick<Applicant, "status" | "note">>;

  const { error } = await supabaseBrowser()
    .from("applicants")
    .update({
      status: patch.status,
      note: patch.note ?? null,
      updated_at: now,
    })
    .eq("id", applicantId);

  if (error) console.error("[updateApplicant]", error);
}

/**
 * 応募削除
 */
export async function deleteApplicant(applicantId: string): Promise<void> {
  const { error } = await supabaseBrowser()
    .from("applicants")
    .delete()
    .eq("id", applicantId);

  if (error) {
    console.error("[deleteApplicant]", error);
  }
}
