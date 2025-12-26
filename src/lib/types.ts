export type PayType = "月給" | "年俸" | "時給" | "日給";

export type SiteStatus =
  | "準備中"
  | "掲載中"
  | "資料待ち"
  | "媒体審査中"
  | "NG"
  | "停止中";

export type JobSiteState = {
  status: SiteStatus;
  updatedAt: string; // ISO
  note?: string;
  rpoLastTouchedAt?: string; // ISO（RPOがこの媒体行を最後に触った日時）
};

export type Job = {
  id: string;

  /**
   * Company 配下にするための紐付けID（Phase1: localStorage）
   * 既存データ互換のため optional
   */
  companyId?: string;

  companyName: string;
  jobTitle: string;
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

  employmentType?: string;
  workStyle?: string;
  workHours?: string;
  breakTime?: string;
  avgMonthlyWorkHours?: string;
  avgMonthlyWorkDays?: string;
  workDaysHoursRequired?: string;
  overtimeHours?: string;
  secondment?: string;

  payType?: PayType;

  // 採用係長の「金額」にそのまま入れる用（あなたの運用）
  grossPay?: string;

  payMin?: number | null;
  payMax?: number | null;
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
  probationPayType?: PayType;
  probationPayMin?: number | null;
  probationPayMax?: number | null;
  probationFixedOvertime?: string;
  probationAvgMonthlyWorkHours?: string;
  probationNote?: string;

  contactEmail?: string;
  contactPhone?: string;
  other?: string;
  tags?: string;

  /**
   * 媒体ごとの進捗ステータス（Phase1: localStorage）
   * - siteKey は SITE_TEMPLATES のキー（媒体名）を想定
   * - 既存データ互換のため optional
   */
  siteStatus?: Record<string, JobSiteState>;

  createdAt: string;
  updatedAt: string;
};

/**
 * Company（会社概要）
 * - Phase1は localStorage 前提
 * - 将来 Supabase 置換しやすいように id + createdAt/updatedAt を持つ
 * - 任意項目は「未入力でも保存できる」運用を優先して optional
 */
export type Company = {
  id: string;

  // 基本
  companyName: string; // 会社名（法人名）
  tradeName?: string; // 屋号名
  corporateNumber?: string; // 法人番号
  website?: string; // ホームページ

  // 連絡先
  phone?: string; // 電話番号
  companyEmail?: string; // 会社用アドレス

  // 所在地（本社）
  hqPostalCode?: string; // 本社郵便番号
  hqAddress?: string; // 本社住所（まとめて1本）

  // 会社情報
  establishedDate?: string; // 設立年月日（YYYY-MM-DD or YYYY-MM）
  capital?: string; // 資本金（例: "1000万円"）
  businessDescription?: string; // 事業内容

  // 代表/担当
  representativeName?: string;
  representativeNameKana?: string;
  contactPersonName?: string;
  contactPersonNameKana?: string;

  // 従業員数（柔軟に）
  employeesTotal?: string;
  employeesFemale?: string;
  employeesPartTime?: string;

  // 応募/管理
  applicationReceptionNumber?: string; // 応募受付番号

  // 請求書送付先（会社住所と別の可能性あり）
  invoiceAddress?: string;

  // 既定の募集勤務地（求人ごとに上書きできる想定）
  defaultWorkLocationPostalCode?: string;

  createdAt: string;
  updatedAt: string;
};

export type TemplateField = {
  label: string;
  key:
    | keyof Job
    | "computed.payDisplayMethod"
    | "computed.payRangeText"
    | "computed.saiyouKeichoJobTitle"
    | "computed.saiyouKeichoPayNote"
    | "computed.saiyouKeichoWorkNote";
};

export type JobSite =
  | "Indeed"
  | "AirWork"
  | "採用係長"
  | "Engage"
  | "求人BOX"
  | "はたらきんぐ"
  | "ハローワーク"
  | "げんきワーク"
  | "ジモティー";

export type SiteTemplate = {
  site: JobSite;
  fields: TemplateField[];
};
