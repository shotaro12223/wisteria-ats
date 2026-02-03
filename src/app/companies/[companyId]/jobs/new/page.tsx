"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import type { Job, JobSite } from "@/lib/types";
import { SITE_TEMPLATES, JOB_SITES } from "@/lib/templates";
import { getTemplateFieldValue } from "@/lib/render";

import { JobForm } from "@/components/JobForm";
import { TemplateSelector } from "@/components/TemplateSelector";

type OutputItem = { label: string; value: string };

type CompanyGetRes =
  | { ok: true; company: { id: string; company_name: string; created_at: string; updated_at: string } | null }
  | { ok: false; error: { message: string } };

type JobsCreateRes =
  | { ok: true; job: { id: string; company_id: string; created_at: string; updated_at: string } }
  | { ok: false; error: { message: string } };

function panel() {
  return "cv-panel p-6";
}

function outputItemBox(copied: boolean) {
  return [
    "rounded-2xl border bg-white p-4 text-sm shadow-sm",
    copied ? "border-emerald-300 bg-emerald-50" : "bg-white",
  ].join(" ");
}

export default function CompanyNewJobPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = String((params as any)?.companyId ?? "");

  const [companyName, setCompanyName] = useState<string>("");

  const [job, setJob] = useState<Job>(() => {
    const now = new Date().toISOString();
    return {
      id: "",
      companyId,
      companyName: "",
      jobTitle: "",
      createdAt: now,
      updatedAt: now,
    } as any;
  });

  const [site, setSite] = useState<JobSite>("採用係長");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // companyId を job に反映
  useEffect(() => {
    if (!companyId) return;
    setJob((prev) => ({ ...prev, companyId }));
  }, [companyId]);

  // ✅ 会社名を Supabase(API) から取得
  useEffect(() => {
    if (!companyId) return;

    (async () => {
      const res = await fetch(`/api/companies/${encodeURIComponent(companyId)}`, { cache: "no-store" });
      const json = (await res.json()) as CompanyGetRes;

      if (!res.ok || !json.ok || !json.company) {
        setCompanyName("");
        return;
      }

      setCompanyName(String(json.company.company_name ?? ""));
    })();
  }, [companyId]);

  const template = useMemo(() => SITE_TEMPLATES.find((t) => t.site === site)!, [site]);

  const outputs: OutputItem[] = useMemo(() => {
    return template.fields
      .map((f) => {
        const v = getTemplateFieldValue(job, f);
        if (!v || v.trim().length === 0) return null;
        return { label: f.label, value: v };
      })
      .filter(Boolean) as OutputItem[];
  }, [job, template]);

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 1200);
  }

  async function onSave() {
    if (!companyId) {
      alert("companyId が取得できませんでした。会社ページから求人追加してください。");
      return;
    }

    const title = String((job as any).jobTitle ?? "").trim();
    if (!title) {
      alert("職種を入力してください。");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          ...job,
          companyId,
          companyName: (job as any).companyName || companyName || "",
          jobTitle: title,
        }),
      });

      const json = (await res.json()) as JobsCreateRes;

      if (!res.ok || !json.ok) {
        const msg = !json.ok ? json.error.message : `保存に失敗しました (status: ${res.status})`;
        throw new Error(msg);
      }

      router.push(`/companies/${companyId}/jobs/${json.job.id}`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">求人追加</h1>
        <div className="flex items-center gap-2">
          <button className="cv-btn-secondary" onClick={() => router.back()} disabled={saving}>
            戻る
          </button>
          <button className="cv-btn-primary" onClick={onSave} disabled={saving}>
            {saving ? "保存中…" : "保存して開く"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className={panel()}>
          <div className="space-y-4">
            <div>
              <div className="text-sm font-semibold text-slate-900">求人情報</div>
              <div className="mt-1 text-xs text-slate-500">入力内容は右の「項目別コピー」に反映されます</div>
            </div>

            <div className="h-px w-full bg-slate-100" />

            <JobForm job={job} onChange={setJob} />
          </div>
        </section>

        <section className={panel()}>
          <div className="space-y-4">
            <div>
              <div className="text-sm font-semibold text-slate-900">出力（項目別コピー）</div>
              <div className="mt-1 text-xs text-slate-500">媒体を選ぶと、その媒体の項目順で表示されます</div>
            </div>

            <div className="h-px w-full bg-slate-100" />

            <div>
              <div className="mb-2 text-xs font-semibold text-slate-600">求人媒体</div>
              <TemplateSelector value={site} options={JOB_SITES} onChange={setSite} />
            </div>

            <div className="space-y-3">
              {outputs.length === 0 ? (
                <div
                  className="rounded-2xl border bg-[var(--surface-muted)] p-4 text-sm text-slate-600"
                  style={{ borderColor: "var(--border)" }}
                >
                  入力すると、ここにコピー用テキストが表示されます
                </div>
              ) : (
                outputs.map((o, idx) => {
                  const key = `${site}-${o.label}-${idx}`;
                  const copied = copiedKey === key;

                  return (
                    <div key={key} className={outputItemBox(copied)} style={{ borderColor: copied ? undefined : "var(--border)" }}>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="min-w-0 text-xs font-semibold text-slate-600">{o.label}</div>
                        <button className="shrink-0 text-xs font-semibold text-slate-700 hover:underline" onClick={() => copy(o.value, key)}>
                          {copied ? "コピー済み" : "コピー"}
                        </button>
                      </div>

                      <div className="whitespace-pre-wrap break-words text-slate-900">{o.value}</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
