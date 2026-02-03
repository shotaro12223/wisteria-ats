"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type InboxItem = {
  id: string;
  companyName: string | null;
  siteKey: string;
  status: string;
  receivedAt: string;
  subject: string;
};

type InboxRes =
  | {
      ok: true;
      items: any[];
    }
  | { ok: false; error?: any };

function formatLocalDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("ja-JP");
  } catch {
    return iso;
  }
}

function isReplyLikeSubject(subject: any): boolean {
  const s = String(subject ?? "").trim();
  const stripped = s.replace(/^\s*(\[[^\]]+\]\s*)+/g, "");
  return (
    /(^|\s)(re|fw|fwd)\s*[:：]/i.test(stripped) || /(^|\s)(返信|転送)\s*[:：]/.test(stripped)
  );
}

function isApplicationMail(it: { subject: any }) {
  return !isReplyLikeSubject(it.subject);
}

function normalizeInboxItem(x: any): InboxItem {
  return {
    id: String(x?.id ?? "").trim(),
    companyName: x?.companyName != null ? String(x.companyName).trim() : null,
    siteKey: String(x?.siteKey ?? "").trim(),
    status: String(x?.status ?? "").trim(),
    receivedAt: String(x?.receivedAt ?? "").trim(),
    subject: String(x?.subject ?? "").trim(),
  };
}

function statusTone(status: string) {
  const s = String(status ?? "").trim().toLowerCase();
  if (s === "ng")
    return { cls: "bg-rose-50 text-rose-800 border-rose-200", dot: "bg-rose-500", label: "NG" };
  if (s === "registered")
    return {
      cls: "bg-emerald-50 text-emerald-800 border-emerald-200",
      dot: "bg-emerald-500",
      label: "連携済み",
    };
  if (s === "interview")
    return {
      cls: "bg-amber-50 text-amber-800 border-amber-200",
      dot: "bg-amber-500",
      label: "面接",
    };
  if (s === "offer")
    return {
      cls: "bg-violet-50 text-violet-800 border-violet-200",
      dot: "bg-violet-500",
      label: "内定",
    };
  return { cls: "bg-blue-50 text-blue-800 border-blue-200", dot: "bg-blue-500", label: "New" };
}

function StatusPill({ status }: { status: string }) {
  const m = statusTone(status);
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold",
        m.cls,
      ].join(" ")}
    >
      <span className={["h-1.5 w-1.5 rounded-full", m.dot].join(" ")} />
      {m.label}
    </span>
  );
}

function SiteChip({ siteKey }: { siteKey: string }) {
  const t = String(siteKey ?? "").trim() || "-";
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700">
      {t}
    </span>
  );
}

const UI = {
  PANEL: "rounded-md border-2 border-slate-200/80 bg-white shadow-sm",
  PANEL_HDR: "flex items-start justify-between gap-3 border-b-2 border-slate-200/80 px-4 py-3",
  PANEL_TITLE: "text-[13px] font-semibold text-slate-900",
};

export default function InboxPage() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");
  const [rows, setRows] = useState<InboxItem[]>([]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setErr("");

      try {
        const res = await fetch(
          `/api/gmail/inbox?limit=100&page=1`,
          { cache: "no-store" }
        );
        const json = (await res.json()) as InboxRes;

        if (!res.ok || !json || (json as any).ok !== true) {
          const msg = (json as any)?.error?.message ?? (json as any)?.error ?? "inbox load failed";
          if (!alive) return;
          setErr(String(msg));
          setRows([]);
          return;
        }

        const arr: any[] = Array.isArray((json as any).items) ? (json as any).items : [];

        const mapped: InboxItem[] = arr
          .map((v: any) => normalizeInboxItem(v))
          .filter((x: InboxItem) => Boolean(x.id));

        const filtered: InboxItem[] = mapped.filter((x: InboxItem) => isApplicationMail(x));

        filtered.sort((a: InboxItem, b: InboxItem) => {
          const ar = String(a.receivedAt ?? "");
          const br = String(b.receivedAt ?? "");
          return br.localeCompare(ar);
        });

        if (!alive) return;
        setRows(filtered);
      } catch (e: any) {
        if (!alive) return;
        setErr(String(e?.message ?? e));
        setRows([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <main className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/" className="text-sm underline text-slate-700 hover:text-slate-900">
          ← ホームへ
        </Link>
        <h1 className="text-lg font-semibold text-slate-900">受信箱</h1>
      </div>

      <div className={UI.PANEL}>
        <div className={UI.PANEL_HDR}>
          <div className="min-w-0">
            <div className={UI.PANEL_TITLE}>新着応募</div>
          </div>
        </div>

        <div className="p-2 sm:p-3">
          {loading ? (
            <div className="rounded-md border-2 border-slate-200/80 bg-white px-3 py-2 text-sm text-slate-600">
              読み込み中...
            </div>
          ) : err ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {err}
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-md border-2 border-slate-200/80 bg-white px-3 py-2 text-sm text-slate-600">
              新着応募はありません。
            </div>
          ) : (
            <div className="rounded-md border-2 border-slate-200/80 bg-white">
              <div className="hidden sm:grid sm:grid-cols-[minmax(220px,1fr)_140px_210px_120px] sm:items-center sm:gap-3 sm:border-b-2 sm:border-slate-200/80 sm:px-4 sm:py-2 text-[11px] text-slate-600">
                <div>会社名 / ステータス</div>
                <div>掲載媒体</div>
                <div>新着応募日時</div>
                <div className="text-right">操作</div>
              </div>

              <div className="divide-y-2 divide-slate-200/60">
                {rows.map((r) => (
                  <div key={r.id} className="px-3 py-2 sm:px-4 sm:py-2 transition hover:bg-slate-50/70">
                    <div className="hidden sm:grid sm:grid-cols-[minmax(220px,1fr)_140px_210px_120px] sm:items-center sm:gap-3">
                      <div className="min-w-0 flex items-center gap-2">
                        <div className="min-w-0 flex-1 truncate text-[13px] font-semibold text-slate-900">
                          {r.companyName || "(会社名未判定)"}
                        </div>
                        <StatusPill status={r.status} />
                      </div>

                      <div className="flex items-center">
                        <SiteChip siteKey={r.siteKey} />
                      </div>

                      <div className="text-[12px] text-slate-700 tabular-nums">
                        {r.receivedAt ? formatLocalDateTime(r.receivedAt) : "-"}
                      </div>

                      <div className="text-right">
                        <Link
                          href={`/applicants/inbox/${encodeURIComponent(r.id)}`}
                          className="inline-block rounded-md border-2 border-slate-200/80 bg-white px-3 py-1 text-[12px] font-semibold text-slate-900 hover:bg-slate-50 whitespace-nowrap"
                        >
                          確認する
                        </Link>
                      </div>
                    </div>

                    <div className="sm:hidden">
                      <div className="flex items-center gap-2">
                        <div className="min-w-0 flex-1 truncate text-[13px] font-semibold text-slate-900">
                          {r.companyName || "(会社名未判定)"}
                        </div>
                        <StatusPill status={r.status} />
                      </div>

                      <div className="mt-1 flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <SiteChip siteKey={r.siteKey} />
                          <span className="truncate text-[11px] text-slate-500 tabular-nums">
                            {r.receivedAt ? formatLocalDateTime(r.receivedAt) : "-"}
                          </span>
                        </div>

                        <Link
                          href={`/applicants/inbox/${encodeURIComponent(r.id)}`}
                          className="inline-block rounded-md border-2 border-slate-200/80 bg-white px-3 py-1 text-[12px] font-semibold text-slate-900 hover:bg-slate-50 whitespace-nowrap"
                        >
                          確認
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
