"use client";

import { useEffect, useMemo, useState } from "react";

type Member = {
  user_id: string;
  role: string;
  created_at: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export default function MembersTable() {
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  // State for editing display name
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editDisplayName, setEditDisplayName] = useState("");

  // State for password change modal
  const [changingPasswordUserId, setChangingPasswordUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function reload() {
    setMsg(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/members", { method: "GET" });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) {
        setMsg(`取得失敗: ${j?.error ?? res.statusText}`);
        return;
      }
      setMembers(j.members ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  const sorted = useMemo(() => members, [members]);

  async function updateRole(user_id: string, role: "admin" | "member") {
    setMsg(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/members", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ user_id, role }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) {
        setMsg(`更新失敗: ${j?.error ?? res.statusText}`);
        return;
      }
      await reload();
    } finally {
      setLoading(false);
    }
  }

  async function updateDisplayName(user_id: string, display_name: string) {
    setMsg(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/members", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ user_id, display_name }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) {
        setMsg(`名前更新失敗: ${j?.error ?? res.statusText}`);
        return;
      }
      setEditingUserId(null);
      setEditDisplayName("");
      await reload();
    } finally {
      setLoading(false);
    }
  }

  async function changePassword(user_id: string, new_password: string) {
    if (new_password.length < 6) {
      setMsg("パスワードは6文字以上で入力してください");
      return;
    }

    setMsg(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/members/change-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ user_id, new_password }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) {
        setMsg(`パスワード変更失敗: ${j?.error ?? res.statusText}`);
        return;
      }
      setChangingPasswordUserId(null);
      setNewPassword("");
      setConfirmPassword("");
      setMsg(`✅ パスワードを変更しました`);
    } finally {
      setLoading(false);
    }
  }

  async function removeAccess(user_id: string) {
    if (!confirm("このユーザーのアクセス権を削除します（workspace_members から削除）。よろしいですか？")) return;

    setMsg(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/members?user_id=${encodeURIComponent(user_id)}`, {
        method: "DELETE",
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) {
        setMsg(`削除失敗: ${j?.error ?? res.statusText}`);
        return;
      }
      await reload();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">メンバー管理</h2>
        <button className="rounded-md border px-3 py-2" disabled={loading} onClick={reload}>
          {loading ? "更新中..." : "再読み込み"}
        </button>
      </div>

      {msg ? (
        <p
          className={`text-sm mt-2 ${
            msg.startsWith("✅") ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          }`}
        >
          {msg}
        </p>
      ) : null}

      <div className="mt-3 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-300 dark:border-slate-600">
              <th className="text-left py-2 pr-3">メールアドレス</th>
              <th className="text-left py-2 pr-3">表示名</th>
              <th className="text-left py-2 pr-3">権限</th>
              <th className="text-left py-2 pr-3">作成日</th>
              <th className="text-right py-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((m) => (
              <tr key={m.user_id} className="border-b border-slate-200 dark:border-slate-700">
                <td className="py-2 pr-3">
                  {m.email ?? <span className="text-gray-400 dark:text-gray-500">(unknown)</span>}
                </td>
                <td className="py-2 pr-3">
                  {editingUserId === m.user_id ? (
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        className="rounded-md border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-2 py-1 text-sm flex-1"
                        value={editDisplayName}
                        onChange={(e) => setEditDisplayName(e.target.value)}
                        placeholder="表示名"
                        disabled={loading}
                      />
                      <button
                        className="text-xs px-2 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                        disabled={loading}
                        onClick={() => updateDisplayName(m.user_id, editDisplayName)}
                      >
                        保存
                      </button>
                      <button
                        className="text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50"
                        disabled={loading}
                        onClick={() => {
                          setEditingUserId(null);
                          setEditDisplayName("");
                        }}
                      >
                        キャンセル
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2 items-center">
                      <span>{m.display_name || <span className="text-gray-400 dark:text-gray-500">(未設定)</span>}</span>
                      <button
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                        onClick={() => {
                          setEditingUserId(m.user_id);
                          setEditDisplayName(m.display_name ?? "");
                        }}
                      >
                        編集
                      </button>
                    </div>
                  )}
                </td>
                <td className="py-2 pr-3">
                  <select
                    className="rounded-md border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-2 py-1"
                    value={m.role}
                    disabled={loading}
                    onChange={(e) => updateRole(m.user_id, (e.target.value as any) === "admin" ? "admin" : "member")}
                  >
                    <option value="member">member</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td className="py-2 pr-3">{new Date(m.created_at).toLocaleString()}</td>
                <td className="py-2 text-right">
                  <div className="flex gap-2 justify-end">
                    <button
                      className="text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50"
                      disabled={loading}
                      onClick={() => {
                        setChangingPasswordUserId(m.user_id);
                        setNewPassword("");
                        setConfirmPassword("");
                      }}
                    >
                      パスワード変更
                    </button>
                    <button
                      className="text-xs px-2 py-1 rounded border border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                      disabled={loading}
                      onClick={() => removeAccess(m.user_id)}
                    >
                      削除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!sorted.length ? (
              <tr>
                <td className="py-3 text-gray-500 dark:text-gray-400" colSpan={5}>
                  メンバーがいません
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
        「削除」は Supabase Auth のユーザー削除ではなく、workspace_members から外すだけです（安全）。
      </p>

      {/* Password Change Modal */}
      {changingPasswordUserId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => {
            setChangingPasswordUserId(null);
            setNewPassword("");
            setConfirmPassword("");
          }}
        >
          <div
            className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">パスワード変更</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              ユーザー:{" "}
              <span className="font-mono text-xs">
                {sorted.find((m) => m.user_id === changingPasswordUserId)?.email ?? changingPasswordUserId}
              </span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  新しいパスワード
                </label>
                <input
                  type="password"
                  className="w-full rounded-md border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="6文字以上"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  パスワード確認
                </label>
                <input
                  type="password"
                  className="w-full rounded-md border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="もう一度入力"
                  disabled={loading}
                />
              </div>

              {newPassword !== confirmPassword && confirmPassword.length > 0 && (
                <p className="text-sm text-red-600 dark:text-red-400">パスワードが一致しません</p>
              )}
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                className="px-4 py-2 rounded-md border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50"
                disabled={loading}
                onClick={() => {
                  setChangingPasswordUserId(null);
                  setNewPassword("");
                  setConfirmPassword("");
                }}
              >
                キャンセル
              </button>
              <button
                className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                disabled={loading || newPassword !== confirmPassword || newPassword.length < 6}
                onClick={() => {
                  if (changingPasswordUserId) {
                    changePassword(changingPasswordUserId, newPassword);
                  }
                }}
              >
                {loading ? "変更中..." : "パスワード変更"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
