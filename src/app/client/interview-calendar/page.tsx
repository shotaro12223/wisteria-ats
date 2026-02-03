"use client";

import { useEffect, useState, useMemo } from "react";
import type { ReactElement } from "react";
import ClientPortalLayout from "@/components/client/ClientPortalLayout";
import Link from "next/link";

type InterviewSchedule = {
  id: string;
  company_id: string;
  applicant_id: string;
  job_id: string | null;
  interview_date: string;
  start_time: string;
  end_time: string | null;
  location: string | null;
  interview_type: string;
  meeting_url: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  applicants: {
    id: string;
    name: string;
    status: string;
  } | null;
  jobs: {
    id: string;
    job_title: string;
  } | null;
};

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  scheduled: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  completed: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  cancelled: { bg: "bg-slate-50 dark:bg-slate-800", text: "text-slate-500 dark:text-slate-400", border: "border-slate-200 dark:border-slate-700" },
  no_show: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: "予定",
  completed: "完了",
  cancelled: "キャンセル",
  no_show: "無断欠席",
};

const TYPE_LABELS: Record<string, { label: string; icon: ReactElement }> = {
  onsite: {
    label: "対面",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  online: {
    label: "オンライン",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
  },
  phone: {
    label: "電話",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
    ),
  },
};

export default function InterviewCalendarPage() {
  const [schedules, setSchedules] = useState<InterviewSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Load schedules
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // Get 3 months of data centered on current month
        const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
        const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 2, 0);

        const params = new URLSearchParams({
          start: startDate.toISOString().split("T")[0],
          end: endDate.toISOString().split("T")[0],
        });

        const res = await fetch(`/api/client/interview-schedules?${params}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (data.ok) {
          setSchedules(data.data || []);
        }
      } catch (e) {
        console.error("Failed to load schedules:", e);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [currentMonth]);

  // Group schedules by date
  const schedulesByDate = useMemo(() => {
    const map = new Map<string, InterviewSchedule[]>();
    for (const schedule of schedules) {
      const dateKey = schedule.interview_date;
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(schedule);
    }
    return map;
  }, [schedules]);

  // Calendar generation
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // Next month days
    const remainingDays = 42 - days.length; // 6 weeks
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  }, [currentMonth]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const formatTime = (time: string) => {
    const [h, m] = time.split(":");
    return `${h}:${m}`;
  };

  const selectedSchedules = selectedDate ? schedulesByDate.get(selectedDate) || [] : [];

  // Upcoming interviews for list view
  const upcomingSchedules = useMemo(() => {
    const todayStr = today.toISOString().split("T")[0];
    return schedules
      .filter((s) => s.interview_date >= todayStr && s.status === "scheduled")
      .sort((a, b) => {
        if (a.interview_date !== b.interview_date) {
          return a.interview_date.localeCompare(b.interview_date);
        }
        return a.start_time.localeCompare(b.start_time);
      });
  }, [schedules, today]);

  return (
    <ClientPortalLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
              面接カレンダー
            </h1>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1">
              {upcomingSchedules.length > 0
                ? `今後${upcomingSchedules.length}件の面接予定`
                : "現在予定されている面接はありません"}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode("calendar")}
              className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${
                viewMode === "calendar"
                  ? "bg-slate-900 text-white"
                  : "bg-white border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-800"
              }`}
            >
              カレンダー
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${
                viewMode === "list"
                  ? "bg-slate-900 text-white"
                  : "bg-white border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-800"
              }`}
            >
              リスト
            </button>
          </div>
        </div>

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
        ) : viewMode === "calendar" ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-sm overflow-hidden">
              {/* Month Navigation */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <button
                  onClick={() =>
                    setCurrentMonth(
                      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
                    )
                  }
                  className="p-2 rounded-lg hover:bg-slate-100 dark:bg-slate-700 transition-colors"
                >
                  <svg className="w-4 h-4 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h2 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">
                  {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
                </h2>
                <button
                  onClick={() =>
                    setCurrentMonth(
                      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
                    )
                  }
                  className="p-2 rounded-lg hover:bg-slate-100 dark:bg-slate-700 transition-colors"
                >
                  <svg className="w-4 h-4 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Weekday Headers */}
              <div className="grid grid-cols-7 border-b border-slate-100">
                {["日", "月", "火", "水", "木", "金", "土"].map((day, i) => (
                  <div
                    key={day}
                    className={`py-2.5 text-center text-[11px] font-medium ${
                      i === 0 ? "text-rose-500" : i === 6 ? "text-blue-500" : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7">
                {calendarDays.map((dayInfo, index) => {
                  const dateKey = dayInfo.date.toISOString().split("T")[0];
                  const daySchedules = schedulesByDate.get(dateKey) || [];
                  const isToday = dayInfo.date.getTime() === today.getTime();
                  const isSelected = dateKey === selectedDate;
                  const dayOfWeek = dayInfo.date.getDay();

                  return (
                    <button
                      key={index}
                      onClick={() => setSelectedDate(dateKey)}
                      className={`relative min-h-[70px] sm:min-h-[90px] p-1.5 border-b border-r border-slate-100 transition-all hover:bg-slate-50 dark:bg-slate-800 text-left ${
                        !dayInfo.isCurrentMonth ? "bg-slate-50 dark:bg-slate-800/30" : ""
                      } ${isSelected ? "ring-2 ring-inset ring-indigo-500 bg-indigo-50/50" : ""}`}
                    >
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[12px] font-medium ${
                          isToday
                            ? "bg-indigo-500 text-white"
                            : !dayInfo.isCurrentMonth
                            ? "text-slate-300"
                            : dayOfWeek === 0
                            ? "text-rose-500"
                            : dayOfWeek === 6
                            ? "text-blue-500"
                            : "text-slate-700 dark:text-slate-200"
                        }`}
                      >
                        {dayInfo.date.getDate()}
                      </span>

                      {/* Interview indicators */}
                      <div className="mt-1 space-y-0.5">
                        {daySchedules.slice(0, 2).map((schedule) => (
                          <div
                            key={schedule.id}
                            className={`px-1 py-0.5 rounded text-[9px] font-medium truncate ${
                              schedule.status === "scheduled"
                                ? "bg-indigo-100 text-indigo-700"
                                : schedule.status === "completed"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                            }`}
                          >
                            {formatTime(schedule.start_time)} {schedule.applicants?.name}
                          </div>
                        ))}
                        {daySchedules.length > 2 && (
                          <div className="px-1 py-0.5 text-[9px] text-slate-500 dark:text-slate-400 font-medium">
                            +{daySchedules.length - 2}件
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Date Details */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">
                  {selectedDate
                    ? new Date(selectedDate + "T00:00:00").toLocaleDateString("ja-JP", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        weekday: "short",
                      })
                    : "日付を選択してください"}
                </h3>
              </div>

              <div className="p-4 max-h-[500px] overflow-y-auto">
                {!selectedDate ? (
                  <div className="text-center py-8">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-3">
                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                      </svg>
                    </div>
                    <p className="text-[13px] text-slate-500 dark:text-slate-400">カレンダーから日付を選択</p>
                  </div>
                ) : selectedSchedules.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-[13px] text-slate-500 dark:text-slate-400">この日の面接予定はありません</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedSchedules.map((schedule) => {
                      const statusStyle = STATUS_COLORS[schedule.status] || STATUS_COLORS.scheduled;
                      const typeInfo = TYPE_LABELS[schedule.interview_type] || TYPE_LABELS.onsite;

                      return (
                        <div
                          key={schedule.id}
                          className={`p-4 rounded-lg border ${statusStyle.border} ${statusStyle.bg}`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[15px] font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                                {formatTime(schedule.start_time)}
                              </span>
                              {schedule.end_time && (
                                <>
                                  <span className="text-slate-400 text-[13px]">〜</span>
                                  <span className="text-[13px] text-slate-600 dark:text-slate-300 tabular-nums">
                                    {formatTime(schedule.end_time)}
                                  </span>
                                </>
                              )}
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${statusStyle.text}`}>
                              {STATUS_LABELS[schedule.status]}
                            </span>
                          </div>

                          <Link
                            href={`/client/applicants/${schedule.applicant_id}`}
                            className="block mb-1 hover:underline"
                          >
                            <span className="text-[13px] font-medium text-slate-900 dark:text-slate-100 hover:text-indigo-600">
                              {schedule.applicants?.name || "応募者"}
                            </span>
                          </Link>

                          {schedule.jobs && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                              {schedule.jobs.job_title}
                            </p>
                          )}

                          <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                            <div className="flex items-center gap-1">
                              <div className="w-3.5 h-3.5">{typeInfo.icon}</div>
                              <span>{typeInfo.label}</span>
                            </div>
                            {schedule.location && (
                              <div className="flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span>{schedule.location}</span>
                              </div>
                            )}
                          </div>

                          {schedule.meeting_url && schedule.interview_type === "online" && (
                            <a
                              href={schedule.meeting_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 dark:border-slate-700 text-indigo-600 text-[12px] font-medium hover:bg-slate-50 dark:bg-slate-800 transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                              会議に参加
                            </a>
                          )}

                          {schedule.notes && (
                            <p className="mt-2 text-[11px] text-slate-600 dark:text-slate-300 bg-white/60 rounded p-2">
                              {schedule.notes}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* List View */
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">今後の面接予定</h3>
            </div>

            {upcomingSchedules.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                </div>
                <p className="text-[14px] font-medium text-slate-700 dark:text-slate-200">予定されている面接はありません</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {upcomingSchedules.map((schedule) => {
                  const typeInfo = TYPE_LABELS[schedule.interview_type] || TYPE_LABELS.onsite;
                  const interviewDate = new Date(schedule.interview_date + "T00:00:00");
                  const isToday = interviewDate.toDateString() === today.toDateString();
                  const isTomorrow =
                    interviewDate.getTime() === today.getTime() + 86400000;

                  return (
                    <div
                      key={schedule.id}
                      className="flex items-center gap-5 px-5 py-4 hover:bg-slate-50 dark:bg-slate-800/50 transition-colors"
                    >
                      {/* Date */}
                      <div className="flex-shrink-0 w-16 text-center">
                        {isToday ? (
                          <div className="px-2 py-1.5 rounded-lg bg-indigo-500 text-white">
                            <p className="text-[10px] font-medium">今日</p>
                            <p className="text-[14px] font-semibold tabular-nums">
                              {formatTime(schedule.start_time)}
                            </p>
                          </div>
                        ) : isTomorrow ? (
                          <div className="px-2 py-1.5 rounded-lg bg-indigo-100 text-indigo-700">
                            <p className="text-[10px] font-medium">明日</p>
                            <p className="text-[14px] font-semibold tabular-nums">
                              {formatTime(schedule.start_time)}
                            </p>
                          </div>
                        ) : (
                          <div className="px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                            <p className="text-[10px] font-medium">
                              {interviewDate.toLocaleDateString("ja-JP", {
                                month: "short",
                                day: "numeric",
                              })}
                            </p>
                            <p className="text-[14px] font-semibold tabular-nums">
                              {formatTime(schedule.start_time)}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/client/applicants/${schedule.applicant_id}`}
                          className="text-[13px] font-medium text-slate-900 dark:text-slate-100 hover:text-indigo-600 hover:underline"
                        >
                          {schedule.applicants?.name || "応募者"}
                        </Link>
                        {schedule.jobs && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {schedule.jobs.job_title}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                          <div className="flex items-center gap-1">
                            <div className="w-3.5 h-3.5">{typeInfo.icon}</div>
                            <span>{typeInfo.label}</span>
                          </div>
                          {schedule.location && <span>{schedule.location}</span>}
                        </div>
                      </div>

                      {/* Action */}
                      {schedule.meeting_url && schedule.interview_type === "online" && (
                        <a
                          href={schedule.meeting_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 px-3 py-2 rounded-lg bg-indigo-500 text-white text-[12px] font-medium hover:bg-indigo-600 transition-colors"
                        >
                          会議に参加
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </ClientPortalLayout>
  );
}
