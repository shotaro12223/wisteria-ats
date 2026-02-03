"use client";

import { useEffect, useMemo, useState } from "react";

type InboxItem = {
  id: string;
  gmailMessageId: string;
  threadId: string | null;

  fromEmail: string;
  toEmail: string | null;

  companyId: string | null;
  companyName: string | null;

  subject: string;
  snippet: string;
  receivedAt: string;

  siteKey: string;
  status: string;

  createdAt: string;
  updatedAt: string;
};

type InboxRes = { ok: true; items: InboxItem[]; debug?: any } | { ok: false; error: string };

type StatusKey = "new" | "registered" | "ng" | "interview" | "offer";

const STATUS_LABEL: Record<StatusKey, string> = {
  new: "New",
  registered: "連携済み",
  ng: "NG",
  interview: "面接",
  offer: "内定",
};

function norm(s: any) {
  return String(s ?? "").trim().toLowerCase();
}

function normalizeStatus(raw: any): StatusKey {
  const s = norm(raw);
  if (s === "registered") return "registered";
  if (s === "ng") return "ng";
  if (s === "interview") return "interview";
  if (s === "offer") return "offer";
  return "new";
}

// ✅ Re / 返信 / 転送 を除外（分析対象から外す）
function isReplySubject(subject: any): boolean {
  const s = String(subject ?? "").trim();
  const t = s.toLowerCase();

  if (t.startsWith("re:") || t.startsWith("re：")) return true;
  if (s.startsWith("返信:") || s.startsWith("返信：")) return true;

  if (t.startsWith("fw:") || t.startsWith("fw：")) return true;
  if (t.startsWith("fwd:") || t.startsWith("fwd：")) return true;

  return false;
}

function safeDateMs(iso: string): number | null {
  try {
    const ms = new Date(iso).getTime();
    if (!Number.isFinite(ms)) return null;
    return ms;
  } catch {
    return null;
  }
}

function pct(n: number, d: number): string {
  if (!Number.isFinite(n) || !Number.isFinite(d) || d <= 0) return "0%";
  const v = (n / d) * 100;
  return `${v.toFixed(1)}%`;
}

function num(n: number): string {
  try {
    return new Intl.NumberFormat().format(n);
  } catch {
    return String(n);
  }
}

function cls(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function clamp01(x: number) {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function buildStats(items: InboxItem[]): {
  total: number;
  counts: Record<StatusKey, number>;
  aging: { d01: number; d23: number; d47: number; d8p: number };
  applyRate: number; // registered/total
  interviewRate: number | null; // interview/registered
  offerRate: number | null; // offer/interview
} {
  const counts: Record<StatusKey, number> = {
    new: 0,
    registered: 0,
    ng: 0,
    interview: 0,
    offer: 0,
  };

  const nowMs = Date.now();
  const aging = { d01: 0, d23: 0, d47: 0, d8p: 0 };

  for (const it of items) {
    const st = normalizeStatus(it.status);
    counts[st]++;

    if (st === "new") {
      const rMs = safeDateMs(String(it.receivedAt ?? ""));
      if (rMs !== null) {
        const days = Math.floor((nowMs - rMs) / (24 * 60 * 60 * 1000));
        if (days <= 1) aging.d01++;
        else if (days <= 3) aging.d23++;
        else if (days <= 7) aging.d47++;
        else aging.d8p++;
      } else {
        aging.d8p++;
      }
    }
  }

  const total = items.length;
  const registered = counts.registered;
  const interview = counts.interview;
  const offer = counts.offer;

  const applyRate = total > 0 ? registered / total : 0;
  const interviewRate = registered > 0 ? interview / registered : null;
  const offerRate = interview > 0 ? offer / interview : null;

  return { total, counts, aging, applyRate, interviewRate, offerRate };
}



type FunnelRow = {
  key: "total" | "registered" | "interview" | "offer";
  label: string;
  value: number;
  vsPrev: string;
  vsTotal: string;
  width01: number;
  barBg: string;
  darkBarBg: string;
};

function buildFunnelRows(stats: { total: number; counts: Record<StatusKey, number> }): FunnelRow[] {
  const total = Math.max(0, stats.total);
  const registered = Math.max(0, stats.counts.registered);
  const interview = Math.max(0, stats.counts.interview);
  const offer = Math.max(0, stats.counts.offer);

  const w = (v: number) => (total > 0 ? clamp01(v / total) : 0);

  return [
    {
      key: "total",
      label: "総受信",
      value: total,
      vsPrev: "-",
      vsTotal: "100%",
      width01: w(total),
      barBg: "linear-gradient(to right, rgba(15,23,42,0.12), rgba(15,23,42,0.08))",
      darkBarBg: "linear-gradient(to right, rgba(148,163,184,0.25), rgba(148,163,184,0.15))",
    },
    {
      key: "registered",
      label: "連携",
      value: registered,
      vsPrev: pct(registered, total),
      vsTotal: pct(registered, total),
      width01: w(registered),
      barBg: "linear-gradient(to right, rgba(99,102,241,0.78), rgba(59,130,246,0.78))",
      darkBarBg: "linear-gradient(to right, rgba(99,102,241,0.85), rgba(59,130,246,0.85))",
    },
    {
      key: "interview",
      label: "面接",
      value: interview,
      vsPrev: pct(interview, registered),
      vsTotal: pct(interview, total),
      width01: w(interview),
      barBg: "linear-gradient(to right, rgba(16,185,129,0.80), rgba(52,211,153,0.78))",
      darkBarBg: "linear-gradient(to right, rgba(16,185,129,0.85), rgba(52,211,153,0.85))",
    },
    {
      key: "offer",
      label: "内定",
      value: offer,
      vsPrev: pct(offer, interview),
      vsTotal: pct(offer, total),
      width01: w(offer),
      barBg: "linear-gradient(to right, rgba(245,158,11,0.80), rgba(251,191,36,0.78))",
      darkBarBg: "linear-gradient(to right, rgba(245,158,11,0.85), rgba(251,191,36,0.85))",
    },
  ];
}

function MiniRateChip(props: { label: string; value: string; sub?: string }) {
  return (
    <div
      className="flex items-center justify-between gap-3 rounded-xl border bg-white/80 px-3 py-2 dark:bg-slate-800/80"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="min-w-0">
        <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">{props.label}</div>
        {props.sub ? <div className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">{props.sub}</div> : null}
      </div>
      <div className="shrink-0 text-[13px] font-bold tabular-nums text-slate-900 dark:text-slate-100">{props.value}</div>
    </div>
  );
}

function MiniAgingBar(props: { aging: { d01: number; d23: number; d47: number; d8p: number } }) {
  const total = props.aging.d01 + props.aging.d23 + props.aging.d47 + props.aging.d8p;

  const w = (v: number) => (total > 0 ? Math.max(0.04, v / total) : 0);

  return (
    <div className="rounded-xl border bg-white/80 px-3 py-2 dark:bg-slate-800/80" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-end justify-between gap-3">
        <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">New 滞留（経過）</div>
        <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Newのみ</div>
      </div>

      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-700/50">
        <div className="flex h-2 w-full">
          <div
            className="h-2"
            style={{
              width: `${Math.round(w(props.aging.d01) * 100)}%`,
              background: "linear-gradient(to right, rgba(15,23,42,0.30), rgba(15,23,42,0.18))",
            }}
            title={`0-1日: ${num(props.aging.d01)}`}
          />
          <div
            className="h-2"
            style={{
              width: `${Math.round(w(props.aging.d23) * 100)}%`,
              background: "linear-gradient(to right, rgba(99,102,241,0.45), rgba(59,130,246,0.35))",
            }}
            title={`2-3日: ${num(props.aging.d23)}`}
          />
          <div
            className="h-2"
            style={{
              width: `${Math.round(w(props.aging.d47) * 100)}%`,
              background: "linear-gradient(to right, rgba(245,158,11,0.55), rgba(251,191,36,0.45))",
            }}
            title={`4-7日: ${num(props.aging.d47)}`}
          />
          <div
            className="h-2"
            style={{
              width: `${Math.round(w(props.aging.d8p) * 100)}%`,
              background: "linear-gradient(to right, rgba(244,63,94,0.55), rgba(251,113,133,0.45))",
            }}
            title={`8日以上: ${num(props.aging.d8p)}`}
          />
        </div>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-2 text-[10px] font-semibold text-slate-600 dark:text-slate-400">
        <div className="truncate" title={`0-1日: ${num(props.aging.d01)}`}>
          0–1日 <span className="ml-1 tabular-nums text-slate-900 dark:text-slate-100">{num(props.aging.d01)}</span>
        </div>
        <div className="truncate" title={`2-3日: ${num(props.aging.d23)}`}>
          2–3日 <span className="ml-1 tabular-nums text-slate-900 dark:text-slate-100">{num(props.aging.d23)}</span>
        </div>
        <div className="truncate" title={`4-7日: ${num(props.aging.d47)}`}>
          4–7日 <span className="ml-1 tabular-nums text-slate-900 dark:text-slate-100">{num(props.aging.d47)}</span>
        </div>
        <div className="truncate" title={`8日以上: ${num(props.aging.d8p)}`}>
          8+ <span className="ml-1 tabular-nums text-slate-900 dark:text-slate-100">{num(props.aging.d8p)}</span>
        </div>
      </div>
    </div>
  );
}

function FunnelCompact(props: { rows: FunnelRow[] }) {
  const total = props.rows.find((r) => r.key === "total")?.value ?? 0;

  return (
    <div className="rounded-xl border bg-white/80 px-3 py-2 dark:bg-slate-800/80" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-end justify-between gap-3">
        <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">ファネル</div>
        <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">総受信 {num(total)}</div>
      </div>

      <div className="mt-2 space-y-2">
        {props.rows.map((r) => {
          const width = Math.max(0.06, r.width01);
          const wPct = Math.round(width * 100);

          return (
            <div key={r.key} className="rounded-lg border border-slate-200/70 bg-white/70 px-2.5 py-2 dark:border-slate-700/70 dark:bg-slate-700/50">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">{r.label}</div>
                    {r.key !== "total" ? (
                      <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300">
                        前段 {r.vsPrev}
                      </span>
                    ) : null}
                    <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300">
                      総受信 {r.vsTotal}
                    </span>
                  </div>
                </div>
                <div className="shrink-0 text-[12px] font-bold tabular-nums text-slate-900 dark:text-slate-100">{num(r.value)}</div>
              </div>

              <div className="mt-2 h-2 w-full rounded-full bg-slate-200/70 dark:bg-slate-700/50">
                <div
                  className="h-2 rounded-full dark:opacity-90"
                  style={{
                    width: `${wPct}%`,
                    background: r.barBg,
                    transition: "filter 120ms ease-out",
                    filter: "saturate(1.02)",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}



export default function CompanyApplicantEmails(props: { companyId: string }) {
  const companyId = useMemo(() => String(props.companyId ?? "").trim(), [props.companyId]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [items, setItems] = useState<InboxItem[]>([]);

  const LIMIT = 2000;

  async function load() {
    if (!companyId) return;

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/gmail/inbox?limit=${LIMIT}&companyId=${encodeURIComponent(companyId)}`, {
        cache: "no-store",
      });
      const json = (await res.json()) as InboxRes;

      if (!res.ok || !json.ok) {
        setItems([]);
        setError(json.ok ? "inbox load failed" : json.error ?? "inbox load failed");
        return;
      }

      setItems(Array.isArray(json.items) ? json.items : []);
    } catch (e: any) {
      setItems([]);
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const nonReplyItems = useMemo(() => {
    return items.filter((it) => !isReplySubject(it.subject));
  }, [items]);

  const stats = useMemo(() => buildStats(nonReplyItems), [nonReplyItems]);
  const funnelRows = useMemo(() => buildFunnelRows({ total: stats.total, counts: stats.counts }), [stats.total, stats.counts]);

  const empty = !loading && !error && items.length === 0;

  const applyRateStr = pct(stats.counts.registered, stats.total);
  const interviewRateStr =
    stats.interviewRate === null ? "-" : `${(stats.interviewRate * 100).toFixed(1)}%`;
  const offerRateStr = stats.offerRate === null ? "-" : `${(stats.offerRate * 100).toFixed(1)}%`;

  return (
    <section className="cv-panel overflow-hidden">
      <div className="border-b px-5 py-4" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">分析（応募メール：累計）</div>
            <div className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
              この会社に紐づいた応募メール（Re/返信/転送を除外）の状態を集計します（コンパクト表示）
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button type="button" className="cv-btn-secondary" onClick={load} disabled={loading}>
              {loading ? "更新中…" : "更新"}
            </button>
          </div>
        </div>

        {error ? <div className="mt-2 text-xs text-red-600 dark:text-red-400">読み込みエラー: {error}</div> : null}
      </div>

      <div className="px-5 py-5">
        {loading && items.length === 0 ? <div className="text-sm text-slate-600 dark:text-slate-400">読み込み中...</div> : null}

        {empty ? (
          <div className="rounded-2xl border bg-[var(--surface-muted)] p-5 text-sm text-slate-700 dark:text-slate-300" style={{ borderColor: "var(--border)" }}>
            この会社の応募メールはまだありません（または未同期 / 未紐付けです）
          </div>
        ) : null}

        {!empty ? (
          <div className="space-y-4">
            {/* KPI（4枚は維持。ただし padding を気持ち詰める） */}
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              <KpiMini label="総受信" value={num(stats.total)} hint={`上限 ${num(LIMIT)}`} />
              <KpiMini label="New" value={num(stats.counts.new)} emphasis hint="未処理" />
              <KpiMini label="連携" value={num(stats.counts.registered)} hint="応募化" />
              <KpiMini label="NG" value={num(stats.counts.ng)} hint="見送り" />
            </div>

            {/* コンパクト分析（1枚に圧縮） */}
            <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
              <FunnelCompact rows={funnelRows} />

              <div className="space-y-2">
                <MiniAgingBar aging={stats.aging} />

                <div className="grid grid-cols-3 gap-2">
                  <MiniRateChip label="応募化率" value={applyRateStr} sub={`${num(stats.counts.registered)} / ${num(stats.total)}`} />
                  <MiniRateChip
                    label="面接化率"
                    value={interviewRateStr}
                    sub={stats.counts.registered > 0 ? `${num(stats.counts.interview)} / ${num(stats.counts.registered)}` : "算出不可"}
                  />
                  <MiniRateChip
                    label="内定化率"
                    value={offerRateStr}
                    sub={stats.counts.interview > 0 ? `${num(stats.counts.offer)} / ${num(stats.counts.interview)}` : "算出不可"}
                  />
                </div>

                <div className="rounded-xl border bg-white/70 px-3 py-2 text-[11px] text-slate-600 dark:bg-slate-800/70 dark:text-slate-400" style={{ borderColor: "var(--border)" }}>
                  ※ 取得した応募メール（最大 {num(LIMIT)} 件）をクライアント側で集計しています。
                </div>
              </div>
            </div>

            {/* ここで終わり：縦を増やさない */}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function KpiMini(props: { label: string; value: string; hint?: string; emphasis?: boolean }) {
  return (
    <div
      className={cls(
        "rounded-xl border bg-white px-3 py-2 dark:bg-slate-800",
        props.emphasis && "ring-1 ring-slate-200 dark:ring-slate-700"
      )}
      style={{ borderColor: "var(--border)" }}
    >
      <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">{props.label}</div>
      <div className={cls("mt-0.5 text-[18px] font-bold tabular-nums tracking-tight", props.emphasis ? "text-slate-900 dark:text-slate-100" : "text-slate-800 dark:text-slate-200")}>
        {props.value}
      </div>
      {props.hint ? <div className="mt-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">{props.hint}</div> : null}
    </div>
  );
}
