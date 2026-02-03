"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import DatePicker from "@/components/DatePicker";

// ──────────────────────────────────────────
// Premium Hooks & Utils (from Home)
// ──────────────────────────────────────────
function useCountUp(target: number, duration = 2800) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    setValue(Math.max(1, Math.round(target * 0.1)));
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 5);
      const current = Math.round(target * 0.1 + eased * target * 0.9);
      setValue(Math.min(current, target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return value;
}

function useTypingEffect(text: string, speed = 80) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) { clearInterval(timer); setDone(true); }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);
  return { displayed, done };
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return { greeting: "おはようございます", period: "morning", icon: "☀️" };
  if (h >= 12 && h < 17) return { greeting: "お疲れさまです", period: "afternoon", icon: "🌤" };
  if (h >= 17 && h < 21) return { greeting: "お疲れさまです", period: "evening", icon: "🌅" };
  return { greeting: "夜遅くまでお疲れさまです", period: "night", icon: "🌙" };
}

// ──────────────────────────────────────────
// SVG Line Icons
// ──────────────────────────────────────────
const Icons = {
  // 警告
  Warning: ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  // ピン/タグ
  Pin: ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  ),
  // クリップボード
  Clipboard: ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
  ),
  // 電源/アクティブ
  Zap: ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  // チェック
  Check: ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  // 時計
  Clock: ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  // ユーザー
  User: ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  // 複数ユーザー
  Users: ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
  // 会社/ビル
  Building: ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <line x1="8" y1="6" x2="8" y2="6.01" />
      <line x1="16" y1="6" x2="16" y2="6.01" />
      <line x1="12" y1="6" x2="12" y2="6.01" />
      <line x1="8" y1="10" x2="8" y2="10.01" />
      <line x1="16" y1="10" x2="16" y2="10.01" />
      <line x1="12" y1="10" x2="12" y2="10.01" />
      <line x1="8" y1="14" x2="8" y2="14.01" />
      <line x1="16" y1="14" x2="16" y2="14.01" />
      <line x1="12" y1="14" x2="12" y2="14.01" />
    </svg>
  ),
  // カレンダー
  Calendar: ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  // 編集
  Edit: ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  // ゴミ箱
  Trash: ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    </svg>
  ),
  // プラス
  Plus: ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  // スター
  Star: ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  // 保存
  Save: ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  ),
  // 検索
  Search: ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  ),
  // 通知
  Bell: ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  ),
  // 通知オフ
  BellOff: ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M13.73 21a2 2 0 01-3.46 0" />
      <path d="M18.63 13A17.89 17.89 0 0118 8" />
      <path d="M6.26 6.26A5.86 5.86 0 006 8c0 7-3 9-3 9h14" />
      <path d="M18 8a6 6 0 00-9.33-5" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ),
  // 閉じる
  X: ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  // ハンドシェイク/打ち合わせ
  Handshake: ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20.42 4.58a5.4 5.4 0 00-7.65 0l-.77.78-.77-.78a5.4 5.4 0 00-7.65 7.65l1.06 1.06L12 20.23l7.36-6.94 1.06-1.06a5.4 5.4 0 000-7.65z" />
    </svg>
  ),
  // ブリーフケース/提案
  Briefcase: ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
    </svg>
  ),
  // ファイル/求人原稿
  FileText: ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  // 更新
  RefreshCw: ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  ),
  // 電話
  Phone: ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
    </svg>
  ),
  // ファイル/資料
  File: ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" />
      <polyline points="13 2 13 9 20 9" />
    </svg>
  ),
  // アラート丸
  AlertCircle: ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  // メール
  Mail: ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  ),
  // チャット
  MessageSquare: ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  ),
  // フィルター
  Filter: ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  ),
};

type WorkQueueItem = {
  id: string;
  title: string;
  task_type: string;
  company_id: string | null;
  assignee_user_id: string | null;
  assignee_user_ids: string[] | null;
  deadline: string | null;
  preferred_date: string | null;
  note: string | null;
  status: "pending" | "in_progress" | "completed";
  priority: "urgent" | "high" | "medium" | "low";
  is_acknowledged: boolean;
  created_at: string;
  updated_at: string;
  companies: {
    id: string;
    company_name: string;
  } | null;
  assignee_info: {
    user_id: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

type Member = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
};

const TASK_TYPES = [
  { value: "meeting", label: "打ち合わせ", Icon: Icons.Handshake, defaultTitle: "打ち合わせ日程調整" },
  { value: "proposal", label: "提案・商談", Icon: Icons.Briefcase, defaultTitle: "提案資料作成" },
  { value: "job_posting", label: "求人原稿作成", Icon: Icons.FileText, defaultTitle: "求人原稿作成" },
  { value: "update", label: "情報更新", Icon: Icons.RefreshCw, defaultTitle: "情報更新" },
  { value: "follow_up", label: "フォローアップ", Icon: Icons.Phone, defaultTitle: "フォローアップ連絡" },
  { value: "document", label: "資料作成", Icon: Icons.File, defaultTitle: "資料作成" },
  { value: "other", label: "その他", Icon: Icons.Clipboard, defaultTitle: "" },
];

function getTaskTypeInfo(type: string) {
  return TASK_TYPES.find((t) => t.value === type) || TASK_TYPES[TASK_TYPES.length - 1];
}

type CaseAlert = {
  staleJobs: number;
  newApplicants: number;
  staleDeals: number;
};

export default function WorkQueuePage() {
  const [items, setItems] = useState<WorkQueueItem[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [companies, setCompanies] = useState<Array<{ id: string; company_name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<WorkQueueItem | null>(null);
  const [caseAlerts, setCaseAlerts] = useState<CaseAlert>({ staleJobs: 0, newApplicants: 0, staleDeals: 0 });
  const [inboxStats, setInboxStats] = useState({ totalNew: 0, totalNoJob: 0, totalLinkedButNew: 0 });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const notifiedTaskIdsRef = useRef<Set<string>>(new Set());
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const [filterMyTasks, setFilterMyTasks] = useState(false);
  const [filterCompanyId, setFilterCompanyId] = useState<string>("ALL");

  useEffect(() => {
    loadItems();
    loadMembers();
    loadCompanies();
    loadCaseAlerts();
    loadInboxStats();
    loadCurrentUser();
    requestNotificationPermission();
  }, []);

  // currentUserId が設定されたら定期チェックを開始（動的ポーリング間隔）
  useEffect(() => {
    if (!currentUserId) return;

    // 初回チェック（少し遅延させる）
    const initialCheck = setTimeout(() => {
      checkNewTasks();
    }, 2000);

    // アクティブなタスク（pending または in_progress）があるかチェック
    const hasActiveTasks = items.some((item) => item.status === "pending" || item.status === "in_progress");

    // 動的ポーリング間隔: アクティブタスクあり = 15秒, なし = 60秒
    const pollingInterval = hasActiveTasks ? 15000 : 60000;

    // 定期的に新しいタスクをチェック
    const interval = setInterval(() => {
      checkNewTasks();
    }, pollingInterval);

    return () => {
      clearTimeout(initialCheck);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, items]);

  async function loadItems() {
    setLoading(true);
    try {
      const res = await fetch("/api/work-queue/items", { cache: "no-store" });
      const json = await res.json();
      console.log("[WorkQueue Debug] loadItems API Response:", json);
      if (json.ok) {
        console.log("[WorkQueue Debug] Setting items count:", json.data?.length);
        console.log("[WorkQueue Debug] First 3 items:", json.data?.slice(0, 3));
        console.log("[WorkQueue Debug] Checking priority and is_acknowledged fields:");
        json.data?.slice(0, 3).forEach((item: any, index: number) => {
          console.log(`[WorkQueue Debug] Item ${index}:`, {
            id: item.id,
            title: item.title,
            status: item.status,
            priority: item.priority,
            is_acknowledged: item.is_acknowledged
          });
        });
        setItems(json.data);
      } else {
        console.error("API returned ok: false", json);
      }
    } catch (err) {
      console.error("Failed to load work queue items:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadMembers() {
    try {
      const res = await fetch("/api/work-queue/members", { cache: "no-store" });
      const json = await res.json();
      if (json.ok) {
        setMembers(json.data);
      }
    } catch (err) {
      console.error("Failed to load members:", err);
    }
  }

  async function loadCompanies() {
    try {
      const res = await fetch("/api/companies", { cache: "no-store" });
      const json = await res.json();
      if (json.ok) {
        const companiesData = Array.isArray(json.companies) ? json.companies : [];
        setCompanies(companiesData.map((c: any) => ({
          id: c.id,
          company_name: c.company_name || c.companyName || "(会社名未設定)",
        })));
      }
    } catch (err) {
      console.error("Failed to load companies:", err);
    }
  }

  async function loadCaseAlerts() {
    try {
      const now = Date.now();
      const STALE_DAYS = 14;
      const staleThreshold = now - STALE_DAYS * 24 * 60 * 60 * 1000;

      // 並列でデータ取得（applicantsはinboxStatsで取得するので不要）
      const [jobsRes, dealsRes] = await Promise.all([
        fetch("/api/jobs", { cache: "no-store" }),
        fetch("/api/deals?limit=100", { cache: "no-store" }),
      ]);

      const [jobsJson, dealsJson] = await Promise.all([
        jobsRes.json(),
        dealsRes.json(),
      ]);

      let staleJobs = 0;
      let staleDeals = 0;

      // 1. 放置されている求人（14日以上更新なし）
      if (jobsJson.ok && Array.isArray(jobsJson.jobs)) {
        staleJobs = jobsJson.jobs.filter((job: any) => {
          const updatedAt = new Date(job.updated_at).getTime();
          return updatedAt < staleThreshold;
        }).length;
      }

      // 2. 放置されている商談（提案中で14日以上更新なし）
      if (dealsJson.ok && Array.isArray(dealsJson.items)) {
        staleDeals = dealsJson.items.filter((deal: any) => {
          const stage = String(deal.stage ?? "");
          const updatedAt = new Date(deal.updatedAt).getTime();
          const isProposal = stage.includes("提案") || stage.includes("稟議");
          return isProposal && updatedAt < staleThreshold;
        }).length;
      }

      setCaseAlerts({ staleJobs, newApplicants: 0, staleDeals });
    } catch (err) {
      console.error("Failed to load case alerts:", err);
    }
  }

  async function loadInboxStats() {
    try {
      const res = await fetch("/api/gmail/inbox?limit=1", { cache: "no-store" });
      const json = await res.json();
      if (json.ok && json.stats) {
        setInboxStats({
          totalNew: json.stats.totalNew ?? 0,
          totalNoJob: json.stats.totalNoJob ?? 0,
          totalLinkedButNew: json.stats.totalLinkedButNew ?? 0,
        });
      }
    } catch (err) {
      console.error("Failed to load inbox stats:", err);
    }
  }

  async function loadCurrentUser() {
    try {
      const res = await fetch("/api/me", { cache: "no-store" });
      const json = await res.json();
      if (json.ok && json.user) {
        setCurrentUserId(json.user.id);
      }
    } catch (err) {
      console.error("Failed to load current user:", err);
    }
  }

  async function requestNotificationPermission() {
    if ("Notification" in window) {
      const currentPermission = Notification.permission;
      setNotificationPermission(currentPermission);
      console.log("Current notification permission:", currentPermission);

      if (currentPermission === "default") {
        console.log("Requesting notification permission...");
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        console.log("Notification permission result:", permission);
      }
    }
  }

  async function checkNewTasks() {
    if (!currentUserId) return;

    try {
      const res = await fetch("/api/work-queue/items", { cache: "no-store" });
      const json = await res.json();
      console.log("Checking new tasks for user:", currentUserId);

      if (json.ok && Array.isArray(json.data)) {
        const myNewTasks = json.data.filter((item: WorkQueueItem) => {
          const isMyTask = item.assignee_user_id === currentUserId;
          const isNotCompleted = item.status !== "completed";
          const isNotNotified = !notifiedTaskIdsRef.current.has(item.id);

          console.log(`Task ${item.id}:`, {
            title: item.title,
            isMyTask,
            isNotCompleted,
            isNotNotified,
            assigneeId: item.assignee_user_id,
            currentUserId,
          });

          return isMyTask && isNotCompleted && isNotNotified;
        });

        console.log(`Found ${myNewTasks.length} new tasks to notify`);

        myNewTasks.forEach((task: WorkQueueItem) => {
          showNotification(task);
          notifiedTaskIdsRef.current.add(task.id);
        });

        // 通知済みタスクが完了または削除されたらSetから削除
        const currentTaskIds = new Set(json.data.map((item: WorkQueueItem) => item.id));
        notifiedTaskIdsRef.current = new Set(
          [...notifiedTaskIdsRef.current].filter((id) => currentTaskIds.has(id))
        );
      }
    } catch (err) {
      console.error("Failed to check new tasks:", err);
    }
  }

  function showNotification(task: WorkQueueItem) {
    console.log("Attempting to show notification for task:", task.id);
    console.log("Notification support:", "Notification" in window);
    console.log("Notification permission:", Notification?.permission);

    if ("Notification" in window && Notification.permission === "granted") {
      const taskInfo = getTaskTypeInfo(task.task_type);
      const companyName = task.companies?.company_name || "";

      // タイトルにタスクタイプを表示
      const title = `${taskInfo.label}のタスクが割り当てられました`;

      // 本文に詳細情報を表示
      const bodyParts: string[] = [];
      bodyParts.push(`📝 ${task.title}`);

      if (companyName) {
        bodyParts.push(`🏢 ${companyName}`);
      }

      if (task.deadline) {
        const deadlineDate = new Date(task.deadline);
        const formattedDeadline = `${deadlineDate.getFullYear()}/${String(deadlineDate.getMonth() + 1).padStart(2, '0')}/${String(deadlineDate.getDate()).padStart(2, '0')}`;
        bodyParts.push(`📅 期限: ${formattedDeadline}`);
      }

      const body = bodyParts.join('\n');

      console.log("Creating notification:", { title, body });

      const notification = new Notification(title, {
        body,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        tag: `work-queue-${task.id}`,
        requireInteraction: true, // 自動で消えないようにする
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      console.log("Notification created successfully");
    } else if ("Notification" in window && Notification.permission !== "granted") {
      console.warn("Notification permission not granted. Current permission:", Notification.permission);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("このタスクを削除しますか？")) return;

    try {
      const res = await fetch(`/api/work-queue/items/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.ok) {
        await loadItems();
      } else {
        alert("削除に失敗しました: " + json.error.message);
      }
    } catch (err) {
      console.error("Failed to delete item:", err);
      alert("削除に失敗しました");
    }
  }

  async function handleStatusChange(id: string, status: string) {
    console.log("[WorkQueue Debug] handleStatusChange called:", { id, status });
    try {
      const res = await fetch(`/api/work-queue/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      console.log("[WorkQueue Debug] API response status:", res.status);
      const json = await res.json();
      console.log("[WorkQueue Debug] API response json:", json);
      if (json.ok) {
        console.log("[WorkQueue Debug] Reloading items...");
        await loadItems();
        console.log("[WorkQueue Debug] Items reloaded");
      } else {
        alert("ステータス変更に失敗しました: " + json.error.message);
      }
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("ステータス変更に失敗しました");
    }
  }

  async function handleAcknowledgeChange(id: string, isAcknowledged: boolean) {
    try {
      const res = await fetch(`/api/work-queue/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_acknowledged: isAcknowledged }),
      });
      const json = await res.json();
      if (json.ok) {
        await loadItems();
      } else {
        alert("確認状態の変更に失敗しました: " + json.error.message);
      }
    } catch (err) {
      console.error("Failed to update acknowledge status:", err);
      alert("確認状態の変更に失敗しました");
    }
  }

  async function handlePriorityChange(id: string, priority: "urgent" | "high" | "medium" | "low") {
    console.log("[WorkQueue Debug] handlePriorityChange called:", { id, priority });
    try {
      const res = await fetch(`/api/work-queue/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority }),
      });
      console.log("[WorkQueue Debug] Priority API response status:", res.status);
      const json = await res.json();
      console.log("[WorkQueue Debug] Priority API response json:", json);
      if (json.ok) {
        console.log("[WorkQueue Debug] Reloading items after priority change...");
        await loadItems();
        console.log("[WorkQueue Debug] Items reloaded after priority change");
      } else {
        alert("優先順位の変更に失敗しました: " + json.error.message);
      }
    } catch (err) {
      console.error("Failed to update priority:", err);
      alert("優先順位の変更に失敗しました");
    }
  }

  // フィルタリング
  const filteredItems = useMemo(() => {
    let result = items;

    // 会社フィルター
    if (filterCompanyId !== "ALL") {
      result = result.filter((i) => i.company_id === filterCompanyId);
    }

    // 自分のタスクフィルター
    if (filterMyTasks && currentUserId) {
      result = result.filter((i) => i.assignee_user_id === currentUserId);
    }

    return result;
  }, [items, filterMyTasks, currentUserId, filterCompanyId]);

  const pendingItems = filteredItems.filter((i) => i.status === "pending");
  const inProgressItems = filteredItems.filter((i) => i.status === "in_progress");
  const completedItems = filteredItems.filter((i) => i.status === "completed");

  // 注意喚起サマリーの計算
  const activeItems = filteredItems.filter((i) => i.status !== "completed");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdueItems = activeItems.filter((item) => {
    if (!item.deadline) return false;
    const deadlineDate = new Date(item.deadline);
    deadlineDate.setHours(0, 0, 0, 0);
    return deadlineDate < today;
  });

  const dueSoonItems = activeItems.filter((item) => {
    if (!item.deadline) return false;
    const deadlineDate = new Date(item.deadline);
    deadlineDate.setHours(0, 0, 0, 0);
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 3;
  });

  const unassignedItems = activeItems.filter((item) => !item.assignee_user_id);

  const hasAlerts = overdueItems.length > 0 || dueSoonItems.length > 0 || unassignedItems.length > 0;

  // Premium design hooks
  const heroRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const timeInfo = useMemo(() => getTimeOfDay(), []);

  const summaryText = useMemo(() => {
    if (overdueItems.length > 0) {
      return `期限切れタスクが${overdueItems.length}件あります。早急に対応しましょう。`;
    }
    if (dueSoonItems.length > 0) {
      return `期限間近のタスクが${dueSoonItems.length}件あります。`;
    }
    if (pendingItems.length > 0) {
      return `未着手タスクが${pendingItems.length}件、対応中が${inProgressItems.length}件です。`;
    }
    return "すべてのタスクが完了しています。素晴らしい！";
  }, [overdueItems.length, dueSoonItems.length, pendingItems.length, inProgressItems.length]);

  const { displayed, done } = useTypingEffect(summaryText, 75);

  const pendingCount = useCountUp(pendingItems.length);
  const inProgressCount = useCountUp(inProgressItems.length);
  const completedCount = useCountUp(completedItems.length);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      setMousePos({ x, y });
    };

    const onLeave = () => setMousePos({ x: 0.5, y: 0.5 });

    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  const gradientStyle = {
    background: `radial-gradient(800px circle at ${mousePos.x * 100}% ${mousePos.y * 100}%, rgba(99,102,241,0.12), transparent 50%)`,
  };

  return (
    <div ref={heroRef} className="relative min-h-screen">
      {/* Mouse-following gradient */}
      <div className="pointer-events-none fixed inset-0 transition-all duration-500 z-0" style={gradientStyle} />

      {/* Floating blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-indigo-200/20 dark:bg-indigo-500/10 blur-3xl animate-[float_20s_ease-in-out_infinite]" />
        <div className="absolute -right-32 top-1/3 h-[400px] w-[400px] rounded-full bg-purple-200/20 dark:bg-purple-500/10 blur-3xl animate-[float_25s_ease-in-out_infinite_reverse]" />
        <div className="absolute left-1/3 -bottom-32 h-[350px] w-[600px] rounded-full bg-violet-100/30 dark:bg-violet-500/10 blur-3xl animate-[float_18s_ease-in-out_infinite_2s]" />
      </div>

      <div className="relative z-10 space-y-3">
        {/* Premium Hero - Full Width Like Home */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 shadow-2xl shadow-indigo-200/40 dark:shadow-black/40 ring-1 ring-indigo-100 dark:ring-white/5">
          {/* Mouse-following gradient */}
          <div className="pointer-events-none absolute inset-0 transition-all duration-500" style={gradientStyle} />

          {/* Floating blobs */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -left-40 -top-40 h-[400px] w-[400px] rounded-full bg-indigo-200/30 dark:bg-indigo-500/10 blur-3xl animate-[float_20s_ease-in-out_infinite]" />
            <div className="absolute -right-32 top-1/3 h-[300px] w-[300px] rounded-full bg-purple-200/25 dark:bg-purple-500/10 blur-3xl animate-[float_25s_ease-in-out_infinite_reverse]" />
            <div className="absolute left-1/3 -bottom-20 h-[250px] w-[400px] rounded-full bg-violet-100/40 dark:bg-violet-500/10 blur-3xl animate-[float_18s_ease-in-out_infinite_2s]" />
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row">
            {/* Left - Title, Summary, CTAs */}
            <div className="flex-1 p-8 lg:p-12 flex flex-col justify-center">
              <div className="flex items-center gap-4 mb-6">
                <span className="text-4xl">{timeInfo.icon}</span>
                <span className="text-slate-600 dark:text-white/70 text-xl font-medium">{timeInfo.greeting}</span>
              </div>

              <h1 className="text-5xl lg:text-6xl font-bold text-slate-800 dark:text-white tracking-tight mb-2">
                Work Queue
              </h1>
              <p className="text-lg text-slate-500 dark:text-slate-400 mb-8">チームタスク管理</p>

              {/* AI Summary */}
              <div className="mb-8 max-w-lg">
                <div className="rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-md px-6 py-4 ring-1 ring-indigo-200/40 dark:ring-white/10 shadow-lg">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-indigo-500 dark:bg-indigo-400 animate-pulse flex-shrink-0" />
                    <p className="text-base text-slate-700 dark:text-white/90 leading-relaxed">
                      {displayed}{!done && <span className="inline-block w-0.5 h-5 bg-indigo-500 dark:bg-indigo-400 ml-1 animate-pulse" />}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={filterCompanyId}
                  onChange={(e) => setFilterCompanyId(e.target.value)}
                  className="rounded-xl bg-white/80 dark:bg-white/10 backdrop-blur-sm px-5 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 ring-1 ring-indigo-200/40 dark:ring-white/10 shadow-lg transition-all hover:shadow-xl"
                >
                  <option value="ALL">全ての会社</option>
                  {companies
                    .filter((c) => items.some((item) => item.company_id === c.id))
                    .sort((a, b) => a.company_name.localeCompare(b.company_name, "ja"))
                    .map((c) => (
                      <option key={c.id} value={c.id}>{c.company_name}</option>
                    ))}
                </select>
                <button
                  type="button"
                  onClick={() => setFilterMyTasks(!filterMyTasks)}
                  className={[
                    "rounded-xl px-5 py-3 text-sm font-semibold inline-flex items-center gap-2 transition-all hover:shadow-xl hover:-translate-y-1",
                    filterMyTasks
                      ? "bg-indigo-600 dark:bg-white text-white dark:text-indigo-700 shadow-xl shadow-indigo-500/25"
                      : "bg-white/80 dark:bg-white/10 backdrop-blur-sm text-slate-700 dark:text-slate-300 ring-1 ring-indigo-200/40 dark:ring-white/10 shadow-lg",
                  ].join(" ")}
                >
                  {filterMyTasks ? <Icons.User className="w-4 h-4" /> : <Icons.Users className="w-4 h-4" />}
                  {filterMyTasks ? "自分のタスク" : "全てのタスク"}
                </button>
                {notificationPermission !== "granted" && (
                  <button
                    type="button"
                    onClick={requestNotificationPermission}
                    className={["rounded-xl px-4 py-3 shadow-lg", notificationPermission === "denied" ? "bg-rose-100/80 text-rose-700" : "bg-amber-100/80 text-amber-700"].join(" ")}
                  >
                    {notificationPermission === "denied" ? <Icons.BellOff className="w-4 h-4" /> : <Icons.Bell className="w-4 h-4" />}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowAddDialog(true)}
                  className="group rounded-xl bg-indigo-600 dark:bg-white px-8 py-3 text-sm font-semibold text-white dark:text-indigo-700 shadow-xl shadow-indigo-500/25 dark:shadow-black/10 hover:shadow-2xl hover:-translate-y-1 transition-all inline-flex items-center gap-2"
                >
                  <Icons.Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
                  新規タスク追加
                </button>
              </div>
            </div>

            {/* Right - KPI Cards & Alerts */}
            <div className="lg:w-[360px] p-8 lg:p-10 lg:border-l border-t lg:border-t-0 border-indigo-100/50 dark:border-white/5 flex flex-col justify-center">
              {/* KPI Cards - 2x2 Grid like Home */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {[
                  { label: "未着手", value: pendingCount, gradient: "from-slate-500 to-slate-600" },
                  { label: "対応中", value: inProgressCount, gradient: "from-indigo-500 to-purple-500" },
                  { label: "完了", value: completedCount, gradient: "from-emerald-500 to-teal-500" },
                  { label: "期限間近", value: dueSoonItems.length, gradient: "from-amber-500 to-orange-500" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="group relative overflow-hidden rounded-2xl bg-white/70 dark:bg-white/5 backdrop-blur-md p-5 ring-1 ring-indigo-100/50 dark:ring-white/10 shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-5 dark:group-hover:opacity-10 transition-opacity duration-300`} />
                    <div className="relative">
                      <div className="text-xs font-semibold text-slate-500 dark:text-white/50 uppercase tracking-wider">{item.label}</div>
                      <div className="mt-2 text-3xl font-bold text-slate-800 dark:text-white tabular-nums">{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Alerts */}
              {(overdueItems.length > 0 || inboxStats.totalNoJob > 0 || inboxStats.totalNew > 0) && (
                <div className="rounded-xl bg-white/50 dark:bg-white/5 backdrop-blur-sm p-4 ring-1 ring-indigo-100/40 dark:ring-white/10">
                  <div className="text-xs font-semibold text-slate-600 dark:text-white/60 uppercase tracking-wider mb-3">要対応</div>
                  <div className="space-y-2">
                    {overdueItems.length > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                        <span className="text-rose-700 dark:text-rose-300 font-semibold">期限切れ {overdueItems.length}件</span>
                      </div>
                    )}
                    {inboxStats.totalNoJob > 0 && (
                      <Link href="/applicants" className="flex items-center gap-2 text-sm text-indigo-700 dark:text-indigo-300 font-semibold hover:underline">
                        <span className="h-2 w-2 rounded-full bg-indigo-500" />
                        原稿未設定 {inboxStats.totalNoJob}件
                      </Link>
                    )}
                    {inboxStats.totalNew > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                        <span className="text-blue-700 dark:text-blue-300 font-semibold">NEW応募 {inboxStats.totalNew}件</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-lg bg-white/80 dark:bg-slate-800/80 p-8 text-center shadow-md ring-1 ring-slate-200/50 dark:ring-white/10">
            <Icons.Clock className="w-6 h-6 mx-auto text-indigo-500 animate-pulse" />
            <div className="mt-2 text-sm text-slate-600 dark:text-slate-400">読み込み中...</div>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-lg bg-white/80 dark:bg-slate-800/80 p-8 text-center shadow-md ring-1 ring-slate-200/50 dark:ring-white/10">
            <Icons.Clipboard className="w-8 h-8 mx-auto text-slate-400" />
            <div className="mt-3 text-base font-semibold text-slate-800 dark:text-slate-100">タスクがありません</div>
            <button
              type="button"
              onClick={() => setShowAddDialog(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
            >
              <Icons.Plus className="w-4 h-4" />
              追加
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingItems.length > 0 && (
              <Section
                title="未着手"
                items={pendingItems}
                members={members}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
                onAcknowledgeChange={handleAcknowledgeChange}
                onPriorityChange={handlePriorityChange}
                onEdit={setEditingItem}
              />
            )}

            {inProgressItems.length > 0 && (
              <Section
                title="対応中"
                items={inProgressItems}
                members={members}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
                onAcknowledgeChange={handleAcknowledgeChange}
                onPriorityChange={handlePriorityChange}
                onEdit={setEditingItem}
              />
            )}

            {completedItems.length > 0 && (
              <Section
                title="完了"
                items={completedItems}
                members={members}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
                onAcknowledgeChange={handleAcknowledgeChange}
                onPriorityChange={handlePriorityChange}
                onEdit={setEditingItem}
              />
            )}
          </div>
        )}
      </div>

      {showAddDialog && (
        <AddItemDialog
          members={members}
          onClose={() => setShowAddDialog(false)}
          onSuccess={() => {
            setShowAddDialog(false);
            loadItems();
          }}
        />
      )}

      {editingItem && (
        <EditItemDialog
          item={editingItem}
          members={members}
          onClose={() => setEditingItem(null)}
          onSuccess={() => {
            setEditingItem(null);
            loadItems();
          }}
        />
      )}

      {/* Float animation keyframes */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px) scale(1); }
          33% { transform: translateY(-20px) translateX(10px) scale(1.02); }
          66% { transform: translateY(10px) translateX(-10px) scale(0.98); }
        }
      `}</style>
    </div>
  );
}

function Section({
  title,
  items,
  members,
  onDelete,
  onStatusChange,
  onAcknowledgeChange,
  onPriorityChange,
  onEdit,
}: {
  title: string;
  items: WorkQueueItem[];
  members: Member[];
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
  onAcknowledgeChange: (id: string, isAcknowledged: boolean) => void;
  onPriorityChange: (id: string, priority: "urgent" | "high" | "medium" | "low") => void;
  onEdit: (item: WorkQueueItem) => void;
}) {
  const isCompleted = title === "完了";
  const isInProgress = title === "対応中";

  // 完了セクションはデフォルトで折りたたみ
  const [isExpanded, setIsExpanded] = useState(!isCompleted);
  // 表示件数の制御（初期は5件）
  const [showAll, setShowAll] = useState(false);
  const INITIAL_DISPLAY_COUNT = 5;

  const displayItems = showAll ? items : items.slice(0, INITIAL_DISPLAY_COUNT);
  const hasMoreItems = items.length > INITIAL_DISPLAY_COUNT;
  const hiddenCount = items.length - INITIAL_DISPLAY_COUNT;

  const sectionGradient = isCompleted
    ? "from-emerald-500 to-teal-500"
    : isInProgress
      ? "from-indigo-500 to-purple-500"
      : "from-slate-400 to-slate-500";

  return (
    <div className="rounded-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-md ring-1 ring-slate-200/50 dark:ring-white/10 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 border-b border-slate-200/50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-100/50 dark:hover:bg-slate-700/50 transition-colors"
      >
        <div className={`flex h-5 w-5 items-center justify-center rounded bg-gradient-to-br ${sectionGradient} text-white`}>
          {isCompleted ? (
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
          ) : isInProgress ? (
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
          ) : (
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /></svg>
          )}
        </div>
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h2>
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 tabular-nums">{items.length}</span>
        <svg
          className={`ml-auto w-4 h-4 text-slate-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isExpanded && (
        <>
          <div className={`divide-y divide-slate-100 dark:divide-slate-700/50 ${items.length > 10 && showAll ? "max-h-[500px] overflow-y-auto" : ""}`}>
            {displayItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                members={members}
                onDelete={onDelete}
                onStatusChange={onStatusChange}
                onAcknowledgeChange={onAcknowledgeChange}
                onPriorityChange={onPriorityChange}
                onEdit={onEdit}
              />
            ))}
          </div>

          {hasMoreItems && !showAll && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full py-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors border-t border-slate-100 dark:border-slate-700/50"
            >
              さらに {hiddenCount} 件を表示
            </button>
          )}

          {showAll && hasMoreItems && (
            <button
              onClick={() => setShowAll(false)}
              className="w-full py-2 text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors border-t border-slate-100 dark:border-slate-700/50"
            >
              折りたたむ
            </button>
          )}
        </>
      )}
    </div>
  );
}

function ItemCard({
  item,
  members,
  onDelete,
  onStatusChange,
  onAcknowledgeChange,
  onPriorityChange,
  onEdit,
}: {
  item: WorkQueueItem;
  members: Member[];
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
  onAcknowledgeChange: (id: string, isAcknowledged: boolean) => void;
  onPriorityChange: (id: string, priority: "urgent" | "high" | "medium" | "low") => void;
  onEdit: (item: WorkQueueItem) => void;
}) {
  // Debug: Log item data
  useEffect(() => {
    console.log(`[ItemCard Debug] Item ${item.id}:`, {
      title: item.title,
      status: item.status,
      priority: item.priority,
      priority_type: typeof item.priority,
      priority_value: item.priority || "medium",
      is_acknowledged: item.is_acknowledged,
      raw_item: item
    });
  }, [item]);

  // Ensure priority has a valid value
  const priorityValue = (item.priority || "medium") as "urgent" | "high" | "medium" | "low";
  const statusValue = item.status || "pending";
  const isAcknowledgedValue = item.is_acknowledged ?? false;

  return (
    <div className={[
      "group relative transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30",
      !isAcknowledgedValue && statusValue !== "completed" ? "bg-amber-50/50 dark:bg-amber-950/10" : "",
    ].join(" ")}>
      {!isAcknowledgedValue && statusValue !== "completed" && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-amber-500" />
      )}
      <div className="px-3 py-2 flex items-center gap-3">
        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
          {(() => {
            const taskInfo = getTaskTypeInfo(item.task_type);
            const TaskIcon = taskInfo.Icon;
            return <TaskIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />;
          })()}
          <span className={[
            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold",
            priorityValue === "urgent" ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300" :
            priorityValue === "high" ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300" :
            priorityValue === "low" ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400" :
            "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
          ].join(" ")}>
            {priorityValue === "urgent" && <span className="h-1 w-1 rounded-full bg-rose-500 animate-pulse" />}
            {priorityValue === "urgent" ? "緊急" : priorityValue === "high" ? "高" : priorityValue === "low" ? "低" : "中"}
          </span>
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{item.title}</span>
          {item.companies && (
            <Link href={`/companies/${item.company_id}`} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline truncate">
              {item.companies.company_name}
            </Link>
          )}
          {item.assignee_info && (
            <span className="text-xs text-slate-500 dark:text-slate-400">@{item.assignee_info.display_name || item.assignee_info.user_id}</span>
          )}
          {item.deadline && (
            <span className="text-xs text-slate-500 dark:text-slate-400">〆{new Date(item.deadline).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}</span>
          )}
          {item.note && (
            <span className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-[150px]" title={item.note}>💬 {item.note}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {statusValue !== "completed" && (
            <input
              type="checkbox"
              checked={isAcknowledgedValue}
              onChange={(e) => onAcknowledgeChange(item.id, e.target.checked)}
              className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-600 text-indigo-600"
              title="確認済み"
            />
          )}
          <select
            value={statusValue}
            onChange={(e) => onStatusChange(item.id, e.target.value)}
            className="rounded border-0 bg-slate-100 dark:bg-slate-700 px-2 py-1 text-[10px] font-medium text-slate-700 dark:text-slate-300 focus:ring-1 focus:ring-indigo-500"
          >
            <option value="pending">未着手</option>
            <option value="in_progress">対応中</option>
            <option value="completed">完了</option>
          </select>
          <select
            value={priorityValue}
            onChange={(e) => onPriorityChange(item.id, e.target.value as "urgent" | "high" | "medium" | "low")}
            className="rounded border-0 bg-slate-100 dark:bg-slate-700 px-2 py-1 text-[10px] font-medium text-slate-700 dark:text-slate-300 focus:ring-1 focus:ring-indigo-500"
          >
            <option value="urgent">緊急</option>
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>
          <button type="button" onClick={() => onEdit(item)} className="p-1 text-slate-400 hover:text-indigo-600 transition-colors">
            <Icons.Edit className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={() => onDelete(item.id)} className="p-1 text-slate-400 hover:text-rose-600 transition-colors">
            <Icons.Trash className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function AddItemDialog({
  members,
  onClose,
  onSuccess,
}: {
  members: Member[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [taskType, setTaskType] = useState("");
  const [title, setTitle] = useState("");
  const [companySearch, setCompanySearch] = useState("");
  const [allCompanies, setAllCompanies] = useState<Array<{ id: string; company_name: string }>>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [selectedCompanyName, setSelectedCompanyName] = useState("");
  const [assigneeUserIds, setAssigneeUserIds] = useState<string[]>([]);
  const [deadline, setDeadline] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [note, setNote] = useState("");
  const [priority, setPriority] = useState<"urgent" | "high" | "medium" | "low">("medium");
  const [submitting, setSubmitting] = useState(false);
  const [showCompanyList, setShowCompanyList] = useState(false);

  useEffect(() => {
    loadCompanies();
  }, []);

  async function loadCompanies() {
    try {
      const res = await fetch("/api/companies", { cache: "no-store" });
      const json = await res.json();
      if (json.ok && Array.isArray(json.companies)) {
        setAllCompanies(json.companies);
      }
    } catch (err) {
      console.error("Failed to load companies:", err);
    }
  }

  const filteredCompanies = useMemo(() => {
    if (!companySearch.trim()) return allCompanies;
    const query = companySearch.toLowerCase();
    return allCompanies.filter((c) =>
      c.company_name.toLowerCase().includes(query)
    );
  }, [allCompanies, companySearch]);

  async function handleSubmit() {
    if (!taskType || !title.trim()) {
      alert("タスクタイプとタイトルは必須です");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/work-queue/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          task_type: taskType,
          company_id: selectedCompanyId || null,
          assignee_user_id: assigneeUserIds.length > 0 ? assigneeUserIds[0] : null,
          assignee_user_ids: assigneeUserIds.length > 0 ? assigneeUserIds : null,
          deadline: deadline || null,
          preferred_date: preferredDate || null,
          note: note || null,
          priority: priority,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        onSuccess();
      } else {
        alert("追加に失敗しました: " + json.error.message);
      }
    } catch (err) {
      console.error("Failed to add item:", err);
      alert("追加に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-white/20 dark:border-slate-700/50 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl p-6 shadow-2xl shadow-slate-900/20 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-6">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30">
            <Icons.Plus className="w-5 h-5" />
          </span>
          <h2 className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
            新規タスク追加
          </h2>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
            タスクタイプ <span className="text-rose-500">*</span>
          </label>
          <select
            value={taskType}
            onChange={(e) => {
              const selectedType = e.target.value;
              setTaskType(selectedType);
              const taskTypeObj = TASK_TYPES.find((t) => t.value === selectedType);
              if (taskTypeObj && taskTypeObj.defaultTitle) {
                setTitle(taskTypeObj.defaultTitle);
              }
            }}
            className="w-full rounded-xl border border-slate-200/80 dark:border-slate-600 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all hover:shadow-md"
          >
            <option value="">選択してください</option>
            {TASK_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
            優先順位
          </label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as "urgent" | "high" | "medium" | "low")}
            className="w-full rounded-xl border border-slate-200/80 dark:border-slate-600 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all hover:shadow-md"
          >
            <option value="urgent">緊急</option>
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
            タイトル <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例: 〇〇社の求人原稿を作成"
            className="w-full rounded-xl border border-slate-200/80 dark:border-slate-600 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all hover:shadow-md"
          />
        </div>

        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
            関連企業（任意）
          </label>

          {selectedCompanyId ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-xl border border-indigo-200/60 dark:border-indigo-700/50 bg-indigo-50/80 dark:bg-indigo-900/30 backdrop-blur-sm px-4 py-2.5 text-sm font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                <Icons.Building className="w-4 h-4" />
                {selectedCompanyName}
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedCompanyId("");
                  setSelectedCompanyName("");
                  setCompanySearch("");
                }}
                className="rounded-xl bg-slate-100/80 dark:bg-slate-700/80 backdrop-blur-sm px-3 py-2.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all hover:shadow-md"
              >
                <Icons.X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <input
                type="text"
                value={companySearch}
                onChange={(e) => {
                  setCompanySearch(e.target.value);
                  setShowCompanyList(true);
                }}
                onFocus={() => setShowCompanyList(true)}
                placeholder="企業名で検索..."
                className="w-full rounded-xl border border-slate-200/80 dark:border-slate-600 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all hover:shadow-md"
              />

              {showCompanyList && filteredCompanies.length > 0 && (
                <div className="mt-2 border border-slate-200/60 dark:border-slate-700/50 rounded-xl max-h-60 overflow-y-auto bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl shadow-xl">
                  {filteredCompanies.slice(0, 50).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedCompanyId(c.id);
                        setSelectedCompanyName(c.company_name);
                        setShowCompanyList(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-indigo-50/80 dark:hover:bg-indigo-900/30 transition-colors border-b border-slate-100/60 dark:border-slate-700/50 last:border-b-0"
                    >
                      {c.company_name}
                    </button>
                  ))}
                  {filteredCompanies.length > 50 && (
                    <div className="px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400 text-center bg-slate-50/80 dark:bg-slate-800/80">
                      他 {filteredCompanies.length - 50} 件...（検索で絞り込んでください）
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
            担当者（複数選択可能）
          </label>
          <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200/80 dark:border-slate-600 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm p-2">
            {members.length === 0 ? (
              <div className="text-xs text-slate-500 dark:text-slate-400 p-3 text-center">メンバーがいません</div>
            ) : (
              <div className="space-y-1">
                {members.map((m) => (
                  <label
                    key={m.user_id}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-indigo-50/80 dark:hover:bg-indigo-900/30 cursor-pointer transition-all"
                  >
                    <input
                      type="checkbox"
                      checked={assigneeUserIds.includes(m.user_id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setAssigneeUserIds([...assigneeUserIds, m.user_id]);
                        } else {
                          setAssigneeUserIds(assigneeUserIds.filter((id) => id !== m.user_id));
                        }
                      }}
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {m.display_name || m.user_id}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
          {assigneeUserIds.length > 0 && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border border-slate-400 text-slate-500 dark:border-slate-500 dark:text-slate-400">
              <Icons.User className="w-3 h-3" />
              {assigneeUserIds.length}名選択中
            </div>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
            対応希望日
          </label>
          <DatePicker
            value={preferredDate}
            onChange={setPreferredDate}
            className="w-full rounded-xl border border-slate-200/80 dark:border-slate-600 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all hover:shadow-md"
          />
        </div>

        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
            期限
          </label>
          <DatePicker
            value={deadline}
            onChange={setDeadline}
            className="w-full rounded-xl border border-slate-200/80 dark:border-slate-600 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all hover:shadow-md"
          />
        </div>

        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
            メモ
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-slate-200/80 dark:border-slate-600 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all hover:shadow-md resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200/60 dark:border-slate-700/50">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm border border-slate-200/80 dark:border-slate-600 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 transition-all hover:shadow-md"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !taskType || !title.trim()}
            className="rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition-all hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
          >
            <Icons.Plus className="w-4 h-4" />
            {submitting ? "追加中..." : "追加"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditItemDialog({
  item,
  members,
  onClose,
  onSuccess,
}: {
  item: WorkQueueItem;
  members: Member[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState(item.title);
  const [taskType, setTaskType] = useState(item.task_type);
  const [assigneeUserIds, setAssigneeUserIds] = useState<string[]>(
    item.assignee_user_ids || (item.assignee_user_id ? [item.assignee_user_id] : [])
  );
  const [deadline, setDeadline] = useState(item.deadline || "");
  const [preferredDate, setPreferredDate] = useState(item.preferred_date || "");
  const [note, setNote] = useState(item.note || "");
  const [priority, setPriority] = useState<"urgent" | "high" | "medium" | "low">(item.priority || "medium");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!taskType || !title.trim()) {
      alert("タスクタイプとタイトルは必須です");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/work-queue/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          task_type: taskType,
          assignee_user_id: assigneeUserIds.length > 0 ? assigneeUserIds[0] : null,
          assignee_user_ids: assigneeUserIds.length > 0 ? assigneeUserIds : null,
          deadline: deadline || null,
          preferred_date: preferredDate || null,
          note: note || null,
          priority: priority,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        onSuccess();
      } else {
        alert("更新に失敗しました: " + json.error.message);
      }
    } catch (err) {
      console.error("Failed to update item:", err);
      alert("更新に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/20 dark:border-slate-700/50 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl p-6 shadow-2xl shadow-slate-900/20 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-6">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 text-white shadow-lg shadow-slate-500/30">
            <Icons.Edit className="w-5 h-5" />
          </span>
          <h2 className="text-lg font-bold bg-gradient-to-r from-slate-700 to-slate-500 dark:from-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
            タスク編集
          </h2>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
            タスクタイプ
          </label>
          <select
            value={taskType}
            onChange={(e) => setTaskType(e.target.value)}
            className="w-full rounded-xl border border-slate-200/80 dark:border-slate-600 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all hover:shadow-md"
          >
            {TASK_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
            優先順位
          </label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as "urgent" | "high" | "medium" | "low")}
            className="w-full rounded-xl border border-slate-200/80 dark:border-slate-600 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all hover:shadow-md"
          >
            <option value="urgent">緊急</option>
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
            タイトル
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-slate-200/80 dark:border-slate-600 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all hover:shadow-md"
          />
        </div>

        {item.companies && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-indigo-50/80 dark:bg-indigo-900/30 border border-indigo-200/60 dark:border-indigo-700/50 px-4 py-2.5">
            <Icons.Building className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
              {item.companies.company_name}
            </span>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
            担当者（複数選択可能）
          </label>
          <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200/80 dark:border-slate-600 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm p-2">
            {members.length === 0 ? (
              <div className="text-xs text-slate-500 dark:text-slate-400 p-3 text-center">メンバーがいません</div>
            ) : (
              <div className="space-y-1">
                {members.map((m) => (
                  <label
                    key={m.user_id}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-indigo-50/80 dark:hover:bg-indigo-900/30 cursor-pointer transition-all"
                  >
                    <input
                      type="checkbox"
                      checked={assigneeUserIds.includes(m.user_id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setAssigneeUserIds([...assigneeUserIds, m.user_id]);
                        } else {
                          setAssigneeUserIds(assigneeUserIds.filter((id) => id !== m.user_id));
                        }
                      }}
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {m.display_name || m.user_id}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
          {assigneeUserIds.length > 0 && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border border-slate-400 text-slate-500 dark:border-slate-500 dark:text-slate-400">
              <Icons.User className="w-3 h-3" />
              {assigneeUserIds.length}名選択中
            </div>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
            対応希望日
          </label>
          <DatePicker
            value={preferredDate}
            onChange={setPreferredDate}
            className="w-full rounded-xl border border-slate-200/80 dark:border-slate-600 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all hover:shadow-md"
          />
        </div>

        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
            期限
          </label>
          <DatePicker
            value={deadline}
            onChange={setDeadline}
            className="w-full rounded-xl border border-slate-200/80 dark:border-slate-600 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all hover:shadow-md"
          />
        </div>

        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
            メモ
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-slate-200/80 dark:border-slate-600 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all hover:shadow-md resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200/60 dark:border-slate-700/50">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm border border-slate-200/80 dark:border-slate-600 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 transition-all hover:shadow-md"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition-all hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
          >
            <Icons.Save className="w-4 h-4" />
            {submitting ? "更新中..." : "更新"}
          </button>
        </div>
      </div>
    </div>
  );
}
