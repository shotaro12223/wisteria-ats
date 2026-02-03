"use client";

import Link from "next/link";
import { useState } from "react";
import type { WorkQueueRow, WorkQueueStatus } from "@/lib/workQueue";



export function QuickActions({
  row,
  onMarkTouched,
  onStatusChange,
  onNoteEdit,
  onAssigneeEdit,
}: {
  row: WorkQueueRow;
  onMarkTouched: (row: WorkQueueRow) => void;
  onStatusChange: (row: WorkQueueRow, newStatus: WorkQueueStatus) => void;
  onNoteEdit: (row: WorkQueueRow) => void;
  onAssigneeEdit?: (row: WorkQueueRow) => void;
}) {
  const jobHref = row.companyId
    ? `/companies/${row.companyId}/jobs/${row.jobId}`
    : `/jobs/${row.jobId}`;

  const applicantsHref = row.companyId
    ? `/companies/${row.companyId}/jobs/${row.jobId}`
    : `/applicants?jobId=${row.jobId}`;

  return (
    <div className="flex items-center gap-1 flex-wrap">
      <Link
        href={jobHref}
        className="inline-flex items-center gap-1 rounded-md bg-white border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
        title="原稿を見る"
      >
        📄 原稿
      </Link>

      <Link
        href={applicantsHref}
        className="inline-flex items-center gap-1 rounded-md bg-white border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
        title="応募者を見る"
      >
        👥 応募
      </Link>

      <button
        type="button"
        onClick={() => onMarkTouched(row)}
        className="inline-flex items-center gap-1 rounded-md bg-white border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-colors"
        title="触ったマークをつける"
      >
        ✓ 触った
      </button>

      {onAssigneeEdit && (
        <button
          type="button"
          onClick={() => onAssigneeEdit(row)}
          className="inline-flex items-center gap-1 rounded-md bg-white border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-colors"
          title="担当者を割り当てる"
        >
          🎯 割り当て
        </button>
      )}

      <button
        type="button"
        onClick={() => onNoteEdit(row)}
        className="inline-flex items-center gap-1 rounded-md bg-white border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
        title="メモを編集"
      >
        📝 メモ
      </button>

      <StatusDropdown row={row} onStatusChange={onStatusChange} />
    </div>
  );
}

function StatusDropdown({
  row,
  onStatusChange,
}: {
  row: WorkQueueRow;
  onStatusChange: (row: WorkQueueRow, newStatus: WorkQueueStatus) => void;
}) {
  const [open, setOpen] = useState(false);

  const statuses: WorkQueueStatus[] = ["資料待ち", "媒体審査中", "NG", "停止中"];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 rounded-md bg-white border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
        title="ステータスを変更"
      >
        🔄 {row.status}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full mt-1 z-20 w-32 rounded-md border border-slate-200 bg-white shadow-lg">
            {statuses.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  onStatusChange(row, s);
                  setOpen(false);
                }}
                className={[
                  "w-full px-3 py-2 text-left text-[12px] font-semibold transition-colors",
                  s === row.status
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-700 hover:bg-slate-50",
                ].join(" ")}
              >
                {s}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}



export function BatchOperationsBar({
  selectedCount,
  onMarkAllTouched,
  onStatusChange,
  onAssigneeChange,
  onClearSelection,
}: {
  selectedCount: number;
  onMarkAllTouched: () => void;
  onStatusChange: (status: WorkQueueStatus) => void;
  onAssigneeChange: (assignee: string) => void;
  onClearSelection: () => void;
}) {
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [assigneeInput, setAssigneeInput] = useState("");

  if (selectedCount === 0) return null;

  const statuses: WorkQueueStatus[] = ["資料待ち", "媒体審査中", "NG", "停止中"];

  return (
    <div className="sticky top-0 z-30 rounded-lg border-2 border-indigo-300 bg-indigo-50 px-4 py-3 shadow-lg">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-indigo-700 px-3 py-1 text-sm font-bold text-white">
            {selectedCount}件選択中
          </span>
        </div>

        <div className="h-5 w-px bg-indigo-200" />

        <button
          type="button"
          onClick={onMarkAllTouched}
          className="rounded-md bg-white border border-indigo-200 px-3 py-1.5 text-[12px] font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors"
        >
          ✓ 全て触ったマーク
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
            className="rounded-md bg-white border border-indigo-200 px-3 py-1.5 text-[12px] font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors"
          >
            🔄 一括ステータス変更
          </button>

          {statusDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setStatusDropdownOpen(false)}
              />
              <div className="absolute left-0 top-full mt-1 z-20 w-40 rounded-md border border-slate-200 bg-white shadow-lg">
                {statuses.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      onStatusChange(s);
                      setStatusDropdownOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left text-[12px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={assigneeInput}
            onChange={(e) => setAssigneeInput(e.target.value)}
            placeholder="担当者名"
            className="rounded-md border border-indigo-200 px-2 py-1 text-[12px] w-24 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
          />
          <button
            type="button"
            onClick={() => {
              if (assigneeInput.trim()) {
                onAssigneeChange(assigneeInput.trim());
                setAssigneeInput("");
              }
            }}
            className="rounded-md bg-white border border-indigo-200 px-3 py-1.5 text-[12px] font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors"
          >
            担当設定
          </button>
        </div>

        <div className="ml-auto">
          <button
            type="button"
            onClick={onClearSelection}
            className="rounded-md bg-white border border-slate-200 px-3 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            選択解除
          </button>
        </div>
      </div>
    </div>
  );
}



export function ApplicantBadge({
  count,
  lastDate,
  lastDays,
}: {
  count?: number;
  lastDate?: string | null;
  lastDays?: number | null;
}) {
  if (!count || count === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
        応募: 0件
      </span>
    );
  }

  const isNew = lastDays != null && lastDays <= 1;
  const isRecent = lastDays != null && lastDays <= 3;

  return (
    <div className="inline-flex items-center gap-2">
      <span
        className={[
          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
          isNew
            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
            : isRecent
            ? "bg-blue-50 text-blue-800 border-blue-200"
            : "bg-slate-50 text-slate-700 border-slate-200",
        ].join(" ")}
      >
        👥 {count}件
        {isNew && <span className="text-[10px] font-bold">NEW</span>}
      </span>
      {lastDays !== null && (
        <span className="text-[10px] text-slate-500">
          最新: {lastDays === 0 ? "今日" : `${lastDays}日前`}
        </span>
      )}
    </div>
  );
}



export function AssigneeDisplay({
  assignee,
  deadline,
  onEdit,
}: {
  assignee?: string | null;
  deadline?: string | null;
  onEdit: () => void;
}) {
  const isOverdue = deadline && new Date(deadline) < new Date();

  return (
    <button
      type="button"
      onClick={onEdit}
      className="inline-flex items-center gap-2 rounded-md bg-white border border-slate-200 px-2 py-1 text-[11px] hover:bg-slate-50 hover:border-slate-300 transition-colors"
    >
      {assignee ? (
        <span className="font-semibold text-slate-900">{assignee}</span>
      ) : (
        <span className="text-slate-400">担当未設定</span>
      )}
      {deadline && (
        <span
          className={[
            "text-[10px] font-semibold",
            isOverdue ? "text-rose-700" : "text-slate-600",
          ].join(" ")}
        >
          {isOverdue ? "⚠️" : "📅"} {new Date(deadline).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}
        </span>
      )}
    </button>
  );
}
