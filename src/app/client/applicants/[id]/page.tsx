"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import ClientPortalLayout from "@/components/client/ClientPortalLayout";
import Link from "next/link";
import DatePicker from "@/components/DatePicker";
import type {
  ApplicantClientFeedback,
  InterviewResult,
  FailReason,
  HireIntention,
  InterviewType,
} from "@/lib/types";
import {
  FAIL_REASON_LABELS,
  INTERVIEW_TYPE_LABELS,
  INTERVIEW_RESULT_LABELS,
  HIRE_INTENTION_LABELS,
  PASS_STRENGTHS_OPTIONS,
} from "@/lib/types";

type Applicant = {
  id: string;
  company_id: string;
  job_id: string;
  name: string;
  status: string;
  applied_at: string;
  site_key: string;
  client_comment: string | null;
  created_at: string;
  updated_at: string;
  shared_at: string | null;
};

type Job = {
  id: string;
  job_title: string;
};

type Comment = {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  client_user_id: string;
  client_users: {
    id: string;
    display_name: string;
  } | null;
};

type Tag = {
  id: string;
  name: string;
  color: string;
};

type ApplicantTag = {
  id: string;
  tag_id: string;
  client_tags: Tag | null;
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  NEW: { label: "新規", color: "bg-blue-100 text-blue-700 border-blue-200" },
  DOC: { label: "書類選考", color: "bg-purple-100 text-purple-700 border-purple-200" },
  資料待ち: { label: "資料待ち", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  INT: { label: "面接", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  媒体審査中: { label: "媒体審査中", color: "bg-orange-100 text-orange-700 border-orange-200" },
  OFFER: { label: "内定", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  内定: { label: "内定", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  NG: { label: "不採用", color: "bg-slate-100 text-slate-700 border-slate-200" },
};

const INTERVIEW_RESULT_COLORS: Record<InterviewResult, string> = {
  pass: "bg-emerald-100 text-emerald-700 border-emerald-200",
  fail: "bg-rose-100 text-rose-700 border-rose-200",
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  no_show: "bg-slate-100 text-slate-700 border-slate-200",
};

export default function ClientApplicantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const isReadOnly = !!pathname?.match(/^\/client\/companies\//);
  const linkBase = pathname?.match(/^\/client\/companies\/[^/]+/)?.[0] ?? "/client";
  const [applicant, setApplicant] = useState<Applicant | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(true);

  // Tags state
  const [applicantTags, setApplicantTags] = useState<ApplicantTag[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [tagsLoading, setTagsLoading] = useState(true);
  const [tagMenuOpen, setTagMenuOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#6366f1");

  // Feedback state
  const [feedbackList, setFeedbackList] = useState<ApplicantClientFeedback[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(true);
  const [feedbackFormOpen, setFeedbackFormOpen] = useState(false);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState<{
    interview_type: InterviewType;
    interview_date: string;
    interviewer_name: string;
    interview_result: InterviewResult;
    fail_reason: FailReason | "";
    fail_reason_detail: string;
    pass_rating: number;
    pass_strengths: string[];
    pass_comment: string;
    hire_intention: HireIntention | "";
    next_action: string;
  }>({
    interview_type: "first",
    interview_date: new Date().toISOString().split("T")[0],
    interviewer_name: "",
    interview_result: "pass",
    fail_reason: "",
    fail_reason_detail: "",
    pass_rating: 3,
    pass_strengths: [],
    pass_comment: "",
    hire_intention: "",
    next_action: "",
  });

  // Load comments
  const loadComments = useCallback(async (applicantId: string) => {
    setCommentsLoading(true);
    try {
      const res = await fetch(`/api/client/applicants/${applicantId}/comments`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.ok) {
        setComments(data.data.comments || []);
        setCurrentUserId(data.data.currentUserId);
      }
    } catch (e) {
      console.error("Failed to load comments:", e);
    } finally {
      setCommentsLoading(false);
    }
  }, []);

  // Load tags
  const loadTags = useCallback(async (applicantId: string) => {
    setTagsLoading(true);
    try {
      const allTagsRes = await fetch("/api/client/tags", { cache: "no-store" });
      const allTagsData = await allTagsRes.json();
      if (allTagsData.ok) {
        setAllTags(allTagsData.data || []);
      }

      const applicantTagsRes = await fetch(`/api/client/applicants/${applicantId}/tags`, {
        cache: "no-store",
      });
      const applicantTagsData = await applicantTagsRes.json();
      if (applicantTagsData.ok) {
        setApplicantTags(applicantTagsData.data || []);
      }
    } catch (e) {
      console.error("Failed to load tags:", e);
    } finally {
      setTagsLoading(false);
    }
  }, []);

  // Load feedback
  const loadFeedback = useCallback(async (applicantId: string) => {
    setFeedbackLoading(true);
    try {
      const res = await fetch(`/api/client/applicants/${applicantId}/feedback`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.ok) {
        setFeedbackList(data.data || []);
      }
    } catch (e) {
      console.error("Failed to load feedback:", e);
    } finally {
      setFeedbackLoading(false);
    }
  }, []);

  // Add tag to applicant
  const handleAddTag = async (tagId: string) => {
    if (isReadOnly) return;
    if (!applicant) return;
    try {
      const res = await fetch(`/api/client/applicants/${applicant.id}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagId }),
      });
      const data = await res.json();
      if (data.ok) {
        setApplicantTags((prev) => [...prev, data.data]);
      }
    } catch (e) {
      console.error("Failed to add tag:", e);
    }
  };

  // Remove tag from applicant
  const handleRemoveTag = async (tagId: string) => {
    if (isReadOnly) return;
    if (!applicant) return;
    try {
      const res = await fetch(`/api/client/applicants/${applicant.id}/tags`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagId }),
      });
      const data = await res.json();
      if (data.ok) {
        setApplicantTags((prev) => prev.filter((t) => t.tag_id !== tagId));
      }
    } catch (e) {
      console.error("Failed to remove tag:", e);
    }
  };

  // Create new tag
  const handleCreateTag = async () => {
    if (isReadOnly) return;
    if (!newTagName.trim()) return;
    try {
      const res = await fetch("/api/client/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTagName.trim(), color: newTagColor }),
      });
      const data = await res.json();
      if (data.ok) {
        setAllTags((prev) => [...prev, data.data]);
        setNewTagName("");
        if (applicant) {
          await handleAddTag(data.data.id);
        }
      }
    } catch (e) {
      console.error("Failed to create tag:", e);
    }
  };

  // Submit new comment
  const handleSubmitComment = async () => {
    if (isReadOnly) return;
    if (!newComment.trim() || isSubmitting || !applicant) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/client/applicants/${applicant.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        setComments((prev) => [data.data, ...prev]);
        setNewComment("");
      }
    } catch (e) {
      console.error("Failed to submit comment:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete comment
  const handleDeleteComment = async (commentId: string) => {
    if (isReadOnly) return;
    if (!applicant) return;

    try {
      const res = await fetch(`/api/client/applicants/${applicant.id}/comments`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId }),
      });
      const data = await res.json();
      if (data.ok) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      }
    } catch (e) {
      console.error("Failed to delete comment:", e);
    }
  };

  // Submit feedback
  const handleSubmitFeedback = async () => {
    if (isReadOnly) return;
    if (!applicant || feedbackSubmitting) return;

    setFeedbackSubmitting(true);
    try {
      const res = await fetch(`/api/client/applicants/${applicant.id}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interview_type: feedbackForm.interview_type,
          interview_date: feedbackForm.interview_date,
          interviewer_name: feedbackForm.interviewer_name || undefined,
          interview_result: feedbackForm.interview_result,
          fail_reason: feedbackForm.interview_result === "fail" ? feedbackForm.fail_reason || undefined : undefined,
          fail_reason_detail: feedbackForm.interview_result === "fail" ? feedbackForm.fail_reason_detail || undefined : undefined,
          pass_rating: feedbackForm.interview_result === "pass" ? feedbackForm.pass_rating : undefined,
          pass_strengths: feedbackForm.interview_result === "pass" && feedbackForm.pass_strengths.length > 0 ? feedbackForm.pass_strengths : undefined,
          pass_comment: feedbackForm.interview_result === "pass" ? feedbackForm.pass_comment || undefined : undefined,
          hire_intention: ["pass", "pending"].includes(feedbackForm.interview_result) ? feedbackForm.hire_intention || undefined : undefined,
          next_action: feedbackForm.next_action || undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setFeedbackList((prev) => [data.data, ...prev]);
        setFeedbackFormOpen(false);
        // Reset form
        setFeedbackForm({
          interview_type: "first",
          interview_date: new Date().toISOString().split("T")[0],
          interviewer_name: "",
          interview_result: "pass",
          fail_reason: "",
          fail_reason_detail: "",
          pass_rating: 3,
          pass_strengths: [],
          pass_comment: "",
          hire_intention: "",
          next_action: "",
        });
      }
    } catch (e) {
      console.error("Failed to submit feedback:", e);
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  // Delete feedback
  const handleDeleteFeedback = async (feedbackId: string) => {
    if (isReadOnly) return;
    if (!applicant || !confirm("このフィードバックを削除しますか？")) return;

    try {
      const res = await fetch(`/api/client/applicants/${applicant.id}/feedback?feedback_id=${feedbackId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.ok) {
        setFeedbackList((prev) => prev.filter((f) => f.id !== feedbackId));
      }
    } catch (e) {
      console.error("Failed to delete feedback:", e);
    }
  };

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      try {
        const id = params.id as string;
        const applicantRes = await fetch(`/api/client/applicants/${id}`, { cache: "no-store" });

        if (!applicantRes.ok) {
          router.replace("/client/applicants");
          return;
        }

        const applicantData = await applicantRes.json();
        if (!applicantData.ok) {
          router.replace("/client/applicants");
          return;
        }

        setApplicant(applicantData.data);

        loadComments(applicantData.data.id);
        loadTags(applicantData.data.id);
        loadFeedback(applicantData.data.id);

        if (applicantData.data.job_id) {
          const jobRes = await fetch(`/api/client/jobs/${applicantData.data.job_id}`, {
            cache: "no-store",
          });

          if (jobRes.ok) {
            const jobData = await jobRes.json();
            if (jobData.ok) {
              setJob(jobData.data);
            }
          }
        }
      } catch (e) {
        console.error(e);
        router.replace("/client/applicants");
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      loadData();
    }
  }, [params.id, router, loadComments, loadTags, loadFeedback]);

  if (loading) {
    return (
      <ClientPortalLayout>
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="relative w-8 h-8">
              <div className="absolute inset-0 rounded-full border-2 border-slate-200"></div>
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-indigo-600 animate-spin"></div>
            </div>
            <p className="text-[13px] text-slate-500">読み込み中</p>
          </div>
        </div>
      </ClientPortalLayout>
    );
  }

  if (!applicant) {
    return (
      <ClientPortalLayout>
        <div className="text-center py-12">
          <p className="text-[13px] text-slate-500">応募者情報が見つかりません</p>
        </div>
      </ClientPortalLayout>
    );
  }

  const statusInfo = STATUS_LABELS[applicant.status] || {
    label: applicant.status,
    color: "bg-slate-100 text-slate-700 border-slate-200",
  };

  return (
    <ClientPortalLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
          <Link href={`${linkBase}/applicants`} className="hover:text-indigo-600 transition-colors">
            応募者一覧
          </Link>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-slate-700 font-medium">{applicant.name || "応募者"}</span>
        </div>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
              {applicant.name || "応募者"}
            </h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px] font-medium">
                {applicant.site_key}
              </span>
            </div>

            {/* Tags Section */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {!tagsLoading &&
                applicantTags.map((at) =>
                  at.client_tags ? (
                    <span
                      key={at.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium"
                      style={{ backgroundColor: `${at.client_tags.color}15`, color: at.client_tags.color }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: at.client_tags.color }}></span>
                      {at.client_tags.name}
                      {!isReadOnly && <button
                        onClick={() => handleRemoveTag(at.tag_id)}
                        className="ml-0.5 hover:bg-slate-200 rounded-full p-0.5 transition-colors"
                      >
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>}
                    </span>
                  ) : null
                )}

              {/* Add Tag Button */}
              {!isReadOnly && <div className="relative">
                <button
                  onClick={() => setTagMenuOpen(!tagMenuOpen)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border border-dashed border-slate-300 text-slate-500 hover:border-slate-400 hover:text-slate-600 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  タグ
                </button>

                {tagMenuOpen && (
                  <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden z-20">
                    <div className="p-3 border-b border-slate-100">
                      <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-2">既存のタグ</p>
                      <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto">
                        {allTags.filter((tag) => !applicantTags.some((at) => at.tag_id === tag.id)).map((tag) => (
                          <button
                            key={tag.id}
                            onClick={() => { handleAddTag(tag.id); setTagMenuOpen(false); }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium hover:opacity-80 transition-opacity"
                            style={{ backgroundColor: `${tag.color}15`, color: tag.color }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color }}></span>
                            {tag.name}
                          </button>
                        ))}
                        {allTags.filter((tag) => !applicantTags.some((at) => at.tag_id === tag.id)).length === 0 && (
                          <p className="text-[10px] text-slate-400">追加可能なタグがありません</p>
                        )}
                      </div>
                    </div>

                    <div className="p-3">
                      <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-2">新規作成</p>
                      <div className="flex gap-1.5">
                        <input
                          type="color"
                          value={newTagColor}
                          onChange={(e) => setNewTagColor(e.target.value)}
                          className="w-7 h-7 rounded border border-slate-200 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={newTagName}
                          onChange={(e) => setNewTagName(e.target.value)}
                          placeholder="タグ名"
                          className="flex-1 px-2 py-1 text-[12px] border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                        <button
                          onClick={() => { handleCreateTag(); setTagMenuOpen(false); }}
                          disabled={!newTagName.trim()}
                          className="px-2 py-1 text-[11px] font-medium text-white bg-indigo-500 rounded hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          追加
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <div className="bg-white rounded-xl border border-slate-200/60 p-6 shadow-sm">
              <h2 className="text-[15px] font-semibold text-slate-900 mb-5 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                基本情報
              </h2>

              <div className="space-y-4">
                <div>
                  <h3 className="text-[12px] font-medium text-slate-500 mb-1">求人</h3>
                  <p className="text-[13px] text-slate-900">{job?.job_title || applicant.job_id || "-"}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-[12px] font-medium text-slate-500 mb-1">応募日</h3>
                    <p className="text-[13px] text-slate-900 tabular-nums">
                      {new Date(applicant.applied_at).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-[12px] font-medium text-slate-500 mb-1">媒体</h3>
                    <p className="text-[13px] text-slate-900">{applicant.site_key}</p>
                  </div>
                </div>

                {applicant.shared_at && (
                  <div>
                    <h3 className="text-[12px] font-medium text-slate-500 mb-1">連携日</h3>
                    <p className="text-[13px] text-slate-900 tabular-nums">
                      {new Date(applicant.shared_at).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Client Feedback Section */}
            <div className="bg-white rounded-xl border border-slate-200/60 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[15px] font-semibold text-slate-900 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  面接フィードバック
                  <span className="text-[12px] font-normal text-slate-400 ml-1">({feedbackList.length})</span>
                </h2>
                {!isReadOnly && <button
                  onClick={() => setFeedbackFormOpen(!feedbackFormOpen)}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[12px] font-medium hover:bg-indigo-700 transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  結果を入力
                </button>}
              </div>

              {/* Feedback Form */}
              {feedbackFormOpen && (
                <div className="mb-6 p-5 bg-slate-50 rounded-xl border border-slate-200">
                  <h3 className="text-[13px] font-semibold text-slate-800 mb-4">面接結果を入力</h3>

                  <div className="space-y-4">
                    {/* Interview Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">面接タイプ</label>
                        <select
                          value={feedbackForm.interview_type}
                          onChange={(e) => setFeedbackForm({ ...feedbackForm, interview_type: e.target.value as InterviewType })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-[12px] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                        >
                          {Object.entries(INTERVIEW_TYPE_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">面接日</label>
                        <DatePicker
                          value={feedbackForm.interview_date}
                          onChange={(value) => setFeedbackForm({ ...feedbackForm, interview_date: value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-[12px] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">面接官（任意）</label>
                        <input
                          type="text"
                          value={feedbackForm.interviewer_name}
                          onChange={(e) => setFeedbackForm({ ...feedbackForm, interviewer_name: e.target.value })}
                          placeholder="山田 太郎"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-[12px] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                    </div>

                    {/* Result */}
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-2">面接結果</label>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(INTERVIEW_RESULT_LABELS).map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setFeedbackForm({ ...feedbackForm, interview_result: value as InterviewResult })}
                            className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all ${
                              feedbackForm.interview_result === value
                                ? INTERVIEW_RESULT_COLORS[value as InterviewResult]
                                : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Fail Reason (if fail) */}
                    {feedbackForm.interview_result === "fail" && (
                      <div className="p-4 bg-rose-50 dark:bg-rose-900/20 rounded-lg border border-rose-100 dark:border-rose-800">
                        <label className="block text-[11px] font-medium text-rose-700 dark:text-rose-300 mb-2">不合格理由</label>
                        <select
                          value={feedbackForm.fail_reason}
                          onChange={(e) => setFeedbackForm({ ...feedbackForm, fail_reason: e.target.value as FailReason })}
                          className="w-full px-3 py-2 rounded-lg border border-rose-200 dark:border-rose-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-[12px] focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 mb-3"
                        >
                          <option value="">選択してください</option>
                          {Object.entries(FAIL_REASON_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                        <textarea
                          value={feedbackForm.fail_reason_detail}
                          onChange={(e) => setFeedbackForm({ ...feedbackForm, fail_reason_detail: e.target.value })}
                          placeholder="詳細コメント（任意）"
                          rows={2}
                          className="w-full px-3 py-2 rounded-lg border border-rose-200 text-[12px] focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 resize-none"
                        />
                      </div>
                    )}

                    {/* Pass Details (if pass) */}
                    {feedbackForm.interview_result === "pass" && (
                      <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                        <div className="mb-4">
                          <label className="block text-[11px] font-medium text-emerald-700 mb-2">評価（5段階）</label>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((rating) => (
                              <button
                                key={rating}
                                type="button"
                                onClick={() => setFeedbackForm({ ...feedbackForm, pass_rating: rating })}
                                className={`w-8 h-8 rounded-lg text-[13px] font-medium transition-all ${
                                  feedbackForm.pass_rating >= rating
                                    ? "bg-emerald-500 text-white"
                                    : "bg-white border border-emerald-200 text-emerald-600 hover:bg-emerald-100"
                                }`}
                              >
                                {rating}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="mb-4">
                          <label className="block text-[11px] font-medium text-emerald-700 mb-2">良かった点（複数選択可）</label>
                          <div className="flex flex-wrap gap-1.5">
                            {PASS_STRENGTHS_OPTIONS.map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                  const newStrengths = feedbackForm.pass_strengths.includes(opt.value)
                                    ? feedbackForm.pass_strengths.filter((s) => s !== opt.value)
                                    : [...feedbackForm.pass_strengths, opt.value];
                                  setFeedbackForm({ ...feedbackForm, pass_strengths: newStrengths });
                                }}
                                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                                  feedbackForm.pass_strengths.includes(opt.value)
                                    ? "bg-emerald-500 text-white"
                                    : "bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <textarea
                          value={feedbackForm.pass_comment}
                          onChange={(e) => setFeedbackForm({ ...feedbackForm, pass_comment: e.target.value })}
                          placeholder="コメント（任意）"
                          rows={2}
                          className="w-full px-3 py-2 rounded-lg border border-emerald-200 text-[12px] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 resize-none"
                        />
                      </div>
                    )}

                    {/* Hire Intention (if pass or pending) */}
                    {["pass", "pending"].includes(feedbackForm.interview_result) && (
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-2">採用意向</label>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(HIRE_INTENTION_LABELS).map(([value, label]) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => setFeedbackForm({ ...feedbackForm, hire_intention: value as HireIntention })}
                              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all ${
                                feedbackForm.hire_intention === value
                                  ? "bg-indigo-100 text-indigo-700 border-indigo-200"
                                  : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Next Action */}
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">次のアクション（任意）</label>
                      <input
                        type="text"
                        value={feedbackForm.next_action}
                        onChange={(e) => setFeedbackForm({ ...feedbackForm, next_action: e.target.value })}
                        placeholder="例：二次面接へ進む、オファー提示など"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-[12px] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-5">
                    <button
                      onClick={() => setFeedbackFormOpen(false)}
                      className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-[12px] font-medium hover:bg-slate-200 transition-colors"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={handleSubmitFeedback}
                      disabled={feedbackSubmitting}
                      className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-[12px] font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      {feedbackSubmitting ? "保存中..." : "保存する"}
                    </button>
                  </div>
                </div>
              )}

              {/* Feedback List */}
              <div className="space-y-3">
                {feedbackLoading ? (
                  <div className="text-center py-6 text-[13px] text-slate-500">読み込み中...</div>
                ) : feedbackList.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-[13px] text-slate-500 mb-2">まだフィードバックがありません</p>
                    <p className="text-[11px] text-slate-400">面接後に結果を入力してください</p>
                  </div>
                ) : (
                  feedbackList.map((fb) => (
                    <div key={fb.id} className="p-4 rounded-lg border border-slate-200 bg-white">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                            {INTERVIEW_TYPE_LABELS[fb.interview_type]}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${INTERVIEW_RESULT_COLORS[fb.interview_result]}`}>
                            {INTERVIEW_RESULT_LABELS[fb.interview_result]}
                          </span>
                          <span className="text-[10px] text-slate-400 tabular-nums">
                            {new Date(fb.interview_date).toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric" })}
                          </span>
                        </div>
                        {!isReadOnly && <button
                          onClick={() => handleDeleteFeedback(fb.id)}
                          className="text-slate-400 hover:text-rose-500 transition-colors p-0.5"
                          title="削除"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>}
                      </div>

                      {/* Fail details */}
                      {fb.interview_result === "fail" && fb.fail_reason && (
                        <div className="mb-2">
                          <span className="text-[11px] text-rose-600 font-medium">
                            理由: {FAIL_REASON_LABELS[fb.fail_reason]}
                          </span>
                          {fb.fail_reason_detail && (
                            <p className="text-[11px] text-slate-600 mt-1">{fb.fail_reason_detail}</p>
                          )}
                        </div>
                      )}

                      {/* Pass details */}
                      {fb.interview_result === "pass" && (
                        <div className="mb-2">
                          {fb.pass_rating && (
                            <div className="flex items-center gap-1 mb-1">
                              <span className="text-[11px] text-emerald-600 font-medium">評価:</span>
                              <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map((r) => (
                                  <span key={r} className={`text-[10px] ${r <= fb.pass_rating! ? "text-emerald-500" : "text-slate-300"}`}>★</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {fb.pass_strengths && fb.pass_strengths.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-1">
                              {fb.pass_strengths.map((s) => (
                                <span key={s} className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px] font-medium">
                                  {PASS_STRENGTHS_OPTIONS.find((o) => o.value === s)?.label || s}
                                </span>
                              ))}
                            </div>
                          )}
                          {fb.pass_comment && (
                            <p className="text-[11px] text-slate-600">{fb.pass_comment}</p>
                          )}
                        </div>
                      )}

                      {/* Hire intention */}
                      {fb.hire_intention && (
                        <div className="mb-2">
                          <span className="text-[11px] text-indigo-600 font-medium">
                            採用意向: {HIRE_INTENTION_LABELS[fb.hire_intention]}
                          </span>
                        </div>
                      )}

                      {/* Next action */}
                      {fb.next_action && (
                        <div className="mb-2">
                          <span className="text-[11px] text-slate-600">
                            次のアクション: {fb.next_action}
                          </span>
                        </div>
                      )}

                      {/* Meta */}
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-100">
                        {fb.interviewer_name && <span>面接官: {fb.interviewer_name}</span>}
                        <span>入力: {fb.client_users?.display_name || "不明"}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Selection Status Comment */}
            {applicant.client_comment && (
              <div className="bg-white rounded-xl border border-slate-200/60 p-6 shadow-sm">
                <h2 className="text-[15px] font-semibold text-slate-900 mb-4 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                    <svg className="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                  </div>
                  選考状況（Wisteria管理）
                </h2>
                <p className="text-[13px] text-slate-700 leading-relaxed whitespace-pre-wrap">{applicant.client_comment}</p>
              </div>
            )}

            {/* Comments Section */}
            <div className="bg-white rounded-xl border border-slate-200/60 p-6 shadow-sm">
              <h2 className="text-[15px] font-semibold text-slate-900 mb-5 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                  <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                メモ
                <span className="text-[12px] font-normal text-slate-400 ml-1">({comments.length})</span>
              </h2>

              {/* New Comment Input */}
              {!isReadOnly && <div className="mb-5">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="この応募者に関するメモを入力..."
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-[13px] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none text-slate-800 placeholder-slate-400"
                />
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim() || isSubmitting}
                    className="px-4 py-2 rounded-lg bg-slate-900 text-white text-[13px] font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmitting ? "送信中..." : "メモを追加"}
                  </button>
                </div>
              </div>}

              {/* Comments List */}
              <div className="space-y-3">
                {commentsLoading ? (
                  <div className="text-center py-6 text-[13px] text-slate-500">読み込み中...</div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-6 text-[13px] text-slate-500">まだメモはありません</div>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-[11px] font-medium">
                            {(comment.client_users?.display_name || "?")[0]}
                          </div>
                          <div>
                            <span className="text-[12px] font-medium text-slate-800">{comment.client_users?.display_name || "不明"}</span>
                            <span className="text-[10px] text-slate-400 ml-2 tabular-nums">
                              {new Date(comment.created_at).toLocaleDateString("ja-JP", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        </div>
                        {!isReadOnly && comment.client_user_id === currentUserId && (
                          <button onClick={() => handleDeleteComment(comment.id)} className="text-slate-400 hover:text-red-500 transition-colors p-0.5" title="削除">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                      <p className="text-[12px] text-slate-700 leading-relaxed whitespace-pre-wrap pl-8">{comment.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200/60 p-5 shadow-sm">
              <h3 className="text-[14px] font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                ご不明な点は
              </h3>
              <p className="text-[12px] text-slate-600 leading-relaxed mb-4">
                応募者に関するご質問や面接日程の調整など、お気軽にお問い合わせください。
              </p>
              <Link
                href="/client/support"
                className="block w-full text-center px-4 py-2 rounded-lg bg-slate-900 text-white text-[13px] font-medium hover:bg-slate-800 transition-colors"
              >
                お問い合わせ
              </Link>
            </div>

            {job && (
              <Link
                href={`/client/jobs/${applicant.job_id}`}
                className="block bg-white rounded-xl border border-slate-200/60 p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all"
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-[14px] font-semibold text-slate-900">求人情報を見る</span>
                </div>
                <p className="text-[12px] text-slate-500">{job.job_title}</p>
              </Link>
            )}
          </div>
        </div>
      </div>
    </ClientPortalLayout>
  );
}
