"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";

import type { Job, JobSite, SiteTemplate, TemplateField } from "@/lib/types";
import { getJob, upsertJob } from "@/lib/storage";
import { getCompany } from "@/lib/companyStorage";

import { TemplateSelector } from "@/components/TemplateSelector";
import { SITE_TEMPLATES } from "@/lib/templates";
import { renderTemplate, getTemplateFieldValue } from "@/lib/render";

import { JobSiteStatusBar } from "@/components/JobSiteStatusBar";

const SITE_ORDER = [
  "採用係長",
  "AirWork",
  "Engage",
  "Indeed",
  "求人BOX",
  "はたらきんぐ",
  "求人Free",
  "ハローワーク",
  "げんきワーク",
  "ジモティー",
] as const;

const KEY_LABEL_JA: Record<string, string> = {
  companyName: "会社名",
  jobTitle: "職種名",
  jobCategory: "職業カテゴリー",
  catchCopy: "求人キャッチコピー",
  hiringCount: "採用予定人数",

  postalCode: "郵便番号",
  prefectureCityTown: "都道府県・市区町村・町域",
  addressLine: "丁目・番地・号",
  buildingFloor: "建物名・階数",

  employmentType: "雇用形態",
  payType: "給与形態",
  grossPay: "給与（総支給）",

  "computed.payDisplayMethod": "給与額の表示方法",
  payMin: "最低額",
  payMax: "最高額",
  fixedOvertime: "固定残業代",
  basePayAndAllowance: "基本給・諸手当",
  fixedAllowance: "一律手当",
  "computed.payRangeText": "給与（レンジ）",
  payNote: "給与の補足",

  workHours: "勤務時間",
  workStyle: "勤務形態",
  avgMonthlyWorkHours: "月々平均勤務時間",
  avgMonthlyWorkDays: "月々平均勤務日数",
  workDaysHoursRequired: "勤務時間・曜日（必須など）",

  holidays: "休日休暇",
  annualHolidays: "年間休日",
  leave: "休暇",
  breakTime: "休憩時間",

  socialInsurance: "社会保険",
  benefits: "待遇・福利厚生",

  probation: "試用期間",
  probationPeriod: "ありの場合期間",
  probationCondition: "ありの場合条件",

  jobDescription: "仕事内容",
  appealPoints: "アピールポイント",
  qualifications: "応募資格",
  educationExperience: "学歴・経験",
  tags: "タグ（特長）",
  other: "その他",

  locationNote: "勤務地の補足",
  access: "アクセス",
  nearestStation: "最寄り駅",
  passiveSmoking: "受動喫煙対策",
  secondment: "出向",

  overtimeHours: "残業時間",
  annualIncomeExample: "年収例",

  contactEmail: "メールアドレス",
  contactPhone: "電話番号",

  "computed.saiyouKeichoPayNote": "お給料のこと：備考（連結）",
  "computed.saiyouKeichoWorkNote": "働く時間について：備考（連結）",
};

type Row = {
  titleJa: string;
  keyPath: string;
  text: string;
};

type CompanyLike = { id: string; companyName: string };

const FIELD_PICK_KEY_PREFIX = "wisteria_ats_output_field_picks_v1:"; // + site

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function orderSites(available: JobSite[]): JobSite[] {
  const set = new Set<string>(available.map(String));
  const ordered = SITE_ORDER.filter((s) => set.has(s)).map((s) => s as unknown as JobSite);
  const rest = available.filter((s) => !SITE_ORDER.includes(String(s) as any));
  return [...ordered, ...rest];
}

export default function CompanyJobOutputsPage() {
  const params = useParams<{ companyId: string; jobId: string }>();

  const companyId = useMemo(() => String(params.companyId), [params.companyId]);
  const jobId = useMemo(() => String(params.jobId), [params.jobId]);

  const [company, setCompany] = useState<CompanyLike | null>(null);
  const [job, setJob] = useState<Job | null>(null);

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const siteOptions = useMemo(() => {
    const sites = uniq((SITE_TEMPLATES ?? []).map((t) => t.site)) as JobSite[];
    return orderSites(sites);
  }, []);

  const [site, setSite] = useState<JobSite>((siteOptions[0] as JobSite) ?? ("Indeed" as JobSite));
  const [hideEmpty, setHideEmpty] = useState(true);
  const [collapseLongText, setCollapseLongText] = useState(true);

  const [showFieldPicker, setShowFieldPicker] = useState(false);
  const [pickedKeys, setPickedKeys] = useState<Set<string>>(new Set());

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copiedResetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);

    const c = getCompany(companyId);
    if (!c) {
      setCompany(null);
      setJob(null);
      setNotFound(true);
      setLoading(false);
      return;
    }
    setCompany(c as CompanyLike);

    const j = getJob(jobId);
    if (!j) {
      setJob(null);
      setNotFound(true);
      setLoading(false);
      return;
    }

    if (j.companyId && j.companyId !== companyId) {
      setJob(null);
      setNotFound(true);
      setLoading(false);
      return;
    }

    const normalized: Job = {
      ...j,
      companyId: j.companyId ?? companyId,
      companyName: j.companyName || (c as any)?.companyName || "",
    };

    setJob(normalized);
    setLoading(false);
  }, [companyId, jobId]);

  useEffect(() => {
    return () => {
      if (copiedResetTimerRef.current != null) {
        window.clearTimeout(copiedResetTimerRef.current);
        copiedResetTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(`${FIELD_PICK_KEY_PREFIX}${site}`);
    if (!raw) {
      // ✅ 未保存なら「未選択（=全表示）」扱いにする
      setPickedKeys(new Set());
      return;
    }
    try {
      const parsed = JSON.parse(raw) as string[];
      setPickedKeys(new Set(Array.isArray(parsed) ? parsed : []));
    } catch {
      setPickedKeys(new Set());
    }
  }, [site]);

  function savePickedKeys(next: Set<string>) {
    setPickedKeys(next);
    if (typeof window === "undefined") return;
    window.localStorage.setItem(`${FIELD_PICK_KEY_PREFIX}${site}`, JSON.stringify(Array.from(next)));
  }

  const template: SiteTemplate | undefined = useMemo(() => SITE_TEMPLATES.find((t) => t.site === site), [site]);

  const fullOutput = useMemo(() => {
    if (!job || !template) return "";
    return renderTemplate(job, template);
  }, [job, template]);

  const allTemplateFields = useMemo(() => {
    if (!template) return [];
    return template.fields.map((f) => {
      const keyPath = String(f.key);
      const titleJa = KEY_LABEL_JA[keyPath] ?? f.label ?? keyPath;
      return { keyPath, titleJa };
    });
  }, [template]);

  const rows: Row[] = useMemo(() => {
    if (!job || !template) return [];

    // ✅ ここがポイント：
    // pickedKeys が空なら「全項目表示」
    const keys = pickedKeys;
    const targetFields =
      keys.size === 0 ? template.fields : template.fields.filter((f) => keys.has(String(f.key)));

    const rs: Row[] = targetFields.map((f) => {
      const keyPath = String(f.key);
      const text = (getTemplateFieldValue(job, f as TemplateField) ?? "").trim();
      const titleJa = KEY_LABEL_JA[keyPath] ?? f.label ?? keyPath;
      return { titleJa, keyPath, text };
    });

    return hideEmpty ? rs.filter((r) => r.text.length > 0) : rs;
  }, [job, template, hideEmpty, pickedKeys]);

  function handleSiteStatusUpdate(next: Job) {
    if (!job) return;

    const now = new Date().toISOString();

    const toSave: Job = {
      ...next,
      companyId,
      companyName: next.companyName || company?.companyName || "",
      createdAt: next.createdAt || now,
      updatedAt: now,
    };

    upsertJob(toSave);
    setJob(toSave);
  }

  async function copyText(text: string) {
    if (!text) return false;

    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        ta.style.top = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        return true;
      } catch {
        return false;
      }
    }
  }

  async function handleCopyRow(rowKey: string, text: string) {
    const ok = await copyText(text);

    if (!ok) {
      alert("コピーに失敗しました。手動で選択してコピーしてください。");
      return;
    }

    setCopiedId(rowKey);

    if (copiedResetTimerRef.current != null) {
      window.clearTimeout(copiedResetTimerRef.current);
    }
    copiedResetTimerRef.current = window.setTimeout(() => {
      setCopiedId(null);
      copiedResetTimerRef.current = null;
    }, 1200);
  }

  async function handleCopyAll() {
    const ok = await copyText(fullOutput);
    if (!ok) {
      alert("コピーに失敗しました。手動で選択してコピーしてください。");
      return;
    }

    setCopiedId(null);
    if (copiedResetTimerRef.current != null) {
      window.clearTimeout(copiedResetTimerRef.current);
      copiedResetTimerRef.current = null;
    }
  }

  if (loading) {
    return (
      <main className="cv-container">
        <div className="text-sm text-slate-600">読み込み中...</div>
      </main>
    );
  }

  if (notFound || !company) {
    return (
      <main className="cv-container">
        <h1 className="cv-page-title">{company ? "求人が見つかりません" : "会社が見つかりません"}</h1>
        <div className="mt-6">
          <Link href="/companies" className="cv-link">
            ← 会社一覧に戻る
          </Link>
        </div>
      </main>
    );
  }

  if (!job) {
    return (
      <main className="cv-container">
        <h1 className="cv-page-title">求人が見つかりません</h1>
        <div className="mt-6">
          <Link href={`/companies/${companyId}`} className="cv-link">
            ← 会社マイページに戻る
          </Link>
        </div>
      </main>
    );
  }

  if (!template) {
    return (
      <main className="cv-container">
        <h1 className="cv-page-title">媒体テンプレが見つかりません</h1>
        <div className="mt-6">
          <Link href={`/companies/${companyId}/jobs/${jobId}`} className="cv-link">
            ← 求人編集へ戻る
          </Link>
        </div>
      </main>
    );
  }

  return (
    <>
      <div className="sticky top-0 z-20 border-b" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="cv-container py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm">
                <Link href="/companies" className="cv-link">
                  会社一覧
                </Link>
                <span className="text-slate-300">/</span>
                <Link href={`/companies/${companyId}`} className="cv-link">
                  {company.companyName || "会社"}
                </Link>
                <span className="text-slate-300">/</span>
                <Link href={`/companies/${companyId}/jobs/${jobId}`} className="cv-link">
                  {job.jobTitle || "求人詳細"}
                </Link>
                <span className="text-slate-300">/</span>
                <span className="truncate font-medium text-slate-900">出力</span>
              </div>
              <div className="mt-1 text-xs text-slate-500">媒体テンプレに沿って項目ごとに表示し、値だけコピーできます</div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Link href={`/companies/${companyId}/jobs/${jobId}`} className="cv-btn-secondary">
                求人編集へ
              </Link>

              <button
                type="button"
                className="cv-btn-primary"
                onClick={handleCopyAll}
                disabled={!fullOutput}
                aria-disabled={!fullOutput}
                title="テンプレに沿った全文をコピーします"
              >
                全文コピー
              </button>
            </div>
          </div>

          <JobSiteStatusBar job={job} onUpdate={handleSiteStatusUpdate} />
        </div>
      </div>

      <main className="cv-container pb-24">
        <div className="mt-4">
          <Link href={`/companies/${companyId}`} className="cv-link">
            ← 会社マイページに戻る
          </Link>
        </div>

        <section className="cv-section">
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0">
              <h2 className="cv-section-title">出力設定</h2>
              <p className="cv-section-desc">
                媒体テンプレの選択と表示オプションを調整できます。※ 未選択のときは「全項目表示」です
              </p>
            </div>
          </div>

          <div className="cv-section-body">
            <div className="cv-panel p-6">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div className="min-w-0">
                    <TemplateSelector value={site} options={siteOptions} onChange={setSite} />
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <button
                      type="button"
                      className="cv-btn-secondary"
                      onClick={() => setShowFieldPicker((v) => !v)}
                      title="表示する項目を選択します"
                    >
                      表示項目を選ぶ
                    </button>

                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input type="checkbox" checked={hideEmpty} onChange={(e) => setHideEmpty(e.target.checked)} />
                      空欄を隠す
                    </label>

                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={collapseLongText}
                        onChange={(e) => setCollapseLongText(e.target.checked)}
                      />
                      長文を折りたたむ
                    </label>
                  </div>
                </div>

                {showFieldPicker ? (
                  <div className="cv-panel-soft p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-sm font-medium text-slate-900">表示する項目（チェックしたものだけ表示）</div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="cv-btn-secondary"
                          onClick={() => {
                            const next = new Set(allTemplateFields.map((f) => f.keyPath));
                            savePickedKeys(next);
                          }}
                        >
                          全て選択
                        </button>
                        <button type="button" className="cv-btn-secondary" onClick={() => savePickedKeys(new Set())}>
                          全て解除（＝全項目表示に戻る）
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                      {allTemplateFields.map((f) => {
                        const checked = pickedKeys.has(f.keyPath);
                        return (
                          <label key={f.keyPath} className="flex items-start gap-2 text-sm text-slate-800">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const next = new Set(pickedKeys);
                                if (e.target.checked) next.add(f.keyPath);
                                else next.delete(f.keyPath);
                                savePickedKeys(next);
                              }}
                            />
                            <span className="min-w-0">
                              <span className="font-medium">{f.titleJa}</span>
                              <span className="ml-2 text-xs text-slate-500">{f.keyPath}</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>

                    <div className="mt-3 text-xs text-slate-600">※ 媒体ごとに保存されます</div>
                  </div>
                ) : null}

                <div className="cv-panel-soft p-3 text-sm text-slate-700">※ コピー成功時はボタンが一時的に「コピー済み」に切り替わります。</div>

                {rows.length === 0 ? (
                  <div
                    className="rounded-md border p-4 text-sm text-slate-700"
                    style={{ background: "var(--surface-muted)", borderColor: "var(--border)" }}
                  >
                    出力できる項目がありません（入力が空、または空欄を隠す設定の可能性があります）。
                  </div>
                ) : (
                  <div className="cv-panel overflow-hidden">
                    <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                      {rows.map((r, idx) => {
                        const isLong = r.text.length >= 240 || r.text.split("\n").length >= 8;
                        const rowId = `${r.keyPath}-${idx}`;
                        const isCopied = copiedId === rowId;

                        return (
                          <div key={rowId} className="px-4 py-4">
                            <div className="flex items-start justify-between gap-6">
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-slate-900">{r.titleJa}</div>
                                <div className="mt-1 text-xs text-slate-500">{r.keyPath}</div>
                              </div>

                              <button
                                type="button"
                                className={isCopied ? "cv-btn-secondary" : "cv-btn-primary"}
                                onClick={() => handleCopyRow(rowId, r.text)}
                                disabled={!r.text}
                                aria-disabled={!r.text}
                              >
                                {isCopied ? "コピー済み" : "コピー"}
                              </button>
                            </div>

                            {collapseLongText && isLong ? (
                              <details className="mt-3">
                                <summary className="cursor-pointer text-sm text-slate-700 hover:text-slate-900">
                                  内容を表示（長文）
                                </summary>
                                <pre
                                  className="mt-3 whitespace-pre-wrap break-words rounded-md border p-3 font-mono text-xs leading-6 text-slate-900"
                                  style={{ background: "var(--surface-muted)", borderColor: "var(--border)" }}
                                >
                                  {r.text}
                                </pre>
                              </details>
                            ) : (
                              <pre
                                className="mt-3 whitespace-pre-wrap break-words rounded-md border p-3 font-mono text-xs leading-6 text-slate-900"
                                style={{ background: "var(--surface-muted)", borderColor: "var(--border)" }}
                              >
                                {r.text}
                              </pre>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <div className="sticky bottom-0 z-10 border-t" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="cv-container py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="text-xs text-slate-500">「全文コピー」でテンプレ順のテキストを一括コピーできます</div>

            <div className="flex items-center gap-2">
              <Link href={`/companies/${companyId}/jobs/${jobId}`} className="cv-btn-secondary">
                求人編集へ
              </Link>

              <button type="button" className="cv-btn-primary" onClick={handleCopyAll} disabled={!fullOutput} aria-disabled={!fullOutput}>
                全文コピー
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
