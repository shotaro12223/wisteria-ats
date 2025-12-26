"use client";

import { useMemo, useState } from "react";
import type { Company } from "@/lib/types";

type Props = {
  initialValue: Company;
  submitLabel?: string;
  onSubmit: (next: Company) => void;
};

function inputBase() {
  return [
    "w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm",
    "placeholder:text-slate-400",
    "focus:outline-none focus:ring-4 focus:ring-[rgba(15,23,42,0.08)]",
    "transition",
  ].join(" ");
}

function labelBase() {
  return "text-xs font-semibold text-slate-700";
}

function helpBase() {
  return "mt-1 text-[11px] text-slate-500";
}

function sectionTitle() {
  return "text-xs font-semibold text-slate-800";
}

function panelMuted() {
  return "rounded-2xl border bg-[rgba(15,23,42,0.02)] p-4";
}

export function CompanyForm({ initialValue, submitLabel = "保存", onSubmit }: Props) {
  const init = useMemo(() => initialValue as any, [initialValue]);

  const [v, setV] = useState<any>(() => ({
    ...init,

    // 基本
    companyName: init.companyName ?? "",
    tradeName: init.tradeName ?? "",
    corporateNumber: init.corporateNumber ?? "",
    website: init.website ?? "",

    // 連絡先
    phone: init.phone ?? "",
    companyEmail: init.companyEmail ?? "",

    // 本社所在地
    hqPostalCode: init.hqPostalCode ?? "",
    hqAddress: init.hqAddress ?? "",

    // 会社情報
    establishedDate: init.establishedDate ?? "",
    capital: init.capital ?? "",
    businessDescription: init.businessDescription ?? "",

    // 代表/担当
    representativeName: init.representativeName ?? "",
    representativeNameKana: init.representativeNameKana ?? "",
    contactPersonName: init.contactPersonName ?? "",
    contactPersonNameKana: init.contactPersonNameKana ?? "",

    // 従業員数
    employeesTotal: init.employeesTotal ?? "",
    employeesFemale: init.employeesFemale ?? "",
    employeesPartTime: init.employeesPartTime ?? "",

    // 応募/管理
    applicationReceptionNumber: init.applicationReceptionNumber ?? "",
    invoiceAddress: init.invoiceAddress ?? "",

    // 募集勤務地デフォルト
    defaultWorkLocationPostalCode: init.defaultWorkLocationPostalCode ?? "",
  }));

  function setField(key: string, val: any) {
    setV((prev: any) => ({ ...prev, [key]: val }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ ...(initialValue as any), ...(v as any) } as Company);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900">会社概要</div>
          <div className="mt-1 text-xs text-slate-500">未入力でも保存OK。必要なときだけ埋めれば大丈夫。</div>
        </div>

        <button type="submit" className="cv-btn cv-btn-primary">
          {submitLabel}
        </button>
      </div>

      {/* 基本 */}
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

      {/* 連絡先 */}
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
            <div className={labelBase()}>会社用アドレス</div>
            <input
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.companyEmail}
              onChange={(e) => setField("companyEmail", e.target.value)}
              placeholder="例）info@example.com"
              inputMode="email"
            />
          </div>
        </div>
      </div>

      {/* 本社所在地 */}
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

      {/* 会社情報 */}
      <div className={panelMuted()} style={{ borderColor: "var(--border)" }}>
        <div className={sectionTitle()}>会社情報</div>

        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <div className={labelBase()}>設立年月日</div>
            <input
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.establishedDate}
              onChange={(e) => setField("establishedDate", e.target.value)}
              placeholder="例）2020-04（YYYY-MM） or 2020-04-01"
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

      {/* 代表/担当 */}
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

      {/* 従業員数 */}
      <div className={panelMuted()} style={{ borderColor: "var(--border)" }}>
        <div className={sectionTitle()}>従業員数</div>

        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <div className={labelBase()}>全体</div>
            <input
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.employeesTotal}
              onChange={(e) => setField("employeesTotal", e.target.value)}
              placeholder="例）30"
              inputMode="numeric"
            />
          </div>

          <div>
            <div className={labelBase()}>女性</div>
            <input
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.employeesFemale}
              onChange={(e) => setField("employeesFemale", e.target.value)}
              placeholder="例）18"
              inputMode="numeric"
            />
          </div>

          <div>
            <div className={labelBase()}>パート</div>
            <input
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.employeesPartTime}
              onChange={(e) => setField("employeesPartTime", e.target.value)}
              placeholder="例）12"
              inputMode="numeric"
            />
          </div>
        </div>
      </div>

      {/* 応募/管理 */}
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

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <button type="submit" className="cv-btn cv-btn-primary">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
