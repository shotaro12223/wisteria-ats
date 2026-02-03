"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import ClientPortalLayout from "@/components/client/ClientPortalLayout";
import Link from "next/link";
import { usePathname } from "next/navigation";
import DatePicker from "@/components/DatePicker";
import { debounce } from "@/lib/debounce";

type Applicant = {
  id: string;
  company_id: string;
  job_id: string;
  name: string;
  status: string;
  applied_at: string;
  site_key: string;
  created_at: string;
  updated_at: string;
  shared_with_client: boolean;
  shared_at: string | null;
  client_comment: string | null;
};

type Job = {
  id: string;
  job_title: string;
};

type Tag = {
  id: string;
  name: string;
  color: string;
};

type ApplicantWithTags = Applicant & {
  tagIds?: string[];
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  NEW: { label: "新規", color: "bg-blue-100 text-blue-700 border-blue-200" },
  DOC: { label: "書類選考", color: "bg-purple-100 text-purple-700 border-purple-200" },
  資料待ち: { label: "資料待ち", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  INT: { label: "面接", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  媒体審査中: { label: "媒体審査中", color: "bg-orange-100 text-orange-700 border-orange-200" },
  OFFER: { label: "内定", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  内定: { label: "内定", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  NG: { label: "不採用", color: "bg-slate-100 dark:bg-slate-700 text-slate-700 border-slate-200 dark:border-slate-700" },
};

type ViewMode = "card" | "table" | "kanban";

type PaginationInfo = {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export default function ClientApplicantsPage() {
  const pathname = usePathname();
  const adminCompanyId = pathname?.match(/^\/client\/companies\/([^/]+)/)?.[1] ?? null;
  const linkBase = adminCompanyId ? `/client/companies/${adminCompanyId}` : "/client";
  const [applicants, setApplicants] = useState<ApplicantWithTags[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 50,
    totalCount: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  // Filters
  const [filterJobId, setFilterJobId] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterSource, setFilterSource] = useState<string>("");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");
  const [filterTagIds, setFilterTagIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Sort
  const [sortBy, setSortBy] = useState<"applied_at" | "name" | "status">("applied_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Debounced search query state
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  // Create debounced search handler (300ms delay)
  const debouncedSearch = useRef(
    debounce((value: string) => {
      setDebouncedSearchQuery(value);
    }, 300)
  ).current;

  // Handle search input change
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value); // Update UI immediately
    debouncedSearch(value); // Update filter with delay
  }, [debouncedSearch]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const qs = adminCompanyId ? `companyId=${adminCompanyId}&` : "";

      // Fetch jobs for filter dropdown
      const jobsRes = await fetch(`/api/client/jobs?${qs}`.replace(/[?&]$/, ""), { cache: "no-store" });
      if (jobsRes.ok) {
        try {
          const jobsData = await jobsRes.json();
          if (jobsData.ok) {
            setJobs(jobsData.data || []);
          }
        } catch (e) {
          console.error("Failed to parse jobs response:", e);
        }
      } else {
        console.error("Jobs API error:", jobsRes.status, jobsRes.statusText);
      }

      // Fetch tags for filter
      const tagsRes = await fetch(`/api/client/tags?${qs}`.replace(/[?&]$/, ""), { cache: "no-store" });
      if (tagsRes.ok) {
        try {
          const tagsData = await tagsRes.json();
          if (tagsData.ok) {
            setTags(tagsData.data || []);
          }
        } catch (e) {
          console.error("Failed to parse tags response:", e);
        }
      }

      // Fetch paginated applicants
      const applicantsRes = await fetch(
        `/api/client/applicants?${qs}page=${currentPage}&limit=50`,
        { cache: "no-store" }
      );

      let applicantsList: ApplicantWithTags[] = [];
      if (applicantsRes.ok) {
        try {
          const applicantsData = await applicantsRes.json();
          if (applicantsData.ok) {
            applicantsList = applicantsData.data || [];
            // Update pagination info
            if (applicantsData.pagination) {
              setPagination(applicantsData.pagination);
            }
          }
        } catch (e) {
          console.error("Failed to parse applicants response:", e);
        }
      } else {
        console.error("Applicants API error:", applicantsRes.status, applicantsRes.statusText);
      }

      // Fetch tags for all applicants in a single batch request
      let applicantsWithTags: ApplicantWithTags[] = applicantsList.map((a) => ({
        ...a,
        tagIds: [],
      }));

      if (applicantsList.length > 0) {
        try {
          const applicantIds = applicantsList.map((a) => a.id);
          const batchTagsRes = await fetch("/api/client/applicants/batch-tags", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ applicantIds }),
            cache: "no-store",
          });

          if (batchTagsRes.ok) {
            const batchTagsData = await batchTagsRes.json();
            if (batchTagsData.ok) {
              const tagsByApplicant = batchTagsData.data;
              applicantsWithTags = applicantsList.map((applicant) => ({
                ...applicant,
                tagIds: (tagsByApplicant[applicant.id] || []).map(
                  (t: { tag_id: string }) => t.tag_id
                ),
              }));
            }
          }
        } catch (e) {
          console.error("Failed to fetch batch tags:", e);
        }
      }

      setApplicants(applicantsWithTags);
      setLoading(false);
    }

    loadData();
  }, [currentPage, adminCompanyId]);

  // Apply filters and search using useMemo for better performance
  const filteredApplicants = useMemo(() => {
    let filtered = [...applicants];

    // Job filter
    if (filterJobId) {
      filtered = filtered.filter((a) => a.job_id === filterJobId);
    }

    // Status filter
    if (filterStatus) {
      filtered = filtered.filter((a) => a.status === filterStatus);
    }

    // Source filter
    if (filterSource) {
      filtered = filtered.filter((a) => a.site_key === filterSource);
    }

    // Date range filter
    if (filterDateFrom) {
      filtered = filtered.filter((a) => new Date(a.applied_at) >= new Date(filterDateFrom));
    }
    if (filterDateTo) {
      filtered = filtered.filter(
        (a) => new Date(a.applied_at) <= new Date(filterDateTo + "T23:59:59")
      );
    }

    // Search filter (using debounced query for better performance)
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.name.toLowerCase().includes(query) ||
          a.site_key.toLowerCase().includes(query) ||
          (a.client_comment && a.client_comment.toLowerCase().includes(query))
      );
    }

    // Tag filter
    if (filterTagIds.length > 0) {
      filtered = filtered.filter((a) =>
        filterTagIds.every((tagId) => a.tagIds?.includes(tagId))
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "applied_at") {
        comparison = new Date(a.applied_at).getTime() - new Date(b.applied_at).getTime();
      } else if (sortBy === "name") {
        comparison = a.name.localeCompare(b.name, "ja");
      } else if (sortBy === "status") {
        comparison = a.status.localeCompare(b.status);
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [
    applicants,
    filterJobId,
    filterStatus,
    filterSource,
    filterDateFrom,
    filterDateTo,
    filterTagIds,
    debouncedSearchQuery, // Use debounced query for filtering
    sortBy,
    sortOrder,
  ]);

  const clearFilters = useCallback(() => {
    setFilterJobId("");
    setFilterStatus("");
    setFilterSource("");
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterTagIds([]);
    setSearchQuery("");
    setDebouncedSearchQuery(""); // Clear debounced query too
  }, []);

  const toggleTagFilter = useCallback((tagId: string) => {
    setFilterTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  }, []);

  const exportToCSV = useCallback(() => {
    const headers = ["名前", "求人", "ステータス", "応募元", "応募日", "連携日"];
    const rows = filteredApplicants.map((a) => {
      const job = jobs.find((j) => j.id === a.job_id);
      return [
        a.name,
        job?.job_title || "",
        STATUS_LABELS[a.status]?.label || a.status,
        a.site_key,
        new Date(a.applied_at).toLocaleDateString("ja-JP"),
        a.shared_at ? new Date(a.shared_at).toLocaleDateString("ja-JP") : "",
      ];
    });

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `応募者一覧_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  }, [filteredApplicants, jobs]);

  const sources = useMemo(() => Array.from(new Set(applicants.map((a) => a.site_key))), [applicants]);

  if (loading) {
    return (
      <ClientPortalLayout>
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="relative w-8 h-8">
              <div className="absolute inset-0 rounded-full border-2 border-slate-200 dark:border-slate-700"></div>
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-indigo-600 animate-spin"></div>
            </div>
            <p className="text-[13px] text-slate-500 dark:text-slate-400">読み込み中</p>
          </div>
        </div>
      </ClientPortalLayout>
    );
  }

  return (
    <ClientPortalLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">応募者管理</h1>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1">
              採用候補者の一元管理 · 全{pagination.totalCount}件中{filteredApplicants.length}件を表示
            </p>
          </div>
          <button
            onClick={exportToCSV}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-[13px] font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            CSV出力
          </button>
        </div>

        {/* Controls */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/60 p-5 shadow-sm space-y-5">
          {/* Search & View Mode */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-[280px]">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="応募者名、応募元、コメントで検索..."
                  className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-[13px] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode("table")}
                className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-all ${
                  viewMode === "table" ? "bg-white text-slate-900 dark:text-slate-100 shadow-sm" : "text-slate-600 dark:text-slate-300 hover:text-slate-800"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode("card")}
                className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-all ${
                  viewMode === "card" ? "bg-white text-slate-900 dark:text-slate-100 shadow-sm" : "text-slate-600 dark:text-slate-300 hover:text-slate-800"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode("kanban")}
                className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-all ${
                  viewMode === "kanban" ? "bg-white text-slate-900 dark:text-slate-100 shadow-sm" : "text-slate-600 dark:text-slate-300 hover:text-slate-800"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
              </button>
            </div>
          </div>

          {/* Tag Filters */}
          {tags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">タグ:</span>
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => toggleTagFilter(tag.id)}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-all ${
                    filterTagIds.includes(tag.id) ? "ring-1 ring-offset-1" : "opacity-70 hover:opacity-100"
                  }`}
                  style={{
                    backgroundColor: `${tag.color}15`,
                    color: tag.color,
                    ...(filterTagIds.includes(tag.id) && {
                      boxShadow: `0 0 0 1px ${tag.color}`,
                    }),
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color }}></span>
                  {tag.name}
                  {filterTagIds.includes(tag.id) && (
                    <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">求人</label>
              <select
                value={filterJobId}
                onChange={(e) => setFilterJobId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-[13px] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
              >
                <option value="">すべて</option>
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>{job.job_title || "無題"}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">ステータス</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-[13px] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
              >
                <option value="">すべて</option>
                {Object.entries(STATUS_LABELS).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">応募元</label>
              <select
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-[13px] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
              >
                <option value="">すべて</option>
                {sources.map((source) => (
                  <option key={source} value={source}>{source}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">応募日（開始）</label>
              <DatePicker
                value={filterDateFrom}
                onChange={setFilterDateFrom}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-[13px] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">応募日（終了）</label>
              <DatePicker
                value={filterDateTo}
                onChange={setFilterDateTo}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-[13px] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
              />
            </div>
          </div>

          {/* Active Filters & Clear */}
          {(filterJobId || filterStatus || filterSource || filterDateFrom || filterDateTo || filterTagIds.length > 0 || searchQuery) && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[12px] text-slate-500 dark:text-slate-400">フィルタ:</span>
                {filterJobId && (
                  <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[11px] font-medium">
                    {jobs.find((j) => j.id === filterJobId)?.job_title}
                  </span>
                )}
                {filterStatus && (
                  <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[11px] font-medium">
                    {STATUS_LABELS[filterStatus]?.label}
                  </span>
                )}
                {filterSource && (
                  <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[11px] font-medium">
                    {filterSource}
                  </span>
                )}
                {(filterDateFrom || filterDateTo) && (
                  <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[11px] font-medium">
                    {filterDateFrom || "..."} 〜 {filterDateTo || "..."}
                  </span>
                )}
                {searchQuery && (
                  <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[11px] font-medium">
                    検索: {searchQuery}
                  </span>
                )}
                {filterTagIds.map((tagId) => {
                  const tag = tags.find((t) => t.id === tagId);
                  return tag ? (
                    <span key={tagId} className="px-2 py-0.5 rounded text-[11px] font-medium" style={{ backgroundColor: `${tag.color}15`, color: tag.color }}>
                      {tag.name}
                    </span>
                  ) : null;
                })}
              </div>
              <button onClick={clearFilters} className="text-[12px] text-indigo-600 hover:underline font-medium">
                クリア
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        {filteredApplicants.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/60 p-12 text-center shadow-sm">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
            </div>
            <p className="text-[14px] font-medium text-slate-700 dark:text-slate-200">応募者が見つかりません</p>
            <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-1">
              {applicants.length > 0
                ? "検索条件に一致する応募者がいません"
                : "Wisteriaの担当者が応募者を連携すると表示されます"}
            </p>
          </div>
        ) : viewMode === "table" ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                  <tr>
                    <th className="px-5 py-3 text-left">
                      <button
                        onClick={() => {
                          setSortBy("name");
                          setSortOrder(sortBy === "name" && sortOrder === "asc" ? "desc" : "asc");
                        }}
                        className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider hover:text-indigo-600 transition-colors"
                      >
                        応募者名
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                      </button>
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">求人</th>
                    <th className="px-5 py-3 text-left">
                      <button
                        onClick={() => {
                          setSortBy("status");
                          setSortOrder(sortBy === "status" && sortOrder === "asc" ? "desc" : "asc");
                        }}
                        className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider hover:text-indigo-600 transition-colors"
                      >
                        ステータス
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                      </button>
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">応募元</th>
                    <th className="px-5 py-3 text-left">
                      <button
                        onClick={() => {
                          setSortBy("applied_at");
                          setSortOrder(sortBy === "applied_at" && sortOrder === "asc" ? "desc" : "asc");
                        }}
                        className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider hover:text-indigo-600 transition-colors"
                      >
                        応募日
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                      </button>
                    </th>
                    <th className="px-5 py-3 text-right text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {filteredApplicants.map((applicant) => {
                    const statusInfo = STATUS_LABELS[applicant.status] || {
                      label: applicant.status,
                      color: "bg-slate-100 dark:bg-slate-700 text-slate-700 border-slate-200 dark:border-slate-700",
                    };
                    const job = jobs.find((j) => j.id === applicant.job_id);

                    return (
                      <tr key={applicant.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                        <td className="px-5 py-3">
                          <div>
                            <p className="text-[13px] font-medium text-slate-900 dark:text-slate-100">{applicant.name}</p>
                            {applicant.client_comment && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{applicant.client_comment}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-[12px] text-slate-600 dark:text-slate-300">{job?.job_title || "未設定"}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-[12px] text-slate-500 dark:text-slate-400">{applicant.site_key}</td>
                        <td className="px-5 py-3 text-[12px] text-slate-500 dark:text-slate-400 tabular-nums">
                          {new Date(applicant.applied_at).toLocaleDateString("ja-JP")}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Link href={`${linkBase}/applicants/${applicant.id}`} className="text-[12px] font-medium text-indigo-600 hover:text-indigo-700 hover:underline">
                            詳細 →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : viewMode === "card" ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredApplicants.map((applicant) => {
              const statusInfo = STATUS_LABELS[applicant.status] || {
                label: applicant.status,
                color: "bg-slate-100 dark:bg-slate-700 text-slate-700 border-slate-200 dark:border-slate-700",
              };
              const job = jobs.find((j) => j.id === applicant.job_id);

              return (
                <Link
                  key={applicant.id}
                  href={`${linkBase}/applicants/${applicant.id}`}
                  className="group bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/60 p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[14px] font-medium text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 transition-colors truncate">
                        {applicant.name || "名前未設定"}
                      </h3>
                      <p className="text-[12px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{job?.job_title || "求人情報なし"}</p>
                    </div>
                    <svg className="w-4 h-4 text-slate-300 group-hover:text-slate-400 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                    {applicant.site_key && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-medium">
                        {applicant.site_key}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="tabular-nums">応募日: {new Date(applicant.applied_at).toLocaleDateString("ja-JP")}</span>
                    {applicant.shared_at && (
                      <span className="tabular-nums">連携日: {new Date(applicant.shared_at).toLocaleDateString("ja-JP")}</span>
                    )}
                  </div>

                  {applicant.client_comment && (
                    <p className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">{applicant.client_comment}</p>
                  )}
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-max">
              {["NEW", "DOC", "INT", "OFFER"].map((status) => {
                const statusApplicants = filteredApplicants.filter((a) => a.status === status);
                const statusInfo = STATUS_LABELS[status];

                return (
                  <div key={status} className="flex-shrink-0 w-72">
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-sm overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                        <h3 className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 flex items-center justify-between">
                          <span>{statusInfo.label}</span>
                          <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${statusInfo.color}`}>
                            {statusApplicants.length}
                          </span>
                        </h3>
                      </div>
                      <div className="p-3 space-y-2 max-h-[500px] overflow-y-auto">
                        {statusApplicants.length === 0 ? (
                          <p className="text-slate-400 dark:text-slate-500 text-[12px] text-center py-6">該当なし</p>
                        ) : (
                          statusApplicants.map((applicant) => {
                            const job = jobs.find((j) => j.id === applicant.job_id);

                            return (
                              <Link
                                key={applicant.id}
                                href={`${linkBase}/applicants/${applicant.id}`}
                                className="block p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/30 transition-all"
                              >
                                <p className="text-[13px] font-medium text-slate-800 dark:text-slate-100 mb-0.5">{applicant.name}</p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">{job?.job_title || "未設定"}</p>
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className="text-slate-500 dark:text-slate-400">{applicant.site_key}</span>
                                  <span className="text-slate-400 tabular-nums">
                                    {new Date(applicant.applied_at).toLocaleDateString("ja-JP", {
                                      month: "short",
                                      day: "numeric",
                                    })}
                                  </span>
                                </div>
                              </Link>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/60 p-4 shadow-sm">
            <div className="text-[13px] text-slate-600 dark:text-slate-300">
              <span className="font-medium">{pagination.totalCount}</span> 件中{" "}
              <span className="font-medium">
                {(pagination.page - 1) * pagination.limit + 1}
              </span>{" "}
              -{" "}
              <span className="font-medium">
                {Math.min(pagination.page * pagination.limit, pagination.totalCount)}
              </span>{" "}
              件を表示
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={!pagination.hasPreviousPage}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[13px] font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                最初
              </button>
              <button
                onClick={() => setCurrentPage((p) => p - 1)}
                disabled={!pagination.hasPreviousPage}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[13px] font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                前へ
              </button>

              <span className="px-3 text-[13px] text-slate-600 dark:text-slate-300">
                ページ <span className="font-semibold">{pagination.page}</span> /{" "}
                <span className="font-semibold">{pagination.totalPages}</span>
              </span>

              <button
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={!pagination.hasNextPage}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[13px] font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                次へ
              </button>
              <button
                onClick={() => setCurrentPage(pagination.totalPages)}
                disabled={!pagination.hasNextPage}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[13px] font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                最後
              </button>
            </div>
          </div>
        )}
      </div>
    </ClientPortalLayout>
  );
}
