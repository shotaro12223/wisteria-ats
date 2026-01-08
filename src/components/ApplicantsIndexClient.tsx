"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Applicant, ApplicantStatus } from "@/lib/applicantsStorage";
import { updateApplicant } from "@/lib/applicantsStorage";

type ApplicantWithNames = Applicant & {
  companyName?: string;
  jobTitle?: string;
};

const STATUS_LABEL: Record<ApplicantStatus, string> = {
  NEW: "新着",
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

export default function ApplicantsIndexClient({
  initialApplicants,
  loading,
}: {
  initialApplicants: ApplicantWithNames[];
  loading: boolean;
}) {
  const router = useRouter();
  const sp = useSearchParams();

  // URL -> state（※戻る/進むでも追従させる）
  const [q, setQ] = useState<string>("");
  const [status, setStatus] = useState<string>("ALL");
  const [companyId, setCompanyId] = useState<string>("");

  // 表示行（受け取った結果）
  const [rows, setRows] = useState<ApplicantWithNames[]>(initialApplicants);

  useEffect(() => {
    setRows(initialApplicants);
  }, [initialApplicants]);

  useEffect(() => {
    setQ(sp.get("q") ?? "");
    setStatus(sp.get("status") ?? "ALL");
    setCompanyId(sp.get("companyId") ?? "");
  }, [sp]);

  // company候補（選択UI用）: companyId -> companyName を保持（表示は companyName）
  const companyOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of rows) {
      const cid = a.companyId ?? "";
      if (!cid) continue;
      const label = a.companyName ?? cid;
      const prev = map.get(cid);
      if (!prev || prev === cid) map.set(cid, label);
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "ja"));
  }, [rows]);

  // URLを更新（=共有できる条件） ※APIはこのタイミングでだけ走る
  function applyFilters() {
    const params = new URLSearchParams();

    const qq = q.trim();
    if (qq) params.set("q", qq);

    const st = status.trim();
    if (st && st !== "ALL") params.set("status", st);

    const cid = companyId.trim();
    if (cid) params.set("companyId", cid);

    params.set("limit", "300");

    router.push(`/applicants?${params.toString()}`);
  }

  function clearFilters() {
    router.push("/applicants?limit=300");
  }

  // 画面上の絞り込み（念のため）
  const visibleRows = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const cid = companyId.trim();
    const st = status.trim();

    return rows.filter((a) => {
      if (cid && a.companyId !== cid) return false;
      if (st && st !== "ALL" && a.status !== st) return false;

      if (qq) {
        const hay = [
          a.name ?? "",
          a.note ?? "",
          a.siteKey ?? "",
          a.companyName ?? "",
          a.jobTitle ?? "",
          a.companyId ?? "",
          a.jobId ?? "",
          a.appliedAt ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(qq)) return false;
      }

      return true;
    });
  }, [rows, q, companyId, status]);

  // 保存（状態/メモ）
  async function saveStatus(id: string, next: ApplicantStatus) {
    const before = rows.find((r) => r.id === id);
    if (!before) return;

    setRows((prev) => prev.map((a) => (a.id === id ? { ...a, status: next } : a)));

    try {
      await updateApplicant(id, { status: next });
    } catch (e) {
      console.error(e);
      setRows((prev) => prev.map((a) => (a.id === id ? before : a)));
      window.alert("状態の保存に失敗しました。");
    }
  }

  async function saveNote(id: string, next: string) {
    const before = rows.find((r) => r.id === id);
    if (!before) return;

    setRows((prev) => prev.map((a) => (a.id === id ? { ...a, note: next } : a)));

    try {
      await updateApplicant(id, { note: next });
    } catch (e) {
      console.error(e);
      setRows((prev) => prev.map((a) => (a.id === id ? before : a)));
      window.alert("メモの保存に失敗しました。");
    }
  }

  return (
    <div className="space-y-4">
      {/* フィルタ */}
      <div className="cv-panel p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-600">
              検索（名前/メモ/媒体/求人/日付/会社）
              <span className="ml-2 text-[11px] text-slate-400">Enterで適用</span>
            </label>
            <input
              className="w-72 rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--border)" }}
              placeholder="例）山田 / Indeed / 2026-01-07 / 会社名"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyFilters();
              }}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-600">
              状態<span className="ml-2 text-[11px] text-slate-400">変更後に「適用」</span>
            </label>
            <select
              className="rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--border)" }}
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
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-600">
              会社<span className="ml-2 text-[11px] text-slate-400">変更後に「適用」</span>
            </label>
            {companyOptions.length > 0 ? (
              <select
                className="rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: "var(--border)" }}
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
              >
                <option value="">すべて</option>
                {companyOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="w-72 rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: "var(--border)" }}
                placeholder="companyId"
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
              適用（検索）
            </button>
          </div>
        </div>

        <div className="mt-3 text-xs text-slate-500">
          URLが検索条件の正本です。共有したいときは「適用（検索）」後のURLをコピーしてください。
        </div>
      </div>

      {/* 一覧 */}
      <div className="cv-panel overflow-x-auto">
        {loading ? (
          <div className="p-6 text-sm text-slate-600">読み込み中...</div>
        ) : visibleRows.length === 0 ? (
          <div className="p-6 text-sm text-slate-600">該当する応募がありません。</div>
        ) : (
          <table className="min-w-full border-separate border-spacing-0">
            <thead>
              <tr className="text-left text-xs text-slate-500">
                <th className="border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
                  応募日
                </th>
                <th className="border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
                  応募者
                </th>
                <th className="border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
                  会社 / 求人
                </th>
                <th className="border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
                  媒体
                </th>
                <th className="border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
                  状態
                </th>
                <th className="border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
                  メモ
                </th>
                <th className="border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
                  登録日時
                </th>
                <th className="border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
                  詳細
                </th>
              </tr>
            </thead>

            <tbody>
              {visibleRows.map((a) => {
                const companyLabel = a.companyName ?? a.companyId ?? "";
                const jobLabel = a.jobTitle ?? a.jobId ?? "";

                return (
                  <tr key={a.id} className="text-sm">
                    <td className="border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
                      {a.appliedAt}
                    </td>

                    <td className="border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
                      <div className="font-medium text-slate-900">{a.name}</div>
                    </td>

                    <td className="border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
                      <div className="min-w-[18rem]">
                        {companyLabel ? (
                          <div className="font-medium text-slate-900">{companyLabel}</div>
                        ) : (
                          <div className="font-medium text-red-600">⚠ 会社未設定</div>
                        )}
                        <div className="mt-0.5 text-xs text-slate-500">
                          {jobLabel || <span className="text-slate-400">求人未設定</span>}
                        </div>
                      </div>
                    </td>

                    <td className="border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
                      {a.siteKey}
                    </td>

                    <td className="border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
                      <select
                        className="rounded-md border px-2 py-1 text-sm"
                        style={{ borderColor: "var(--border)" }}
                        value={a.status}
                        onChange={(e) => saveStatus(a.id, e.target.value as ApplicantStatus)}
                      >
                        {Object.entries(STATUS_LABEL).map(([k, label]) => (
                          <option key={k} value={k}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
                      <input
                        className="w-80 rounded-md border px-2 py-1 text-sm"
                        style={{ borderColor: "var(--border)" }}
                        defaultValue={a.note ?? ""}
                        placeholder="メモ（Enterで確定）"
                        onBlur={(e) => saveNote(a.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                        }}
                      />
                    </td>

                    <td
                      className="border-b px-4 py-3 text-xs text-slate-500"
                      style={{ borderColor: "var(--border)" }}
                    >
                      {fmtDateTime(a.createdAt)}
                    </td>

                    <td className="border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
                      <Link href={`/applicants/${a.id}`} className="cv-btn-secondary">
                        開く
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
