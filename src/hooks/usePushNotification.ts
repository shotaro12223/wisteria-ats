"use client";

import { useState, useEffect, useCallback } from "react";

type PushNotificationState = {
  isSupported: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission | "loading";
  error: string | null;
};

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  // Remove any whitespace
  const cleanBase64 = base64String.trim();

  // Convert base64url to base64
  let base64 = cleanBase64
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  // Add padding if needed
  const padLength = (4 - (base64.length % 4)) % 4;
  base64 += "=".repeat(padLength);

  // Decode
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export function usePushNotification() {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isSubscribed: false,
    permission: "loading",
    error: null,
  });
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(null);

  // Check support and current status
  useEffect(() => {
    async function init() {
      // Check if push is supported
      const isSupported = "serviceWorker" in navigator && "PushManager" in window;

      if (!isSupported) {
        setState({
          isSupported: false,
          isSubscribed: false,
          permission: "denied",
          error: "このブラウザはプッシュ通知に対応していません",
        });
        return;
      }

      // Get current permission
      const permission = Notification.permission;

      // Register service worker
      try {
        await navigator.serviceWorker.register("/sw.js");
      } catch (err) {
        console.error("[Push] Service worker registration failed:", err);
      }

      // Get VAPID public key from server
      let vapidKeyLoaded = false;
      try {
        const res = await fetch("/api/client/push-subscription");
        const data = await res.json();
        if (data.ok && data.data.vapidPublicKey) {
          setVapidPublicKey(data.data.vapidPublicKey);
          vapidKeyLoaded = true;
        }
      } catch (err) {
        console.error("[Push] Failed to get VAPID key:", err);
      }

      // If VAPID key is not configured, show appropriate message
      if (!vapidKeyLoaded) {
        setState({
          isSupported: true,
          isSubscribed: false,
          permission,
          error: null, // Don't show error, just disable until configured
        });
        return;
      }

      // Check if already subscribed
      let isSubscribed = false;
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        isSubscribed = subscription !== null;
      } catch (err) {
        console.error("[Push] Failed to check subscription:", err);
      }

      setState({
        isSupported: true,
        isSubscribed,
        permission,
        error: null,
      });
    }

    init();
  }, []);

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported) {
      setState((prev) => ({
        ...prev,
        error: "このブラウザはプッシュ通知に対応していません",
      }));
      return false;
    }

    if (!vapidPublicKey) {
      setState((prev) => ({
        ...prev,
        error: "通知サーバーの設定が完了していません。管理者にお問い合わせください。",
      }));
      return false;
    }

    try {
      // Request permission if not granted
      if (Notification.permission !== "granted") {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setState((prev) => ({
            ...prev,
            permission,
            error: "通知の許可が必要です",
          }));
          return false;
        }
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      });

      // Send subscription to server
      const p256dhKey = subscription.getKey("p256dh");
      const authKey = subscription.getKey("auth");

      if (!p256dhKey || !authKey) {
        throw new Error("プッシュ通知のキー取得に失敗しました");
      }

      const res = await fetch("/api/client/push-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(p256dhKey),
            auth: arrayBufferToBase64(authKey),
          },
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error?.message || "サーバーへの登録に失敗しました");
      }

      setState((prev) => ({
        ...prev,
        isSubscribed: true,
        permission: "granted",
        error: null,
      }));

      return true;
    } catch (err) {
      console.error("[Push] Subscribe failed:", err);
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "登録に失敗しました",
      }));
      return false;
    }
  }, [state.isSupported, vapidPublicKey]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from push
        await subscription.unsubscribe();

        // Remove from server
        await fetch("/api/client/push-subscription", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
      }

      setState((prev) => ({
        ...prev,
        isSubscribed: false,
        error: null,
      }));

      return true;
    } catch (err) {
      console.error("[Push] Unsubscribe failed:", err);
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "解除に失敗しました",
      }));
      return false;
    }
  }, []);

  return {
    ...state,
    subscribe,
    unsubscribe,
  };
}
