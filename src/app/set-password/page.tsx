"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function SetPasswordPage() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [displayName, setDisplayName] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);

    const name = displayName.trim();
    if (!name) return setErr("表示名を入力してください");
    if (pw.length < 8) return setErr("パスワードは8文字以上にしてください");
    if (pw !== pw2) return setErr("パスワードが一致しません");

    setLoading(true);
    try {
      // 1) パスワード確定（既存の流れを維持）
      const { error } = await supabase.auth.updateUser({
        password: pw,
        data: { must_set_password: false },
      });
      if (error) return setErr(error.message);

      // 2) 表示名を workspace_members に保存
      const res = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName: name }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        return setErr(json?.error ?? `表示名の保存に失敗しました (HTTP ${res.status})`);
      }

      // 3) サインアウトしてログイン画面へ（既存の流れを維持）
      await supabase.auth.signOut();

      setMsg("初期設定が完了しました。ログイン画面へ移動します。");
      router.replace("/login");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md border rounded-xl p-6">
        <h1 className="text-xl font-semibold">初期設定</h1>
        <p className="text-sm text-gray-500 mt-1">
          招待されたアカウントは初回だけ「表示名」と「パスワード」の設定が必要です。
        </p>

        <form onSubmit={submit} className="mt-4 space-y-3">
          <div>
            <label className="block text-sm mb-1">表示名</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              placeholder="例）山田 太郎"
              autoComplete="name"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">新しいパスワード</label>
            <input
              className="w-full border rounded px-3 py-2"
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">新しいパスワード（確認）</label>
            <input
              className="w-full border rounded px-3 py-2"
              type="password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>

          <button className="w-full border rounded py-2 font-semibold" disabled={loading}>
            {loading ? "設定中..." : "設定する"}
          </button>

          {msg ? <p className="text-sm text-green-600">{msg}</p> : null}
          {err ? <p className="text-sm text-red-600">{err}</p> : null}
        </form>
      </div>
    </div>
  );
}
