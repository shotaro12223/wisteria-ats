"use client";

import { useEffect, useState, useCallback } from "react";
import type { ReactElement } from "react";
import { useRouter } from "next/navigation";
import ClientPortalLayout from "@/components/client/ClientPortalLayout";

type Notification = {
  id: string;
  title: string;
  body: string;
  url: string | null;
  type: string;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
};

const TYPE_ICONS: Record<string, { icon: ReactElement; color: string }> = {
  applicant: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    color: "from-sky-500 to-cyan-500",
  },
  interview: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    color: "from-purple-500 to-pink-500",
  },
  system: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: "from-slate-500 to-slate-600",
  },
  info: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
    color: "from-amber-500 to-orange-500",
  },
};

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (filter === "unread") {
        params.set("unread", "true");
      }
      const res = await fetch(`/api/client/notifications?${params}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.ok) {
        setNotifications(data.data.notifications || []);
        setUnreadCount(data.data.unreadCount || 0);
      }
    } catch (e) {
      console.error("Failed to load notifications:", e);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await fetch("/api/client/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
      const data = await res.json();
      if (data.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (e) {
      console.error("Failed to mark as read:", e);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch("/api/client/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      const data = await res.json();
      if (data.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadCount(0);
      }
    } catch (e) {
      console.error("Failed to mark all as read:", e);
    }
  };

  const handleClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await handleMarkAsRead(notification.id);
    }
    if (notification.url) {
      router.push(notification.url);
    }
  };

  const getTypeStyle = (type: string) => {
    return TYPE_ICONS[type] || TYPE_ICONS.info;
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "たった今";
    if (diffMins < 60) return `${diffMins}分前`;
    if (diffHours < 24) return `${diffHours}時間前`;
    if (diffDays < 7) return `${diffDays}日前`;

    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <ClientPortalLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
              通知センター
            </h1>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1">
              {unreadCount > 0 ? `${unreadCount}件の未読通知があります` : "すべての通知は既読です"}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="px-4 py-2 text-[13px] font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
            >
              すべて既読にする
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${
              filter === "all"
                ? "bg-slate-900 text-white"
                : "bg-white border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-800"
            }`}
          >
            すべて
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all flex items-center gap-2 ${
              filter === "unread"
                ? "bg-slate-900 text-white"
                : "bg-white border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-800"
            }`}
          >
            未読
            {unreadCount > 0 && (
              <span
                className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold ${
                  filter === "unread" ? "bg-white/20" : "bg-indigo-500 text-white"
                }`}
              >
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Notifications List */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <div className="relative w-8 h-8">
                  <div className="absolute inset-0 rounded-full border-2 border-slate-200 dark:border-slate-700"></div>
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-indigo-600 animate-spin"></div>
                </div>
                <p className="text-[13px] text-slate-500 dark:text-slate-400">読み込み中</p>
              </div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-slate-400">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
              </div>
              <p className="text-[14px] font-medium text-slate-700 dark:text-slate-200">通知はありません</p>
              <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-1">
                {filter === "unread" ? "未読の通知はありません" : "新しい通知が届くとここに表示されます"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map((notification) => {
                const typeStyle = getTypeStyle(notification.type);
                return (
                  <div
                    key={notification.id}
                    onClick={() => handleClick(notification)}
                    className={`flex items-start gap-4 px-5 py-4 cursor-pointer transition-colors hover:bg-slate-50 dark:bg-slate-800/50 ${
                      !notification.is_read ? "bg-indigo-50/50" : ""
                    }`}
                  >
                    {/* Icon */}
                    <div className={`flex-shrink-0 w-9 h-9 rounded-lg ${
                      notification.type === "applicant" ? "bg-blue-50" :
                      notification.type === "interview" ? "bg-violet-50" :
                      notification.type === "system" ? "bg-slate-100 dark:bg-slate-700" : "bg-amber-50"
                    } flex items-center justify-center`}>
                      <div className={`${
                        notification.type === "applicant" ? "text-blue-600" :
                        notification.type === "interview" ? "text-violet-600" :
                        notification.type === "system" ? "text-slate-500 dark:text-slate-400" : "text-amber-600"
                      }`}>
                        {typeStyle.icon}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className={`text-[13px] font-medium ${!notification.is_read ? "text-slate-900 dark:text-slate-100" : "text-slate-700 dark:text-slate-200"}`}>
                            {notification.title}
                          </h3>
                          <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                            {notification.body}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-[11px] text-slate-400 tabular-nums">
                            {formatTime(notification.created_at)}
                          </span>
                          {!notification.is_read && (
                            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                          )}
                        </div>
                      </div>
                      {notification.url && (
                        <div className="mt-1.5">
                          <span className="text-[11px] text-indigo-600 font-medium">
                            詳細を見る →
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ClientPortalLayout>
  );
}
