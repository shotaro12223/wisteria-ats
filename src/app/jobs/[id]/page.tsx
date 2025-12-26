"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { Job, JobSite } from "@/lib/types";
import { getJob, upsertJob } from "@/lib/storage";
import { renderTemplate } from "@/lib/render";
import { JOB_SITES, SITE_TEMPLATES } from "@/lib/templates";
import { JobForm } from "@/components/JobForm";
import { OutputBox } from "@/components/OutputBox";
import { TemplateSelector } from "@/components/TemplateSelector";

export default function EditJobPage() {
  const params = useParams<{ id: string }>();
  const initial = useMemo(() => getJob(params.id), [params.id]);
  const [job, setJob] = useState<Job | null>(initial);
  const [site, setSite] = useState<JobSite>("Indeed");

  const template = useMemo(() => SITE_TEMPLATES.find((t) => t.site === site)!, [site]);
  const output = useMemo(() => (job ? renderTemplate(job, template) : ""), [job, template]);

  const onSave = () => {
    if (!job) return;
    upsertJob(job);
    alert("保存しました（ローカル保存）");
  };

  if (!job) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-xl font-bold">求人が見つかりません</h1>
        <div className="mt-4">
          <Link className="rounded border px-3 py-2" href="/jobs">一覧へ</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">求人編集</h1>
        <div className="flex items-center gap-2">
          <Link className="rounded border px-3 py-2 text-sm" href="/jobs">一覧へ</Link>
          <button className="rounded border px-3 py-2 text-sm" onClick={onSave}>保存</button>
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
