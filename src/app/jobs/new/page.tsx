"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import type { Job, JobSite } from "@/lib/types";
import { newJobSkeleton, upsertJob } from "@/lib/storage";
import { renderTemplate } from "@/lib/render";
import { JOB_SITES, SITE_TEMPLATES } from "@/lib/templates";
import { JobForm } from "@/components/JobForm";
import { OutputBox } from "@/components/OutputBox";
import { TemplateSelector } from "@/components/TemplateSelector";

type CompanyRow = {
  id: string;
  company_name: string;
  created_at: string;
  updated_at: string;
};

type CompanyGetRes =
  | { ok: true; company: CompanyRow | null }
  | { ok: false; error: { message: string } };

export default function NewJobPage() {
  const sp = useSearchParams();
  const companyId = useMemo(() => String(sp.get("companyId") ?? ""), [sp]);

  const [job, setJob] = useState<Job>(() => newJobSkeleton());
  const [site, setSite] = useState<JobSite>("Indeed");

  useEffect(() => {
    if (!companyId) return;

    // companyId をセット
    setJob((prev) => ({ ...(prev as any), companyId } as any));

    // companyName を取得してセット（取れなくても作成は可能）
    (async () => {
      try {
        const res = await fetch(`/api/debug/companies/${encodeURIComponent(companyId)}`, { cache: "no-store" });
        const json = (await res.json()) as CompanyGetRes;
        if (!res.ok || !json.ok) return;
        if (!json.company) return;

        setJob((prev) => ({
          ...(prev as any),
          companyId,
          companyName: json.company!.company_name,
        }) as any);
      } catch {
        // noop
      }
    })();
  }, [companyId]);

  const template = useMemo(() => SITE_TEMPLATES.find((t) => t.site === site)!, [site]);
  const output = useMemo(() => renderTemplate(job, template), [job, template]);

  function onSave() {
    upsertJob(job);
    alert("保存しました（ローカル保存）");
  }

  const backHref = companyId ? `/companies/${encodeURIComponent(companyId)}` : "/jobs";

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold">求人作成</h1>
          {companyId ? (
            <div className="mt-1 truncate text-sm text-gray-600">
              会社に追加: {(job as any).companyName ? (job as any).companyName : companyId}
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <Link className="rounded border px-3 py-2 text-sm" href={backHref}>
            戻る
          </Link>
          <button className="rounded border px-3 py-2 text-sm" onClick={onSave}>
            保存
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="rounded border p-4">
          <JobForm job={job} onChange={setJob} />
        </div>
        <div className="flex flex-col gap-4">
          <div className="rounded border p-4">
            <TemplateSelector value={site} options={JOB_SITES} onChange={setSite} />
          </div>
          <div className="rounded border p-4">
            <OutputBox text={output} />
          </div>
        </div>
      </div>
    </main>
  );
}
