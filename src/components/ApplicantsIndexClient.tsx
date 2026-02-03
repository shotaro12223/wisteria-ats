"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Applicant, ApplicantStatus } from "@/lib/applicantsStorage";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import GmailInboxPanel from "@/components/GmailInboxPanel";

type ApplicantWithNames = Applicant & {
  companyName?: string;
  jobTitle?: string;
};

type CompanyLite = {
  id: string;
  companyName: string;
};

const STATUS_LABEL: Record<string, string> = {
  NEW: "NEW",
  PRE_NG: "面接前NG",
  SHARED: "連携済み",
  DOC: "書類",
  INT: "面接",
  OFFER: "内定",
  NG: "NG",
};

function fmtDateTime(iso?: string) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function pickCompaniesPayload(j: any): any[] {
  if (Array.isArray(j?.items)) return j.items;
  if (Array.isArray(j?.rows)) return j.rows;
  if (Array.isArray(j?.data)) return j.data;
  if (Array.isArray(j?.companies)) return j.companies;
  if (Array.isArray(j)) return j;
  return [];
}

export default function ApplicantsIndexClient({
  initialApplicants,
  loading,
}: {
  initialApplicants: ApplicantWithNames[];
  loading: boolean;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [status, setStatus] = useState<string>("ALL");
  const [companyId, setCompanyId] = useState<string>("");

  const [rows, setRows] = useState<ApplicantWithNames[]>(initialApplicants);
  const [companies, setCompanies] = useState<CompanyLite[]>([]);
  const [companiesError, setCompaniesError] = useState<string>("");

  /* 初期データ反映 */
  useEffect(() => {
    setRows(initialApplicants);
  }, [initialApplicants]);

  useEffect(() => {
    setStatus(sp.get("status") ?? "ALL");
    setCompanyId(sp.get("companyId") ?? "");
  }, [sp]);

  /* 会社一覧（/api/companies） */
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setCompaniesError("");
        const r = await fetch("/api/companies?limit=500", { cache: "no-store" });
        const j = await r.json().catch(() => ({}));

        if (!alive) return;

        if (!r.ok || j?.ok === false) {
          setCompanies([]);
          setCompaniesError(j?.error ? String(j.error) : `failed: ${r.status}`);
          console.log("companies api error:", { status: r.status, body: j });
          return;
        }

        const items = pickCompaniesPayload(j);

        const list: CompanyLite[] = items
          .map((c: any) => ({
            id: String(c?.id ?? "").trim(),
            companyName: String(c?.companyName ?? c?.company_name ?? c?.name ?? "").trim(),
          }))
          .filter((c: CompanyLite) => c.id && c.companyName)
          .sort((a, b) => a.companyName.localeCompare(b.companyName, "ja"));

        setCompanies(list);
      } catch (e: any) {
        if (!alive) return;
        setCompanies([]);
        setCompaniesError(e?.message ?? "companies fetch error");
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  /* Realtime 通知 */
  useEffect(() => {
    const ch = supabase
      .channel("rt-applicants")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "applicants" },
        () => router.refresh()
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "applicants" },
        () => router.refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, router]);

  /* フィルタ適用（検索文字なし） */
  function applyFilters() {
    const params = new URLSearchParams();
    if (status !== "ALL") params.set("status", status);
    if (companyId.trim()) params.set("companyId", companyId.trim());
    params.set("limit", "300");
    router.push(`/applicants?${params.toString()}`);
  }

  function clearFilters() {
    router.push("/applicants?limit=300");
  }

  const visibleRows = useMemo(() => {
    const cid = companyId.trim();
    const st = status.trim();

    return rows.filter((a) => {
      if (cid && a.companyId !== cid) return false;
      if (st !== "ALL" && a.status !== st) return false;
      return true;
    });
  }, [rows, companyId, status]);

  async function patchApplicant(
    id: string,
    patch: Partial<Pick<Applicant, "status" | "note">>
  ) {
    const res = await fetch(`/api/applicants/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error(await res.text());
  }

  async function saveStatus(id: string, next: ApplicantStatus) {
    const before = rows.find((r) => r.id === id);
    if (!before) return;

    setRows((prev) => prev.map((a) => (a.id === id ? { ...a, status: next } : a)));

    try {
      await patchApplicant(id, { status: next });
    } catch {
      setRows((prev) => prev.map((a) => (a.id === id ? before : a)));
      alert("状態の保存に失敗しました。");
    }
  }

  async function saveNote(id: string, next: string) {
    const before = rows.find((r) => r.id === id);
    if (!before) return;

    setRows((prev) => prev.map((a) => (a.id === id ? { ...a, note: next } : a)));

    try {
      await patchApplicant(id, { note: next });
    } catch {
      setRows((prev) => prev.map((a) => (a.id === id ? before : a)));
      alert("メモの保存に失敗しました。");
    }
  }

  return (
    <div className="space-y-4">
      {/* フィルタ（検索欄なし） */}
      <div className="cv-panel p-4">
        <div className="flex flex-wrap items-end gap-3">
          <select
            className="rounded-md border px-3 py-2 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="ALL">すべて</option>
            <option value="NEW">新着</option>
            <option value="DOC">書類</option>
            <option value="INT">面接</option>
            <option value="OFFER">内定</option>
            <option value="NG">NG</option>
          </select>

          <select
            className="rounded-md border px-3 py-2 text-sm"
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
          >
            <option value="">会社（すべて）</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.companyName}
              </option>
            ))}
          </select>

          <button className="cv-btn-secondary" onClick={clearFilters}>
            クリア
          </button>
          <button className="cv-btn-primary" onClick={applyFilters}>
            適用
          </button>
        </div>

        <div className="mt-2 text-xs text-slate-500">
          companies: {companies.length}
          {companiesError ? ` / error: ${companiesError}` : ""}
        </div>
      </div>

      {/* 一覧 */}
      <div className="cv-panel overflow-x-auto">
        {loading ? (
          <div className="p-6 text-sm">読み込み中...</div>
        ) : visibleRows.length === 0 ? (
          <div className="p-6 text-sm">該当する応募がありません。</div>
        ) : (
          <table className="min-w-full">
            <tbody>
              {visibleRows.map((a) => (
                <tr key={a.id}>
                  <td>{a.appliedAt}</td>
                  <td>{a.name}</td>
                  <td>{a.companyName ?? a.companyId}</td>
                  <td>{a.siteKey}</td>
                  <td>
                    <select
                      value={a.status}
                      onChange={(e) =>
                        saveStatus(a.id, e.target.value as ApplicantStatus)
                      }
                    >
                      {Object.entries(STATUS_LABEL).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      defaultValue={a.note ?? ""}
                      onBlur={(e) => saveNote(a.id, e.target.value)}
                    />
                  </td>
                  <td>{fmtDateTime(a.createdAt)}</td>
                  <td>
                    <Link href={`/applicants/${a.id}`}>開く</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Gmail受信箱 */}
      <GmailInboxPanel />
    </div>
  );
}
