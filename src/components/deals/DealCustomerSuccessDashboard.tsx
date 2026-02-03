// src/components/deals/DealCustomerSuccessDashboard.tsx
"use client";

import { useEffect, useState } from "react";

interface DealCustomerSuccessDashboardProps {
  dealId: string;
  companyId: string;
  companyName: string;
  title: string;
  stage: string;
  memo: string;
  record: {
    profile: Record<string, unknown>;
  } | null;
}

type DealActivity = {
  id: string;
  deal_id: string;
  type: "note" | "call" | "mail" | "task" | "meeting" | "system";
  body: string;
  occurred_at: string;
  created_by: string | null;
  meta: any;
  created_at: string;
};

const UI = {
  CARD: "rounded-xl border-2 border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden",
  CARD_HDR: "border-b-2 border-slate-200/80 dark:border-slate-700 px-5 py-3.5",
  CARD_BODY: "px-5 py-4",
  CARD_TITLE: "text-[14px] font-bold text-slate-900 dark:text-slate-100",
  CARD_SUB: "mt-0.5 text-[12px] text-slate-600 dark:text-slate-400",
};

export function DealCustomerSuccessDashboard({
  dealId,
}: DealCustomerSuccessDashboardProps) {
  const [activities, setActivities] = useState<DealActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [activityType, setActivityType] = useState<"note" | "call" | "mail" | "task" | "meeting" | "system">("note");
  const [activityBody, setActivityBody] = useState("");
  const [submittingActivity, setSubmittingActivity] = useState(false);

  // 活動履歴取得
  useEffect(() => {
    if (!dealId) return;

    let alive = true;
    (async () => {
      setLoadingActivities(true);
      try {
        const res = await fetch(`/api/deals/${encodeURIComponent(dealId)}/activities`, { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          if (json.ok && Array.isArray(json.items)) {
            if (!alive) return;
            setActivities(json.items);
          }
        }
      } catch (err) {
        console.error("活動履歴取得エラー:", err);
      } finally {
        if (!alive) return;
        setLoadingActivities(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [dealId]);

  // MTG履歴フィルタ
  const meetingActivities = activities.filter((a) => a.type === "meeting");
  const noteActivities = activities.filter((a) => a.type === "note");
  const taskActivities = activities.filter((a) => a.type === "task");
  const supportActivities = activities.filter((a) => a.type === "call" || a.type === "mail");

  // 活動記録を追加
  const handleAddActivity = async () => {
    if (!activityBody.trim()) return;

    setSubmittingActivity(true);
    try {
      const res = await fetch(`/api/deals/${encodeURIComponent(dealId)}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: activityType,
          body: activityBody.trim(),
          occurred_at: new Date().toISOString(),
          meta: activityType === "task" ? { completed: false } : null,
        }),
      });

      const json = await res.json();
      console.log("Activity POST response:", json);

      if (res.ok && json.ok && json.item) {
        setActivities((prev) => [json.item, ...prev]);
        setActivityBody("");
        setShowAddActivity(false);
      } else {
        console.error("Activity save failed:", json);
        alert(`保存に失敗しました: ${json.error?.message || "不明なエラー"}`);
      }
    } catch (err) {
      console.error("活動記録追加エラー:", err);
      alert(`エラーが発生しました: ${err}`);
    } finally {
      setSubmittingActivity(false);
    }
  };

  // TODOの完了/未完了をトグル
  const handleToggleTodo = async (activityId: string, currentCompleted: boolean) => {
    try {
      const res = await fetch(`/api/deals/${encodeURIComponent(dealId)}/activities`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityId,
          meta: { completed: !currentCompleted },
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.ok && json.item) {
          setActivities((prev) =>
            prev.map((a) => (a.id === activityId ? json.item : a))
          );
        }
      }
    } catch (err) {
      console.error("TODO更新エラー:", err);
    }
  };

  // アクティビティを削除
  const handleDeleteActivity = async (activityId: string) => {
    if (!confirm("この記録を削除しますか？")) return;

    try {
      const res = await fetch(`/api/deals/${encodeURIComponent(dealId)}/activities?activityId=${encodeURIComponent(activityId)}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setActivities((prev) => prev.filter((a) => a.id !== activityId));
      } else {
        alert("削除に失敗しました");
      }
    } catch (err) {
      console.error("削除エラー:", err);
      alert("削除エラーが発生しました");
    }
  };

  return (
    <div className="space-y-4">
      {/* 活動記録クイック追加 */}
      {!showAddActivity ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <button
            type="button"
            onClick={() => {
              setActivityType("meeting");
              setShowAddActivity(true);
            }}
            className="rounded-lg border-2 border-indigo-200 dark:border-indigo-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-[12px] font-bold text-indigo-700 dark:text-indigo-300 shadow-sm transition-all hover:bg-indigo-50 dark:hover:bg-indigo-900/50 hover:shadow-md"
          >
            📅 打ち合わせ
          </button>
          <button
            type="button"
            onClick={() => {
              setActivityType("note");
              setShowAddActivity(true);
            }}
            className="rounded-lg border-2 border-purple-200 dark:border-purple-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-[12px] font-bold text-purple-700 dark:text-purple-300 shadow-sm transition-all hover:bg-purple-50 dark:hover:bg-purple-900/50 hover:shadow-md"
          >
            📝 メモ・課題
          </button>
          <button
            type="button"
            onClick={() => {
              setActivityType("task");
              setShowAddActivity(true);
            }}
            className="rounded-lg border-2 border-emerald-200 dark:border-emerald-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-[12px] font-bold text-emerald-700 dark:text-emerald-300 shadow-sm transition-all hover:bg-emerald-50 dark:hover:bg-emerald-900/50 hover:shadow-md"
          >
            ✅ TODO
          </button>
          <button
            type="button"
            onClick={() => {
              setActivityType("call");
              setShowAddActivity(true);
            }}
            className="rounded-lg border-2 border-sky-200 dark:border-sky-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-[12px] font-bold text-sky-700 dark:text-sky-300 shadow-sm transition-all hover:bg-sky-50 dark:hover:bg-sky-900/50 hover:shadow-md"
          >
            📞 電話対応
          </button>
          <button
            type="button"
            onClick={() => {
              setActivityType("mail");
              setShowAddActivity(true);
            }}
            className="rounded-lg border-2 border-amber-200 dark:border-amber-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-[12px] font-bold text-amber-700 dark:text-amber-300 shadow-sm transition-all hover:bg-amber-50 dark:hover:bg-amber-900/50 hover:shadow-md"
          >
            ✉️ メール対応
          </button>
        </div>
      ) : (
        <div className={UI.CARD}>
          <div className={UI.CARD_HDR + " bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30"}>
            <div>
              <div className={UI.CARD_TITLE}>
                {activityType === "meeting"
                  ? "📅 打ち合わせ記録"
                  : activityType === "note"
                    ? "📝 議事録・メモ"
                    : activityType === "task"
                      ? "✅ TODO・アクション"
                      : activityType === "call"
                        ? "📞 電話対応記録"
                        : "✉️ メール対応記録"}
              </div>
              <div className={UI.CARD_SUB}>
                {activityType === "meeting"
                  ? "ミーティングの内容を記録"
                  : activityType === "note"
                    ? "重要事項・課題・要望などを記録"
                    : activityType === "task"
                      ? "次のアクション・やるべきことを記録"
                      : activityType === "call"
                        ? "電話でのサポート内容を記録"
                        : "メールでのサポート内容を記録"}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowAddActivity(false);
                setActivityBody("");
              }}
              className="rounded-lg p-2 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300 transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className={UI.CARD_BODY}>
            <textarea
              value={activityBody}
              onChange={(e) => setActivityBody(e.target.value)}
              placeholder={
                activityType === "meeting"
                  ? "例: 次回更新について打ち合わせ。担当者変更の可能性あり。"
                  : activityType === "note"
                    ? "例: 採用人数を増やしたいとの要望あり。来月から追加プラン検討。"
                    : activityType === "task"
                      ? "例: 見積書を3営業日以内に送付する"
                      : activityType === "call"
                        ? "例: 求人掲載の設定方法について電話で説明。問題なく解決。"
                        : "例: 応募者管理の使い方についてメールで回答。マニュアルPDFを添付。"
              }
              rows={4}
              className="w-full rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-4 py-3 text-[14px] focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-500/40 transition-all resize-none"
            />
            <div className="mt-3 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowAddActivity(false);
                  setActivityBody("");
                }}
                className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-[13px] font-semibold text-slate-700 dark:text-slate-300 transition-all hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleAddActivity}
                disabled={!activityBody.trim() || submittingActivity}
                className="rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-2 text-[13px] font-semibold text-white transition-all hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingActivity ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 打ち合わせ履歴 */}
      <div className={UI.CARD}>
        <div className={UI.CARD_HDR}>
          <div className={UI.CARD_TITLE}>📅 打ち合わせ履歴</div>
          <div className={UI.CARD_SUB}>過去のミーティング記録 ({meetingActivities.length}件)</div>
        </div>
        <div className={UI.CARD_BODY}>
          {loadingActivities ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent" />
            </div>
          ) : meetingActivities.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-[13px]">打ち合わせ履歴はありません</div>
          ) : (
            <div className="space-y-3">
              {meetingActivities.slice(0, 5).map((activity) => (
                <div key={activity.id} className="group rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-bold text-slate-900 dark:text-slate-100">{activity.body}</div>
                      <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                        {new Date(activity.occurred_at || activity.created_at).toLocaleString("ja-JP")}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteActivity(activity.id)}
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity rounded p-1 text-slate-400 dark:text-slate-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 hover:text-rose-600 dark:hover:text-rose-400"
                      title="削除"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
              {meetingActivities.length > 5 && (
                <div className="text-center pt-2">
                  <div className="text-[12px] text-slate-500 dark:text-slate-400">他 {meetingActivities.length - 5}件</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 議事録・メモ・課題 */}
      <div className={UI.CARD}>
        <div className={UI.CARD_HDR}>
          <div className={UI.CARD_TITLE}>📝 議事録・メモ・課題</div>
          <div className={UI.CARD_SUB}>重要事項・要望・課題の記録 ({noteActivities.length}件)</div>
        </div>
        <div className={UI.CARD_BODY}>
          {loadingActivities ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent" />
            </div>
          ) : noteActivities.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-[13px]">メモ・課題はありません</div>
          ) : (
            <div className="space-y-3">
              {noteActivities.slice(0, 5).map((activity) => (
                <div key={activity.id} className="group rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] text-slate-900 dark:text-slate-100 leading-relaxed whitespace-pre-wrap">{activity.body}</div>
                      <div className="mt-2 text-[11px] text-slate-600 dark:text-slate-400">
                        {new Date(activity.occurred_at || activity.created_at).toLocaleString("ja-JP")}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteActivity(activity.id)}
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity rounded p-1 text-slate-400 dark:text-slate-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 hover:text-rose-600 dark:hover:text-rose-400"
                      title="削除"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
              {noteActivities.length > 5 && (
                <div className="text-center pt-2">
                  <div className="text-[12px] text-slate-500 dark:text-slate-400">他 {noteActivities.length - 5}件</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* アクションアイテム・TODO */}
      <div className={UI.CARD}>
        <div className={UI.CARD_HDR}>
          <div className={UI.CARD_TITLE}>✅ アクションアイテム・TODO</div>
          <div className={UI.CARD_SUB}>次にやるべきこと ({taskActivities.length}件)</div>
        </div>
        <div className={UI.CARD_BODY}>
          {loadingActivities ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent" />
            </div>
          ) : taskActivities.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-[13px]">アクションアイテムはありません</div>
          ) : (
            <div className="space-y-2">
              {taskActivities.slice(0, 10).map((activity) => {
                const isCompleted = activity.meta?.completed === true;
                return (
                  <div
                    key={activity.id}
                    className={`group flex items-start gap-3 rounded-lg border px-4 py-2.5 transition-all ${
                      isCompleted
                        ? "border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 opacity-60"
                        : "border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleTodo(activity.id, isCompleted)}
                      className="mt-0.5 flex-shrink-0 transition-transform hover:scale-110 active:scale-95"
                    >
                      <div
                        className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
                          isCompleted
                            ? "border-slate-400 dark:border-slate-500 bg-slate-400 dark:bg-slate-500"
                            : "border-emerald-600 dark:border-emerald-500 bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                        }`}
                      >
                        {isCompleted && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className={`text-[13px] ${isCompleted ? "text-slate-500 dark:text-slate-400 line-through" : "text-slate-900 dark:text-slate-100"}`}>
                        {activity.body}
                      </div>
                      <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                        {new Date(activity.occurred_at || activity.created_at).toLocaleString("ja-JP")}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteActivity(activity.id)}
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity rounded p-1 text-slate-400 dark:text-slate-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 hover:text-rose-600 dark:hover:text-rose-400"
                      title="削除"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                );
              })}
              {taskActivities.length > 10 && (
                <div className="text-center pt-2">
                  <div className="text-[12px] text-slate-500 dark:text-slate-400">他 {taskActivities.length - 10}件</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* サポート履歴 */}
      {supportActivities.length > 0 && (
        <div className={UI.CARD}>
          <div className={UI.CARD_HDR}>
            <div className={UI.CARD_TITLE}>🎧 サポート履歴</div>
            <div className={UI.CARD_SUB}>電話・メール対応の記録 ({supportActivities.length}件)</div>
          </div>
          <div className={UI.CARD_BODY}>
            <div className="space-y-2">
              {supportActivities.slice(0, 5).map((activity) => (
                <div key={activity.id} className="group flex items-start gap-3 rounded-lg border border-sky-200 dark:border-sky-800 bg-sky-50/50 dark:bg-sky-950/30 px-4 py-2.5">
                  <div className="mt-0.5 text-[16px]">{activity.type === "call" ? "📞" : "✉️"}</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] text-slate-900 dark:text-slate-100">{activity.body}</div>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                      <span>{activity.type === "call" ? "電話" : "メール"}</span>
                      <span>•</span>
                      <span>{new Date(activity.occurred_at || activity.created_at).toLocaleString("ja-JP")}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteActivity(activity.id)}
                    className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    title="削除"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
              {supportActivities.length > 5 && (
                <div className="text-center pt-2">
                  <div className="text-[12px] text-slate-500 dark:text-slate-400">他 {supportActivities.length - 5}件</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
