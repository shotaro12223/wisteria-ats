"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Applicant, ApplicantStatus } from "@/lib/applicantsStorage";

export default function ApplicantsIndexClient({
  initialApplicants,
}: {
  initialApplicants: Applicant[];
}) {
  const router = useRouter();
  const sp = useSearchParams();

  // URL → フィルタ初期値
  const [q, setQ] = useState<string>(sp.get("q") ?? "");
  const [status, setStatus] = useState<string>(sp.get("status") ?? "ALL");
  const [companyId, setCompanyId] = useState<string>(sp.get("companyId") ?? "");

  // 表示行（いまはローカル更新用）
  const [rows, setRows] = useState<Applicant[]>(initialApplicants);

  function updateLocal(id: string, patch: Partial<Pick<Applicant, "status" | "note">>) {
    setRows((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }

  const companyOptions = useMemo(() => {
    const uniq = new Set<string>();
    for (const a of rows) if (a.companyId) uniq.add(a.companyId);
    return Array.from(uniq).sort((a, b) => a.localeCompare(b, "ja"));
  }, [rows]);

  function applyFilters() {
    const params = new URLSearchParams();

    const qq = q.trim();
    if (qq) params.set("q", qq);

    if (status && status !== "ALL") params.set("status", status);

    const cid = companyId.trim();
    if (cid) params.set("companyId", cid);

    const qs = params.toString();
    router.push(qs ? `/applicants?${qs}` : "/applicants");
  }

  function clearFilters() {
    setQ("");
    setStatus("ALL");
    setCompanyId("");
    router.push("/applicants");
  }

  return (
    <div className="space-y-4">
      {/* フィルタ */}
      <div className="cv-panel p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-600">検索（応募者名 / メモ）</label>
            <input
              className="w-72 rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--border)" }}
              placeholder="例）山田 / 面接 / 1/15"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyFilters();
              }}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-600">状態</label>
            <select
              className="rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--border)" }}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="ALL">すべて</option>
              <option value="NEW">新着</option>
              <option value="DOC">書類選考</option>
              <option value="INT">面接</option>
              <option value="OFFER">内定</option>
              <option value="NG">NG</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-600">会社（companyId）</label>
            {companyOptions.length > 0 ? (
              <select
                className="rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: "var(--border)" }}
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
              >
                <option value="">すべて</option>
                {companyOptions.map((cid) => (
                  <option key={cid} value={cid}>
                    {cid}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="w-72 rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: "var(--border)" }}
                placeholder="companyIdで絞り込み（任意）"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
              />
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button type="button" className="cv-btn-secondary" onClick={clearFilters}>
              クリア
            </button>
            <button type="button" className="cv-btn-primary" onClick={applyFilters}>
              適用
            </button>
          </div>
        </div>
      </div>

      {/* 一覧（あなたのテーブルUIを踏襲） */}
      <div className="overflow-x-auto">
        <table className="min-w-full border text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 border">応募日</th>
              <th className="p-2 border">会社</th>
              <th className="p-2 border">求人</th>
              <th className="p-2 border">媒体</th>
              <th className="p-2 border">応募者</th>
              <th className="p-2 border">状態</th>
              <th className="p-2 border">メモ</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((a) => (
              <tr key={a.id} className="border-t">
                <td className="p-2 border">{a.appliedAt}</td>

                <td className="p-2 border">
                  {a.companyId ? (
                    a.companyId
                  ) : (
                    <span className="text-red-600 font-medium">⚠ 未設定</span>
                  )}
                </td>

                <td className="p-2 border">{a.jobId}</td>

                <td className="p-2 border">{a.siteKey}</td>

                <td className="p-2 border">{a.name || "（不明）"}</td>

                <td className="p-2 border">
                  <select
                    value={a.status}
                    onChange={(e) =>
                      updateLocal(a.id, {
                        status: e.target.value as ApplicantStatus,
                      })
                    }
                    className="border rounded px-1 py-0.5"
                  >
                    <option value="NEW">新着</option>
                    <option value="DOC">書類選考</option>
                    <option value="INT">面接</option>
                    <option value="OFFER">内定</option>
                    <option value="NG">NG</option>
                  </select>
                </td>

                <td className="p-2 border">
                  <input
                    type="text"
                    value={a.note ?? ""}
                    onChange={(e) => updateLocal(a.id, { note: e.target.value })}
                    className="w-full border rounded px-2 py-1"
                    placeholder="メモ"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
