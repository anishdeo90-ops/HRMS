import { NextRequest, NextResponse } from "next/server";
import { canManagePerformance, canViewPerformance, normalizeAppraisalTemplateGoals, normalizeAppraisalTemplatePayload } from "@/app/api/hrms/performance/_shared";
import { currentHrmsProfile } from "@/lib/hrms/employee-access";
import { createClient } from "@/lib/supabase/server";

const TEMPLATE_SELECT = "*,goals:appraisal_template_goals(*)";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canViewPerformance(profile)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  let query = supabase.from("appraisal_templates").select(TEMPLATE_SELECT).order("created_at", { ascending: false }).limit(100);
  if (searchParams.get("status")) query = query.eq("status", searchParams.get("status"));
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManagePerformance(profile)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const body = await req.json();
  const goals = normalizeAppraisalTemplateGoals(body.goals);
  const payload = normalizeAppraisalTemplatePayload(body);
  const { data, error } = await supabase.from("appraisal_templates").insert({ ...payload, created_by: user.id }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (goals.length > 0) {
    const { error: goalsError } = await supabase.from("appraisal_template_goals").insert(goals.map((goal) => ({ ...goal, template_id: data.id })));
    if (goalsError) return NextResponse.json({ error: goalsError.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
