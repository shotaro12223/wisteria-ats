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

// ========================================
// Meeting Request Types (Client Portal)
// ========================================

export type MeetingRequestStatus =
  | "pending"          // クライアントが依頼、管理者確認待ち
  | "dates_proposed"   // 管理者が候補日を提示
  | "confirmed"        // クライアントが日程確定
  | "completed"        // 打ち合わせ完了
  | "cancelled";       // キャンセル

export type MeetingRequest = {
  id: string;
  company_id: string;
  client_user_id: string;
  subject: string;
  note?: string;
  status: MeetingRequestStatus;

  // 管理者が提示する候補日時（ISO文字列の配列）
  proposed_dates?: string[];

  // クライアントが選んだ確定日時
  confirmed_date?: string;

  // 管理者からのメッセージ
  admin_message?: string;

  created_at: string;
  updated_at: string;
};

// ========================================
// Client Feedback Types (企業側フィードバック)
// ========================================

/** 面接結果 */
export type InterviewResult =
  | "pass"      // 合格
  | "fail"      // 不合格
  | "pending"   // 保留・検討中
  | "no_show";  // 無断欠席

/** 不合格理由カテゴリ */
export type FailReason =
  | "culture_mismatch"    // 社風に合わない
  | "skill_shortage"      // スキル不足
  | "experience_lack"     // 経験不足
  | "communication"       // コミュニケーション面
  | "motivation"          // 意欲・志望度が低い
  | "salary_mismatch"     // 条件面（給与）が合わない
  | "schedule_mismatch"   // 勤務条件（シフト等）が合わない
  | "appearance"          // 身だしなみ・印象
  | "overqualified"       // オーバースペック
  | "other";              // その他

/** 採用意向 */
export type HireIntention =
  | "strong_yes"  // ぜひ採用したい
  | "yes"         // 採用したい
  | "maybe"       // 検討中
  | "no";         // 採用見送り

/** 面接タイプ */
export type InterviewType =
  | "first"    // 一次面接
  | "second"   // 二次面接
  | "final"    // 最終面接
  | "casual"   // カジュアル面談
  | "trial";   // 体験入社・職場見学

/** 企業側フィードバック */
export type ApplicantClientFeedback = {
  id: string;
  applicant_id: string;
  company_id: string;
  client_user_id: string;

  // 面接情報
  interview_type: InterviewType;
  interview_date: string;        // YYYY-MM-DD
  interviewer_name?: string;

  // 面接結果
  interview_result: InterviewResult;

  // 不合格の場合
  fail_reason?: FailReason;
  fail_reason_detail?: string;   // 詳細コメント

  // 合格の場合
  pass_rating?: number;          // 1-5の評価
  pass_strengths?: string[];     // 良かった点（複数選択）
  pass_comment?: string;         // コメント

  // 採用意向（合格・保留時）
  hire_intention?: HireIntention;

  // 次のアクション
  next_action?: string;          // 「二次面接へ」「オファー提示」など

  created_at: string;
  updated_at: string;

  // JOIN用
  client_users?: {
    id: string;
    display_name: string;
  };
};

/** 良かった点の選択肢 */
export const PASS_STRENGTHS_OPTIONS = [
  { value: "experience", label: "経験・スキル" },
  { value: "communication", label: "コミュニケーション力" },
  { value: "motivation", label: "意欲・熱意" },
  { value: "culture_fit", label: "社風との相性" },
  { value: "personality", label: "人柄・誠実さ" },
  { value: "flexibility", label: "柔軟性" },
  { value: "leadership", label: "リーダーシップ" },
  { value: "teamwork", label: "チームワーク" },
] as const;

/** 不合格理由のラベル */
export const FAIL_REASON_LABELS: Record<FailReason, string> = {
  culture_mismatch: "社風に合わない",
  skill_shortage: "スキル不足",
  experience_lack: "経験不足",
  communication: "コミュニケーション面",
  motivation: "意欲・志望度が低い",
  salary_mismatch: "条件面（給与）が合わない",
  schedule_mismatch: "勤務条件が合わない",
  appearance: "身だしなみ・印象",
  overqualified: "オーバースペック",
  other: "その他",
};

/** 面接タイプのラベル */
export const INTERVIEW_TYPE_LABELS: Record<InterviewType, string> = {
  first: "一次面接",
  second: "二次面接",
  final: "最終面接",
  casual: "カジュアル面談",
  trial: "体験入社・職場見学",
};

/** 面接結果のラベル */
export const INTERVIEW_RESULT_LABELS: Record<InterviewResult, string> = {
  pass: "合格",
  fail: "不合格",
  pending: "保留・検討中",
  no_show: "無断欠席",
};

/** 採用意向のラベル */
export const HIRE_INTENTION_LABELS: Record<HireIntention, string> = {
  strong_yes: "ぜひ採用したい",
  yes: "採用したい",
  maybe: "検討中",
  no: "採用見送り",
};
