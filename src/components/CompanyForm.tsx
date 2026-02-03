"use client";

import { useMemo, useState } from "react";
import type { Company } from "@/lib/types";
import NumberInput from "@/components/NumberInput";
import DatePicker from "@/components/DatePicker";

type Props = {
  initialValue: Company;
  submitLabel?: string;
  onSubmit: (next: any) => void;
};

function inputBase() {
  return [
    "w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm",
    "dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700",
    "placeholder:text-slate-400 dark:placeholder:text-slate-500",
    "focus:outline-none focus:ring-4 focus:ring-[rgba(15,23,42,0.08)]",
    "dark:focus:ring-[rgba(148,163,184,0.08)]",
    "transition",
  ].join(" ");
}

function labelBase() {
  return "text-xs font-semibold text-slate-700 dark:text-slate-300";
}

function helpBase() {
  return "mt-1 text-[11px] text-slate-500 dark:text-slate-400";
}

function sectionTitle() {
  return "text-xs font-semibold text-slate-800 dark:text-slate-200";
}

function panelMuted() {
  return "rounded-2xl border bg-[rgba(15,23,42,0.02)] p-4 dark:bg-slate-800/30 dark:border-slate-700";
}

// =========================
// 一括コピペ（TSV）→フォーム自動入力
// =========================

function normalizeLabel(raw: string) {
  return String(raw ?? "")
    .replace(/\u00A0/g, " ")
    .replace(/[ \t\u3000]+/g, " ")
    .trim()
    .replace(/[：:]+$/g, "")
    .trim();
}

const BULK_LABEL_MAP: Record<string, string> = {
  "会社名": "companyName",
  "会社名（法人名）": "companyName",
  "法人名": "companyName",
  "屋号名": "tradeName",
  "法人番号": "corporateNumber",
  "ホームページ": "website",
  "ホームページURL": "website",

  "電話番号": "phone",

  // ✅ 応募受信用メールの正本（フォーム上は jobEmail を正本にする）
  "求人用アドレス": "jobEmail",
  "求人用メール": "jobEmail",
  "求人用メールアドレス": "jobEmail",
  "会社用アドレス": "jobEmail",
  "会社用メール": "jobEmail",
  "会社用メールアドレス": "jobEmail",
  "会社用ドレス": "jobEmail",

  "本社郵便番号": "hqPostalCode",
  "本社（郵便番号）": "hqAddress",
  "本社住所": "hqAddress",
  "本社住所（まとめて）": "hqAddress",
  "本社所在地": "hqAddress",

  "設立年月日": "establishedDate",
  "資本金": "capital",
  "事業内容": "businessDescription",

  "代表者": "representativeName",
  "代表者ふりがな": "representativeNameKana",
  "担当者": "contactPersonName",
  "担当者ふりがな": "contactPersonNameKana",

  "従業員数": "employeesTotal",
  "従業員数（全体）": "employeesTotal",
  "従業員数(全体)": "employeesTotal",
  "従業員数（女性）": "employeesFemale",
  "従業員数(女性)": "employeesFemale",
  "従業員数（パート）": "employeesPartTime",
  "従業員数(パート)": "employeesPartTime",
  "従業員数(全体/女性/パート)": "__employeesTriple",
  "従業員数（全体/女性/パート）": "__employeesTriple",

  "応募受付番号": "applicationReceptionNumber",
  "請求書送付先": "invoiceAddress",
  "募集勤務地郵便番号（デフォルト）": "defaultWorkLocationPostalCode",
  "募集勤務地（郵便番号）": "defaultWorkLocationPostalCode",
};

function parseBulkPairs(
  text: string
): Array<{ label: string; value: string; extra?: string }> {
  const lines = String(text ?? "").replace(/\r\n/g, "\n").split("\n");
  const out: Array<{ label: string; value: string; extra?: string }> = [];

  for (const rawLine of lines) {
    if (!rawLine) continue;

    const cols = rawLine.split("\t").map((c) => String(c ?? "").trim());
    if (cols.length < 2) continue;

    const label = normalizeLabel(cols[0] ?? "");
    const value = String(cols[1] ?? "").trim();
    const extra = cols[2] !== undefined ? String(cols[2] ?? "").trim() : undefined;

    if (!label) continue;
    out.push({ label, value, extra });
  }

  return out;
}

function tryParseEmployeesTriple(
  value: string
): { total?: string; female?: string; part?: string } | null {
  const v = value.trim();
  if (!v) return null;
  const parts = v
    .split(/[\/,、\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length < 2) return null;
  return { total: parts[0], female: parts[1], part: parts[2] };
}

export function CompanyForm({ initialValue, submitLabel = "保存", onSubmit }: Props) {
  const init = useMemo(() => initialValue as any, [initialValue]);

  const [v, setV] = useState<any>(() => ({
    ...init,

    companyName: init.companyName ?? "",
    tradeName: init.tradeName ?? "",
    corporateNumber: init.corporateNumber ?? "",
    website: init.website ?? "",

    phone: init.phone ?? "",

    // ✅ 応募受信用メール（フォーム上は jobEmail を正本）
    // 既存救済：applicationEmail があれば優先して表示
    jobEmail: init.jobEmail ?? init.applicationEmail ?? init.companyEmail ?? "",
    companyEmail: init.companyEmail ?? "",

    hqPostalCode: init.hqPostalCode ?? "",
    hqAddress: init.hqAddress ?? "",

    establishedDate: init.establishedDate ?? "",
    capital: init.capital ?? "",
    businessDescription: init.businessDescription ?? "",

    representativeName: init.representativeName ?? "",
    representativeNameKana: init.representativeNameKana ?? "",
    contactPersonName: init.contactPersonName ?? "",
    contactPersonNameKana: init.contactPersonNameKana ?? "",

    employeesTotal: init.employeesTotal ?? "",
    employeesFemale: init.employeesFemale ?? "",
    employeesPartTime: init.employeesPartTime ?? "",

    applicationReceptionNumber: init.applicationReceptionNumber ?? "",
    invoiceAddress: init.invoiceAddress ?? "",

    defaultWorkLocationPostalCode: init.defaultWorkLocationPostalCode ?? "",
  }));

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkReport, setBulkReport] = useState<{ applied: number; unknown: number } | null>(
    null
  );

  function setField(key: string, val: any) {
    setV((prev: any) => ({ ...prev, [key]: val }));
  }

  function applyBulkPaste() {
    console.log("[CompanyForm] applyBulkPaste called");
    console.log("[CompanyForm] bulkText:", bulkText);

    const pairs = parseBulkPairs(bulkText);
    console.log("[CompanyForm] parsed pairs:", pairs);

    const patch: any = {};
    let applied = 0;
    let unknown = 0;

    for (const { label, value, extra } of pairs) {
      const key = BULK_LABEL_MAP[label];
      if (!key) {
        console.log(`[CompanyForm] Unknown label: "${label}"`);
        unknown += 1;
        continue;
      }

      const main = (value ?? "").trim();
      const sub = (extra ?? "").trim();

      if (key === "hqAddress") {
        patch.hqAddress = main;
        patch.hqPostalCode = (sub ?? "").replace(/^〒\s*/, "").trim();
        applied += 1;
        continue;
      }

      if (key === "__employeesTriple") {
        if (!main) {
          patch.employeesTotal = "";
          patch.employeesFemale = "";
          patch.employeesPartTime = "";
          applied += 1;
          continue;
        }

        const triple = tryParseEmployeesTriple(main);
        if (triple) {
          patch.employeesTotal = triple.total ?? "";
          patch.employeesFemale = triple.female ?? "";
          patch.employeesPartTime = triple.part ?? "";
          applied += 1;
          continue;
        }

        patch.employeesTotal = main;
        patch.employeesFemale = "";
        patch.employeesPartTime = "";
        applied += 1;
        continue;
      }

      patch[key] = main;
      applied += 1;
    }

    console.log("[CompanyForm] Patch to apply:", patch);
    console.log("[CompanyForm] Applied:", applied, "Unknown:", unknown);

    if (Object.keys(patch).length > 0) {
      setV((prev: any) => {
        const newValue = { ...prev, ...patch };
        console.log("[CompanyForm] New form value after bulk paste:", newValue);
        return newValue;
      });
    }

    setBulkReport({ applied, unknown });
  }

  function clearBulk() {
    setBulkText("");
    setBulkReport(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    console.log("[CompanyForm] handleSubmit called");
    console.log("[CompanyForm] form values:", v);

    const jobEmail = String(v?.jobEmail ?? "").trim();
    const applicationEmail = jobEmail ? jobEmail : "";

    // ✅ サーバ側が companies.application_email に入れられるように同梱
    const payload = {
      ...(initialValue as any),
      ...(v as any),
      applicationEmail,
    };

    console.log("[CompanyForm] calling onSubmit with payload:", payload);

    try {
      onSubmit(payload);
    } catch (err) {
      console.error("[CompanyForm] onSubmit error:", err);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">会社概要</div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            未入力でも保存OK。必要なときだけ埋めれば大丈夫。
          </div>
        </div>

        <button type="submit" className="cv-btn cv-btn-primary">
          {submitLabel}
        </button>
      </div>

      <div className={panelMuted()} style={{ borderColor: "var(--border)" }}>
        <div className={sectionTitle()}>基本</div>

        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <div className={labelBase()}>会社名（法人名）</div>
            <input
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.companyName}
              onChange={(e) => setField("companyName", e.target.value)}
              placeholder="例）株式会社ウィステリア"
              required
            />
          </div>

          <div>
            <div className={labelBase()}>屋号名</div>
            <input
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.tradeName}
              onChange={(e) => setField("tradeName", e.target.value)}
              placeholder="例）ウィステリア訪問介護"
            />
          </div>

          <div>
            <div className={labelBase()}>法人番号</div>
            <input
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.corporateNumber}
              onChange={(e) => setField("corporateNumber", e.target.value)}
              placeholder="例）1234567890123"
              inputMode="numeric"
            />
          </div>

          <div className="sm:col-span-2">
            <div className={labelBase()}>ホームページ</div>
            <input
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.website}
              onChange={(e) => setField("website", e.target.value)}
              placeholder="例）https://example.com"
            />
          </div>
        </div>
      </div>

      <div className={panelMuted()} style={{ borderColor: "var(--border)" }}>
        <div className={sectionTitle()}>連絡先</div>

        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <div className={labelBase()}>電話番号</div>
            <input
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.phone}
              onChange={(e) => setField("phone", e.target.value)}
              placeholder="例）03-1234-5678"
              inputMode="tel"
            />
          </div>

          <div>
            <div className={labelBase()}>会社用アドレス（応募受信用）</div>
            <input
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.jobEmail}
              onChange={(e) => setField("jobEmail", e.target.value)}
              placeholder="例）apply@example.com"
              inputMode="email"
            />
            <div className={helpBase()}>
              ※ ここに入れたメール宛の応募メールを、会社ページに自動でまとめます。
            </div>
          </div>
        </div>
      </div>

      <div className={panelMuted()} style={{ borderColor: "var(--border)" }}>
        <div className={sectionTitle()}>本社所在地</div>

        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <div className={labelBase()}>本社郵便番号</div>
            <input
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.hqPostalCode}
              onChange={(e) => setField("hqPostalCode", e.target.value)}
              placeholder="例）123-4567"
              inputMode="numeric"
            />
          </div>

          <div className="sm:col-span-2">
            <div className={labelBase()}>本社住所（まとめて）</div>
            <input
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.hqAddress}
              onChange={(e) => setField("hqAddress", e.target.value)}
              placeholder="例）東京都渋谷区道玄坂1-2-3 ◯◯ビル5F"
            />
            <div className={helpBase()}>求人側の勤務地は求人で上書きできます。</div>
          </div>
        </div>
      </div>

      <div className={panelMuted()} style={{ borderColor: "var(--border)" }}>
        <div className={sectionTitle()}>会社情報</div>

        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <div className={labelBase()}>設立年月日</div>
            <DatePicker
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.establishedDate}
              onChange={(val) => setField("establishedDate", val)}
            />
          </div>

          <div>
            <div className={labelBase()}>資本金</div>
            <input
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.capital}
              onChange={(e) => setField("capital", e.target.value)}
              placeholder="例）1000万円"
            />
          </div>

          <div className="sm:col-span-2">
            <div className={labelBase()}>事業内容</div>
            <textarea
              className={[inputBase(), "min-h-[90px] resize-y"].join(" ")}
              style={{ borderColor: "var(--border)" }}
              value={v.businessDescription}
              onChange={(e) => setField("businessDescription", e.target.value)}
              placeholder="例）訪問介護、居宅支援、デイサービス…"
            />
          </div>
        </div>
      </div>

      <div className={panelMuted()} style={{ borderColor: "var(--border)" }}>
        <div className={sectionTitle()}>代表 / 担当</div>

        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <div className={labelBase()}>代表者</div>
            <input
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.representativeName}
              onChange={(e) => setField("representativeName", e.target.value)}
              placeholder="例）山田 太郎"
            />
          </div>

          <div>
            <div className={labelBase()}>代表者ふりがな</div>
            <input
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.representativeNameKana}
              onChange={(e) => setField("representativeNameKana", e.target.value)}
              placeholder="例）やまだ たろう"
            />
          </div>

          <div>
            <div className={labelBase()}>担当者</div>
            <input
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.contactPersonName}
              onChange={(e) => setField("contactPersonName", e.target.value)}
              placeholder="例）採用担当 佐藤"
            />
          </div>

          <div>
            <div className={labelBase()}>担当者ふりがな</div>
            <input
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.contactPersonNameKana}
              onChange={(e) => setField("contactPersonNameKana", e.target.value)}
              placeholder="例）さとう"
            />
          </div>
        </div>
      </div>

      <div className={panelMuted()} style={{ borderColor: "var(--border)" }}>
        <div className={sectionTitle()}>従業員数</div>

        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <div className={labelBase()}>全体</div>
            <NumberInput
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.employeesTotal}
              onChange={(val) => setField("employeesTotal", val)}
              placeholder="例）30"
              min="0"
            />
          </div>

          <div>
            <div className={labelBase()}>女性</div>
            <NumberInput
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.employeesFemale}
              onChange={(val) => setField("employeesFemale", val)}
              placeholder="例）18"
              min="0"
            />
          </div>

          <div>
            <div className={labelBase()}>パート</div>
            <NumberInput
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.employeesPartTime}
              onChange={(val) => setField("employeesPartTime", val)}
              placeholder="例）12"
              min="0"
            />
          </div>
        </div>
      </div>

      <div className={panelMuted()} style={{ borderColor: "var(--border)" }}>
        <div className={sectionTitle()}>応募 / 管理</div>

        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <div className={labelBase()}>応募受付番号</div>
            <input
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.applicationReceptionNumber}
              onChange={(e) => setField("applicationReceptionNumber", e.target.value)}
              placeholder="例）WIS-2025-001"
            />
          </div>

          <div>
            <div className={labelBase()}>募集勤務地郵便番号（デフォルト）</div>
            <input
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.defaultWorkLocationPostalCode}
              onChange={(e) => setField("defaultWorkLocationPostalCode", e.target.value)}
              placeholder="例）123-4567"
              inputMode="numeric"
            />
          </div>

          <div className="sm:col-span-2">
            <div className={labelBase()}>請求書送付先</div>
            <textarea
              className={[inputBase(), "min-h-[80px] resize-y"].join(" ")}
              style={{ borderColor: "var(--border)" }}
              value={v.invoiceAddress}
              onChange={(e) => setField("invoiceAddress", e.target.value)}
              placeholder="例）〒... 東京都...（宛名、部署なども）"
            />
          </div>

          <div className="sm:col-span-2">
            <div className={helpBase()}>
              ※ 会社情報は「会社ごとに1つ」保持し、求人票は求人側にも保持します（会社→求人は多対1前提）。
            </div>
          </div>
        </div>
      </div>

      <div className={panelMuted()} style={{ borderColor: "var(--border)" }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className={sectionTitle()}>一括コピペ（スプレッドシート→自動入力）</div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              A列=項目名 / B列=値 を基本として貼り付けます。
              <b>「本社住所」行（本社（郵便番号）含む）だけ</b> C列=郵便番号 / B列=住所 として反映します。
              ここに入れた内容は、<b>行が来た項目は置き換え（空ならクリア）</b>します。
            </div>
          </div>

          <button
            type="button"
            className="cv-btn cv-btn-secondary"
            onClick={() => setBulkOpen((p) => !p)}
          >
            {bulkOpen ? "閉じる" : "開く"}
          </button>
        </div>

        {bulkOpen ? (
          <div className="mt-3 space-y-3">
            <textarea
              className={[inputBase(), "min-h-[140px] resize-y"].join(" ")}
              style={{ borderColor: "var(--border)" }}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={
                "例）\n会社名\t株式会社ウィステリア\n本社（郵便番号）\t大阪市住之江区新北島6-2-1\t〒559-0024\n求人用アドレス\tapply@example.com\n"
              }
            />

            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className="cv-btn cv-btn-primary" onClick={applyBulkPaste}>
                反映する
              </button>
              <button type="button" className="cv-btn cv-btn-secondary" onClick={clearBulk}>
                クリア
              </button>

              {bulkReport ? (
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  反映: <b>{bulkReport.applied}</b> / 未対応: <b>{bulkReport.unknown}</b>
                </div>
              ) : null}
            </div>

            <div className={helpBase()}>
              ※ 「未対応」が増える場合、貼り付けたラベルが想定と違います（表記ゆれは追加できます）。
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <button type="submit" className="cv-btn cv-btn-primary">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
