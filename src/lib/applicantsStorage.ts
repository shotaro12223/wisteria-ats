export type ApplicantStatus = "NEW" | "DOC" | "INT" | "OFFER" | "NG";

export type Applicant = {
  id: string;
  companyId: string;
  jobId: string;

  appliedAt: string; // "YYYY-MM-DD"
  siteKey: string; // Indeed 等（手入力可）

  name: string;
  status: ApplicantStatus;
  note?: string;

  createdAt: string; // ISO
  updatedAt: string; // ISO
};

const KEY = "wisteria_ats_applicants_v1";

function genId(): string {
  // ブラウザ環境ではrandomUUIDが最強
  const c = (globalThis as any).crypto;
  if (c?.randomUUID) return c.randomUUID();

  // フォールバック（localStorage用途なら十分）
  const a = Date.now().toString(36);
  const b = Math.random().toString(36).slice(2, 10);
  const d = Math.random().toString(36).slice(2, 10);
  return `${a}_${b}${d}`;
}

function safeParse(raw: string | null): Applicant[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as Applicant[];
  } catch {
    return [];
  }
}

function readAll(): Applicant[] {
  if (typeof window === "undefined") return [];
  return safeParse(window.localStorage.getItem(KEY));
}

function writeAll(items: Applicant[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(items));
}

export function listApplicantsByJob(args: { companyId: string; jobId: string }): Applicant[] {
  const all = readAll();
  return all.filter((a) => a.companyId === args.companyId && a.jobId === args.jobId);
}

export function createApplicant(input: {
  companyId: string;
  jobId: string;
  appliedAt: string;
  siteKey: string;
  name: string;
  status: ApplicantStatus;
  note?: string;
}): Applicant {
  const now = new Date().toISOString();

  const a: Applicant = {
    id: genId(),
    companyId: input.companyId,
    jobId: input.jobId,
    appliedAt: input.appliedAt,
    siteKey: input.siteKey,
    name: input.name,
    status: input.status,
    note: input.note,
    createdAt: now,
    updatedAt: now,
  };

  const all = readAll();
  writeAll([a, ...all]);
  return a;
}

export function updateApplicant(next: Applicant) {
  const all = readAll();
  const now = new Date().toISOString();
  const updated: Applicant = { ...next, updatedAt: now };
  writeAll(all.map((a) => (a.id === next.id ? updated : a)));
}

export function deleteApplicant(applicantId: string) {
  const all = readAll();
  writeAll(all.filter((a) => a.id !== applicantId));
}
