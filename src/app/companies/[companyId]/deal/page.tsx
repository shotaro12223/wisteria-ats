// src/app/companies/[companyId]/deal/page.tsx
"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";

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
import { DealStageGauge } from "@/components/deals/DealStageGauge";
import { DealMeetingCard } from "@/components/deals/DealMeetingCard";
import { DealMeetingNotes } from "@/components/deals/DealMeetingNotes";
import { DealOverviewForm } from "@/components/deals/DealOverviewForm";
import { DealProfileEditor } from "@/components/deals/DealProfileEditor";
import { DealProfileDisplay } from "@/components/deals/DealProfileDisplay";
import { DealROISimulator } from "@/components/deals/DealROISimulator";
import { DealNextMeetingScheduler } from "@/components/deals/DealNextMeetingScheduler";
import { DealCompetitorComparison } from "@/components/deals/DealCompetitorComparison";
import { DealCustomerSuccessDashboard } from "@/components/deals/DealCustomerSuccessDashboard";
import { DealQuickInputModal } from "@/components/deals/DealQuickInputModal";
import { DealProposalSummary } from "@/components/deals/DealProposalSummary";
import { TabBar } from "@/components/deals/TabBar";
import { s, deriveMode, normalizeStageForMode } from "@/lib/deal-utils";

import type { SaveStatus, DealMode, TabKey } from "@/components/deals/types";

type DealRow = {
  id: string;
  company_id: string | null;
  kind: "new" | "existing";
  title: string;
  stage: string;
  start_date: string | null;
  due_date: string | null;
  amount: number | null;
  probability: number | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
};

type CompanyRow = {
  id: string;
  company_name: string;
  created_at: string;
  updated_at: string;
};

type RecordRow = {
  company_id: string;
  status: string;
  owner_user_id: string | null;
  tags: string[];
  memo: string | null;
  profile: any;
  created_at: string;
  updated_at: string;
};

type DealGetRes =
  | { ok: true; deal: DealRow; company: CompanyRow | null; record: RecordRow | null }
  | { ok: false; error: { message: string } };

type DealPatchRes = { ok: true; deal: DealRow } | { ok: false; error: { message: string } };

type RecordPatchRes = { ok: true } | { ok: false; error: { message: string } };

const UI = {
  PAGE_BG: "relative",
  PANEL: "rounded-md border-2 border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm",
  PANEL_HDR: "flex items-start justify-between gap-3 border-b-2 border-slate-200/80 dark:border-slate-700 px-4 py-3",
  PANEL_TITLE: "text-[13px] font-semibold text-slate-900 dark:text-slate-100",
  PANEL_SUB: "mt-0.5 text-[12px] text-slate-700/90 dark:text-slate-400 font-medium",
  PANEL_BODY: "px-4 py-3",
};

export default function CompanyDealPage() {
  const params = useParams();
  const sp = useSearchParams();

  const companyId = useMemo(() => {
    const raw = (params as any)?.companyId;
    if (raw === undefined || raw === null) return "";
    return String(raw);
  }, [params]);

  const view = useMemo(() => String(sp?.get("view") ?? "").trim(), [sp]);
  const isMeetingView = view === "meeting";
  const share = useMemo(() => String(sp?.get("share") ?? "").trim(), [sp]);
  const isShare = share === "1" || share === "true";
  const edit = useMemo(() => String(sp?.get("edit") ?? "").trim(), [sp]);
  const isEditMode = edit === "1" || edit === "true";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState<TabKey>("overview");

  const [deal, setDeal] = useState<DealRow | null>(null);
  const [company, setCompany] = useState<CompanyRow | null>(null);
  const [record, setRecord] = useState<RecordRow | null>(null);

  // 編集（商談固有）
  const [title, setTitle] = useState("");
  const [stage, setStage] = useState("");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [memo, setMemo] = useState("");
  const [amount, setAmount] = useState("");
  const [probability, setProbability] = useState("");

  // Meeting用 社内メモ
  const [meetingGoal, setMeetingGoal] = useState("");
  const [meetingNext, setMeetingNext] = useState("");
  const [meetingRisks, setMeetingRisks] = useState("");

  // ROIシミュレーター用
  const [hiringsPerYear, setHiringsPerYear] = useState(5);
  const [competitorCostPerHire, setCompetitorCostPerHire] = useState(500000);
  const [minimumContractMonths, setMinimumContractMonths] = useState("3");
  const [proposalMode, setProposalMode] = useState<"competitor" | "current" | "new">("competitor");

  // Profile 編集用 state
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [contractPlan, setContractPlan] = useState("");
  const [campaignApplied, setCampaignApplied] = useState("");
  const [mrr, setMrr] = useState("");
  const [billingCycle, setBillingCycle] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [locationCity, setLocationCity] = useState("");
  const [hiringDifficulty, setHiringDifficulty] = useState("");
  const [decisionMakerName, setDecisionMakerName] = useState("");
  const [primaryContactTitle, setPrimaryContactTitle] = useState("");
  const [primaryContactName, setPrimaryContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [communicationPreference, setCommunicationPreference] = useState("");
  const [contactHours, setContactHours] = useState("");
  const [acquisitionSourceType, setAcquisitionSourceType] = useState("");
  const [acquisitionSourceDetail, setAcquisitionSourceDetail] = useState("");
  const [ngNotes, setNgNotes] = useState("");
  const [notesInternal, setNotesInternal] = useState("");

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState("");
  const [profileSaveStatus, setProfileSaveStatus] = useState<SaveStatus>("idle");
  const [profileSaveError, setProfileSaveError] = useState("");
  const [showQuickInput, setShowQuickInput] = useState(false);

  // 利用状況（カスタマーサクセス用）
  const [utilization, setUtilization] = useState({
    totalJobs: 0,
    activeJobs: 0,
    totalApplicants: 0,
    thisMonthApplicants: 0,
    hiredCount: 0,
    thisMonthHired: 0,
  });
  const [loadingUtil, setLoadingUtil] = useState(false);

  // 利用状況取得
  useEffect(() => {
    if (!companyId) return;
    let alive = true;
    (async () => {
      setLoadingUtil(true);
      try {
        const jobsRes = await fetch(`/api/jobs?companyId=${encodeURIComponent(companyId)}`, { cache: "no-store" });
        let totalJobs = 0;
        let activeJobs = 0;
        if (jobsRes.ok) {
          const jobsJson = await jobsRes.json();
          if (jobsJson.ok && Array.isArray(jobsJson.jobs)) {
            totalJobs = jobsJson.jobs.length;
            activeJobs = jobsJson.jobs.filter((j: any) => {
              const siteStatus = j.site_status || {};
              return Object.values(siteStatus).some((s: any) => s?.state === "掲載中");
            }).length;
          }
        }
        const applicantsRes = await fetch(`/api/applicants?companyId=${encodeURIComponent(companyId)}&limit=1000`, { cache: "no-store" });
        let totalApplicants = 0;
        let thisMonthApplicants = 0;
        let hiredCount = 0;
        let thisMonthHired = 0;
        if (applicantsRes.ok) {
          const applicantsJson = await applicantsRes.json();
          if (applicantsJson.ok && Array.isArray(applicantsJson.items)) {
            totalApplicants = applicantsJson.items.length;
            const now = new Date();
            const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            applicantsJson.items.forEach((a: any) => {
              const appliedAt = a.appliedAt ? new Date(a.appliedAt) : null;
              if (appliedAt && appliedAt >= thisMonthStart) thisMonthApplicants++;
              if (a.status === "OFFER" || a.status === "内定") {
                hiredCount++;
                if (appliedAt && appliedAt >= thisMonthStart) thisMonthHired++;
              }
            });
          }
        }
        if (!alive) return;
        setUtilization({ totalJobs, activeJobs, totalApplicants, thisMonthApplicants, hiredCount, thisMonthHired });
      } catch (err) {
        console.error("利用状況取得エラー:", err);
      } finally {
        if (!alive) return;
        setLoadingUtil(false);
      }
    })();
    return () => { alive = false; };
  }, [companyId]);

  const baselineRef = useRef<string>("");
  const suppressDirtyRef = useRef(false);
  const savedTimerRef = useRef<number | null>(null);
  const profileSavedTimerRef = useRef<number | null>(null);

  // Mouse tracking for gradient
  const containerRef = useRef<HTMLDivElement>(null);
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMouse({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    });
  }, []);

  // Float animation
  useEffect(() => {
    const styleId = "deal-float-anim";
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-20px)}}`;
    document.head.appendChild(style);
  }, []);

  // Time of day
  const timeInfo = getTimeOfDay();

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) window.clearTimeout(savedTimerRef.current);
      if (profileSavedTimerRef.current) window.clearTimeout(profileSavedTimerRef.current);
    };
  }, []);

  function snapshotKey() {
    try {
      return JSON.stringify({ title, stage, startDate, dueDate, memo, amount, probability });
    } catch {
      return String(Date.now());
    }
  }

  function markDirtyIfNeeded() {
    if (suppressDirtyRef.current) return;
    const base = baselineRef.current;
    if (!base) return;
    const nowKey = snapshotKey();
    if (nowKey !== base) {
      setSaveStatus((p) => (p === "saving" ? "saving" : "dirty"));
    } else {
      setSaveStatus((p) => (p === "saving" ? "saving" : "idle"));
    }
  }

  useEffect(() => {
    if (!companyId) return;
    markDirtyIfNeeded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, title, stage, startDate, dueDate, memo, amount, probability]);

  useEffect(() => {
    if (!companyId) return;

    let alive = true;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        // 会社IDベースでdealを取得（なければ自動作成される）
        const res = await fetch(`/api/companies/${encodeURIComponent(companyId)}/deal`, { cache: "no-store" });

        const text = await res.text();
        const json = (text ? JSON.parse(text) : { ok: false, error: { message: "Empty response" } }) as DealGetRes;

        if (!res.ok || !json.ok) {
          const msg = !json.ok ? json.error.message : `load failed (${res.status})`;
          throw new Error(msg);
        }

        if (!alive) return;

        setDeal(json.deal);
        setCompany(json.company ?? null);
        setRecord(json.record ?? null);

        suppressDirtyRef.current = true;
        setTitle(s(json.deal.title));

        const modeAtLoad = deriveMode(json.deal.kind, json.record?.status);
        const normalizedStage = normalizeStageForMode(s(json.deal.stage) || "", modeAtLoad);
        setStage(normalizedStage);

        setStartDate(s(json.deal.start_date));
        setDueDate(s(json.deal.due_date));
        setMemo(s(json.deal.memo));
        setAmount(json.deal.amount != null ? String(json.deal.amount) : "");
        setProbability(json.deal.probability != null ? String(json.deal.probability) : "");

        // Profile state を初期化
        const p = json.record?.profile && typeof json.record.profile === "object" ? json.record.profile : {};
        setContractPlan(s(p.contract_plan));
        setCampaignApplied(s(p.campaign_applied));
        setMrr(s(p.mrr));
        setBillingCycle(s(p.billing_cycle));
        setPaymentMethod(s(p.payment_method));
        setLocationCity(s(p.location_city));
        setHiringDifficulty(s(p.hiring_difficulty));
        setDecisionMakerName(s(p.decision_maker_name));
        setPrimaryContactTitle(s(p.primary_contact_title));
        setPrimaryContactName(s(p.primary_contact_name));
        setContactEmail(s(p.contact_email));
        setContactPhone(s(p.contact_phone));
        setCommunicationPreference(s(p.communication_preference));
        setContactHours(s(p.contact_hours));
        setAcquisitionSourceType(s(p.acquisition_source_type));
        setAcquisitionSourceDetail(s(p.acquisition_source_detail));
        setNgNotes(s(p.ng_notes));
        setNotesInternal(s(p.notes_internal));

        setSaveStatus("idle");
        setSaveError("");

        window.setTimeout(() => {
          baselineRef.current = snapshotKey();
          suppressDirtyRef.current = false;
        }, 0);
      } catch (e: any) {
        if (!alive) return;
        setErr(String(e?.message ?? e ?? "load failed"));
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  function showSavedOnce() {
    setSaveStatus("saved");
    if (savedTimerRef.current) window.clearTimeout(savedTimerRef.current);
    savedTimerRef.current = window.setTimeout(() => {
      setSaveStatus("idle");
      savedTimerRef.current = null;
    }, 1600);
  }

  function showProfileSavedOnce() {
    setProfileSaveStatus("saved");
    if (profileSavedTimerRef.current) window.clearTimeout(profileSavedTimerRef.current);
    profileSavedTimerRef.current = window.setTimeout(() => {
      setProfileSaveStatus("idle");
      profileSavedTimerRef.current = null;
    }, 1600);
  }

  const mode: DealMode = deriveMode(deal?.kind, record?.status);
  const dealId = deal?.id ?? "";

  // プロファイルからカスタマーサクセス関連データ取得
  const profileData = record?.profile && typeof record.profile === "object" ? record.profile : {} as any;
  const mrrValue = profileData.mrr ? parseFloat(String(profileData.mrr).replace(/[^0-9]/g, "")) : 0;
  const contractStartDate = profileData.contract_start_date || "";
  const nextRenewalDate = profileData.next_renewal_date || "";
  const healthStatus = profileData.health || "";
  const renewalConfidence = profileData.renewal_confidence || "";

  // 契約期間計算
  const contractMonths = useMemo(() => {
    if (!contractStartDate) return 0;
    const start = new Date(contractStartDate);
    const now = new Date();
    const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    return Math.max(0, months);
  }, [contractStartDate]);

  // 更新まで日数
  const daysUntilRenewal = useMemo(() => {
    if (!nextRenewalDate) return null;
    const renewal = new Date(nextRenewalDate);
    const now = new Date();
    const diff = Math.ceil((renewal.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  }, [nextRenewalDate]);

  // 解約リスク判定
  const churnRisk = useMemo(() => {
    let score = 0;
    if (healthStatus === "risk" || healthStatus === "danger") score += 40;
    if (utilization.activeJobs === 0 && contractMonths > 1) score += 30;
    if (utilization.thisMonthApplicants === 0 && contractMonths > 0) score += 20;
    if (renewalConfidence === "low") score += 30;
    if (daysUntilRenewal !== null && daysUntilRenewal < 30 && daysUntilRenewal > 0) score += 20;
    return Math.min(100, score);
  }, [healthStatus, utilization.activeJobs, utilization.thisMonthApplicants, contractMonths, renewalConfidence, daysUntilRenewal]);

  const healthScore = 100 - churnRisk;
  const riskLevel = churnRisk >= 70 ? "高" : churnRisk >= 40 ? "中" : "低";
  const riskColorClass = churnRisk >= 70 ? "rose" : churnRisk >= 40 ? "amber" : "emerald";

  // ROI計算
  const monthlyCost = parseFloat(amount || "0");
  const yearlyTotal = monthlyCost * 12;
  const competitorYearlyTotal = competitorCostPerHire * hiringsPerYear;
  const yearlySavings = competitorYearlyTotal - yearlyTotal;

  async function handleSave() {
    if (!dealId) return;

    setSaveStatus("saving");
    setSaveError("");

    const stageToSave = normalizeStageForMode(stage, mode);

    try {
      const amountNum = amount ? parseFloat(amount) : null;
      const probabilityNum = probability ? parseFloat(probability) : null;

      const res = await fetch(`/api/deals/${encodeURIComponent(dealId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          title: String(title ?? ""),
          stage: String(stageToSave ?? ""),
          start_date: startDate ? String(startDate) : null,
          due_date: dueDate ? String(dueDate) : null,
          memo: memo ? String(memo) : null,
          amount: amountNum,
          probability: probabilityNum,
        }),
      });

      const text = await res.text();
      const json = (text ? JSON.parse(text) : { ok: false, error: { message: "Empty response" } }) as DealPatchRes;

      if (!res.ok || !json.ok) {
        const msg = !json.ok ? json.error.message : `save failed (status: ${res.status})`;
        throw new Error(msg);
      }

      setDeal(json.deal);

      suppressDirtyRef.current = true;
      setStage(stageToSave);
      baselineRef.current = snapshotKey();
      suppressDirtyRef.current = false;

      showSavedOnce();
    } catch (e: any) {
      setSaveStatus("error");
      setSaveError(String(e?.message ?? e ?? "save failed"));
    }
  }

  async function handleQuickSave(data: {
    amount: string;
    probability: string;
    minimumContractMonths: string;
    proposalMode: "competitor" | "current" | "new";
    primaryContactName: string;
    primaryContactTitle: string;
    contactEmail: string;
    contactPhone: string;
    decisionMakerName: string;
    communicationPreference: string;
    contactHours: string;
  }) {
    // ローカル状態を更新
    setAmount(data.amount);
    setProbability(data.probability);
    setMinimumContractMonths(data.minimumContractMonths);
    setProposalMode(data.proposalMode);
    setPrimaryContactName(data.primaryContactName);
    setPrimaryContactTitle(data.primaryContactTitle);
    setContactEmail(data.contactEmail);
    setContactPhone(data.contactPhone);
    setDecisionMakerName(data.decisionMakerName);
    setCommunicationPreference(data.communicationPreference);
    setContactHours(data.contactHours);

    if (!dealId || !company?.id) return;

    try {
      // 商談情報を保存
      const amountNum = data.amount ? parseFloat(data.amount) : null;
      const probabilityNum = data.probability ? parseFloat(data.probability) : null;

      const dealRes = await fetch(`/api/deals/${encodeURIComponent(dealId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          amount: amountNum,
          probability: probabilityNum,
        }),
      });

      const dealText = await dealRes.text();
      const dealJson = (dealText ? JSON.parse(dealText) : { ok: false, error: { message: "Empty response" } }) as DealPatchRes;

      if (dealRes.ok && dealJson.ok) {
        setDeal(dealJson.deal);
      }

      // 企業情報を保存
      const profilePayload = {
        primary_contact_name: data.primaryContactName,
        primary_contact_title: data.primaryContactTitle,
        contact_email: data.contactEmail,
        contact_phone: data.contactPhone,
        decision_maker_name: data.decisionMakerName,
        communication_preference: data.communicationPreference,
        contact_hours: data.contactHours,
      };

      const profileRes = await fetch(`/api/companies/${encodeURIComponent(company.id)}/record`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ profile: profilePayload }),
      });

      if (!profileRes.ok) {
        throw new Error("Profile save failed");
      }
    } catch (e: any) {
      console.error("Quick save error:", e);
    }
  }

  async function handleSaveProfile() {
    if (!company?.id) return;

    setProfileSaveStatus("saving");
    setProfileSaveError("");

    try {
      const profilePayload = {
        contract_plan: contractPlan,
        campaign_applied: campaignApplied,
        mrr: mrr,
        billing_cycle: billingCycle,
        payment_method: paymentMethod,
        location_city: locationCity,
        hiring_difficulty: hiringDifficulty,
        decision_maker_name: decisionMakerName,
        primary_contact_title: primaryContactTitle,
        primary_contact_name: primaryContactName,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        communication_preference: communicationPreference,
        contact_hours: contactHours,
        acquisition_source_type: acquisitionSourceType,
        acquisition_source_detail: acquisitionSourceDetail,
        ng_notes: ngNotes,
        notes_internal: notesInternal,
      };

      const res = await fetch(`/api/companies/${encodeURIComponent(company.id)}/record`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ profile: profilePayload }),
      });

      const text = await res.text();
      const json = (text ? JSON.parse(text) : { ok: false, error: { message: "Empty response" } }) as RecordPatchRes;

      if (!res.ok || !json.ok) {
        const msg = !json.ok ? json.error.message : `save failed (status: ${res.status})`;
        throw new Error(msg);
      }

      // record を更新
      setRecord((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          profile: {
            ...prev.profile,
            ...profilePayload,
          },
        };
      });

      showProfileSavedOnce();
    } catch (e: any) {
      setProfileSaveStatus("error");
      setProfileSaveError(String(e?.message ?? e ?? "save failed"));
    }
  }

  const profile = record?.profile && typeof record.profile === "object" ? record.profile : {};
  const companyName = company?.company_name || "(会社名未設定)";
  const meetingModeLabel = "打ち合わせ中（見せる画面）";

  const profileFields = {
    contractPlan,
    campaignApplied,
    mrr,
    billingCycle,
    paymentMethod,
    locationCity,
    hiringDifficulty,
    decisionMakerName,
    primaryContactTitle,
    primaryContactName,
    contactEmail,
    contactPhone,
    communicationPreference,
    contactHours,
    acquisitionSourceType,
    acquisitionSourceDetail,
    ngNotes,
    notesInternal,
  };

  const handleProfileFieldChange = (field: keyof typeof profileFields, value: string) => {
    switch (field) {
      case "contractPlan":
        setContractPlan(value);
        break;
      case "campaignApplied":
        setCampaignApplied(value);
        break;
      case "mrr":
        setMrr(value);
        break;
      case "billingCycle":
        setBillingCycle(value);
        break;
      case "paymentMethod":
        setPaymentMethod(value);
        break;
      case "locationCity":
        setLocationCity(value);
        break;
      case "hiringDifficulty":
        setHiringDifficulty(value);
        break;
      case "decisionMakerName":
        setDecisionMakerName(value);
        break;
      case "primaryContactTitle":
        setPrimaryContactTitle(value);
        break;
      case "primaryContactName":
        setPrimaryContactName(value);
        break;
      case "contactEmail":
        setContactEmail(value);
        break;
      case "contactPhone":
        setContactPhone(value);
        break;
      case "communicationPreference":
        setCommunicationPreference(value);
        break;
      case "contactHours":
        setContactHours(value);
        break;
      case "acquisitionSourceType":
        setAcquisitionSourceType(value);
        break;
      case "acquisitionSourceDetail":
        setAcquisitionSourceDetail(value);
        break;
      case "ngNotes":
        setNgNotes(value);
        break;
      case "notesInternal":
        setNotesInternal(value);
        break;
    }
  };

  // Summary text for typing effect
  const summaryText = useMemo(() => {
    if (loading) return "データを読み込み中...";
    if (!deal) return "打ち合わせ情報を取得しています...";
    if (isMeetingView) return `${companyName}との打ち合わせ中です。`;
    return `${companyName}の商談ステータス: ${stage || "準備中"}`;
  }, [loading, deal, companyName, stage, isMeetingView]);
  const typedSummary = useTypingEffect(summaryText, 25);

  return (
    <div ref={containerRef} onMouseMove={onMouseMove} className={[UI.PAGE_BG, "space-y-3"].join(" ")}>
      {/* Premium background with floating blobs */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div
          className="absolute inset-0 transition-all duration-500"
          style={{
            background: `radial-gradient(ellipse 800px 600px at ${mouse.x * 100}% ${mouse.y * 100}%, rgba(99,102,241,0.08) 0%, transparent 50%)`,
          }}
        />
        {isShare ? (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900" />
            <div className="absolute -left-48 -top-48 h-[700px] w-[700px] rounded-full bg-indigo-300/20 dark:bg-indigo-500/10 blur-3xl" style={{ animation: "float 20s ease-in-out infinite" }} />
            <div className="absolute -right-48 top-32 h-[600px] w-[600px] rounded-full bg-purple-300/15 dark:bg-purple-500/08 blur-3xl" style={{ animation: "float 25s ease-in-out infinite reverse" }} />
            <div className="absolute bottom-0 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-pink-300/10 dark:bg-pink-500/05 blur-3xl" style={{ animation: "float 18s ease-in-out infinite 2s" }} />
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />
            <div className="absolute -left-44 -top-52 h-[560px] w-[560px] rounded-full bg-blue-200/15 dark:bg-blue-500/10 blur-3xl" style={{ animation: "float 20s ease-in-out infinite" }} />
            <div className="absolute -right-48 -top-44 h-[620px] w-[620px] rounded-full bg-purple-200/12 dark:bg-purple-500/10 blur-3xl" style={{ animation: "float 25s ease-in-out infinite reverse" }} />
            <div className="absolute left-1/3 bottom-24 h-[400px] w-[400px] rounded-full bg-indigo-200/10 dark:bg-indigo-500/08 blur-3xl" style={{ animation: "float 18s ease-in-out infinite 2s" }} />
          </>
        )}
      </div>

      {/* Premium Header */}
      {!isShare && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 shadow-2xl shadow-indigo-200/40 dark:shadow-black/40 ring-1 ring-indigo-100 dark:ring-white/5">
          {/* Inner gradient blob */}
          <div
            className="pointer-events-none absolute h-[400px] w-[400px] rounded-full bg-gradient-to-br from-indigo-400/20 via-purple-400/15 to-pink-400/10 blur-3xl transition-all duration-500"
            style={{ left: `calc(${mouse.x * 100}% - 200px)`, top: `calc(${mouse.y * 100}% - 200px)` }}
          />

          <div className="relative z-10 px-6 pt-5 pb-4 lg:px-10">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              {/* Left: Title & Summary */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{timeInfo.icon}</span>
                  <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
                    {companyName}
                  </h1>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{typedSummary}<span className="animate-pulse">|</span></p>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  {isMeetingView ? (
                    <>
                      <Link
                        href={`/companies/${companyId}/deal?view=meeting&share=1`}
                        className="rounded-xl bg-indigo-600 dark:bg-white px-4 py-2 text-sm font-semibold text-white dark:text-indigo-700 shadow-lg shadow-indigo-500/25 hover:shadow-xl transition-all"
                      >
                        プレゼンモード
                      </Link>
                      <Link
                        href={`/companies/${companyId}/deal?edit=1`}
                        className="rounded-xl bg-white/80 dark:bg-white/10 backdrop-blur-sm px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 ring-1 ring-indigo-200/40 dark:ring-white/10 shadow-md hover:shadow-xl transition-all"
                      >
                        詳細編集
                      </Link>
                    </>
                  ) : isEditMode ? (
                    <>
                      <Link
                        href={`/companies/${companyId}/deal?view=meeting`}
                        className="rounded-xl bg-indigo-600 dark:bg-white px-4 py-2 text-sm font-semibold text-white dark:text-indigo-700 shadow-lg shadow-indigo-500/25 hover:shadow-xl transition-all"
                      >
                        打ち合わせモード
                      </Link>
                      <Link
                        href={`/companies/${companyId}/deal`}
                        className="rounded-xl bg-white/80 dark:bg-white/10 backdrop-blur-sm px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 ring-1 ring-indigo-200/40 dark:ring-white/10 shadow-md hover:shadow-xl transition-all"
                      >
                        ダッシュボード
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link
                        href={`/companies/${companyId}/deal?view=meeting`}
                        className="rounded-xl bg-indigo-600 dark:bg-white px-4 py-2 text-sm font-semibold text-white dark:text-indigo-700 shadow-lg shadow-indigo-500/25 hover:shadow-xl transition-all"
                      >
                        打ち合わせモード
                      </Link>
                      <Link
                        href={`/companies/${companyId}/deal?edit=1`}
                        className="rounded-xl bg-white/80 dark:bg-white/10 backdrop-blur-sm px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 ring-1 ring-indigo-200/40 dark:ring-white/10 shadow-md hover:shadow-xl transition-all"
                      >
                        詳細編集
                      </Link>
                    </>
                  )}
                  <Link
                    href={`/companies/${companyId}`}
                    className="rounded-xl bg-white/60 dark:bg-white/5 backdrop-blur-sm px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 ring-1 ring-slate-200/40 dark:ring-white/10 shadow-sm hover:shadow-md transition-all"
                  >
                    ← 会社詳細
                  </Link>
                </div>
              </div>

              {/* Right: Status Panels */}
              <div className="flex flex-wrap gap-2 lg:flex-nowrap">
                {/* ステージ */}
                <div className="flex items-center gap-2 rounded-xl bg-white/60 dark:bg-white/5 backdrop-blur-md px-3 py-2 ring-1 ring-indigo-200/40 dark:ring-white/10 shadow-lg">
                  <div className="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                    <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 uppercase">ステージ</div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white leading-none">{stage || "準備"}</div>
                  </div>
                </div>

                {/* MRR */}
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50/80 dark:bg-emerald-900/30 backdrop-blur-md px-3 py-2 ring-1 ring-emerald-200/60 dark:ring-emerald-700/40 shadow-lg">
                  <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                    <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase">MRR</div>
                    <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300 leading-none tabular-nums">{mrrValue > 0 ? `¥${mrrValue.toLocaleString()}` : (amount ? `¥${parseInt(amount).toLocaleString()}` : "—")}</div>
                  </div>
                </div>

                {/* 契約期間 */}
                <div className="flex items-center gap-2 rounded-xl bg-blue-50/80 dark:bg-blue-900/30 backdrop-blur-md px-3 py-2 ring-1 ring-blue-200/60 dark:ring-blue-700/40 shadow-lg">
                  <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-[9px] font-semibold text-blue-600 dark:text-blue-400 uppercase">契約期間</div>
                    <div className="text-sm font-bold text-blue-700 dark:text-blue-300 leading-none tabular-nums">{contractMonths > 0 ? `${contractMonths}ヶ月` : "—"}</div>
                  </div>
                </div>

                {/* 健全性スコア */}
                <div className={`flex items-center gap-2 rounded-xl backdrop-blur-md px-3 py-2 ring-1 shadow-lg ${healthScore >= 70 ? "bg-emerald-50/80 dark:bg-emerald-900/30 ring-emerald-200/60 dark:ring-emerald-700/40" : healthScore >= 40 ? "bg-amber-50/80 dark:bg-amber-900/30 ring-amber-200/60 dark:ring-amber-700/40" : "bg-rose-50/80 dark:bg-rose-900/30 ring-rose-200/60 dark:ring-rose-700/40"}`}>
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${healthScore >= 70 ? "bg-emerald-100 dark:bg-emerald-900/50" : healthScore >= 40 ? "bg-amber-100 dark:bg-amber-900/50" : "bg-rose-100 dark:bg-rose-900/50"}`}>
                    <svg className={`w-4 h-4 ${healthScore >= 70 ? "text-emerald-600 dark:text-emerald-400" : healthScore >= 40 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className={`text-[9px] font-semibold uppercase ${healthScore >= 70 ? "text-emerald-600 dark:text-emerald-400" : healthScore >= 40 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"}`}>健全性</div>
                    <div className={`text-sm font-bold leading-none tabular-nums ${healthScore >= 70 ? "text-emerald-700 dark:text-emerald-300" : healthScore >= 40 ? "text-amber-700 dark:text-amber-300" : "text-rose-700 dark:text-rose-300"}`}>{healthScore}%</div>
                  </div>
                </div>

                {/* 解約リスク */}
                <div className={`flex items-center gap-2 rounded-xl backdrop-blur-md px-3 py-2 ring-1 shadow-lg ${churnRisk >= 70 ? "bg-rose-50/80 dark:bg-rose-900/30 ring-rose-200/60 dark:ring-rose-700/40" : churnRisk >= 40 ? "bg-amber-50/80 dark:bg-amber-900/30 ring-amber-200/60 dark:ring-amber-700/40" : "bg-slate-50/80 dark:bg-slate-800/30 ring-slate-200/60 dark:ring-slate-700/40"}`}>
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${churnRisk >= 70 ? "bg-rose-100 dark:bg-rose-900/50" : churnRisk >= 40 ? "bg-amber-100 dark:bg-amber-900/50" : "bg-slate-100 dark:bg-slate-800/50"}`}>
                    <svg className={`w-4 h-4 ${churnRisk >= 70 ? "text-rose-600 dark:text-rose-400" : churnRisk >= 40 ? "text-amber-600 dark:text-amber-400" : "text-slate-600 dark:text-slate-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <div className={`text-[9px] font-semibold uppercase ${churnRisk >= 70 ? "text-rose-600 dark:text-rose-400" : churnRisk >= 40 ? "text-amber-600 dark:text-amber-400" : "text-slate-600 dark:text-slate-400"}`}>リスク</div>
                    <div className={`text-sm font-bold leading-none ${churnRisk >= 70 ? "text-rose-700 dark:text-rose-300" : churnRisk >= 40 ? "text-amber-700 dark:text-amber-300" : "text-slate-700 dark:text-slate-300"}`}>{riskLevel}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Success KPI Grid - 利用状況サマリー */}
            {!isMeetingView && !isEditMode && (
              <div className="mt-4 pt-4 border-t border-slate-200/50 dark:border-white/10">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                  <div className="rounded-lg bg-indigo-50/60 dark:bg-indigo-900/20 px-3 py-2 ring-1 ring-indigo-200/40 dark:ring-indigo-700/30">
                    <div className="text-[9px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase">掲載中求人</div>
                    <div className="text-lg font-bold text-indigo-900 dark:text-indigo-200 tabular-nums">{loadingUtil ? "..." : utilization.activeJobs}</div>
                    <div className="text-[9px] text-indigo-600/70 dark:text-indigo-400/70">/ {utilization.totalJobs}件</div>
                  </div>
                  <div className="rounded-lg bg-blue-50/60 dark:bg-blue-900/20 px-3 py-2 ring-1 ring-blue-200/40 dark:ring-blue-700/30">
                    <div className="text-[9px] font-semibold text-blue-600 dark:text-blue-400 uppercase">総応募者</div>
                    <div className="text-lg font-bold text-blue-900 dark:text-blue-200 tabular-nums">{loadingUtil ? "..." : utilization.totalApplicants}</div>
                    <div className="text-[9px] text-blue-600/70 dark:text-blue-400/70">累計</div>
                  </div>
                  <div className="rounded-lg bg-sky-50/60 dark:bg-sky-900/20 px-3 py-2 ring-1 ring-sky-200/40 dark:ring-sky-700/30">
                    <div className="text-[9px] font-semibold text-sky-600 dark:text-sky-400 uppercase">今月応募</div>
                    <div className="text-lg font-bold text-sky-900 dark:text-sky-200 tabular-nums">{loadingUtil ? "..." : utilization.thisMonthApplicants}</div>
                    <div className="text-[9px] text-sky-600/70 dark:text-sky-400/70">今月</div>
                  </div>
                  <div className="rounded-lg bg-emerald-50/60 dark:bg-emerald-900/20 px-3 py-2 ring-1 ring-emerald-200/40 dark:ring-emerald-700/30">
                    <div className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase">採用実績</div>
                    <div className="text-lg font-bold text-emerald-900 dark:text-emerald-200 tabular-nums">{loadingUtil ? "..." : utilization.hiredCount}</div>
                    <div className="text-[9px] text-emerald-600/70 dark:text-emerald-400/70">累計</div>
                  </div>
                  <div className="rounded-lg bg-green-50/60 dark:bg-green-900/20 px-3 py-2 ring-1 ring-green-200/40 dark:ring-green-700/30">
                    <div className="text-[9px] font-semibold text-green-600 dark:text-green-400 uppercase">今月採用</div>
                    <div className="text-lg font-bold text-green-900 dark:text-green-200 tabular-nums">{loadingUtil ? "..." : utilization.thisMonthHired}</div>
                    <div className="text-[9px] text-green-600/70 dark:text-green-400/70">今月</div>
                  </div>
                  <div className="rounded-lg bg-purple-50/60 dark:bg-purple-900/20 px-3 py-2 ring-1 ring-purple-200/40 dark:ring-purple-700/30">
                    <div className="text-[9px] font-semibold text-purple-600 dark:text-purple-400 uppercase">更新まで</div>
                    <div className="text-lg font-bold text-purple-900 dark:text-purple-200 tabular-nums">{daysUntilRenewal !== null && daysUntilRenewal > 0 ? `${daysUntilRenewal}日` : "—"}</div>
                    <div className="text-[9px] text-purple-600/70 dark:text-purple-400/70">{nextRenewalDate || "未設定"}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab Bar for Edit Mode */}
            {isEditMode && (
              <div className="mt-4 pt-4 border-t border-slate-200/50 dark:border-white/10">
                <TabBar tab={tab} onTab={setTab} />
              </div>
            )}

            {/* Save Status */}
            {(saveStatus !== "idle" || saveError) && (
              <div className="mt-3 flex items-center gap-2">
                {saveStatus === "dirty" && (
                  <button
                    type="button"
                    onClick={handleSave}
                    className="rounded-lg bg-amber-100 dark:bg-amber-900/30 px-3 py-1.5 text-[12px] font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-all"
                  >
                    保存する
                  </button>
                )}
                {saveStatus === "saving" && (
                  <span className="text-[12px] text-slate-500 dark:text-slate-400">保存中...</span>
                )}
                {saveStatus === "saved" && (
                  <span className="text-[12px] text-emerald-600 dark:text-emerald-400">✓ 保存しました</span>
                )}
                {saveStatus === "error" && (
                  <span className="text-[12px] text-rose-600 dark:text-rose-400">エラー: {saveError}</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className={UI.PANEL + " px-4 py-3 text-sm text-slate-700 dark:text-slate-400"}>読み込み中...</div>
      ) : err ? (
        <div className="rounded-md border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/30 p-4 text-sm text-rose-800 dark:text-rose-200">{err}</div>
      ) : !deal ? (
        <div className={UI.PANEL + " px-4 py-3 text-sm text-slate-700 dark:text-slate-400"}>打ち合わせが見つかりません。</div>
      ) : isMeetingView ? (
        <main className="space-y-3">
          {isShare && (
            <div className="fixed top-4 right-4 z-50">
              <Link
                href={`/companies/${companyId}/deal?view=meeting`}
                className="inline-flex items-center gap-2 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm px-4 py-2 text-[13px] font-bold text-slate-700 dark:text-slate-200 shadow-lg border-2 border-slate-300 dark:border-slate-600 transition-all hover:bg-white dark:hover:bg-slate-800 hover:shadow-xl"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                編集に戻る
              </Link>
            </div>
          )}

          {!isShare && (
            <DealStageGauge
              currentStage={stage || "準備"}
              onPickStage={(st) => setStage(st)}
              mode={mode}
              startDate={startDate}
              dueDate={dueDate}
              onChangeStart={(v) => setStartDate(v)}
              onChangeDue={(v) => setDueDate(v)}
              onQuickGood={() => setStage("完了")}
              onQuickBad={() => setStage("中止")}
            />
          )}

          {isShare && (
            <div className="rounded-xl border-2 border-slate-200/80 dark:border-slate-700 bg-gradient-to-br from-indigo-50 via-purple-50 to-white dark:from-slate-800 dark:via-slate-800 dark:to-slate-800 shadow-lg overflow-hidden">
              <div className="px-8 py-6">
                <div className="text-[14px] font-semibold text-indigo-600 dark:text-indigo-400 mb-2">ご提案資料</div>
                <h1 className="text-[28px] font-bold text-slate-900 dark:text-slate-100 mb-2">{companyName}</h1>
                <p className="text-[16px] text-slate-700 dark:text-slate-300 font-medium">{title || "採用支援サービスのご提案"}</p>
              </div>
            </div>
          )}

          {/* 受注促進コンテンツ */}
          {isShare && (
            <DealProposalSummary
              monthlyCost={monthlyCost}
              yearlySavings={yearlySavings}
              minimumContractMonths={minimumContractMonths}
              proposalMode={proposalMode}
            />
          )}

          {/* ROIシミュレーター */}
          <DealROISimulator
            initialMrr={mrr}
            amount={amount}
            isPresentationMode={isShare}
            proposalMode={proposalMode}
            onMonthlyFeeChange={(value) => setAmount(value)}
            hiringsPerYear={hiringsPerYear}
            competitorCostPerHire={competitorCostPerHire}
            onHiringsChange={(value) => setHiringsPerYear(value)}
            onCompetitorCostChange={(value) => setCompetitorCostPerHire(value)}
          />

          {/* 競合他社比較表 */}
          {proposalMode === "competitor" && <DealCompetitorComparison isPresentationMode={isShare} />}

          {/* 次回MTG日程調整 */}
          <DealNextMeetingScheduler
            isPresentationMode={isShare}
            onConfirm={async (option) => {
              try {
                const response = await fetch("/api/calendar/create-event", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    title: `${companyName} - 次回MTG`,
                    date: option.date,
                    time: option.time,
                    duration: 60,
                    description: option.note || "",
                    dealId: dealId || null,
                    companyId: companyId || null,
                  }),
                });

                const result = await response.json();

                if (result.ok) {
                  alert("カレンダーに追加しました！");
                } else {
                  if (response.status === 401) {
                    alert("認証が必要です。ログインしてください。");
                  } else {
                    alert(`エラー: ${result.error?.message || "不明なエラー"}`);
                  }
                }
              } catch (err: any) {
                console.error("Calendar event creation error:", err);
                alert(`エラー: ${err.message || "不明なエラー"}`);
              }
            }}
          />

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
            {!isShare ? (
              <div className="lg:col-span-5">
                <DealMeetingNotes
                  meetingGoal={meetingGoal}
                  meetingRisks={meetingRisks}
                  meetingNext={meetingNext}
                  memo={memo}
                  onChangeGoal={setMeetingGoal}
                  onChangeRisks={setMeetingRisks}
                  onChangeNext={setMeetingNext}
                  onChangeMemo={setMemo}
                />
              </div>
            ) : null}

            <section className={[isShare ? "lg:col-span-12" : "lg:col-span-7"].join(" ")}>
              <DealMeetingCard
                companyName={companyName}
                dealTitle={title}
                profile={profile}
                modeLabel={meetingModeLabel}
                isPresentationMode={isShare}
              />
            </section>
          </div>
        </main>
      ) : isEditMode ? (
        <main className="space-y-3">
          <DealStageGauge
            currentStage={stage || "準備"}
            onPickStage={(st) => setStage(st)}
            mode={mode}
            startDate={startDate}
            dueDate={dueDate}
            onChangeStart={(v) => setStartDate(v)}
            onChangeDue={(v) => setDueDate(v)}
            onQuickGood={() => setStage("完了")}
            onQuickBad={() => setStage("中止")}
          />

          {tab === "overview" ? (
            <div className="grid grid-cols-1 gap-3 2xl:grid-cols-2">
              {/* 左カラム: 商談固有 + 企業情報補完 */}
              <div className="space-y-3">
                <DealOverviewForm
                  mode={mode}
                  title={title}
                  memo={memo}
                  amount={amount}
                  probability={probability}
                  onChangeTitle={setTitle}
                  onChangeMemo={setMemo}
                  onChangeAmount={setAmount}
                  onChangeProbability={setProbability}
                />

                <DealProfileEditor
                  isOpen={isProfileOpen}
                  saveStatus={profileSaveStatus}
                  saveError={profileSaveError}
                  fields={profileFields}
                  onToggle={() => setIsProfileOpen((v) => !v)}
                  onSave={handleSaveProfile}
                  onChange={handleProfileFieldChange}
                />
              </div>

              {/* 右カラム: 企業台帳（連携表示） */}
              <div className="space-y-3">
                <DealProfileDisplay profile={profile} companyId={company?.id} />
              </div>
            </div>
          ) : (
            <section className={UI.PANEL}>
              <div className={UI.PANEL_HDR}>
                <div className="min-w-0">
                  <div className={UI.PANEL_TITLE}>履歴</div>
                  <div className={UI.PANEL_SUB}>
                    deal_activities は次段階で実装（note/call/mail/task）。現時点はプレースホルダ。
                  </div>
                </div>
              </div>
              <div className={UI.PANEL_BODY}>
                <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/50 px-3 py-2 text-[12px] text-slate-700 dark:text-slate-400">
                  ここに活動ログ（タイムライン）が表示されます。
                </div>
              </div>
            </section>
          )}
        </main>
      ) : (
        <main className="space-y-3">
          {company?.id ? (
            <DealCustomerSuccessDashboard
              dealId={dealId}
              companyId={company.id}
              companyName={companyName}
              title={title}
              stage={stage}
              memo={memo}
              record={record}
            />
          ) : (
            <div className={UI.PANEL + " px-4 py-3 text-sm text-slate-700 dark:text-slate-400"}>
              会社情報が見つかりません。
            </div>
          )}
        </main>
      )}

      {/* フローティングボタン（商談中モードのみ） */}
      {isMeetingView && !isShare && (
        <button
          type="button"
          onClick={() => setShowQuickInput(true)}
          className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 dark:from-indigo-600 dark:to-purple-600 text-white shadow-lg transition-all hover:scale-110 hover:shadow-xl active:scale-95"
          title="クイック入力"
        >
          <svg className="mx-auto h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        </button>
      )}

      {/* クイック入力モーダル */}
      <DealQuickInputModal
        isOpen={showQuickInput}
        amount={amount}
        probability={probability}
        minimumContractMonths={minimumContractMonths}
        proposalMode={proposalMode}
        primaryContactName={primaryContactName}
        primaryContactTitle={primaryContactTitle}
        contactEmail={contactEmail}
        contactPhone={contactPhone}
        decisionMakerName={decisionMakerName}
        communicationPreference={communicationPreference}
        contactHours={contactHours}
        onClose={() => setShowQuickInput(false)}
        onSave={handleQuickSave}
      />
    </div>
  );
}
