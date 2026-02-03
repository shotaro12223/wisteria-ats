"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { Company } from "@/lib/types";
import { CompanyForm } from "@/components/CompanyForm";
import { useBeforeUnload } from "@/hooks/useBeforeUnload";

type SaveStatus = "idle" | "saving" | "saved" | "error";

export default function NewCompanyPage() {
  const router = useRouter();

  const initial: Company = useMemo(() => {
    const now = new Date().toISOString();
    return {
      companyName: "",
      createdAt: now,
      updatedAt: now,
    } as any;
  }, []);

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [debug, setDebug] = useState<string>("rendered"); // ★ これが見えればレンダー成功

  // Warn before leaving if form is not saved
  useBeforeUnload(saveStatus !== "saved", "入力内容が保存されていません。ページを離れてもよろしいですか？");

  async function handleSubmit(next: Company) {
    console.log("[NewCompanyPage] handleSubmit called with:", next);

    const now = new Date().toISOString();

    setSaveStatus("saving");
    setErrorMessage("");
    setDebug("submitting...");

    try {
      // ✅ IDはAPI側で生成するため、フロントからは送らない
      // ✅ 全フィールドをcompanyProfileに含めて送信
      const companyProfile = {
        tradeName: (next as any).tradeName || "",
        corporateNumber: (next as any).corporateNumber || "",
        website: (next as any).website || "",
        phone: (next as any).phone || "",
        hqPostalCode: (next as any).hqPostalCode || "",
        hqAddress: (next as any).hqAddress || "",
        establishedDate: (next as any).establishedDate || "",
        capital: (next as any).capital || "",
        businessDescription: (next as any).businessDescription || "",
        representativeName: (next as any).representativeName || "",
        representativeNameKana: (next as any).representativeNameKana || "",
        contactPersonName: (next as any).contactPersonName || "",
        contactPersonNameKana: (next as any).contactPersonNameKana || "",
        employeesTotal: (next as any).employeesTotal || "",
        employeesFemale: (next as any).employeesFemale || "",
        employeesPartTime: (next as any).employeesPartTime || "",
        applicationReceptionNumber: (next as any).applicationReceptionNumber || "",
        invoiceAddress: (next as any).invoiceAddress || "",
        defaultWorkLocationPostalCode: (next as any).defaultWorkLocationPostalCode || "",
      };

      const payload = {
        companyName: (next as any).companyName || "",
        companyProfile: companyProfile,
        applicationEmail: (next as any).applicationEmail || (next as any).jobEmail || null,
        createdAt: now,
        updatedAt: now,
      };

      console.log("[NewCompanyPage] POST payload:", payload);

      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(payload),
      });

      console.log("[NewCompanyPage] Response status:", res.status);

      let json: any = null;
      try {
        json = await res.json();
        console.log("[NewCompanyPage] Response JSON:", json);
      } catch (parseErr) {
        console.error("[NewCompanyPage] JSON parse error:", parseErr);
        json = null;
      }

      setDebug(`POST /api/companies -> HTTP ${res.status} body=${JSON.stringify(json)}`);

      if (!res.ok || !json?.ok) {
        const msg = json?.error?.message || `保存に失敗しました (status: ${res.status})`;
        console.error("[NewCompanyPage] Save failed:", msg);
        throw new Error(msg);
      }

      // ✅ APIが返したIDを使用（APIは独自にrandomUUID()で生成するため）
      const savedCompanyId = json?.company?.id || json?.company?.company_id;
      console.log("[NewCompanyPage] Save successful, navigating to:", `/companies/${savedCompanyId}`);
      setSaveStatus("saved");

      // 遷移
      router.push(`/companies/${savedCompanyId}`);
    } catch (e) {
      console.error("[NewCompanyPage] Error in handleSubmit:", e);
      setSaveStatus("error");
      setErrorMessage(e instanceof Error ? e.message : "保存に失敗しました");
    }
  }

  return (
    <main className="space-y-6">
      {/* Top header bar */}
      <div
        className="sticky top-0 z-20 rounded-2xl border bg-white/80 p-4 backdrop-blur dark:bg-slate-800/80 dark:border-slate-700"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm">
              <Link href="/companies" className="cv-link">
                会社一覧
              </Link>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <span className="truncate font-semibold text-slate-900 dark:text-slate-100">会社を追加</span>
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">会社概要を登録してから求人を作成します</div>

            {/* ★ デバッグ表示（ここが見えれば /companies/new は表示できてる） */}
            <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              debug: {debug} / saveStatus: {saveStatus}
            </div>

            {saveStatus === "error" ? (
              <div className="mt-2 text-xs text-red-600 dark:text-red-400">保存エラー: {errorMessage}</div>
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
        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">コツ</div>
        <div className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          会社の登録が済んだら、会社ページ右上の「+ 求人を追加」から進むのが最短です。
        </div>
      </div>
    </main>
  );
}
