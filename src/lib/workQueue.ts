import type { Company, Job, JobSiteState, SiteStatus } from "./types";

/**
 * WorkQueue は「求人 × 媒体」の行で扱う。
 * 対象ステータスは要対応の4つだけ。
 */
export type WorkQueueStatus = Extract<
  SiteStatus,
  "資料待ち" | "媒体審査中" | "NG" | "停止中"
>;

export type WorkQueueRow = {
  companyId?: string;
  companyName: string;

  jobId: string;
  jobTitle: string;

  siteKey: string; // job.siteStatus のキー（例: "Indeed"）
  state: JobSiteState;

  status: WorkQueueStatus;

  // 滞留起点 = 媒体更新日（mediaUpdatedAt）
  staleAtISO: string;
  staleDays: number | null;

  // RPO最終タッチ（rpoLastTouchedAt 基準）
  // 欠損/壊れた場合は null（表示 "-"、RPO未タッチフィルタでは除外 or 要件次第）
  rpoTouchedDays: number | null;

  // 表示用（WorkQueueClient が参照）
  mediaUpdatedAtISO: string; // state.updatedAt
  rpoLastTouchedAtISO?: string; // state.rpoLastTouchedAt

  // 応募情報（Phase 1.1）
  applicantCount?: number; // この求人×媒体の応募数
  lastApplicantDate?: string | null; // 最新応募日
  lastApplicantDays?: number | null; // 最新応募からの経過日数

  // 担当者・期限（Phase 1.4）
  assignee?: string | null; // 担当者名
  deadline?: string | null; // 期限日（ISO）

  // UI状態
  checked?: boolean; // バッチ操作用チェック状態
};

function toMs(iso: string): number {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : NaN;
}

/**
 * ISO日時をローカル日付（0:00）に丸めたmsを返す
 */
function toLocalDateStartMsFromISO(iso: string): number {
  const ms = toMs(iso);
  if (!Number.isFinite(ms)) return NaN;
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function localTodayStartMs(now: Date): number {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

/**
 * 滞留起点は「媒体更新日（state.updatedAt）」のみ。
 */
export function computeStaleAtISO(state: JobSiteState): string {
  return state.updatedAt;
}

/**
 * 0時基準の日付差（整数日）
 * 欠損/壊れは null
 */
export function computeDayDiffFromISO(now: Date, iso?: string): number | null {
  if (!iso) return null;

  const now0 = localTodayStartMs(now);
  const iso0 = toLocalDateStartMsFromISO(iso);

  if (!Number.isFinite(iso0)) return null;

  const diff = now0 - iso0;
  const dayMs = 24 * 60 * 60 * 1000;

  return Math.max(0, Math.floor(diff / dayMs));
}

export function buildWorkQueueRows(args: {
  jobs: Job[];
  companies: Company[];
  now?: Date;
}): WorkQueueRow[] {
  const now = args.now ?? new Date();
  const companyById = new Map<string, Company>(args.companies.map((c) => [c.id, c]));

  const rows: WorkQueueRow[] = [];

  for (const job of args.jobs) {
    const company = job.companyId ? companyById.get(job.companyId) : undefined;

    const companyName = company?.companyName ?? job.companyName ?? "(未設定)";

    const siteStatus = job.siteStatus;
    if (!siteStatus) continue;

    for (const [siteKey, state] of Object.entries(siteStatus)) {
      const status = state.status as SiteStatus;

      if (
        status !== "資料待ち" &&
        status !== "媒体審査中" &&
        status !== "NG" &&
        status !== "停止中"
      ) {
        continue;
      }

      const staleAtISO = computeStaleAtISO(state); // = state.updatedAt
      const staleDays = computeDayDiffFromISO(now, staleAtISO); // number | null

      const rpoTouchedDays = computeDayDiffFromISO(now, state.rpoLastTouchedAt); // number | null

      rows.push({
        companyId: job.companyId,
        companyName,
        jobId: job.id,
        jobTitle: job.jobTitle || "(求人名未設定)",
        siteKey,
        state,
        status: status as WorkQueueStatus,
        staleAtISO,
        staleDays,
        rpoTouchedDays,
        mediaUpdatedAtISO: state.updatedAt,
        rpoLastTouchedAtISO: state.rpoLastTouchedAt,
      });
    }
  }

  return sortRows(rows);
}

export function sortRows(rows: WorkQueueRow[]): WorkQueueRow[] {
  const statusPriority: Record<WorkQueueStatus, number> = {
    NG: 1,
    資料待ち: 2,
    媒体審査中: 3,
    停止中: 4,
  };

  return [...rows].sort((a, b) => {
    // 1) 滞留日数 降順（null は最後）
    const ad = a.staleDays;
    const bd = b.staleDays;

    const aNull = ad == null;
    const bNull = bd == null;

    if (aNull && !bNull) return 1;
    if (!aNull && bNull) return -1;
    if (!aNull && !bNull && ad !== bd) return bd - ad;

    // 2) 状態優先度
    const pa = statusPriority[a.status];
    const pb = statusPriority[b.status];
    if (pa !== pb) return pa - pb;

    // 3) 会社名
    return (a.companyName ?? "").localeCompare(b.companyName ?? "", "ja");
  });
}

export type Filters = {
  qCompany: string;
  sites: string[]; // selected site keys
  statuses: WorkQueueStatus[];
  staleThreshold: "ALL" | "3PLUS" | "7PLUS";

  // RPO最終タッチで絞る（例：7日以上触ってない）
  rpoThreshold: "ALL" | "7PLUS_UNTOUCHED";
};

export const DEFAULT_FILTERS: Filters = {
  qCompany: "",
  sites: [],
  statuses: ["NG", "資料待ち", "媒体審査中"],
  staleThreshold: "3PLUS",
  rpoThreshold: "ALL",
};

export function applyFilters(rows: WorkQueueRow[], f: Filters): WorkQueueRow[] {
  const q = f.qCompany.trim();

  return rows.filter((r) => {
    if (q && !r.companyName.includes(q)) return false;

    if (f.sites.length > 0 && !f.sites.includes(r.siteKey)) return false;

    if (f.statuses.length > 0 && !f.statuses.includes(r.status)) return false;

    // 滞留フィルタ（欠損は除外）
    if (f.staleThreshold === "3PLUS") {
      if (r.staleDays == null) return false;
      if (r.staleDays < 3) return false;
    }
    if (f.staleThreshold === "7PLUS") {
      if (r.staleDays == null) return false;
      if (r.staleDays < 7) return false;
    }

    // RPO未タッチフィルタ（欠損は除外：まだ一度もRPO更新が無い行は落ちる）
    if (f.rpoThreshold === "7PLUS_UNTOUCHED") {
      if (r.rpoTouchedDays == null) return false;
      if (r.rpoTouchedDays < 7) return false;
    }

    return true;
  });
}
