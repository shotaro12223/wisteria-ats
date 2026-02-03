"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

type PresenceItem = {
  user_id: string;
  role: string;
  display_name: string | null;
  avatar_url: string | null;
  presence_status: string;
  presence_updated_at: string;
};

function labelStatus(s: string) {
  if (s === "working") return "作業中";
  if (s === "away") return "離席中";
  return s || "-";
}

function shortId(id: string) {
  const t = String(id ?? "");
  if (t.length <= 10) return t;
  return t.slice(0, 8) + "…" + t.slice(-4);
}

function isWorking(s: string) {
  return s === "working";
}

function initials(name: string | null) {
  const t = String(name ?? "").trim();
  if (!t) return "U";
  const p = t.split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[p.length - 1]?.[0] ?? "")).toUpperCase();
}

export default function MembersPresenceModal(props: { open: boolean; onClose: () => void }) {
  const { open, onClose } = props;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState<PresenceItem[]>([]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/presence", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        setError(json?.error ?? `load failed: HTTP ${res.status}`);
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
  }

  useEffect(() => {
    if (!open) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const sorted = useMemo(() => {
    const arr = [...items];
    arr.sort((a, b) => {
      const aw = isWorking(a.presence_status) ? 0 : 1;
      const bw = isWorking(b.presence_status) ? 0 : 1;
      if (aw !== bw) return aw - bw;
      return String(b.presence_updated_at).localeCompare(String(a.presence_updated_at));
    });
    return arr;
  }, [items]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="absolute left-1/2 top-16 w-[92vw] max-w-[520px] -translate-x-1/2">
        <div className="rounded-2xl border bg-white shadow-xl" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
            <div>
              <div className="text-sm font-semibold text-slate-900">メンバーのステータス</div>
              <div className="text-[11px] text-slate-500">作業中=緑（活性） / 離席中=グレー（非活性）</div>
            </div>

            <div className="flex items-center gap-2">
              <button className="cv-btn-secondary" onClick={load} disabled={loading}>
                更新
              </button>
              <button className="cv-btn-secondary" onClick={onClose}>
                閉じる
              </button>
            </div>
          </div>

          <div className="p-4">
            {loading ? (
              <div className="text-sm text-slate-600">読み込み中…</div>
            ) : error ? (
              <div className="text-sm text-rose-700">{error}</div>
            ) : sorted.length === 0 ? (
              <div className="text-sm text-slate-600">メンバーがいません。</div>
            ) : (
              <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                {sorted.map((m) => {
                  const working = isWorking(m.presence_status);
                  const name = (m.display_name ?? "").trim() || shortId(m.user_id);

                  return (
                    <div
                      key={m.user_id}
                      className={[
                        "py-3 flex items-center gap-3",
                        working ? "" : "opacity-50 pointer-events-none",
                      ].join(" ")}
                    >
                      {/* Avatar */}
                      <div className="relative h-10 w-10 rounded-full border-2 border-slate-200/80 bg-slate-900 text-white flex items-center justify-center text-[12px] font-semibold shadow-sm overflow-hidden shrink-0">
                        {m.avatar_url ? (
                          <Image src={m.avatar_url} alt={name} fill sizes="40px" className="object-cover" />
                        ) : (
                          <span>{initials(m.display_name)}</span>
                        )}
                      </div>

                      {/* Name and Info */}
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-semibold text-slate-900 truncate">
                          {name}
                          <span className="ml-2 text-[11px] font-normal text-slate-500">
                            ({m.role || "member"})
                          </span>
                        </div>
                        <div className="mt-1 text-[11px] text-slate-500 truncate">
                          updated: {m.presence_updated_at}
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="shrink-0">
                        <span
                          className={[
                            "rounded-full border px-2 py-1 text-[11px]",
                            working
                              ? "border-emerald-300 text-emerald-700 bg-emerald-50"
                              : "border-slate-200 text-slate-600 bg-slate-50",
                          ].join(" ")}
                        >
                          {labelStatus(m.presence_status)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-3 text-[11px] text-slate-500">
              ※ 表示名は <code className="px-1">workspace_members.display_name</code> を表示します（未設定なら user_id 短縮）。
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
