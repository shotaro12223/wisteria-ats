import type { Company, Job } from "./types";

const JOBS_KEY = "wisteria_ats_jobs_v1";
const COMPANIES_KEY = "wisteria_ats_companies_v1";

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/* =========================
 * Jobs
 * ========================= */

export function listJobs(): Job[] {
  if (typeof window === "undefined") return [];
  const parsed = safeParse<Job[]>(window.localStorage.getItem(JOBS_KEY));
  return Array.isArray(parsed) ? parsed : [];
}

export function getJob(id: string): Job | null {
  const jobs = listJobs();
  return jobs.find((j) => j.id === id) ?? null;
}

export function upsertJob(job: Job): void {
  const jobs = listJobs();
  const idx = jobs.findIndex((j) => j.id === job.id);
  const next = [...jobs];

  const now = new Date().toISOString();
  const normalized: Job = {
    ...job,
    updatedAt: now,
    createdAt: job.createdAt || now,
  };

  if (idx >= 0) next[idx] = normalized;
  else next.unshift(normalized);

  window.localStorage.setItem(JOBS_KEY, JSON.stringify(next));
}

export function deleteJob(id: string): void {
  const jobs = listJobs().filter((j) => j.id !== id);
  window.localStorage.setItem(JOBS_KEY, JSON.stringify(jobs));
}

export function newJobSkeleton(): Job {
  const now = new Date().toISOString();
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `job_${Math.random().toString(16).slice(2)}_${Date.now()}`;

  return {
    id,
    companyName: "",
    jobTitle: "",
    createdAt: now,
    updatedAt: now,
  };
}

/* =========================
 * Companies
 * ========================= */

export function listCompanies(): Company[] {
  if (typeof window === "undefined") return [];
  const parsed = safeParse<Company[]>(
    window.localStorage.getItem(COMPANIES_KEY)
  );
  return Array.isArray(parsed) ? parsed : [];
}

export function getCompany(id: string): Company | null {
  const companies = listCompanies();
  return companies.find((c) => c.id === id) ?? null;
}

export function upsertCompany(company: Company): void {
  const companies = listCompanies();
  const idx = companies.findIndex((c) => c.id === company.id);
  const next = [...companies];

  const now = new Date().toISOString();
  const normalized: Company = {
    ...company,
    updatedAt: now,
    createdAt: company.createdAt || now,
  };

  if (idx >= 0) next[idx] = normalized;
  else next.unshift(normalized);

  window.localStorage.setItem(COMPANIES_KEY, JSON.stringify(next));
}

export function deleteCompany(id: string): void {
  const companies = listCompanies().filter((c) => c.id !== id);
  window.localStorage.setItem(COMPANIES_KEY, JSON.stringify(companies));
}

export function newCompanySkeleton(): Company {
  const now = new Date().toISOString();
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `company_${Math.random().toString(16).slice(2)}_${Date.now()}`;

  return {
    id,
    companyName: "",
    createdAt: now,
    updatedAt: now,
  };
}
