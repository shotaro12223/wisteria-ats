export type AtsEventType = "STATUS_CHANGE" | "NOTE_SAVE";

export type AtsEvent = {
  type: AtsEventType;
  at: string; // ISO
  jobId: string;
  siteKey?: string;
  companyId?: string;
};

const EVENTS_KEY = "wisteria_ats_events_v1";

function safeParse(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function isEvent(x: any): x is AtsEvent {
  if (!x || typeof x !== "object") return false;
  if (x.type !== "STATUS_CHANGE" && x.type !== "NOTE_SAVE") return false;
  if (typeof x.at !== "string") return false;
  if (typeof x.jobId !== "string") return false;
  if (x.siteKey != null && typeof x.siteKey !== "string") return false;
  if (x.companyId != null && typeof x.companyId !== "string") return false;
  return true;
}

export function listEvents(): AtsEvent[] {
  if (typeof window === "undefined") return [];
  const parsed = safeParse(window.localStorage.getItem(EVENTS_KEY));
  if (!Array.isArray(parsed)) return [];
  const out: AtsEvent[] = [];
  for (const it of parsed) {
    if (isEvent(it)) out.push(it);
  }
  return out;
}

export function appendEvent(e: AtsEvent) {
  if (typeof window === "undefined") return;
  const cur = listEvents();
  const next = [...cur, e];

  // 無制限に増えないように上限（ざっくり）
  const MAX = 20000;
  const trimmed = next.length > MAX ? next.slice(next.length - MAX) : next;

  window.localStorage.setItem(EVENTS_KEY, JSON.stringify(trimmed));
}

export function monthRangeLocal(now = new Date()): { start: Date; end: Date } {
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
  return { start, end };
}

export function inRangeISO(iso: string, start: Date, end: Date): boolean {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return false;
  return start.getTime() <= t && t < end.getTime();
}
