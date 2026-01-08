"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Applicant, ApplicantStatus } from "@/lib/applicantsStorage";
import { deleteApplicant, updateApplicant } from "@/lib/applicantsStorage";

type ApplicantWithNames = Applicant & {
  companyName?: string;
  jobTitle?: string;
};

type Res =
  | { ok: true; item: ApplicantWithNames }
  | { ok: false; error: { message: string } };

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

export default function ApplicantDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = String(params?.id ?? "");

  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<ApplicantWithNames | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [status, setStatus] = useState<ApplicantStatus>("NEW");
  const [note, setNote] = useState<string>("");

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/applicants/${encodeURIComponent(id)}`, { cache: "no-store" });
      const json = (await res.json()) as Res;

      if (!res.ok || !json.ok) {
        const msg = !json.ok ? json.error.message : `HTTP ${res.status}`;
        throw new Error(msg);
      }

      setItem(json.item);
      setStatus(json.item.status);
      setNote(json.item.note ?? "");
    } catch (e) {
      console.error(e);
      setItem(null);
      setError("応募詳細の取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!item) return;

    setSaving(true);
    try {
      await updateApplicant(item.id, { status, note });
      // 再取得しない（API増やさない）
      setItem({ ...item, status, note: note || undefined });
    } catch (e) {
      console.error(e);
      window.alert("保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!item) return;

    const ok = window.confirm("この応募を削除します。よろしいですか？（元に戻せません）");
    if (!ok) return;

    setDeleting(true);
    try {
      await deleteApplicant(item.id);

      // ✅ 一覧へ戻った瞬間に“必ず”再検索させるため、ダミーのtsを付与
      // /applicants は useSearchParams() 依存で再fetchしているので、クエリが変われば再実行される
      const ts = Date.now();
      router.push(`/applicants?limit=300&ts=${ts}`);
    } catch (e) {
      console.error(e);
      window.alert("削除に失敗しました。");
    } finally {
      setDeleting(false);
    }
  }

  useEffect(() => {
    if (!id) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <main className="space-y-6">
      <div className="cv-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm text-slate-500">応募詳細</div>
            <div className="mt-1 text-lg font-semibold text-slate-900">
              {item?.name ?? (loading ? "読み込み中..." : "応募者")}
            </div>
            <div className="mt-1 text-xs text-slate-500">ID: {id}</div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <button type="button" className="cv-btn-secondary" onClick={() => router.back()}>
              戻る
            </button>
            <Link href="/applicants" className="cv-btn-secondary">
              応募一覧へ
            </Link>

            <button
              type="button"
              className="cv-btn-primary"
              disabled={saving || deleting || loading || !item}
              onClick={save}
            >
              {saving ? "保存中..." : "保存"}
            </button>

            <button
              type="button"
              className="cv-btn-secondary"
              disabled={saving || deleting || loading || !item}
              onClick={remove}
            >
              {deleting ? "削除中..." : "削除"}
            </button>
          </div>
        </div>
      </div>

      {error ? <div className="cv-panel p-6 text-sm text-red-600">{error}</div> : null}

      {loading ? (
        <div className="cv-panel p-6 text-sm text-slate-600">読み込み中...</div>
      ) : !item ? (
        <div className="cv-panel p-6 text-sm text-slate-600">応募が見つかりません。</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="cv-panel p-6 space-y-4">
            <div>
              <div className="text-xs text-slate-500">会社</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {item.companyName ?? item.companyId ?? "-"}
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-500">求人</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {item.jobTitle ?? item.jobId ?? "-"}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <div className="text-xs text-slate-500">応募日</div>
                <div className="mt-1 text-sm text-slate-900">{item.appliedAt}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">媒体</div>
                <div className="mt-1 text-sm text-slate-900">{item.siteKey}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <div className="text-xs text-slate-500">登録日時</div>
                <div className="mt-1 text-sm text-slate-900">{fmtDateTime(item.createdAt)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">更新日時</div>
                <div className="mt-1 text-sm text-slate-900">{fmtDateTime(item.updatedAt)}</div>
              </div>
            </div>

            {item.companyId && item.jobId ? (
              <div className="pt-2">
                <Link href={`/companies/${item.companyId}/jobs/${item.jobId}`} className="cv-btn-secondary">
                  求人ページへ
                </Link>
              </div>
            ) : null}
          </div>

          <div className="cv-panel p-6 space-y-4">
            <div>
              <div className="text-xs text-slate-500">状態</div>
              <div className="mt-1">
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
            </div>

            <div>
              <div className="text-xs text-slate-500">メモ</div>
              <textarea
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: "var(--border)" }}
                rows={8}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="やること / 次アクション / 面接メモなど"
              />
              <div className="mt-2 text-xs text-slate-500">
                ※API呼び出しを増やさないため、保存後の再取得はしていません（画面状態だけ更新）。
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
