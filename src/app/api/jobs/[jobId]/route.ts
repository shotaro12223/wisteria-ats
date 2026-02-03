import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { supabaseRoute } from "@/lib/supabaseRoute";

type JobRow = {
  id: string;
  company_id: string | null;
  company_name: string | null;
  job_title: string | null;
  employment_type: string | null;
  site_status: any | null;

  // ✅ DB実態に合わせる
  applicants_count: number;
  counter_started_at: string;

  // 求人詳細コンテンツ
  catch_copy?: string | null;
  job_category?: string | null;
  hiring_count?: string | null;
  postal_code?: string | null;
  prefecture_city_town?: string | null;
  address_line?: string | null;
  building_floor?: string | null;
  location_note?: string | null;
  nearest_station?: string | null;
  access?: string | null;
  work_style?: string | null;
  work_hours?: string | null;
  break_time?: string | null;
  avg_monthly_work_hours?: string | null;
  avg_monthly_work_days?: string | null;
  work_days_hours_required?: string | null;
  overtime_hours?: string | null;
  secondment?: string | null;
  pay_type?: string | null;
  gross_pay?: string | null;
  pay_min?: number | null;
  pay_max?: number | null;
  base_pay_and_allowance?: string | null;
  fixed_allowance?: string | null;
  fixed_overtime?: string | null;
  bonus?: string | null;
  raise?: string | null;
  annual_income_example?: string | null;
  pay_note?: string | null;
  holidays?: string | null;
  annual_holidays?: string | null;
  leave?: string | null;
  childcare_leave?: string | null;
  retirement_age?: string | null;
  job_description?: string | null;
  career_map?: string | null;
  appeal_points?: string | null;
  qualifications?: string | null;
  education_experience?: string | null;
  benefits?: string | null;
  social_insurance?: string | null;
  passive_smoking?: string | null;
  side_job?: string | null;
  probation?: string | null;
  probation_period?: string | null;
  probation_condition?: string | null;
  probation_pay_type?: string | null;
  probation_pay_min?: number | null;
  probation_pay_max?: number | null;
  probation_fixed_overtime?: string | null;
  probation_avg_monthly_work_hours?: string | null;
  probation_note?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  other?: string | null;
  tags?: string | null;

  created_at: string;
  updated_at: string;
};

export async function GET(_req: Request, ctx: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await ctx.params;
  const id = String(jobId ?? "").trim();
  if (!id) {
    return NextResponse.json({ ok: false, error: { message: "Missing: jobId" } }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("jobs")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error) {
    console.error("[jobs/[jobId]] GET error:", error);
    return NextResponse.json(
      { ok: false, error: { message: "求人の取得に失敗しました" } },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, job: data as JobRow });
}

type PatchBody = {
  // ① まとめて置き換えたい場合（求人詳細の保存）
  jobTitle?: string;
  employmentType?: string;
  companyName?: string;
  companyId?: string;

  // ✅ アーカイブ名（保存時ポップアップで入力）
  archiveTitle?: string;

  // ② site_status を丸ごと置換
  siteStatus?: any;

  // ③ WorkQueueの「媒体行」だけ更新
  siteKey?: string;
  patchState?: {
    status?: string;
    updatedAt?: string;
    note?: string;
    rpoLastTouchedAt?: string;
  };

  // ✅ 応募数を手打ち更新したい場合（必要なら使う）
  applicantsCount?: number;

  // 求人詳細コンテンツ（camelCase from frontend）
  catchCopy?: string;
  jobCategory?: string;
  hiringCount?: string;
  postalCode?: string;
  prefectureCityTown?: string;
  addressLine?: string;
  buildingFloor?: string;
  locationNote?: string;
  nearestStation?: string;
  access?: string;
  workStyle?: string;
  workHours?: string;
  breakTime?: string;
  avgMonthlyWorkHours?: string;
  avgMonthlyWorkDays?: string;
  workDaysHoursRequired?: string;
  overtimeHours?: string;
  secondment?: string;
  payType?: string;
  grossPay?: string;
  payMin?: number;
  payMax?: number;
  basePayAndAllowance?: string;
  fixedAllowance?: string;
  fixedOvertime?: string;
  bonus?: string;
  raise?: string;
  annualIncomeExample?: string;
  payNote?: string;
  holidays?: string;
  annualHolidays?: string;
  leave?: string;
  childcareLeave?: string;
  retirementAge?: string;
  jobDescription?: string;
  careerMap?: string;
  appealPoints?: string;
  qualifications?: string;
  educationExperience?: string;
  benefits?: string;
  socialInsurance?: string;
  passiveSmoking?: string;
  sideJob?: string;
  probation?: string;
  probationPeriod?: string;
  probationCondition?: string;
  probationPayType?: string;
  probationPayMin?: number;
  probationPayMax?: number;
  probationFixedOvertime?: string;
  probationAvgMonthlyWorkHours?: string;
  probationNote?: string;
  contactEmail?: string;
  contactPhone?: string;
  other?: string;
  tags?: string;
};

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await ctx.params;
  const id = String(jobId ?? "").trim();
  if (!id) {
    return NextResponse.json({ ok: false, error: { message: "Missing: jobId" } }, { status: 400 });
  }

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

  // Authorization check: Only admins can update jobs
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

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ ok: false, error: { message: "Invalid JSON" } }, { status: 400 });
  }

  // ✅ 現在の job を取得（site_status マージ/アーカイブ用）
  const { data: cur, error: curErr } = await supabaseAdmin
    .from("jobs")
    .select("*")
    .eq("id", id)
    .single();

  if (curErr) {
    console.error("[jobs/[jobId]] PATCH - fetch current job error:", curErr);
    return NextResponse.json(
      { ok: false, error: { message: "現在の求人情報の取得に失敗しました" } },
      { status: 500 }
    );
  }

  // -----------------------------
  // 入力パターン判定
  // -----------------------------
  const hasSiteStatusReplace = "siteStatus" in body; // null置換も含む
  const hasSiteRowPatch =
    typeof body.siteKey === "string" &&
    body.siteKey.trim() &&
    body.patchState &&
    typeof body.patchState === "object";

  // ✅ 「保存ボタン」扱い（= アーカイブしてカウンタリセット）
  const archiveTitle = typeof body.archiveTitle === "string" ? body.archiveTitle.trim() : "";
  const isArchiveSave = !hasSiteRowPatch && archiveTitle.length > 0;

  // -----------------------------
  // 次の値を組み立て
  // -----------------------------
  const nextCompanyId =
    typeof body.companyId === "string" ? body.companyId.trim() || null : ((cur as any).company_id ?? null);

  const nextCompanyName =
    typeof body.companyName === "string" ? body.companyName.trim() : String((cur as any).company_name ?? "");

  const nextJobTitle =
    typeof body.jobTitle === "string" ? body.jobTitle.trim() : String((cur as any).job_title ?? "");

  const nextEmploymentType =
    typeof body.employmentType === "string"
      ? body.employmentType.trim()
      : String((cur as any).employment_type ?? "");

  // site_status の次状態
  let nextSiteStatus: any = (cur as any).site_status ?? null;

  if (hasSiteStatusReplace) {
    nextSiteStatus = (body as any).siteStatus ?? null;
  } else if (hasSiteRowPatch) {
    const siteKey = body.siteKey!.trim();

    const curSiteStatus = (cur as any).site_status;
    const base = curSiteStatus && typeof curSiteStatus === "object" ? curSiteStatus : {};

    const curRow = base[siteKey] && typeof base[siteKey] === "object" ? base[siteKey] : {};
    const nextRow = { ...curRow, ...body.patchState };

    nextSiteStatus = { ...base, [siteKey]: nextRow };
  }

  // -----------------------------
  // 保存処理
  // -----------------------------
  try {
    // ✅ 1) 保存ボタン：アーカイブ → jobs更新 → カウンタリセット
    if (isArchiveSave) {
      if (!nextJobTitle.trim()) {
        return NextResponse.json({ ok: false, error: { message: "職種が空です" } }, { status: 400 });
      }

      // アーカイブ前の応募数を保持（RPCが正しく保存しない場合に備える）
      const prevApplicantsCount = Number((cur as any).applicants_count ?? 0);

      const { data: rpcData, error: rpcErr } = await supabaseAdmin.rpc("archive_and_update_job_v2", {
        p_job_id: id,
        p_archive_title: archiveTitle,
        p_company_id: String(nextCompanyId ?? ""),
        p_company_name: nextCompanyName ?? "",
        p_job_title: nextJobTitle ?? "",
        p_employment_type: nextEmploymentType ?? "",
        p_site_status: nextSiteStatus ?? null,
      });

      if (rpcErr) {
        console.error("[jobs/[jobId]] PATCH - archive RPC error:", rpcErr);
        return NextResponse.json(
          { ok: false, error: { message: "求人のアーカイブ保存に失敗しました" } },
          { status: 500 }
        );
      }

      const updated = Array.isArray(rpcData) ? rpcData[0] : rpcData;

      // 今回作成されたアーカイブ（最新1件）にだけ応募数を反映
      const { data: latestArchive } = await supabaseAdmin
        .from("job_archives")
        .select("id")
        .eq("job_id", id)
        .order("archived_at", { ascending: false })
        .limit(1)
        .single();

      if (latestArchive?.id) {
        await supabaseAdmin
          .from("job_archives")
          .update({ cycle_applicants_count: prevApplicantsCount })
          .eq("id", latestArchive.id);
      }

      // jobs の applicants_count を 0 にリセット
      await supabaseAdmin
        .from("jobs")
        .update({ applicants_count: 0, updated_at: new Date().toISOString() })
        .eq("id", id);

      return NextResponse.json(
        {
          ok: true,
          job: {
            id: String(updated?.id ?? id),
            company_id: updated?.company_id ?? nextCompanyId ?? null,
            company_name: updated?.company_name ?? nextCompanyName ?? null,
            job_title: updated?.job_title ?? nextJobTitle ?? null,
            employment_type: updated?.employment_type ?? nextEmploymentType ?? null,
            site_status: updated?.site_status ?? nextSiteStatus ?? null,

            applicants_count: 0,
            counter_started_at: new Date().toISOString(),

            created_at: String(updated?.created_at ?? (cur as any).created_at),
            updated_at: String(updated?.updated_at ?? new Date().toISOString()),
          } as JobRow,
        },
        { status: 200 }
      );
    }

    // ✅ 2) WorkQueueなど：媒体行更新 / 軽微更新（アーカイブ・リセットしない）
    const nowIso = new Date().toISOString();
    const updatePayload: Record<string, any> = { updated_at: nowIso };

    if (typeof body.jobTitle === "string") updatePayload.job_title = body.jobTitle.trim();
    if (typeof body.employmentType === "string") updatePayload.employment_type = body.employmentType.trim();
    if (typeof body.companyName === "string") updatePayload.company_name = body.companyName.trim();
    if (typeof body.companyId === "string") updatePayload.company_id = body.companyId.trim() || null;

    if (hasSiteStatusReplace || hasSiteRowPatch) {
      updatePayload.site_status = nextSiteStatus ?? null;
    }

    // ✅ 手打ち応募数更新（必要なら）
    if (typeof body.applicantsCount === "number" && Number.isFinite(body.applicantsCount)) {
      updatePayload.applicants_count = Math.max(0, Math.trunc(body.applicantsCount));
    }

    // ✅ 求人詳細コンテンツ（camelCase → snake_case）
    if (typeof body.catchCopy === "string") updatePayload.catch_copy = body.catchCopy;
    if (typeof body.jobCategory === "string") updatePayload.job_category = body.jobCategory;
    if (typeof body.hiringCount === "string") updatePayload.hiring_count = body.hiringCount;
    if (typeof body.postalCode === "string") updatePayload.postal_code = body.postalCode;
    if (typeof body.prefectureCityTown === "string") updatePayload.prefecture_city_town = body.prefectureCityTown;
    if (typeof body.addressLine === "string") updatePayload.address_line = body.addressLine;
    if (typeof body.buildingFloor === "string") updatePayload.building_floor = body.buildingFloor;
    if (typeof body.locationNote === "string") updatePayload.location_note = body.locationNote;
    if (typeof body.nearestStation === "string") updatePayload.nearest_station = body.nearestStation;
    if (typeof body.access === "string") updatePayload.access = body.access;
    if (typeof body.workStyle === "string") updatePayload.work_style = body.workStyle;
    if (typeof body.workHours === "string") updatePayload.work_hours = body.workHours;
    if (typeof body.breakTime === "string") updatePayload.break_time = body.breakTime;
    if (typeof body.avgMonthlyWorkHours === "string") updatePayload.avg_monthly_work_hours = body.avgMonthlyWorkHours;
    if (typeof body.avgMonthlyWorkDays === "string") updatePayload.avg_monthly_work_days = body.avgMonthlyWorkDays;
    if (typeof body.workDaysHoursRequired === "string") updatePayload.work_days_hours_required = body.workDaysHoursRequired;
    if (typeof body.overtimeHours === "string") updatePayload.overtime_hours = body.overtimeHours;
    if (typeof body.secondment === "string") updatePayload.secondment = body.secondment;
    if (typeof body.payType === "string") updatePayload.pay_type = body.payType;
    if (typeof body.grossPay === "string") updatePayload.gross_pay = body.grossPay;
    if (typeof body.payMin === "number") updatePayload.pay_min = body.payMin;
    if (typeof body.payMax === "number") updatePayload.pay_max = body.payMax;
    if (typeof body.basePayAndAllowance === "string") updatePayload.base_pay_and_allowance = body.basePayAndAllowance;
    if (typeof body.fixedAllowance === "string") updatePayload.fixed_allowance = body.fixedAllowance;
    if (typeof body.fixedOvertime === "string") updatePayload.fixed_overtime = body.fixedOvertime;
    if (typeof body.bonus === "string") updatePayload.bonus = body.bonus;
    if (typeof body.raise === "string") updatePayload.raise = body.raise;
    if (typeof body.annualIncomeExample === "string") updatePayload.annual_income_example = body.annualIncomeExample;
    if (typeof body.payNote === "string") updatePayload.pay_note = body.payNote;
    if (typeof body.holidays === "string") updatePayload.holidays = body.holidays;
    if (typeof body.annualHolidays === "string") updatePayload.annual_holidays = body.annualHolidays;
    if (typeof body.leave === "string") updatePayload.leave = body.leave;
    if (typeof body.childcareLeave === "string") updatePayload.childcare_leave = body.childcareLeave;
    if (typeof body.retirementAge === "string") updatePayload.retirement_age = body.retirementAge;
    if (typeof body.jobDescription === "string") updatePayload.job_description = body.jobDescription;
    if (typeof body.careerMap === "string") updatePayload.career_map = body.careerMap;
    if (typeof body.appealPoints === "string") updatePayload.appeal_points = body.appealPoints;
    if (typeof body.qualifications === "string") updatePayload.qualifications = body.qualifications;
    if (typeof body.educationExperience === "string") updatePayload.education_experience = body.educationExperience;
    if (typeof body.benefits === "string") updatePayload.benefits = body.benefits;
    if (typeof body.socialInsurance === "string") updatePayload.social_insurance = body.socialInsurance;
    if (typeof body.passiveSmoking === "string") updatePayload.passive_smoking = body.passiveSmoking;
    if (typeof body.sideJob === "string") updatePayload.side_job = body.sideJob;
    if (typeof body.probation === "string") updatePayload.probation = body.probation;
    if (typeof body.probationPeriod === "string") updatePayload.probation_period = body.probationPeriod;
    if (typeof body.probationCondition === "string") updatePayload.probation_condition = body.probationCondition;
    if (typeof body.probationPayType === "string") updatePayload.probation_pay_type = body.probationPayType;
    if (typeof body.probationPayMin === "number") updatePayload.probation_pay_min = body.probationPayMin;
    if (typeof body.probationPayMax === "number") updatePayload.probation_pay_max = body.probationPayMax;
    if (typeof body.probationFixedOvertime === "string") updatePayload.probation_fixed_overtime = body.probationFixedOvertime;
    if (typeof body.probationAvgMonthlyWorkHours === "string") updatePayload.probation_avg_monthly_work_hours = body.probationAvgMonthlyWorkHours;
    if (typeof body.probationNote === "string") updatePayload.probation_note = body.probationNote;
    if (typeof body.contactEmail === "string") updatePayload.contact_email = body.contactEmail;
    if (typeof body.contactPhone === "string") updatePayload.contact_phone = body.contactPhone;
    if (typeof body.other === "string") updatePayload.other = body.other;
    if (typeof body.tags === "string") updatePayload.tags = body.tags;

    const { data, error } = await supabaseAdmin
      .from("jobs")
      .update(updatePayload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("[jobs/[jobId]] PATCH - update error:", error);
      return NextResponse.json(
        { ok: false, error: { message: "求人の更新に失敗しました" } },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, job: data as JobRow }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: { message: e?.message ?? "unexpected error" } }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await ctx.params;
  const id = String(jobId ?? "").trim();
  if (!id) {
    return NextResponse.json({ ok: false, error: { message: "Missing: jobId" } }, { status: 400 });
  }

  // Check for related applicants
  const { data: relatedApplicants } = await supabaseAdmin
    .from("applicants")
    .select("id")
    .eq("job_id", id)
    .is("deleted_at", null);

  const applicantCount = relatedApplicants?.length || 0;

  if (applicantCount > 0) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: `この求人には${applicantCount}件の応募者が紐づいています。先に応募者を削除してください。`,
          relatedData: {
            applicants: applicantCount,
          },
        },
      },
      { status: 400 }
    );
  }

  // Soft delete
  const { error } = await supabaseAdmin
    .from("jobs")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("[jobs/[jobId]] DELETE error:", error);
    return NextResponse.json(
      { ok: false, error: { message: "求人の削除に失敗しました" } },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, data: null });
}
