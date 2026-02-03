import { NextResponse, NextRequest } from "next/server";
import { supabaseRoute } from "@/lib/supabaseRoute";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { supabase } = supabaseRoute(req);

  // Get authenticated user
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

  // Get client user info
  const { data: clientUser, error: clientUserError } = await supabase
    .from("client_users")
    .select("id, company_id, is_active")
    .eq("user_id", user.id)
    .single();

  if (clientUserError || !clientUser) {
    return NextResponse.json(
      { ok: false, error: { message: "Client user not found" } },
      { status: 403 }
    );
  }

  if (!clientUser.is_active) {
    return NextResponse.json(
      { ok: false, error: { message: "Account is inactive" } },
      { status: 403 }
    );
  }

  try {
    // Fetch applicants (shared with client)
    const { data: applicants, error: applicantsError } = await supabase
      .from("applicants")
      .select("id, status, site_key, applied_at, created_at, job_id")
      .eq("company_id", clientUser.company_id)
      .eq("shared_with_client", true)
      .is("deleted_at", null);

    if (applicantsError) {
      console.error("[client/analytics] Applicants error:", applicantsError);
      return NextResponse.json(
        { ok: false, error: { message: "分析データの取得に失敗しました" } },
        { status: 500 }
      );
    }

    // Fetch feedback data
    const { data: feedbacks, error: feedbackError } = await supabase
      .from("applicant_client_feedback")
      .select(`
        id,
        applicant_id,
        interview_type,
        interview_date,
        interview_result,
        fail_reason,
        fail_reason_detail,
        pass_rating,
        pass_strengths,
        hire_intention,
        created_at
      `)
      .eq("company_id", clientUser.company_id);

    if (feedbackError) {
      console.error("[Analytics] Feedback error:", feedbackError);
      // Don't fail completely if feedback is not available
    }

    // Calculate basic applicant stats
    const totalApplicants = applicants?.length || 0;
    const byStatus: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    const byMonth: Record<string, number> = {};

    applicants?.forEach((a) => {
      // By status
      byStatus[a.status] = (byStatus[a.status] || 0) + 1;

      // By source
      bySource[a.site_key || "その他"] = (bySource[a.site_key || "その他"] || 0) + 1;

      // By month
      const month = new Date(a.applied_at || a.created_at).toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "long",
      });
      byMonth[month] = (byMonth[month] || 0) + 1;
    });

    // Calculate feedback stats
    const feedbackList = feedbacks || [];
    const totalFeedbacks = feedbackList.length;

    // Interview results breakdown
    const interviewResults = {
      pass: 0,
      fail: 0,
      pending: 0,
      no_show: 0,
    };

    // Fail reasons breakdown
    const failReasons: Record<string, number> = {};

    // Pass strengths breakdown
    const passStrengths: Record<string, number> = {};

    // Hire intentions
    const hireIntentions: Record<string, number> = {};

    // Rating distribution
    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    // Interview type breakdown
    const interviewTypes: Record<string, { total: number; pass: number; fail: number }> = {};

    // Process feedback data
    feedbackList.forEach((f) => {
      // Interview results
      if (f.interview_result) {
        interviewResults[f.interview_result as keyof typeof interviewResults]++;
      }

      // Fail reasons
      if (f.interview_result === "fail" && f.fail_reason) {
        failReasons[f.fail_reason] = (failReasons[f.fail_reason] || 0) + 1;
      }

      // Pass strengths
      if (f.interview_result === "pass" && f.pass_strengths) {
        (f.pass_strengths as string[]).forEach((strength) => {
          passStrengths[strength] = (passStrengths[strength] || 0) + 1;
        });
      }

      // Hire intentions
      if (f.hire_intention) {
        hireIntentions[f.hire_intention] = (hireIntentions[f.hire_intention] || 0) + 1;
      }

      // Rating distribution
      if (f.pass_rating && f.pass_rating >= 1 && f.pass_rating <= 5) {
        ratingDistribution[f.pass_rating]++;
      }

      // Interview type stats
      if (f.interview_type) {
        if (!interviewTypes[f.interview_type]) {
          interviewTypes[f.interview_type] = { total: 0, pass: 0, fail: 0 };
        }
        interviewTypes[f.interview_type].total++;
        if (f.interview_result === "pass") {
          interviewTypes[f.interview_type].pass++;
        } else if (f.interview_result === "fail") {
          interviewTypes[f.interview_type].fail++;
        }
      }
    });

    // Calculate conversion rates
    const newCount = byStatus["NEW"] || 0;
    const docCount = byStatus["DOC"] || 0;
    const intCount = byStatus["INT"] || 0;
    const offerCount = (byStatus["OFFER"] || 0) + (byStatus["内定"] || 0);
    const ngCount = byStatus["NG"] || 0;

    // Funnel conversion rates
    const conversionRates = {
      applicationToScreening: totalApplicants > 0
        ? Math.round(((totalApplicants - newCount) / totalApplicants) * 100)
        : 0,
      screeningToInterview: (docCount + intCount + offerCount + ngCount) > 0
        ? Math.round(((intCount + offerCount) / (docCount + intCount + offerCount + ngCount)) * 100)
        : 0,
      interviewToOffer: (intCount + offerCount + ngCount) > 0
        ? Math.round((offerCount / (intCount + offerCount + ngCount)) * 100)
        : 0,
      overallConversion: totalApplicants > 0
        ? Math.round((offerCount / totalApplicants) * 100)
        : 0,
    };

    // Interview pass rate from feedback
    const interviewPassRate = (interviewResults.pass + interviewResults.fail) > 0
      ? Math.round((interviewResults.pass / (interviewResults.pass + interviewResults.fail)) * 100)
      : 0;

    // Average rating
    let totalRatingScore = 0;
    let totalRatingCount = 0;
    Object.entries(ratingDistribution).forEach(([rating, count]) => {
      totalRatingScore += parseInt(rating) * count;
      totalRatingCount += count;
    });
    const averageRating = totalRatingCount > 0
      ? Math.round((totalRatingScore / totalRatingCount) * 10) / 10
      : 0;

    // Generate insights based on data
    const insights: Array<{
      type: "warning" | "info" | "success" | "tip";
      title: string;
      message: string;
    }> = [];

    // Insight: High fail rate
    if (interviewPassRate < 50 && totalFeedbacks >= 3) {
      insights.push({
        type: "warning",
        title: "面接通過率が低い",
        message: `面接通過率が${interviewPassRate}%です。求人要件の見直しや、面接前のスクリーニング強化を検討してください。`,
      });
    }

    // Insight: Common fail reason
    const topFailReason = Object.entries(failReasons).sort((a, b) => b[1] - a[1])[0];
    if (topFailReason && topFailReason[1] >= 2) {
      const failReasonLabels: Record<string, string> = {
        culture_mismatch: "社風との不一致",
        skill_shortage: "スキル不足",
        experience_lack: "経験不足",
        communication: "コミュニケーション",
        motivation: "意欲不足",
        salary_mismatch: "条件不一致",
        schedule_mismatch: "勤務条件不一致",
        appearance: "印象",
        overqualified: "オーバースペック",
        other: "その他",
      };
      insights.push({
        type: "tip",
        title: "よくある不採用理由",
        message: `「${failReasonLabels[topFailReason[0]] || topFailReason[0]}」が最も多い不採用理由です。求人原稿でこの点を明確にすることで、ミスマッチを減らせる可能性があります。`,
      });
    }

    // Insight: No-shows
    if (interviewResults.no_show >= 2) {
      insights.push({
        type: "warning",
        title: "無断欠席が発生",
        message: `${interviewResults.no_show}件の無断欠席があります。面接前のリマインド連絡や、候補者とのコミュニケーション強化を検討してください。`,
      });
    }

    // Insight: Good pass rate
    if (interviewPassRate >= 70 && totalFeedbacks >= 3) {
      insights.push({
        type: "success",
        title: "面接通過率が高い",
        message: `面接通過率${interviewPassRate}%と良好です。スクリーニングが効果的に機能しています。`,
      });
    }

    // Insight: Low offer rate from interviews
    if (conversionRates.interviewToOffer < 30 && (intCount + offerCount + ngCount) >= 3) {
      insights.push({
        type: "tip",
        title: "面接後の内定率改善の余地",
        message: `面接から内定への転換率が${conversionRates.interviewToOffer}%です。面接プロセスや候補者体験の改善を検討してください。`,
      });
    }

    // Insight: Source analysis
    const topSource = Object.entries(bySource).sort((a, b) => b[1] - a[1])[0];
    if (topSource && totalApplicants >= 5) {
      insights.push({
        type: "info",
        title: "主要な応募経路",
        message: `「${topSource[0]}」からの応募が最も多く、全体の${Math.round((topSource[1] / totalApplicants) * 100)}%を占めています。`,
      });
    }

    return NextResponse.json({
      ok: true,
      data: {
        // Basic stats
        totalApplicants,
        byStatus,
        bySource,
        byMonth: Object.entries(byMonth)
          .map(([month, count]) => ({ month, count }))
          .sort((a, b) => {
            const dateA = new Date(a.month.replace("年", "/").replace("月", ""));
            const dateB = new Date(b.month.replace("年", "/").replace("月", ""));
            return dateA.getTime() - dateB.getTime();
          })
          .slice(-6),

        // Feedback stats
        feedback: {
          total: totalFeedbacks,
          interviewResults,
          failReasons,
          passStrengths,
          hireIntentions,
          ratingDistribution,
          interviewTypes,
          averageRating,
          interviewPassRate,
        },

        // Conversion rates
        conversionRates,

        // Insights
        insights,
      },
    });
  } catch (e) {
    console.error("[client/analytics] Error:", e);
    return NextResponse.json(
      { ok: false, error: { message: "分析データの計算に失敗しました" } },
      { status: 500 }
    );
  }
}
