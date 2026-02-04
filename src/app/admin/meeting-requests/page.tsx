"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
  companies?: {
    id: string;
    company_name: string;
  };
  client_users?: {
    id: string;
    display_name: string;
    email: string;
  };
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "依頼受付", color: "bg-amber-100 text-amber-700" },
  dates_proposed: { label: "候補日提示済", color: "bg-blue-100 text-blue-700" },
  confirmed: { label: "日程確定", color: "bg-emerald-100 text-emerald-700" },
  completed: { label: "完了", color: "bg-slate-100 text-slate-700" },
  cancelled: { label: "キャンセル", color: "bg-red-100 text-red-700" },
};

export default function AdminMeetingRequestsPage() {
  const [requests, setRequests] = useState<MeetingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("");

  // Modal state
  const [selectedRequest, setSelectedRequest] = useState<MeetingRequest | null>(null);
  const [proposedDates, setProposedDates] = useState<string[]>(["", "", ""]);
  const [adminMessage, setAdminMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Load requests
  const filterRef = useRef(filterStatus);
  filterRef.current = filterStatus;

  const loadRequests = useCallback(async () => {
    const url = filterRef.current
      ? `/api/admin/meeting-requests?status=${filterRef.current}`
      : "/api/admin/meeting-requests";
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    setLoading(false);

    if (data.ok) {
      setRequests(data.data || []);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadRequests();
  }, [filterStatus, loadRequests]);

  // Polling every 5 seconds
  useEffect(() => {
    const interval = setInterval(loadRequests, 5000);
    return () => clearInterval(interval);
  }, [loadRequests]);

  // Handle propose dates
  async function handleProposeDates() {
    if (!selectedRequest) return;

    const validDates = proposedDates.filter((d) => d.trim() !== "");
    if (validDates.length === 0) {
      alert("候補日を1つ以上入力してください");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/meeting-requests/${selectedRequest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposed_dates: validDates,
          admin_message: adminMessage || null,
        }),
      });

      const data = await res.json();

      if (data.ok) {
        // Reload requests
        const reloadRes = await fetch(
          filterStatus
            ? `/api/admin/meeting-requests?status=${filterStatus}`
            : "/api/admin/meeting-requests",
          { cache: "no-store" }
        );
        const reloadData = await reloadRes.json();
        if (reloadData.ok) {
          setRequests(reloadData.data || []);
        }
        setSelectedRequest(null);
        setProposedDates(["", "", ""]);
        setAdminMessage("");
      } else {
        alert(data.error?.message || "エラーが発生しました");
      }
    } finally {
      setSubmitting(false);
    }
  }

  // Handle status change
  async function handleStatusChange(requestId: string, newStatus: string) {
    const res = await fetch(`/api/admin/meeting-requests/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

    const data = await res.json();

    if (data.ok) {
      // Reload requests
      const reloadRes = await fetch(
        filterStatus
          ? `/api/admin/meeting-requests?status=${filterStatus}`
          : "/api/admin/meeting-requests",
        { cache: "no-store" }
      );
      const reloadData = await reloadRes.json();
      if (reloadData.ok) {
        setRequests(reloadData.data || []);
      }
    }
  }

  // Add/remove date input
  function addDateInput() {
    setProposedDates([...proposedDates, ""]);
  }

  function removeDateInput(index: number) {
    if (proposedDates.length > 1) {
      setProposedDates(proposedDates.filter((_, i) => i !== index));
    }
  }

  function updateDateInput(index: number, value: string) {
    const newDates = [...proposedDates];
    newDates[index] = value;
    setProposedDates(newDates);
  }

  function formatDateTime(isoString: string) {
    const date = new Date(isoString);
    return date.toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">打ち合わせ依頼管理</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">フィルター:</span>
          <select
            className="rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">すべて</option>
            <option value="pending">依頼受付</option>
            <option value="dates_proposed">候補日提示済</option>
            <option value="confirmed">日程確定</option>
            <option value="completed">完了</option>
            <option value="cancelled">キャンセル</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          打ち合わせ依頼はありません
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div
              key={request.id}
              className="border rounded-lg p-5 bg-white hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                        STATUS_LABELS[request.status]?.color || "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {STATUS_LABELS[request.status]?.label || request.status}
                    </span>
                    <span className="text-sm text-slate-500">
                      {formatDateTime(request.created_at)}
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold text-slate-900 mb-1">
                    {request.subject}
                  </h3>

                  <div className="flex items-center gap-4 text-sm text-slate-600 mb-2">
                    <span className="font-medium">
                      {request.companies?.company_name || "不明な企業"}
                    </span>
                    <span className="text-slate-400">|</span>
                    <span>
                      {request.client_users?.display_name || request.client_users?.email || "不明"}
                    </span>
                  </div>

                  {request.note && (
                    <p className="text-sm text-slate-500 mt-2 whitespace-pre-wrap">
                      {request.note}
                    </p>
                  )}

                  {/* Proposed dates */}
                  {request.proposed_dates && request.proposed_dates.length > 0 && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs font-medium text-blue-700 mb-2">提示済み候補日:</p>
                      <div className="flex flex-wrap gap-2">
                        {request.proposed_dates.map((date, i) => (
                          <span
                            key={i}
                            className={`px-2 py-1 text-xs rounded ${
                              request.confirmed_date === date
                                ? "bg-emerald-100 text-emerald-700 font-semibold"
                                : "bg-white text-slate-600"
                            }`}
                          >
                            {formatDateTime(date)}
                            {request.confirmed_date === date && " (確定)"}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Confirmed date */}
                  {request.confirmed_date && (
                    <div className="mt-3 p-3 bg-emerald-50 rounded-lg">
                      <p className="text-xs font-medium text-emerald-700 mb-1">確定日時:</p>
                      <p className="text-sm font-semibold text-emerald-800">
                        {formatDateTime(request.confirmed_date)}
                      </p>
                    </div>
                  )}

                  {/* Admin message */}
                  {request.admin_message && (
                    <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs font-medium text-slate-500 mb-1">管理者メッセージ:</p>
                      <p className="text-sm text-slate-700">{request.admin_message}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 ml-4">
                  {request.status === "pending" && (
                    <button
                      onClick={() => {
                        setSelectedRequest(request);
                        setProposedDates(["", "", ""]);
                        setAdminMessage("");
                      }}
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      候補日を提示
                    </button>
                  )}

                  {request.status === "confirmed" && (
                    <button
                      onClick={() => handleStatusChange(request.id, "completed")}
                      className="px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-100 rounded-lg hover:bg-emerald-200 transition-colors"
                    >
                      完了にする
                    </button>
                  )}

                  {(request.status === "pending" || request.status === "dates_proposed") && (
                    <button
                      onClick={() => handleStatusChange(request.id, "cancelled")}
                      className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      キャンセル
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Propose Dates Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4">
            <h3 className="text-lg font-semibold mb-1">候補日を提示</h3>
            <p className="text-sm text-slate-500 mb-4">
              {selectedRequest.companies?.company_name} - {selectedRequest.subject}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">候補日時</label>
                {proposedDates.map((date, index) => (
                  <div key={index} className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-slate-500 w-16 shrink-0">第{index + 1}希望</span>
                    <input
                      type="datetime-local"
                      className="flex-1 rounded-md border px-3 py-2 text-sm"
                      value={date}
                      onChange={(e) => updateDateInput(index, e.target.value)}
                    />
                  </div>
                ))}
                <p className="text-xs text-slate-400 mt-1">※ 少なくとも1つは入力してください</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  メッセージ（任意）
                </label>
                <textarea
                  className="w-full rounded-md border px-3 py-2 text-sm resize-none"
                  rows={3}
                  value={adminMessage}
                  onChange={(e) => setAdminMessage(e.target.value)}
                  placeholder="クライアントへのメッセージがあればご記入ください"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleProposeDates}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? "送信中..." : "候補日を送信"}
              </button>
              <button
                onClick={() => {
                  setSelectedRequest(null);
                  setProposedDates(["", "", ""]);
                  setAdminMessage("");
                }}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 border rounded-lg hover:bg-slate-50 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
