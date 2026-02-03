"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type ChatRoom = {
  id: string;
  name: string;
  createdBy: string | null;
  createdAt: string;
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("ja-JP");
}

export default function ChatPageClient() {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string>("");

  const canCreate = useMemo(() => newName.trim().length > 0, [newName]);

  async function loadRooms() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/chat/rooms", { cache: "no-store" });
      const json = await res.json();

      if (!res.ok || !json?.ok) {
        setRooms([]);
        setError(json?.error?.message ?? `Failed to load rooms (${res.status})`);
        return;
      }

      setRooms((json.rooms ?? []) as ChatRoom[]);
    } catch (e: any) {
      setRooms([]);
      setError(e?.message ?? "Failed to load rooms");
    } finally {
      setLoading(false);
    }
  }

  async function createRoom() {
    const name = newName.trim();
    if (!name || creating) return;

    setCreating(true);
    setError("");

    try {
      const res = await fetch("/api/chat/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();

      if (!res.ok || !json?.ok) {
        setError(json?.error?.message ?? `Failed to create room (${res.status})`);
        return;
      }

      // API が { room } を返す想定（返ってこない場合もあるので fallback）
      const created: ChatRoom | null = (json.room as ChatRoom) ?? null;

      if (created?.id) {
        setRooms((prev) => [created, ...prev]);
      } else {
        // 念のため再読み込み
        await loadRooms();
      }

      setNewName("");
    } catch (e: any) {
      setError(e?.message ?? "Failed to create room");
    } finally {
      setCreating(false);
    }
  }

  useEffect(() => {
    loadRooms();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-slate-900">チャット</h1>
          <p className="mt-1 text-sm text-slate-600">
            チャットルームを作成・管理します
          </p>
        </div>

        <button
          onClick={loadRooms}
          disabled={loading}
          className="rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-[var(--surface-hover)] transition disabled:opacity-60"
          style={{ borderColor: "var(--border)" }}
        >
          更新
        </button>
      </div>

      {/* Create */}
      <div
        className="rounded-2xl border bg-white p-4 space-y-3"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="text-sm font-semibold text-slate-900">新しいチャットルーム</div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") createRoom();
            }}
            placeholder="例：営業チーム / 採用MTG"
            className="flex-1 rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
            style={{ borderColor: "var(--border)" }}
            disabled={creating}
          />
          <button
            onClick={createRoom}
            disabled={!canCreate || creating}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {creating ? "作成中..." : "作成"}
          </button>
        </div>

        {error ? (
          <div
            className="rounded-xl border bg-[rgba(239,68,68,0.06)] p-3 text-sm text-red-700"
            style={{ borderColor: "rgba(239,68,68,0.25)" }}
          >
            {error}
          </div>
        ) : null}
      </div>

      {/* List */}
      <div className="space-y-2">
        <div className="text-sm font-semibold text-slate-900">チャットルーム一覧</div>

        {loading ? (
          <div className="text-sm text-slate-500">読み込み中…</div>
        ) : rooms.length === 0 ? (
          <div
            className="rounded-2xl border bg-white p-4 text-sm text-slate-500"
            style={{ borderColor: "var(--border)" }}
          >
            まだチャットルームがありません
          </div>
        ) : (
          <div className="grid gap-2">
            {rooms.map((r) => (
              <Link
                key={r.id}
                href={`/chat/${r.id}`}
                className="block rounded-2xl border bg-white px-4 py-3 hover:bg-[var(--surface-hover)] transition"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">
                      {r.name}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500 truncate">
                      作成日：{fmtDate(r.createdAt)}
                    </div>
                  </div>
                  <div className="text-slate-400 text-sm">→</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="text-[11px] text-slate-500">
        次：/chat/[id] にメッセージ一覧・送信フォームを実装
      </div>
    </div>
  );
}
