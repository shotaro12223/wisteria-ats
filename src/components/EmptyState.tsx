import Link from "next/link";

type Props = {
  title: string;
  description?: string;
  actions?: { label: string; href: string; variant?: "primary" | "secondary" }[];
};

export default function EmptyState({ title, description, actions }: Props) {
  return (
    <div className="rounded-2xl border bg-[rgba(15,23,42,0.03)] p-6" style={{ borderColor: "var(--border)" }}>
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      {description ? <div className="mt-1 text-sm text-slate-600">{description}</div> : null}

      {actions && actions.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {actions.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className={[
                "cv-btn",
                a.variant === "primary" ? "cv-btn-primary" : "cv-btn-secondary",
              ].join(" ")}
            >
              {a.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
