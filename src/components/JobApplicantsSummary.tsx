"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ApplicantItem = {
  id: string;
  companyId: string;
  jobId: string;
  appliedAt: string | null;
  siteKey: string | null;
  name: string | null;
  status: string | null;
  note: string;
  createdAt: string;
  updatedAt: string;
};

type ApiRes =
  | { ok: true; items: ApplicantItem[]; total?: number; debug?: any }
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

function pickFromNote(note: string) {
  // register route の note 形式:
  // From: ...
  // Subject: ...
  // Snippet: ...
  // GmailMessageId: ...
  const lines = String(note ?? "").split("\n");
  const get = (prefix: string) => {
    const line = lines.find((l) => l.startsWith(prefix));
    return line ? line.slice(prefix.length).trim() : "";
  };
  return {
    from: get("From:"),
    subject: get("Subject:"),
    snippet: get("Snippet:"),
    gmailMessageId: get("GmailMessageId:"),
  };
}

export default function JobApplicantsSummary(props: { companyId: string; jobId: string; limit?: number }) {
  const limit = Math.max(1, Math.min(20, props.limit ?? 5));
  const { companyId, jobId } = props;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [items, setItems] = useState<ApplicantItem[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");

      try {
        // ✅ ここがポイント：jobId で applicants 正本を取る
        const res = await fetch(
          `/api/applicants?companyId=${encodeURIComponent(companyId)}&jobId=${encodeURIComponent(jobId)}&limit=${encodeURIComponent(
            String(Math.max(20, limit))
          )}`,
          { cache: "no-store" }
        );

        const text = await res.text();
        let json: ApiRes | null = null;
        try {
          json = JSON.parse(text);
        } catch {
          json = null;
        }

        if (!res.ok) {
          setError((json as any)?.error ?? `applicants load failed: HTTP ${res.status} ${safePreview(text)}`);
          setItems([]);
          return;
        }

        if (!json || !json.ok) {
          setError((json as any)?.error ?? "applicants load failed");
          setItems([]);
          return;
        }

        setItems(Array.isArray(json.items) ? json.items : []);
      } catch (e: any) {
        setError(String(e?.message ?? e));
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [companyId, jobId, limit]);

  const top = useMemo(() => {
    const arr = [...items];
    arr.sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
    return arr.slice(0, limit);
  }, [items, limit]);

  return (
    <div className="cv-panel overflow-hidden">
      <div className="border-b px-5 py-4" style={{ borderColor: "var(--border)" }}>
        <div className="text-sm font-semibold text-slate-900">応募サマリ</div>
        <div className="mt-1 text-[12px] text-slate-500">
          この求人に紐づいた応募（プルダウンで登録したもの）を表示します
        </div>
      </div>

      {loading ? (
        <div className="p-6 text-sm text-slate-600">読み込み中...</div>
      ) : error ? (
        <div className="p-6 text-sm text-rose-700">{error}</div>
      ) : top.length === 0 ? (
        <div className="p-6 text-sm text-slate-600">この求人に紐づいた応募がありません。</div>
      ) : (
        <div className="divide-y" style={{ borderColor: "var(--border)" }}>
          {top.map((a) => {
            const info = pickFromNote(a.note);
            const subject = info.subject || a.name || "(応募)";
            const from = info.from || "";
            const snippet = info.snippet || "";

            // applicants.id は gmail_<gmail_message_id> なので、inbox 詳細リンクはこれで開ける
            const inboxIdLike = ""; // inbox row id は別なので、詳細リンクは note の GmailMessageId だけだと直接は飛べない
            // もし「/applicants/inbox/[inboxId]」に飛ばしたいなら inboxId を別で持つ必要あり（後で拡張）

            return (
              <div key={a.id} className="px-5 py-3 hover:bg-slate-50/70">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium text-slate-900">
                      {subject || "(件名なし)"}
                    </div>
                    <div className="mt-1 truncate text-[11px] text-slate-500">
                      {from ? `From: ${from}` : ""}
                      {a.appliedAt ? ` / 応募日: ${a.appliedAt}` : ""}
                    </div>
                    {snippet ? <div className="mt-1 text-[11px] text-slate-600">{safePreview(snippet, 160)}</div> : null}
                  </div>

                  <div className="shrink-0 text-[11px] text-slate-400 whitespace-nowrap">
                    {a.createdAt ? formatLocal(a.createdAt) : "-"}
                  </div>
                </div>

                {/* 必要なら将来ここに「メール本文表示」リンクを足す */}
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[11px] text-slate-500">
                    status: <span className="text-slate-700">{a.status ?? "NEW"}</span>
                  </span>

                  <span className="text-[11px] text-slate-300">/</span>

                  <span className="text-[11px] text-slate-500">
                    id: <span className="text-slate-700">{a.id}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="border-t px-5 py-3" style={{ borderColor: "var(--border)" }}>
        <Link href="/applicants" className="cv-link text-sm">
          応募一覧へ →
        </Link>
      </div>
    </div>
  );
}
