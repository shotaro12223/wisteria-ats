"use client";

import type { JobSite } from "@/lib/types";

const SITE_LABEL: Record<string, string> = {
  採用係長: "採用係長",
  AirWork: "AirWork",
  Engage: "エンゲージ",
  Indeed: "indeed",
  求人BOX: "求人ボックス",
  はたらきんぐ: "はたらきんぐ",
  求人Free: "求人Free",
  ハローワーク: "ハローワーク",
  げんきワーク: "げんきワーク",
  ジモティー: "ジモティー",
};

type Option = JobSite | { value: JobSite; label: string };

export function TemplateSelector(props: {
  value: JobSite;
  options: readonly Option[];
  onChange: (next: JobSite) => void;
}) {
  const { value, options, onChange } = props;

  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm font-medium text-slate-900">媒体</div>
      <select
        className="cv-input w-full"
        value={value}
        onChange={(e) => onChange(e.target.value as JobSite)}
      >
        {options.map((opt) => {
          const v = typeof opt === "string" ? opt : opt.value;
          const label = typeof opt === "string" ? SITE_LABEL[opt] ?? opt : opt.label;
          return (
            <option key={String(v)} value={String(v)}>
              {label}
            </option>
          );
        })}
      </select>
    </div>
  );
}
