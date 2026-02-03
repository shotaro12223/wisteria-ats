"use client";

import { useState, useEffect, useCallback } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed as PWA
    const isInStandalone = window.matchMedia("(display-mode: standalone)").matches
      || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsStandalone(isInStandalone);

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
    setIsIOS(isIOSDevice);

    // For iOS: ALWAYS show banner until installed (mandatory)
    if (isIOSDevice && !isInStandalone) {
      setTimeout(() => setShowBanner(true), 1000);
      return;
    }

    // For non-iOS: Check if user has dismissed the banner before
    const dismissed = localStorage.getItem("pwa_install_dismissed");
    const dismissedDate = dismissed ? new Date(dismissed) : null;
    const daysSinceDismissed = dismissedDate
      ? (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24)
      : Infinity;

    // Don't show if already installed or dismissed recently (within 7 days)
    if (isInStandalone || daysSinceDismissed < 7) {
      return;
    }

    // Listen for beforeinstallprompt (Chrome/Edge/Samsung)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstallClick = useCallback(async () => {
    if (isIOS) {
      // Show iOS instructions modal
      setShowIOSModal(true);
      return;
    }

    if (!deferredPrompt) return;

    // Show the install prompt
    await deferredPrompt.prompt();

    // Wait for the user's choice
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setShowBanner(false);
    }

    // Clear the prompt
    setDeferredPrompt(null);
  }, [deferredPrompt, isIOS]);

  const handleDismiss = useCallback(() => {
    setShowBanner(false);
    localStorage.setItem("pwa_install_dismissed", new Date().toISOString());
  }, []);

  // Don't render if already installed or no banner to show
  if (isStandalone || !showBanner) {
    return null;
  }

  // iOS: Mandatory fixed banner at top
  if (isIOS) {
    return (
      <>
        {/* iOS Mandatory Banner - Fixed at top */}
        <div className="fixed top-16 left-0 right-0 z-40 bg-gradient-to-r from-orange-600 to-amber-600 text-white px-4 py-3 shadow-lg">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold">ホーム画面に追加してください</p>
                <p className="text-xs text-white/80">iPhoneで通知を受け取るには必須です</p>
              </div>
            </div>
            <button
              onClick={handleInstallClick}
              className="px-4 py-2 bg-white text-orange-600 text-sm font-bold rounded-lg hover:bg-orange-50 transition-colors flex-shrink-0"
            >
              手順を見る
            </button>
          </div>
        </div>

        {/* iOS Instructions Modal */}
        {showIOSModal && (
          <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-slideUp sm:animate-slideDown">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">
                    ホーム画面に追加
                  </h3>
                  <button
                    onClick={() => setShowIOSModal(false)}
                    className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="p-3 bg-orange-50 rounded-xl mb-4">
                  <p className="text-sm text-orange-800 font-medium">
                    iPhoneで通知を受け取るには、ホーム画面への追加が必須です。
                  </p>
                </div>

                <p className="text-[14px] text-slate-600 mb-6">
                  以下の手順で追加してください。
                </p>

                <div className="space-y-4">
                  {/* Step 1 */}
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-[14px] font-bold text-indigo-600">1</span>
                    </div>
                    <div className="flex-1 pt-1">
                      <p className="text-[14px] text-slate-700">
                        画面下部の
                        <span className="inline-flex items-center mx-1 px-2 py-0.5 bg-slate-100 rounded">
                          <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15m0-3l-3-3m0 0l-3 3m3-3V15" />
                          </svg>
                        </span>
                        共有ボタンをタップ
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-[14px] font-bold text-indigo-600">2</span>
                    </div>
                    <div className="flex-1 pt-1">
                      <p className="text-[14px] text-slate-700">
                        メニューをスクロールして
                        <span className="inline-flex items-center mx-1 px-2 py-0.5 bg-slate-100 rounded font-medium">
                          ホーム画面に追加
                        </span>
                        をタップ
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-[14px] font-bold text-indigo-600">3</span>
                    </div>
                    <div className="flex-1 pt-1">
                      <p className="text-[14px] text-slate-700">
                        右上の
                        <span className="inline-flex items-center mx-1 px-2 py-0.5 bg-slate-100 rounded font-medium">
                          追加
                        </span>
                        をタップして完了
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-amber-50 rounded-xl">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    <p className="text-[13px] text-amber-800">
                      Safariブラウザでのみホーム画面に追加できます。Chrome等をお使いの場合はSafariでこのページを開いてください。
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
                <button
                  onClick={() => setShowIOSModal(false)}
                  className="w-full px-4 py-3 text-[14px] font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        )}

        <style jsx global>{`
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-slideUp {
            animation: slideUp 0.3s ease-out;
          }
        `}</style>
      </>
    );
  }

  // Non-iOS: Original dismissible banner
  return (
    <>
      {/* Install Banner */}
      <div className="fixed bottom-4 left-4 right-4 z-50 animate-slideUp sm:left-auto sm:right-6 sm:max-w-sm">
        <div className="bg-white rounded-2xl shadow-2xl shadow-slate-900/10 border border-slate-200 overflow-hidden">
          <div className="p-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[15px] font-semibold text-slate-900">
                  アプリをインストール
                </h3>
                <p className="text-[13px] text-slate-500 mt-0.5">
                  ホーム画面に追加してすぐにアクセス。通知も受け取れます。
                </p>
              </div>
              <button
                onClick={handleDismiss}
                className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors -mt-1 -mr-1"
              >
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <div className="flex border-t border-slate-100">
            <button
              onClick={handleDismiss}
              className="flex-1 px-4 py-3 text-[13px] font-medium text-slate-500 hover:bg-slate-50 transition-colors"
            >
              後で
            </button>
            <button
              onClick={handleInstallClick}
              className="flex-1 px-4 py-3 text-[13px] font-semibold text-indigo-600 hover:bg-indigo-50 border-l border-slate-100 transition-colors"
            >
              インストール
            </button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
