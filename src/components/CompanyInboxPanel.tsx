"use client";

import { useEffect, useState } from "react";

type InboxItem = {
  id: string;
  gmailMessageId: string;
  threadId: string | null;
  fromEmail: string;
  toEmail: string | null;
  subject: string;
  snippet: string;
  receivedAt: string;
};

function gmailMessageUrl(messageId: string) {
  return `https://mail.google.com/mail/u/0/#all/${encodeURIComponent(messageId)}`;
}

function formatLocal(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function CompanyInboxPanel(props: { toEmail: string }) {
  const toEmail = String(props.toEmail ?? "").trim();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [items, setItems] = useState<InboxItem[]>([]);

  async function load() {
    if (!toEmail) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/gmail/inbox?limit=50&toEmail=${encodeURIComponent(toEmail)}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json?.error ?? "inbox load failed");
        setItems([]);
        return;
      }
      setItems(json.items ?? []);
    } catch (e: any) {
      setError(String(e?.message ?? e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toEmail]);

  return (
    <section className="cv-panel overflow-hidden">
      <div className="border-b px-5 py-4" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900">応募メール</div>
            <div className="mt-1 text-[12px] text-slate-500">
              宛先 <span className="font-medium text-slate-700">{toEmail}</span> に届いたメールだけ表示します
            </div>
          </div>

          <button type="button" className="cv-btn-secondary" onClick={load} disabled={loading}>
            {loading ? "更新中…" : "更新"}
          </button>
        </div>
      </div>

      <div className="px-5 py-5">
        {!toEmail ? (
          <div className="rounded-2xl border bg-[var(--surface-muted)] p-5 text-sm text-slate-700" style={{ borderColor: "var(--border)" }}>
            会社概要で「会社用アドレス（応募受信用）」を登録すると、ここに自動でまとまります。
          </div>
        ) : error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border bg-[var(--surface-muted)] p-5 text-sm text-slate-700" style={{ borderColor: "var(--border)" }}>
            この宛先に届いた応募メールはまだありません（または同期前です）
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((it) => (
              <div key={it.id} className="rounded-2xl border bg-white p-4" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">{it.subject}</div>
                    <div className="mt-1 text-[12px] text-slate-500">
                      From: <span className="text-slate-700">{it.fromEmail}</span>
                      {it.toEmail ? (
                        <>
                          {" "} / To: <span className="text-slate-700">{it.toEmail}</span>
                        </>
                      ) : null}
                      {" "} / 受信: <span className="text-slate-700">{formatLocal(it.receivedAt)}</span>
                    </div>
                  </div>

                  <a
                    className="cv-btn-secondary"
                    href={gmailMessageUrl(it.gmailMessageId)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Gmailで開く
                  </a>
                </div>

                {it.snippet ? (
                  <div className="mt-3 text-sm text-slate-700 whitespace-pre-wrap">{it.snippet}</div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
