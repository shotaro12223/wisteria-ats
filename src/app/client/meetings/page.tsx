"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

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
  client_preferred_times: string | null;
  previous_confirmed_date: string | null;
  reschedule_reason: string | null;
  created_at: string;
  updated_at: string;
};

type MeetingMessage = {
  id: string;
  meeting_request_id: string;
  user_id: string | null;
  user_name: string | null;
  message: string;
  is_from_client: boolean;
  read_at: string | null;
  created_at: string;
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
  const pathname = usePathname();
  const adminCompanyId = pathname?.match(/^\/client\/companies\/([^/]+)/)?.[1] ?? null;
  const isReadOnly = !!adminCompanyId;
  const qs = adminCompanyId ? `?companyId=${adminCompanyId}` : "";

  const [requests, setRequests] = useState<MeetingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [confirmingDate, setConfirmingDate] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Message modal state
  const [messageModalRequestId, setMessageModalRequestId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MeetingMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const threadEndRef = useRef<HTMLDivElement>(null);

  // Cancel state
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Reschedule request modal
  const [rescheduleRequestId, setRescheduleRequestId] = useState<string | null>(null);
  const [rescheduleMessage, setRescheduleMessage] = useState("");

  const loadRequests = useCallback(async () => {
    const res = await fetch(`/api/client/meeting-requests${qs}`, { cache: "no-store" });
    const data = await res.json();
    setLoading(false);

    if (data.ok) {
      setRequests(data.data || []);
    }
  }, [qs]);

  useEffect(() => {
    setLoading(true);
    loadRequests();
    const interval = setInterval(loadRequests, 5000);
    return () => clearInterval(interval);
  }, []);

  async function handleConfirmDate() {
    if (!confirmingId || !confirmingDate || isReadOnly) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/client/meeting-requests/${confirmingId}${qs}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmed_date: confirmingDate }),
      });

      const data = await res.json();

      if (data.ok) {
        const reloadRes = await fetch(`/api/client/meeting-requests${qs}`, { cache: "no-store" });
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

  // Cancel a pending request
  async function handleCancel(requestId: string) {
    if (!confirm("この打ち合わせ依頼を取り消しますか？")) return;
    setCancellingId(requestId);
    try {
      const res = await fetch(`/api/client/meeting-requests/${requestId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.ok) {
        setRequests((prev) => prev.filter((r) => r.id !== requestId));
      } else {
        alert(data.error?.message || "取り消しに失敗しました");
      }
    } catch {
      alert("取り消しに失敗しました");
    } finally {
      setCancellingId(null);
    }
  }

  // Message modal
  async function openMessageModal(requestId: string) {
    setMessageModalRequestId(requestId);
    setMessagesLoading(true);
    setMessages([]);
    setReplyText("");
    const res = await fetch(`/api/client/meeting-requests/${requestId}/messages${qs}`, { cache: "no-store" });
    const data = await res.json();
    setMessagesLoading(false);
    if (data.ok) {
      setMessages(data.data || []);
      setTimeout(() => threadEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }

  async function handleSendMessage() {
    if (!replyText.trim() || !messageModalRequestId || sending || isReadOnly) return;
    setSending(true);
    try {
      const res = await fetch(`/api/client/meeting-requests/${messageModalRequestId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: replyText.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        setReplyText("");
        setMessages((prev) => [...prev, data.data]);
        setTimeout(() => threadEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      } else {
        alert(data.error?.message || "送信に失敗しました");
      }
    } finally {
      setSending(false);
    }
  }

  // Reschedule request (client sends a message asking for reschedule)
  async function handleRescheduleRequest() {
    if (!rescheduleRequestId || !rescheduleMessage.trim() || isReadOnly) return;
    setSending(true);
    try {
      const msg = `【日程変更のご依頼】\n${rescheduleMessage.trim()}`;
      const res = await fetch(`/api/client/meeting-requests/${rescheduleRequestId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
      const data = await res.json();
      if (data.ok) {
        setRescheduleRequestId(null);
        setRescheduleMessage("");
      } else {
        alert(data.error?.message || "送信に失敗しました");
      }
    } finally {
      setSending(false);
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

  function formatDateTimeFull(isoString: string) {
    return new Date(isoString).toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
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
                      <div className="flex items-center gap-2">
                        {request.status === "pending" && !isReadOnly ? (
                          <button
                            onClick={() => handleCancel(request.id)}
                            disabled={cancellingId === request.id}
                            className="px-3 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                          >
                            {cancellingId === request.id ? "取り消し中..." : "取り消し"}
                          </button>
                        ) : (
                          <button
                            onClick={() => openMessageModal(request.id)}
                            className="px-3 py-1.5 text-xs font-medium text-indigo-700 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
                          >
                            <span className="flex items-center gap-1.5">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                              </svg>
                              メッセージ
                            </span>
                          </button>
                        )}
                        <span className="text-xs text-slate-400">
                          {formatDateTimeShort(request.created_at)}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
                      {request.subject}
                    </h3>

                    {request.note && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 whitespace-pre-wrap">
                        {request.note}
                      </p>
                    )}

                    {/* Client preferred times */}
                    {request.client_preferred_times && (
                      <div className="p-3 bg-white dark:bg-slate-800 rounded-xl mb-4">
                        <p className="text-xs font-medium text-amber-600 mb-1">希望日時</p>
                        <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{request.client_preferred_times}</p>
                      </div>
                    )}

                    {/* Admin message */}
                    {request.admin_message && (
                      <div className="p-4 bg-white dark:bg-slate-800 rounded-xl mb-4">
                        <p className="text-xs font-medium text-slate-400 mb-1">担当者からのメッセージ</p>
                        <p className="text-sm text-slate-700 dark:text-slate-200">{request.admin_message}</p>
                      </div>
                    )}

                    {/* Previous confirmed date (reschedule info) */}
                    {request.previous_confirmed_date && (
                      <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl mb-4">
                        <p className="text-xs font-medium text-orange-600 mb-0.5">リスケ前の日程</p>
                        <p className="text-sm text-orange-800 dark:text-orange-300 line-through">
                          {formatDateTime(request.previous_confirmed_date)}
                        </p>
                        {request.reschedule_reason && (
                          <p className="text-xs text-orange-600 mt-1">理由: {request.reschedule_reason}</p>
                        )}
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
                              disabled={isReadOnly}
                              onClick={() => {
                                if (isReadOnly) return;
                                setConfirmingId(request.id);
                                setConfirmingDate(date);
                              }}
                              className={`flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl transition-all group ${isReadOnly ? "opacity-60 cursor-not-allowed" : "hover:bg-indigo-50 hover:border-indigo-300"}`}
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
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-medium text-emerald-600 mb-1">確定日時</p>
                            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                              {formatDateTime(request.confirmed_date)}
                            </p>
                          </div>
                          {!isReadOnly && (
                            <button
                              onClick={() => {
                                setRescheduleRequestId(request.id);
                                setRescheduleMessage("");
                              }}
                              className="px-3 py-1.5 text-xs font-medium text-orange-700 bg-orange-100 rounded-lg hover:bg-orange-200 transition-colors"
                            >
                              日程変更を依頼する
                            </button>
                          )}
                        </div>
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
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openMessageModal(request.id)}
                          className="px-2 py-1 text-[11px] text-slate-500 hover:text-indigo-600 transition-colors"
                        >
                          メッセージ
                        </button>
                        <span className="text-xs text-slate-400">
                          {request.confirmed_date
                            ? formatDateTimeShort(request.confirmed_date)
                            : formatDateTimeShort(request.created_at)}
                        </span>
                      </div>
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

      {/* Message Modal */}
      {messageModalRequestId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg mx-4 flex flex-col" style={{ maxHeight: "80vh" }}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                メッセージ - {requests.find((r) => r.id === messageModalRequestId)?.subject}
              </h3>
              <button
                onClick={() => {
                  setMessageModalRequestId(null);
                  setMessages([]);
                  setReplyText("");
                }}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {messagesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8 text-sm text-slate-400">メッセージはありません</div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.is_from_client ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                        msg.is_from_client
                          ? "bg-indigo-600 text-white rounded-tr-sm"
                          : "bg-slate-100 dark:bg-slate-700 rounded-tl-sm"
                      }`}
                    >
                      <div className={`text-[11px] font-medium mb-1 ${
                        msg.is_from_client
                          ? "text-indigo-200"
                          : "text-slate-500 dark:text-slate-400"
                      }`}>
                        {msg.user_name || "不明"} · {formatDateTimeFull(msg.created_at)}
                      </div>
                      <div className={`text-sm whitespace-pre-wrap ${
                        msg.is_from_client
                          ? "text-white"
                          : "text-slate-800 dark:text-slate-200"
                      }`}>
                        {msg.message}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={threadEndRef} />
            </div>

            {/* Reply input */}
            {!isReadOnly && (
              <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700">
                <div className="flex gap-2">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="メッセージを入力..."
                    rows={2}
                    className="flex-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm text-slate-800 dark:text-slate-200 resize-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                        handleSendMessage();
                      }
                    }}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!replyText.trim() || sending}
                    className="self-end px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {sending ? "..." : "送信"}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Ctrl+Enter で送信</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reschedule Request Modal */}
      {rescheduleRequestId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">日程変更の依頼</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              担当者に日程変更のメッセージを送信します
            </p>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">変更理由・ご希望</label>
              <textarea
                value={rescheduleMessage}
                onChange={(e) => setRescheduleMessage(e.target.value)}
                placeholder="日程変更の理由やご希望の日時をお知らせください"
                rows={4}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 resize-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors"
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleRescheduleRequest}
                disabled={!rescheduleMessage.trim() || sending}
                className="flex-1 px-4 py-3 text-sm font-semibold text-white bg-orange-600 rounded-xl hover:bg-orange-700 disabled:opacity-50 transition-colors"
              >
                {sending ? "送信中..." : "依頼を送信"}
              </button>
              <button
                onClick={() => {
                  setRescheduleRequestId(null);
                  setRescheduleMessage("");
                }}
                className="flex-1 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </ClientPortalLayout>
  );
}
