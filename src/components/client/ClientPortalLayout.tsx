"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import Link from "next/link";
import PWAInstallPrompt from "./PWAInstallPrompt";
import PushNotificationPrompt from "./PushNotificationPrompt";
import { usePushNotification } from "@/hooks/usePushNotification";
import { useTheme } from "@/contexts/ThemeContext";

interface ClientPortalLayoutProps {
  children: React.ReactNode;
}

type QuickStats = {
  todayApplicants: number;
  pendingReview: number;
  interviewsThisWeek: number;
};

export default function ClientPortalLayout({ children }: ClientPortalLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = supabaseBrowser();
  const { resolvedTheme, setTheme } = useTheme();

  // Check if in preview mode (URL starts with /client/companies/[companyId])
  const isPreviewMode = pathname?.startsWith("/client/companies/");
  const previewCompanyId = isPreviewMode ? pathname.split("/")[3] : null;

  // Check if push notification banner should be shown
  const { isSupported: pushSupported, isSubscribed: pushSubscribed, permission: pushPermission } = usePushNotification();

  // iOS detection and standalone mode check
  const [isIOSNotStandalone, setIsIOSNotStandalone] = useState(false);
  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches
      || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsIOSNotStandalone(isIOS && !isStandalone);
  }, []);

  // On iOS, only show push banner if PWA is installed (standalone mode)
  // Otherwise, PWA install banner takes priority
  const showPushBanner = pushSupported && !pushSubscribed && pushPermission !== "denied" && pushPermission !== "loading" && !isIOSNotStandalone;

  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [quickActionOpen, setQuickActionOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpModalType, setHelpModalType] = useState<"guide" | "faq" | "shortcuts" | null>(null);
  const [meetingModalOpen, setMeetingModalOpen] = useState(false);
  const [meetingSubject, setMeetingSubject] = useState("");
  const [meetingNote, setMeetingNote] = useState("");
  const [meetingSubmitting, setMeetingSubmitting] = useState(false);
  const [meetingSubmitted, setMeetingSubmitted] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"synced" | "syncing" | "error">("synced");
  const [clientNotifications, setClientNotifications] = useState<{ id: string; type: string; title: string; body: string; url: string | null; is_read: boolean; created_at: string }[]>([]);
  const [quickStats, setQuickStats] = useState<QuickStats>({ todayApplicants: 0, pendingReview: 0, interviewsThisWeek: 0 });
  const [statsAnimating, setStatsAnimating] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const quickActionRef = useRef<HTMLDivElement>(null);
  const helpRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const notifiedIdsRef = useRef<Set<string>>(new Set());

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Simulate stats update
  useEffect(() => {
    const interval = setInterval(() => {
      setStatsAnimating(true);
      setTimeout(() => setStatsAnimating(false), 500);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Mark NEW applicant IDs as seen when on the applicants page
  const SEEN_KEY = "wisteria_client_seen_applicants_v1";
  const isOnApplicantsPage = pathname?.includes("/applicants");

  // Load quick stats
  useEffect(() => {
    async function loadQuickStats() {
      setSyncStatus("syncing");
      try {
        // Add companyId parameter when in preview mode
        const url = isPreviewMode && previewCompanyId
          ? `/api/client/applicants?companyId=${previewCompanyId}`
          : "/api/client/applicants";

        const res = await fetch(url, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.data) {
            const applicants = data.data;
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const todayApplicants = applicants.filter((a: { applied_at: string }) =>
              new Date(a.applied_at) >= today
            ).length;

            // Get seen IDs from localStorage
            let seenIds: string[] = [];
            try {
              seenIds = JSON.parse(localStorage.getItem(SEEN_KEY) || "[]");
            } catch { /* ignore */ }

            const newApplicants = applicants.filter((a: { id: string; status: string }) =>
              a.status === "NEW"
            );

            // If user is on applicants page, mark all NEW as seen
            if (isOnApplicantsPage) {
              const allNewIds = newApplicants.map((a: { id: string }) => a.id);
              localStorage.setItem(SEEN_KEY, JSON.stringify(allNewIds));
              seenIds = allNewIds;
            }

            const pendingReview = newApplicants.filter(
              (a: { id: string }) => !seenIds.includes(a.id)
            ).length;

            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            const interviewsThisWeek = applicants.filter((a: { status: string }) =>
              a.status === "INT"
            ).length;

            setQuickStats({ todayApplicants, pendingReview, interviewsThisWeek });
          }
        }
        setSyncStatus("synced");
      } catch {
        setSyncStatus("error");
      }
    }

    if (!loading) {
      loadQuickStats();
      const interval = setInterval(loadQuickStats, 60000);
      return () => clearInterval(interval);
    }
  }, [loading, isPreviewMode, previewCompanyId, isOnApplicantsPage]);

  // Load client notifications with polling
  useEffect(() => {
    let isFirst = true;
    async function loadNotifications() {
      try {
        const url = isPreviewMode && previewCompanyId
          ? `/api/client/notifications?limit=20&companyId=${previewCompanyId}`
          : "/api/client/notifications?limit=20";
        const res = await fetch(url, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.data?.notifications) {
            const items = data.data.notifications as typeof clientNotifications;
            setClientNotifications(items);

            // On first load, seed known IDs to avoid burst
            if (isFirst) {
              items.forEach((n) => notifiedIdsRef.current.add(n.id));
              isFirst = false;
              return;
            }

            // Desktop notifications for new unread items
            if (typeof window !== "undefined" && Notification.permission === "granted") {
              for (const n of items) {
                if (!n.is_read && !notifiedIdsRef.current.has(n.id)) {
                  notifiedIdsRef.current.add(n.id);
                  new Notification(n.title, { body: n.body, tag: n.id });
                }
              }
            }
          }
        }
      } catch {
        // silent
      }
    }
    if (!loading) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 5000);
      return () => clearInterval(interval);
    }
  }, [loading, isPreviewMode, previewCompanyId]);

  async function markAllNotificationsRead() {
    try {
      const res = await fetch("/api/client/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      if (res.ok) {
        setClientNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      }
    } catch { /* silent */ }
  }

  async function markNotificationRead(id: string) {
    try {
      await fetch("/api/client/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
      setClientNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    } catch { /* silent */ }
  }

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setUserMenuOpen(false);
        setNotificationOpen(false);
        setQuickActionOpen(false);
        setHelpOpen(false);
        setHelpModalType(null);
        setMeetingModalOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Click outside handlers
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
      if (quickActionRef.current && !quickActionRef.current.contains(event.target as Node)) {
        setQuickActionOpen(false);
      }
      if (helpRef.current && !helpRef.current.contains(event.target as Node)) {
        setHelpOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    async function checkAuth() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/client/login");
        return;
      }

      const { data: clientUser } = await supabase
        .from("client_users")
        .select("company_id, display_name, is_active")
        .eq("user_id", user.id)
        .single();

      if (!clientUser) {
        // Not a client user - check if admin/workspace member
        const { data: workspaceMember } = await supabase
          .from("workspace_members")
          .select("user_id, display_name")
          .eq("user_id", user.id)
          .single();

        if (workspaceMember) {
          // Admin user - allow access
          setCompanyName("管理者");
          setUserName(workspaceMember.display_name || user.email?.split("@")[0] || "");
          setUserEmail(user.email || "");
          setLoading(false);
          return;
        } else {
          // Not authorized
          router.replace("/client/login");
          return;
        }
      }

      if (!clientUser.is_active) {
        router.replace("/client/login");
        return;
      }

      const { data: company } = await supabase
        .from("companies")
        .select("company_name")
        .eq("id", clientUser.company_id)
        .single();

      setCompanyName(company?.company_name || "");
      setUserName(clientUser.display_name || user.email?.split("@")[0] || "");
      setUserEmail(user.email || "");
      setLoading(false);
    }

    checkAuth();
  }, [router, supabase]);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    router.replace("/client/login");
  }, [supabase, router]);

  const handleMeetingRequest = async () => {
    setMeetingSubmitting(true);
    try {
      const res = await fetch("/api/client/meeting-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: meetingSubject, note: meetingNote }),
      });
      const data = await res.json();
      if (data.ok) {
        setMeetingSubmitting(false);
        setMeetingSubmitted(true);
        setTimeout(() => {
          setMeetingModalOpen(false);
          setMeetingSubmitted(false);
          setMeetingSubject("");
          setMeetingNote("");
        }, 2000);
      } else {
        console.error("Meeting request failed:", data.error?.message);
        setMeetingSubmitting(false);
      }
    } catch (error) {
      console.error("Meeting request error:", error);
      setMeetingSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafbfc]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-2 border-slate-200"></div>
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-indigo-600 animate-spin"></div>
          </div>
          <p className="text-sm text-slate-500 font-medium tracking-wide">読み込み中</p>
        </div>
      </div>
    );
  }

  // Determine base URL prefix for navigation based on preview mode
  const basePrefix = isPreviewMode && previewCompanyId ? `/client/companies/${previewCompanyId}` : "/client";

  const navItems = [
    {
      href: `${basePrefix}/dashboard`,
      label: "ダッシュボード",
      icon: (
        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
      ),
    },
    {
      href: `${basePrefix}/jobs`,
      label: "求人管理",
      icon: (
        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
        </svg>
      ),
    },
    {
      href: `${basePrefix}/applicants`,
      label: "応募者",
      icon: (
        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
      ),
      badge: quickStats.pendingReview > 0 ? quickStats.pendingReview : undefined,
    },
    {
      href: `${basePrefix}/analytics`,
      label: "分析レポート",
      icon: (
        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      ),
    },
    {
      href: `${basePrefix}/meetings`,
      label: "打ち合わせ",
      icon: (
        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      ),
    },
    {
      href: `${basePrefix}/interview-availability`,
      label: "面接対応可能日",
      icon: (
        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      href: `${basePrefix}/notifications`,
      label: "通知センター",
      icon: (
        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
      ),
    },
    {
      href: `${basePrefix}/interview-calendar`,
      label: "面接カレンダー",
      icon: (
        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
        </svg>
      ),
    },
  ];

  const secondaryNavItems = [
    {
      href: `${basePrefix}/support`,
      label: "サポート",
      icon: (
        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
        </svg>
      ),
    },
    {
      href: `${basePrefix}/settings`,
      label: "設定",
      icon: (
        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  // Map clientNotifications to the shape used by the notification UI
  function formatTimeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "たった今";
    if (mins < 60) return `${mins}分前`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}時間前`;
    const days = Math.floor(hours / 24);
    return `${days}日前`;
  }
  const notifications = clientNotifications.map((n) => ({
    id: n.id,
    type: n.type || "system",
    title: n.title,
    message: n.body,
    time: formatTimeAgo(n.created_at),
    unread: !n.is_read,
    url: n.url,
  }));

  const searchResults = searchQuery.length > 0 ? [
    { type: "applicant", label: "応募者", items: ["山田太郎", "佐藤花子", "鈴木一郎"].filter(n => n.includes(searchQuery)) },
    { type: "job", label: "求人", items: ["営業職", "エンジニア", "デザイナー"].filter(n => n.includes(searchQuery)) },
  ] : [];

  const quickActions = [
    { label: "応募者を検索", icon: "search", action: () => { setQuickActionOpen(false); setSearchOpen(true); } },
    { label: "打ち合わせを希望", icon: "calendar", action: () => { setQuickActionOpen(false); setMeetingModalOpen(true); } },
    { label: "サポートに連絡", icon: "support", action: () => { setQuickActionOpen(false); router.push("/client/support"); } },
  ];

  const helpItems = [
    { label: "使い方ガイド", description: "基本的な操作方法", action: () => { setHelpOpen(false); setHelpModalType("guide"); } },
    { label: "よくある質問", description: "FAQ一覧", action: () => { setHelpOpen(false); setHelpModalType("faq"); } },
    { label: "キーボードショートカット", description: "⌘K: 検索", action: () => { setHelpOpen(false); setHelpModalType("shortcuts"); } },
    { label: "お問い合わせ", description: "サポートチームに連絡", action: () => { setHelpOpen(false); router.push("/client/support"); } },
  ];

  // Breadcrumb
  const getBreadcrumb = () => {
    const segments = pathname.split("/").filter(Boolean);
    const labels: Record<string, string> = {
      client: "ホーム",
      dashboard: "ダッシュボード",
      jobs: "求人管理",
      applicants: "応募者",
      analytics: "分析レポート",
      meetings: "打ち合わせ",
      support: "サポート",
      settings: "設定",
    };
    return segments.slice(1).map((seg, i) => ({
      label: labels[seg] || seg,
      href: "/" + segments.slice(0, i + 2).join("/"),
      isLast: i === segments.length - 2,
    }));
  };

  const breadcrumb = getBreadcrumb();
  const userInitial = userName.charAt(0).toUpperCase();
  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <div className="min-h-screen bg-[#f8f9fb] dark:bg-slate-900">
      {/* Meeting Request Modal */}
      {meetingModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm animate-fadeIn flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-slideDown">
            {meetingSubmitted ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">リクエストを送信しました</h3>
                <p className="text-sm text-slate-500">担当者から候補日のご連絡をお待ちください</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                  <div>
                    <h3 className="text-[15px] font-semibold text-slate-900">打ち合わせを希望する</h3>
                    <p className="text-[12px] text-slate-500 mt-0.5">担当者に打ち合わせのリクエストを送信します</p>
                  </div>
                  <button
                    onClick={() => setMeetingModalOpen(false)}
                    className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-[13px] font-medium text-slate-700 mb-1.5">件名</label>
                    <input
                      type="text"
                      value={meetingSubject}
                      onChange={(e) => setMeetingSubject(e.target.value)}
                      placeholder="例: 採用計画の相談"
                      className="w-full px-4 py-2.5 text-[14px] border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-slate-700 mb-1.5">ご要望・備考</label>
                    <textarea
                      value={meetingNote}
                      onChange={(e) => setMeetingNote(e.target.value)}
                      placeholder="打ち合わせで相談したい内容があればご記入ください"
                      rows={4}
                      className="w-full px-4 py-2.5 text-[14px] border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                    />
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-slate-700">候補日について</p>
                        <p className="text-[12px] text-slate-500 mt-0.5">リクエスト送信後、担当者より候補日をご提示いたします。マイページの通知からご確認ください。</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                  <button
                    onClick={() => setMeetingModalOpen(false)}
                    className="flex-1 px-4 py-2.5 text-[13px] font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleMeetingRequest}
                    disabled={!meetingSubject.trim() || meetingSubmitting}
                    className="flex-1 px-4 py-2.5 text-[13px] font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {meetingSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        送信中...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                        </svg>
                        リクエストを送信
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Help Modal */}
      {helpModalType && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm animate-fadeIn flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-slideDown max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {helpModalType === "guide" && "使い方ガイド"}
                {helpModalType === "faq" && "よくある質問"}
                {helpModalType === "shortcuts" && "キーボードショートカット"}
              </h3>
              <button
                onClick={() => setHelpModalType(null)}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {helpModalType === "guide" && (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold">1</span>
                      ダッシュボード
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 pl-8">
                      ダッシュボードでは、応募者の状況や今週の面接予定など、採用活動の概要を確認できます。
                    </p>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold">2</span>
                      応募者管理
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 pl-8">
                      応募者一覧から各応募者の詳細を確認し、ステータスの更新やメモの追加ができます。
                    </p>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold">3</span>
                      面接対応可能日
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 pl-8">
                      カレンダーから面接対応可能な日時を登録できます。日付をクリック・ドラッグで選択し、保存してください。
                    </p>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold">4</span>
                      打ち合わせ依頼
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 pl-8">
                      ヘッダーの「打ち合わせ希望」ボタンから、担当者との打ち合わせをリクエストできます。
                    </p>
                  </div>
                </div>
              )}

              {helpModalType === "faq" && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
                      Q. 応募者のステータスはどのように変更できますか？
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      A. 応募者一覧から対象者を選択し、詳細画面でステータスを変更できます。ステータスは担当者が管理しています。
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
                      Q. 面接対応可能日を変更・削除したい場合は？
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      A. 面接対応可能日ページで、登録済みの日付をクリックすると削除予約（赤色）になります。保存ボタンで反映されます。予約済みの日程は削除できません。
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
                      Q. 通知はどこで確認できますか？
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      A. ヘッダー右上のベルアイコンから通知を確認できます。また、サイドバーの「通知センター」で全ての通知履歴を確認できます。
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
                      Q. パスワードを変更したい場合は？
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      A. サイドバーの「設定」からアカウント設定にアクセスし、パスワードを変更できます。
                    </p>
                  </div>
                </div>
              )}

              {helpModalType === "shortcuts" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">検索を開く</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">応募者・求人をすばやく検索</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <kbd className="px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded">⌘</kbd>
                      <span className="text-slate-400">+</span>
                      <kbd className="px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded">K</kbd>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">モーダルを閉じる</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">開いているモーダルやメニューを閉じる</p>
                    </div>
                    <kbd className="px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded">ESC</kbd>
                  </div>
                  <div className="mt-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                    <p className="text-xs text-indigo-700 dark:text-indigo-300">
                      Windows/Linuxの場合は ⌘ の代わりに Ctrl キーを使用してください。
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
              <button
                onClick={() => setHelpModalType(null)}
                className="w-full px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-500 transition-colors"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Modal Overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="flex items-start justify-center pt-[15vh]">
            <div
              ref={searchRef}
              className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-slideDown"
            >
              <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="応募者、求人を検索..."
                  className="flex-1 text-[15px] text-slate-900 placeholder:text-slate-400 outline-none"
                />
                <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-400 bg-slate-100 rounded-md">
                  ESC
                </kbd>
              </div>
              <div className="max-h-[50vh] overflow-y-auto">
                {searchQuery.length === 0 ? (
                  <div className="px-5 py-8 text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                      </svg>
                    </div>
                    <p className="text-[13px] text-slate-500">検索キーワードを入力してください</p>
                  </div>
                ) : searchResults.every(r => r.items.length === 0) ? (
                  <div className="px-5 py-8 text-center">
                    <p className="text-[13px] text-slate-500">「{searchQuery}」に一致する結果はありません</p>
                  </div>
                ) : (
                  <div className="py-2">
                    {searchResults.map((group) => group.items.length > 0 && (
                      <div key={group.type} className="mb-2">
                        <div className="px-5 py-2">
                          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{group.label}</p>
                        </div>
                        {group.items.map((item, i) => (
                          <button
                            key={i}
                            className="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors text-left"
                            onClick={() => setSearchOpen(false)}
                          >
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                              </svg>
                            </div>
                            <span className="text-[14px] text-slate-700">{item}</span>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="fixed left-0 right-0 top-0 z-50 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-700/80">
        <div className="h-full px-4 lg:px-6 flex items-center justify-between">
          {/* Left: Logo + Mobile Menu */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <svg className="w-5 h-5 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                )}
              </svg>
            </button>

            {/* Logo */}
            <Link href="/client/dashboard" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/30 transition-shadow">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
                </svg>
              </div>
              <div className="hidden sm:block">
                <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{companyName}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">採用管理ポータル</p>
              </div>
            </Link>

            {/* Breadcrumb */}
            <div className="hidden lg:flex items-center gap-2 ml-4">
              <svg className="w-4 h-4 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
              {breadcrumb.map((item, i) => (
                <div key={item.href} className="flex items-center gap-2">
                  {item.isLast ? (
                    <span className="text-[13px] font-medium text-slate-900 dark:text-slate-100">{item.label}</span>
                  ) : (
                    <>
                      <Link href={item.href} className="text-[13px] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                        {item.label}
                      </Link>
                      <svg className="w-4 h-4 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Center: Search + Stats Ticker */}
          <div className="hidden md:flex items-center gap-4 flex-1 max-w-2xl mx-4">
            {/* Search */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex-1 max-w-md flex items-center gap-3 px-4 py-2 bg-slate-100/80 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors group"
            >
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <span className="flex-1 text-left text-[13px] text-slate-400">検索...</span>
              <kbd className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-slate-400 bg-white dark:bg-slate-600 rounded border border-slate-200 dark:border-slate-500">
                ⌘K
              </kbd>
            </button>

            {/* Stats Ticker */}
            <div className={`hidden xl:flex items-center gap-3 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl transition-all duration-300 ${statsAnimating ? "scale-[1.02]" : ""}`}>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <span className="text-[12px] text-slate-600 dark:text-slate-400">今日</span>
                <span className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{quickStats.todayApplicants}</span>
              </div>
              <div className="w-px h-4 bg-slate-200 dark:bg-slate-600"></div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span className="text-[12px] text-slate-600 dark:text-slate-400">未対応</span>
                <span className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{quickStats.pendingReview}</span>
              </div>
              <div className="w-px h-4 bg-slate-200 dark:bg-slate-600"></div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-[12px] text-slate-600 dark:text-slate-400">面接</span>
                <span className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{quickStats.interviewsThisWeek}</span>
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1">
            {/* Mobile Search */}
            <button
              onClick={() => setSearchOpen(true)}
              className="md:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <svg className="w-5 h-5 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </button>

            {/* Meeting Request Button */}
            <button
              onClick={() => setMeetingModalOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-xl transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              打ち合わせ希望
            </button>

            {/* Quick Action */}
            <div className="relative" ref={quickActionRef}>
                <button
                  onClick={() => setQuickActionOpen(!quickActionOpen)}
                  className={`p-2 rounded-lg transition-colors ${quickActionOpen ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400" : "hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </button>
              {quickActionOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl shadow-slate-200/50 dark:shadow-black/30 border border-slate-200/80 dark:border-slate-700 overflow-hidden animate-slideDown">
                  <div className="p-2">
                    {quickActions.map((action, i) => (
                      <button
                        key={i}
                        onClick={action.action}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                          {action.icon === "search" && (
                            <svg className="w-4 h-4 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                            </svg>
                          )}
                          {action.icon === "calendar" && (
                            <svg className="w-4 h-4 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                            </svg>
                          )}
                          {action.icon === "support" && (
                            <svg className="w-4 h-4 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                            </svg>
                          )}
                        </div>
                        <span className="text-[13px] text-slate-700 dark:text-slate-200">{action.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Help */}
            <div className="relative" ref={helpRef}>
              <button
                onClick={() => setHelpOpen(!helpOpen)}
                className={`relative p-2 rounded-lg transition-colors ${helpOpen ? "bg-slate-100 dark:bg-slate-700" : "hover:bg-slate-100 dark:hover:bg-slate-700"}`}
              >
                <svg className="w-5 h-5 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                </svg>
              </button>
              {helpOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl shadow-slate-200/50 dark:shadow-black/30 border border-slate-200/80 dark:border-slate-700 overflow-hidden animate-slideDown">
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-900/30 dark:to-violet-900/30">
                    <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">ヘルプセンター</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">お困りですか？</p>
                  </div>
                  <div className="p-2">
                    {helpItems.map((item, i) => (
                      <button
                        key={i}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left"
                        onClick={item.action}
                      >
                        <div>
                          <p className="text-[13px] text-slate-700 dark:text-slate-200">{item.label}</p>
                          <p className="text-[11px] text-slate-400">{item.description}</p>
                        </div>
                        <svg className="w-4 h-4 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sync Status */}
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-1.5 rounded-lg">
              {syncStatus === "synced" && (
                <>
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">同期済</span>
                </>
              )}
              {syncStatus === "syncing" && (
                <>
                  <div className="w-3 h-3 border-2 border-slate-300 dark:border-slate-600 border-t-indigo-500 rounded-full animate-spin"></div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">同期中</span>
                </>
              )}
              {syncStatus === "error" && (
                <>
                  <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                  <span className="text-[11px] text-rose-600 dark:text-rose-400">エラー</span>
                </>
              )}
            </div>

            {/* Dark Mode Toggle */}
            <button
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title={resolvedTheme === "dark" ? "ライトモードに切替" : "ダークモードに切替"}
            >
              {resolvedTheme === "dark" ? (
                <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                </svg>
              )}
            </button>

            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>

            {/* Notifications */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setNotificationOpen(!notificationOpen)}
                className={`relative p-2 rounded-lg transition-colors ${notificationOpen ? "bg-slate-100 dark:bg-slate-700" : "hover:bg-slate-100 dark:hover:bg-slate-700"}`}
              >
                <svg className="w-5 h-5 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 flex items-center justify-center text-[10px] font-bold text-white bg-rose-500 rounded-full animate-bounce">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notificationOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-xl shadow-slate-200/50 dark:shadow-black/30 border border-slate-200/80 dark:border-slate-700 overflow-hidden animate-slideDown">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                    <h3 className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">通知</h3>
                    {notifications.length > 0 && (
                      <button
                        onClick={markAllNotificationsRead}
                        className="text-[12px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium transition-colors"
                      >
                        すべて既読
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center">
                        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-3">
                          <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                          </svg>
                        </div>
                        <p className="text-[13px] text-slate-500 dark:text-slate-400">通知はありません</p>
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          onClick={() => {
                            if (notification.unread) markNotificationRead(notification.id);
                            if (notification.url) { setNotificationOpen(false); router.push(notification.url); }
                          }}
                          className={`flex gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer ${
                            notification.unread ? "bg-indigo-50/50 dark:bg-indigo-900/20" : ""
                          }`}
                        >
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            notification.type === "applicant" ? "bg-blue-100 dark:bg-blue-900/30" :
                            notification.type === "status" ? "bg-emerald-100 dark:bg-emerald-900/30" :
                            notification.type === "meeting" ? "bg-violet-100 dark:bg-violet-900/30" : "bg-slate-100 dark:bg-slate-700"
                          }`}>
                            {notification.type === "applicant" && (
                              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                              </svg>
                            )}
                            {notification.type === "status" && (
                              <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                            {notification.type === "meeting" && (
                              <svg className="w-4 h-4 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                              </svg>
                            )}
                            {notification.type === "system" && (
                              <svg className="w-4 h-4 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[13px] font-medium text-slate-900 dark:text-slate-100 truncate">{notification.title}</p>
                              {notification.unread && (
                                <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0"></span>
                              )}
                            </div>
                            <p className="text-[12px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{notification.message}</p>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">{notification.time}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700">
                    <Link
                      href="/client/notifications"
                      className="block text-center text-[13px] font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                      onClick={() => setNotificationOpen(false)}
                    >
                      すべての通知を見る
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className={`flex items-center gap-2 p-1.5 pr-2 rounded-xl transition-all duration-200 ${
                  userMenuOpen ? "bg-slate-100 dark:bg-slate-700" : "hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              >
                <div className="relative">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center ring-2 ring-white dark:ring-slate-800">
                    <span className="text-sm font-semibold text-white">{userInitial}</span>
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-800 rounded-full"></span>
                </div>
                <svg className={`hidden sm:block w-4 h-4 text-slate-400 transition-transform duration-200 ${userMenuOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-xl shadow-slate-200/50 dark:shadow-black/30 border border-slate-200/80 dark:border-slate-700 overflow-hidden animate-slideDown">
                  <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-700 dark:to-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                        <span className="text-lg font-semibold text-white">{userInitial}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-slate-900 dark:text-slate-100 truncate">{userName}</p>
                        <p className="text-[12px] text-slate-500 dark:text-slate-400 truncate">{userEmail}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200/80 dark:border-slate-600">
                      <span className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 rounded-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        オンライン
                      </span>
                      <span className="text-[11px] text-slate-400">{companyName}</span>
                    </div>
                  </div>
                  <div className="p-2">
                    <Link
                      href="/client/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center group-hover:bg-slate-200 dark:group-hover:bg-slate-600 transition-colors">
                        <svg className="w-4 h-4 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-slate-700 dark:text-slate-200">アカウント設定</p>
                        <p className="text-[11px] text-slate-400">プロフィール・パスワード</p>
                      </div>
                    </Link>
                    <Link
                      href="/client/support"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center group-hover:bg-slate-200 dark:group-hover:bg-slate-600 transition-colors">
                        <svg className="w-4 h-4 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-slate-700 dark:text-slate-200">ヘルプ・サポート</p>
                        <p className="text-[11px] text-slate-400">お問い合わせ・FAQ</p>
                      </div>
                    </Link>
                  </div>
                  <div className="p-2 border-t border-slate-100 dark:border-slate-700">
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center group-hover:bg-rose-200 dark:group-hover:bg-rose-900/50 transition-colors">
                        <svg className="w-4 h-4 text-rose-500 dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-rose-600 dark:text-rose-400">ログアウト</p>
                        <p className="text-[11px] text-slate-400">セッションを終了</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Push Notification Prompt Banner */}
      <div className="fixed top-16 left-0 right-0 z-40">
        <PushNotificationPrompt />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden animate-fadeIn"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-16 bottom-0 z-40 bg-white dark:bg-slate-800 border-r border-slate-200/80 dark:border-slate-700/80 transition-all duration-300 ease-out
          ${sidebarCollapsed ? "w-[72px]" : "w-60"}
          ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="flex flex-col h-full">
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                    isActive
                      ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100"
                  }`}
                >
                  <div className={`flex-shrink-0 transition-colors ${isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"}`}>
                    {item.icon}
                  </div>
                  {!sidebarCollapsed && (
                    <span className={`text-[13px] font-medium truncate ${isActive ? "font-semibold" : ""}`}>
                      {item.label}
                    </span>
                  )}
                  {isActive && !sidebarCollapsed && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400"></div>
                  )}
                  {item.badge && !sidebarCollapsed && (
                    <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold text-white bg-rose-500 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}

            <div className="my-4 mx-3 border-t border-slate-100 dark:border-slate-700"></div>

            {secondaryNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                    isActive
                      ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100"
                  }`}
                >
                  <div className={`flex-shrink-0 transition-colors ${isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"}`}>
                    {item.icon}
                  </div>
                  {!sidebarCollapsed && (
                    <span className={`text-[13px] font-medium truncate ${isActive ? "font-semibold" : ""}`}>
                      {item.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="p-3 border-t border-slate-100 dark:border-slate-700">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex items-center justify-center w-full p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <svg
                className={`w-4 h-4 transition-transform duration-300 ${sidebarCollapsed ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.75}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`min-h-screen transition-all duration-300 ease-out
          ${showPushBanner ? "pt-[116px]" : "pt-16"}
          ${sidebarCollapsed ? "lg:pl-[72px]" : "lg:pl-60"}
        `}
      >
        <div className="p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-slideDown {
          animation: slideDown 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
