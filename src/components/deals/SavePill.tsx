// src/components/deals/SavePill.tsx
import type { SaveStatus } from "./types";

function saveTone(sx: SaveStatus) {
  if (sx === "saving") return "bg-indigo-50 text-indigo-800 border-indigo-200";
  if (sx === "saved") return "bg-emerald-50 text-emerald-800 border-emerald-200";
  if (sx === "error") return "bg-rose-50 text-rose-800 border-rose-200";
  if (sx === "dirty") return "bg-amber-50 text-amber-900 border-amber-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

export function SavePill({ status }: { status: SaveStatus }) {
  const label =
    status === "saving"
      ? "保存中…"
      : status === "saved"
        ? "保存済み"
        : status === "error"
          ? "保存エラー"
          : status === "dirty"
            ? "未保存"
            : "—";
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold",
        saveTone(status),
      ].join(" ")}
      title={status === "dirty" ? "変更があります。保存してください。" : undefined}
    >
      {label}
    </span>
  );
}
