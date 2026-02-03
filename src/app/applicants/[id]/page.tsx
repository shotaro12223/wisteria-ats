"use client";

import Link from "next/link";
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Applicant, ApplicantStatus } from "@/lib/applicantsStorage";
import { deleteApplicant } from "@/lib/applicantsStorage";

/* ─────────────── プレミアムHooks ─────────────── */
function useTypingEffect(text: string, speed = 30) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    if (!text) { setDisplayed(""); return; }
    let i = 0;
    setDisplayed("");
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return displayed;
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return { greeting: "おはようございます", icon: "☀️" };
  if (h >= 12 && h < 17) return { greeting: "お疲れさまです", icon: "🌤" };
  if (h >= 17 && h < 21) return { greeting: "お疲れさまです", icon: "🌅" };
  return { greeting: "夜遅くまでお疲れさまです", icon: "🌙" };
}

type ApplicantWithNames = Applicant & {
  companyName?: string;
  jobTitle?: string;
  shared_with_client?: boolean;
  shared_at?: string | null;
  client_comment?: string;
};

type InterviewSlot = {
  id: string;
  available_date: string;
  start_time: string;
  end_time: string;
  note: string | null;
  is_booked: boolean;
};

type Job = {
  id: string;
  job_title: string;
  company_id: string;
};

type ClientFeedback = {
  id: string;
  interview_type: string;
  interview_date: string;
  interviewer_name: string | null;
  interview_result: string;
  fail_reason: string | null;
  hire_intention: string | null;
  pass_rating: number | null;
  pass_comment: string | null;
  next_action: string | null;
  created_at: string;
  client_users: { id: string; display_name: string } | null;
};

type Res =
  | { ok: true; item: ApplicantWithNames }
  | { ok: false; error: { message: string } };

const STATUS_LABEL: Record<string, string> = {
  NEW: "NEW",
  PRE_NG: "面接前NG",
  SHARED: "連携済み",
  // Legacy
  DOC: "書類",
  INT: "面接",
  OFFER: "内定",
  NG: "NG",
};

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-500",
  PRE_NG: "bg-rose-500",
  SHARED: "bg-emerald-500",
  // Legacy
  DOC: "bg-purple-500",
  INT: "bg-amber-500",
  OFFER: "bg-emerald-500",
  NG: "bg-slate-400",
};

const ACTIVE_STATUSES: ApplicantStatus[] = ["NEW", "PRE_NG", "SHARED"];

const INTERVIEW_RESULT_LABEL: Record<string, { text: string; color: string }> = {
  pass: { text: "合格", color: "bg-emerald-100 text-emerald-800" },
  fail: { text: "不合格", color: "bg-rose-100 text-rose-800" },
  pending: { text: "保留", color: "bg-amber-100 text-amber-800" },
  no_show: { text: "無断欠席", color: "bg-slate-100 text-slate-800" },
};

const HIRE_INTENTION_LABEL: Record<string, string> = {
  strong_yes: "ぜひ採用",
  yes: "採用したい",
  maybe: "検討中",
  no: "見送り",
};

function fmtDateTime(iso?: string) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("ja-JP");
  } catch {
    return iso;
  }
}

export default function ApplicantDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = String(params?.id ?? "");

  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<ApplicantWithNames | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sharing, setSharing] = useState(false);

  const [status, setStatus] = useState<ApplicantStatus>("NEW");
  const [note, setNote] = useState<string>("");
  const [clientComment, setClientComment] = useState<string>("");
  const [selectedJobId, setSelectedJobId] = useState<string>("");

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  const [interviewBooking, setInterviewBooking] = useState<InterviewSlot | null>(null);
  const [availableSlots, setAvailableSlots] = useState<InterviewSlot[]>([]);
  const [bookingSlotId, setBookingSlotId] = useState<string | null>(null);

  const [feedbackList, setFeedbackList] = useState<ClientFeedback[]>([]);

  /* ─────────────── プレミアムHero用 ─────────────── */
  const heroRef = useRef<HTMLDivElement>(null);
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    setMouse({ x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height });
  }, []);

  const timeInfo = getTimeOfDay();
  const summaryText = item ? `${item.companyName || "会社未設定"} への応募詳細を確認中` : "読み込み中...";
  const typedSummary = useTypingEffect(summaryText, 25);

  // Float animation
  useEffect(() => {
    const styleId = "applicant-detail-float-animation";
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @keyframes float {
        0%, 100% { transform: translateY(0) rotate(0deg); }
        33% { transform: translateY(-20px) rotate(2deg); }
        66% { transform: translateY(10px) rotate(-1deg); }
      }
    `;
    document.head.appendChild(style);
    return () => { document.getElementById(styleId)?.remove(); };
  }, []);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/applicants/${encodeURIComponent(id)}`, { cache: "no-store" });
      const json = (await res.json()) as Res;

      if (!res.ok || !json.ok) {
        const msg = !json.ok ? json.error.message : `HTTP ${res.status}`;
        throw new Error(msg);
      }

      setItem(json.item);
      setStatus(json.item.status);
      setNote(json.item.note ?? "");
      setClientComment(json.item.client_comment ?? "");
      setSelectedJobId(json.item.jobId || "");

      // Load interview booking and available slots
      try {
        const bookingRes = await fetch(`/api/admin/applicants/${encodeURIComponent(id)}/interview-booking`, { cache: "no-store" });
        const bookingJson = await bookingRes.json();
        if (bookingJson.ok && bookingJson.data) {
          setInterviewBooking(bookingJson.data.booking || null);
          setAvailableSlots(bookingJson.data.availableSlots || []);
        }
      } catch (e) {
        console.error("Failed to load interview booking:", e);
      }

      // Load client feedback
      try {
        const fbRes = await fetch(`/api/admin/applicants/${encodeURIComponent(id)}/feedback`, { cache: "no-store" });
        const fbJson = await fbRes.json();
        if (fbJson.ok) {
          setFeedbackList(fbJson.data || []);
        }
      } catch (e) {
        console.error("Failed to load feedback:", e);
      }
    } catch (e) {
      console.error(e);
      setItem(null);
      setError("応募詳細の取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  async function loadJobs(companyId: string) {
    if (!companyId) return;
    setLoadingJobs(true);
    try {
      const res = await fetch(`/api/jobs?companyId=${encodeURIComponent(companyId)}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ok || data.jobs || data.items) {
          const jobList = data.jobs || data.items || data.data || [];
          setJobs(jobList);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingJobs(false);
    }
  }

  async function save() {
    if (!item) return;

    setSaving(true);
    try {
      // Use API directly to save both note and client_comment
      const res = await fetch(`/api/applicants/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note, clientComment }),
      });

      if (!res.ok) throw new Error("Failed to save");

      setItem({
        ...item,
        status,
        note: note || undefined,
        client_comment: clientComment || undefined,
      });
    } catch (e) {
      console.error(e);
      window.alert("保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!item) return;

    const ok = window.confirm("この応募を削除します。よろしいですか？（元に戻せません）");
    if (!ok) return;

    setDeleting(true);
    try {
      await deleteApplicant(item.id);
      const ts = Date.now();
      router.push(`/applicants?limit=300&ts=${ts}`);
    } catch (e) {
      console.error(e);
      window.alert("削除に失敗しました。");
    } finally {
      setDeleting(false);
    }
  }

  async function toggleShare() {
    if (!item) return;

    const isCurrentlyShared = item.shared_with_client;
    const action = isCurrentlyShared ? "連携解除" : "連携";
    const ok = window.confirm(`クライアントとの${action}を実行します。よろしいですか？`);
    if (!ok) return;

    setSharing(true);
    try {
      const method = isCurrentlyShared ? "DELETE" : "POST";
      const res = await fetch(`/api/admin/applicants/${item.id}/share`, {
        method,
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const json = await res.json();
      if (!json.ok) {
        throw new Error(json.error?.message || "Failed");
      }

      setItem({
        ...item,
        shared_with_client: json.data.shared_with_client,
        shared_at: json.data.shared_at,
      });

      // Clear interview booking if unsharing
      if (isCurrentlyShared) {
        setInterviewBooking(null);
        setAvailableSlots([]);
      }

      window.alert(`${action}が完了しました。`);
    } catch (e) {
      console.error(e);
      window.alert(`${action}に失敗しました。`);
    } finally {
      setSharing(false);
    }
  }

  async function bookInterviewSlot(slotId: string) {
    if (!item || bookingSlotId) return;

    setBookingSlotId(slotId);
    try {
      const res = await fetch(`/api/admin/applicants/${item.id}/interview-booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId }),
      });
      const json = await res.json();
      if (json.ok) {
        setInterviewBooking(json.data);
        setAvailableSlots((prev) => prev.filter((s) => s.id !== slotId));
        window.alert("面接日程を予約しました。");
      } else {
        window.alert(json.error?.message || "予約に失敗しました。");
      }
    } catch (e) {
      console.error(e);
      window.alert("予約に失敗しました。");
    } finally {
      setBookingSlotId(null);
    }
  }

  async function cancelInterviewBooking() {
    if (!item || !interviewBooking) return;
    if (!window.confirm("面接予約をキャンセルしますか？")) return;

    setBookingSlotId(interviewBooking.id);
    try {
      const res = await fetch(`/api/admin/applicants/${item.id}/interview-booking`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.ok) {
        setAvailableSlots((prev) =>
          [...prev, { ...interviewBooking, is_booked: false }].sort(
            (a, b) => a.available_date.localeCompare(b.available_date) || a.start_time.localeCompare(b.start_time)
          )
        );
        setInterviewBooking(null);
        window.alert("予約をキャンセルしました。");
      } else {
        window.alert(json.error?.message || "キャンセルに失敗しました。");
      }
    } catch (e) {
      console.error(e);
      window.alert("キャンセルに失敗しました。");
    } finally {
      setBookingSlotId(null);
    }
  }


  async function changeJob() {
    if (!item || !selectedJobId) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/applicants/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: selectedJobId }),
      });

      if (!res.ok) throw new Error("Failed to update job");

      const job = jobs.find((j) => j.id === selectedJobId);
      setItem({
        ...item,
        jobId: selectedJobId,
        jobTitle: job?.job_title,
      });

      window.alert("求人の紐づけを変更しました。");
    } catch (e) {
      console.error(e);
      window.alert("求人の変更に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!id) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (item?.companyId) {
      void loadJobs(item.companyId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.companyId]);

  if (loading) {
    return (
      <main className="flex items-center justify-center min-h-[50vh]">
        <div className="rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-md shadow-xl ring-1 ring-slate-200/60 dark:ring-white/10 px-8 py-6">
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">読み込み中...</span>
          </div>
        </div>
      </main>
    );
  }

  if (error || !item) {
    return (
      <main className="flex items-center justify-center min-h-[50vh]">
        <div className="rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-md shadow-xl ring-1 ring-slate-200/60 dark:ring-white/10 px-8 py-8 text-center max-w-md">
          <div className="h-16 w-16 rounded-full bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-rose-600 dark:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{error || "応募が見つかりません。"}</p>
          <Link
            href="/applicants/list"
            className="inline-block rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-700 transition-all"
          >
            ← 一覧へ
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-4">
      {/* Premium Hero Section */}
      <div
        ref={heroRef}
        onMouseMove={onMouseMove}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 shadow-2xl shadow-indigo-200/40 dark:shadow-black/40 ring-1 ring-indigo-100 dark:ring-white/5"
      >
        {/* マウス追従グラデーション */}
        <div
          className="pointer-events-none absolute h-[600px] w-[600px] rounded-full bg-gradient-to-br from-indigo-400/20 via-purple-400/15 to-pink-400/10 blur-3xl transition-all duration-500"
          style={{ left: `calc(${mouse.x * 100}% - 300px)`, top: `calc(${mouse.y * 100}% - 300px)` }}
        />
        {/* フローティングブロブ */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-40 -top-40 h-[400px] w-[400px] rounded-full bg-indigo-200/30 dark:bg-indigo-500/10 blur-3xl animate-[float_20s_ease-in-out_infinite]" />
          <div className="absolute -right-32 top-1/3 h-[300px] w-[300px] rounded-full bg-purple-200/25 dark:bg-purple-500/10 blur-3xl animate-[float_25s_ease-in-out_infinite_reverse]" />
        </div>

        {/* ヒーローコンテンツ */}
        <div className="relative z-10 px-6 py-6 lg:px-10">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
            {/* 左: タイトル・サマリー */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{timeInfo.icon}</span>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
                  {item.name || "応募者"}
                </h1>
                <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold text-white ${STATUS_COLORS[status]}`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
                  {STATUS_LABEL[status]}
                </span>
                {item.shared_with_client && (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500 text-white">
                    <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
                    連携済み
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                {typedSummary}<span className="animate-pulse">|</span>
              </p>

              {/* アクションボタン */}
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/applicants/list"
                  className="rounded-xl bg-white/80 dark:bg-white/10 backdrop-blur-sm px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 ring-1 ring-slate-200/60 dark:ring-white/10 shadow-md hover:bg-slate-50 dark:hover:bg-white/20 transition-all"
                >
                  ← 一覧へ
                </Link>
                <button
                  type="button"
                  onClick={save}
                  disabled={saving || deleting || loading}
                  className="rounded-xl bg-indigo-600 dark:bg-indigo-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:bg-indigo-700 transition-all disabled:opacity-50"
                >
                  {saving ? "保存中..." : "保存"}
                </button>
                {item.shared_with_client ? (
                  <button
                    type="button"
                    onClick={toggleShare}
                    disabled={saving || deleting || sharing || loading}
                    className="rounded-xl bg-white/80 dark:bg-white/10 backdrop-blur-sm px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 ring-1 ring-slate-200/60 dark:ring-white/10 shadow-md hover:bg-slate-50 transition-all disabled:opacity-50"
                  >
                    {sharing ? "処理中..." : "連携解除"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={toggleShare}
                    disabled={saving || deleting || sharing || loading}
                    className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:bg-emerald-700 transition-all disabled:opacity-50"
                  >
                    {sharing ? "処理中..." : "クライアントに連携"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={remove}
                  disabled={saving || deleting || loading}
                  className="rounded-xl bg-rose-100 dark:bg-rose-900/30 px-4 py-2 text-sm font-medium text-rose-700 dark:text-rose-300 ring-1 ring-rose-200/60 dark:ring-rose-700/40 shadow-md hover:bg-rose-200 transition-all disabled:opacity-50"
                >
                  {deleting ? "削除中..." : "削除"}
                </button>
              </div>
            </div>

            {/* 右: ステータスカード */}
            <div className="flex flex-wrap gap-3 lg:flex-nowrap">
              <div className="flex items-center gap-3 rounded-xl bg-white/60 dark:bg-white/5 backdrop-blur-md px-4 py-3 ring-1 ring-indigo-200/40 dark:ring-white/10 shadow-lg">
                <div className="h-10 w-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">求人</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[140px]">{item.jobTitle || "未設定"}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-white/60 dark:bg-white/5 backdrop-blur-md px-4 py-3 ring-1 ring-indigo-200/40 dark:ring-white/10 shadow-lg">
                <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">会社</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[140px]">{item.companyName || "未設定"}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* KPIセクション */}
        <div className="relative z-10 border-t border-slate-200/60 dark:border-slate-700/60 px-6 py-4 lg:px-10">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-indigo-500" />
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">媒体</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">{item.siteKey}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-purple-500" />
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">応募日</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">{item.appliedAt}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-slate-400" />
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">更新</span>
              <span className="text-sm text-slate-600 dark:text-slate-400">{fmtDateTime(item.updatedAt)}</span>
            </div>
            <div className="ml-auto text-[11px] text-slate-500 dark:text-slate-400">
              ID: {id}
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Left Column: 面接日程 + 求人変更 */}
        <div className="space-y-4">
          {/* 面接日程カード */}
          <div className="rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-md shadow-xl ring-1 ring-slate-200/60 dark:ring-white/10 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200/60 dark:border-slate-700/60">
              <h2 className="text-[14px] font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                  <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                面接日程
                {!item.shared_with_client && (
                  <span className="ml-2 text-[10px] font-normal text-amber-600">
                    （連携前に日程を確定）
                  </span>
                )}
              </h2>
            </div>
            <div className="p-5">
              {/* Already Booked */}
              {interviewBooking && (
                <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-900/30 dark:to-violet-900/30 border border-indigo-200 dark:border-indigo-700">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex flex-col items-center justify-center">
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium leading-none">
                          {new Date(interviewBooking.available_date).toLocaleDateString("ja-JP", { month: "short" })}
                        </span>
                        <span className="text-[18px] text-indigo-700 dark:text-indigo-300 font-bold leading-none">
                          {new Date(interviewBooking.available_date).getDate()}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-semibold">確定</span>
                        </div>
                        <div className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">
                          {new Date(interviewBooking.available_date).toLocaleDateString("ja-JP", { weekday: "long" })}
                        </div>
                        <div className="text-[12px] text-slate-600 dark:text-slate-400">
                          {interviewBooking.start_time.slice(0, 5)} 〜 {interviewBooking.end_time.slice(0, 5)}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={cancelInterviewBooking}
                      disabled={bookingSlotId !== null}
                      className="text-[11px] text-rose-600 hover:text-rose-700 font-medium disabled:opacity-50"
                    >
                      {bookingSlotId === interviewBooking.id ? "..." : "取消"}
                    </button>
                  </div>
                </div>
              )}

              {/* Not booked yet - show client's available slots */}
              {!interviewBooking && (
                <div className="space-y-2">
                  {availableSlots.length > 0 ? (
                    <>
                      <div className="text-[11px] text-emerald-600 font-medium mb-2">
                        クライアント対応可能日から選択:
                      </div>
                      <div className="grid grid-cols-1 gap-1.5 max-h-[200px] overflow-y-auto">
                        {availableSlots.map((slot) => (
                          <button
                            key={slot.id}
                            onClick={() => bookInterviewSlot(slot.id)}
                            disabled={bookingSlotId !== null}
                            className="w-full p-2.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:border-emerald-400 hover:bg-emerald-100 disabled:opacity-50 transition-all text-left flex items-center justify-between group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex flex-col items-center justify-center">
                                <span className="text-[10px] text-emerald-600 font-medium leading-none">
                                  {new Date(slot.available_date).toLocaleDateString("ja-JP", { month: "short" })}
                                </span>
                                <span className="text-[14px] text-emerald-700 font-bold leading-none">
                                  {new Date(slot.available_date).getDate()}
                                </span>
                              </div>
                              <div>
                                <div className="text-[12px] font-medium text-slate-800">
                                  {new Date(slot.available_date).toLocaleDateString("ja-JP", { weekday: "long" })}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  {slot.start_time.slice(0, 5)} 〜 {slot.end_time.slice(0, 5)}
                                </div>
                              </div>
                            </div>
                            {bookingSlotId === slot.id ? (
                              <div className="w-5 h-5 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" />
                            ) : (
                              <span className="text-[11px] text-emerald-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                選択 →
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="p-4 rounded-lg border border-amber-200 bg-amber-50 text-center">
                      <svg className="w-8 h-8 text-amber-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                      </svg>
                      <div className="text-[12px] font-medium text-amber-800">
                        クライアントが対応可能日を登録していません
                      </div>
                      <div className="text-[11px] text-amber-600 mt-1">
                        クライアントポータルで対応可能日を登録してもらってください
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 求人変更カード */}
          <div className="rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-md shadow-xl ring-1 ring-slate-200/60 dark:ring-white/10 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200/60 dark:border-slate-700/60">
              <h2 className="text-[14px] font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                求人変更
              </h2>
            </div>
            <div className="p-5 space-y-3">
              <select
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all"
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                disabled={loadingJobs}
              >
                <option value="">-- 求人を選択 --</option>
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.job_title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={changeJob}
                disabled={saving || !selectedJobId || selectedJobId === item.jobId}
                className="w-full rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 hover:bg-purple-700 transition-all disabled:opacity-50 disabled:shadow-none"
              >
                {saving ? "変更中..." : "求人を変更"}
              </button>
              {item.companyId && item.jobId && (
                <Link
                  href={`/companies/${item.companyId}/jobs/${item.jobId}`}
                  className="block w-full text-center text-[12px] font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 py-2"
                >
                  → 求人ページへ
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Status & Notes */}
        <div className="space-y-4">
          {/* 選考状況カード */}
          <div className="rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-md shadow-xl ring-1 ring-slate-200/60 dark:ring-white/10 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200/60 dark:border-slate-700/60">
              <h2 className="text-[14px] font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                  <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                選考状況
              </h2>
            </div>
            <div className="p-5">
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase">
                ステータス
              </label>
              <div className="flex items-center gap-4">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ApplicantStatus)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all"
                >
                  {ACTIVE_STATUSES.map((k) => (
                    <option key={k} value={k}>{STATUS_LABEL[k]}</option>
                  ))}
                  {/* Show legacy status as option if currently set */}
                  {!ACTIVE_STATUSES.includes(status) && (
                    <option value={status}>{STATUS_LABEL[status] || status}（旧）</option>
                  )}
                </select>

                <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />

                {/* Latest client feedback */}
                {feedbackList.length > 0 ? (() => {
                  const latest = feedbackList[0];
                  const resultInfo = INTERVIEW_RESULT_LABEL[latest.interview_result];
                  const intentionLabel = latest.hire_intention ? HIRE_INTENTION_LABEL[latest.hire_intention] : null;
                  return (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">面談結果:</span>
                      {resultInfo && (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${resultInfo.color}`}>
                          {resultInfo.text}
                        </span>
                      )}
                      {intentionLabel && (
                        <span className="text-[11px] text-slate-600 dark:text-slate-400">
                          ({intentionLabel})
                        </span>
                      )}
                    </div>
                  );
                })() : (
                  <span className="text-[11px] text-slate-400">面談結果なし</span>
                )}
              </div>
            </div>
          </div>

          {/* クライアント向けコメント */}
          <div className="rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-md shadow-xl ring-1 ring-slate-200/60 dark:ring-white/10 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200/60 dark:border-slate-700/60">
              <h2 className="text-[14px] font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center">
                  <svg className="w-4 h-4 text-sky-600 dark:text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </div>
                クライアント向けコメント
                <span className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300">
                  連携時に表示
                </span>
              </h2>
            </div>
            <div className="p-5">
              <textarea
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                rows={5}
                value={clientComment}
                onChange={(e) => setClientComment(e.target.value)}
                placeholder="クライアントに共有する選考状況や次のステップ（例：書類選考通過しました。面接日程の調整をお願いします）"
              />
            </div>
          </div>

          {/* 社内メモ */}
          <div className="rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-md shadow-xl ring-1 ring-slate-200/60 dark:ring-white/10 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200/60 dark:border-slate-700/60">
              <h2 className="text-[14px] font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                  <svg className="w-4 h-4 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                社内メモ
                <span className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                  社内のみ
                </span>
              </h2>
            </div>
            <div className="p-5">
              <textarea
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                rows={5}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="社内専用メモ / やること / 次アクション / 面接メモなど"
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
