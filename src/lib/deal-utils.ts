// src/lib/deal-utils.ts

export function s(v: any) {
  return String(v ?? "");
}

export function formatLocalDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

// JST fixed YYYY-MM-DD
export function todayJstYmd() {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

export function isExplicitNonContractStatus(status: any) {
  const t = String(status ?? "").trim();
  if (!t) return false;
  const neg = ["未契約", "解約", "停止"];
  return neg.some((k) => t.includes(k));
}

export function deriveMode(dealKind: any, recordStatus: any): "sales" | "contract" {
  const kind = String(dealKind ?? "").trim();
  const st = String(recordStatus ?? "").trim();

  if (kind === "existing") {
    if (isExplicitNonContractStatus(st)) return "sales";
    return "contract";
  }

  return "sales";
}

const STAGES_SALES = ["ヒアリング", "提案", "見積", "受注", "失注"] as const;
const STAGES_CONTRACT = ["準備", "実施", "フォロー", "完了", "中止"] as const;

export function clampStageFromList(v: string, list: readonly string[]) {
  const t = String(v ?? "").trim();
  const hit = list.find((x) => x === t);
  return hit ?? list[0] ?? "";
}

export function stageIndexFromList(st: string, list: readonly string[]) {
  const i = list.findIndex((x) => x === st);
  return i >= 0 ? i : 0;
}

export function toneForStage(st: string, mode: "sales" | "contract") {
  if (mode === "sales") {
    if (st === "受注") return "border-emerald-200 bg-emerald-50 text-emerald-800";
    if (st === "失注") return "border-rose-200 bg-rose-50 text-rose-800";
    return "border-slate-200 bg-slate-50 text-slate-700";
  }
  if (st === "完了") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (st === "中止") return "border-rose-200 bg-rose-50 text-rose-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

export function normalizeStageForMode(inputStage: string, mode: "sales" | "contract") {
  const st = String(inputStage ?? "").trim();
  if (mode === "sales") {
    if (STAGES_SALES.includes(st as any)) return st;
    return "ヒアリング";
  } else {
    if (STAGES_CONTRACT.includes(st as any)) return st;
    return "準備";
  }
}
