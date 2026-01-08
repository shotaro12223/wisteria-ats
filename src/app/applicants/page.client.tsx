"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ApplicantsIndexClient from "@/components/ApplicantsIndexClient";
import type { Applicant } from "@/lib/applicantsStorage";

type Res =
  | { ok: true; items: Applicant[] }
  | { ok: false; error: { message: string } };

export default function ApplicantsPageClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Applicant[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = sp.get("q") ?? "";
    const status = sp.get("status") ?? "";
    const companyId = sp.get("companyId") ?? "";
    const limit = sp.get("limit") ?? "300";

    // ★ ts は再検索トリガー専用（APIには渡さない）
    const hasTs = Boolean(sp.get("ts"));

    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (status) qs.set("status", status);
    if (companyId) qs.set("companyId", companyId);
    if (limit) qs.set("limit", limit);

    const url = `/api/applicants/search?${qs.toString()}`;

    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(url, { cache: "no-store" });
        const json = (await res.json()) as Res;

        if (!res.ok || !json.ok) {
          const msg = !json.ok ? json.error.message : `HTTP ${res.status}`;
          throw new Error(msg);
        }

        if (!cancelled) setItems(json.items);

        // ✅ 取得が終わったら、ts をURLから消して見た目をクリーンに戻す
        if (!cancelled && hasTs) {
          router.replace(`/applicants?${qs.toString()}`);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setItems([]);
          setError("応募一覧の取得に失敗しました。");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [sp, router]);

  return (
    <main className="space-y-6">
      <div className="cv-panel p-6">
        <div className="text-sm text-slate-500">応募一覧</div>
        <div className="mt-1 text-lg font-semibold text-slate-900">全社横断</div>
        <div className="mt-1 text-xs text-slate-500">検索条件はURLに保持されます（共有OK）</div>
      </div>

      {error ? <div className="cv-panel p-6 text-sm text-red-600">{error}</div> : null}

      <ApplicantsIndexClient initialApplicants={items as any} loading={loading} />
    </main>
  );
}
