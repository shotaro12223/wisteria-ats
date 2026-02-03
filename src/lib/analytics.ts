import type { Company, Job } from "./types";
import { buildWorkQueueRows, type WorkQueueRow, type WorkQueueStatus } from "./workQueue";

/**
 * 分析 = WorkQueue（求人×媒体の要対応行）を集計して作る
 * DBなし（localStorage）でも動く
 *
 * 注意：
 * - 現状のリポジトリでは WorkQueueRow の型/実装が揺れている可能性があるため、
 *   staleDays / rpoTouchedDays は "存在しない場合がある" 前提で安全に読む。
 */

export type StaleBucketKey = "0-2" | "3-6" | "7-13" | "14+";

export type Analytics = {
  kpi: {
    total: number; // 要対応行
    stale7plus: number; // 滞留7日+
    confirmedNeglect: number; // 放置確定ゾーン（滞留7+ & RPO未タッチ7+）
    missingNextAction: number; // 次アクション未設定（note空）
  };

  byStatus: Record<WorkQueueStatus, number>;

  bySite: Array<{
    siteKey: string;
    total: number;
    byStatus: Record<WorkQueueStatus, number>;
    missingNextAction: number;
    stale7plus: number;
    confirmedNeglect: number;
  }>;

  staleBuckets: Record<StaleBucketKey, number>;
};

const STATUSES: WorkQueueStatus[] = ["NG", "資料待ち", "媒体審査中", "停止中"];

function emptyStatusCounts(): Record<WorkQueueStatus, number> {
  return {
    NG: 0,
    資料待ち: 0,
    媒体審査中: 0,
    停止中: 0,
  };
}

function isBlank(s?: string | null): boolean {
  return !s || s.trim().length === 0;
}

function bucketByStaleDays(d: number): StaleBucketKey {
  if (d <= 2) return "0-2";
  if (d <= 6) return "3-6";
  if (d <= 13) return "7-13";
  return "14+";
}

/**
 * WorkQueueRow.staleDays が無い/壊れているケースに備えて安全に読む
 * - 数値ならそのまま
 * - それ以外は 0 扱い（= 分布の最小帯に入る）
 */
function safeStaleDays(r: WorkQueueRow): number {
  const d = (r as any).staleDays as unknown;
  return typeof d === "number" && Number.isFinite(d) ? d : 0;
}

export function buildAnalytics(args: {
  jobs: Job[];
  companies: Company[];
  now?: Date;
  // 閾値は固定（要件どおり）
  staleDaysThreshold?: number; // default 7
  rpoUntouchedDaysThreshold?: number; // default 7
}): Analytics {
  const staleTh = args.staleDaysThreshold ?? 7;
  const rpoTh = args.rpoUntouchedDaysThreshold ?? 7;

  const rows: WorkQueueRow[] = buildWorkQueueRows({
    jobs: args.jobs,
    companies: args.companies,
    now: args.now,
  });

  const kpi = {
    total: 0,
    stale7plus: 0,
    confirmedNeglect: 0,
    missingNextAction: 0,
  };

  const byStatus = emptyStatusCounts();

  const staleBuckets: Record<StaleBucketKey, number> = {
    "0-2": 0,
    "3-6": 0,
    "7-13": 0,
    "14+": 0,
  };

  const siteMap = new Map<
    string,
    {
      siteKey: string;
      total: number;
      byStatus: Record<WorkQueueStatus, number>;
      missingNextAction: number;
      stale7plus: number;
      confirmedNeglect: number;
    }
  >();

  function getSite(siteKey: string) {
    const cur = siteMap.get(siteKey);
    if (cur) return cur;
    const next = {
      siteKey,
      total: 0,
      byStatus: emptyStatusCounts(),
      missingNextAction: 0,
      stale7plus: 0,
      confirmedNeglect: 0,
    };
    siteMap.set(siteKey, next);
    return next;
  }

  for (const r of rows) {
    kpi.total += 1;

    // status は WorkQueue 側が保証している前提（要対応のみの rows）
    byStatus[r.status] += 1;

    // note（次アクション）
    const noteBlank = isBlank(r.state?.note);
    if (noteBlank) kpi.missingNextAction += 1;

    // staleDays（安全取得）
    const staleDays = safeStaleDays(r);

    // 滞留帯
    staleBuckets[bucketByStaleDays(staleDays)] += 1;

    // 滞留7+
    const isStale7 = staleDays >= staleTh;
    if (isStale7) kpi.stale7plus += 1;

    // 放置確定ゾーン（滞留7+ & RPO未タッチ7+）
    // rpoTouchedDays が無い場合は判定できないので false 扱い（= 集計に入れない）
    const rpoDays = (r as any).rpoTouchedDays as number | null | undefined;
    const isConfirmed = isStale7 && rpoDays != null && rpoDays >= rpoTh;
    if (isConfirmed) kpi.confirmedNeglect += 1;

    // サイト別
    const s = getSite(r.siteKey);
    s.total += 1;
    s.byStatus[r.status] += 1;
    if (noteBlank) s.missingNextAction += 1;
    if (isStale7) s.stale7plus += 1;
    if (isConfirmed) s.confirmedNeglect += 1;
  }

  const bySite = Array.from(siteMap.values()).sort((a, b) => b.total - a.total);

  // “0件でもキーが出る”ようにしておく（UI安定）
  for (const st of STATUSES) {
    if (byStatus[st] == null) byStatus[st] = 0;
  }

  return { kpi, byStatus, bySite, staleBuckets };
}
