"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type MailDetail = {
  id: string;
  gmailMessageId: string;
  threadId: string | null;

  fromEmail: string;
  toEmail: string | null;

  subject: string;
  snippet: string | null;
  receivedAt: string;

  siteKey: string;
  status: string;

  createdAt: string;
  updatedAt: string;

  bodyHtml: string | null;
  bodyText: string | null;
};

function formatLocal(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function safePreview(s: string, max = 240) {
  const t = String(s ?? "");
  if (t.length <= max) return t;
  return t.slice(0, max) + "...";
}

export default function InboxDetailClient({ id }: { id: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [item, setItem] = useState<MailDetail | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError("");
      setItem(null);

      try {
        const res = await fetch(`/api/gmail/inbox/${encodeURIComponent(id)}`, {
          cache: "no-store",
        });
        const text = await res.text();

        let json: any = null;
        try {
          json = JSON.parse(text);
        } catch {
          json = null;
        }

        if (!res.ok || !json?.ok) {
          const msg = json?.error ?? `load failed: HTTP ${res.status} ${safePreview(text)}`;
          if (!cancelled) setError(msg);
          return;
        }

        if (!cancelled) setItem(json.item as MailDetail);
      } catch (e: any) {
        if (!cancelled) setError(String(e?.message ?? e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <main className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/applicants" className="text-sm underline text-slate-700 hover:text-slate-900">
          ← 戻る
        </Link>
        <h1 className="text-lg font-semibold text-slate-900">メール本文</h1>
      </div>

      {loading ? <div className="text-sm text-slate-600">読み込み中...</div> : null}
      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      {item ? (
        <>
          <div className="cv-panel p-4 space-y-2">
            <div className="text-xs text-slate-500">
              {item.receivedAt ? formatLocal(item.receivedAt) : "-"}
            </div>
            <div className="text-base font-semibold text-slate-900">{item.subject}</div>

            <div className="text-sm text-slate-700 break-all space-y-1">
              <div>
                <span className="text-slate-500">From:</span> {item.fromEmail || "-"}
              </div>
              <div>
                <span className="text-slate-500">To:</span> {item.toEmail || "-"}
              </div>
            </div>

            {item.snippet ? <div className="text-sm text-slate-600">{item.snippet}</div> : null}
          </div>

          <div className="cv-panel p-4">
            <div className="text-sm font-semibold text-slate-900 mb-2">本文</div>

            {item.bodyHtml ? (
              <iframe
                title="mail-body"
                className="w-full min-h-[70vh] rounded-md border"
                sandbox="allow-same-origin"
                srcDoc={item.bodyHtml}
              />
            ) : item.bodyText ? (
              <pre className="whitespace-pre-wrap text-sm text-slate-800">{item.bodyText}</pre>
            ) : (
              <div className="text-sm text-slate-600">本文を取得できませんでした。</div>
            )}
          </div>
        </>
      ) : null}
    </main>
  );
}
