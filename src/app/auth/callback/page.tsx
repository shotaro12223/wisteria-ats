"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

function parseHashParams() {
  // "#a=1&b=2" -> URLSearchParams
  const raw = typeof window !== "undefined" ? window.location.hash : "";
  const hash = raw.startsWith("#") ? raw.slice(1) : raw;
  return new URLSearchParams(hash);
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const [msg, setMsg] = useState("認証処理中...");

  useEffect(() => {
    const supabase = supabaseBrowser();

    (async () => {
      try {
        const url = new URL(window.location.href);

        // 1) PKCE形式: /auth/callback?code=xxxx
        const code = url.searchParams.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            setMsg(`認証に失敗しました（exchangeCodeForSession）: ${error.message}`);
            return;
          }
          router.replace("/set-password");
          router.refresh();
          return;
        }

        // 2) Implicit形式: /auth/callback#access_token=...&refresh_token=...
        const hp = parseHashParams();

        // Supabaseがエラーをハッシュで返すことがある
        const hashError = hp.get("error") || hp.get("error_code");
        if (hashError) {
          const desc = hp.get("error_description") || "";
          setMsg(`認証に失敗しました: ${hashError} ${desc}`.trim());
          return;
        }

        const access_token = hp.get("access_token");
        const refresh_token = hp.get("refresh_token");

        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) {
            setMsg(`認証に失敗しました（setSession）: ${error.message}`);
            return;
          }
          router.replace("/set-password");
          router.refresh();
          return;
        }

        // 3) どちらでもない（期限切れ/スキャナ消費/別URL）
        setMsg("セッション情報が見つかりません（リンクが無効/期限切れの可能性）");
      } catch (e: any) {
        setMsg(`想定外エラー: ${e?.message ?? String(e)}`);
      }
    })();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border p-6">
        <h1 className="text-xl font-semibold">ログイン処理</h1>
        <p className="mt-2 text-sm text-slate-600">{msg}</p>
      </div>
    </div>
  );
}
