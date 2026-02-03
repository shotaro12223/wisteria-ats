"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function LoginPage() {
  const router = useRouter();

  const supabase = useMemo(() => supabaseBrowser(), []);

  const [nextPath, setNextPath] = useState("/");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      setNextPath(sp.get("next") || "/");
    } catch {
      setNextPath("/");
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

      router.replace(nextPath);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 overflow-auto bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }}></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }}></div>
      </div>

      {/* Subtle Grid Pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
        }}
      ></div>

      {/* Main Content */}
      <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md">
          {/* Logo / Branding */}
          <div className="text-center mb-10 animate-fade-in">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 backdrop-blur-xl border border-white/10 mb-6 shadow-2xl shadow-indigo-500/20 relative overflow-hidden">
              {/* Animated gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-400/20 via-purple-400/20 to-violet-400/20 animate-pulse"></div>
              <svg className="w-12 h-12 text-indigo-300 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3 tracking-tight bg-gradient-to-r from-white via-indigo-200 to-purple-200 bg-clip-text text-transparent">
              Wisteria ATS
            </h1>
            <p className="text-indigo-300/80 text-sm sm:text-base font-medium">管理者ポータル</p>
          </div>

          {/* Login Form */}
          <div className="relative backdrop-blur-2xl bg-white/5 rounded-3xl shadow-2xl p-8 sm:p-10 border border-white/10">
            {/* Shimmer effect on border */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer"></div>

            {/* Decorative Corner Elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-purple-500/10 to-transparent rounded-3xl pointer-events-none"></div>

            <div className="relative">
              <h2 className="text-2xl font-bold text-white mb-2">ログイン</h2>
              <p className="text-sm text-indigo-300/70 mb-8">内部管理システムにアクセス</p>

              <form className="space-y-6" onSubmit={onSubmit}>
                {/* Email Input */}
                <div>
                  <label className="block text-sm font-semibold text-indigo-200/90 mb-2.5">
                    メールアドレス
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-indigo-400/50 group-focus-within:text-indigo-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                      </svg>
                    </div>
                    <input
                      className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-white/10 bg-white/5 text-white placeholder-indigo-400/40 transition-all duration-200 focus:border-indigo-500/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 hover:border-white/20 backdrop-blur-sm"
                      type="email"
                      placeholder="admin@wisteria.app"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <label className="block text-sm font-semibold text-indigo-200/90 mb-2.5">
                    パスワード
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-indigo-400/50 group-focus-within:text-indigo-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <input
                      className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-white/10 bg-white/5 text-white placeholder-indigo-400/40 transition-all duration-200 focus:border-indigo-500/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 hover:border-white/20 backdrop-blur-sm"
                      type="password"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                    />
                  </div>
                </div>

                {/* Error Message */}
                {msg && (
                  <div className="rounded-xl bg-red-500/10 border-2 border-red-500/30 px-4 py-3.5 text-sm text-red-300 flex items-start gap-3 backdrop-blur-sm">
                    <svg
                      className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"
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
                )}

                {/* Submit Button */}
                <button
                  disabled={loading}
                  className="relative w-full rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600 px-6 py-4 font-bold text-white shadow-xl shadow-indigo-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/50 hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none group overflow-hidden"
                  type="submit"
                >
                  {/* Animated gradient overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                  <span className="relative z-10">
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
                        認証中...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        ログイン
                        <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </span>
                    )}
                  </span>
                </button>
              </form>

              {/* Footer */}
              <div className="mt-8 pt-6 border-t border-white/10">
                <p className="text-xs text-indigo-300/50 text-center leading-relaxed">
                  内部スタッフ専用システム
                  <br />
                  アカウント発行は管理者にお問い合わせください
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Info */}
          <div className="mt-8 text-center space-y-2">
            <p className="text-xs text-indigo-300/40">© 2026 Wisteria ATS. All rights reserved.</p>
            <p className="text-xs text-indigo-400/30">Powered by Next.js & Supabase</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 3s infinite;
        }
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
      `}</style>
    </div>
  );
}
