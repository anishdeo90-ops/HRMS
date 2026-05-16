import { NextRequest, NextResponse } from "next/server";
import { canManagePerformance, canViewPerformance, normalizeFeedbackCriteriaPayload } from "@/app/api/hrms/performance/_shared";
import { currentHrmsProfile } from "@/lib/hrms/employee-access";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canViewPerformance(profile)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  let query = supabase.from("employee_feedback_criteria").select("*").order("name", { ascending: true }).limit(200);
  if (searchParams.get("category")) query = query.eq("category", searchParams.get("category"));
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
  const payload = normalizeFeedbackCriteriaPayload(body);
  const { data, error } = await supabase.from("employee_feedback_criteria").insert({ ...payload, created_by: user.id }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
