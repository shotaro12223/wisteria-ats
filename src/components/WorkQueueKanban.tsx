"use client";

import { useMemo, useState } from "react";
import type { WorkQueueRow, WorkQueueStatus } from "@/lib/workQueue";
import { ApplicantBadge, AssigneeDisplay } from "./WorkQueueComponents";

const STATUS_COLUMNS: WorkQueueStatus[] = ["資料待ち", "媒体審査中", "NG", "停止中"];

const STATUS_COLORS: Record<WorkQueueStatus, { bg: string; border: string; text: string }> = {
  資料待ち: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-900" },
  媒体審査中: { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-900" },
  NG: { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-900" },
  停止中: { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-700" },
};

export function WorkQueueKanban({
  rows,
  onStatusChange,
  onCardClick,
  onAssigneeEdit,
}: {
  rows: WorkQueueRow[];
  onStatusChange: (row: WorkQueueRow, newStatus: WorkQueueStatus) => void;
  onCardClick: (row: WorkQueueRow) => void;
  onAssigneeEdit: (row: WorkQueueRow) => void;
}) {
  const [draggedRow, setDraggedRow] = useState<WorkQueueRow | null>(null);

  const columnData = useMemo(() => {
    const result: Record<WorkQueueStatus, WorkQueueRow[]> = {
      資料待ち: [],
      媒体審査中: [],
      NG: [],
      停止中: [],
    };

    for (const row of rows) {
      if (result[row.status]) {
        result[row.status].push(row);
      }
    }

    return result;
  }, [rows]);

  function handleDragStart(row: WorkQueueRow) {
    setDraggedRow(row);
  }

  function handleDragEnd() {
    setDraggedRow(null);
  }

  function handleDrop(status: WorkQueueStatus) {
    if (draggedRow && draggedRow.status !== status) {
      onStatusChange(draggedRow, status);
    }
    setDraggedRow(null);
  }

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
      {STATUS_COLUMNS.map((status) => (
        <KanbanColumn
          key={status}
          status={status}
          rows={columnData[status]}
          isDragOver={draggedRow?.status !== status}
          onDrop={() => handleDrop(status)}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onCardClick={onCardClick}
          onAssigneeEdit={onAssigneeEdit}
        />
      ))}
    </div>
  );
}

function KanbanColumn({
  status,
  rows,
  isDragOver,
  onDrop,
  onDragStart,
  onDragEnd,
  onCardClick,
  onAssigneeEdit,
}: {
  status: WorkQueueStatus;
  rows: WorkQueueRow[];
  isDragOver: boolean;
  onDrop: () => void;
  onDragStart: (row: WorkQueueRow) => void;
  onDragEnd: () => void;
  onCardClick: (row: WorkQueueRow) => void;
  onAssigneeEdit: (row: WorkQueueRow) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const colors = STATUS_COLORS[status];

  return (
    <div
      className={[
        "rounded-lg border-2 p-3 transition-colors",
        dragOver && isDragOver ? "bg-blue-50 border-blue-300" : "bg-white border-slate-200",
      ].join(" ")}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        onDrop();
      }}
    >
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-[13px] font-bold text-slate-900">{status}</h3>
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
          {rows.length}
        </span>
      </div>

      <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
        {rows.map((row) => (
          <KanbanCard
            key={`${row.jobId}:${row.siteKey}`}
            row={row}
            colors={colors}
            onDragStart={() => onDragStart(row)}
            onDragEnd={onDragEnd}
            onClick={() => onCardClick(row)}
            onAssigneeEdit={() => onAssigneeEdit(row)}
          />
        ))}

        {rows.length === 0 && (
          <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-center text-[11px] text-slate-500">
            カードなし
          </div>
        )}
      </div>
    </div>
  );
}

function KanbanCard({
  row,
  colors,
  onDragStart,
  onDragEnd,
  onClick,
  onAssigneeEdit,
}: {
  row: WorkQueueRow;
  colors: { bg: string; border: string; text: string };
  onDragStart: () => void;
  onDragEnd: () => void;
  onClick: () => void;
  onAssigneeEdit: () => void;
}) {
  const isUrgent = (row.staleDays !== null && row.staleDays >= 7) || (row.rpoTouchedDays !== null && row.rpoTouchedDays >= 7);
  const isWarning = (row.staleDays !== null && row.staleDays >= 3) || (row.rpoTouchedDays !== null && row.rpoTouchedDays >= 3);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={[
        "group cursor-move rounded-lg border p-3 transition-all",
        colors.bg,
        colors.border,
        "hover:shadow-md hover:border-slate-400",
        isUrgent ? "ring-2 ring-rose-300" : isWarning ? "ring-1 ring-amber-300" : "",
      ].join(" ")}
    >
      <div className="mb-2">
        <div className="text-[11px] font-bold text-slate-500 truncate">
          {row.companyName}
        </div>
        <div className={["text-[12px] font-semibold truncate", colors.text].join(" ")}>
          {row.jobTitle}
        </div>
        <div className="mt-1 text-[10px] font-semibold text-slate-600">
          {row.siteKey}
        </div>
      </div>

      <div className="space-y-2">
        <ApplicantBadge
          count={row.applicantCount}
          lastDate={row.lastApplicantDate}
          lastDays={row.lastApplicantDays}
        />

        {(row.staleDays !== null || row.rpoTouchedDays !== null) && (
          <div className="flex items-center gap-2 text-[10px]">
            {row.staleDays !== null && (
              <span
                className={[
                  "font-semibold",
                  row.staleDays >= 7
                    ? "text-rose-700"
                    : row.staleDays >= 3
                    ? "text-amber-700"
                    : "text-slate-600",
                ].join(" ")}
              >
                滞留 {row.staleDays}日
              </span>
            )}
            {row.rpoTouchedDays !== null && (
              <span
                className={[
                  "font-semibold",
                  row.rpoTouchedDays >= 7
                    ? "text-rose-700"
                    : row.rpoTouchedDays >= 3
                    ? "text-amber-700"
                    : "text-slate-600",
                ].join(" ")}
              >
                RPO {row.rpoTouchedDays}日
              </span>
            )}
          </div>
        )}

        <div onClick={(e) => {
          e.stopPropagation();
          onAssigneeEdit();
        }}>
          <AssigneeDisplay
            assignee={row.assignee}
            deadline={row.deadline}
            onEdit={onAssigneeEdit}
          />
        </div>

        {row.state.note && (
          <div className="mt-2 rounded-md bg-white/70 border border-slate-200 px-2 py-1 text-[10px] text-slate-700 line-clamp-2">
            {row.state.note}
          </div>
        )}
      </div>
    </div>
  );
}
