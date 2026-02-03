"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type DealDraft = {
  title?: string | null;
  stage?: string | null;
  start_date?: string | null;
  due_date?: string | null;
  amount?: number | null;
  probability?: number | null;
  memo?: string | null;
  is_won?: boolean | null;
};

function isYmd(s: string) {
  // YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map((x) => Number(x));
  if (!y || !m || !d) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  // 日付実在チェック
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

function asIntOrNull(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

export function useDebouncedDealAutosave(args: {
  dealId: string;
  getDraft: () => DealDraft;
  onSaved?: () => void;
  debounceMs?: number;
}) {
  const { dealId, getDraft, onSaved, debounceMs = 800 } = args;

  const [state, setState] = useState<"idle" | "dirty" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<Record<string, string>>({});

  const timerRef = useRef<any>(null);
  const lastSentRef = useRef<string>("");

  const validate = useCallback((draft: DealDraft) => {
    const v: Record<string, string> = {};

    if (draft.start_date) {
      if (!isYmd(String(draft.start_date))) v["start_date"] = "開始日は YYYY-MM-DD 形式で入力してください";
    }
    if (draft.due_date) {
      if (!isYmd(String(draft.due_date))) v["due_date"] = "完了予定は YYYY-MM-DD 形式で入力してください";
    }

    if (draft.amount !== null && draft.amount !== undefined) {
      const n = asIntOrNull(draft.amount);
      if (n === null) v["amount"] = "金額は数値で入力してください";
      if (n !== null && n < 0) v["amount"] = "金額は0以上で入力してください";
    }

    if (draft.probability !== null && draft.probability !== undefined) {
      const n = asIntOrNull(draft.probability);
      if (n === null) v["probability"] = "確度は数値で入力してください";
      if (n !== null && (n < 0 || n > 100)) v["probability"] = "確度は 0〜100 の範囲で入力してください";
    }

    return v;
  }, []);

  const flush = useCallback(async () => {
    const draft = getDraft();
    const vv = validate(draft);
    setValidation(vv);

    if (Object.keys(vv).length > 0) {
      setState("error");
      setError("入力に不備があります（赤字の項目を修正してください）");
      return;
    }

    const payload = JSON.stringify(draft);
    if (payload === lastSentRef.current) {
      setState("saved");
      setError(null);
      return;
    }

    setState("saving");
    setError(null);

    try {
      const res = await fetch(`/api/deals/${encodeURIComponent(dealId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: payload,
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.ok) throw new Error(String(j?.error?.message ?? "failed"));

      lastSentRef.current = payload;
      setState("saved");
      setError(null);
      if (onSaved) onSaved();
    } catch (e: any) {
      setState("error");
      setError(String(e?.message ?? e ?? "failed"));
    }
  }, [dealId, getDraft, onSaved, validate]);

  const scheduleSave = useCallback(() => {
    setState("dirty");
    setError(null);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      flush();
    }, debounceMs);
  }, [debounceMs, flush]);

  const cancel = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  useEffect(() => {
    return () => cancel();
  }, [cancel]);

  return {
    state,
    error,
    validation,
    scheduleSave,
    flush,
    cancel,
    setBaseline: () => {
      // 現在値を baseline にする（dirty抑制等に使える）
      const payload = JSON.stringify(getDraft());
      lastSentRef.current = payload;
      setState("idle");
      setError(null);
      setValidation({});
    },
  };
}
