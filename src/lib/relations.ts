import type { Job } from "./types";
import { listJobs, upsertJob } from "./storage";

function normalizeName(v: string): string {
  return v.trim().replace(/\s+/g, " ");
}

/**
 * 指定会社配下の求人一覧
 */
export function listJobsByCompany(companyId: string): Job[] {
  const jobs = listJobs();
  return jobs.filter((j) => j.companyId === companyId);
}

/**
 * 既存データ移行（自動）
 * - companyId が空の求人のうち、companyName が一致するものを指定会社に紐付ける
 * - 会社マイページを開いたタイミングで呼ぶ想定
 *
 * 戻り値: 紐付けた件数
 */
export function migrateUnlinkedJobsToCompanyByName(params: {
  companyId: string;
  companyName: string;
}): number {
  const { companyId, companyName } = params;

  const companyNameNorm = normalizeName(companyName);
  if (companyNameNorm.length === 0) return 0;

  const jobs = listJobs();
  const targets = jobs.filter((j) => {
    const hasCompanyId = typeof j.companyId === "string" && j.companyId.trim().length > 0;
    if (hasCompanyId) return false;

    const jobCompanyNameNorm = normalizeName(j.companyName || "");
    return jobCompanyNameNorm === companyNameNorm;
  });

  if (targets.length === 0) return 0;

  const now = new Date().toISOString();

  for (const j of targets) {
    const next: Job = {
      ...j,
      companyId,
      updatedAt: now,
    };
    upsertJob(next);
  }

  return targets.length;
}
