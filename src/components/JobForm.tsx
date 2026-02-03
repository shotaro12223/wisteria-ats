"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Job, PayType } from "@/lib/types";

type Props =
  | {
      // 既存互換（あなたの画面の呼び方）
      job: Job;
      onChange: (next: Job) => void;
      initialValue?: never;
      onSubmit?: never;
      submitLabel?: never;
    }
  | {
      // 保存型
      initialValue: Job;
      onSubmit: (next: Job) => void;
      submitLabel?: string;
      job?: never;
      onChange?: never;
    };

function isCompat(p: Props): p is { job: Job; onChange: (next: Job) => void } {
  return (p as any).job && typeof (p as any).onChange === "function";
}

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

function toNumberOrNull(s: string): number | null {
  const t = String(s ?? "").trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function numToText(v: number | null | undefined): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

const PAY_TYPES: PayType[] = ["月給", "年俸", "時給", "日給"];

export function JobForm(props: Props) {
  const compat = isCompat(props);
  const initial: Job = useMemo(() => (compat ? props.job : props.initialValue), [compat, props]);
  const submitLabel = compat ? null : props.submitLabel ?? "保存";

  const init = useMemo(() => initial as any, [initial]);

  const mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const [v, setV] = useState<any>(() => ({
    ...init,

    // ===== 重要（あなたの復活したい項目に対応）=====
    jobTitle: init.jobTitle ?? "",
    catchCopy: init.catchCopy ?? "",
    jobCategory: init.jobCategory ?? "",

    employmentType: init.employmentType ?? "",
    workStyle: init.workStyle ?? "",
    payType: init.payType ?? "",

    // 勤務地まわり
    postalCode: init.postalCode ?? "",
    prefectureCityTown: init.prefectureCityTown ?? "",
    addressLine: init.addressLine ?? "",
    buildingFloor: init.buildingFloor ?? "",
    locationNote: init.locationNote ?? "",
    nearestStation: init.nearestStation ?? "",
    access: init.access ?? "",

    // 給与
    grossPay: init.grossPay ?? "",
    basePayAndAllowance: init.basePayAndAllowance ?? "",
    fixedAllowance: init.fixedAllowance ?? "",
    bonus: init.bonus ?? "",
    raise: init.raise ?? "",
    fixedOvertime: init.fixedOvertime ?? "",
    overtimeHours: init.overtimeHours ?? "",
    annualIncomeExample: init.annualIncomeExample ?? "",
    avgMonthlyWorkHours: init.avgMonthlyWorkHours ?? "",

    // 勤務時間系
    workHours: init.workHours ?? "",
    breakTime: init.breakTime ?? "",
    avgMonthlyWorkDays: init.avgMonthlyWorkDays ?? "",
    workDaysHoursRequired: init.workDaysHoursRequired ?? "",
    secondment: init.secondment ?? "",

    // 募集人数 / 副業
    hiringCount: init.hiringCount ?? "",
    sideJob: init.sideJob ?? "",
    partTimeNote: init.partTimeNote ?? "",

    // 長文
    jobDescription: init.jobDescription ?? "",
    careerMap: init.careerMap ?? "",
    appealPoints: init.appealPoints ?? "",

    // 応募資格
    qualifications: init.qualifications ?? "",
    educationExperience: init.educationExperience ?? "",

    // 休日休暇
    holidays: init.holidays ?? "",
    annualHolidays: init.annualHolidays ?? "",
    leave: init.leave ?? "",
    childcareLeave: init.childcareLeave ?? "",

    // 試用期間
    probation: init.probation ?? "",
    probationPeriod: init.probationPeriod ?? "",
    probationCondition: init.probationCondition ?? "",
    probationPayType: init.probationPayType ?? "",
    probationPayMinText: numToText(init.probationPayMin ?? null),
    probationPayMaxText: numToText(init.probationPayMax ?? null),
    probationFixedOvertime: init.probationFixedOvertime ?? "",
    probationAvgMonthlyWorkHours: init.probationAvgMonthlyWorkHours ?? "",
    probationNote: init.probationNote ?? "",

    // その他
    other: init.other ?? "",
    tags: init.tags ?? "",
  }));

  useEffect(() => {
    const next = initial as any;
    setV({
      ...next,

      jobTitle: next.jobTitle ?? "",
      catchCopy: next.catchCopy ?? "",
      jobCategory: next.jobCategory ?? "",

      employmentType: next.employmentType ?? "",
      workStyle: next.workStyle ?? "",
      payType: next.payType ?? "",

      postalCode: next.postalCode ?? "",
      prefectureCityTown: next.prefectureCityTown ?? "",
      addressLine: next.addressLine ?? "",
      buildingFloor: next.buildingFloor ?? "",
      locationNote: next.locationNote ?? "",
      nearestStation: next.nearestStation ?? "",
      access: next.access ?? "",

      grossPay: next.grossPay ?? "",
      basePayAndAllowance: next.basePayAndAllowance ?? "",
      fixedAllowance: next.fixedAllowance ?? "",
      bonus: next.bonus ?? "",
      raise: next.raise ?? "",
      fixedOvertime: next.fixedOvertime ?? "",
      overtimeHours: next.overtimeHours ?? "",
      annualIncomeExample: next.annualIncomeExample ?? "",
      avgMonthlyWorkHours: next.avgMonthlyWorkHours ?? "",

      workHours: next.workHours ?? "",
      breakTime: next.breakTime ?? "",
      avgMonthlyWorkDays: next.avgMonthlyWorkDays ?? "",
      workDaysHoursRequired: next.workDaysHoursRequired ?? "",
      secondment: next.secondment ?? "",

      hiringCount: next.hiringCount ?? "",
      sideJob: next.sideJob ?? "",
      partTimeNote: next.partTimeNote ?? "",

      jobDescription: next.jobDescription ?? "",
      careerMap: next.careerMap ?? "",
      appealPoints: next.appealPoints ?? "",

      qualifications: next.qualifications ?? "",
      educationExperience: next.educationExperience ?? "",

      holidays: next.holidays ?? "",
      annualHolidays: next.annualHolidays ?? "",
      leave: next.leave ?? "",
      childcareLeave: next.childcareLeave ?? "",

      probation: next.probation ?? "",
      probationPeriod: next.probationPeriod ?? "",
      probationCondition: next.probationCondition ?? "",
      probationPayType: next.probationPayType ?? "",
      probationPayMinText: numToText(next.probationPayMin ?? null),
      probationPayMaxText: numToText(next.probationPayMax ?? null),
      probationFixedOvertime: next.probationFixedOvertime ?? "",
      probationAvgMonthlyWorkHours: next.probationAvgMonthlyWorkHours ?? "",
      probationNote: next.probationNote ?? "",

      other: next.other ?? "",
      tags: next.tags ?? "",
    });
  }, [initial]);

  function toJob(state: any): Job {
    const probationPayMin = toNumberOrNull(state.probationPayMinText);
    const probationPayMax = toNumberOrNull(state.probationPayMaxText);

    const out: any = { ...(compat ? props.job : props.initialValue), ...state };

    delete out.probationPayMinText;
    delete out.probationPayMaxText;

    out.probationPayMin = probationPayMin;
    out.probationPayMax = probationPayMax;

    return out as Job;
  }

  // ✅ 親の setState を「描画中」に走らせないため、必ず microtask へ逃がす
  function emit(next: any) {
    if (!compat) return;
    const payload = next as Job;

    queueMicrotask(() => {
      if (!mountedRef.current) return;
      props.onChange(payload);
    });
  }

  function setField(key: string, val: any) {
    setV((prev: any) => {
      const next = { ...prev, [key]: val };
      if (compat) emit(toJob(next));
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextJob = toJob(v);

    if (compat) {
      emit(nextJob);
      return;
    }
    props.onSubmit(nextJob);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900">求人情報</div>
          <div className="mt-1 text-xs text-slate-500">
            全項目（Job型）を維持しつつ、入力しやすいStripe風UIにしています
          </div>
        </div>

        {!compat ? (
          <button type="submit" className="cv-btn cv-btn-primary">
            {submitLabel}
          </button>
        ) : null}
      </div>

      {/* 1) 職種・キャッチ・カテゴリ */}
      <div className={panelMuted()} style={{ borderColor: "var(--border)" }}>
        <div className={sectionTitle()}>職種</div>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <div className={labelBase()}>職種</div>
            <input
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.jobTitle}
              onChange={(e) => setField("jobTitle", e.target.value)}
              placeholder="例）訪問介護スタッフ"
            />
          </div>

          <div>
            <div className={labelBase()}>キャッチコピー</div>
            <input
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.catchCopy}
              onChange={(e) => setField("catchCopy", e.target.value)}
              placeholder="例）未経験OK／月給25万〜／残業少なめ"
            />
          </div>

          <div className="sm:col-span-2">
            <div className={labelBase()}>職種カテゴリー</div>
            <input
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.jobCategory}
              onChange={(e) => setField("jobCategory", e.target.value)}
              placeholder="例）介護・福祉 / 事務 / 営業"
            />
          </div>
        </div>
      </div>

      {/* 2) 雇用条件・勤務 */}
      <div className={panelMuted()} style={{ borderColor: "var(--border)" }}>
        <div className={sectionTitle()}>雇用条件・勤務</div>

        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <div className={labelBase()}>雇用形態</div>
            <input
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.employmentType}
              onChange={(e) => setField("employmentType", e.target.value)}
              placeholder="例）正社員 / パート"
            />
          </div>

          <div>
            <div className={labelBase()}>勤務形態</div>
            <input
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.workStyle}
              onChange={(e) => setField("workStyle", e.target.value)}
              placeholder="例）シフト制 / 固定時間 / 変形労働"
            />
          </div>

          <div>
            <div className={labelBase()}>勤務時間</div>
            <input
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.workHours}
              onChange={(e) => setField("workHours", e.target.value)}
              placeholder="例）9:00-18:00"
            />
          </div>

          <div>
            <div className={labelBase()}>休憩時間</div>
            <input
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.breakTime}
              onChange={(e) => setField("breakTime", e.target.value)}
              placeholder="例）60分"
            />
          </div>

          <div>
            <div className={labelBase()}>月々平均勤務時間</div>
            <input
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.avgMonthlyWorkHours}
              onChange={(e) => setField("avgMonthlyWorkHours", e.target.value)}
              placeholder="例）月160時間"
            />
          </div>

          <div>
            <div className={labelBase()}>残業時間</div>
            <input
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.overtimeHours}
              onChange={(e) => setField("overtimeHours", e.target.value)}
              placeholder="例）月平均10時間"
            />
          </div>

          <div className="sm:col-span-2">
            <div className={labelBase()}>募集人数</div>
            <input
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.hiringCount}
              onChange={(e) => setField("hiringCount", e.target.value)}
              placeholder="例）2名"
            />
          </div>

          <div className="sm:col-span-2">
            <div className={labelBase()}>副業・Wワーク有無</div>
            <input
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.sideJob}
              onChange={(e) => setField("sideJob", e.target.value)}
              placeholder="例）可（条件あり） / 不可"
            />
          </div>

          <div className="sm:col-span-2">
            <div className={labelBase()}>勤務補足</div>
            <textarea
              className={[inputBase(), "min-h-[80px] resize-y"].join(" ")}
              style={{ borderColor: "var(--border)" }}
              value={v.partTimeNote}
              onChange={(e) => setField("partTimeNote", e.target.value)}
              placeholder={"例）1日3時間〜OK、週2日〜OK、扶養内勤務可、Wワーク歓迎"}
            />
            <div className={helpBase()}>アルバイト・パート向けの勤務日数・時間などの補足情報</div>
          </div>
        </div>
      </div>

      {/* 3) 勤務地 */}
      <div className={panelMuted()} style={{ borderColor: "var(--border)" }}>
        <div className={sectionTitle()}>勤務地</div>

        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <div className={labelBase()}>郵便番号</div>
            <input
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.postalCode}
              onChange={(e) => setField("postalCode", e.target.value)}
              placeholder="例）123-4567"
            />
          </div>

          <div>
            <div className={labelBase()}>都道府県・市区町村</div>
            <input
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.prefectureCityTown}
              onChange={(e) => setField("prefectureCityTown", e.target.value)}
              placeholder="例）東京都渋谷区"
            />
          </div>

          <div className="sm:col-span-2">
            <div className={labelBase()}>番地・建物名など</div>
            <input
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.addressLine}
              onChange={(e) => setField("addressLine", e.target.value)}
              placeholder="例）道玄坂1-2-3"
            />
          </div>

          <div>
            <div className={labelBase()}>建物・階</div>
            <input
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.buildingFloor}
              onChange={(e) => setField("buildingFloor", e.target.value)}
              placeholder="例）◯◯ビル 5F"
            />
          </div>

          <div>
            <div className={labelBase()}>最寄り駅</div>
            <input
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.nearestStation}
              onChange={(e) => setField("nearestStation", e.target.value)}
              placeholder="例）◯◯駅 徒歩5分"
            />
          </div>

          <div className="sm:col-span-2">
            <div className={labelBase()}>アクセス</div>
            <input
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.access}
              onChange={(e) => setField("access", e.target.value)}
              placeholder="例）◯◯線◯◯駅から徒歩5分"
            />
          </div>

          <div className="sm:col-span-2">
            <div className={labelBase()}>勤務地補足</div>
            <input
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.locationNote}
              onChange={(e) => setField("locationNote", e.target.value)}
              placeholder="例）直行直帰可 / 現場により変動"
            />
          </div>
        </div>
      </div>

      {/* 4) 給与 */}
      <div className={panelMuted()} style={{ borderColor: "var(--border)" }}>
        <div className={sectionTitle()}>給与</div>

        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <div className={labelBase()}>給与形態</div>
            <select
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.payType}
              onChange={(e) => setField("payType", e.target.value)}
            >
              <option value="">未設定</option>
              {PAY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <div className={helpBase()}>採用係長などで使う場合に便利。</div>
          </div>

          <div>
            <div className={labelBase()}>給与（総支給）</div>
            <input
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.grossPay}
              onChange={(e) => setField("grossPay", e.target.value)}
              placeholder="例）月給25万円〜35万円"
            />
            <div className={helpBase()}>あなたの運用：採用係長の「金額」にそのまま入れる用。</div>
          </div>

          <div className="sm:col-span-2">
            <div className={labelBase()}>給与（基本給・手当）</div>
            <input
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.basePayAndAllowance}
              onChange={(e) => setField("basePayAndAllowance", e.target.value)}
              placeholder="例）基本給20万＋処遇改善手当5万"
            />
          </div>

          <div className="sm:col-span-2">
            <div className={labelBase()}>給与（固定手当）</div>
            <input
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.fixedAllowance}
              onChange={(e) => setField("fixedAllowance", e.target.value)}
              placeholder="例）資格手当／住宅手当"
            />
          </div>

          <div>
            <div className={labelBase()}>賞与（年O回）</div>
            <input
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.bonus}
              onChange={(e) => setField("bonus", e.target.value)}
              placeholder="例）年2回（業績による）"
            />
          </div>

          <div>
            <div className={labelBase()}>昇給（年O回）</div>
            <input
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.raise}
              onChange={(e) => setField("raise", e.target.value)}
              placeholder="例）年1回"
            />
          </div>

          <div>
            <div className={labelBase()}>固定残業代</div>
            <input
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.fixedOvertime}
              onChange={(e) => setField("fixedOvertime", e.target.value)}
              placeholder="例）20時間分 3万円（超過分別途）"
            />
          </div>

          <div>
            <div className={labelBase()}>年収例</div>
            <input
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.annualIncomeExample}
              onChange={(e) => setField("annualIncomeExample", e.target.value)}
              placeholder="例）入社2年 380万円"
            />
          </div>
        </div>
      </div>

      {/* 5) 試用期間 */}
      <div className={panelMuted()} style={{ borderColor: "var(--border)" }}>
        <div className={sectionTitle()}>試用期間</div>

        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <div className={labelBase()}>試用期間</div>
            <input
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.probation}
              onChange={(e) => setField("probation", e.target.value)}
              placeholder="例）あり / なし / 3ヶ月（条件変更なし）"
            />
          </div>

          <div>
            <div className={labelBase()}>ありの場合期間</div>
            <input
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.probationPeriod}
              onChange={(e) => setField("probationPeriod", e.target.value)}
              placeholder="例）3ヶ月"
            />
          </div>

          <div>
            <div className={labelBase()}>ありの場合条件</div>
            <input
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.probationCondition}
              onChange={(e) => setField("probationCondition", e.target.value)}
              placeholder="例）期間中は時給1,200円"
            />
          </div>

          <div>
            <div className={labelBase()}>試用期間の給与形態</div>
            <select
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.probationPayType}
              onChange={(e) => setField("probationPayType", e.target.value)}
            >
              <option value="">未設定</option>
              {PAY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className={labelBase()}>試用 min</div>
              <input
                className={inputBase()}
                style={{ borderColor: "var(--border)" }}
                value={v.probationPayMinText}
                onChange={(e) => setField("probationPayMinText", e.target.value)}
                placeholder="例）1200"
                inputMode="numeric"
              />
            </div>
            <div>
              <div className={labelBase()}>試用 max</div>
              <input
                className={inputBase()}
                style={{ borderColor: "var(--border)" }}
                value={v.probationPayMaxText}
                onChange={(e) => setField("probationPayMaxText", e.target.value)}
                placeholder="例）1500"
                inputMode="numeric"
              />
            </div>
          </div>

          <div>
            <div className={labelBase()}>試用 固定残業</div>
            <input
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.probationFixedOvertime}
              onChange={(e) => setField("probationFixedOvertime", e.target.value)}
              placeholder="例）なし / 10時間分…"
            />
          </div>

          <div>
            <div className={labelBase()}>試用 月々平均勤務時間</div>
            <input
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.probationAvgMonthlyWorkHours}
              onChange={(e) => setField("probationAvgMonthlyWorkHours", e.target.value)}
              placeholder="例）月160時間"
            />
          </div>

          <div className="sm:col-span-2">
            <div className={labelBase()}>試用メモ</div>
            <textarea
              className={[inputBase(), "min-h-[90px] resize-y"].join(" ")}
              style={{ borderColor: "var(--border)" }}
              value={v.probationNote}
              onChange={(e) => setField("probationNote", e.target.value)}
              placeholder="例）条件の補足など"
            />
          </div>
        </div>
      </div>

      {/* 6) 仕事内容 */}
      <div className={panelMuted()} style={{ borderColor: "var(--border)" }}>
        <div className={sectionTitle()}>仕事内容</div>
        <textarea
          className={[inputBase(), "mt-3 min-h-[140px] resize-y"].join(" ")}
          style={{ borderColor: "var(--border)" }}
          value={v.jobDescription}
          onChange={(e) => setField("jobDescription", e.target.value)}
          placeholder="例）
・訪問介護（身体介護/生活援助）
・記録の入力
・利用者さま/ご家族との連絡…"
        />
      </div>

      {/* 7) キャリアマップ */}
      <div className={panelMuted()} style={{ borderColor: "var(--border)" }}>
        <div className={sectionTitle()}>キャリアマップ</div>
        <textarea
          className={[inputBase(), "mt-3 min-h-[120px] resize-y"].join(" ")}
          style={{ borderColor: "var(--border)" }}
          value={v.careerMap}
          onChange={(e) => setField("careerMap", e.target.value)}
          placeholder="例）
1年目：OJTで基礎習得
2年目：担当拡大
3年目：リーダー候補…"
        />
      </div>

      {/* 8) アピールポイント */}
      <div className={panelMuted()} style={{ borderColor: "var(--border)" }}>
        <div className={sectionTitle()}>アピールポイント</div>
        <textarea
          className={[inputBase(), "mt-3 min-h-[120px] resize-y"].join(" ")}
          style={{ borderColor: "var(--border)" }}
          value={v.appealPoints}
          onChange={(e) => setField("appealPoints", e.target.value)}
          placeholder="例）
・残業少なめ
・研修充実
・直行直帰OK…"
        />
      </div>

      {/* 9) 応募資格 */}
      <div className={panelMuted()} style={{ borderColor: "var(--border)" }}>
        <div className={sectionTitle()}>応募資格</div>

        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <div className={labelBase()}>応募資格</div>
            <textarea
              className={[inputBase(), "min-h-[110px] resize-y"].join(" ")}
              style={{ borderColor: "var(--border)" }}
              value={v.qualifications}
              onChange={(e) => setField("qualifications", e.target.value)}
              placeholder="例）
・初任者研修以上
・普通免許（AT可）…"
            />
          </div>

          <div className="sm:col-span-2">
            <div className={labelBase()}>学歴・経験</div>
            <textarea
              className={[inputBase(), "min-h-[90px] resize-y"].join(" ")}
              style={{ borderColor: "var(--border)" }}
              value={v.educationExperience}
              onChange={(e) => setField("educationExperience", e.target.value)}
              placeholder="例）学歴不問／未経験OK／経験者優遇…"
            />
          </div>
        </div>
      </div>

      {/* 10) 休日休暇 */}
      <div className={panelMuted()} style={{ borderColor: "var(--border)" }}>
        <div className={sectionTitle()}>休日休暇</div>

        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <div className={labelBase()}>休日休暇</div>
            <input
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.holidays}
              onChange={(e) => setField("holidays", e.target.value)}
              placeholder="例）週休2日（シフト制）"
            />
          </div>

          <div>
            <div className={labelBase()}>年間休日</div>
            <input
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.annualHolidays}
              onChange={(e) => setField("annualHolidays", e.target.value)}
              placeholder="例）110日"
            />
          </div>

          <div>
            <div className={labelBase()}>休暇</div>
            <input
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.leave}
              onChange={(e) => setField("leave", e.target.value)}
              placeholder="例）有給／夏季／年末年始"
            />
          </div>

          <div className="sm:col-span-2">
            <div className={labelBase()}>育児休業</div>
            <input
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.childcareLeave}
              onChange={(e) => setField("childcareLeave", e.target.value)}
              placeholder="例）取得実績あり"
            />
          </div>
        </div>
      </div>

      {/* 11) その他 */}
      <div className={panelMuted()} style={{ borderColor: "var(--border)" }}>
        <div className={sectionTitle()}>その他</div>

        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <div className={labelBase()}>その他</div>
            <textarea
              className={[inputBase(), "min-h-[96px] resize-y"].join(" ")}
              style={{ borderColor: "var(--border)" }}
              value={v.other}
              onChange={(e) => setField("other", e.target.value)}
              placeholder="例）特記事項"
            />
          </div>

          <div className="sm:col-span-2">
            <div className={labelBase()}>タグ</div>
            <input
              className={inputBase()}
              style={{ borderColor: "var(--border)" }}
              value={v.tags}
              onChange={(e) => setField("tags", e.target.value)}
              placeholder="例）未経験OK, 残業少, 高収入"
            />
            <div className={helpBase()}>カンマ区切り運用でOK。</div>
          </div>
        </div>
      </div>

      {!compat ? (
        <div className="flex items-center justify-end gap-2 pt-1">
          <button type="submit" className="cv-btn cv-btn-primary">
            {submitLabel}
          </button>
        </div>
      ) : null}
    </form>
  );
}
