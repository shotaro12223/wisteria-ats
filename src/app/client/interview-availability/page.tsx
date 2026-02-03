"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import ClientPortalLayout from "@/components/client/ClientPortalLayout";

type InterviewAvailability = {
  id: string;
  available_date: string;
  start_time: string;
  end_time: string;
  note: string | null;
  is_booked: boolean;
};

function formatTime(timeStr: string): string {
  return timeStr.slice(0, 5);
}

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const startPadding = firstDay.getDay();
  for (let i = startPadding - 1; i >= 0; i--) {
    days.push(new Date(year, month, -i));
  }

  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i));
  }

  const endPadding = 6 - lastDay.getDay();
  for (let i = 1; i <= endPadding; i++) {
    days.push(new Date(year, month + 1, i));
  }

  return days;
}

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isToday(date: Date): boolean {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

function isPast(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

function isWithinBuffer(date: Date, bufferDays: number): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const bufferEnd = new Date(today);
  bufferEnd.setDate(bufferEnd.getDate() + bufferDays);
  return date >= today && date <= bufferEnd;
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export default function InterviewAvailabilityPage() {
  const [availabilities, setAvailabilities] = useState<InterviewAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [defaultStartTime, setDefaultStartTime] = useState("10:00");
  const [defaultEndTime, setDefaultEndTime] = useState("18:00");
  const [bufferDays, setBufferDays] = useState(2); // 当日=0, 翌日まで=1, 翌々日まで=2

  // Load buffer days from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("interview_buffer_days");
    if (saved) setBufferDays(parseInt(saved, 10));
  }, []);

  // Save buffer days to localStorage
  const handleBufferDaysChange = (days: number) => {
    setBufferDays(days);
    localStorage.setItem("interview_buffer_days", days.toString());
  };

  // Drag selection
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<"add" | "remove" | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Map<string, "add" | "remove">>(new Map());
  const calendarRef = useRef<HTMLDivElement>(null);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const days = getDaysInMonth(currentYear, currentMonth);

  // Map for quick lookup
  const availabilityMap = new Map(availabilities.map(a => [a.available_date, a]));

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/client/interview-availability", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.ok) setAvailabilities(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Mouse up handler for drag end
  useEffect(() => {
    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        setDragMode(null);
      }
    };
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [isDragging]);

  const handleDateMouseDown = (date: Date, e: React.MouseEvent) => {
    if (isPast(date) || date.getMonth() !== currentMonth) return;
    e.preventDefault();

    const dateStr = toDateString(date);
    const existing = availabilityMap.get(dateStr);

    // Determine mode based on current state
    const currentPending = pendingChanges.get(dateStr);
    let newMode: "add" | "remove";

    if (existing && !existing.is_booked) {
      // Has availability, not booked -> can remove
      newMode = currentPending === "remove" ? "add" : "remove";
    } else if (!existing) {
      // No availability -> can add
      newMode = currentPending === "add" ? "remove" : "add";
    } else {
      return; // Booked, can't change
    }

    setIsDragging(true);
    setDragMode(newMode);
    togglePendingChange(dateStr, existing, newMode);
  };

  const handleDateMouseEnter = (date: Date) => {
    if (!isDragging || !dragMode || isPast(date) || date.getMonth() !== currentMonth) return;

    const dateStr = toDateString(date);
    const existing = availabilityMap.get(dateStr);

    if (existing?.is_booked) return;

    // Apply same action as drag mode
    if (dragMode === "add" && !existing) {
      togglePendingChange(dateStr, existing, "add");
    } else if (dragMode === "remove" && existing) {
      togglePendingChange(dateStr, existing, "remove");
    }
  };

  const togglePendingChange = (
    dateStr: string,
    existing: InterviewAvailability | undefined,
    mode: "add" | "remove"
  ) => {
    setPendingChanges(prev => {
      const next = new Map(prev);
      const current = next.get(dateStr);

      if (mode === "add" && !existing) {
        if (current === "add") {
          next.delete(dateStr);
        } else {
          next.set(dateStr, "add");
        }
      } else if (mode === "remove" && existing && !existing.is_booked) {
        if (current === "remove") {
          next.delete(dateStr);
        } else {
          next.set(dateStr, "remove");
        }
      }

      return next;
    });
  };

  const handleSaveChanges = async () => {
    if (pendingChanges.size === 0) return;

    setSaving(true);
    let addCount = 0;
    let removeCount = 0;
    let failCount = 0;

    const adds = Array.from(pendingChanges.entries()).filter(([, action]) => action === "add");
    const removes = Array.from(pendingChanges.entries()).filter(([, action]) => action === "remove");

    // Process adds
    for (const [dateStr] of adds) {
      try {
        const res = await fetch("/api/client/interview-availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            available_date: dateStr,
            start_time: defaultStartTime,
            end_time: defaultEndTime,
          }),
        });
        if ((await res.json()).ok) addCount++;
        else failCount++;
      } catch {
        failCount++;
      }
    }

    // Process removes
    for (const [dateStr] of removes) {
      const existing = availabilityMap.get(dateStr);
      if (!existing) continue;
      try {
        const res = await fetch(`/api/client/interview-availability?id=${existing.id}`, {
          method: "DELETE",
        });
        if ((await res.json()).ok) removeCount++;
        else failCount++;
      } catch {
        failCount++;
      }
    }

    setPendingChanges(new Map());
    await loadData();
    setSaving(false);

    const messages: string[] = [];
    if (addCount > 0) messages.push(`${addCount}件追加`);
    if (removeCount > 0) messages.push(`${removeCount}件削除`);
    if (messages.length > 0) setSuccessMessage(messages.join("、"));
    if (failCount > 0) setError(`${failCount}件の処理に失敗しました`);
  };

  const handleClearChanges = () => {
    setPendingChanges(new Map());
  };

  const prevMonth = () => setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Count pending changes
  const pendingAdds = Array.from(pendingChanges.values()).filter(v => v === "add").length;
  const pendingRemoves = Array.from(pendingChanges.values()).filter(v => v === "remove").length;
  const hasPendingChanges = pendingChanges.size > 0;

  return (
    <ClientPortalLayout>
      <div className="flex flex-col">
        {/* Header */}
        <div className="mb-4 lg:mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-4">
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-slate-900">面接対応可能日</h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                日付をタップ・ドラッグして選択 → 保存
              </p>
            </div>

            {/* Settings */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 self-start lg:self-auto">
              {/* Buffer Days Setting */}
              <div className="flex items-center gap-1.5 sm:gap-2 bg-white/80 backdrop-blur-sm px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border border-slate-200/80 shadow-sm">
                <span className="text-[10px] sm:text-xs font-medium text-slate-500">直近NG</span>
                <select
                  value={bufferDays}
                  onChange={(e) => handleBufferDaysChange(parseInt(e.target.value, 10))}
                  className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-rose-50 border-0 rounded-lg text-xs sm:text-sm font-medium text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
                >
                  <option value={0}>なし</option>
                  <option value={1}>翌日まで</option>
                  <option value={2}>翌々日まで</option>
                  <option value={3}>3日後まで</option>
                  <option value={7}>1週間</option>
                </select>
              </div>

              {/* Time Settings */}
              <div className="flex items-center gap-1.5 sm:gap-2 bg-white/80 backdrop-blur-sm px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border border-slate-200/80 shadow-sm">
                <span className="text-[10px] sm:text-xs font-medium text-slate-500">時間</span>
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <select
                    value={defaultStartTime}
                    onChange={(e) => setDefaultStartTime(e.target.value)}
                    className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-slate-50 border-0 rounded-lg text-xs sm:text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    {Array.from({ length: 14 }, (_, i) => i + 8).map((h) => (
                      <option key={h} value={`${h.toString().padStart(2, "0")}:00`}>{h}:00</option>
                    ))}
                  </select>
                  <span className="text-slate-300 text-xs">—</span>
                  <select
                    value={defaultEndTime}
                    onChange={(e) => setDefaultEndTime(e.target.value)}
                    className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-slate-50 border-0 rounded-lg text-xs sm:text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    {Array.from({ length: 14 }, (_, i) => i + 8).map((h) => (
                      <option key={h} value={`${h.toString().padStart(2, "0")}:00`}>{h}:00</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        {successMessage && (
          <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-700 animate-fadeIn">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-xs sm:text-sm font-medium">{successMessage}</span>
          </div>
        )}

        {error && (
          <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 animate-fadeIn">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs sm:text-sm font-medium">{error}</span>
          </div>
        )}

        {/* Calendar Container */}
        <div className="flex flex-col bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          {/* Calendar Header */}
          <div className="flex items-center justify-between px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 lg:py-4 bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
            <button
              onClick={prevMonth}
              className="p-1.5 sm:p-2 lg:p-2.5 hover:bg-white dark:hover:bg-slate-600 rounded-xl transition-all duration-200 active:scale-95"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
              <h2 className="text-base sm:text-lg lg:text-xl font-bold text-slate-800 dark:text-slate-100">
                <span className="hidden sm:inline">{currentYear}年 </span>
                <span className="text-indigo-600 dark:text-indigo-400">{currentMonth + 1}月</span>
                <span className="sm:hidden text-slate-400 dark:text-slate-500 text-sm font-normal ml-1">{currentYear}</span>
              </h2>
              <button
                onClick={goToToday}
                className="px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
              >
                今日
              </button>
            </div>

            <button
              onClick={nextMonth}
              className="p-1.5 sm:p-2 lg:p-2.5 hover:bg-white dark:hover:bg-slate-600 rounded-xl transition-all duration-200 active:scale-95"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 bg-slate-100 dark:bg-slate-700">
            {WEEKDAYS.map((day, i) => (
              <div
                key={day}
                className={`py-1.5 sm:py-2 lg:py-3 text-center text-[10px] sm:text-xs lg:text-sm font-semibold tracking-wide ${
                  i === 0 ? "text-rose-500" : i === 6 ? "text-blue-500" : "text-slate-600 dark:text-slate-300"
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid - cells expand vertically on narrow screens */}
          <div
            ref={calendarRef}
            className="grid grid-cols-7 select-none bg-white dark:bg-slate-800"
            onMouseLeave={() => setIsDragging(false)}
          >
            {loading ? (
              <div className="col-span-7 min-h-[400px] flex items-center justify-center bg-white dark:bg-slate-800">
                <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                  <div className="w-6 h-6 border-2 border-slate-200 dark:border-slate-600 border-t-indigo-600 rounded-full animate-spin"></div>
                  <span className="text-sm font-medium">読み込み中...</span>
                </div>
              </div>
            ) : (
              days.map((date, index) => {
                const dateStr = toDateString(date);
                const isCurrentMonth = date.getMonth() === currentMonth;
                const availability = availabilityMap.get(dateStr);
                const past = isPast(date);
                const today = isToday(date);
                const dayOfWeek = date.getDay();
                const pendingAction = pendingChanges.get(dateStr);

                // Determine visual state
                const isRegistered = !!availability;
                const isBooked = availability?.is_booked;
                const willBeAdded = pendingAction === "add";
                const willBeRemoved = pendingAction === "remove";
                const inBuffer = isWithinBuffer(date, bufferDays);

                const canInteract = !past && !inBuffer && isCurrentMonth && !isBooked;

                return (
                  <div
                    key={index}
                    onMouseDown={(e) => canInteract && handleDateMouseDown(date, e)}
                    onMouseEnter={() => canInteract && handleDateMouseEnter(date)}
                    className={`
                      relative min-h-[72px] sm:min-h-[80px] lg:min-h-[90px] border-b border-r border-slate-200 dark:border-slate-600 transition-all duration-150
                      ${!isCurrentMonth ? "bg-slate-100/50 dark:bg-slate-700/50" : "bg-white dark:bg-slate-800"}
                      ${past ? "opacity-40" : ""}
                      ${inBuffer && !past ? "bg-rose-50/50 dark:bg-rose-900/20" : ""}
                      ${canInteract ? "cursor-pointer" : "cursor-default"}
                      ${today ? "ring-2 ring-inset ring-indigo-400" : ""}
                      ${canInteract && !isRegistered && !willBeAdded ? "hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20" : ""}
                      ${canInteract && isRegistered && !willBeRemoved ? "hover:bg-rose-50/50 dark:hover:bg-rose-900/20" : ""}
                    `}
                  >
                    {/* Background state indicator */}
                    <div className={`
                      absolute inset-0.5 sm:inset-1 rounded-lg sm:rounded-xl transition-all duration-200
                      ${isRegistered && !willBeRemoved ? "bg-gradient-to-br from-indigo-500 to-violet-500 shadow-md sm:shadow-lg shadow-indigo-200/50" : ""}
                      ${willBeAdded ? "bg-gradient-to-br from-emerald-400 to-teal-500 shadow-md sm:shadow-lg shadow-emerald-200/50 animate-pulse" : ""}
                      ${willBeRemoved ? "bg-gradient-to-br from-rose-400 to-pink-500 shadow-md sm:shadow-lg shadow-rose-200/50 animate-pulse" : ""}
                      ${isBooked ? "bg-gradient-to-br from-amber-400 to-orange-500 shadow-md sm:shadow-lg shadow-amber-200/50" : ""}
                    `} />

                    {/* Content */}
                    <div className="relative h-full flex flex-col p-1 sm:p-1.5 lg:p-2">
                      {/* Date Number */}
                      <div className={`
                        text-xs sm:text-sm lg:text-base font-semibold leading-none
                        ${isRegistered || willBeAdded || willBeRemoved || isBooked ? "text-white" : ""}
                        ${!isCurrentMonth && !isRegistered ? "text-slate-400 dark:text-slate-500" : ""}
                        ${isCurrentMonth && !isRegistered && !willBeAdded && !willBeRemoved ? (
                          dayOfWeek === 0 ? "text-rose-500" : dayOfWeek === 6 ? "text-blue-500" : "text-slate-800 dark:text-slate-200"
                        ) : ""}
                      `}>
                        {date.getDate()}
                      </div>

                      {/* Time display for registered dates */}
                      {(isRegistered || willBeAdded) && !willBeRemoved && (
                        <div className="mt-auto hidden sm:block">
                          <div className="text-[9px] sm:text-[10px] lg:text-xs font-medium text-white/90 truncate">
                            {willBeAdded ? (
                              <>{defaultStartTime.slice(0, 2)}〜{defaultEndTime.slice(0, 2)}</>
                            ) : availability ? (
                              <>{formatTime(availability.start_time).slice(0, 2)}〜{formatTime(availability.end_time).slice(0, 2)}</>
                            ) : null}
                          </div>
                        </div>
                      )}

                      {/* Status badges */}
                      {inBuffer && !past && isCurrentMonth && !isRegistered && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-[9px] sm:text-[10px] font-bold text-rose-400/80 bg-white/60 px-1 rounded">
                            NG
                          </div>
                        </div>
                      )}

                      {isBooked && (
                        <div className="absolute bottom-0.5 right-0.5 sm:bottom-1 sm:right-1">
                          <div className="px-0.5 sm:px-1 py-0.5 bg-white/30 backdrop-blur-sm rounded text-[7px] sm:text-[9px] font-bold text-white">
                            予約
                          </div>
                        </div>
                      )}

                      {willBeAdded && (
                        <div className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1">
                          <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                          </svg>
                        </div>
                      )}

                      {willBeRemoved && (
                        <div className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1">
                          <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Action Bar */}
          <div className="border-t border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 lg:py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
              {/* Legend - hidden on mobile when there are pending changes */}
              <div className={`flex flex-wrap items-center gap-2 sm:gap-3 lg:gap-4 text-[10px] sm:text-xs ${hasPendingChanges ? "hidden sm:flex" : "flex"}`}>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-md bg-gradient-to-br from-indigo-500 to-violet-500 shadow-sm" />
                  <span className="text-slate-600 dark:text-slate-300 font-medium">対応可能</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-md bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm" />
                  <span className="text-slate-600 dark:text-slate-300 font-medium">予約済</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-md bg-rose-100 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-700 flex items-center justify-center">
                    <span className="text-[6px] sm:text-[7px] font-bold text-rose-400">NG</span>
                  </div>
                  <span className="text-slate-600 dark:text-slate-300 font-medium">直近NG</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-md bg-gradient-to-br from-emerald-400 to-teal-500 shadow-sm" />
                  <span className="text-slate-600 dark:text-slate-300 font-medium">追加</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-md bg-gradient-to-br from-rose-400 to-pink-500 shadow-sm" />
                  <span className="text-slate-600 dark:text-slate-300 font-medium">削除</span>
                </div>
              </div>

              {/* Action Buttons */}
              {hasPendingChanges && (
                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="text-xs sm:text-sm font-medium">
                    {pendingAdds > 0 && <span className="text-emerald-600">+{pendingAdds}</span>}
                    {pendingAdds > 0 && pendingRemoves > 0 && <span className="text-slate-300 mx-1">/</span>}
                    {pendingRemoves > 0 && <span className="text-rose-600">-{pendingRemoves}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleClearChanges}
                      className="px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      リセット
                    </button>
                    <button
                      onClick={handleSaveChanges}
                      disabled={saving}
                      className="px-3 sm:px-4 py-1.5 text-[11px] sm:text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 rounded-lg hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 transition-all shadow-md shadow-indigo-200/50 hover:shadow-lg active:scale-95"
                    >
                      {saving ? (
                        <span className="flex items-center gap-1.5">
                          <svg className="animate-spin h-3 w-3 sm:h-3.5 sm:w-3.5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          保存中
                        </span>
                      ) : (
                        "保存"
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-3 sm:mt-4 text-[10px] sm:text-xs text-slate-400 text-center">
          タップで選択・解除 / ドラッグで複数選択
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </ClientPortalLayout>
  );
}
