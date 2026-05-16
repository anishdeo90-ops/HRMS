import { NextRequest, NextResponse } from "next/server";
import { canManagePerformanceRecord, normalizeFeedbackRatingPayload } from "@/app/api/hrms/performance/_shared";
import { currentHrmsProfile } from "@/lib/hrms/employee-access";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManagePerformanceRecord(profile, "feedback_rating")) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const { data, error } = await supabase
    .from("employee_feedback_ratings")
    .select("*,criteria:employee_feedback_criteria(*)")
    .eq("feedback_id", id)
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManagePerformanceRecord(profile, "feedback_rating")) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const body = await req.json();
  const payload = normalizeFeedbackRatingPayload({ ...body, feedback_id: id });
  const { data, error } = await supabase.from("employee_feedback_ratings").insert({ ...payload, created_by: user.id }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
