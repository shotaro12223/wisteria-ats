// src/components/deals/DealMeetingCard.tsx
import { SparkIcon } from "./icons";
import { s } from "@/lib/deal-utils";

const UI = {
  CARD: "rounded-xl border-2 border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm",
  CARD_HDR: "border-b-2 border-slate-200/80 dark:border-slate-700 px-4 py-3",
  CARD_BODY: "px-4 py-3",
};

function FieldRow({ label, value, labelSize = "text-[11px]", valueSize = "text-[13px]" }: { label: string; value: string; labelSize?: string; valueSize?: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className={`${labelSize} font-semibold tracking-wide text-slate-600 dark:text-slate-400`}>{label}</div>
      <div className={`min-w-0 text-right ${valueSize} font-semibold text-slate-900 dark:text-slate-100`}>
        <span className="break-words">{value || "-"}</span>
      </div>
    </div>
  );
}

export function DealMeetingCard({
  companyName,
  dealTitle,
  profile,
  modeLabel,
  isPresentationMode = false,
}: {
  companyName: string;
  dealTitle: string;
  profile: any;
  modeLabel: string;
  isPresentationMode?: boolean;
}) {
  const p = profile && typeof profile === "object" ? profile : {};

  // プレゼンモード時はフォントサイズを大きく
  const headerTextSize = isPresentationMode ? "text-[14px]" : "text-[11px]";
  const companyTextSize = isPresentationMode ? "text-[22px]" : "text-[16px]";
  const dealTitleTextSize = isPresentationMode ? "text-[16px]" : "text-[12px]";
  const badgeTextSize = isPresentationMode ? "text-[14px]" : "text-[12px]";
  const sectionTitleSize = isPresentationMode ? "text-[16px]" : "text-[12px]";
  const fieldTextSize = isPresentationMode ? "text-[14px]" : "text-[11px]";
  const valueTextSize = isPresentationMode ? "text-[16px]" : "text-[13px]";

  return (
    <div className={[UI.CARD, "relative overflow-hidden print:shadow-none"].join(" ")}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/55 via-white to-purple-50/45 dark:from-indigo-950/30 dark:via-slate-800 dark:to-purple-950/25" />
        <div className="absolute -left-28 -top-32 h-[440px] w-[440px] rounded-full bg-indigo-200/14 dark:bg-indigo-900/10 blur-3xl" />
        <div className="absolute -right-36 -bottom-36 h-[520px] w-[520px] rounded-full bg-purple-200/12 dark:bg-purple-900/8 blur-3xl" />
      </div>

      <div className={UI.CARD_HDR + " relative"}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className={`${headerTextSize} font-semibold tracking-wide text-slate-600 dark:text-slate-400`}>{modeLabel}</div>
            <div className={`mt-1 ${companyTextSize} font-extrabold text-slate-900 dark:text-slate-100`}>{companyName}</div>
            <div className={`mt-0.5 ${dealTitleTextSize} font-semibold text-slate-700 dark:text-slate-300`}>{dealTitle || "初回ヒアリング"}</div>
          </div>
          <div className={`inline-flex items-center gap-2 rounded-full border border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/40 px-3 py-1 ${badgeTextSize} font-semibold text-indigo-900 dark:text-indigo-200 print:hidden`}>
            <SparkIcon className="h-4 w-4" />
            提案サマリー
          </div>
        </div>
      </div>

      <div className={UI.CARD_BODY + " relative"}>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className={`rounded-xl border border-slate-200 dark:border-slate-700 bg-white/75 dark:bg-slate-900/50 ${isPresentationMode ? "p-4" : "p-3"}`}>
            <div className={`${sectionTitleSize} font-extrabold text-slate-900 dark:text-slate-100`}>提案条件</div>
            <div className={`${isPresentationMode ? "mt-4 space-y-3" : "mt-3 space-y-2"}`}>
              <FieldRow label="プラン" value={s(p.contract_plan)} labelSize={fieldTextSize} valueSize={valueTextSize} />
              <FieldRow label="キャンペーン" value={s(p.campaign_applied)} labelSize={fieldTextSize} valueSize={valueTextSize} />
              <FieldRow label="MRR" value={s(p.mrr)} labelSize={fieldTextSize} valueSize={valueTextSize} />
              <FieldRow label="請求" value={s(p.billing_cycle)} labelSize={fieldTextSize} valueSize={valueTextSize} />
              <FieldRow label="支払" value={s(p.payment_method)} labelSize={fieldTextSize} valueSize={valueTextSize} />
            </div>
          </div>

          <div className={`rounded-xl border border-slate-200 dark:border-slate-700 bg-white/75 dark:bg-slate-900/50 ${isPresentationMode ? "p-4" : "p-3"}`}>
            <div className={`${sectionTitleSize} font-extrabold text-slate-900 dark:text-slate-100`}>採用要件</div>
            <div className={`${isPresentationMode ? "mt-4 space-y-3" : "mt-3 space-y-2"}`}>
              <FieldRow label="採用目標" value={s(p.hiring_goal)} labelSize={fieldTextSize} valueSize={valueTextSize} />
              <FieldRow label="職種" value={s(p.main_job_category)} labelSize={fieldTextSize} valueSize={valueTextSize} />
              <FieldRow label="勤務地" value={`${s(p.location_prefecture)} ${s(p.location_city)}`.trim()} labelSize={fieldTextSize} valueSize={valueTextSize} />
              <FieldRow label="難易度" value={s(p.hiring_difficulty)} labelSize={fieldTextSize} valueSize={valueTextSize} />
            </div>
          </div>

          <div className={`rounded-xl border border-slate-200 dark:border-slate-700 bg-white/75 dark:bg-slate-900/50 ${isPresentationMode ? "p-4" : "p-3"} lg:col-span-2`}>
            <div className={`${sectionTitleSize} font-extrabold text-slate-900 dark:text-slate-100`}>決裁・連絡先</div>
            <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
              <div className={`rounded-lg border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/40 ${isPresentationMode ? "p-4" : "p-3"}`}>
                <div className={`${fieldTextSize} font-semibold tracking-wide text-slate-600 dark:text-slate-400`}>決裁者</div>
                <div className={`mt-1 ${valueTextSize} font-extrabold text-slate-900 dark:text-slate-100`}>
                  {`${s(p.decision_maker_title)} ${s(p.decision_maker_name)}`.trim() || "-"}
                </div>
              </div>
              <div className={`rounded-lg border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/40 ${isPresentationMode ? "p-4" : "p-3"}`}>
                <div className={`${fieldTextSize} font-semibold tracking-wide text-slate-600 dark:text-slate-400`}>運用窓口</div>
                <div className={`mt-1 ${valueTextSize} font-extrabold text-slate-900 dark:text-slate-100`}>
                  {`${s(p.primary_contact_title)} ${s(p.primary_contact_name)}`.trim() || "-"}
                </div>
              </div>
            </div>

            <div className={`${isPresentationMode ? "mt-4" : "mt-3"} grid grid-cols-1 gap-2 text-[12px]`}>
              <FieldRow label="メール" value={s(p.contact_email)} labelSize={fieldTextSize} valueSize={valueTextSize} />
              <FieldRow label="電話" value={s(p.contact_phone)} labelSize={fieldTextSize} valueSize={valueTextSize} />
              <FieldRow label="優先連絡" value={s(p.communication_preference)} labelSize={fieldTextSize} valueSize={valueTextSize} />
              <FieldRow label="連絡可能" value={s(p.contact_hours)} labelSize={fieldTextSize} valueSize={valueTextSize} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
