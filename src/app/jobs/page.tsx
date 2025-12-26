"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listJobs, deleteJob } from "@/lib/storage";
import type { Job } from "@/lib/types";

export default function JobsPage() {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    try {
      const js = listJobs();
      setJobs(js);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleDelete(id: string) {
    deleteJob(id);
    // reloadより、状態更新の方が安全（hydration/挙動が安定）
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">求人一覧</h1>
        <Link className="rounded border px-3 py-2" href="/jobs/new">
          新規作成
        </Link>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {loading ? (
          <div className="rounded border p-4 text-sm text-gray-600">読み込み中…</div>
        ) : jobs.length === 0 ? (
          <div className="rounded border p-4 text-sm text-gray-600">
            まだ求人がありません。右上から新規作成してください。
          </div>
        ) : (
          jobs.map((j) => (
            <div
              key={j.id}
              className="flex items-center justify-between gap-3 rounded border p-4"
            >
              <div className="min-w-0">
                <div className="truncate font-medium">{j.jobTitle || "(職種未入力)"}</div>
                <div className="truncate text-sm text-gray-600">
                  {j.companyName || "(会社名未入力)"}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link className="rounded border px-3 py-2 text-sm" href={`/jobs/${j.id}`}>
                  開く
                </Link>
                <button
                  className="rounded border px-3 py-2 text-sm"
                  onClick={() => handleDelete(j.id)}
                >
                  削除
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
