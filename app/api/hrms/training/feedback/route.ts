import { NextRequest, NextResponse } from "next/server";
import { canManageLifecycleRecord, canViewLifecycle, canViewLifecycleRecord, normalizeTrainingFeedbackPayload, targetFromLifecycleRecord } from "@/app/api/hrms/lifecycle/_shared";
import { currentHrmsProfile, resolveLeaveTargetEmployee } from "@/lib/hrms/employee-access";
import { createClient } from "@/lib/supabase/server";

const FEEDBACK_SELECT = "*,employee:employees!training_feedback_employee_id_fkey(id, employee_code, name, profile_id, department_id, reporting_manager_id),event:training_events(*)";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employee_id");
  if (employeeId) {
    const { employee, error } = await resolveLeaveTargetEmployee(supabase, user.id, employeeId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!employee?.id) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    if (!canViewLifecycleRecord(profile, employee, "training_feedback")) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  } else if (!canViewLifecycle(profile)) {
    const { employee, error } = await resolveLeaveTargetEmployee(supabase, user.id, null);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!employee?.id || !canViewLifecycleRecord(profile, employee, "training_feedback")) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }
  let query = supabase.from("training_feedback").select(FEEDBACK_SELECT).order("created_at", { ascending: false }).limit(200);
  if (employeeId) query = query.eq("employee_id", employeeId);
  if (searchParams.get("event_id")) query = query.eq("event_id", searchParams.get("event_id"));
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: ((data ?? []) as any[]).filter((record) => canViewLifecycleRecord(profile, targetFromLifecycleRecord(record), "training_feedback")) });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { employee, error } = await resolveLeaveTargetEmployee(supabase, user.id, typeof body.employee_id === "string" ? body.employee_id : null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!employee?.id) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  if (!canManageLifecycleRecord(profile, "training_feedback", employee)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  const payload = normalizeTrainingFeedbackPayload({ ...body, employee_id: employee.id });
  const { data, error: insertError } = await supabase.from("training_feedback").insert({ ...payload, created_by: user.id }).select(FEEDBACK_SELECT).single();
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
