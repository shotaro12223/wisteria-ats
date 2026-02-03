"use client";

import { useMemo, useRef, useState } from "react";

type Props = {
  text: string;
};

export function OutputBox({ text }: Props) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  const canCopy = useMemo(() => text.trim().length > 0, [text]);

  async function onCopy() {
    if (!canCopy) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);

      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        setCopied(false);
        timerRef.current = null;
      }, 1200);
    } catch {
      alert("コピーに失敗しました。手動で選択してコピーしてください。");
    }
  }

  return (
    <div className="cv-panel p-6">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="text-sm font-medium text-slate-900">コピペ用テキスト</div>
          <div className="mt-1 text-xs text-slate-500">
            全文を一括コピーして、媒体の入力欄に貼り付けます。
          </div>
        </div>

        <button
          type="button"
          className={copied ? "cv-btn-secondary" : "cv-btn-primary"}
          onClick={onCopy}
          disabled={!canCopy}
          aria-disabled={!canCopy}
          title={canCopy ? "クリップボードにコピー" : "コピーできる内容がありません"}
        >
          {copied ? "コピー済み" : "コピー"}
        </button>
      </div>

      <textarea
        className="mt-4 min-h-[280px] w-full rounded-md border p-3 font-mono text-xs leading-6 text-slate-900"
        style={{ background: "var(--surface-muted)", borderColor: "var(--border)" }}
        value={text}
        readOnly
      />
    </div>
  );
}
