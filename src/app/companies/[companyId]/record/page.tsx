"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";
import NumberInput from "@/components/NumberInput";
import DatePicker from "@/components/DatePicker";

type SaveStatus = "idle" | "dirty" | "saved" | "saving" | "error";

type CompanyRow = {
  id: string;
  company_name: string;
  company_profile?: any;
  created_at: string;
  updated_at: string;
  application_email?: string | null;
};

type CompanyGetRes =
  | { ok: true; company: CompanyRow | null }
  | { ok: false; error: { message: string } };

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

type RecordGetRes =
  | { ok: true; record: RecordRow }
  | { ok: false; error: { message: string } };

type RecordPatchRes =
  | { ok: true; record: RecordRow }
  | { ok: false; error: { message: string } };



function formatLocalDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function s(v: any) {
  return String(v ?? "");
}

/** yyyy-mm-dd を厳密に扱う（空なら空） */
function normDate(v: any) {
  const x = String(v ?? "").trim();
  if (!x) return "";
  return x;
}

function parseTags(text: string) {
  return String(text ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}



const UI = {
  PANEL: ["rounded-md", "border-2", "border-slate-200/80", "dark:border-slate-700", "bg-white", "dark:bg-slate-800", "shadow-sm"].join(" "),
  PANEL_HDR: [
    "flex items-start justify-between gap-3",
    "border-b-2",
    "border-slate-200/80",
    "dark:border-slate-700",
    "px-4 py-3",
  ].join(" "),
  PANEL_TITLE: "text-[13px] font-semibold text-slate-900 dark:text-slate-100",
  PANEL_SUB: "mt-0.5 text-[12px] text-slate-700/90 dark:text-slate-400 font-medium",
  PANEL_BODY: "px-4 py-3",

  LINK: "text-[12px] font-semibold text-indigo-700/95 dark:text-indigo-400 whitespace-nowrap hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline",

  INPUT: [
    "w-full rounded-md border-2 border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2",
    "text-[13px] text-slate-900 dark:text-slate-100",
    "outline-none",
    "focus:border-indigo-300 dark:focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200/40 dark:focus:ring-indigo-500/40",
  ].join(" "),
  TEXTAREA: [
    "w-full rounded-md border-2 border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2",
    "text-[13px] text-slate-900 dark:text-slate-100",
    "outline-none",
    "focus:border-indigo-300 dark:focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200/40 dark:focus:ring-indigo-500/40",
    "min-h-[120px] resize-y",
  ].join(" "),
  LABEL: "text-[11px] font-semibold tracking-wide text-slate-600 dark:text-slate-400",

  BADGE:
    "inline-flex items-center rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300",

  PAGE_BG: "relative",
} as const;



function pillTone(status: string) {
  const x = String(status ?? "").trim().toLowerCase();
  if (x === "inactive" || x === "paused") return "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600";
  if (x === "risk" || x === "at_risk") return "bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800";
  if (x === "active") return "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
  return "bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800";
}

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold",
        pillTone(status),
      ].join(" ")}
    >
      {status || "active"}
    </span>
  );
}

function saveTone(s: SaveStatus) {
  if (s === "saving") return "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800";
  if (s === "saved") return "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
  if (s === "error") return "bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800";
  if (s === "dirty") return "bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-200 dark:border-amber-800";
  return "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";
}

function SavePill({ status }: { status: SaveStatus }) {
  const label =
    status === "saving"
      ? "保存中…"
      : status === "saved"
        ? "保存済み"
        : status === "error"
          ? "保存エラー"
          : status === "dirty"
            ? "未保存"
            : "—";
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold",
        saveTone(status),
      ].join(" ")}
      title={status === "dirty" ? "変更があります。保存してください。" : undefined}
    >
      {label}
    </span>
  );
}



const JSIC_MAJOR = [
  { value: "", label: "未設定" },
  { value: "A 農業・林業", label: "A 農業・林業" },
  { value: "B 漁業", label: "B 漁業" },
  { value: "C 鉱業・採石業・砂利採取業", label: "C 鉱業・採石業・砂利採取業" },
  { value: "D 建設業", label: "D 建設業" },
  { value: "E 製造業", label: "E 製造業" },
  { value: "F 電気・ガス・熱供給・水道業", label: "F 電気・ガス・熱供給・水道業" },
  { value: "G 情報通信業", label: "G 情報通信業" },
  { value: "H 運輸業・郵便業", label: "H 運輸業・郵便業" },
  { value: "I 卸売業・小売業", label: "I 卸売業・小売業" },
  { value: "J 金融業・保険業", label: "J 金融業・保険業" },
  { value: "K 不動産業・物品賃貸業", label: "K 不動産業・物品賃貸業" },
  { value: "L 学術研究・専門・技術サービス業", label: "L 学術研究・専門・技術サービス業" },
  { value: "M 宿泊業・飲食サービス業", label: "M 宿泊業・飲食サービス業" },
  { value: "N 生活関連サービス業・娯楽業", label: "N 生活関連サービス業・娯楽業" },
  { value: "O 教育・学習支援業", label: "O 教育・学習支援業" },
  { value: "P 医療・福祉", label: "P 医療・福祉" },
  { value: "Q 複合サービス事業", label: "Q 複合サービス事業" },
  { value: "R サービス業（他に分類されないもの）", label: "R サービス業（他に分類されないもの）" },
  { value: "S 公務（他に分類されるものを除く）", label: "S 公務（他に分類されるものを除く）" },
];

const ACQ_SOURCE_TYPES = [
  { value: "", label: "未設定" },
  { value: "紹介", label: "紹介" },
  { value: "訪問", label: "訪問" },
  { value: "テレアポ", label: "テレアポ" },
  { value: "自社HP", label: "自社HP" },
  { value: "広告", label: "広告" },
  { value: "SNS", label: "SNS" },
  { value: "展示会", label: "展示会" },
  { value: "DM", label: "DM" },
  { value: "代理店", label: "代理店" },
  { value: "自由入力", label: "自由入力" },
];

const BILLING_CYCLES = [
  { value: "", label: "未設定" },
  { value: "月次", label: "月次" },
  { value: "年次", label: "年次" },
  { value: "一括", label: "一括" },
];

const PAYMENT_METHODS = [
  { value: "", label: "未設定" },
  { value: "請求書", label: "請求書" },
  { value: "振込", label: "振込" },
  { value: "カード", label: "カード" },
  { value: "口座振替", label: "口座振替" },
];

const RENEWAL_CONFIDENCE = [
  { value: "", label: "未設定" },
  { value: "高", label: "高" },
  { value: "中", label: "中" },
  { value: "低", label: "低" },
];

const HEALTH = [
  { value: "", label: "未設定" },
  { value: "良", label: "良" },
  { value: "普通", label: "普通" },
  { value: "悪", label: "悪" },
];

const HIRING_DIFFICULTY = [
  { value: "", label: "未設定" },
  { value: "低", label: "低" },
  { value: "中", label: "中" },
  { value: "高", label: "高" },
];

const COMM_PREF = [
  { value: "", label: "未設定" },
  { value: "電話", label: "電話" },
  { value: "メール", label: "メール" },
  { value: "LINE", label: "LINE" },
  { value: "チャット", label: "チャット" },
];

/** 営業ステージ（会社一覧のチップと合わせる） */
const DEAL_STAGES = [
  { value: "", label: "未設定" },
  { value: "契約前", label: "契約前" },
  { value: "提案中", label: "提案中" },
  { value: "稟議中", label: "稟議中" },
  { value: "契約中", label: "契約中" },
  { value: "休眠", label: "休眠" },
  { value: "解約", label: "解約" },
  { value: "NG", label: "NG" },
  { value: "その他", label: "その他" },
];



const TOPBAR_H = 44; // App側のSSOTに合わせる（MobileTopBar）
const HERO_H = 0; // 使わない（互換用）
const TOC_H = 44; // 目次タブの高さ目安

type TocKey = "base" | "contract" | "contact" | "ats" | "overview" | "internal";

const TOC: Array<{ key: TocKey; label: string; anchor: string }> = [
  { key: "base", label: "基本・分類", anchor: "sec-base" },
  { key: "contract", label: "契約・更新", anchor: "sec-contract" },
  { key: "contact", label: "決裁・連絡先", anchor: "sec-contact" },
  { key: "ats", label: "採用前提（ATS）", anchor: "sec-ats" },
  { key: "overview", label: "会社概要", anchor: "sec-overview" },
  { key: "internal", label: "内部メモ", anchor: "sec-internal" },
];

function scrollToAnchor(id: string) {
  const el = typeof document !== "undefined" ? document.getElementById(id) : null;
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function useActiveSection(anchors: string[]) {
  const [active, setActive] = useState<string>(anchors[0] ?? "");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const els = anchors
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];
    if (els.length === 0) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting);
        if (vis.length === 0) return;

        vis.sort((a, b) => {
          const ar = (a.target as HTMLElement).getBoundingClientRect().top;
          const br = (b.target as HTMLElement).getBoundingClientRect().top;
          return Math.abs(ar) - Math.abs(br);
        });

        const id = (vis[0].target as HTMLElement).id;
        setActive(id);
      },
      {
        root: null,
        rootMargin: `-${TOPBAR_H + TOC_H + 18}px 0px -65% 0px`,
        threshold: [0.08, 0.18, 0.3],
      }
    );

    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [anchors]);

  return active;
}

export default function CompanyRecordPage() {
  const params = useParams();

  const companyId = useMemo(() => {
    const raw = (params as any)?.companyId;
    if (raw === undefined || raw === null) return "";
    return String(raw);
  }, [params]);

  const [company, setCompany] = useState<CompanyRow | null>(null);
  const [record, setRecord] = useState<RecordRow | null>(null);

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // record直下（固定列）
  const [status, setStatus] = useState("active");
  const [ownerUserId, setOwnerUserId] = useState<string>("");
  const [tagsText, setTagsText] = useState<string>("");
  const [memo, setMemo] = useState<string>("");

  // record.profile（kintone的に増える領域）
  const [profile, setProfile] = useState<any>({});

  const savedTimerRef = useRef<number | null>(null);
  const baselineRef = useRef<string>(""); // 保存済みスナップショット
  const suppressDirtyRef = useRef(false);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) window.clearTimeout(savedTimerRef.current);
    };
  }, []);

  function showSavedOnce() {
    setSaveStatus("saved");
    if (savedTimerRef.current) window.clearTimeout(savedTimerRef.current);
    savedTimerRef.current = window.setTimeout(() => {
      setSaveStatus("idle");
      savedTimerRef.current = null;
    }, 1600);
  }

  function buildPayload() {
    // ✅ owner_user_idのバリデーション: UUID形式でない場合はnull
    const trimmedOwnerId = ownerUserId ? ownerUserId.trim() : "";
    const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmedOwnerId);

    return {
      status: String(status ?? "active").trim() || "active",
      owner_user_id: isValidUuid ? trimmedOwnerId : null,
      tags: parseTags(tagsText),
      memo: memo ? String(memo) : null,
      profile: profile ?? {},
    };
  }

  function payloadKey(payload: any) {
    try {
      return JSON.stringify(payload);
    } catch {
      return String(payload);
    }
  }

  function refreshBaselineFromCurrent() {
    const key = payloadKey(buildPayload());
    baselineRef.current = key;
  }

  function markDirtyIfNeeded() {
    if (suppressDirtyRef.current) return;
    const nowKey = payloadKey(buildPayload());
    const base = baselineRef.current;
    if (!base) return;
    if (nowKey !== base) {
      setSaveStatus((prev) => (prev === "saving" ? "saving" : "dirty"));
    } else {
      setSaveStatus((prev) => (prev === "saving" ? "saving" : "idle"));
    }
  }

  async function loadAll(cid: string) {
    setLoading(true);
    setErrorMessage("");
    setNotFound(false);

    try {
      const cRes = await fetch(`/api/companies/${encodeURIComponent(cid)}`, { cache: "no-store" });
      const cJson = (await cRes.json()) as CompanyGetRes;

      if (!cRes.ok || !cJson.ok) {
        throw new Error(!cJson.ok ? cJson.error.message : `company load failed (${cRes.status})`);
      }
      if (cJson.company == null) {
        setNotFound(true);
        setCompany(null);
        setRecord(null);
        return;
      }
      setCompany(cJson.company);

      const rRes = await fetch(`/api/companies/${encodeURIComponent(cid)}/record`, { cache: "no-store" });
      const rJson = (await rRes.json()) as RecordGetRes;

      if (!rRes.ok || !rJson.ok) {
        throw new Error(!rJson.ok ? rJson.error.message : `record load failed (${rRes.status})`);
      }

      setRecord(rJson.record);

      suppressDirtyRef.current = true;
      setStatus(String(rJson.record.status ?? "active"));
      setOwnerUserId(rJson.record.owner_user_id ? String(rJson.record.owner_user_id) : "");
      setTagsText(Array.isArray(rJson.record.tags) ? rJson.record.tags.join(", ") : "");
      setMemo(rJson.record.memo ? String(rJson.record.memo) : "");
      setProfile(rJson.record.profile ?? {});
      setSaveStatus("idle");

      window.setTimeout(() => {
        refreshBaselineFromCurrent();
        suppressDirtyRef.current = false;
      }, 0);
    } catch (e: any) {
      setErrorMessage(String(e?.message ?? e ?? "load failed"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!companyId) return;
    void loadAll(companyId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;
    markDirtyIfNeeded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, ownerUserId, tagsText, memo, profile]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMac = typeof navigator !== "undefined" && /Mac/i.test(navigator.platform);
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (!mod) return;
      if (e.key.toLowerCase() !== "s") return;
      e.preventDefault();
      void handleSave();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, status, ownerUserId, tagsText, memo, profile]);

  async function handleSave() {
    if (!companyId) return;

    setSaveStatus("saving");
    setErrorMessage("");

    try {
      const payload = buildPayload();

      const res = await fetch(`/api/companies/${encodeURIComponent(companyId)}/record`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(payload),
      });

      const json = (await res.json()) as RecordPatchRes;

      if (!res.ok || !json.ok) {
        const msg = !json.ok ? json.error.message : `save failed (status: ${res.status})`;
        throw new Error(msg);
      }

      setRecord(json.record);

      suppressDirtyRef.current = true;
      refreshBaselineFromCurrent();
      suppressDirtyRef.current = false;

      showSavedOnce();
    } catch (e: any) {
      setSaveStatus("error");
      setErrorMessage(String(e?.message ?? e ?? "save failed"));
    }
  }

  function setP(key: string, value: any) {
    setProfile((prev: any) => {
      const base = prev && typeof prev === "object" ? prev : {};
      return { ...base, [key]: value };
    });
  }

  const p = useMemo(() => {
    const x = profile ?? {};
    return {
      phone: s(x.phone),
      capital: s(x.capital),
      website: s(x.website),
      jobEmail: s(x.jobEmail),
      hqAddress: s(x.hqAddress),
      invoiceAddress: s(x.invoiceAddress),
      corporateNumber: s(x.corporateNumber),
      establishedDate: s(x.establishedDate),
      businessDescription: s(x.businessDescription),
      representativeName: s(x.representativeName),
      representativeNameKana: s(x.representativeNameKana),
      contactPersonName: s(x.contactPersonName),
      contactPersonNameKana: s(x.contactPersonNameKana),
      applicationReceptionNumber: s(x.applicationReceptionNumber),
      defaultWorkLocationPostalCode: s(x.defaultWorkLocationPostalCode),
      employeesTotal: s(x.employeesTotal),
      employeesFemale: s(x.employeesFemale),
      employeesPartTime: s(x.employeesPartTime),

      acquisition_source_type: s(x.acquisition_source_type),
      acquisition_source_detail: s(x.acquisition_source_detail),
      industry_major: s(x.industry_major),
      industry_middle: s(x.industry_middle),
      industry_small: s(x.industry_small),

      contract_start_date: normDate(x.contract_start_date),
      contract_pause_date: normDate(x.contract_pause_date),
      contract_pause_count: s(x.contract_pause_count),
      contract_end_date: normDate(x.contract_end_date),
      contract_end_count: s(x.contract_end_count),

      contract_plan: s(x.contract_plan),
      cancellation_reason: s(x.cancellation_reason),
      dormancy_reason: s(x.dormancy_reason),
      campaign_applied: s(x.campaign_applied),
      first_meeting_date: normDate(x.first_meeting_date),

      deal_stage: s(x.deal_stage),
      mrr: s(x.mrr),
      billing_cycle: s(x.billing_cycle),
      payment_method: s(x.payment_method),

      next_renewal_date: normDate(x.next_renewal_date),
      renewal_confidence: s(x.renewal_confidence),
      health: s(x.health),

      decision_maker_title: s(x.decision_maker_title),
      decision_maker_name: s(x.decision_maker_name),
      primary_contact_title: s(x.primary_contact_title),
      primary_contact_name: s(x.primary_contact_name),

      contact_email: s(x.contact_email),
      contact_phone: s(x.contact_phone),
      communication_preference: s(x.communication_preference),
      contact_hours: s(x.contact_hours),
      ng_notes: s(x.ng_notes),

      hiring_goal: s(x.hiring_goal),
      hiring_difficulty: s(x.hiring_difficulty),
      main_job_category: s(x.main_job_category),
      location_prefecture: s(x.location_prefecture),
      location_city: s(x.location_city),

      company_code: s(x.company_code),
      external_crm_id: s(x.external_crm_id),
      accounting_id: s(x.accounting_id),

      notes_internal: s(x.notes_internal),
    };
  }, [profile]);

  const activeAnchor = useActiveSection(TOC.map((x) => x.anchor));

  const stickyOffset = TOPBAR_H;
  const tocTop = stickyOffset;
  const heroTop = stickyOffset;

  const scrollMt = TOPBAR_H + TOC_H + 16;

  if (!companyId) {
    return (
      <main className="space-y-3">
        <div className={UI.PANEL + " px-4 py-3 text-sm text-slate-700 dark:text-slate-400"}>読み込み中...</div>
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="space-y-3">
        <div className={UI.PANEL + " px-6 py-6"}>
          <h1 className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">会社が見つかりません</h1>
          <p className="mt-2 text-[12px] text-slate-600 dark:text-slate-400">会社一覧から選び直してください。</p>
          <div className="mt-4">
            <Link href="/companies" className="cv-btn-secondary">
              ← 会社一覧に戻る
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className={[UI.PAGE_BG, "space-y-3"].join(" ")}>
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />
        <div className="absolute -left-44 -top-52 h-[560px] w-[560px] rounded-full bg-blue-200/12 dark:bg-blue-500/8 blur-3xl" />
        <div className="absolute -right-48 -top-44 h-[620px] w-[620px] rounded-full bg-purple-200/10 dark:bg-purple-500/6 blur-3xl" />
        <div className="absolute left-1/2 top-24 h-56 w-[720px] -translate-x-1/2 rounded-full bg-indigo-200/08 dark:bg-indigo-500/6 blur-3xl" />
      </div>

      <div className="sticky z-40" style={{ top: `${heroTop}px` }}>
        <div className={[UI.PANEL, "relative overflow-hidden", "bg-white/82 dark:bg-slate-800/82 backdrop-blur"].join(" ")}>
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/45 via-white to-purple-50/45 dark:from-blue-950/45 dark:via-slate-800 dark:to-purple-950/45" />
            <div className="hero-parallax absolute -inset-24">
              <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-blue-200/14 dark:bg-blue-500/10 blur-3xl" />
              <div className="absolute -right-44 -bottom-44 h-[560px] w-[560px] rounded-full bg-purple-200/12 dark:bg-purple-500/8 blur-3xl" />
              <div className="absolute left-1/2 top-[-180px] h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-indigo-200/10 dark:bg-indigo-500/8 blur-3xl" />
              <div
                className="absolute inset-24 opacity-[0.07] dark:opacity-[0.04]"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, rgba(15,23,42,0.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.22) 1px, transparent 1px)",
                  backgroundSize: "44px 44px",
                  maskImage:
                    "radial-gradient(ellipse at 45% 20%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0) 78%)",
                  WebkitMaskImage:
                    "radial-gradient(ellipse at 45% 20%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0) 78%)",
                }}
              />
            </div>
          </div>

          <div className={[UI.PANEL_HDR, "relative"].join(" ")}>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[12px] text-slate-600 dark:text-slate-400">
                <Link href="/companies" className={UI.LINK}>
                  会社一覧
                </Link>
                <span className="text-slate-300 dark:text-slate-600">/</span>
                <Link href={`/companies/${encodeURIComponent(companyId)}`} className={UI.LINK}>
                  {company?.company_name || "会社"}
                </Link>
                <span className="text-slate-300 dark:text-slate-600">/</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">台帳</span>
                <StatusPill status={status || "active"} />
                <SavePill status={saveStatus} />
                {record?.updated_at ? (
                  <span className={UI.BADGE}>
                    更新: <span className="ml-1 tabular-nums">{formatLocalDateTime(String(record.updated_at))}</span>
                  </span>
                ) : null}
              </div>

              <div className="mt-1 text-[12px] text-slate-700/90 dark:text-slate-400 font-medium">
                顧客台帳（SSOT: <span className="font-semibold text-slate-800 dark:text-slate-300">company_records</span>）
                <span className="ml-2 text-slate-400 dark:text-slate-600">•</span>
                <span className="ml-2 text-slate-600 dark:text-slate-400">Cmd/Ctrl + S で保存</span>
              </div>

              {saveStatus === "error" ? (
                <div className="mt-2 text-[12px] text-rose-700 dark:text-rose-400">保存エラー: {errorMessage}</div>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Link
                href={`/companies/${encodeURIComponent(companyId)}/jobs/new`}
                className="cv-btn-secondary !px-3 !py-1.5 text-[12px] whitespace-nowrap"
                title="求人を追加"
              >
                + 求人
              </Link>

              <button
                type="button"
                className="cv-btn-primary whitespace-nowrap"
                onClick={handleSave}
                disabled={saveStatus === "saving"}
              >
                保存
              </button>
            </div>
          </div>
        </div>

        <div className="mt-2 sticky z-40" style={{ top: `${tocTop + 52}px` }}>
          <div className={[UI.PANEL, "bg-white/78 dark:bg-slate-800/78 backdrop-blur"].join(" ")}>
            <div className="px-2 py-2">
              <div className="flex items-center gap-2 overflow-x-auto">
                {TOC.map((t) => {
                  const active = activeAnchor === t.anchor;
                  const cls = active
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600 shadow-sm"
                    : "bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100";

                  return (
                    <button
                      key={t.key}
                      type="button"
                      className={[
                        "shrink-0",
                        "inline-flex items-center justify-center",
                        "rounded-md border-2",
                        "px-3 py-1.5",
                        "text-[12px] font-semibold whitespace-nowrap",
                        cls,
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40 dark:focus-visible:ring-indigo-500/40",
                      ].join(" ")}
                      onClick={() => scrollToAnchor(t.anchor)}
                    >
                      {t.label}
                    </button>
                  );
                })}

                <div className="ml-auto flex items-center gap-2 pr-1">
                  <Link
                    href={`/companies/${encodeURIComponent(companyId)}`}
                    className="cv-btn-secondary !px-3 !py-1.5 text-[12px] whitespace-nowrap"
                    title="会社サマリー"
                  >
                    会社へ
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className={UI.PANEL + " px-4 py-3 text-sm text-slate-700 dark:text-slate-400"}>読み込み中...</div>
      ) : errorMessage && !company ? (
        <div className="rounded-md border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 p-4 text-sm text-rose-800 dark:text-rose-300">{errorMessage}</div>
      ) : (
        <main className="space-y-3">
          <section id="sec-base" className={UI.PANEL} style={{ scrollMarginTop: `${scrollMt}px` }}>
            <div className={UI.PANEL_HDR}>
              <div className="min-w-0">
                <div className={UI.PANEL_TITLE}>基本・分類・獲得</div>
                <div className={UI.PANEL_SUB}>分類/獲得元/営業ステージ。優先度判断の核。</div>
              </div>
            </div>

            <div className={UI.PANEL_BODY}>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div>
                  <div className={UI.LABEL}>ステータス（稼働）</div>
                  <select className={UI.INPUT} value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="active">active（稼働）</option>
                    <option value="paused">paused（停止）</option>
                    <option value="risk">risk（要注意）</option>
                    <option value="inactive">inactive（非稼働）</option>
                  </select>
                </div>

                <div>
                  <div className={UI.LABEL}>営業ステージ（取引ステータス）</div>
                  <select
                    className={UI.INPUT}
                    value={p.deal_stage}
                    onChange={(e) => setP("deal_stage", e.target.value)}
                  >
                    {DEAL_STAGES.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className={UI.LABEL}>担当者名</div>
                  <input
                    className={UI.INPUT}
                    value={s(profile?.owner_name)}
                    onChange={(e) => setProfile((p: any) => ({ ...p, owner_name: e.target.value }))}
                    placeholder="例）田中 太郎"
                  />
                  <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    担当者の名前を入力してください
                  </div>
                </div>

                <div>
                  <div className={UI.LABEL}>優先タグ（カンマ区切り）</div>
                  <input
                    className={UI.INPUT}
                    value={tagsText}
                    onChange={(e) => setTagsText(e.target.value)}
                    placeholder="例）重点, 紹介, 要RPO"
                  />
                </div>

                <div>
                  <div className={UI.LABEL}>獲得元種別</div>
                  <select
                    className={UI.INPUT}
                    value={p.acquisition_source_type}
                    onChange={(e) => setP("acquisition_source_type", e.target.value)}
                  >
                    {ACQ_SOURCE_TYPES.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className={UI.LABEL}>獲得元詳細（紹介元/媒体名など）</div>
                  <input
                    className={UI.INPUT}
                    value={p.acquisition_source_detail}
                    onChange={(e) => setP("acquisition_source_detail", e.target.value)}
                    placeholder="例）〇〇社の山田さん紹介 / Meta広告 / 〇〇展示会"
                  />
                </div>

                <div>
                  <div className={UI.LABEL}>業種（大分類）</div>
                  <select className={UI.INPUT} value={p.industry_major} onChange={(e) => setP("industry_major", e.target.value)}>
                    {JSIC_MAJOR.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className={UI.LABEL}>業種（中分類）</div>
                  <input
                    className={UI.INPUT}
                    value={p.industry_middle}
                    onChange={(e) => setP("industry_middle", e.target.value)}
                    placeholder="例）幼稚園 / システム開発 / 運送"
                  />
                </div>

                <div className="lg:col-span-2">
                  <div className={UI.LABEL}>業種（小分類）</div>
                  <input
                    className={UI.INPUT}
                    value={p.industry_small}
                    onChange={(e) => setP("industry_small", e.target.value)}
                    placeholder="例）私立幼稚園 / 受託開発 / ルート配送"
                  />
                </div>

                <div>
                  <div className={UI.LABEL}>初回商談日</div>
                  <DatePicker
                    className={UI.INPUT}
                    value={p.first_meeting_date}
                    onChange={(v) => setP("first_meeting_date", v)}
                  />
                </div>

                <div>
                  <div className={UI.LABEL}>適用キャンペーン</div>
                  <input
                    className={UI.INPUT}
                    value={p.campaign_applied}
                    onChange={(e) => setP("campaign_applied", e.target.value)}
                    placeholder="例）初月無料 / 期間限定割引"
                  />
                </div>
              </div>

              <div className="mt-5">
                <div className={UI.LABEL}>メモ（運用・注意事項）</div>
                <textarea
                  className={UI.TEXTAREA}
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="例）応募対応は火・木にまとめる／スピード重視…"
                />
              </div>
            </div>
          </section>

          <section id="sec-contract" className={UI.PANEL} style={{ scrollMarginTop: `${scrollMt}px` }}>
            <div className={UI.PANEL_HDR}>
              <div className="min-w-0">
                <div className={UI.PANEL_TITLE}>契約・金額・更新</div>
                <div className={UI.PANEL_SUB}>更新・解約の予兆まで含めて台帳で管理。</div>
              </div>
            </div>

            <div className={UI.PANEL_BODY}>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <div className="lg:col-span-2">
                  <div className={UI.LABEL}>契約開始日</div>
                  <DatePicker
                    className={UI.INPUT}
                    value={p.contract_start_date}
                    onChange={(v) => setP("contract_start_date", v)}
                  />
                </div>

                <div>
                  <div className={UI.LABEL}>契約中断日</div>
                  <DatePicker
                    className={UI.INPUT}
                    value={p.contract_pause_date}
                    onChange={(v) => setP("contract_pause_date", v)}
                  />
                </div>
                <div>
                  <div className={UI.LABEL}>中断回数</div>
                  <NumberInput
                    className={UI.INPUT}
                    value={p.contract_pause_count}
                    onChange={(v) => setP("contract_pause_count", v)}
                    placeholder="例）1"
                    min="0"
                  />
                </div>

                <div>
                  <div className={UI.LABEL}>契約終了日</div>
                  <DatePicker
                    className={UI.INPUT}
                    value={p.contract_end_date}
                    onChange={(v) => setP("contract_end_date", v)}
                  />
                </div>
                <div>
                  <div className={UI.LABEL}>終了回数</div>
                  <NumberInput
                    className={UI.INPUT}
                    value={p.contract_end_count}
                    onChange={(v) => setP("contract_end_count", v)}
                    placeholder="例）1"
                    min="0"
                  />
                </div>

                <div className="lg:col-span-2">
                  <div className={UI.LABEL}>契約プラン</div>
                  <input
                    className={UI.INPUT}
                    value={p.contract_plan}
                    onChange={(e) => setP("contract_plan", e.target.value)}
                    placeholder="例）Standard / Pro / CFA支援"
                  />
                </div>

                <div>
                  <div className={UI.LABEL}>月額（MRR）</div>
                  <NumberInput
                    className={UI.INPUT}
                    value={p.mrr}
                    onChange={(v) => setP("mrr", v)}
                    placeholder="例）150000"
                    min="0"
                  />
                </div>

                <div>
                  <div className={UI.LABEL}>請求サイクル</div>
                  <select className={UI.INPUT} value={p.billing_cycle} onChange={(e) => setP("billing_cycle", e.target.value)}>
                    {BILLING_CYCLES.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className={UI.LABEL}>支払方法</div>
                  <select className={UI.INPUT} value={p.payment_method} onChange={(e) => setP("payment_method", e.target.value)}>
                    {PAYMENT_METHODS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className={UI.LABEL}>次回更新日</div>
                  <DatePicker
                    className={UI.INPUT}
                    value={p.next_renewal_date}
                    onChange={(v) => setP("next_renewal_date", v)}
                  />
                </div>

                <div>
                  <div className={UI.LABEL}>更新確度</div>
                  <select className={UI.INPUT} value={p.renewal_confidence} onChange={(e) => setP("renewal_confidence", e.target.value)}>
                    {RENEWAL_CONFIDENCE.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="lg:col-span-2">
                  <div className={UI.LABEL}>ヘルス（簡易）</div>
                  <select className={UI.INPUT} value={p.health} onChange={(e) => setP("health", e.target.value)}>
                    {HEALTH.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="lg:col-span-2">
                  <div className={UI.LABEL}>解約理由</div>
                  <textarea
                    className={UI.TEXTAREA}
                    value={p.cancellation_reason}
                    onChange={(e) => setP("cancellation_reason", e.target.value)}
                    placeholder="例）採用凍結 / 予算削減 / 期待値ミスマッチ…"
                  />
                </div>

                <div className="lg:col-span-2">
                  <div className={UI.LABEL}>休眠理由</div>
                  <textarea
                    className={UI.TEXTAREA}
                    value={p.dormancy_reason}
                    onChange={(e) => setP("dormancy_reason", e.target.value)}
                    placeholder="例）繁忙期で止めたい / 担当不在…"
                  />
                </div>
              </div>
            </div>
          </section>

          <section id="sec-contact" className={UI.PANEL} style={{ scrollMarginTop: `${scrollMt}px` }}>
            <div className={UI.PANEL_HDR}>
              <div className="min-w-0">
                <div className={UI.PANEL_TITLE}>決裁・連絡先</div>
                <div className={UI.PANEL_SUB}>商談ページを作っても結局ここに戻ってくる情報。</div>
              </div>
            </div>

            <div className={UI.PANEL_BODY}>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <div>
                  <div className={UI.LABEL}>決裁者 役職</div>
                  <input className={UI.INPUT} value={p.decision_maker_title} onChange={(e) => setP("decision_maker_title", e.target.value)} placeholder="例）理事長 / 代表 / 部長" />
                </div>
                <div>
                  <div className={UI.LABEL}>決裁者 氏名</div>
                  <input className={UI.INPUT} value={p.decision_maker_name} onChange={(e) => setP("decision_maker_name", e.target.value)} placeholder="例）山田 太郎" />
                </div>

                <div>
                  <div className={UI.LABEL}>運用窓口 役職</div>
                  <input className={UI.INPUT} value={p.primary_contact_title} onChange={(e) => setP("primary_contact_title", e.target.value)} placeholder="例）採用担当 / 事務長" />
                </div>
                <div>
                  <div className={UI.LABEL}>運用窓口 氏名</div>
                  <input className={UI.INPUT} value={p.primary_contact_name} onChange={(e) => setP("primary_contact_name", e.target.value)} placeholder="例）坂越 重彦" />
                </div>

                <div className="lg:col-span-2">
                  <div className={UI.LABEL}>連絡メール</div>
                  <input className={UI.INPUT} value={p.contact_email} onChange={(e) => setP("contact_email", e.target.value)} placeholder="example@company.com" />
                </div>

                <div>
                  <div className={UI.LABEL}>連絡電話</div>
                  <input className={UI.INPUT} value={p.contact_phone} onChange={(e) => setP("contact_phone", e.target.value)} placeholder="03-xxxx-xxxx" />
                </div>

                <div>
                  <div className={UI.LABEL}>連絡手段の優先</div>
                  <select className={UI.INPUT} value={p.communication_preference} onChange={(e) => setP("communication_preference", e.target.value)}>
                    {COMM_PREF.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className={UI.LABEL}>連絡可能時間帯</div>
                  <input className={UI.INPUT} value={p.contact_hours} onChange={(e) => setP("contact_hours", e.target.value)} placeholder="例）平日 10:00-17:00 / 午前のみ" />
                </div>

                <div className="lg:col-span-2">
                  <div className={UI.LABEL}>NG事項</div>
                  <textarea className={UI.TEXTAREA} value={p.ng_notes} onChange={(e) => setP("ng_notes", e.target.value)} placeholder="例）電話NG、土日NG、担当者名の呼称注意…" />
                </div>
              </div>
            </div>
          </section>

          <section id="sec-ats" className={UI.PANEL} style={{ scrollMarginTop: `${scrollMt}px` }}>
            <div className={UI.PANEL_HDR}>
              <div className="min-w-0">
                <div className={UI.PANEL_TITLE}>採用前提（ATS）</div>
                <div className={UI.PANEL_SUB}>求人作成の前提になる“戦略変数”。</div>
              </div>
            </div>

            <div className={UI.PANEL_BODY}>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <div className="lg:col-span-2">
                  <div className={UI.LABEL}>採用人数（目標）</div>
                  <input className={UI.INPUT} value={p.hiring_goal} onChange={(e) => setP("hiring_goal", e.target.value)} placeholder="例）5名 / 10名" />
                </div>

                <div>
                  <div className={UI.LABEL}>採用難易度</div>
                  <select className={UI.INPUT} value={p.hiring_difficulty} onChange={(e) => setP("hiring_difficulty", e.target.value)}>
                    {HIRING_DIFFICULTY.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className={UI.LABEL}>主な採用職種（主カテゴリ）</div>
                  <input className={UI.INPUT} value={p.main_job_category} onChange={(e) => setP("main_job_category", e.target.value)} placeholder="例）保育士 / 営業 / 施工管理 / コールセンター" />
                </div>

                <div>
                  <div className={UI.LABEL}>勤務地（都道府県）</div>
                  <input className={UI.INPUT} value={p.location_prefecture} onChange={(e) => setP("location_prefecture", e.target.value)} placeholder="例）大阪府" />
                </div>

                <div>
                  <div className={UI.LABEL}>勤務地（市区）</div>
                  <input className={UI.INPUT} value={p.location_city} onChange={(e) => setP("location_city", e.target.value)} placeholder="例）大阪市住之江区" />
                </div>
              </div>
            </div>
          </section>

          <section id="sec-overview" className={UI.PANEL} style={{ scrollMarginTop: `${scrollMt}px` }}>
            <div className={UI.PANEL_HDR}>
              <div className="min-w-0">
                <div className={UI.PANEL_TITLE}>会社概要（復活）</div>
                <div className={UI.PANEL_SUB}>companies.company_profile にあった情報を台帳に寄せて保持。</div>
              </div>
            </div>

            <div className={UI.PANEL_BODY}>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <div className="lg:col-span-2">
                  <div className={UI.LABEL}>Webサイト</div>
                  <input className={UI.INPUT} value={p.website} onChange={(e) => setP("website", e.target.value)} placeholder="https://" />
                </div>

                <div>
                  <div className={UI.LABEL}>電話</div>
                  <input className={UI.INPUT} value={p.phone} onChange={(e) => setP("phone", e.target.value)} placeholder="例）06-xxxx-xxxx" />
                </div>

                <div>
                  <div className={UI.LABEL}>応募受付番号</div>
                  <input className={UI.INPUT} value={p.applicationReceptionNumber} onChange={(e) => setP("applicationReceptionNumber", e.target.value)} placeholder="例）06-xxxx-xxxx" />
                </div>

                <div className="lg:col-span-2">
                  <div className={UI.LABEL}>本社住所</div>
                  <input className={UI.INPUT} value={p.hqAddress} onChange={(e) => setP("hqAddress", e.target.value)} placeholder="例）東京都…" />
                </div>

                <div className="lg:col-span-2">
                  <div className={UI.LABEL}>請求先（メール/住所など）</div>
                  <input className={UI.INPUT} value={p.invoiceAddress} onChange={(e) => setP("invoiceAddress", e.target.value)} placeholder="例）invoice@company.com / 住所" />
                </div>

                <div>
                  <div className={UI.LABEL}>法人番号</div>
                  <input className={UI.INPUT} value={p.corporateNumber} onChange={(e) => setP("corporateNumber", e.target.value)} placeholder="例）1234567890123" />
                </div>

                <div>
                  <div className={UI.LABEL}>設立日</div>
                  <DatePicker
                    className={UI.INPUT}
                    value={p.establishedDate}
                    onChange={(v) => setP("establishedDate", v)}
                  />
                </div>

                <div>
                  <div className={UI.LABEL}>資本金</div>
                  <NumberInput
                    className={UI.INPUT}
                    value={p.capital}
                    onChange={(v) => setP("capital", v)}
                    placeholder="例）10000000"
                    min="0"
                  />
                </div>

                <div>
                  <div className={UI.LABEL}>従業員数（合計）</div>
                  <NumberInput
                    className={UI.INPUT}
                    value={p.employeesTotal}
                    onChange={(v) => setP("employeesTotal", v)}
                    placeholder="例）15"
                    min="0"
                  />
                </div>

                <div>
                  <div className={UI.LABEL}>従業員数（女性）</div>
                  <NumberInput
                    className={UI.INPUT}
                    value={p.employeesFemale}
                    onChange={(v) => setP("employeesFemale", v)}
                    placeholder="例）14"
                    min="0"
                  />
                </div>

                <div>
                  <div className={UI.LABEL}>従業員数（パート）</div>
                  <NumberInput
                    className={UI.INPUT}
                    value={p.employeesPartTime}
                    onChange={(v) => setP("employeesPartTime", v)}
                    placeholder="例）6"
                    min="0"
                  />
                </div>

                <div>
                  <div className={UI.LABEL}>代表者名</div>
                  <input className={UI.INPUT} value={p.representativeName} onChange={(e) => setP("representativeName", e.target.value)} placeholder="例）坂越 孝治" />
                </div>

                <div>
                  <div className={UI.LABEL}>代表者名（かな）</div>
                  <input className={UI.INPUT} value={p.representativeNameKana} onChange={(e) => setP("representativeNameKana", e.target.value)} placeholder="例）さかこし たかはる" />
                </div>

                <div>
                  <div className={UI.LABEL}>担当者名</div>
                  <input className={UI.INPUT} value={p.contactPersonName} onChange={(e) => setP("contactPersonName", e.target.value)} placeholder="例）坂越 重彦" />
                </div>

                <div>
                  <div className={UI.LABEL}>担当者名（かな）</div>
                  <input className={UI.INPUT} value={p.contactPersonNameKana} onChange={(e) => setP("contactPersonNameKana", e.target.value)} placeholder="例）さかこし しげひこ" />
                </div>

                <div className="lg:col-span-2">
                  <div className={UI.LABEL}>事業内容</div>
                  <textarea className={UI.TEXTAREA} value={p.businessDescription} onChange={(e) => setP("businessDescription", e.target.value)} placeholder="例）幼稚園の運営" />
                </div>

                <div className="lg:col-span-2">
                  <div className={UI.LABEL}>求人用メール（jobEmail）</div>
                  <input className={UI.INPUT} value={p.jobEmail} onChange={(e) => setP("jobEmail", e.target.value)} placeholder="例）recruit@company.com" />
                </div>

                <div className="lg:col-span-2">
                  <div className={UI.LABEL}>デフォルト勤務地（郵便/住所メモ）</div>
                  <input className={UI.INPUT} value={p.defaultWorkLocationPostalCode} onChange={(e) => setP("defaultWorkLocationPostalCode", e.target.value)} placeholder="例）559-0017 大阪府…" />
                </div>
              </div>
            </div>
          </section>

          <section id="sec-internal" className={UI.PANEL} style={{ scrollMarginTop: `${scrollMt}px` }}>
            <div className={UI.PANEL_HDR}>
              <div className="min-w-0">
                <div className={UI.PANEL_TITLE}>内部メモ・外部ID</div>
                <div className={UI.PANEL_SUB}>将来の統合/連携に備える。</div>
              </div>
            </div>

            <div className={UI.PANEL_BODY}>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <div className="lg:col-span-2">
                  <div className={UI.LABEL}>内部メモ（profile）</div>
                  <textarea
                    className={UI.TEXTAREA}
                    value={p.notes_internal}
                    onChange={(e) => setP("notes_internal", e.target.value)}
                    placeholder="例）求人票の癖、面接官の傾向、媒体の相性…"
                  />
                </div>

                <div>
                  <div className={UI.LABEL}>企業コード（任意）</div>
                  <input className={UI.INPUT} value={p.company_code} onChange={(e) => setP("company_code", e.target.value)} placeholder="例）C-000123" />
                </div>

                <div>
                  <div className={UI.LABEL}>外部CRM ID</div>
                  <input className={UI.INPUT} value={p.external_crm_id} onChange={(e) => setP("external_crm_id", e.target.value)} placeholder="例）salesforce:xxxxx" />
                </div>

                <div className="lg:col-span-2">
                  <div className={UI.LABEL}>会計ID</div>
                  <input className={UI.INPUT} value={p.accounting_id} onChange={(e) => setP("accounting_id", e.target.value)} placeholder="例）freee:xxxxx / mf:xxxxx" />
                </div>

                <div className="lg:col-span-2 pt-2">
                  <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 px-3 py-2 text-[12px] text-slate-700 dark:text-slate-300">
                    ※ 商談履歴（契約前/契約後）は別ページ・別テーブルで作り、ここから参照できるようにします。
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="rounded-md border-2 border-slate-200/80 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 p-4 text-[12px] text-slate-700 dark:text-slate-300 shadow-sm">
            <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">次の拡張（予定）</div>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>担当（owner）をメンバー一覧から選択（workspace_members）</li>
              <li>商談履歴（契約前/契約後）を時系列で表示（company_deals / company_meetings）</li>
              <li>業種（中・小）の辞書化（検索・集計用）</li>
            </ul>
          </div>
        </main>
      )}

      <style jsx>{`
        .hero-parallax {
          transform: translate3d(var(--px, 0px), var(--py, 0px), 0);
          transition: transform 140ms ease-out;
          will-change: transform;
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-parallax {
            transition: none !important;
            transform: translate3d(0, 0, 0) !important;
          }
        }
      `}</style>
    </div>
  );
}
