import type { Job, TemplateField, SiteTemplate } from "./types";

function isEmpty(val: unknown): boolean {
  if (val === null || val === undefined) return true;
  if (typeof val === "string") return val.trim().length === 0;
  return false;
}

function payDisplayMethod(job: Job): string | null {
  if (!job.payType) return null;
  switch (job.payType) {
    case "月給":
      return "月給（下限〜上限）";
    case "年俸":
      return "年俸（下限〜上限）";
    case "時給":
      return "時給（下限〜上限）";
    case "日給":
      return "日給（下限〜上限）";
    default:
      return null;
  }
}

function payRangeText(job: Job): string | null {
  if (!job.payType || job.payMin == null || job.payMax == null) return null;
  return `${job.payType}${job.payMin}〜${job.payMax}`;
}

/**
 * 区切り無しで連結（空は除外）
 * 例）["介護", "いいよ"] → "介護いいよ"
 */
function joinPlain(parts: Array<unknown>): string | null {
  const xs = parts
    .map((p) => (p === null || p === undefined ? "" : String(p).trim()))
    .filter((s) => s.length > 0);

  if (xs.length === 0) return null;
  return xs.join("");
}

/**
 * 採用係長：求人タイトル
 * ✅ 職種 + キャッチコピー（区切り無し）
 */
function saiyouKeichoJobTitle(job: Job): string | null {
  return joinPlain([job.jobTitle, job.catchCopy]);
}

/**
 * 採用係長：お給料のこと：備考
 * ✅ 全部ラベル無し・区切り無しで連結
 */
function saiyouKeichoPayNote(job: Job): string | null {
  const parts: Array<unknown> = [
    job.basePayAndAllowance,
    job.fixedAllowance,
    job.bonus,
    job.raise,
    job.fixedOvertime,
    job.overtimeHours,
    job.annualIncomeExample,
    job.probation,
  ];

  if ((job.probation ?? "").trim() === "あり") {
    parts.push(job.probationCondition);
    parts.push(job.probationPeriod);
  }

  parts.push(job.passiveSmoking);

  return joinPlain(parts);
}

/**
 * 採用係長：働く時間について：備考
 * ✅ 全部ラベル無し・区切り無しで連結
 */
function saiyouKeichoWorkNote(job: Job): string | null {
  const parts: Array<unknown> = [
    job.avgMonthlyWorkHours,
    job.avgMonthlyWorkDays,
    job.workStyle,
    job.holidays,
    job.annualHolidays,
    job.leave,
    job.workDaysHoursRequired,
  ];

  return joinPlain(parts);
}

/**
 * computed 値解決
 */
export function getTemplateFieldValue(job: Job, field: TemplateField): string | null {
  const key = field.key;

  if (key === "computed.payDisplayMethod") return payDisplayMethod(job);
  if (key === "computed.payRangeText") return payRangeText(job);

  if (key === "computed.saiyouKeichoJobTitle") return saiyouKeichoJobTitle(job);
  if (key === "computed.saiyouKeichoPayNote") return saiyouKeichoPayNote(job);
  if (key === "computed.saiyouKeichoWorkNote") return saiyouKeichoWorkNote(job);

  const v = (job as any)[key];
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return v;
  if (v === null || v === undefined) return null;

  return String(v);
}

export function renderTemplate(job: Job, template: SiteTemplate): string {
  const lines: string[] = [];

  for (const f of template.fields) {
    const value = getTemplateFieldValue(job, f);
    if (isEmpty(value)) continue;

    lines.push(`【${f.label}】`);
    lines.push(String(value));
    lines.push("");
  }

  return lines.join("\n").trim() + "\n";
}
