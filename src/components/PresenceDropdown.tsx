"use client";

import { useEffect, useState } from "react";

type Presence = "working" | "away";

export default function PresenceDropdown() {
  const [status, setStatus] = useState<Presence>("working");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/presence?me=1", { cache: "no-store" });
        const json = await res.json();
        const s = json?.items?.[0]?.presence_status;
        if (s === "working" || s === "away") setStatus(s);
      } catch {}
    })();
  }, []);

  async function onChange(next: Presence) {
    setStatus(next);
    setLoading(true);
    try {
      await fetch("/api/presence", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <select
      className="border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-md px-2 py-1 text-sm"
      value={status}
      onChange={(e) => onChange(e.target.value as Presence)}
      disabled={loading}
    >
      <option value="working">作業中</option>
      <option value="away">離席中</option>
    </select>
  );
}
