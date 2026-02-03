// src/app/calendar/page.tsx
"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import Link from "next/link";

/* ─────────── Premium hooks ─────────── */
function useTypingEffect(text: string, speed = 30) {
  const [displayText, setDisplayText] = useState("");
  useEffect(() => {
    setDisplayText("");
    let i = 0;
    const iv = setInterval(() => {
      if (i < text.length) {
        setDisplayText(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(iv);
      }
    }, speed);
    return () => clearInterval(iv);
  }, [text, speed]);
  return displayText;
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return { greeting: "おはようございます", icon: "☀️" };
  if (h >= 12 && h < 17) return { greeting: "お疲れさまです", icon: "🌤" };
  if (h >= 17 && h < 21) return { greeting: "お疲れさまです", icon: "🌅" };
  return { greeting: "夜遅くまでお疲れさまです", icon: "🌙" };
}

const UI = {
  PAGE_BG: "relative min-h-screen",
  PANEL: "rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-lg",
  PANEL_HDR: "flex items-start justify-between gap-3 border-b border-slate-200/60 dark:border-slate-700/60 px-6 py-4",
  PANEL_TITLE: "text-[16px] font-bold text-slate-900 dark:text-slate-100",
  PANEL_SUB: "mt-1 text-[13px] text-slate-600 dark:text-slate-400 font-medium",
  PANEL_BODY: "px-6 py-5",
};

type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  type: "start" | "due" | "meeting";
  dealId?: string;
  workQueueId?: string;
};

type CreateEventForm = {
  title: string;
  date: string;
  time: string;
  duration: number;
  description: string;
};

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [createForm, setCreateForm] = useState<CreateEventForm>({
    title: "",
    date: "",
    time: "10:00",
    duration: 60,
    description: "",
  });
  const [creating, setCreating] = useState(false);

  // Mouse tracking for gradient
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePos({ x, y });
  }, []);

  // Float animation
  useEffect(() => {
    const styleId = "calendar-float-anim";
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @keyframes floatSlow { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
      @keyframes floatMedium { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
    `;
    document.head.appendChild(style);
  }, []);

  // Time of day
  const tod = getTimeOfDay();

  // AI Summary
  const summaryText = useMemo(() => {
    if (loading) return "カレンダーを読み込み中...";
    if (events.length === 0) return "今月の予定はありません。日付をクリックして予定を追加できます。";
    return `今月は${events.length}件の予定があります。`;
  }, [loading, events.length]);
  const typedSummary = useTypingEffect(summaryText, 25);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      try {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        const res = await fetch(`/api/calendar/events?year=${year}&month=${month}`, {
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error(`API error: ${res.status}`);
        }

        const json = await res.json();
        if (!alive) return;

        if (json.ok && Array.isArray(json.events)) {
          setEvents(json.events);
        } else {
          setEvents([]);
        }
      } catch (err) {
        console.error("カレンダーイベント取得エラー:", err);
        if (!alive) return;
        setEvents([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [currentDate]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const today = () => {
    setCurrentDate(new Date());
  };

  const days = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const getEventsForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return events.filter((e) => e.date === dateStr);
  };

  const isToday = (day: number) => {
    const now = new Date();
    return now.getFullYear() === year && now.getMonth() === month && now.getDate() === day;
  };

  const handleDateClick = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setSelectedDate(dateStr);
    setCreateForm({
      title: "",
      date: dateStr,
      time: "10:00",
      duration: 60,
      description: "",
    });
    setShowCreateModal(true);
  };

  const handleCreateEvent = async () => {
    if (!createForm.title || !createForm.date || !createForm.time) {
      alert("タイトル、日付、時刻は必須です");
      return;
    }

    setCreating(true);
    try {
      const response = await fetch("/api/calendar/create-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });

      const result = await response.json();

      if (result.ok) {
        alert("予定を作成しました！");
        setShowCreateModal(false);
        // カレンダーを再読み込み
        const res = await fetch(
          `/api/calendar/events?year=${currentDate.getFullYear()}&month=${currentDate.getMonth() + 1}`,
          { cache: "no-store" }
        );
        const json = await res.json();
        if (json.ok && Array.isArray(json.events)) {
          setEvents(json.events);
        }
      } else {
        if (response.status === 401) {
          alert("Googleカレンダー連携が必要です。「📆 Google連携」ボタンから連携してください。");
        } else {
          alert(`エラー: ${result.error?.message || "不明なエラー"}`);
        }
      }
    } catch (err: any) {
      console.error("Calendar event creation error:", err);
      alert(`エラー: ${err.message || "不明なエラー"}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div ref={containerRef} onMouseMove={handleMouseMove} className={UI.PAGE_BG}>
      {/* Premium background with floating blobs */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div
          className="absolute inset-0 transition-all duration-500"
          style={{
            background: `radial-gradient(ellipse 800px 600px at ${mousePos.x}% ${mousePos.y}%, rgba(139,92,246,0.08) 0%, transparent 50%)`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />
        <div
          className="absolute -left-32 top-24 h-64 w-64 rounded-full bg-indigo-400/15 dark:bg-indigo-600/10 blur-3xl"
          style={{ animation: "floatSlow 8s ease-in-out infinite" }}
        />
        <div
          className="absolute right-12 top-48 h-48 w-48 rounded-full bg-purple-400/15 dark:bg-purple-600/10 blur-3xl"
          style={{ animation: "floatMedium 6s ease-in-out infinite 1s" }}
        />
        <div
          className="absolute left-1/3 bottom-24 h-56 w-56 rounded-full bg-pink-400/10 dark:bg-pink-600/10 blur-3xl"
          style={{ animation: "floatSlow 7s ease-in-out infinite 2s" }}
        />
      </div>

      <div className="space-y-4">
        {/* Premium Header */}
        <div className={UI.PANEL}>
          <div className="relative px-6 py-5">
            <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-to-br from-indigo-300/20 to-purple-400/15 dark:from-indigo-600/15 dark:to-purple-700/10 blur-2xl" />

            <div className="flex flex-wrap items-start justify-between gap-4">
              {/* Left: Title & Summary */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{tod.icon}</span>
                  <span className="text-[13px] font-medium text-slate-600 dark:text-slate-400">{tod.greeting}</span>
                </div>
                <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Calendar</h1>
                <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">スケジュール管理</p>

                {/* AI Summary */}
                <div className="mt-3 rounded-lg border border-slate-200/60 dark:border-slate-700/60 bg-white/50 dark:bg-slate-900/50 px-4 py-2.5">
                  <div className="flex items-start gap-2">
                    <span className="text-base">✨</span>
                    <p className="text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed min-h-[20px]">
                      {typedSummary}
                      <span className="inline-block w-0.5 h-4 ml-0.5 bg-purple-500 animate-pulse align-middle" />
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-[13px] font-semibold text-slate-700 dark:text-slate-300 shadow-sm transition-all hover:bg-slate-50 dark:hover:bg-slate-700"
                    onClick={today}
                  >
                    今日
                  </button>
                  <Link
                    href="/api/calendar/auth/start"
                    className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-2 text-[13px] font-bold text-white shadow-md transition-all hover:shadow-lg hover:from-indigo-600 hover:to-purple-600"
                  >
                    Google連携
                  </Link>
                </div>
              </div>

              {/* Right: Month Display */}
              <div className="text-right">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">今月の予定</div>
                <div className="mt-1 text-[40px] font-extrabold tabular-nums text-slate-900 dark:text-slate-100">{events.length}</div>
              </div>
            </div>
          </div>
        </div>

        {/* カレンダー本体 */}
        <div className={UI.PANEL}>
          <div className={UI.PANEL_BODY}>
            {/* 月移動 */}
            <div className="flex items-center justify-between mb-6">
              <button
                type="button"
                className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-lg shadow-sm transition-all hover:bg-slate-50 dark:hover:bg-slate-700 hover:shadow-md hover:scale-105"
                onClick={prevMonth}
              >
                ‹
              </button>
              <div className="text-[20px] font-bold text-slate-900 dark:text-slate-100">
                {year}年 {month + 1}月
              </div>
              <button
                type="button"
                className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-lg shadow-sm transition-all hover:bg-slate-50 dark:hover:bg-slate-700 hover:shadow-md hover:scale-105"
                onClick={nextMonth}
              >
                ›
              </button>
            </div>

            {/* 曜日ヘッダー */}
            <div className="grid grid-cols-7 gap-2 mb-3">
              {[
                { label: "日", color: "text-rose-600 dark:text-rose-400" },
                { label: "月", color: "text-slate-700 dark:text-slate-300" },
                { label: "火", color: "text-slate-700 dark:text-slate-300" },
                { label: "水", color: "text-slate-700 dark:text-slate-300" },
                { label: "木", color: "text-slate-700 dark:text-slate-300" },
                { label: "金", color: "text-slate-700 dark:text-slate-300" },
                { label: "土", color: "text-blue-600 dark:text-blue-400" },
              ].map((day, i) => (
                <div key={day.label} className={`text-center text-[13px] font-bold py-2 ${day.color}`}>
                  {day.label}
                </div>
              ))}
            </div>

            {/* カレンダーグリッド */}
            <div className="grid grid-cols-7 gap-2">
              {days.map((day, index) => {
                if (day === null) {
                  return <div key={`empty-${index}`} className="aspect-square" />;
                }

                const dayEvents = getEventsForDate(day);
                const isTodayDate = isToday(day);
                const dayOfWeek = index % 7;

                return (
                  <button
                    type="button"
                    key={day}
                    onClick={() => handleDateClick(day)}
                    className={[
                      "group aspect-square rounded-xl p-2 overflow-hidden transition-all duration-200",
                      "hover:scale-105 hover:shadow-lg cursor-pointer",
                      isTodayDate
                        ? "bg-gradient-to-br from-indigo-500 to-purple-500 dark:from-indigo-600 dark:to-purple-600 text-white shadow-md ring-2 ring-indigo-300 dark:ring-indigo-500"
                        : "bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-slate-200/80 dark:border-slate-700/80 hover:bg-white/90 dark:hover:bg-slate-700/90 hover:border-indigo-300 dark:hover:border-indigo-500",
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "text-[14px] font-bold mb-1",
                        isTodayDate
                          ? "text-white"
                          : dayOfWeek === 0
                            ? "text-rose-600 dark:text-rose-400"
                            : dayOfWeek === 6
                              ? "text-blue-600 dark:text-blue-400"
                              : "text-slate-700 dark:text-slate-300",
                      ].join(" ")}
                    >
                      {day}
                    </div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((event) => (
                        <Link
                          key={event.id}
                          href={
                            event.dealId
                              ? `/deals/${event.dealId}`
                              : event.workQueueId
                                ? "/work-queue"
                                : "#"
                          }
                          onClick={(e) => e.stopPropagation()}
                          className={[
                            "block rounded-md px-1.5 py-0.5 text-[9px] font-bold truncate transition-all",
                            event.type === "start"
                              ? "bg-sky-100 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 hover:bg-sky-200 dark:hover:bg-sky-900/60"
                              : event.type === "due"
                                ? "bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/60"
                                : "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/60",
                          ].join(" ")}
                          title={event.title}
                        >
                          {event.title}
                        </Link>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-[9px] font-semibold text-slate-500 dark:text-slate-400">
                          +{dayEvents.length - 3}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* 凡例 */}
            <div className="mt-6 flex flex-wrap gap-4 text-[13px]">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-sky-100 dark:bg-sky-950/40 border-2 border-sky-300 dark:border-sky-700" />
                <span className="text-slate-700 dark:text-slate-300 font-medium">開始日</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-amber-100 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700" />
                <span className="text-slate-700 dark:text-slate-300 font-medium">完了予定</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-emerald-100 dark:bg-emerald-950/40 border-2 border-emerald-300 dark:border-emerald-700" />
                <span className="text-slate-700 dark:text-slate-300 font-medium">MTG予定</span>
              </div>
            </div>
          </div>
        </div>

        {/* 今後の予定リスト */}
        <div className={UI.PANEL}>
          <div className={UI.PANEL_HDR}>
            <div className="min-w-0">
              <div className={UI.PANEL_TITLE}>今後の予定</div>
              <div className={UI.PANEL_SUB}>直近の商談スケジュール</div>
            </div>
          </div>
          <div className={UI.PANEL_BODY}>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 dark:border-indigo-400 border-t-transparent" />
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">予定はありません</div>
            ) : (
              <div className="space-y-3">
                {events
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((event) => (
                    <div
                      key={event.id}
                      className="group flex items-center justify-between gap-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm px-4 py-3 transition-all hover:bg-white dark:hover:bg-slate-700/90 hover:shadow-md"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={[
                            "w-3 h-3 rounded-full shadow-sm",
                            event.type === "start"
                              ? "bg-sky-500 dark:bg-sky-400"
                              : event.type === "due"
                                ? "bg-amber-500 dark:bg-amber-400"
                                : "bg-emerald-500 dark:bg-emerald-400",
                          ].join(" ")}
                        />
                        <div>
                          <div className="text-[14px] font-bold text-slate-900 dark:text-slate-100">{event.title}</div>
                          <div className="text-[12px] text-slate-600 dark:text-slate-400 font-medium">{event.date}</div>
                        </div>
                      </div>
                      {event.dealId ? (
                        <Link
                          href={`/deals/${event.dealId}`}
                          className="text-[13px] font-bold text-indigo-700 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline transition-all"
                        >
                          詳細 →
                        </Link>
                      ) : event.workQueueId ? (
                        <Link
                          href="/work-queue"
                          className="text-[13px] font-bold text-indigo-700 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline transition-all"
                        >
                          Work Queue →
                        </Link>
                      ) : null}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 予定作成モーダル */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            {/* モーダルヘッダー */}
            <div className="border-b border-slate-200 dark:border-slate-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[18px] font-bold text-slate-900 dark:text-slate-100">新しい予定を作成</h2>
                  <p className="mt-1 text-[13px] text-slate-600 dark:text-slate-400">{selectedDate}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg p-2 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* モーダルボディ */}
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  タイトル <span className="text-rose-500 dark:text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="予定のタイトルを入力"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 px-4 py-2.5 text-[14px] focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-500/40 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    時刻 <span className="text-rose-500 dark:text-rose-400">*</span>
                  </label>
                  <input
                    type="time"
                    value={createForm.time}
                    onChange={(e) => setCreateForm({ ...createForm, time: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 px-4 py-2.5 text-[14px] focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-500/40 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-2">時間</label>
                  <select
                    value={createForm.duration}
                    onChange={(e) => setCreateForm({ ...createForm, duration: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 px-4 py-2.5 text-[14px] focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-500/40 transition-all"
                  >
                    <option value={30}>30分</option>
                    <option value={60}>1時間</option>
                    <option value={90}>1.5時間</option>
                    <option value={120}>2時間</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-2">メモ</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="予定の詳細やメモを入力（任意）"
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 px-4 py-2.5 text-[14px] focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-500/40 transition-all resize-none"
                />
              </div>
            </div>

            {/* モーダルフッター */}
            <div className="border-t border-slate-200 dark:border-slate-700 px-6 py-4 flex gap-3">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-[14px] font-semibold text-slate-700 dark:text-slate-300 shadow-sm transition-all hover:bg-slate-50 dark:hover:bg-slate-600"
                disabled={creating}
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleCreateEvent}
                disabled={creating || !createForm.title}
                className="flex-1 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 dark:from-indigo-600 dark:to-purple-600 px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm transition-all hover:from-indigo-600 hover:to-purple-600 dark:hover:from-indigo-700 dark:hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? "作成中..." : "作成"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
