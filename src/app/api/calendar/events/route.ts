// src/app/api/calendar/events/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseRoute";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { supabase } = supabaseRoute(req);

  // クエリパラメータから年月を取得
  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year");
  const month = searchParams.get("month");

  // Authentication check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { ok: false, error: { message: "Unauthorized" } },
      { status: 401 }
    );
  }

  const currentUserId = user.id;

  try {
    // 商談データを取得（FK joinなし）
    const { data: deals, error: dealsError } = await supabase
      .from("deals")
      .select("id, title, company_id, start_date, due_date")
      .is("deleted_at", null)
      .order("start_date", { ascending: true });

    if (dealsError) {
      console.error("[calendar/events] Deals fetch error:", dealsError);
      return NextResponse.json(
        { ok: false, error: { message: "カレンダーイベントの取得に失敗しました" } },
        { status: 500 }
      );
    }

    // work-queueタスクを取得（preferred_date/assignee_user_idsカラムがない場合はスキップ）
    let workQueueItems: any[] = [];
    try {
      const { data: wqData, error: wqError } = await supabase
        .from("work_queue_items")
        .select("id, title, company_id, preferred_date, deadline, task_type, assignee_user_id, assignee_user_ids")
        .neq("status", "completed")
        .order("created_at", { ascending: false });

      if (wqError) {
        // カラムがない場合はエラーをログに出力して続行
        console.warn("Work queue items fetch failed:", wqError.message);
        // 基本的なカラムのみで再試行
        const { data: basicData, error: basicError } = await supabase
          .from("work_queue_items")
          .select("id, title, company_id, deadline, task_type, assignee_user_id")
          .neq("status", "completed")
          .order("created_at", { ascending: false });

        if (!basicError) {
          workQueueItems = basicData || [];
        }
      } else {
        workQueueItems = wqData || [];
      }
    } catch (err: any) {
      console.warn("Work queue items fetch error:", err.message);
    }

    // company_id を収集（deals + work_queue_items）
    const companyIds = Array.from(
      new Set(
        [
          ...(deals || []).map((d) => String(d?.company_id ?? "").trim()),
          ...(workQueueItems || []).map((w) => String(w?.company_id ?? "").trim()),
        ].filter(Boolean)
      )
    );

    // 会社名を手動で取得
    let companyNameById = new Map<string, string>();

    if (companyIds.length > 0) {
      const { data: companies, error: compError } = await supabase
        .from("companies")
        .select("id, company_name")
        .is("deleted_at", null)
        .in("id", companyIds);

      if (compError) {
        console.error("[calendar/events] Companies fetch error:", compError);
        return NextResponse.json(
          { ok: false, error: { message: "カレンダーイベントの取得に失敗しました" } },
          { status: 500 }
        );
      }

      companyNameById = new Map(
        (companies || []).map((c) => [String(c?.id ?? ""), String(c?.company_name ?? "")])
      );
    }

    // カレンダーイベント形式に変換
    const events: any[] = [];

    // 商談イベント
    for (const deal of deals || []) {
      const companyId = String(deal?.company_id ?? "");
      const companyName = companyNameById.get(companyId) || "会社名不明";

      if (deal.start_date) {
        events.push({
          id: `deal-${deal.id}-start`,
          title: `${companyName} - 開始`,
          date: deal.start_date,
          type: "start",
          dealId: deal.id,
        });
      }

      if (deal.due_date) {
        events.push({
          id: `deal-${deal.id}-due`,
          title: `${companyName} - 完了予定`,
          date: deal.due_date,
          type: "due",
          dealId: deal.id,
        });
      }
    }

    // work-queueタスクイベント（自分が担当のもののみ）
    for (const task of workQueueItems || []) {
      // 自分が担当者に含まれているかチェック
      // currentUserIdがない場合は全て表示（認証エラーの場合）
      const isMyTask = !currentUserId ||
        task.assignee_user_id === currentUserId ||
        (task.assignee_user_ids && Array.isArray(task.assignee_user_ids) && task.assignee_user_ids.includes(currentUserId));

      if (!isMyTask) continue;

      const companyId = String(task?.company_id ?? "");
      const companyName = companyNameById.get(companyId);
      const taskTitle = companyName ? `${companyName} - ${task.title}` : task.title;

      // preferred_dateがある場合のみ追加
      if (task.preferred_date) {
        events.push({
          id: `wq-${task.id}-preferred`,
          title: taskTitle,
          date: task.preferred_date,
          type: "meeting",
          workQueueId: task.id,
        });
      }

      // deadlineがある場合のみ追加
      if (task.deadline) {
        events.push({
          id: `wq-${task.id}-deadline`,
          title: `${taskTitle} (期限)`,
          date: task.deadline,
          type: "due",
          workQueueId: task.id,
        });
      }
    }

    // 打ち合わせ確定イベント
    try {
      const { data: meetings, error: meetingsError } = await supabase
        .from("meeting_requests")
        .select("id, subject, company_id, confirmed_date")
        .eq("status", "confirmed");

      if (!meetingsError && meetings) {
        // 打ち合わせの company_id も会社名取得
        const meetingCompanyIds = meetings
          .map((m) => String(m.company_id ?? "").trim())
          .filter((id) => id && !companyNameById.has(id));

        if (meetingCompanyIds.length > 0) {
          const { data: extraCompanies } = await supabase
            .from("companies")
            .select("id, company_name")
            .in("id", meetingCompanyIds);

          for (const c of extraCompanies || []) {
            companyNameById.set(String(c.id), String(c.company_name ?? ""));
          }
        }

        for (const meeting of meetings) {
          if (meeting.confirmed_date) {
            const companyId = String(meeting.company_id ?? "");
            const companyName = companyNameById.get(companyId) || "会社名不明";
            const dateStr = meeting.confirmed_date.slice(0, 10);

            events.push({
              id: `meeting-${meeting.id}`,
              title: `${companyName} - ${meeting.subject}`,
              date: dateStr,
              type: "meeting",
              meetingRequestId: meeting.id,
            });
          }
        }
      }
    } catch {
      // silent - meeting_requests might not exist
    }

    // 年月フィルタ（オプション）
    let filteredEvents = events;
    if (year && month) {
      const targetYearMonth = `${year}-${String(month).padStart(2, "0")}`;
      filteredEvents = events.filter((e) => e.date?.startsWith(targetYearMonth));
    }

    return NextResponse.json({ ok: true, events: filteredEvents });
  } catch (err: any) {
    console.error("[calendar/events] GET error:", err);
    return NextResponse.json(
      { ok: false, error: { message: "カレンダーイベントの取得に失敗しました" } },
      { status: 500 }
    );
  }
}
