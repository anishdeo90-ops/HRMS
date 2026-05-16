import { NextRequest, NextResponse } from "next/server";
import { canManagePerformance, canReviewTeamPerformance, canViewPerformance, normalizeAppraisalCyclePayload } from "@/app/api/hrms/performance/_shared";
import { currentHrmsProfile } from "@/lib/hrms/employee-access";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canViewPerformance(profile) && !canReviewTeamPerformance(profile)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  let query = supabase.from("appraisal_cycles").select("*,template:appraisal_templates(*)").order("start_date", { ascending: false }).limit(100);
  if (searchParams.get("status")) query = query.eq("status", searchParams.get("status"));
  if (searchParams.get("from")) query = query.gte("start_date", searchParams.get("from"));
  if (searchParams.get("to")) query = query.lte("end_date", searchParams.get("to"));
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: (data ?? []).map((cycle) => ({
    ...cycle,
    period_start: cycle.start_date,
    period_end: cycle.end_date,
    review_start: cycle.self_review_start,
    review_end: cycle.manager_review_end ?? cycle.self_review_end,
  })) });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManagePerformance(profile)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const body = await req.json();
  const payload = normalizeAppraisalCyclePayload(body);
  const { data, error } = await supabase.from("appraisal_cycles").insert({ ...payload, created_by: user.id }).select("*,template:appraisal_templates(*)").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
