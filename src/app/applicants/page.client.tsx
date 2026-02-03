"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ApplicantsPageClient() {
  const router = useRouter();

  useEffect(() => {
    // 応募者リストページにリダイレクト
    router.replace("/applicants/list");
  }, [router]);

  return (
    <div className="p-8 text-center text-slate-600 dark:text-slate-400">
      応募者一覧に移動中...
    </div>
  );
}
