// src/components/deals/TabBar.tsx
import type { TabKey } from "./types";

const UI = {
  PANEL: "rounded-md border-2 border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm",
};

export function TabBar({ tab, onTab }: { tab: TabKey; onTab: (t: TabKey) => void }) {
  const item = (key: TabKey, label: string) => {
    const active = tab === key;
    const cls = active
      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600 shadow-sm"
      : "bg-white/60 dark:bg-slate-700/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100";
    return (
      <button
        type="button"
        className={[
          "inline-flex items-center justify-center rounded-md border-2 px-3 py-1.5 text-[12px] font-semibold whitespace-nowrap",
          cls,
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40 dark:focus-visible:ring-indigo-500/40",
        ].join(" ")}
        onClick={() => onTab(key)}
      >
        {label}
      </button>
    );
  };

  return (
    <div className={[UI.PANEL, "bg-white/78 dark:bg-slate-800/78 backdrop-blur"].join(" ")}>
      <div className="px-2 py-2">
        <div className="flex items-center gap-2 overflow-x-auto">
          {item("overview", "概要")}
          {item("history", "履歴")}
          <div className="ml-auto pr-1" />
        </div>
      </div>
    </div>
  );
}
