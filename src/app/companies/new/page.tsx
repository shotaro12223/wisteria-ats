"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { Company } from "@/lib/types";
import { CompanyForm } from "@/components/CompanyForm";
import { makeId } from "@/lib/id";

type SaveStatus = "idle" | "saving" | "saved" | "error";

export default function NewCompanyPage() {
  const router = useRouter();

  const initial: Company = useMemo(() => {
    const now = new Date().toISOString();
    return {
      id: makeId(),
      companyName: "",
      createdAt: now,
      updatedAt: now,
    } as any;
  }, []);

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [debug, setDebug] = useState<string>("rendered"); // ★ これが見えればレンダー成功

  async function handleSubmit(next: Company) {
    const now = new Date().toISOString();

    const toSave: Company = {
      ...next,
      id: (next as any).id || (initial as any).id,
      createdAt: (next as any).createdAt || (initial as any).createdAt,
      updatedAt: now,
    } as any;

    setSaveStatus("saving");
    setErrorMessage("");
    setDebug("submitting...");

    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          id: (toSave as any).id,
          companyName: (toSave as any).companyName,
          createdAt: (toSave as any).createdAt,
          updatedAt: (toSave as any).updatedAt,
        }),
      });

      let json: any = null;
      try {
        json = await res.json();
      } catch {
        json = null;
      }

      setDebug(`POST /api/companies -> HTTP ${res.status} body=${JSON.stringify(json)}`);

      if (!res.ok || !json?.ok) {
        const msg = json?.error?.message || `保存に失敗しました (status: ${res.status})`;
        throw new Error(msg);
      }

      setSaveStatus("saved");

      // 遷移
      router.push(`/companies/${(toSave as any).id}`);
    } catch (e) {
      setSaveStatus("error");
      setErrorMessage(e instanceof Error ? e.message : "保存に失敗しました");
    }
  }

  return (
    <main className="space-y-6">
      {/* Top header bar */}
      <div
        className="sticky top-0 z-20 rounded-2xl border bg-white/80 p-4 backdrop-blur"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm">
              <Link href="/companies" className="cv-link">
                会社一覧
              </Link>
              <span className="text-slate-300">/</span>
              <span className="truncate font-semibold text-slate-900">会社を追加</span>
            </div>
            <div className="mt-1 text-xs text-slate-500">会社概要を登録してから求人を作成します</div>

            {/* ★ デバッグ表示（ここが見えれば /companies/new は表示できてる） */}
            <div className="mt-2 text-[11px] text-slate-500">
              debug: {debug} / saveStatus: {saveStatus}
            </div>

            {saveStatus === "error" ? (
              <div className="mt-2 text-xs text-red-600">保存エラー: {errorMessage}</div>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {saveStatus === "saved" ? <span className="cv-badge">保存済み</span> : null}
            {saveStatus === "saving" ? <span className="cv-badge">保存中…</span> : null}
            <Link href="/companies" className="cv-btn-secondary">
              戻る
            </Link>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="cv-panel p-6">
        <CompanyForm
          initialValue={initial}
          submitLabel={saveStatus === "saving" ? "保存中…" : "保存して会社ページへ"}
          onSubmit={handleSubmit}
        />
      </div>

      {/* Tip */}
      <div className="cv-panel p-5">
        <div className="text-sm font-semibold text-slate-900">コツ</div>
        <div className="mt-2 text-sm text-slate-600">
          会社の登録が済んだら、会社ページ右上の「+ 求人を追加」から進むのが最短です。
        </div>
      </div>
    </main>
  );
}
