"use client";

import { useState } from "react";

export default function InviteForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setOkMsg(null);
    setErrMsg(null);

    const v = email.trim().toLowerCase();
    if (!v || !v.includes("@")) {
      setErrMsg("メールアドレスが不正です");
      return;
    }

    if (!password || password.length < 6) {
      setErrMsg("パスワードは6文字以上で入力してください");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: v,
          password,
          displayName: displayName || v,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        setErrMsg(json?.error?.message || json?.error || res.statusText || "作成に失敗しました");
        return;
      }

      setOkMsg(`ユーザーを作成しました: ${v} (パスワード: ${password})`);
      setEmail("");
      setPassword("");
      setDisplayName("");
    } catch (e: any) {
      setErrMsg(e?.message ?? "通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 space-y-2">
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="block text-sm mb-1 text-slate-700 dark:text-slate-300">メールアドレス</label>
          <input
            className="w-full rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            required
          />
        </div>

        <div>
          <label className="block text-sm mb-1 text-slate-700 dark:text-slate-300">パスワード</label>
          <input
            className="w-full rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="6文字以上"
            required
            minLength={6}
          />
        </div>

        <div>
          <label className="block text-sm mb-1 text-slate-700 dark:text-slate-300">表示名（任意）</label>
          <input
            className="w-full rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="未入力の場合はメールアドレスを使用"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50"
        >
          {loading ? "作成中..." : "作成"}
        </button>
      </form>

      {okMsg ? <p className="text-sm text-green-600 dark:text-green-400 mt-2">{okMsg}</p> : null}
      {errMsg ? <p className="text-sm text-red-600 dark:text-red-400 mt-2">失敗: {errMsg}</p> : null}
    </div>
  );
}
