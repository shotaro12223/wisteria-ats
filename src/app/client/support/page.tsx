"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import ClientPortalLayout from "@/components/client/ClientPortalLayout";

type SupportMessage = {
  id: string;
  company_id: string;
  user_id: string | null;
  user_name: string | null;
  message: string;
  is_from_client: boolean;
  read_at: string | null;
  created_at: string;
};

export default function ClientSupportPage() {
  const pathname = usePathname();
  const isReadOnly = !!pathname?.match(/^\/client\/companies\//);

  const [formData, setFormData] = useState({
    subject: "",
    category: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [replySending, setReplySending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    try {
      const res = await fetch("/api/client/support", { cache: "no-store" });
      const data = await res.json();
      if (data.ok) {
        setMessages(data.data || []);
      }
    } catch {
      // silent
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  // Initial load + polling every 5 seconds
  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isReadOnly) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/client/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (!data.ok) {
        alert(data.error?.message || "送信に失敗しました");
        setSubmitting(false);
        return;
      }

      setSubmitted(true);
      setSubmitting(false);
      // Add to messages list
      setMessages((prev) => [...prev, data.data]);

      // Reset form
      setTimeout(() => {
        setFormData({ subject: "", category: "", message: "" });
        setSubmitted(false);
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      }, 2000);
    } catch {
      alert("送信に失敗しました。もう一度お試しください。");
      setSubmitting(false);
    }
  }

  async function handleReply() {
    if (!replyText.trim() || replySending) return;
    setReplySending(true);
    try {
      const res = await fetch("/api/client/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: "返信",
          category: "other",
          message: replyText.trim(),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setReplyText("");
        setMessages((prev) => [...prev, data.data]);
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
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

  return (
    <ClientPortalLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">サポート</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            お困りのことがございましたら、お気軽にお問い合わせください
          </p>
        </div>

        <div>
          <div className="space-y-6">
            {/* Contact Form */}
            <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-5 flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/30">
                  <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.75}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                新規お問い合わせ
              </h2>

              {submitted ? (
                <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 p-6 text-center">
                  <div className="flex items-center justify-center w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-600 mx-auto mb-4">
                    <svg className="w-7 h-7 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">送信完了</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    お問い合わせありがとうございます。担当者より折り返しご連絡いたします。
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                      カテゴリー
                    </label>
                    <select
                      required
                      disabled={isReadOnly}
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900/50 transition-colors text-sm"
                    >
                      <option value="">選択してください</option>
                      <option value="applicant">応募者について</option>
                      <option value="schedule">面接日程について</option>
                      <option value="job">求人について</option>
                      <option value="system">システムの使い方</option>
                      <option value="other">その他</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                      件名
                    </label>
                    <input
                      type="text"
                      required
                      disabled={isReadOnly}
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900/50 transition-colors text-sm"
                      placeholder="お問い合わせの件名を入力してください"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                      お問い合わせ内容
                    </label>
                    <textarea
                      required
                      disabled={isReadOnly}
                      rows={6}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900/50 transition-colors text-sm resize-none"
                      placeholder="詳細をご記入ください"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || isReadOnly}
                    className="w-full px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                  >
                    {submitting ? "送信中..." : "送信する"}
                  </button>
                </form>
              )}
            </div>

            {/* Chat History */}
            <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30">
                    <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  やり取り履歴
                </h2>
              </div>

              <div className="px-6 py-4 max-h-[500px] overflow-y-auto space-y-3">
                {messagesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-8 text-sm text-slate-400 dark:text-slate-500">
                    まだやり取りはありません
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.is_from_client ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
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
                          {msg.is_from_client ? "あなた" : (msg.user_name || "Wisteria サポート")} · {formatDateTime(msg.created_at)}
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
                <div ref={chatEndRef} />
              </div>

              {/* Quick reply input (visible when there are messages) */}
              {messages.length > 0 && !isReadOnly && (
                <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                  <div className="flex gap-2">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="返信を入力..."
                      rows={2}
                      className="flex-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm text-slate-800 dark:text-slate-200 resize-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900/50 transition-colors"
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
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Ctrl+Enter で送信</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ClientPortalLayout>
  );
}
