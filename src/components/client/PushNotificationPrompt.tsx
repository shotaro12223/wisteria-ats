"use client";

import { useState, useEffect } from "react";
import { usePushNotification } from "@/hooks/usePushNotification";

export default function PushNotificationPrompt() {
  const {
    isSupported,
    isSubscribed,
    permission,
    subscribe,
  } = usePushNotification();

  const [showPrompt, setShowPrompt] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Show prompt if:
    // - Push is supported
    // - Not already subscribed
    // - Permission is not denied (blocked by browser)
    // - Finished loading
    if (isSupported && !isSubscribed && permission !== "denied" && permission !== "loading") {
      setShowPrompt(true);
    } else if (isSubscribed) {
      setShowPrompt(false);
    }
  }, [isSupported, isSubscribed, permission]);

  const handleEnable = async () => {
    setLoading(true);
    const success = await subscribe();
    setLoading(false);
    if (success) {
      setShowPrompt(false);
    }
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-rose-600 to-pink-600 text-white px-4 py-3 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 animate-pulse">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold">必ず通知を有効にしてください</p>
            <p className="text-xs text-white/90 hidden sm:block">
              新着応募や重要なお知らせをリアルタイムで受け取れます
            </p>
          </div>
        </div>
        <button
          onClick={handleEnable}
          disabled={loading}
          className="px-5 py-2 text-sm font-bold bg-white text-rose-600 rounded-lg hover:bg-white/90 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-rose-300 border-t-rose-600 rounded-full animate-spin"></div>
              設定中...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              通知を有効にする
            </>
          )}
        </button>
      </div>
    </div>
  );
}
