"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import ClientPortalLayout from "@/components/client/ClientPortalLayout";
import { usePushNotification } from "@/hooks/usePushNotification";
import { useTheme } from "@/contexts/ThemeContext";

type ClientUser = {
  user_id: string;
  company_id: string;
  email: string;
  is_active: boolean;
  created_at: string;
};

type Company = {
  id: string;
  company_name: string;
  company_name_kana: string | null;
  created_at: string;
};

export default function ClientSettingsPage() {
  const pathname = usePathname();
  const adminCompanyId = pathname?.match(/^\/client\/companies\/([^/]+)/)?.[1] ?? null;
  const isReadOnly = !!adminCompanyId;

  const [clientUser, setClientUser] = useState<ClientUser | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordChanging, setPasswordChanging] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Push notification state
  const {
    isSupported: pushSupported,
    isSubscribed: pushSubscribed,
    permission: pushPermission,
    error: pushError,
    subscribe: subscribePush,
    unsubscribe: unsubscribePush,
  } = usePushNotification();
  const [pushLoading, setPushLoading] = useState(false);

  // Theme state
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      try {
        if (adminCompanyId) {
          // Admin mode: just fetch company info directly
          const companyRes = await fetch(`/api/client/companies/${adminCompanyId}`, {
            cache: "no-store",
          });
          if (companyRes.ok) {
            const companyData = await companyRes.json();
            if (companyData.ok) {
              setCompany(companyData.data);
            }
          }
        } else {
          // Fetch client user info
          const userRes = await fetch("/api/client/me", { cache: "no-store" });
          if (userRes.ok) {
            const userData = await userRes.json();
            if (userData.ok && userData.data) {
              setClientUser(userData.data);

              // Fetch company info
              const companyRes = await fetch(`/api/client/companies/${userData.data.company_id}`, {
                cache: "no-store",
              });
              if (companyRes.ok) {
                const companyData = await companyRes.json();
                if (companyData.ok) {
                  setCompany(companyData.data);
                }
              }
            }
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [adminCompanyId]);

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (isReadOnly) return;
    setPasswordChanging(true);
    setPasswordMessage(null);

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage({
        type: "error",
        text: "新しいパスワードが一致しません",
      });
      setPasswordChanging(false);
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordMessage({
        type: "error",
        text: "パスワードは6文字以上で入力してください",
      });
      setPasswordChanging(false);
      return;
    }

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setPasswordMessage({
      type: "success",
      text: "パスワードを変更しました",
    });
    setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setPasswordChanging(false);

    // Clear success message after 3 seconds
    setTimeout(() => {
      setPasswordMessage(null);
    }, 3000);
  }

  if (loading) {
    return (
      <ClientPortalLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-slate-600 dark:text-slate-300">読み込み中...</div>
        </div>
      </ClientPortalLayout>
    );
  }

  return (
    <ClientPortalLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">設定</h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1">アカウント情報と設定</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Settings */}
          <div className="lg:col-span-2 space-y-6">
            {/* Account Info */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/60 p-6 shadow-sm">
              <h2 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100 mb-5 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                  <svg className="w-4 h-4 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                アカウント情報
              </h2>

              <div className="space-y-4">
                <div>
                  <h3 className="text-[12px] font-medium text-slate-500 dark:text-slate-400 mb-1">メールアドレス</h3>
                  <p className="text-[13px] text-slate-900 dark:text-slate-100">{clientUser?.email || "-"}</p>
                </div>

                <div>
                  <h3 className="text-[12px] font-medium text-slate-500 dark:text-slate-400 mb-1">アカウント作成日</h3>
                  <p className="text-[13px] text-slate-900 dark:text-slate-100">
                    {clientUser?.created_at
                      ? new Date(clientUser.created_at).toLocaleDateString("ja-JP", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "-"}
                  </p>
                </div>

                <div>
                  <h3 className="text-[12px] font-medium text-slate-500 dark:text-slate-400 mb-1">ステータス</h3>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                      clientUser?.is_active
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {clientUser?.is_active ? "有効" : "無効"}
                  </span>
                </div>
              </div>
            </div>

            {/* Company Info */}
            {company && (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/60 p-6 shadow-sm">
                <h2 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100 mb-5 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  企業情報
                </h2>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-[12px] font-medium text-slate-500 dark:text-slate-400 mb-1">企業名</h3>
                    <p className="text-[13px] text-slate-900 dark:text-slate-100">{company.company_name}</p>
                  </div>

                  {company.company_name_kana && (
                    <div>
                      <h3 className="text-[12px] font-medium text-slate-500 dark:text-slate-400 mb-1">企業名（カナ）</h3>
                      <p className="text-[13px] text-slate-900 dark:text-slate-100">{company.company_name_kana}</p>
                    </div>
                  )}

                  <div>
                    <h3 className="text-[12px] font-medium text-slate-500 dark:text-slate-400 mb-1">登録日</h3>
                    <p className="text-[13px] text-slate-900 dark:text-slate-100">
                      {new Date(company.created_at).toLocaleDateString("ja-JP", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Password Change - hidden for admin read-only */}
            {!isReadOnly && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/60 p-6 shadow-sm">
              <h2 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100 mb-5 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                  <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                パスワード変更
              </h2>

              {passwordMessage && (
                <div
                  className={`mb-5 rounded-lg border p-3 ${
                    passwordMessage.type === "success"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : "bg-rose-50 border-rose-200 text-rose-700"
                  }`}
                >
                  <p className="text-[13px] font-medium">{passwordMessage.text}</p>
                </div>
              )}

              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-[12px] font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                    現在のパスワード
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordData.currentPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, currentPassword: e.target.value })
                    }
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[13px] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                    新しいパスワード
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[13px] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
                    placeholder="6文字以上"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                    新しいパスワード（確認）
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordData.confirmPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                    }
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[13px] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={passwordChanging}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900 text-white text-[13px] font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  {passwordChanging ? "変更中..." : "パスワードを変更"}
                </button>
              </form>
            </div>
            )}

            {/* Push Notifications - hidden for admin read-only */}
            {!isReadOnly && <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/60 p-6 shadow-sm">
              <h2 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100 mb-5 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                  <svg className="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                  </svg>
                </div>
                プッシュ通知
              </h2>

              <div className="space-y-4">
                {!pushSupported ? (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <p className="text-[12px] text-slate-600 dark:text-slate-300">
                      このブラウザはプッシュ通知に対応していません。
                    </p>
                  </div>
                ) : pushPermission === "loading" ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-slate-300 border-t-indigo-500 rounded-full animate-spin"></div>
                    <span className="text-[12px] text-slate-600 dark:text-slate-300">読み込み中...</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-2.5 h-2.5 rounded-full ${pushSubscribed ? "bg-emerald-500" : "bg-slate-300"}`}></div>
                        <div>
                          <p className="text-[13px] font-medium text-slate-800">
                            通知ステータス
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {pushSubscribed
                              ? "プッシュ通知が有効です"
                              : pushPermission === "denied"
                              ? "ブラウザの設定で通知がブロックされています"
                              : "プッシュ通知が無効です"}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          setPushLoading(true);
                          if (pushSubscribed) {
                            await unsubscribePush();
                          } else {
                            await subscribePush();
                          }
                          setPushLoading(false);
                        }}
                        disabled={pushLoading || pushPermission === "denied"}
                        className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all disabled:opacity-50 ${
                          pushSubscribed
                            ? "bg-white border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:bg-slate-700"
                            : "bg-indigo-600 text-white hover:bg-indigo-700"
                        }`}
                      >
                        {pushLoading
                          ? "処理中..."
                          : pushSubscribed
                          ? "無効にする"
                          : "有効にする"}
                      </button>
                    </div>

                    {pushError && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                        <p className="text-[12px] text-rose-700">{pushError}</p>
                      </div>
                    )}

                    {pushPermission === "denied" && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-start gap-2.5">
                          <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <div>
                            <p className="text-[12px] font-medium text-amber-800">通知がブロックされています</p>
                            <p className="text-[11px] text-amber-700 mt-0.5">
                              ブラウザの設定から通知を許可してください。
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-800/40 rounded-lg">
                      <h4 className="text-[12px] font-medium text-indigo-800 dark:text-indigo-300 mb-1.5">通知を受け取る内容</h4>
                      <ul className="space-y-1 text-[11px] text-indigo-700 dark:text-indigo-400">
                        <li className="flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          新規応募者のお知らせ
                        </li>
                        <li className="flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          応募者ステータスの更新
                        </li>
                        <li className="flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          打ち合わせ候補日のお知らせ
                        </li>
                      </ul>
                    </div>
                  </>
                )}
              </div>
            </div>}

            {/* Theme Settings - hidden for admin read-only */}
            {!isReadOnly && <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/60 p-6 shadow-sm">
              <h2 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100 mb-5 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                  <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                </div>
                テーマ設定
              </h2>

              <div className="space-y-4">
                <p className="text-[12px] text-slate-500 dark:text-slate-400">
                  お好みの外観を選択してください
                </p>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setTheme("light")}
                    className={`p-3 rounded-lg border transition-all ${
                      theme === "light"
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1.5">
                      <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <span className={`text-[12px] font-medium ${theme === "light" ? "text-indigo-700" : "text-slate-700 dark:text-slate-200"}`}>
                        ライト
                      </span>
                    </div>
                  </button>

                  <button
                    onClick={() => setTheme("dark")}
                    className={`p-3 rounded-lg border transition-all ${
                      theme === "dark"
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1.5">
                      <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                      </svg>
                      <span className={`text-[12px] font-medium ${theme === "dark" ? "text-indigo-700" : "text-slate-700 dark:text-slate-200"}`}>
                        ダーク
                      </span>
                    </div>
                  </button>

                  <button
                    onClick={() => setTheme("system")}
                    className={`p-3 rounded-lg border transition-all ${
                      theme === "system"
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1.5">
                      <svg className="w-5 h-5 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span className={`text-[12px] font-medium ${theme === "system" ? "text-indigo-700" : "text-slate-700 dark:text-slate-200"}`}>
                        システム
                      </span>
                    </div>
                  </button>
                </div>

                <p className="text-[11px] text-slate-400">
                  「システム」を選択すると、端末の設定に合わせて自動で切り替わります
                </p>
              </div>
            </div>}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Security Info */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/60 p-5 shadow-sm">
              <h3 className="text-[14px] font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                セキュリティ
              </h3>
              <p className="text-[12px] text-slate-600 dark:text-slate-300 leading-relaxed">
                定期的なパスワード変更をお勧めします。パスワードは他人と共有しないでください。
              </p>
            </div>

            {/* Help */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/60 p-5 shadow-sm">
              <h3 className="text-[14px] font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                ヘルプ
              </h3>
              <p className="text-[12px] text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                設定に関するご質問は、サポートページからお問い合わせください。
              </p>
              <a
                href="/client/support"
                className="block w-full text-center px-4 py-2 rounded-lg bg-slate-900 text-white text-[13px] font-medium hover:bg-slate-800 transition-colors"
              >
                サポートへ
              </a>
            </div>
          </div>
        </div>
      </div>
    </ClientPortalLayout>
  );
}
