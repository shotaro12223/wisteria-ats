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
  const min = String(job.payMin);
  const max = String(job.payMax);
  return `${job.payType}${min}〜${max}`;
}

/**
 * 連結用： "項目名：値" を作る（空は null）
 */
function labeled(label: string, value: unknown): string | null {
  if (value === null || value === undefined) return null;

  if (typeof value === "string") {
    const t = value.trim();
    if (t.length === 0) return null;
    return `${label}：${t}`;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return `${label}：${String(value)}`;
  }

  if (typeof value === "boolean") {
    return `${label}：${value ? "あり" : "なし"}`;
  }

  const s = String(value).trim();
  if (s.length === 0) return null;
  return `${label}：${s}`;
}

function joinParts(parts: Array<string | null | undefined>, sep = "／"): string | null {
  const xs = parts.filter((p): p is string => typeof p === "string" && p.trim().length > 0);
  if (xs.length === 0) return null;
  return xs.join(sep);
}

/**
 * 採用係長：求人タイトル（項目名つき連結）
 * - 求人タイトルには「職種＋キャッチコピー」
 * - “複数連結時は項目名も含める” ルールに従う
 */
function saiyouKeichoJobTitle(job: Job): string | null {
  const parts: Array<string | null> = [
    labeled("職種", job.jobTitle),
    labeled("キャッチコピー", job.catchCopy),
  ];
  return joinParts(parts);
}

/**
 * 採用係長：お給料のこと：備考（項目名つき連結）
 */
function saiyouKeichoPayNote(job: Job): string | null {
  const parts: Array<string | null> = [
    labeled("給与（基本給・手当）", job.basePayAndAllowance),
    labeled("給与（固定手当）", job.fixedAllowance),
    labeled("賞与（年◯回）", job.bonus),
    labeled("昇給（年◯回）", job.raise),
    labeled("固定残業代", job.fixedOvertime),
    labeled("残業時間", job.overtimeHours),
    labeled("年収例", job.annualIncomeExample),
    labeled("試用期間", job.probation),
  ];

  // 試用期間が「あり」の時だけ追記
  const probationIsOn = (job.probation ?? "").trim() === "あり";
  if (probationIsOn) {
    parts.push(labeled("ありの場合条件", job.probationCondition));
    parts.push(labeled("ありの場合期間", job.probationPeriod));
  }

  // 受動喫煙は手打ち前提、空ならスキップ
  parts.push(labeled("受動喫煙対策", job.passiveSmoking));

  return joinParts(parts);
}

/**
 * 採用係長：働く時間について：備考（項目名つき連結）
 */
function saiyouKeichoWorkNote(job: Job): string | null {
  const parts: Array<string | null> = [
    labeled("月々平均勤務時間", job.avgMonthlyWorkHours),
    labeled("月々平均勤務日数", job.avgMonthlyWorkDays),
    labeled("勤務形態", job.workStyle),
    labeled("休日休暇", job.holidays),
    labeled("年間休日", job.annualHolidays),
    labeled("休暇", job.leave),
  ];

  // “媒体必須の文章”がある場合は最後に
  parts.push(labeled("勤務時間・曜日（必須など）", job.workDaysHoursRequired));

  return joinParts(parts);
}

/**
 * ✅ 出力ページ側でも computed を同じロジックで表示するために export
 */
export function getTemplateFieldValue(job: Job, field: TemplateField): string | null {
  const key = field.key;

  if (key === "computed.payDisplayMethod") return payDisplayMethod(job);
  if (key === "computed.payRangeText") return payRangeText(job);

  if (key === "computed.saiyouKeichoJobTitle") return saiyouKeichoJobTitle(job);
  if (key === "computed.saiyouKeichoPayNote") return saiyouKeichoPayNote(job);
  if (key === "computed.saiyouKeichoWorkNote") return saiyouKeichoWorkNote(job);

  const v = job[key];
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
