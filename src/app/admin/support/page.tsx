"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type SupportMessage = {
  id: string;
  company_id: string;
  user_id: string | null;
  user_name: string | null;
  message: string;
  is_from_client: boolean;
  read_at: string | null;
  created_at: string;
  companies?: {
    id: string;
    company_name: string;
  };
};

type CompanyGroup = {
  companyId: string;
  companyName: string;
  messages: SupportMessage[];
  lastMessageAt: string;
  unreadCount: number;
};

export default function AdminSupportPage() {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replySending, setReplySending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/support", { cache: "no-store" });
      const data = await res.json();
      if (data.ok) {
        setMessages(data.data || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + polling every 5 seconds
  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  // Mark as read when selecting a company
  async function markAsRead(companyId: string) {
    try {
      await fetch("/api/admin/support", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });
      // Update local state to clear unread badges
      setMessages((prev) =>
        prev.map((msg) =>
          msg.company_id === companyId && msg.is_from_client && !msg.read_at
            ? { ...msg, read_at: new Date().toISOString() }
            : msg
        )
      );
    } catch {
      // silent
    }
  }

  useEffect(() => {
    if (selectedCompany) {
      markAsRead(selectedCompany);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [selectedCompany]);

  // Scroll to bottom when new messages arrive for selected company
  useEffect(() => {
    if (selectedCompany) {
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [messages, selectedCompany]);

  async function handleReply() {
    if (!replyText.trim() || replySending || !selectedCompany) return;
    setReplySending(true);
    try {
      const res = await fetch("/api/admin/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: selectedCompany,
          message: replyText.trim(),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setReplyText("");
        setMessages((prev) => [...prev, data.data]);
      } else {
        alert(data.error?.message || "送信に失敗しました");
      }
    } catch {
      alert("送信に失敗しました");
    } finally {
      setReplySending(false);
    }
  }

  function formatDateTime(isoString: string) {
    return new Date(isoString).toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // Group messages by company
  const companyGroups: CompanyGroup[] = (() => {
    const grouped: Record<string, CompanyGroup> = {};
    for (const msg of messages) {
      const cid = msg.company_id;
      if (!grouped[cid]) {
        grouped[cid] = {
          companyId: cid,
          companyName: msg.companies?.company_name || "不明な企業",
          messages: [],
          lastMessageAt: msg.created_at,
          unreadCount: 0,
        };
      }
      grouped[cid].messages.push(msg);
      if (msg.created_at > grouped[cid].lastMessageAt) {
        grouped[cid].lastMessageAt = msg.created_at;
      }
      if (msg.is_from_client && !msg.read_at) {
        grouped[cid].unreadCount++;
      }
    }
    return Object.values(grouped).sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );
  })();

  const selectedGroup = companyGroups.find((g) => g.companyId === selectedCompany);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">問い合わせ管理</h1>
          <p className="text-sm text-slate-500 mt-1">クライアントからのサポートメッセージ</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : companyGroups.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          問い合わせはまだありません
        </div>
      ) : (
        <div className="flex gap-4" style={{ minHeight: "calc(100vh - 200px)" }}>
          {/* Company list (left panel) */}
          <div className="w-80 flex-shrink-0 border rounded-lg bg-white overflow-hidden">
            <div className="px-4 py-3 border-b bg-slate-50">
              <h2 className="text-sm font-semibold text-slate-700">企業一覧</h2>
            </div>
            <div className="overflow-y-auto max-h-[600px]">
              {companyGroups.map((group) => (
                <button
                  key={group.companyId}
                  onClick={() => {
                    setSelectedCompany(group.companyId);
                    markAsRead(group.companyId);
                  }}
                  className={`w-full text-left px-4 py-3 border-b hover:bg-slate-50 transition-colors ${
                    selectedCompany === group.companyId ? "bg-indigo-50 border-l-2 border-l-indigo-600" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-900 truncate">
                      {group.companyName}
                    </span>
                    {group.unreadCount > 0 && (
                      <span className="ml-2 flex-shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold">
                        {group.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {formatDateTime(group.lastMessageAt)} · {group.messages.length}件
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 truncate">
                    {group.messages[group.messages.length - 1]?.message}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Chat panel (right) */}
          <div className="flex-1 border rounded-lg bg-white overflow-hidden flex flex-col">
            {!selectedGroup ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                企業を選択してください
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div className="px-5 py-3 border-b bg-slate-50 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">
                      {selectedGroup.companyName}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {selectedGroup.messages.length}件のメッセージ
                    </p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 max-h-[500px]">
                  {selectedGroup.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.is_from_client ? "justify-start" : "justify-end"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                          msg.is_from_client
                            ? "bg-slate-100 dark:bg-slate-700 rounded-tl-sm"
                            : "bg-indigo-600 text-white rounded-tr-sm"
                        }`}
                      >
                        <div
                          className={`text-[11px] font-medium mb-1 ${
                            msg.is_from_client
                              ? "text-slate-500"
                              : "text-indigo-200"
                          }`}
                        >
                          {msg.is_from_client
                            ? (msg.user_name || "クライアント")
                            : (msg.user_name || "Wisteria サポート")}{" "}
                          · {formatDateTime(msg.created_at)}
                        </div>
                        <div
                          className={`text-sm whitespace-pre-wrap ${
                            msg.is_from_client ? "text-slate-800" : "text-white"
                          }`}
                        >
                          {msg.message}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                {/* Reply input */}
                <div className="px-5 py-3 border-t bg-slate-50">
                  <div className="flex gap-2">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="返信を入力..."
                      rows={2}
                      className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 resize-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                          handleReply();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleReply}
                      disabled={!replyText.trim() || replySending}
                      className="self-end px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      {replySending ? "送信中..." : "送信"}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Ctrl+Enter で送信</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
