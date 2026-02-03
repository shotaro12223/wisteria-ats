"use client";

import React, { useCallback, useMemo, useState } from "react";

type CompanyRecord = {
  company_id: string;
  company_name: string | null;
  application_email: string | null;
};

export default function CompanyRecordQuickEdit(props: {
  companyId: string;
  initial: CompanyRecord;
  linkToCompanyPage?: string; // 例: /companies/{companyId}/record
}) {
  const { companyId, initial, linkToCompanyPage } = props;

  const [companyName, setCompanyName] = useState<string>(initial.company_name ?? "");
  const [applicationEmail, setApplicationEmail] = useState<string>(initial.application_email ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const dirty = useMemo(() => {
    return companyName !== (initial.company_name ?? "") || applicationEmail !== (initial.application_email ?? "");
  }, [applicationEmail, companyName, initial.application_email, initial.company_name]);

  const save = useCallback(async () => {
    if (!dirty) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/companies/${encodeURIComponent(companyId)}/record`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: companyName.trim() || null,
          application_email: applicationEmail.trim() || null,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.ok) throw new Error(String(j?.error?.message ?? "failed"));
      setMsg("会社台帳（最小項目）を保存しました");
    } catch (e: any) {
      setMsg(`保存に失敗しました: ${String(e?.message ?? e ?? "failed")}`);
    } finally {
      setSaving(false);
    }
  }, [applicationEmail, companyId, companyName, dirty]);

  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-sm font-semibold text-zinc-900">会社台帳（最小編集）</div>
          <div className="text-xs text-zinc-500">
            このページでは最小項目のみ編集します。詳細なプロフィールは台帳ページで編集してください。
          </div>
        </div>

        <div className="flex items-center gap-2">
          {linkToCompanyPage ? (
            <a
              className="rounded-lg border bg-white px-3 py-1.5 text-sm hover:bg-zinc-50"
              href={linkToCompanyPage}
            >
              台帳へ
            </a>
          ) : null}
          <button
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
            onClick={save}
            disabled={saving || !dirty}
          >
            保存
          </button>
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <div className="text-xs font-semibold text-zinc-700">会社名</div>
          <input
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="会社名"
          />
        </div>

        <div>
          <div className="text-xs font-semibold text-zinc-700">応募メール（application_email）</div>
          <input
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            value={applicationEmail}
            onChange={(e) => setApplicationEmail(e.target.value)}
            placeholder="example@company.jp"
          />
        </div>
      </div>

      {msg ? (
        <div className="mt-3 rounded-lg border bg-zinc-50 px-3 py-2 text-sm text-zinc-700">{msg}</div>
      ) : null}
    </div>
  );
}
