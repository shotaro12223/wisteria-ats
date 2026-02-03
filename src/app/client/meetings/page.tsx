"use client";

import { useEffect, useState } from "react";

type MeetingRequest = {
  id: string;
  company_id: string;
  client_user_id: string;
  subject: string;
  note: string | null;
  status: "pending" | "dates_proposed" | "confirmed" | "completed" | "cancelled";
  proposed_dates: string[] | null;
  confirmed_date: string | null;
  admin_message: string | null;
  created_at: string;
  updated_at: string;
};

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "依頼受付", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  dates_proposed: { label: "候補日あり", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  confirmed: { label: "日程確定", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  completed: { label: "完了", color: "text-slate-600 dark:text-slate-300", bg: "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700" },
  cancelled: { label: "キャンセル", color: "text-red-600", bg: "bg-red-50 border-red-200" },
};

import ClientPortalLayout from "@/components/client/ClientPortalLayout";

export default function ClientMeetingsPage() {
  const [requests, setRequests] = useState<MeetingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [confirmingDate, setConfirmingDate] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadRequests() {
      setLoading(true);
      const res = await fetch("/api/client/meeting-requests", { cache: "no-store" });
      const data = await res.json();
      setLoading(false);

      if (data.ok) {
        setRequests(data.data || []);
      }
    }
    loadRequests();
  }, []);

  async function handleConfirmDate() {
    if (!confirmingId || !confirmingDate) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/client/meeting-requests/${confirmingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmed_date: confirmingDate }),
      });

      const data = await res.json();

      if (data.ok) {
        // Reload
        const reloadRes = await fetch("/api/client/meeting-requests", { cache: "no-store" });
        const reloadData = await reloadRes.json();
        if (reloadData.ok) {
          setRequests(reloadData.data || []);
        }
        setConfirmingId(null);
        setConfirmingDate(null);
      } else {
        alert(data.error?.message || "エラーが発生しました");
      }
    } finally {
      setSubmitting(false);
    }
  }

  function formatDateTime(isoString: string) {
    const date = new Date(isoString);
    return date.toLocaleString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatDateTimeShort(isoString: string) {
    const date = new Date(isoString);
    return date.toLocaleString("ja-JP", {
      month: "numeric",
      day: "numeric",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // Split into active and past
  const activeRequests = requests.filter(
    (r) => r.status === "pending" || r.status === "dates_proposed" || r.status === "confirmed"
  );
  const pastRequests = requests.filter(
    (r) => r.status === "completed" || r.status === "cancelled"
  );

  if (loading) {
    return (
      <ClientPortalLayout>
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-slate-200 dark:border-slate-700 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-sm text-slate-500 dark:text-slate-400">読み込み中...</p>
          </div>
        </div>
      </ClientPortalLayout>
    );
  }

  return (
    <ClientPortalLayout>
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">打ち合わせ</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          担当者との打ち合わせ依頼と日程をご確認いただけます
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          </div>
          <p className="text-slate-600 dark:text-slate-300 font-medium">打ち合わせ依頼はありません</p>
          <p className="text-sm text-slate-400 mt-1">
            ヘッダーの「打ち合わせ希望」ボタンから依頼できます
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Active Requests */}
          {activeRequests.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-4">
                進行中
              </h2>
              <div className="space-y-4">
                {activeRequests.map((request) => (
                  <div
                    key={request.id}
                    className={`p-5 rounded-2xl border-2 ${STATUS_LABELS[request.status]?.bg || "bg-white border-slate-200 dark:border-slate-700"}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full ${
                            STATUS_LABELS[request.status]?.color || "text-slate-600 dark:text-slate-300"
                          } bg-white`}
                        >
                          {request.status === "dates_proposed" && (
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                          )}
                          {STATUS_LABELS[request.status]?.label || request.status}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400">
                        {formatDateTimeShort(request.created_at)}
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
                      {request.subject}
                    </h3>

                    {request.note && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 whitespace-pre-wrap">
                        {request.note}
                      </p>
                    )}

                    {/* Admin message */}
                    {request.admin_message && (
                      <div className="p-4 bg-white dark:bg-slate-800 rounded-xl mb-4">
                        <p className="text-xs font-medium text-slate-400 mb-1">担当者からのメッセージ</p>
                        <p className="text-sm text-slate-700 dark:text-slate-200">{request.admin_message}</p>
                      </div>
                    )}

                    {/* Date selection for dates_proposed */}
                    {request.status === "dates_proposed" && request.proposed_dates && request.proposed_dates.length > 0 && (
                      <div className="p-4 bg-white dark:bg-slate-800 rounded-xl">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-3">
                          ご都合の良い日時をお選びください
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {request.proposed_dates.map((date, i) => (
                            <button
                              key={i}
                              onClick={() => {
                                setConfirmingId(request.id);
                                setConfirmingDate(date);
                              }}
                              className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 hover:border-indigo-300 border-2 border-slate-200 dark:border-slate-700 rounded-xl transition-all group"
                            >
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-200 group-hover:text-indigo-700">
                                {formatDateTime(date)}
                              </span>
                              <svg className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Confirmed date */}
                    {request.status === "confirmed" && request.confirmed_date && (
                      <div className="p-4 bg-white dark:bg-slate-800 rounded-xl">
                        <p className="text-xs font-medium text-emerald-600 mb-1">確定日時</p>
                        <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                          {formatDateTime(request.confirmed_date)}
                        </p>
                      </div>
                    )}

                    {/* Pending status */}
                    {request.status === "pending" && (
                      <div className="p-4 bg-white dark:bg-slate-800 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">担当者確認中</p>
                            <p className="text-xs text-slate-400">候補日のご連絡をお待ちください</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Past Requests */}
          {pastRequests.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
                過去の打ち合わせ
              </h2>
              <div className="space-y-3">
                {pastRequests.map((request) => (
                  <div
                    key={request.id}
                    className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded ${
                            request.status === "completed"
                              ? "bg-slate-200 text-slate-600 dark:text-slate-300"
                              : "bg-red-100 text-red-600"
                          }`}
                        >
                          {STATUS_LABELS[request.status]?.label}
                        </span>
                        <span className="text-sm text-slate-700 dark:text-slate-200">{request.subject}</span>
                      </div>
                      <span className="text-xs text-slate-400">
                        {request.confirmed_date
                          ? formatDateTimeShort(request.confirmed_date)
                          : formatDateTimeShort(request.created_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirm Date Modal */}
      {confirmingId && confirmingDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md mx-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">日程を確定しますか？</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">以下の日時で打ち合わせを確定します</p>
              <div className="p-4 bg-indigo-50 rounded-xl">
                <p className="text-lg font-semibold text-indigo-900">
                  {formatDateTime(confirmingDate)}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleConfirmDate}
                disabled={submitting}
                className="flex-1 px-4 py-3 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? "確定中..." : "この日程で確定"}
              </button>
              <button
                onClick={() => {
                  setConfirmingId(null);
                  setConfirmingDate(null);
                }}
                className="flex-1 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
              >
                戻る
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </ClientPortalLayout>
  );
}
