"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function ClientLoginPage() {
  const router = useRouter();

  const supabase = useMemo(() => supabaseBrowser(), []);

  const [nextPath, setNextPath] = useState("/client/dashboard");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      setNextPath(sp.get("next") || "/client/dashboard");
    } catch {
      setNextPath("/client/dashboard");
    }
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    try {
      if (!email || !password) {
        setMsg("メールアドレスとパスワードを入力してください。");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMsg(`ログイン失敗: ${error.message}`);
        return;
      }

      // Get current user
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData.user) {
        setMsg(`ユーザー取得エラー: ${userError?.message || "Unknown"}`);
        return;
      }

      console.log("[DEBUG] Current user ID:", userData.user.id);

      // Verify user is a client user
      const { data: clientUser, error: clientUserError } = await supabase
        .from("client_users")
        .select("id, company_id, is_active")
        .eq("user_id", userData.user.id)
        .single();

      console.log("[DEBUG] Client user lookup:", { clientUser, error: clientUserError });

      if (clientUserError) {
        setMsg(`クライアントユーザー取得エラー: ${clientUserError.message}\nuser_id: ${userData.user.id}`);
        await supabase.auth.signOut();
        return;
      }

      if (!clientUser) {
        setMsg("企業ユーザーとして登録されていません。管理者にお問い合わせください。");
        await supabase.auth.signOut();
        return;
      }

      if (!clientUser.is_active) {
        setMsg("アカウントが無効化されています。管理者にお問い合わせください。");
        await supabase.auth.signOut();
        return;
      }

      router.replace(nextPath);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 overflow-auto bg-gradient-to-br from-sky-900 via-cyan-800 to-teal-900">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-sky-500/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-teal-500/20 rounded-full blur-3xl"></div>
      </div>

      {/* Grid Pattern Overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "50px 50px",
        }}
      ></div>

      {/* Main Content */}
      <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md">
          {/* Logo / Branding */}
          <div className="text-center mb-8 animate-fade-in">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 mb-6 shadow-2xl">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 tracking-tight">Wisteria ATS</h1>
            <p className="text-sky-200 text-sm sm:text-base">企業向け採用管理ポータル</p>
          </div>

          {/* Login Form */}
          <div className="relative backdrop-blur-xl bg-white/95 rounded-2xl shadow-2xl p-8 sm:p-10 border border-white/20">
            {/* Decorative Corner Elements */}
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-sky-500/10 to-transparent rounded-2xl"></div>
            <div className="absolute bottom-0 left-0 w-20 h-20 bg-gradient-to-tr from-cyan-500/10 to-transparent rounded-2xl"></div>

            <div className="relative">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">ログイン</h2>
              <p className="text-sm text-slate-600 mb-8">企業アカウントでログインしてください</p>

              <form className="space-y-6" onSubmit={onSubmit}>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2.5">
                    メールアドレス
                  </label>
                  <input
                    className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3.5 text-slate-800 placeholder-slate-400 transition-all duration-200 focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/10 hover:border-slate-300"
                    type="email"
                    placeholder="your.email@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2.5">
                    パスワード
                  </label>
                  <input
                    className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3.5 text-slate-800 placeholder-slate-400 transition-all duration-200 focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/10 hover:border-slate-300"
                    type="password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </div>

                {msg ? (
                  <div className="rounded-xl bg-red-50 border-2 border-red-200 px-4 py-3.5 text-sm text-red-700 flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>{msg}</span>
                  </div>
                ) : null}

                <button
                  disabled={loading}
                  className="w-full rounded-xl bg-gradient-to-r from-sky-500 via-cyan-500 to-teal-500 px-6 py-4 font-bold text-white shadow-xl shadow-sky-500/30 transition-all duration-200 hover:shadow-2xl hover:shadow-sky-500/40 hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  type="submit"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-3">
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      処理中...
                    </span>
                  ) : (
                    "ログイン"
                  )}
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-slate-200">
                <p className="text-xs text-slate-500 text-center leading-relaxed">
                  アカウントがない場合は、
                  <br />
                  Wisteriaの担当者にお問い合わせください
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="text-xs text-sky-200/80 text-center mt-8">© 2026 Wisteria ATS. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
