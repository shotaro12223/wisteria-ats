import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseRoute";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type JobsListRow = {
  id: string;
  company_id: string | null;
  company_name: string | null;
  job_title: string | null;
  employment_type: string | null;
  site_status: any | null;
  created_at: string;
  updated_at: string;
};

export async function GET(req: NextRequest) {
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

  // Authorization check: Only admins can list all jobs
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

  const url = new URL(req.url);
  const companyId = String(url.searchParams.get("companyId") ?? "").trim();

  // Use supabase instead of supabaseAdmin
  let q = supabase
    .from("jobs")
    .select(
      "id, company_id, company_name, job_title, employment_type, site_status, applicants_count, counter_started_at, created_at, updated_at"
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(500);

  if (companyId) {
    q = q.eq("company_id", companyId);
  }

  const { data, error } = await q;

  if (error) {
    console.error("[jobs] GET error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: { message: "求人一覧の取得に失敗しました" },
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, jobs: (data ?? []) as JobsListRow[] });
}

type JobsCreateReq = {
  companyId: string;
  companyName?: string;
  jobTitle?: string;
  employmentType?: string;
  siteStatus?: any; // jsonb

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

  // Authorization check: Only admins can create jobs
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

  let body: JobsCreateReq;
  try {
    body = (await req.json()) as JobsCreateReq;
  } catch {
    return NextResponse.json(
      { ok: false, error: { message: "Invalid JSON" } },
      { status: 400 }
    );
  }

  const companyId = String(body.companyId ?? "").trim();
  if (!companyId) {
    return NextResponse.json(
      { ok: false, error: { message: "companyId is required" } },
      { status: 400 }
    );
  }

  const jobTitle = String(body.jobTitle ?? "").trim();
  if (!jobTitle) {
    return NextResponse.json(
      { ok: false, error: { message: "jobTitle is required" } },
      { status: 400 }
    );
  }

  const nowIso = new Date().toISOString();

  // jobs.id は text の想定 → こちらで作る
  const jobId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `job_${Math.random().toString(16).slice(2)}_${Date.now()}`;

  const payload: Record<string, any> = {
    id: jobId,
    company_id: companyId,
    company_name: String(body.companyName ?? "").trim() || null,
    job_title: jobTitle,
    employment_type: String(body.employmentType ?? "").trim() || null,
    site_status: body.siteStatus ?? null,
    created_at: nowIso,
    updated_at: nowIso,
  };

  // 求人詳細コンテンツ（camelCase → snake_case）
  if (typeof body.catchCopy === "string") payload.catch_copy = body.catchCopy;
  if (typeof body.jobCategory === "string") payload.job_category = body.jobCategory;
  if (typeof body.hiringCount === "string") payload.hiring_count = body.hiringCount;
  if (typeof body.postalCode === "string") payload.postal_code = body.postalCode;
  if (typeof body.prefectureCityTown === "string") payload.prefecture_city_town = body.prefectureCityTown;
  if (typeof body.addressLine === "string") payload.address_line = body.addressLine;
  if (typeof body.buildingFloor === "string") payload.building_floor = body.buildingFloor;
  if (typeof body.locationNote === "string") payload.location_note = body.locationNote;
  if (typeof body.nearestStation === "string") payload.nearest_station = body.nearestStation;
  if (typeof body.access === "string") payload.access = body.access;
  if (typeof body.workStyle === "string") payload.work_style = body.workStyle;
  if (typeof body.workHours === "string") payload.work_hours = body.workHours;
  if (typeof body.breakTime === "string") payload.break_time = body.breakTime;
  if (typeof body.avgMonthlyWorkHours === "string") payload.avg_monthly_work_hours = body.avgMonthlyWorkHours;
  if (typeof body.avgMonthlyWorkDays === "string") payload.avg_monthly_work_days = body.avgMonthlyWorkDays;
  if (typeof body.workDaysHoursRequired === "string") payload.work_days_hours_required = body.workDaysHoursRequired;
  if (typeof body.overtimeHours === "string") payload.overtime_hours = body.overtimeHours;
  if (typeof body.secondment === "string") payload.secondment = body.secondment;
  if (typeof body.payType === "string") payload.pay_type = body.payType;
  if (typeof body.grossPay === "string") payload.gross_pay = body.grossPay;
  if (typeof body.payMin === "number") payload.pay_min = body.payMin;
  if (typeof body.payMax === "number") payload.pay_max = body.payMax;
  if (typeof body.basePayAndAllowance === "string") payload.base_pay_and_allowance = body.basePayAndAllowance;
  if (typeof body.fixedAllowance === "string") payload.fixed_allowance = body.fixedAllowance;
  if (typeof body.fixedOvertime === "string") payload.fixed_overtime = body.fixedOvertime;
  if (typeof body.bonus === "string") payload.bonus = body.bonus;
  if (typeof body.raise === "string") payload.raise = body.raise;
  if (typeof body.annualIncomeExample === "string") payload.annual_income_example = body.annualIncomeExample;
  if (typeof body.payNote === "string") payload.pay_note = body.payNote;
  if (typeof body.holidays === "string") payload.holidays = body.holidays;
  if (typeof body.annualHolidays === "string") payload.annual_holidays = body.annualHolidays;
  if (typeof body.leave === "string") payload.leave = body.leave;
  if (typeof body.childcareLeave === "string") payload.childcare_leave = body.childcareLeave;
  if (typeof body.retirementAge === "string") payload.retirement_age = body.retirementAge;
  if (typeof body.jobDescription === "string") payload.job_description = body.jobDescription;
  if (typeof body.careerMap === "string") payload.career_map = body.careerMap;
  if (typeof body.appealPoints === "string") payload.appeal_points = body.appealPoints;
  if (typeof body.qualifications === "string") payload.qualifications = body.qualifications;
  if (typeof body.educationExperience === "string") payload.education_experience = body.educationExperience;
  if (typeof body.benefits === "string") payload.benefits = body.benefits;
  if (typeof body.socialInsurance === "string") payload.social_insurance = body.socialInsurance;
  if (typeof body.passiveSmoking === "string") payload.passive_smoking = body.passiveSmoking;
  if (typeof body.sideJob === "string") payload.side_job = body.sideJob;
  if (typeof body.probation === "string") payload.probation = body.probation;
  if (typeof body.probationPeriod === "string") payload.probation_period = body.probationPeriod;
  if (typeof body.probationCondition === "string") payload.probation_condition = body.probationCondition;
  if (typeof body.probationPayType === "string") payload.probation_pay_type = body.probationPayType;
  if (typeof body.probationPayMin === "number") payload.probation_pay_min = body.probationPayMin;
  if (typeof body.probationPayMax === "number") payload.probation_pay_max = body.probationPayMax;
  if (typeof body.probationFixedOvertime === "string") payload.probation_fixed_overtime = body.probationFixedOvertime;
  if (typeof body.probationAvgMonthlyWorkHours === "string") payload.probation_avg_monthly_work_hours = body.probationAvgMonthlyWorkHours;
  if (typeof body.probationNote === "string") payload.probation_note = body.probationNote;
  if (typeof body.contactEmail === "string") payload.contact_email = body.contactEmail;
  if (typeof body.contactPhone === "string") payload.contact_phone = body.contactPhone;
  if (typeof body.other === "string") payload.other = body.other;
  if (typeof body.tags === "string") payload.tags = body.tags;

  const { data, error } = await supabaseAdmin
    .from("jobs")
    .insert(payload)
    .select(
      "id, company_id, company_name, job_title, employment_type, site_status, created_at, updated_at"
    )
    .single();

  if (error) {
    console.error("[jobs] POST error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: { message: "求人の作成に失敗しました" },
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, job: data }, { status: 200 });
}
