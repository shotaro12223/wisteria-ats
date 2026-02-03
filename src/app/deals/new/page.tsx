// src/app/deals/new/page.tsx
import { Suspense } from "react";
import DealsNewPageClient from "./page.client";

export default function DealsNewPage() {
  return (
    <Suspense fallback={<div className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">読み込み中...</div>}>
      <DealsNewPageClient />
    </Suspense>
  );
}
