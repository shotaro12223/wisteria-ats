"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function titleFromPath(pathname: string) {
  if (pathname.startsWith("/companies")) return "会社";
  if (pathname.startsWith("/jobs")) return "求人";
  if (pathname.startsWith("/work-queue")) return "Work Queue";
  if (pathname.startsWith("/analytics")) return "分析";
  return "wisteria-ats";
}

export default function MobileTopBar() {
  const pathname = usePathname();
  const title = titleFromPath(pathname);

  return (
    <div className="sticky top-0 z-40 border-b bg-white/85 backdrop-blur" style={{ borderColor: "var(--border)" }}>
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-slate-900">{title}</div>
          <div className="mt-0.5 text-[11px] text-slate-500 truncate">{pathname}</div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/companies" className="cv-btn-secondary">
            会社
          </Link>
          <Link href="/analytics" className="cv-btn-secondary">
            分析
          </Link>
        </div>
      </div>
    </div>
  );
}
