"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Company = {
  id: string;
  company_name: string;
};

type Props = {
  label?: string;
  className?: string;
};

/**
 * - companies を /api/companies から取得して Select を構築
 * - 選択値は URL の searchParams（companyId）に同期
 */
export default function CompanyFilterClient({ label = "会社", className }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);

  const selectedCompanyId = sp.get("companyId") ?? "";

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/companies", { cache: "no-store" });
        const json = await res.json();

        // 期待: { ok: true, items: [{id, company_name}, ...] }
        // もし形式が違う場合はここだけ合わせてください
        const items: Company[] = (json?.items ?? json?.data ?? []).map((c: any) => ({
          id: String(c.id),
          company_name: String(c.company_name ?? c.companyName ?? ""),
        }));

        if (!alive) return;
        setCompanies(items.filter((x) => x.id && x.company_name));
      } catch {
        // 取得できない場合でもUIは「全社」だけで動く
        if (!alive) return;
        setCompanies([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const options = useMemo(() => {
    return [
      { id: "", company_name: "全社" },
      ...companies,
    ];
  }, [companies]);

  function setCompanyId(nextId: string) {
    const params = new URLSearchParams(sp.toString());

    if (!nextId) params.delete("companyId");
    else params.set("companyId", nextId);

    // ページング等があるならここで他パラメータを消す/残すを調整
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-3">
        <div className="text-[12px] text-slate-500">{label}</div>

        <select
          value={selectedCompanyId}
          onChange={(e) => setCompanyId(e.target.value)}
          className={[
            "h-10 min-w-[240px] rounded-2xl border px-3 text-[13px] text-slate-900",
            "bg-white shadow-sm outline-none",
          ].join(" ")}
          style={{ borderColor: "var(--border)" }}
          disabled={loading}
        >
          {options.map((c) => (
            <option key={c.id || "__all__"} value={c.id}>
              {c.company_name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="mt-1 text-[11px] text-slate-400">会社一覧を読み込み中…</div>
      ) : null}
    </div>
  );
}
