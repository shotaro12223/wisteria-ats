import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseRoute";

export const dynamic = "force-dynamic";

/**
 * GET /api/work-queue/analytics
 * Work Queue統計分析
 */
export async function GET(req: NextRequest) {
  try {
    const { supabase } = supabaseRoute(req);

    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth?.user) {
      return NextResponse.json(
        { ok: false, error: { message: "Unauthorized" } },
        { status: 401 }
      );
    }

    // 1. 担当者別統計
    const { data: assignments } = await supabase
      .from("work_queue_assignments")
      .select("assignee_user_id, job_id, site_key, created_at, updated_at");

    const { data: members } = await supabase
      .from("workspace_members")
      .select("user_id, display_name, avatar_url");

    // 2. イベント取得（過去30日）
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: events } = await supabase
      .from("work_queue_events")
      .select("*")
      .gte("occurred_at", thirtyDaysAgo.toISOString())
      .order("occurred_at", { ascending: false });

    // 3. Jobs取得（ステータス分析用）
    const { data: jobs } = await supabase
      .from("jobs")
      .select("id, title, site_status, created_at, updated_at")
      .is("deleted_at", null);

    // 担当者別統計計算
    const memberStats = calculateMemberStats(assignments ?? [], events ?? [], members ?? []);

    // ボトルネック分析
    const bottlenecks = calculateBottlenecks(jobs ?? [], events ?? []);

    // サイト別パフォーマンス
    const sitePerformance = await calculateSitePerformance(supabase);

    return NextResponse.json({
      ok: true,
      analytics: {
        memberStats,
        bottlenecks,
        sitePerformance,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: { message: String(e?.message ?? e) } },
      { status: 500 }
    );
  }
}

type Assignment = {
  assignee_user_id: string | null;
  job_id: string;
  site_key: string;
  created_at: string;
  updated_at: string;
};

type Event = {
  id: string;
  job_id: string;
  site_key: string;
  user_id: string | null;
  event_type: string;
  old_value: string | null;
  new_value: string | null;
  occurred_at: string;
};

type Member = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
};

function calculateMemberStats(assignments: Assignment[], events: Event[], members: Member[]) {
  const stats: Record<string, {
    user_id: string;
    display_name: string;
    avatar_url: string | null;
    total_assigned: number;
    completed: number;
    stale: number;
    avg_completion_time_hours: number | null;
  }> = {};

  // メンバー初期化
  members.forEach((m) => {
    stats[m.user_id] = {
      user_id: m.user_id,
      display_name: m.display_name || "Unknown",
      avatar_url: m.avatar_url,
      total_assigned: 0,
      completed: 0,
      stale: 0,
      avg_completion_time_hours: null,
    };
  });

  // アサインメント集計
  assignments.forEach((a) => {
    if (!a.assignee_user_id) return;
    if (!stats[a.assignee_user_id]) {
      stats[a.assignee_user_id] = {
        user_id: a.assignee_user_id,
        display_name: "Unknown",
        avatar_url: null,
        total_assigned: 0,
        completed: 0,
        stale: 0,
        avg_completion_time_hours: null,
      };
    }
    stats[a.assignee_user_id].total_assigned += 1;

    // 停滞判定（7日以上更新なし）
    const daysSinceUpdate = Math.floor(
      (Date.now() - new Date(a.updated_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceUpdate >= 7) {
      stats[a.assignee_user_id].stale += 1;
    }
  });

  // イベントから完了数と平均処理時間を計算
  const completionTimes: Record<string, number[]> = {};
  events
    .filter((e) => e.event_type === "completed")
    .forEach((e) => {
      if (!e.user_id) return;
      if (!stats[e.user_id]) return;

      stats[e.user_id].completed += 1;

      // 処理時間計算（アサインから完了まで）
      const assignment = assignments.find(
        (a) => a.job_id === e.job_id && a.site_key === e.site_key && a.assignee_user_id === e.user_id
      );
      if (assignment) {
        const hours = (new Date(e.occurred_at).getTime() - new Date(assignment.created_at).getTime()) / (1000 * 60 * 60);
        if (!completionTimes[e.user_id]) completionTimes[e.user_id] = [];
        completionTimes[e.user_id].push(hours);
      }
    });

  // 平均処理時間計算
  Object.keys(completionTimes).forEach((userId) => {
    const times = completionTimes[userId];
    if (times.length > 0) {
      const avg = times.reduce((sum, t) => sum + t, 0) / times.length;
      stats[userId].avg_completion_time_hours = Math.round(avg * 10) / 10;
    }
  });

  return Object.values(stats).sort((a, b) => b.total_assigned - a.total_assigned);
}

function calculateBottlenecks(jobs: any[], events: Event[]) {
  // ステータス別の平均滞留時間を計算
  const statusDurations: Record<string, number[]> = {};

  jobs.forEach((job) => {
    const siteStatus = job.site_status || {};
    Object.entries(siteStatus).forEach(([siteKey, state]: [string, any]) => {
      const status = state?.status || "未設定";
      const updatedAt = state?.updatedAt || job.updated_at;

      const daysSinceUpdate = Math.floor(
        (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (!statusDurations[status]) statusDurations[status] = [];
      statusDurations[status].push(daysSinceUpdate);
    });
  });

  // 平均計算
  const bottlenecks = Object.entries(statusDurations).map(([status, durations]) => {
    const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const max = Math.max(...durations);
    const count = durations.length;

    return {
      status,
      avg_days: Math.round(avg * 10) / 10,
      max_days: max,
      count,
    };
  });

  return bottlenecks.sort((a, b) => b.avg_days - a.avg_days);
}

async function calculateSitePerformance(supabase: any) {
  // サイト別の応募数、審査通過率を計算
  const { data: inboxItems } = await supabase
    .from("gmail_inbox_messages")
    .select("site_key, job_id");

  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, site_status")
    .is("deleted_at", null);

  const siteCounts: Record<string, {
    site_key: string;
    total_jobs: number;
    applicants: number;
    approved: number;
    rejected: number;
  }> = {};

  // 応募数集計
  (inboxItems ?? []).forEach((item: any) => {
    const siteKey = item.site_key || "Unknown";
    if (!siteCounts[siteKey]) {
      siteCounts[siteKey] = {
        site_key: siteKey,
        total_jobs: 0,
        applicants: 0,
        approved: 0,
        rejected: 0,
      };
    }
    siteCounts[siteKey].applicants += 1;
  });

  // ジョブ数とステータス集計
  (jobs ?? []).forEach((job: any) => {
    const siteStatus = job.site_status || {};
    Object.entries(siteStatus).forEach(([siteKey, state]: [string, any]) => {
      if (!siteCounts[siteKey]) {
        siteCounts[siteKey] = {
          site_key: siteKey,
          total_jobs: 0,
          applicants: 0,
          approved: 0,
          rejected: 0,
        };
      }
      siteCounts[siteKey].total_jobs += 1;

      const status = state?.status || "";
      if (status === "掲載中") siteCounts[siteKey].approved += 1;
      if (status === "NG") siteCounts[siteKey].rejected += 1;
    });
  });

  return Object.values(siteCounts)
    .map((s) => ({
      ...s,
      approval_rate: s.total_jobs > 0 ? Math.round((s.approved / s.total_jobs) * 100) : 0,
      rejection_rate: s.total_jobs > 0 ? Math.round((s.rejected / s.total_jobs) * 100) : 0,
      applicants_per_job: s.total_jobs > 0 ? Math.round((s.applicants / s.total_jobs) * 10) / 10 : 0,
    }))
    .sort((a, b) => b.applicants - a.applicants);
}
