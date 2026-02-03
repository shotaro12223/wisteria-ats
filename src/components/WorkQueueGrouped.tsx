"use client";

import { useMemo, useState } from "react";
import type { WorkQueueRow } from "@/lib/workQueue";
import { ApplicantBadge, QuickActions } from "./WorkQueueComponents";

export type GroupBy = "urgency" | "company" | "site" | "assignee";

export function WorkQueueGrouped({
  rows,
  groupBy,
  onMarkTouched,
  onStatusChange,
  onNoteEdit,
  onAssigneeEdit,
  onCheckToggle,
}: {
  rows: WorkQueueRow[];
  groupBy: GroupBy;
  onMarkTouched: (row: WorkQueueRow) => void;
  onStatusChange: (row: WorkQueueRow, status: any) => void;
  onNoteEdit: (row: WorkQueueRow) => void;
  onAssigneeEdit: (row: WorkQueueRow) => void;
  onCheckToggle: (row: WorkQueueRow) => void;
}) {
  const groups = useMemo(() => {
    return groupRows(rows, groupBy);
  }, [rows, groupBy]);

  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <GroupSection
          key={group.key}
          group={group}
          onMarkTouched={onMarkTouched}
          onStatusChange={onStatusChange}
          onNoteEdit={onNoteEdit}
          onAssigneeEdit={onAssigneeEdit}
          onCheckToggle={onCheckToggle}
        />
      ))}
    </div>
  );
}

type Group = {
  key: string;
  label: string;
  count: number;
  tone: "danger" | "warn" | "info" | "normal";
  rows: WorkQueueRow[];
};

function groupRows(rows: WorkQueueRow[], groupBy: GroupBy): Group[] {
  if (groupBy === "urgency") {
    const urgent = rows.filter(
      (r) => (r.staleDays !== null && r.staleDays >= 7) || (r.rpoTouchedDays !== null && r.rpoTouchedDays >= 7) || r.status === "NG"
    );
    const warning = rows.filter(
      (r) =>
        !urgent.includes(r) &&
        ((r.staleDays !== null && r.staleDays >= 3) || (r.rpoTouchedDays !== null && r.rpoTouchedDays >= 3))
    );
    const normal = rows.filter((r) => !urgent.includes(r) && !warning.includes(r));

    return ([
      { key: "urgent", label: "【要注意】7日以上停滞 / NG", count: urgent.length, tone: "danger" as const, rows: urgent },
      { key: "warning", label: "【注意】3日以上停滞", count: warning.length, tone: "warn" as const, rows: warning },
      { key: "normal", label: "【正常】その他", count: normal.length, tone: "normal" as const, rows: normal },
    ] as Group[]).filter((g) => g.rows.length > 0);
  }

  if (groupBy === "company") {
    const byCompany = new Map<string, WorkQueueRow[]>();
    for (const row of rows) {
      const key = row.companyName || "(未設定)";
      if (!byCompany.has(key)) byCompany.set(key, []);
      byCompany.get(key)!.push(row);
    }

    return Array.from(byCompany.entries())
      .map(([key, rows]) => ({
        key,
        label: key,
        count: rows.length,
        tone: "info" as const,
        rows,
      }))
      .sort((a, b) => b.count - a.count);
  }

  if (groupBy === "site") {
    const bySite = new Map<string, WorkQueueRow[]>();
    for (const row of rows) {
      const key = row.siteKey || "(未設定)";
      if (!bySite.has(key)) bySite.set(key, []);
      bySite.get(key)!.push(row);
    }

    return Array.from(bySite.entries())
      .map(([key, rows]) => ({
        key,
        label: key,
        count: rows.length,
        tone: "info" as const,
        rows,
      }))
      .sort((a, b) => b.count - a.count);
  }

  if (groupBy === "assignee") {
    const byAssignee = new Map<string, WorkQueueRow[]>();
    for (const row of rows) {
      const key = row.assignee || "(未割当)";
      if (!byAssignee.has(key)) byAssignee.set(key, []);
      byAssignee.get(key)!.push(row);
    }

    return Array.from(byAssignee.entries())
      .map(([key, rows]) => ({
        key,
        label: key,
        count: rows.length,
        tone: "info" as const,
        rows,
      }))
      .sort((a, b) => b.count - a.count);
  }

  return [];
}

function GroupSection({
  group,
  onMarkTouched,
  onStatusChange,
  onNoteEdit,
  onAssigneeEdit,
  onCheckToggle,
}: {
  group: Group;
  onMarkTouched: (row: WorkQueueRow) => void;
  onStatusChange: (row: WorkQueueRow, status: any) => void;
  onNoteEdit: (row: WorkQueueRow) => void;
  onAssigneeEdit: (row: WorkQueueRow) => void;
  onCheckToggle: (row: WorkQueueRow) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const toneClasses = {
    danger: "bg-rose-50 border-rose-200 text-rose-900",
    warn: "bg-amber-50 border-amber-200 text-amber-900",
    info: "bg-blue-50 border-blue-200 text-blue-900",
    normal: "bg-slate-50 border-slate-200 text-slate-700",
  };

  return (
    <div className="rounded-lg border-2 border-slate-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className={[
          "w-full flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-slate-50",
        ].join(" ")}
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">
            {collapsed ? "▶" : "▼"}
          </span>
          <span className="text-[14px] font-bold text-slate-900">
            {group.label}
          </span>
          <span
            className={[
              "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold",
              toneClasses[group.tone],
            ].join(" ")}
          >
            {group.count}件
          </span>
        </div>
      </button>

      {!collapsed && (
        <div className="divide-y-2 divide-slate-200/60">
          {group.rows.map((row) => (
            <GroupedRow
              key={`${row.jobId}:${row.siteKey}`}
              row={row}
              onMarkTouched={onMarkTouched}
              onStatusChange={onStatusChange}
              onNoteEdit={onNoteEdit}
              onAssigneeEdit={onAssigneeEdit}
              onCheckToggle={onCheckToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function GroupedRow({
  row,
  onMarkTouched,
  onStatusChange,
  onNoteEdit,
  onAssigneeEdit,
  onCheckToggle,
}: {
  row: WorkQueueRow;
  onMarkTouched: (row: WorkQueueRow) => void;
  onStatusChange: (row: WorkQueueRow, status: any) => void;
  onNoteEdit: (row: WorkQueueRow) => void;
  onAssigneeEdit: (row: WorkQueueRow) => void;
  onCheckToggle: (row: WorkQueueRow) => void;
}) {
  return (
    <div className="group px-4 py-3 hover:bg-slate-50 transition-colors">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={row.checked ?? false}
          onChange={() => onCheckToggle(row)}
          className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        />

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold text-slate-500 truncate">
                {row.companyName}
              </div>
              <div className="text-[13px] font-bold text-slate-900 truncate">
                {row.jobTitle}
              </div>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                  {row.siteKey}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold">
                  {row.status}
                </span>
              </div>
            </div>

            <ApplicantBadge
              count={row.applicantCount}
              lastDate={row.lastApplicantDate}
              lastDays={row.lastApplicantDays}
            />
          </div>

          {(row.staleDays !== null || row.rpoTouchedDays !== null) && (
            <div className="flex items-center gap-3 text-[11px]">
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
                  滞留: {row.staleDays}日前
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
                  RPO: {row.rpoTouchedDays}日前
                </span>
              )}
              {row.assignee && (
                <button
                  onClick={() => onAssigneeEdit(row)}
                  className="font-semibold text-indigo-700 hover:underline"
                >
                  担当: {row.assignee}
                </button>
              )}
            </div>
          )}

          {row.state.note && (
            <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-700 line-clamp-2">
              {row.state.note}
            </div>
          )}

          <QuickActions
            row={row}
            onMarkTouched={onMarkTouched}
            onStatusChange={onStatusChange}
            onNoteEdit={onNoteEdit}
            onAssigneeEdit={onAssigneeEdit}
          />
        </div>
      </div>
    </div>
  );
}
