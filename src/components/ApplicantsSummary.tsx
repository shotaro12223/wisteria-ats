"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type InboxItem = {
  id: string;

  fromEmail: string;
  toEmail: string | null;

  subject: string;
  snippet: string;
  receivedAt: string;

  siteKey: string;
  status: string;
};

type InboxGetRes =
  | { ok: true; items: any[]; debug?: any }
  | { ok: false; error: string };

type JobApplicantsSummaryRes =
  | {
      ok: true;
      jobId: string;
      inbox: { total: number; items: InboxItem[] };
    }
  | { ok: false; error: string };

function safePreview(s: string, max = 240) {
  const t = String(s ?? "");
  if (t.length <= max) return t;
  return t.slice(0, max) + "...";
}

function formatLocal(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

/**
 * GmailInboxPanel と同じ「応募メール判定」。
 * Re/Fw/返信/転送 を除外して “応募メール” の母集団にする。
 */
function isReplyLikeSubject(subject: any): boolean {
  const s = String(subject ?? "").trim();
  const stripped = s.replace(/^\s*(\[[^\]]+\]\s*)+/g, "");

  return (
    /(^|\s)(re|fw|fwd)\s*[:：]/i.test(stripped) ||
    /(^|\s)(返信|転送)\s*[:：]/.test(stripped)
  );
}

function isApplicationMail(it: { subject: any }) {
  return !isReplyLikeSubject(it.subject);
}

async function fetchJsonSafe(
  input: RequestInfo,
  init?: RequestInit
): Promise<{
  ok: boolean;
  status: number;
  contentType: string;
  json: any | null;
  text: string;
}> {
  const res = await fetch(input, init);
  const contentType = res.headers.get("content-type") ?? "";
  const text = await res.text();

  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }

  return { ok: res.ok, status: res.status, contentType, json, text };
}

function safeKey(v: any) {
  return String(v ?? "").trim();
}

export default function ApplicantsSummary(props: {
  /** ✅ jobページで渡す（これがあると “その求人” の応募メールに絞る） */
  jobId?: string;
  /** 表示件数（UI上限は20） */
  limit?: number;
  /** タイトルを変えたいとき */
  title?: string;
}) {
  const jobId = safeKey(props.jobId);
  const limit = Math.max(1, Math.min(20, props.limit ?? 5));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [items, setItems] = useState<InboxItem[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");

      try {
        // ✅ jobId があれば “その求人” の応募メールを取得
        if (jobId) {
          const r = await fetchJsonSafe(
            `/api/jobs/${encodeURIComponent(jobId)}/applicants-summary?limit=${encodeURIComponent(
              String(Math.max(limit, 20)) // 返信/転送除外で減るので少し多め
            )}`,
            { cache: "no-store" }
          );

          if (!r.ok) {
            const msg =
              r.json?.error ??
              `summary load failed: HTTP ${r.status} (${r.contentType}) ${safePreview(r.text)}`;
            setError(msg);
            setItems([]);
            return;
          }

          const json = (r.json ?? null) as JobApplicantsSummaryRes | null;
          if (!json || !json.ok) {
            setError((json as any)?.error ?? "summary load failed");
            setItems([]);
            return;
          }

          const arr = Array.isArray(json.inbox?.items) ? json.inbox.items : [];
          setItems(arr);
          return;
        }

        // ✅ jobId が無い場合は従来通り “全体の新着応募”
        const r = await fetchJsonSafe(`/api/gmail/inbox?limit=50`, { cache: "no-store" });

        if (!r.ok) {
          const msg =
            r.json?.error ??
            `inbox load failed: HTTP ${r.status} (${r.contentType}) ${safePreview(r.text)}`;
          setError(msg);
          setItems([]);
          return;
        }

        const json = (r.json ?? null) as InboxGetRes | null;
        if (!json || !json.ok) {
          setError((json as any)?.error ?? "inbox load failed");
          setItems([]);
          return;
        }

        const arr = Array.isArray((json as any).items) ? (json as any).items : [];

        // 既存APIの形に多少バラつきがあっても拾えるように軽く整形
        const mapped: InboxItem[] = arr.map((x: any) => ({
          id: safeKey(x.id),
          fromEmail: safeKey(x.fromEmail ?? x.from_email),
          toEmail: x.toEmail != null ? safeKey(x.toEmail) : x.to_email != null ? safeKey(x.to_email) : null,
          subject: safeKey(x.subject),
          snippet: safeKey(x.snippet),
          receivedAt: safeKey(x.receivedAt ?? x.received_at),
          siteKey: safeKey(x.siteKey ?? x.site_key),
          status: safeKey(x.status),
        }));

        setItems(mapped);
      } catch (e: any) {
        setError(String(e?.message ?? e));
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, limit]);

  const top = useMemo(() => {
    const base = items.filter((it) => isApplicationMail(it));
    base.sort((a, b) => String(b.receivedAt ?? "").localeCompare(String(a.receivedAt ?? "")));
    return base.slice(0, limit);
  }, [items, limit]);

  const title =
    props.title ??
    (jobId ? "この求人の応募（紐付け済みメール）" : "新着応募");

  const subtitle = jobId
    ? "Gmail受信箱でこの求人に紐付けた応募メールを新しい順に表示"
    : "応募メール（Gmail受信箱）を新しい順に表示";

  return (
    <div className="cv-panel overflow-hidden">
      <div className="border-b px-5 py-4" style={{ borderColor: "var(--border)" }}>
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <div className="mt-1 text-[12px] text-slate-500">{subtitle}</div>
      </div>

      {loading ? (
        <div className="p-6 text-sm text-slate-600">読み込み中...</div>
      ) : error ? (
        <div className="p-6 text-sm text-rose-700">{error}</div>
      ) : top.length === 0 ? (
        <div className="p-6 text-sm text-slate-600">
          {jobId ? "この求人に紐付けた応募メールがありません。" : "新着の応募がありません。"}
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: "var(--border)" }}>
          {top.map((m) => (
            <div key={m.id} className="px-5 py-2 hover:bg-slate-50/70">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-medium text-slate-900">
                    {m.subject || "(件名なし)"}
                  </div>

                  <div className="mt-0.5 truncate text-[11px] text-slate-500">
                    {m.fromEmail ? m.fromEmail : "差出人不明"}
                    {m.toEmail ? ` / To: ${m.toEmail}` : ""}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <div className="text-[11px] text-slate-400 whitespace-nowrap">
                    {m.receivedAt ? formatLocal(m.receivedAt) : "-"}
                  </div>

                  <Link
                    href={`/applicants/inbox/${encodeURIComponent(m.id)}`}
                    className="cv-btn-secondary px-2 py-1 text-[11px]"
                  >
                    表示
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="border-t px-5 py-3" style={{ borderColor: "var(--border)" }}>
        <Link href="/applicants" className="cv-link text-sm">
          応募メール一覧へ →
        </Link>
      </div>
    </div>
  );
}
