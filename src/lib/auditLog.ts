import { supabaseAdmin } from "./supabaseAdmin";

type AuditAction =
  | "applicant_view"
  | "applicant_update"
  | "applicant_delete"
  | "applicant_export"
  | "company_view"
  | "company_update"
  | "company_delete"
  | "job_view"
  | "job_update"
  | "job_delete"
  | "deal_view"
  | "deal_update"
  | "deal_delete"
  | "client_user_invite"
  | "client_user_update";

type AuditLogEntry = {
  userId: string;
  companyId?: string | null;
  action: AuditAction;
  resourceType: "applicant" | "company" | "job" | "deal" | "client_user";
  resourceId: string;
  oldValue?: Record<string, any> | null;
  newValue?: Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

/**
 * Record audit log entry (GDPR/個人情報保護法対応)
 * 個人情報へのアクセス・変更を記録
 */
export async function recordAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    const now = new Date().toISOString();

    await supabaseAdmin.from("audit_logs").insert({
      user_id: entry.userId,
      company_id: entry.companyId || null,
      action: entry.action,
      resource_type: entry.resourceType,
      resource_id: entry.resourceId,
      old_value: entry.oldValue || null,
      new_value: entry.newValue || null,
      created_at: now,
    });

    console.log(
      `[AuditLog] Recorded: ${entry.action} on ${entry.resourceType}:${entry.resourceId} by ${entry.userId}`
    );
  } catch (error) {
    // 監査ログ記録の失敗はエラーにしない（ビジネスロジックを止めない）
    console.error("[AuditLog] Failed to record audit log:", error);
  }
}

/**
 * Record applicant view (個人情報閲覧ログ)
 */
export async function recordApplicantView(
  userId: string,
  applicantId: string,
  companyId?: string
): Promise<void> {
  await recordAuditLog({
    userId,
    companyId,
    action: "applicant_view",
    resourceType: "applicant",
    resourceId: applicantId,
  });
}

/**
 * Record applicant update (個人情報変更ログ)
 */
export async function recordApplicantUpdate(
  userId: string,
  applicantId: string,
  oldValue: Record<string, any>,
  newValue: Record<string, any>,
  companyId?: string
): Promise<void> {
  await recordAuditLog({
    userId,
    companyId,
    action: "applicant_update",
    resourceType: "applicant",
    resourceId: applicantId,
    oldValue,
    newValue,
  });
}

/**
 * Record applicant deletion (個人情報削除ログ)
 */
export async function recordApplicantDelete(
  userId: string,
  applicantId: string,
  companyId?: string
): Promise<void> {
  await recordAuditLog({
    userId,
    companyId,
    action: "applicant_delete",
    resourceType: "applicant",
    resourceId: applicantId,
  });
}

/**
 * Record bulk applicant export (データエクスポートログ)
 */
export async function recordApplicantExport(
  userId: string,
  exportCount: number,
  companyId?: string
): Promise<void> {
  await recordAuditLog({
    userId,
    companyId,
    action: "applicant_export",
    resourceType: "applicant",
    resourceId: `bulk_export_${exportCount}_records`,
  });
}
