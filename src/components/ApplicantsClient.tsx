"use client";

import { useEffect, useMemo, useState } from "react";
import type { Job } from "@/lib/types";
import { listJobsByCompany } from "@/lib/relations";
import {
  createApplicant,
  deleteApplicant,
  listApplicantsByJob,
  updateApplicant,
  type Applicant,
  type ApplicantStatus,
} from "@/lib/applicantsStorage";

type Props = {
  companyId: string;
  jobId: string;
};

const STATUS_LABEL: Record<ApplicantStatus, string> = {
  NEW: "新規",
  DOC: "書類",
  INT: "面接",
  OFFER: "内定",
  NG: "NG",
};

function todayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export default function ApplicantsClient(props: Props) {
  const [loading, setLoading] = useState(true);

  const [job, setJob] = useState<Job | null>(null);
  const [items, setItems] = useState<Applicant[]>([]);

  // form
  const [appliedAt, setAppliedAt] = useState<string>(todayYmd());
  const [siteKey, setSiteKey] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [status, setStatus] = useState<ApplicantStatus>("NEW");
  const [note, setNote] = useState<string>("");

  function reload() {
    const list = listApplicantsByJob({ companyId: props.companyId, jobId: props.jobId });
    setItems(list);
  }

  useEffect(() => {
    setLoading(true);
    try {
      const jobs = listJobsByCompany(props.companyId);
      const found = jobs.find((j) => j.id === props.jobId) ?? null;
      setJob(found);

      reload();

      // 媒体候補があるなら初期値を埋める
      const candidates = Object.keys(found?.siteStatus ?? {});
      if (candidates.length > 0) {
        setSiteKey((cur) => (cur ? cur : candidates[0]));
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.companyId, props.jobId]);

  const siteOptions = useMemo(() => {
    const uniq = new Set<string>();
    for (const k of Object.keys(job?.siteStatus ?? {})) uniq.add(k);
    for (const a of items) uniq.add(a.siteKey);
    return Array.from(uniq).sort((a, b) => a.localeCompare(b, "ja"));
  }, [job, items]);

  const summary = useMemo(() => {
    const total = items.length;

    const byStatus: Record<ApplicantStatus, number> = {
      NEW: 0,
      DOC: 0,
      INT: 0,
      OFFER: 0,
      NG: 0,
    };
    for (const a of items) byStatus[a.status]++;

    const bySite = new Map<string, number>();
    for (const a of items) bySite.set(a.siteKey, (bySite.get(a.siteKey) ?? 0) + 1);

    return { total, byStatus, bySite };
  }, [items]);

  function addApplicant() {
    const n = name.trim();
    const s = siteKey.trim();

    if (!appliedAt) return window.alert("応募日を入力してください");
    if (!s) return window.alert("媒体を入力/選択してください（例：Indeed）");
    if (!n) return window.alert("応募者名を入力してください（匿名なら「匿名1」などでOK）");

    createApplicant({
      companyId: props.companyId,
      jobId: props.jobId,
      appliedAt,
      siteKey: s,
      name: n,
      status,
      note: note.trim() ? note.trim() : undefined,
    });

    setName("");
    setNote("");
    reload();
  }

  function changeStatus(a: Applicant, next: ApplicantStatus) {
    updateApplicant({ ...a, status: next });
    reload();
  }

  function changeNote(a: Applicant, next: string) {
    updateApplicant({ ...a, note: next });
    reload();
  }

  function remove(a: Applicant) {
    const ok = window.confirm("この応募者レコードを削除します。よろしいですか？");
    if (!ok) return;
    deleteApplicant(a.id);
    reload();
  }

  if (loading) {
    return <div className="cv-panel p-6 text-sm text-slate-600">読み込み中...</div>;
  }

  return (
    <div className="space-y-6">
      {/* 対象求人 */}
      <div className="cv-panel p-6">
        <div className="text-sm text-slate-500">対象求人</div>
        <div className="mt-1 text-lg font-semibold text-slate-900">
          {job?.jobTitle || "(求人名未設定)"}
        </div>
        <div className="mt-1 text-xs text-slate-500">JobID: {props.jobId}</div>
      </div>

      {/* 追加フォーム */}
      <div className="cv-panel p-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-600">応募日</label>
            <input
              type="date"
              className="rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--border)" }}
              value={appliedAt}
              onChange={(e) => setAppliedAt(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-600">媒体</label>
            {siteOptions.length > 0 ? (
              <select
                className="rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: "var(--border)" }}
                value={siteKey}
                onChange={(e) => setSiteKey(e.target.value)}
              >
                <option value="">選択…</option>
                {siteOptions.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: "var(--border)" }}
                placeholder="例）Indeed"
                value={siteKey}
                onChange={(e) => setSiteKey(e.target.value)}
              />
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-600">応募者</label>
            <input
              className="w-64 rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--border)" }}
              placeholder="例）山田 太郎（匿名でもOK）"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-600">状態</label>
            <select
              className="rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--border)" }}
              value={status}
              onChange={(e) => setStatus(e.target.value as ApplicantStatus)}
            >
              {Object.entries(STATUS_LABEL).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1 grow">
            <label className="text-xs text-slate-600">メモ</label>
            <input
              className="w-full rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--border)" }}
              placeholder="例）12/26 14:00 面接予定"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="ml-auto">
            <button type="button" className="cv-btn-primary" onClick={addApplicant}>
              + 応募を追加
            </button>
          </div>
        </div>
      </div>

      {/* サマリ */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="cv-panel p-4">
          <div className="text-xs text-slate-600">総応募数</div>
          <div className="text-2xl font-semibold text-slate-900">{summary.total}</div>
        </div>
        <div className="cv-panel p-4">
          <div className="text-xs text-slate-600">新規</div>
          <div className="text-2xl font-semibold text-slate-900">{summary.byStatus.NEW}</div>
        </div>
        <div className="cv-panel p-4">
          <div className="text-xs text-slate-600">面接</div>
          <div className="text-2xl font-semibold text-slate-900">{summary.byStatus.INT}</div>
        </div>
        <div className="cv-panel p-4">
          <div className="text-xs text-slate-600">NG</div>
          <div className="text-2xl font-semibold text-slate-900">{summary.byStatus.NG}</div>
        </div>
      </div>

      {/* 一覧 */}
      <div className="cv-panel overflow-x-auto">
        {items.length === 0 ? (
          <div className="p-6 text-sm text-slate-600">まだ応募者が登録されていません。</div>
        ) : (
          <table className="min-w-full border-separate border-spacing-0">
            <thead>
              <tr className="text-left text-xs text-slate-500">
                <th className="border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
                  応募日
                </th>
                <th className="border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
                  媒体
                </th>
                <th className="border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
                  応募者
                </th>
                <th className="border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
                  状態
                </th>
                <th className="border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
                  メモ
                </th>
                <th className="border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
                  操作
                </th>
              </tr>
            </thead>

            <tbody>
              {items
                .slice()
                .sort((a, b) => b.appliedAt.localeCompare(a.appliedAt))
                .map((a) => (
                  <tr key={a.id} className="text-sm">
                    <td className="border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
                      {a.appliedAt}
                    </td>
                    <td className="border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
                      {a.siteKey}
                    </td>
                    <td className="border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
                      {a.name}
                    </td>
                    <td className="border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
                      <select
                        className="rounded-md border px-2 py-1 text-sm"
                        style={{ borderColor: "var(--border)" }}
                        value={a.status}
                        onChange={(e) => changeStatus(a, e.target.value as ApplicantStatus)}
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
                        placeholder="メモ"
                        onBlur={(e) => changeNote(a, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                        }}
                      />
                    </td>
                    <td className="border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
                      <button type="button" className="cv-btn-secondary" onClick={() => remove(a)}>
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
