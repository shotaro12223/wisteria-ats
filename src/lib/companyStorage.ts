import type { Company } from "./types";

const KEY = "wisteria_ats_companies_v1";

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function listCompanies(): Company[] {
  if (typeof window === "undefined") return [];
  const parsed = safeParse<Company[]>(window.localStorage.getItem(KEY));
  return Array.isArray(parsed) ? parsed : [];
}

export function getCompany(id: string): Company | null {
  const companies = listCompanies();
  return companies.find((c) => c.id === id) ?? null;
}

export function upsertCompany(company: Company): void {
  if (typeof window === "undefined") return;

  const companies = listCompanies();
  const idx = companies.findIndex((c) => c.id === company.id);
  const next = [...companies];

  if (idx >= 0) next[idx] = company;
  else next.unshift(company);

  window.localStorage.setItem(KEY, JSON.stringify(next));
}

export function deleteCompany(id: string): void {
  if (typeof window === "undefined") return;

  const companies = listCompanies().filter((c) => c.id !== id);
  window.localStorage.setItem(KEY, JSON.stringify(companies));
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
