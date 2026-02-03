"use client";

import { useState } from "react";
import ClientPortalLayout from "@/components/client/ClientPortalLayout";

export default function ClientSupportPage() {
  const [formData, setFormData] = useState({
    subject: "",
    category: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setSubmitted(true);
    setSubmitting(false);

    // Reset form
    setTimeout(() => {
      setFormData({ subject: "", category: "", message: "" });
      setSubmitted(false);
    }, 3000);
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contact Form */}
          <div className="lg:col-span-2">
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
                お問い合わせフォーム
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
                      rows={6}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900/50 transition-colors text-sm resize-none"
                      placeholder="詳細をご記入ください"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                  >
                    {submitting ? "送信中..." : "送信する"}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            {/* Quick Contact */}
            <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.75}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
                お急ぎの方
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                緊急のご用件の場合は、お電話でお問い合わせください。
              </p>
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">電話番号</p>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">03-XXXX-XXXX</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">平日 9:00 - 18:00</p>
              </div>
            </div>

            {/* FAQ Link */}
            <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-slate-500 dark:text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.75}
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                よくある質問
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                お問い合わせの前に、FAQもご確認ください。
              </p>
              <button className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors">
                FAQを見る
              </button>
            </div>

            {/* Response Time */}
            <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-slate-500 dark:text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.75}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                回答目安
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                お問い合わせいただいた内容は、原則として
                <span className="font-semibold text-slate-900 dark:text-slate-200"> 1営業日以内 </span>
                にご返信いたします。
              </p>
            </div>
          </div>
        </div>
      </div>
    </ClientPortalLayout>
  );
}
